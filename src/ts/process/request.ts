import { get } from "svelte/store";
import type { OpenAIChat, OpenAIChatFull } from ".";
import { DataBase, setDatabase, type character } from "../storage/database";
import { pluginProcess } from "../plugins/plugins";
import { language } from "../../lang";
import { stringlizeAINChat, stringlizeChat, stringlizeChatOba, getStopStrings, unstringlizeAIN, unstringlizeChat } from "./stringlize";
import { addFetchLog, globalFetch, isNodeServer, isTauri } from "../storage/globalApi";
import { sleep } from "../util";
import { createDeep } from "./deepai";
import { hubURL } from "../characterCards";
import { NovelAIBadWordIds, stringlizeNAIChat } from "./models/nai";
import { strongBan, tokenizeNum } from "../tokenizer";
import { runLocalModel } from "./models/local";
import { risuChatParser } from "../parser";
import { SignatureV4 } from "@smithy/signature-v4";
import { HttpRequest } from "@smithy/protocol-http";
import { Sha256 } from "@aws-crypto/sha256-js";
import { v4 } from "uuid";
import { cloneDeep } from "lodash";
import { supportsInlayImage } from "../image";
import { OaifixBias } from "../plugins/fixer";
import { Capacitor } from "@capacitor/core";
import { getFreeOpenRouterModel } from "../model/openrouter";
import { runTransformers } from "./embedding/transformers";



interface requestDataArgument{
    formated: OpenAIChat[]
    bias: {[key:number]:number}
    biasString?: [string,number][]
    currentChar?: character
    temperature?: number
    maxTokens?:number
    PresensePenalty?: number
    frequencyPenalty?: number,
    useStreaming?:boolean
    isGroupChat?:boolean
    useEmotion?:boolean
    continue?:boolean
}

type requestDataResponse = {
    type: 'success'|'fail'
    result: string
    noRetry?: boolean,
    special?: {
        emotion?: string
    }
}|{
    type: "streaming",
    result: ReadableStream<string>,
    special?: {
        emotion?: string
    }
}|{
    type: "multiline",
    result: ['user'|'char',string][],
    special?: {
        emotion?: string
    }
}

interface OaiFunctions {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            [key:string]: {
                type: string;
                enum: string[]
            };
        };
        required: string[];
    };
}

export async function requestChatData(arg:requestDataArgument, model:'model'|'submodel', abortSignal:AbortSignal=null):Promise<requestDataResponse> {
    const db = get(DataBase)
    let trys = 0
    while(true){
        const da = await requestChatDataMain(arg, model, abortSignal)
        if(da.type !== 'fail' || da.noRetry){
            return da
        }
        
        trys += 1
        if(trys > db.requestRetrys){
            return da
        }
    }
}

interface OpenAITextContents {
    type: 'text'
    text: string
}

interface OpenAIImageContents {
    type: 'image'
    image_url: {
        url: string
        detail: string
    }
}

type OpenAIContents = OpenAITextContents|OpenAIImageContents

export interface OpenAIChatExtra {
    role: 'system'|'user'|'assistant'|'function'
    content: string|OpenAIContents[]
    memo?:string
    name?:string
    removable?:boolean
    attr?:string[]
}


export async function requestChatDataMain(arg:requestDataArgument, model:'model'|'submodel', abortSignal:AbortSignal=null):Promise<requestDataResponse> {
    const db = get(DataBase)
    let formated = cloneDeep(arg.formated)
    let maxTokens = arg.maxTokens ??db.maxResponse
    let temperature = arg.temperature ?? (db.temperature / 100)
    let bias = arg.bias
    let currentChar = arg.currentChar
    arg.continue = arg.continue ?? false
    let biasString = arg.biasString ?? []
    const aiModel = (model === 'model' || (!db.advancedBotSettings)) ? db.aiModel : db.subModel

    let raiModel = aiModel
    if(aiModel === 'reverse_proxy'){
        if(db.proxyRequestModel.startsWith('claude')){
            raiModel = db.proxyRequestModel
        }
        if(db.forceProxyAsOpenAI){
            raiModel = 'reverse_proxy'
        }
    }
    console.log(formated)
    switch(raiModel){
        case 'gpt35':
        case 'gpt35_0613':
        case 'gpt35_16k':
        case 'gpt35_16k_0613':
        case 'gpt4':
        case 'gpt45':
        case 'gpt4_32k':
        case 'gpt4_0613':
        case 'gpt4_32k_0613':
        case 'gpt4_1106':
        case 'gpt35_1106':
        case 'gpt35_0301':
        case 'gpt4_0301':
        case 'gptvi4_1106':
        case 'openrouter':
        case 'mistral-tiny':
        case 'mistral-small':
        case 'mistral-medium':
        case 'reverse_proxy':{
            let formatedChat:OpenAIChatExtra[] = []
            if(db.inlayImage){
                let pendingImages:OpenAIImageContents[] = []
                for(let i=0;i<formated.length;i++){
                    const m = formated[i]
                    if(m.memo && m.memo.startsWith('inlayImage')){
                        pendingImages.push({
                            "type": "image",
                            "image_url": {
                                "url": m.content,
                                "detail": db.gptVisionQuality
                            }
                        })
                    }
                    else{
                        if(pendingImages.length > 0 && m.role === 'user'){
                            let v:OpenAIChatExtra = cloneDeep(m)
                            let contents:OpenAIContents[] = pendingImages
                            contents.push({
                                "type": "text",
                                "text": m.content
                            })
                            v.content = contents
                            formatedChat.push(v)
                            pendingImages = []
                        }
                        else{
                            formatedChat.push(m)
                        }
                    }
                }
            }
            else{
                formatedChat = formated
            }
            
            let oobaSystemPrompts:string[] = []
            for(let i=0;i<formatedChat.length;i++){
                if(formatedChat[i].role !== 'function'){
                    if(!(formatedChat[i].name && formatedChat[i].name.startsWith('example_') && db.newOAIHandle)){
                        formatedChat[i].name = undefined
                    }
                    if(db.newOAIHandle && formatedChat[i].memo && formatedChat[i].memo.startsWith('NewChat')){
                        formatedChat[i].content = ''
                    }
                    delete formatedChat[i].memo
                    delete formatedChat[i].removable
                    delete formatedChat[i].attr
                }
                if(aiModel === 'reverse_proxy' && db.reverseProxyOobaMode && formatedChat[i].role === 'system'){
                    const cont = formatedChat[i].content
                    if(typeof(cont) === 'string'){
                        oobaSystemPrompts.push(cont)
                        formatedChat[i].content = ''
                    }
                }
            }

            if(oobaSystemPrompts.length > 0){
                formatedChat.push({
                    role: 'system',
                    content: oobaSystemPrompts.join('\n')
                })
            }


            if(db.newOAIHandle){
                formatedChat = formatedChat.filter(m => {
                    return m.content !== ''
                })
            }

            for(let i=0;i<biasString.length;i++){
                const bia = biasString[i]
                if(bia[1] === -101){
                    bias = await strongBan(bia[0], bias)
                    continue
                }
                const tokens = await tokenizeNum(bia[0])
        
                for(const token of tokens){
                    bias[token] = bia[1]

                }
            }
            if(raiModel.startsWith('gpt')){
                if(db.officialplugins.oaiFix){
                    bias = OaifixBias(bias)
                }
            }




            let oaiFunctions:OaiFunctions[] = []


            if(arg.useEmotion){
                oaiFunctions.push(
                    {
                        "name": "set_emotion",
                        "description": "sets a role playing character's emotion display. must be called one time at the end of response.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "emotion": {
                                    "type": "string", "enum": []
                                },
                            },
                            "required": ["emotion"],
                        },
                    }
                )
            }

            if(oaiFunctions.length === 0){
                oaiFunctions = undefined
            }


            const oaiFunctionCall = oaiFunctions ? (arg.useEmotion ? {"name": "set_emotion"} : "auto") : undefined
            let requestModel = (aiModel === 'reverse_proxy' || aiModel === 'openrouter') ? db.proxyRequestModel : aiModel
            let openrouterRequestModel = db.openrouterRequestModel
            if(aiModel === 'reverse_proxy' && db.proxyRequestModel === 'custom'){
                requestModel = db.customProxyRequestModel
            }

            if(aiModel === 'openrouter' && db.openrouterRequestModel === 'risu/free'){
                openrouterRequestModel = await getFreeOpenRouterModel()
            }

            if(aiModel.startsWith('mistral')){
                requestModel = aiModel

                let reformatedChat:OpenAIChatExtra[] = []

                for(let i=0;i<formatedChat.length;i++){
                    const chat = formatedChat[i]
                    if(i === 0){
                        if(chat.role === 'user' || chat.role === 'system'){
                            reformatedChat.push({
                                role: chat.role,
                                content: chat.content
                            })
                        }
                        else{
                            reformatedChat.push({
                                role: 'system',
                                content:  chat.role + ':' + chat.content
                            })
                        }
                    }
                    else{
                        const prevChat = reformatedChat[reformatedChat.length-1]
                        if(prevChat.role === chat.role){
                            reformatedChat[reformatedChat.length-1].content += '\n' + chat.content
                            continue
                        }
                        else if(chat.role === 'system'){
                            if(prevChat.role === 'user'){
                                reformatedChat[reformatedChat.length-1].content += '\nSystem:' + chat.content
                            }
                            else{
                                reformatedChat.push({
                                    role: 'user',
                                    content: 'System:' + chat.content
                                })
                            }
                        }
                        else if(chat.role === 'function'){
                            reformatedChat.push({
                                role: 'user',
                                content: chat.content
                            })
                        }
                        else{
                            reformatedChat.push({
                                role: chat.role,
                                content: chat.content
                            })
                        }
                    }
                }
            
                const res = await globalFetch("https://api.mistral.ai/v1/chat/completions", {
                    body: {
                        model: requestModel,
                        messages: reformatedChat,
                        temperature: temperature,
                        max_tokens: maxTokens,
                        top_p: db.top_p,
                    },
                    headers: {
                        "Authorization": "Bearer " + db.mistralKey,
                    },
                    abortSignal,
                })
    
                const dat = res.data as any
                if(res.ok){
                    try {
                        const msg:OpenAIChatFull = (dat.choices[0].message)
                        return {
                            type: 'success',
                            result: msg.content
                        }
                    } catch (error) {                    
                        return {
                            type: 'fail',
                            result: (language.errors.httpError + `${JSON.stringify(dat)}`)
                        }
                    }
                }
                else{
                    if(dat.error && dat.error.message){                    
                        return {
                            type: 'fail',
                            result: (language.errors.httpError + `${dat.error.message}`)
                        }
                    }
                    else{                    
                        return {
                            type: 'fail',
                            result: (language.errors.httpError + `${JSON.stringify(res.data)}`)
                        }
                    }
                }
            }

            db.cipherChat = false
            let body = ({
                model: aiModel === 'openrouter' ? openrouterRequestModel :
                    requestModel ===  'gpt35' ? 'gpt-3.5-turbo'
                    : requestModel ===  'gpt35_0613' ? 'gpt-3.5-turbo-0613'
                    : requestModel ===  'gpt35_16k' ? 'gpt-3.5-turbo-16k'
                    : requestModel ===  'gpt35_16k_0613' ? 'gpt-3.5-turbo-16k-0613'
                    : requestModel === 'gpt4' ? 'gpt-4'
                    : requestModel === 'gpt45' ? 'gpt-4.5-preview'
                    : requestModel === 'gpt4_32k' ? 'gpt-4-32k'
                    : requestModel === "gpt4_0613" ? 'gpt-4-0613'
                    : requestModel === "gpt4_32k_0613" ? 'gpt-4-32k-0613'
                    : requestModel === "gpt4_1106" ? 'gpt-4-1106-preview'
                    : requestModel === "gptvi4_1106" ? 'gpt-4-vision-preview'
                    : requestModel === "gpt35_1106" ? 'gpt-3.5-turbo-1106'
                    : requestModel === 'gpt35_0301' ? 'gpt-3.5-turbo-0301'
                    : requestModel === 'gpt4_0301' ? 'gpt-4-0301'
                    : (!requestModel) ? 'gpt-3.5-turbo'
                    : requestModel,
                messages: formatedChat,
                temperature: temperature,
                max_tokens: maxTokens,
                presence_penalty: arg.PresensePenalty || (db.PresensePenalty / 100),
                frequency_penalty: arg.frequencyPenalty || (db.frequencyPenalty / 100),
                logit_bias: bias,
                stream: false,
                top_p: db.top_p,

            })

            if(db.generationSeed > 0){
                // @ts-ignore
                body.seed = db.generationSeed
            }

            if(db.putUserOpen){
                // @ts-ignore
                body.user = getOpenUserString()
            }

            if(aiModel === 'openrouter'){
                if(db.top_k !== 0){
                    //@ts-ignore
                    body.top_k = db.top_k
                }
                if(db.openrouterFallback){
                    //@ts-ignore
                    body.route = "fallback"
                }
                //@ts-ignore
                body.transforms = db.openrouterMiddleOut ? ['middle-out'] : []
            }

            if(aiModel === 'reverse_proxy' && db.reverseProxyOobaMode){
                const OobaBodyTemplate = db.reverseProxyOobaArgs

                const keys = Object.keys(OobaBodyTemplate)
                for(const key of keys){
                    if(OobaBodyTemplate[key] !== undefined && OobaBodyTemplate[key] !== null){
                        // @ts-ignore
                        body[key] = OobaBodyTemplate[key]
                    }
                }

            }

            if(supportsInlayImage()){
                // inlay models doesn't support logit_bias
                // @ts-ignore
                delete body.logit_bias
            }

            let replacerURL = aiModel === 'openrouter' ? "https://openrouter.ai/api/v1/chat/completions" :
                (aiModel === 'reverse_proxy') ? (db.forceReplaceUrl) : ('https://api.openai.com/v1/chat/completions')

            let risuIdentify = false
            if(replacerURL.startsWith("risu::")){
                risuIdentify = true
                replacerURL = replacerURL.replace("risu::", '')
            }

            if(aiModel === 'reverse_proxy' && db.autofillRequestUrl){
                if(replacerURL.endsWith('v1')){
                    replacerURL += '/chat/completions'
                }
                else if(replacerURL.endsWith('v1/')){
                    replacerURL += 'chat/completions'
                }
                else if(!(replacerURL.endsWith('completions') || replacerURL.endsWith('completions/'))){
                    if(replacerURL.endsWith('/')){
                        replacerURL += 'v1/chat/completions'
                    }
                    else{
                        replacerURL += '/v1/chat/completions'
                    }
                }
            }

            let headers = {
                "Authorization": "Bearer " + (aiModel === 'reverse_proxy' ?  db.proxyKey : (aiModel === 'openrouter' ? db.openrouterKey : db.openAIKey)),
                "Content-Type": "application/json"
            }

            if(aiModel === 'openrouter'){
                headers["X-Title"] = 'RisuAI'
                headers["HTTP-Referer"] = 'https://risuai.xyz'
            }
            if(risuIdentify){
                headers["X-Proxy-Risu"] = 'RisuAI'
            }
            const multiGen = (db.genTime > 1 && aiModel.startsWith('gpt') && (!arg.continue))
            if(multiGen){
                // @ts-ignore
                body.n = db.genTime
            }
            let throughProxi = (!isTauri) && (!isNodeServer) && (!db.usePlainFetch) && (!Capacitor.isNativePlatform())
            if(db.useStreaming && arg.useStreaming && (!multiGen)){
                body.stream = true
                let urlHost = new URL(replacerURL).host
                if(urlHost.includes("localhost") || urlHost.includes("172.0.0.1") || urlHost.includes("0.0.0.0")){
                    if(!isTauri){
                        return {
                            type: 'fail',
                            result: 'You are trying local request on streaming. this is not allowed dude to browser/os security policy. turn off streaming.',
                        }
                    }
                }
                const da =  (throughProxi)
                    ? await fetch(hubURL + `/proxy2`, {
                        body: JSON.stringify(body),
                        headers: {
                            "risu-header": encodeURIComponent(JSON.stringify(headers)),
                            "risu-url": encodeURIComponent(replacerURL),
                            "Content-Type": "application/json",
                            "x-risu-tk": "use"
                        },
                        method: "POST",
                        signal: abortSignal
                    })
                    : await fetch(replacerURL, {
                        body: JSON.stringify(body),
                        method: "POST",
                        headers: headers,
                        signal: abortSignal
                    })  

                if(da.status !== 200){
                    return {
                        type: "fail",
                        result: await da.text()
                    }
                }

                if (!da.headers.get('Content-Type').includes('text/event-stream')){
                    return {
                        type: "fail",
                        result: await da.text()
                    }
                }

                addFetchLog({
                    body: body,
                    response: "Streaming",
                    success: true,
                    url: replacerURL,
                })

                let dataUint = new Uint8Array([])

                const transtream = new TransformStream<Uint8Array, string>(  {
                    async transform(chunk, control) {
                        dataUint = Buffer.from(new Uint8Array([...dataUint, ...chunk]))
                        try {
                            const datas = dataUint.toString().split('\n')
                            let readed = ''
                            for(const data of datas){
                                if(data.startsWith("data: ")){
                                    try {
                                        const rawChunk = data.replace("data: ", "")
                                        if(rawChunk === "[DONE]"){
                                            control.enqueue(readed)
                                            return
                                        }
                                        const chunk = JSON.parse(rawChunk).choices[0].delta.content
                                        if(chunk){
                                            readed += chunk
                                        }
                                    } catch (error) {}
                                }
                            }
                            control.enqueue(readed)
                        } catch (error) {
                            
                        }
                    }
                },)

                da.body.pipeTo(transtream.writable)

                return {
                    type: 'streaming',
                    result: transtream.readable
                }
            }

            const res = await globalFetch(replacerURL, {
                body: body,
                headers: headers,
                abortSignal,
                useRisuToken:throughProxi
            })

            const dat = res.data as any
            if(res.ok){
                try {
                    if(multiGen && dat.choices){
                        return {
                            type: 'multiline',
                            result: dat.choices.map((v) => {
                                return ["char",v.message.content]
                            })
                        }

                    }
                    const msg:OpenAIChatFull = (dat.choices[0].message)
                    return {
                        type: 'success',
                        result: msg.content
                    }
                } catch (error) {                    
                    return {
                        type: 'fail',
                        result: (language.errors.httpError + `${JSON.stringify(dat)}`)
                    }
                }
            }
            else{
                if(dat.error && dat.error.message){                    
                    return {
                        type: 'fail',
                        result: (language.errors.httpError + `${dat.error.message}`)
                    }
                }
                else{                    
                    return {
                        type: 'fail',
                        result: (language.errors.httpError + `${JSON.stringify(res.data)}`)
                    }
                }
            }

            break
        }
        case 'novelai':
        case 'novelai_kayra':{
            console.log(arg.continue)
            const proompt = stringlizeNAIChat(formated, currentChar?.name ?? '', arg.continue)
            let logit_bias_exp:{
                sequence: number[], bias: number, ensure_sequence_finish: false, generate_once: true
            }[] = []

            for(let i=0;i<biasString.length;i++){
                const bia = biasString[i]
                const tokens = await tokenizeNum(bia[0])

                const tokensInNumberArray:number[] = []
    
                for(const token of tokens){
                    tokensInNumberArray.push(token)
                }
                logit_bias_exp.push({
                    sequence: tokensInNumberArray,
                    bias: bia[1],
                    ensure_sequence_finish: false,
                    generate_once: true
                })
            }

            let prefix = 'vanilla'

            if(db.NAIadventure){
                prefix = 'theme_textadventure'
            }

            const gen = db.NAIsettings
            const payload = {
                temperature:temperature,
                max_length: maxTokens,
                min_length: 1,
                top_k: gen.topK,
                top_p: gen.topP,
                top_a: gen.topA,
                tail_free_sampling: gen.tailFreeSampling,
                repetition_penalty: gen.repetitionPenalty,
                repetition_penalty_range: gen.repetitionPenaltyRange,
                repetition_penalty_slope: gen.repetitionPenaltySlope,
                repetition_penalty_frequency: gen.frequencyPenalty,
                repetition_penalty_presence: gen.presencePenalty,
                generate_until_sentence: true,
                use_cache: false,
                use_string: true,
                return_full_text: false,
                prefix: prefix,
                order: [6, 2, 3, 0, 4, 1, 5, 8],
                typical_p: gen.typicalp,
                repetition_penalty_whitelist:[49256,49264,49231,49230,49287,85,49255,49399,49262,336,333,432,363,468,492,745,401,426,623,794,1096,2919,2072,7379,1259,2110,620,526,487,16562,603,805,761,2681,942,8917,653,3513,506,5301,562,5010,614,10942,539,2976,462,5189,567,2032,123,124,125,126,127,128,129,130,131,132,588,803,1040,49209,4,5,6,7,8,9,10,11,12],
                stop_sequences: [[49287], [49405]],
                bad_words_ids: NovelAIBadWordIds,
                logit_bias_exp: logit_bias_exp,
                mirostat_lr: gen.mirostat_lr ?? 1,
                mirostat_tau: gen.mirostat_tau ?? 0,
                cfg_scale: gen.cfg_scale ?? 1,
                cfg_uc: ""   
            }

            

              
            const body = {
                "input": proompt,
                "model": aiModel === 'novelai_kayra' ? 'kayra-v1' : 'clio-v1',
                "parameters":payload
            }

            const da = await globalFetch("https://api.novelai.net/ai/generate", {
                body: body,
                headers: {
                    "Authorization": "Bearer " + db.novelai.token
                },
                abortSignal
            })

            if((!da.ok )|| (!da.data.output)){
                return {
                    type: 'fail',
                    result: (language.errors.httpError + `${JSON.stringify(da.data)}`)
                }
            }
            return {
                type: "success",
                result: unstringlizeChat(da.data.output, formated, currentChar?.name ?? '')
            }
        }

        case 'instructgpt35':{
            const prompt = formated.filter(m => m.content?.trim()).map(m => {
                let author = '';
        
                if(m.role == 'system'){
                    m.content = m.content.trim();
                }
        
                console.log(m.role +":"+m.content);
                switch (m.role) {
                    case 'user': author = 'User'; break;
                    case 'assistant': author = 'Assistant'; break;
                    case 'system': author = 'Instruction'; break;
                    default: author = m.role; break;
                }
        
                return `\n## ${author}\n${m.content.trim()}`;
                //return `\n\n${author}: ${m.content.trim()}`;
            }).join("") + `\n## Response\n`;

            const response = await globalFetch( "https://api.openai.com/v1/completions", {
                body: {
                    model: "gpt-3.5-turbo-instruct",
                    prompt: prompt,
                    max_tokens: maxTokens,
                    temperature: temperature,
                    top_p: 1,
                    stop:["User:"," User:", "user:", " user:"],
                    presence_penalty: arg.PresensePenalty || (db.PresensePenalty / 100),
                    frequency_penalty: arg.frequencyPenalty || (db.frequencyPenalty / 100),
                },
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + db.openAIKey
                },
            });

            if(!response.ok){
                return {
                    type: 'fail',
                    result: (language.errors.httpError + `${JSON.stringify(response.data)}`)
                }
            }
            const text:string = response.data.choices[0].text
            return {
                type: 'success',
                result: text.replace(/##\n/g, '')
            }
        }
        case "textgen_webui":
        case 'mancer':{
            let streamUrl = db.textgenWebUIStreamURL.replace(/\/api.*/, "/api/v1/stream")
            let blockingUrl = db.textgenWebUIBlockingURL.replace(/\/api.*/, "/api/v1/generate")
            let bodyTemplate:any
            const suggesting = model === "submodel"
            const proompt = stringlizeChatOba(formated, currentChar.name, suggesting, arg.continue)
            let stopStrings = getStopStrings(suggesting)
            if(db.localStopStrings){
                stopStrings = db.localStopStrings.map((v) => {
                    return risuChatParser(v.replace(/\\n/g, "\n"))
                })
            }
            bodyTemplate = {
                'max_new_tokens': db.maxResponse,
                'do_sample': db.ooba.do_sample,
                'temperature': (db.temperature / 100),
                'top_p': db.ooba.top_p,
                'typical_p': db.ooba.typical_p,
                'repetition_penalty': db.ooba.repetition_penalty,
                'encoder_repetition_penalty': db.ooba.encoder_repetition_penalty,
                'top_k': db.ooba.top_k,
                'min_length': db.ooba.min_length,
                'no_repeat_ngram_size': db.ooba.no_repeat_ngram_size,
                'num_beams': db.ooba.num_beams,
                'penalty_alpha': db.ooba.penalty_alpha,
                'length_penalty': db.ooba.length_penalty,
                'early_stopping': false,
                'truncation_length': maxTokens,
                'ban_eos_token': db.ooba.ban_eos_token,
                'stopping_strings': stopStrings,
                'seed': -1,
                add_bos_token: db.ooba.add_bos_token,
                topP: db.top_p,
                prompt: proompt
            }

            const headers = (aiModel === 'textgen_webui') ? {} : {
                'X-API-KEY': db.mancerHeader
            }

            if(db.useStreaming && arg.useStreaming){
                const oobaboogaSocket = new WebSocket(streamUrl);
                const statusCode = await new Promise((resolve) => {
                    oobaboogaSocket.onopen = () => resolve(0)
                    oobaboogaSocket.onerror = () => resolve(1001)
                    oobaboogaSocket.onclose = ({ code }) => resolve(code)
                })
                if(abortSignal.aborted || statusCode !== 0) {
                    oobaboogaSocket.close()
                    return ({
                        type: "fail",
                        result: abortSignal.reason || `WebSocket connection failed to '${streamUrl}' failed!`,
                    })
                }

                const close = () => {
                    oobaboogaSocket.close()
                }
                const stream = new ReadableStream({
                    start(controller){
                        let readed = "";
                        oobaboogaSocket.onmessage = async (event) => {
                            const json = JSON.parse(event.data);
                            if (json.event === "stream_end") {
                                close()
                                controller.close()
                                return
                            }
                            if (json.event !== "text_stream") return
                            readed += json.text
                            controller.enqueue(readed)
                        };
                        oobaboogaSocket.send(JSON.stringify(bodyTemplate));
                    },
                    cancel(){
                        close()
                    }
                })
                oobaboogaSocket.onerror = close
                oobaboogaSocket.onclose = close
                abortSignal.addEventListener("abort", close)

                return {
                    type: 'streaming',
                    result: stream
                }
            }

            const res = await globalFetch(blockingUrl, {
                body: bodyTemplate,
                headers: headers,
                abortSignal
            })
            
            const dat = res.data as any
            if(res.ok){
                try {
                    let result:string = dat.results[0].text
                    if(suggesting){
                        result = "\n" + db.autoSuggestPrefix + result
                    }

                    return {
                        type: 'success',
                        result: unstringlizeChat(result, formated, currentChar?.name ?? '')
                    }
                } catch (error) {                    
                    return {
                        type: 'fail',
                        result: (language.errors.httpError + `${error}`)
                    }
                }
            }
            else{
                return {
                    type: 'fail',
                    result: (language.errors.httpError + `${JSON.stringify(res.data)}`)
                }
            }
        }
        
        case 'ooba': {
            const suggesting = model === "submodel"
            const proompt = stringlizeChatOba(formated, currentChar.name, suggesting, arg.continue)
            let stopStrings = getStopStrings(suggesting)
            if(db.localStopStrings){
                stopStrings = db.localStopStrings.map((v) => {
                    return risuChatParser(v.replace(/\\n/g, "\n"))
                })
            }
            let bodyTemplate:Record<string, any> = {
                'prompt': proompt,
                presence_penalty: arg.PresensePenalty || (db.PresensePenalty / 100),
                frequency_penalty: arg.frequencyPenalty || (db.frequencyPenalty / 100),
                logit_bias: {},
                max_tokens: maxTokens,
                stop: stopStrings,
                temperature: temperature,
                top_p: db.top_p,
            }

            const url = new URL(db.textgenWebUIBlockingURL)
            url.pathname = "/v1/completions"
            const urlStr = url.toString()

            const OobaBodyTemplate = db.reverseProxyOobaArgs
            const keys = Object.keys(OobaBodyTemplate)
            for(const key of keys){
                if(OobaBodyTemplate[key] !== undefined && OobaBodyTemplate[key] !== null){
                    bodyTemplate[key] = OobaBodyTemplate[key]
                }
            }

            const response = await globalFetch(urlStr, {
                body: bodyTemplate,
            })

            if(!response.ok){
                return {
                    type: 'fail',
                    result: (language.errors.httpError + `${JSON.stringify(response.data)}`)
                }
            }
            const text:string = response.data.choices[0].text
            return {
                type: 'success',
                result: text.replace(/##\n/g, '')
            }
            
        }

        case 'custom':{
            const d = await pluginProcess({
                bias: bias,
                prompt_chat: formated,
                temperature: (db.temperature / 100),
                max_tokens: maxTokens,
                presence_penalty: (db.PresensePenalty / 100),
                frequency_penalty: (db.frequencyPenalty / 100)
            })
            if(!d){
                return {
                    type: 'fail',
                    result: (language.errors.unknownModel)
                }
            }
            else if(!d.success){
                return {
                    type: 'fail',
                    result: d.content
                }
            }
            else{
                return {
                    type: 'success',
                    result: d.content
                }
            }
            break
        }
        case 'palm2':
        case 'palm2_unicorn':{
            const bodyData = {
                "instances": [
                    {
                        "content": stringlizeChat(formated, currentChar?.name ?? '', arg.continue)
                    }
                ],
                "parameters": {
                    "candidateCount": 1,
                    "maxOutputTokens": maxTokens,
                    "stopSequences": [
                        "system:", "user:", "assistant:"
                    ],
                    "temperature": temperature,
                }
            };

            const API_ENDPOINT="us-central1-aiplatform.googleapis.com"
            const PROJECT_ID=db.google.projectId
            const MODEL_ID= aiModel === 'palm2' ? 'text-bison' :
                                        'palm2_unicorn' ? 'text-unicorn' : 
                                        ''
            const LOCATION_ID="us-central1"

            const url = `https://${API_ENDPOINT}/v1/projects/${PROJECT_ID}/locations/${LOCATION_ID}/publishers/google/models/${MODEL_ID}:predict`;
            const res = await globalFetch(url, {
                body: bodyData,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + db.google.accessToken
                },
                abortSignal
            })
            if(res.ok){
                console.log(res.data)
                if(res.data.predictions){
                    let output:string = res.data.predictions[0].content
                    const ind = output.search(/(system note)|(user)|(assistant):/gi)
                    if(ind >= 0){
                        output = output.substring(0, ind)
                    }
                    return {
                        type: 'success',
                        result: output
                    }
                }
                else{
                    return {
                        type: 'fail',
                        result: `${JSON.stringify(res.data)}`
                    }
                }
            }
            else{
                return {
                    type: 'fail',
                    result: `${JSON.stringify(res.data)}`
                }
            }
        }
        case 'gemini-pro':
        case 'gemini-pro-vision':{
            interface GeminiPart{
                text?:string
                "inlineData"?: {
                    "mimeType": string,
                    "data": string
                },
            }
            
            interface GeminiChat {
                role: "USER"|"MODEL"
                parts:|GeminiPart[]
            }


            let reformatedChat:GeminiChat[] = []
            let pendingImage = ''

            for(let i=0;i<formated.length;i++){
                const chat = formated[i]
                if(chat.memo && chat.memo.startsWith('inlayImage')){
                    pendingImage = chat.content
                    continue
                }
                if(i === 0){
                    if(chat.role === 'user' || chat.role === 'assistant'){
                        reformatedChat.push({
                            role: chat.role === 'user' ? 'USER' : 'MODEL',
                            parts: [{
                                text: chat.content
                            }]
                        })
                    }
                    else{
                        reformatedChat.push({
                            role: "USER",
                            parts: [{
                                text: chat.role + ':' + chat.content
                            }]
                        })
                    }
                }
                else{
                    const prevChat = reformatedChat[reformatedChat.length-1]
                    const qRole = 
                        chat.role === 'user' ? 'USER' :
                        chat.role === 'assistant' ? 'MODEL' :
                        chat.role

                    if(prevChat.role === qRole){
                        reformatedChat[reformatedChat.length-1].parts[0].text += '\n' + chat.content
                        continue
                    }
                    else if(chat.role === 'system'){
                        if(prevChat.role === 'USER'){
                            reformatedChat[reformatedChat.length-1].parts[0].text += '\nsystem:' + chat.content
                        }
                        else{
                            reformatedChat.push({
                                role: "USER",
                                parts: [{
                                    text: chat.role + ':' + chat.content
                                }]
                            })
                        }
                    }
                    else if(chat.role === 'user' && pendingImage !== ''){
                        //conver image to jpeg so it can be inlined
                        const canv = document.createElement('canvas')
                        const img = new Image()
                        img.src = pendingImage  
                        await img.decode()
                        canv.width = img.width
                        canv.height = img.height
                        const ctx = canv.getContext('2d')
                        ctx.drawImage(img, 0, 0)
                        const base64 = canv.toDataURL('image/jpeg').replace(/^data:image\/jpeg;base64,/, "")
                        const mimeType = 'image/jpeg'
                        pendingImage = ''
                        canv.remove()
                        img.remove()

                        reformatedChat.push({
                            role: "USER",
                            parts: [
                            {
                                text: chat.content,
                            },
                            {
                                inlineData: {
                                    mimeType: mimeType,
                                    data: base64
                                }
                            }]
                        })
                    }
                    else if(chat.role === 'assistant' || chat.role === 'user'){
                        reformatedChat.push({
                            role: chat.role === 'user' ? 'USER' : 'MODEL',
                            parts: [{
                                text: chat.content
                            }]
                        })
                    }
                    else{
                        reformatedChat.push({
                            role: "USER",
                            parts: [{
                                text: chat.role + ':' + chat.content
                            }]
                        })
                    }
                }
            }

            const uncensoredCatagory = [
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_NONE"
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH",
                    "threshold": "BLOCK_NONE"
                },
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_NONE"
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_NONE"
                },
            ]


            const body = {
                contents: reformatedChat,
                generation_config: {
                    "maxOutputTokens": maxTokens,
                    "temperature": temperature,
                    "topP": db.top_p,
                },
                safetySettings: uncensoredCatagory
            }

            let headers:{[key:string]:string} = {}

            const PROJECT_ID=db.google.projectId
            const REGION="us-central1"
            if(PROJECT_ID !== 'aigoogle'){
                headers['Authorization'] = "Bearer " + db.google.accessToken
            }

            const url = PROJECT_ID !== 'aigoogle' ?
                `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/${aiModel}:streamGenerateContent`
                : `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${db.google.accessToken}`
            const res = await globalFetch(url, {
                headers: headers,
                body: body,
            })

            if(!res.ok){
                return {
                    type: 'fail',
                    result: `${JSON.stringify(res.data)}`
                }
            }

            let fullRes = ''

            const processDataItem = (data:any) => {
                if(data?.candidates?.[0]?.content?.parts?.[0]?.text){
                    fullRes += data.candidates[0].content.parts[0].text
                }
                else if(data?.errors){
                    return {
                        type: 'fail',
                        result: `${JSON.stringify(data.errors)}`
                    }
                }
                else{
                    return {
                        type: 'fail',
                        result: `${JSON.stringify(data)}`
                    }
                }
            }

            // traverse responded data if it contains multipart contents
            if (typeof (res.data)[Symbol.iterator] === 'function') {
                for(const data of res.data){
                    processDataItem(data)
                }
            } else {
                processDataItem(res.data)
            }

            return {
                type: 'success',
                result: fullRes
            }

        }
        case "kobold":{
            const proompt = stringlizeChat(formated, currentChar?.name ?? '', arg.continue)
            const url = new URL(db.koboldURL)
            if(url.pathname.length < 3){
                url.pathname = 'api/v1/generate'
            }
            
            const da = await globalFetch(url.toString(), {
                method: "POST",
                body: {
                    "prompt": proompt,
                    "temperature": (db.temperature / 100),
                    "top_p": 0.9
                },
                headers: {
                    "content-type": "application/json",
                },
                abortSignal
            })

            if(!da.ok){
                return {
                    type: "fail",
                    result: da.data,
                    noRetry: true
                }
            }

            const data = da.data
            return {
                type: 'success',
                result: data.results[0].text
            }
        }
        case "novellist":
        case "novellist_damsel":{
            const auth_key = db.novellistAPI;
            const api_server_url = 'https://api.tringpt.com/';
            const logit_bias:string[] = []
            const logit_bias_values:string[] = []
            for(let i=0;i<biasString.length;i++){
                const bia = biasString[i]
                logit_bias.push(bia[0])
                logit_bias_values.push(bia[1].toString())
            }
            const headers = {
                'Authorization': `Bearer ${auth_key}`,
                'Content-Type': 'application/json'
            };
            
            const send_body = {
                text: stringlizeAINChat(formated, currentChar?.name ?? '', arg.continue),
                length: maxTokens,
                temperature: temperature,
                top_p: db.ainconfig.top_p,
                top_k: db.ainconfig.top_k,
                rep_pen: db.ainconfig.rep_pen,
                top_a: db.ainconfig.top_a,
                rep_pen_slope: db.ainconfig.rep_pen_slope,
                rep_pen_range: db.ainconfig.rep_pen_range,
                typical_p: db.ainconfig.typical_p,
                badwords: db.ainconfig.badwords,
                model: aiModel === 'novellist_damsel' ? 'damsel' : 'supertrin',
                stoptokens: ["「"].join("<<|>>") + db.ainconfig.stoptokens,
                logit_bias: (logit_bias.length > 0) ? logit_bias.join("<<|>>") : undefined,
                logit_bias_values: (logit_bias_values.length > 0) ? logit_bias_values.join("|") : undefined,
            };
            const response = await globalFetch(api_server_url + '/api', {
                method: 'POST',
                headers: headers,
                body: send_body
            });

            if(!response.ok){
                return {
                    type: 'fail',
                    result: response.data
                }
            }

            if(response.data.error){
                return {
                    'type': 'fail',
                    'result': `${response.data.error.replace("token", "api key")}`
                }
            }

            const result = response.data.data[0];
            const unstr = unstringlizeAIN(result, formated, currentChar?.name ?? '')
            return {
                'type': 'multiline',
                'result': unstr
            }
        }
        case "deepai":{

            for(let i=0;i<formated.length;i++){
                delete formated[i].memo
                delete formated[i].name
                if(arg.isGroupChat && formated[i].name && formated[i].role === 'assistant'){
                    formated[i].content = formated[i].name + ": " + formated[i].content
                }
                if(formated[i].role !== 'assistant' && formated[i].role !== 'user'){
                    formated[i].content = formated[i].role + ": " + formated[i].content
                    formated[i].role = 'assistant'
                }
                formated[i].name = undefined
            }

            const response = await createDeep([{
                role: 'user',
                content: stringlizeChat(formated, currentChar?.name ?? '', arg.continue)
            }])

            if(!response.ok){
                return {
                    type: 'fail',
                    result: response.data
                }
            }

            const result = Buffer.from(response.data).toString('utf-8')

            return {
                'type': 'success',
                'result': result
            }
        }
        default:{     
            if(raiModel.startsWith('claude')){

                let replacerURL = (aiModel === 'reverse_proxy') ? (db.forceReplaceUrl) : ('https://api.anthropic.com/v1/complete')
                let apiKey = (aiModel === 'reverse_proxy') ?  db.proxyKey : db.claudeAPIKey
                if(aiModel === 'reverse_proxy'){
                    if(replacerURL.endsWith('v1')){
                        replacerURL += '/complete'
                    }
                    else if(replacerURL.endsWith('v1/')){
                        replacerURL += 'complete'
                    }
                    else if(!(replacerURL.endsWith('complete') || replacerURL.endsWith('complete/'))){
                        if(replacerURL.endsWith('/')){
                            replacerURL += 'v1/complete'
                        }
                        else{
                            replacerURL += '/v1/complete'
                        }
                    }
                }

                for(let i=0;i<formated.length;i++){
                    if(arg.isGroupChat && formated[i].name){
                        formated[i].content = formated[i].name + ": " + formated[i].content
                    }
                    formated[i].name = undefined
                }



                let requestPrompt = formated.map((v, i) => {
                    let prefix = ''
                    switch (v.role){
                        case "assistant":
                            prefix = "\n\nAssistant: "
                            break
                        case "user":
                            prefix = "\n\nHuman: "
                            break
                        case "system":
                            prefix = "\n\nSystem: "
                            break
                    }
                    if(raiModel.startsWith('claude-2') && (!raiModel.startsWith('claude-2.0'))){
                        if(v.role === 'system' && i === 0){
                            prefix = ''
                        }
                    }
                    return prefix + v.content
                }).join('') + '\n\nAssistant: '


                const bedrock = db.claudeAws
                  
                if(bedrock){
                    function getCredentialParts(key:string) {
                        const [accessKeyId, secretAccessKey, region] = key.split(":");
                      
                        if (!accessKeyId || !secretAccessKey || !region) {
                          throw new Error("The key assigned to this request is invalid.");
                        }
                      
                        return { accessKeyId, secretAccessKey, region };
                    }
                    const { accessKeyId, secretAccessKey, region } = getCredentialParts(apiKey);

                    const AMZ_HOST = "invoke-bedrock.%REGION%.amazonaws.com";
                    const host = AMZ_HOST.replace("%REGION%", region);

                    const stream = false
                    const url = `https://${host}/model/${model}/invoke${stream ? "-with-response-stream" : ""}`
                    const params = {
                        prompt : "\n\nHuman: " + requestPrompt,
                        model: raiModel,
                        max_tokens_to_sample: maxTokens,
                        stop_sequences: ["\n\nHuman:", "\n\nSystem:", "\n\nAssistant:"],
                        temperature: temperature,
                    }
                    const rq = new HttpRequest({
                        method: "POST",
                        protocol: "https:",
                        hostname: host,
                        path: `/model/${model}/invoke${stream ? "-with-response-stream" : ""}`,
                        headers: {
                          ["Host"]: host,
                          ["content-type"]: "application/json",
                          ["accept"]: "application/json",
                          "anthropic-version": "2023-06-01",
                        },
                        body: JSON.stringify(params),
                    });                    


                    const signer = new SignatureV4({
                        sha256: Sha256,
                        credentials: { accessKeyId, secretAccessKey },
                        region,
                        service: "bedrock",
                    });

                    const signed = await signer.sign(rq);

                    const da = await globalFetch(`${signed.protocol}//${signed.hostname}`, {
                        method: "POST",
                        body: params,
                        headers: {
                            ["Host"]: host,
                            ["content-type"]: "application/json",
                            ["accept"]: "application/json",
                            "anthropic-version": "2023-06-01",
                        }
                    })

                      
                    if((!da.ok) || (da.data.error)){
                        return {
                            type: 'fail',
                            result: `${JSON.stringify(da.data)}`
                        }
                    }
    
                    const res = da.data
    
                    return {
                        type: "success",
                        result: res.completion,
                    }
                }

                const da = await globalFetch(replacerURL, {
                    method: "POST",
                    body: {
                        prompt : "\n\nHuman: " + requestPrompt,
                        model: raiModel,
                        max_tokens_to_sample: maxTokens,
                        stop_sequences: ["\n\nHuman:", "\n\nSystem:", "\n\nAssistant:"],
                        temperature: temperature,
                    },
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": apiKey,
                        "anthropic-version": "2023-06-01",
                        "accept": "application/json"
                    },
                    useRisuToken: aiModel === 'reverse_proxy'
                })

                if((!da.ok) || (da.data.error)){
                    return {
                        type: 'fail',
                        result: `${JSON.stringify(da.data)}`
                    }
                }

                const res = da.data

                return {
                    type: "success",
                    result: res.completion,
                }

            }
            if(aiModel.startsWith("horde:::")){
                const proompt = stringlizeChat(formated, currentChar?.name ?? '', arg.continue)

                const realModel = aiModel.split(":::")[1]

                const argument = {
                    "prompt": proompt,
                    "params": {
                        "n": 1,
                        "max_context_length": db.maxContext + 100,
                        "max_length": db.maxResponse,
                        "singleline": false,
                        "temperature": db.temperature / 100,
                        "top_k": db.top_k,
                        "top_p": db.top_p,
                    },
                    "trusted_workers": false,
                    "workerslow_workers": true,
                    "_blacklist": false,
                    "dry_run": false,
                    "models": [realModel, realModel.trim(), ' ' + realModel, realModel + ' ']
                }

                if(realModel === 'auto'){
                    delete argument.models
                }

                let apiKey = '0000000000'
                if(db.hordeConfig.apiKey.length > 2){
                    apiKey = db.hordeConfig.apiKey
                }

                const da = await fetch("https://stablehorde.net/api/v2/generate/text/async", {
                    body: JSON.stringify(argument),
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        "apikey": apiKey
                    },
                    signal: abortSignal
                })

                if(da.status !== 202){
                    return {
                        type: "fail",
                        result: await da.text()
                    }
                }

                const json:{
                    id:string,
                    kudos:number,
                    message:string
                } = await da.json()

                let warnMessage = ""
                if(json.message){
                    warnMessage = "with " + json.message
                }

                while(true){
                    await sleep(2000)
                    const data = await (await fetch("https://stablehorde.net/api/v2/generate/text/status/" + json.id)).json()
                    if(!data.is_possible){
                        fetch("https://stablehorde.net/api/v2/generate/text/status/" + json.id, {
                            method: "DELETE"
                        })
                        return {
                            type: 'fail',
                            result: "Response not possible" + warnMessage,
                            noRetry: true
                        }
                    }
                    if(data.done && Array.isArray(data.generations) && data.generations.length > 0){
                        const generations:{text:string}[] = data.generations
                        if(generations && generations.length > 0){
                            return {
                                type: "success",
                                result: unstringlizeChat(generations[0].text, formated, currentChar?.name ?? '')
                            }
                        }
                        return {
                            type: 'fail',
                            result: "No Generations when done",
                            noRetry: true
                        }
                    }
                }


            }
            if(aiModel.startsWith('hf:::')){
                const realModel = aiModel.split(":::")[1]
                const suggesting = model === "submodel"
                const proompt = stringlizeChatOba(formated, currentChar.name, suggesting, arg.continue)
                const v = await runTransformers(proompt, realModel, {
                    temperature: temperature,
                    max_new_tokens: maxTokens,
                    top_k: db.ooba.top_k,
                    top_p: db.ooba.top_p,
                    repetition_penalty: db.ooba.repetition_penalty,
                    typical_p: db.ooba.typical_p,
                })
                return {
                    type: 'success',
                    result: unstringlizeChat(v.generated_text, formated, currentChar?.name ?? '')
                }
            }
            if(aiModel.startsWith('local_')){
                console.log('running local model')
                const suggesting = model === "submodel"
                const proompt = stringlizeChatOba(formated, currentChar.name, suggesting, arg.continue)
                const stopStrings = getStopStrings(suggesting)
                await runLocalModel(proompt)
            }
            return {
                type: 'fail',
                result: (language.errors.unknownModel)
            }
        }
    }
}


let userString = ''
let requestedTimes = 999
let refreshTime = 0
function getOpenUserString(){
    if(refreshTime < Date.now() && requestedTimes > 2 ){
        refreshTime = Date.now() + (300000 * Math.random()) + 60000
        userString = v4()
        requestedTimes = 0
    }
    requestedTimes += 1
    console.log(userString)
    return userString
}

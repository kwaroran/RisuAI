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
import { tokenizeNum } from "../tokenizer";

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
    noRetry?: boolean,
    special?: {
        emotion?: string
    }
}|{
    type: "multiline",
    result: ['user'|'char',string][],
    noRetry?: boolean,
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




export async function requestChatDataMain(arg:requestDataArgument, model:'model'|'submodel', abortSignal:AbortSignal=null):Promise<requestDataResponse> {
    const db = get(DataBase)
    let result = ''
    let formated = arg.formated
    let maxTokens = arg.maxTokens ??db.maxResponse
    let temperature = arg.temperature ?? (db.temperature / 100)
    let bias = arg.bias
    let currentChar = arg.currentChar
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
    switch(raiModel){
        case 'gpt35':
        case 'gpt35_0613':
        case 'gpt35_16k':
        case 'gpt35_16k_0613':
        case 'gpt4':
        case 'gpt4_32k':
        case 'gpt4_0613':
        case 'gpt4_32k_0613':
        case 'gpt35_0301':
        case 'gpt4_0301':
        case 'openrouter':
        case 'reverse_proxy':{
            for(let i=0;i<formated.length;i++){
                if(formated[i].role !== 'function'){
                    if(arg.isGroupChat && formated[i].name){
                        formated[i].content = formated[i].name + ": " + formated[i].content
                    }
                    formated[i].name = undefined
                    delete formated[i].memo
                }
            }

            for(let i=0;i<biasString.length;i++){
                const bia = biasString[i]
                const tokens = await tokenizeNum(bia[0])
        
                for(const token of tokens){
                    bias[token] = bia[1]
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
            const requestModel = (aiModel === 'reverse_proxy' || aiModel === 'openrouter') ? db.proxyRequestModel : aiModel
            const body = ({
                model: aiModel === 'openrouter' ? db.openrouterRequestModel :
                    requestModel ===  'gpt35' ? 'gpt-3.5-turbo'
                    : requestModel ===  'gpt35_0613' ? 'gpt-3.5-turbo-0613'
                    : requestModel ===  'gpt35_16k' ? 'gpt-3.5-turbo-16k'
                    : requestModel ===  'gpt35_16k_0613' ? 'gpt-3.5-turbo-16k-0613'
                    : requestModel === 'gpt4' ? 'gpt-4'
                    : requestModel === 'gpt4_32k' ? 'gpt-4-32k'
                    : requestModel === "gpt4_0613" ? 'gpt-4-0613'
                    : requestModel === "gpt4_32k_0613" ? 'gpt-4-32k-0613'
                    : requestModel === 'gpt35_0301' ? 'gpt-3.5-turbo-0301'
                    : requestModel === 'gpt4_0301' ? 'gpt-4-0301'
                    : (!requestModel) ? 'gpt-3.5-turbo'
                    : requestModel,
                messages: formated,
                temperature: temperature,
                max_tokens: maxTokens,
                presence_penalty: arg.PresensePenalty || (db.PresensePenalty / 100),
                frequency_penalty: arg.frequencyPenalty || (db.frequencyPenalty / 100),
                logit_bias: bias,
                stream: false
            })

            let replacerURL = aiModel === 'openrouter' ? "https://openrouter.ai/api/v1/chat/completions" :
                (aiModel === 'reverse_proxy') ? (db.forceReplaceUrl) : ('https://api.openai.com/v1/chat/completions')

            let risuIdentify = false
            if(replacerURL.startsWith("risu::")){
                risuIdentify = true
                replacerURL.replace("risu::", '')
            }

            if(aiModel === 'reverse_proxy'){
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
            let throughProxi = (!isTauri) && (!isNodeServer) && (!db.usePlainFetch)
            if(db.useStreaming && arg.useStreaming){
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
            const proompt = stringlizeNAIChat(formated, currentChar?.name ?? '')
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
                prefix: 'vanilla',
                order: [2, 3, 0, 4, 1],
                typical_p: gen.typicalp,
                repetition_penalty_whitelist:[49256,49264,49231,49230,49287,85,49255,49399,49262,336,333,432,363,468,492,745,401,426,623,794,1096,2919,2072,7379,1259,2110,620,526,487,16562,603,805,761,2681,942,8917,653,3513,506,5301,562,5010,614,10942,539,2976,462,5189,567,2032,123,124,125,126,127,128,129,130,131,132,588,803,1040,49209,4,5,6,7,8,9,10,11,12],
                stop_sequences: [[49287]],
                bad_words_ids: NovelAIBadWordIds,
                logit_bias_exp: logit_bias_exp
                
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

        case "textgen_webui":
        case 'mancer':{
            let streamUrl = db.textgenWebUIStreamURL.replace(/\/api.*/, "/api/v1/stream")
            let blockingUrl = db.textgenWebUIBlockingURL.replace(/\/api.*/, "/api/v1/generate")
            let bodyTemplate:any
            const suggesting = model === "submodel"
            const proompt = stringlizeChatOba(formated, currentChar.name, suggesting)
            const stopStrings = getStopStrings(suggesting)
            console.log(proompt)
            console.log(stopStrings)
            bodyTemplate = {
                'max_new_tokens': db.maxResponse,
                'do_sample': true,
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
                'ban_eos_token': false,
                'stopping_strings': stopStrings,
                'seed': -1,
                add_bos_token: true,
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
        case 'palm2':{
            const body = {
                "prompt": {
                      "text": stringlizeChat(formated, currentChar?.name ?? '')
                },
                "safetySettings":[
                    {
                        "category": "HARM_CATEGORY_UNSPECIFIED",
                        "threshold": "BLOCK_NONE"
                    },
                    {
                        "category": "HARM_CATEGORY_DEROGATORY",
                        "threshold": "BLOCK_NONE"
                    },
                    {
                        "category": "HARM_CATEGORY_TOXICITY",
                        "threshold": "BLOCK_NONE"
                    },
                    {
                        "category": "HARM_CATEGORY_VIOLENCE",
                        "threshold": "BLOCK_NONE"
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUAL",
                        "threshold": "BLOCK_NONE"
                    },
                    {
                        "category": "HARM_CATEGORY_MEDICAL",
                        "threshold": "BLOCK_NONE"
                    },
                    {
                        "category": "HARM_CATEGORY_DANGEROUS",
                        "threshold": "BLOCK_NONE"
                    }
                ],
                "temperature": arg.temperature,
                "maxOutputTokens": arg.maxTokens,
                "candidate_count": 1
            }
            const res = await globalFetch(`https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=${db.palmAPI}`, {
                body: body,
                headers: {
                    "Content-Type": "application/json"
                },
                abortSignal
            })

            if(res.ok){
                if(res.data.candidates){
                    let output:string = res.data.candidates[0].output
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
        case "kobold":{
            const proompt = stringlizeChat(formated, currentChar?.name ?? '')
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
                text: stringlizeAINChat(formated, currentChar?.name ?? ''),
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
                content: stringlizeChat(formated, currentChar?.name ?? '')
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



                let requestPrompt = formated.map((v) => {
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
                    return prefix + v.content
                }).join('') + '\n\nAssistant: '

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
                    useRisuToken: true
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
                const proompt = stringlizeChat(formated, currentChar?.name ?? '')

                const realModel = aiModel.split(":::")[1]

                const argument = {
                    "prompt": proompt,
                    "params": {
                        "n": 1,
                        "frmtadsnsp": false,
                        "frmtrmblln": false,
                        "frmtrmspch": false,
                        "frmttriminc": false,
                        "max_context_length": db.maxContext + 100,
                        "max_length": db.maxResponse,
                        "rep_pen": 3,
                        "rep_pen_range": 0,
                        "rep_pen_slope": 10,
                        "singleline": false,
                        "temperature": db.temperature / 100,
                        "tfs": 1,
                        "top_a": 1,
                        "top_k": 100,
                        "top_p": 1,
                        "typical": 1,
                        "sampler_order": [
                            0
                        ]
                    },
                    "trusted_workers": false,
                    "workerslow_workers": true,
                    "_blacklist": false,
                    "dry_run": false,
                    "models": [realModel, realModel.trim(), ' ' + realModel, realModel + ' ']
                }

                const da = await fetch("https://stablehorde.net/api/v2/generate/text/async", {
                    body: JSON.stringify(argument),
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        "apikey": db.hordeConfig.apiKey
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
            return {
                type: 'fail',
                result: (language.errors.unknownModel)
            }
        }
    }
}
import { get } from "svelte/store";
import type { MultiModal, OpenAIChat, OpenAIChatFull } from "./index.svelte";
import { getDatabase, type character } from "../storage/database.svelte";
import { pluginProcess } from "../plugins/plugins";
import { language } from "../../lang";
import { stringlizeAINChat, stringlizeChat, getStopStrings, unstringlizeAIN, unstringlizeChat } from "./stringlize";
import { addFetchLog, fetchNative, globalFetch, isNodeServer, isTauri, textifyReadableStream } from "../globalApi.svelte";
import { sleep } from "../util";
import { NovelAIBadWordIds, stringlizeNAIChat } from "./models/nai";
import { strongBan, tokenize, tokenizeNum } from "../tokenizer";
import { runGGUFModel } from "./models/local";
import { risuChatParser } from "../parser.svelte";
import { SignatureV4 } from "@smithy/signature-v4";
import { HttpRequest } from "@smithy/protocol-http";
import { Sha256 } from "@aws-crypto/sha256-js";
import { v4 } from "uuid";
import { supportsInlayImage } from "./files/image";
import { Capacitor } from "@capacitor/core";
import { getFreeOpenRouterModel } from "../model/openrouter";
import { runTransformers } from "./transformers";
import {createParser} from 'eventsource-parser'
import {Ollama} from 'ollama/dist/browser.mjs'
import { applyChatTemplate } from "./templates/chatTemplate";
import { OobaParams } from "./prompt";
import { extractJSON, getOpenAIJSONSchema } from "./templates/jsonSchema";



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
    chatId?:string
    noMultiGen?:boolean
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
    result: ReadableStream<StreamResponseChunk>,
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

interface StreamResponseChunk{[key:string]:string}

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


type Parameter = 'temperature'|'top_k'|'repetition_penalty'|'min_p'|'top_a'|'top_p'|'frequency_penalty'|'presence_penalty'
type ParameterMap = {
    [key in Parameter]?: string;
};

function applyParameters(data: { [key: string]: any }, parameters: Parameter[], rename: ParameterMap = {}) {
    const db = getDatabase()
    for(const parameter of parameters){
        let value = 0
        switch(parameter){
            case 'temperature':{
                value = db.temperature === -1000 ? -1000 : (db.temperature / 100)
                break
            }
            case 'top_k':{
                value = db.top_k
                break
            }
            case 'repetition_penalty':{
                value = db.repetition_penalty
                break
            }
            case 'min_p':{
                value = db.min_p
                break
            }
            case 'top_a':{
                value = db.top_a
                break
            }
            case 'top_p':{
                value = db.top_p
                break
            }
            case 'frequency_penalty':{
                value = db.frequencyPenalty === -1000 ? -1000 : (db.frequencyPenalty / 100)
                break
            }
            case 'presence_penalty':{
                value = db.PresensePenalty === -1000 ? -1000 : (db.PresensePenalty / 100)
                break
            }
        }

        if(value === -1000){
            continue
        }

        data[rename[parameter] ?? parameter] = value
    }
    return data
}

export async function requestChatData(arg:requestDataArgument, model:'model'|'submodel', abortSignal:AbortSignal=null):Promise<requestDataResponse> {
    const db = getDatabase()
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
    type: 'image'|'image_url'
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
    multimodals?:MultiModal[]
}


export async function requestChatDataMain(arg:requestDataArgument, model:'model'|'submodel', abortSignal:AbortSignal=null):Promise<requestDataResponse> {
    const db = getDatabase()
    let formated = safeStructuredClone(arg.formated)
    let maxTokens = arg.maxTokens ??db.maxResponse
    let temperature = arg.temperature ?? (db.temperature / 100)
    let bias = arg.bias
    let currentChar = arg.currentChar
    let useStreaming = db.useStreaming && arg.useStreaming
    arg.continue = arg.continue ?? false
    let biasString = arg.biasString ?? []
    const aiModel = model === 'model' ? db.aiModel : db.subModel
    const multiGen = (db.genTime > 1 && aiModel.startsWith('gpt') && (!arg.continue)) && (!arg.noMultiGen)

    let raiModel = aiModel
    if(aiModel === 'reverse_proxy'){
        if(db.proxyRequestModel === 'custom' && db.customProxyRequestModel.startsWith('claude')){
            raiModel = db.customProxyRequestModel
        }
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
        case 'gpt4_0125':
        case 'gpt35_0125':
        case 'gpt35_1106':
        case 'gpt35_0301':
        case 'gpt4_0314':
        case 'gptvi4_1106':
        case 'openrouter':
        case 'mistral-tiny':
        case 'mistral-small':
        case 'mistral-medium':
        case 'mistral-small-latest':
        case 'mistral-medium-latest':
        case 'mistral-large-latest':
        case 'open-mistral-nemo':
        case 'gpt4_turbo_20240409':
        case 'gpt4_turbo':
        case 'gpt4o':
        case 'gpt4o-2024-05-13':
        case 'gpt4om':
        case 'gpt4om-2024-07-18':
        case 'gpt4o-2024-08-06':
        case 'gpt4o-2024-11-20':
        case 'gpt4o-chatgpt':
        case 'gpt4o1-preview':
        case 'gpt4o1-mini':
        case 'jamba-1.5-large':
        case 'jamba-1.5-medium':
        case 'reverse_proxy':{
            let formatedChat:OpenAIChatExtra[] = []
            for(let i=0;i<formated.length;i++){
                const m = formated[i]
                if(m.multimodals && m.multimodals.length > 0 && m.role === 'user'){
                    let v:OpenAIChatExtra = safeStructuredClone(m)
                    let contents:OpenAIContents[] = []
                    for(let j=0;j<m.multimodals.length;j++){
                        contents.push({
                            "type": "image_url",
                            "image_url": {
                                "url": m.multimodals[j].base64,
                                "detail": db.gptVisionQuality
                            }
                        })
                    }
                    contents.push({
                        "type": "text",
                        "text": m.content
                    })
                    v.content = contents
                    formatedChat.push(v)
                }
                else{
                    formatedChat.push(m)
                }
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
                    delete formatedChat[i].multimodals
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

            if(aiModel.startsWith('gpt4o1')){
                for(let i=0;i<formatedChat.length;i++){
                    if(formatedChat[i].role === 'system'){
                        formatedChat[i].content = `<system>${formatedChat[i].content}</system>`
                        formatedChat[i].role = 'user'
                    }
                }
            }

            for(let i=0;i<biasString.length;i++){
                const bia = biasString[i]
                if(bia[0].startsWith('[[') && bia[0].endsWith(']]')){
                    const num = parseInt(bia[0].replace('[[', '').replace(']]', ''))
                    bias[num] = bia[1]
                    continue
                }

                if(bia[1] === -101){
                    bias = await strongBan(bia[0], bias)
                    continue
                }
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
            let requestModel = (aiModel === 'reverse_proxy' || aiModel === 'openrouter') ? db.proxyRequestModel : aiModel
            let openrouterRequestModel = db.openrouterRequestModel
            if(aiModel === 'reverse_proxy' && db.proxyRequestModel === 'custom'){
                requestModel = db.customProxyRequestModel
            }

            if(aiModel === 'openrouter' && db.openrouterRequestModel === 'risu/free'){
                openrouterRequestModel = await getFreeOpenRouterModel()
            }

            console.log(formatedChat)
            if(aiModel.startsWith('mistral') || aiModel === 'open-mistral-nemo'){
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
                        safe_prompt: false
                    },
                    headers: {
                        "Authorization": "Bearer " + db.mistralKey,
                    },
                    abortSignal,
                    chatId: arg.chatId
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
            let body:{
                [key:string]:any
            } = ({
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
                    : requestModel === 'gpt4_0125' ? 'gpt-4-0125-preview'
                    : requestModel === "gptvi4_1106" ? 'gpt-4-vision-preview'
                    : requestModel === "gpt35_0125" ? 'gpt-3.5-turbo-0125'
                    : requestModel === "gpt35_1106" ? 'gpt-3.5-turbo-1106'
                    : requestModel === 'gpt35_0301' ? 'gpt-3.5-turbo-0301'
                    : requestModel === 'gpt4_0314' ? 'gpt-4-0314'
                    : requestModel === 'gpt4_turbo_20240409' ? 'gpt-4-turbo-2024-04-09'
                    : requestModel === 'gpt4_turbo' ? 'gpt-4-turbo'
                    : requestModel === 'gpt4o' ? 'gpt-4o'
                    : requestModel === 'gpt4o-2024-05-13' ? 'gpt-4o-2024-05-13'
                    : requestModel === 'gpt4om' ? 'gpt-4o-mini'
                    : requestModel === 'gpt4om-2024-07-18' ? 'gpt-4o-mini-2024-07-18'
                    : requestModel === 'gpt4o-2024-08-06' ? 'gpt-4o-2024-08-06'
                    : requestModel === 'gpt4o-2024-11-20' ? 'gpt-4o-2024-11-20'
                    : requestModel === 'gpt4o-chatgpt' ? 'chatgpt-4o-latest'
                    : requestModel === 'gpt4o1-preview' ? 'o1-preview'
                    : requestModel === 'gpt4o1-mini' ? 'o1-mini'
                    : (!requestModel) ? 'gpt-3.5-turbo'
                    : requestModel,
                messages: formatedChat,
                max_tokens: maxTokens,
                logit_bias: bias,
                stream: false,

            })

            if(aiModel.startsWith('gpt4o1')){
                body.max_completion_tokens = body.max_tokens
                delete body.max_tokens
            }

            if(db.generationSeed > 0){
                body.seed = db.generationSeed
            }

            if(db.putUserOpen){
                body.user = getOpenUserString()
            }

            if(db.jsonSchemaEnabled){
                body.response_format = {
                    "type": "json_schema",
                    "json_schema": getOpenAIJSONSchema()
                }
            }

            if(db.OAIPrediction){
                body.prediction = {
                    type: "content",
                    content: db.OAIPrediction
                }
            }

            if(aiModel === 'openrouter'){
                if(db.openrouterFallback){
                    body.route = "fallback"
                }
                body.transforms = db.openrouterMiddleOut ? ['middle-out'] : []

                if(db.openrouterProvider){
                    body.provider = {
                        order: [db.openrouterProvider]
                    }
                }

                if(db.useInstructPrompt){
                    delete body.messages
                    const prompt = applyChatTemplate(formated)
                    body.prompt = prompt
                }
            }

            body = applyParameters(body,
                aiModel === 'openrouter' ? ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty', 'repetition_penalty', 'min_p', 'top_a', 'top_k'] : ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty']
            )

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
                // OpenAI's gpt based llm model supports both logit_bias and inlay image
                if(!(
                    aiModel.startsWith('gpt') || 
                    (aiModel == 'reverse_proxy' && (
                        db.proxyRequestModel?.startsWith('gpt') ||
                        (db.proxyRequestModel === 'custom' && db.customProxyRequestModel.startsWith('gpt'))
                    )))){
                    // @ts-ignore
                    delete body.logit_bias
                }
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
            if(aiModel.startsWith('jamba')){
                headers['Authorization'] = 'Bearer ' + db.ai21Key
                replacerURL = 'https://api.ai21.com/studio/v1/chat/completions'
            }
            if(multiGen){
                // @ts-ignore
                body.n = db.genTime
            }
            let throughProxi = (!isTauri) && (!isNodeServer) && (!db.usePlainFetch) && (!Capacitor.isNativePlatform())
            if(useStreaming){
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
                const da = await fetchNative(replacerURL, {
                    body: JSON.stringify(body),
                    method: "POST",
                    headers: headers,
                    signal: abortSignal,
                    chatId: arg.chatId
                })

                if(da.status !== 200){
                    return {
                        type: "fail",
                        result: await textifyReadableStream(da.body)
                    }
                }

                if (!da.headers.get('Content-Type').includes('text/event-stream')){
                    return {
                        type: "fail",
                        result: await textifyReadableStream(da.body)
                    }
                }

                addFetchLog({
                    body: body,
                    response: "Streaming",
                    success: true,
                    url: replacerURL,
                })

                let dataUint:Uint8Array|Buffer = new Uint8Array([])

                const transtream = new TransformStream<Uint8Array, StreamResponseChunk>(  {
                    async transform(chunk, control) {
                        dataUint = Buffer.from(new Uint8Array([...dataUint, ...chunk]))
                        let JSONreaded:{[key:string]:string} = {}
                        try {
                            const datas = dataUint.toString().split('\n')
                            let readed:{[key:string]:string} = {}
                            for(const data of datas){
                                if(data.startsWith("data: ")){
                                    try {
                                        const rawChunk = data.replace("data: ", "")
                                        if(rawChunk === "[DONE]"){
                                            if(db.extractJson && db.jsonSchemaEnabled){
                                                for(const key in readed){
                                                    const extracted = extractJSON(readed[key], db.extractJson)
                                                    JSONreaded[key] = extracted
                                                }
                                                console.log(JSONreaded)
                                                control.enqueue(JSONreaded)
                                            }
                                            else{
                                                control.enqueue(readed)
                                            }
                                            return
                                        }
                                        const choices = JSON.parse(rawChunk).choices
                                        for(const choice of choices){
                                            const chunk = choice.delta.content ?? choices.text
                                            if(chunk){
                                                if(multiGen){
                                                    const ind = choice.index.toString()
                                                    if(!readed[ind]){
                                                        readed[ind] = ""
                                                    }
                                                    readed[ind] += chunk
                                                }
                                                else{
                                                    if(!readed["0"]){
                                                        readed["0"] = ""
                                                    }
                                                    readed["0"] += chunk
                                                }
                                            }
                                        }
                                    } catch (error) {}
                                }
                            }
                            if(db.extractJson && db.jsonSchemaEnabled){
                                for(const key in readed){
                                    const extracted = extractJSON(readed[key], db.extractJson)
                                    JSONreaded[key] = extracted
                                }
                                console.log(JSONreaded)
                                control.enqueue(JSONreaded)
                            }
                            else{
                                control.enqueue(readed)
                            }
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

            if(raiModel === 'reverse_proxy'){
                const additionalParams = db.additionalParams
                for(let i=0;i<additionalParams.length;i++){
                    let key = additionalParams[i][0]
                    let value = additionalParams[i][1]

                    if(!key || !value){
                        continue
                    }

                    if(value === '{{none}}'){
                        if(key.startsWith('header::')){
                            key = key.replace('header::', '')
                            delete headers[key]
                        }
                        else{
                            delete body[key]
                        }
                        continue
                    }

                    if(key.startsWith('header::')){
                        key = key.replace('header::', '')
                        headers[key] = value
                    }
                    else if(value.startsWith('json::')){
                        value = value.replace('json::', '')
                        try {
                            body[key] = JSON.parse(value)                            
                        } catch (error) {}
                    }
                    else if(isNaN(parseFloat(value))){
                        body[key] = value
                    }
                    else{
                        body[key] = parseFloat(value)
                    }
                }
            }

            const res = await globalFetch(replacerURL, {
                body: body,
                headers: headers,
                abortSignal,
                useRisuToken:throughProxi,
                chatId: arg.chatId
            })

            const dat = res.data as any
            if(res.ok){
                try {
                    if(multiGen && dat.choices){
                        if(db.extractJson && db.jsonSchemaEnabled){

                            const c = dat.choices.map((v:{
                                message:{content:string}
                            }) => {
                                const extracted = extractJSON(v.message.content, db.extractJson)
                                return ["char",extracted]
                            })

                            return {
                                type: 'multiline',
                                result: c
                            }

                        }
                        return {
                            type: 'multiline',
                            result: dat.choices.map((v) => {
                                return ["char",v.message.content]
                            })
                        }

                    }

                    if(dat?.choices[0]?.text){
                        if(db.extractJson && db.jsonSchemaEnabled){
                            try {
                                const parsed = JSON.parse(dat.choices[0].text)
                                const extracted = extractJSON(parsed, db.extractJson)
                                return {
                                    type: 'success',
                                    result: extracted
                                }
                            } catch (error) {
                                console.log(error)
                                return {
                                    type: 'success',
                                    result: dat.choices[0].text
                                }
                            }
                        }
                        return {
                            type: 'success',
                            result: dat.choices[0].text
                        }
                    }
                    if(db.extractJson && db.jsonSchemaEnabled){
                        return {
                            type: 'success',
                            result:  extractJSON(dat.choices[0].message.content, db.extractJson)
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
            const prompt = stringlizeNAIChat(formated, currentChar?.name ?? '', arg.continue)
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
                "input": prompt,
                "model": aiModel === 'novelai_kayra' ? 'kayra-v1' : 'clio-v1',
                "parameters":payload
            }

            const da = await globalFetch(aiModel === 'novelai_kayra' ? "https://text.novelai.net/ai/generate" : "https://api.novelai.net/ai/generate", {
                body: body,
                headers: {
                    "Authorization": "Bearer " + db.novelai.token
                },
                abortSignal,
                chatId: arg.chatId
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
                    "Authorization": "Bearer " + db.openAIKey,
                },
                chatId: arg.chatId
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
            let bodyTemplate:{[key:string]:any} = {}
            const suggesting = model === "submodel"
            const prompt = applyChatTemplate(formated)
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
                prompt: prompt
            }

            const headers = (aiModel === 'textgen_webui') ? {} : {
                'X-API-KEY': db.mancerHeader
            }

            if(useStreaming){
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
                abortSignal,
                chatId: arg.chatId
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
            const prompt = applyChatTemplate(formated)
            let stopStrings = getStopStrings(suggesting)
            if(db.localStopStrings){
                stopStrings = db.localStopStrings.map((v) => {
                    return risuChatParser(v.replace(/\\n/g, "\n"))
                })
            }
            let bodyTemplate:Record<string, any> = {
                'prompt': prompt,
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
                if(OobaBodyTemplate[key] !== undefined && OobaBodyTemplate[key] !== null && OobaParams.includes(key)){
                    bodyTemplate[key] = OobaBodyTemplate[key]
                }
                else if(bodyTemplate[key]){
                    delete bodyTemplate[key]
                }
            }

            const response = await globalFetch(urlStr, {
                body: bodyTemplate,
                chatId: arg.chatId
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
                            aiModel ==='palm2_unicorn' ? 'text-unicorn' : 
                                        ''
            const LOCATION_ID="us-central1"

            const url = `https://${API_ENDPOINT}/v1/projects/${PROJECT_ID}/locations/${LOCATION_ID}/publishers/google/models/${MODEL_ID}:predict`;
            const res = await globalFetch(url, {
                body: bodyData,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + db.google.accessToken
                },
                abortSignal,
                chatId: arg.chatId
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
        case 'gemini-pro-vision':
        case 'gemini-1.5-pro-latest':
        case 'gemini-1.5-pro-exp-0801':
        case 'gemini-1.5-pro-exp-0827':
        case 'gemini-exp-1114':
        case 'gemini-1.5-flash':
        case 'gemini-1.5-pro-002':
        case 'gemini-ultra':
        case 'gemini-ultra-vision':{
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
                generation_config: applyParameters({
                    "maxOutputTokens": maxTokens,
                }, ['temperature', 'top_p'], {
                    'top_p': "topP"
                }),
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
                chatId: arg.chatId
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
            const prompt = applyChatTemplate(formated)
            const url = new URL(db.koboldURL)
            if(url.pathname.length < 3){
                url.pathname = 'api/v1/generate'
            }

            const body = applyParameters({
                "prompt": prompt,
                max_length: maxTokens,
                max_context_length: db.maxContext,
                n: 1
            }, [
                'temperature',
                'top_p',
                'repetition_penalty',
                'top_k',
                'top_a'
            ], {
                'repetition_penalty': 'rep_pen'
            }) as KoboldGenerationInputSchema
            
            const da = await globalFetch(url.toString(), {
                method: "POST",
                body: body,
                headers: {
                    "content-type": "application/json",
                },
                abortSignal,
                chatId: arg.chatId
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
                body: send_body,
                chatId: arg.chatId
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
        case 'risullm-proto':{
            const res = await globalFetch('https://sv.risuai.xyz/risullm', {
                body: {
                    messages: formated.map((v) => {
                        if(v.role === 'system'){
                            return {
                                role: "user",
                                content: "System: " + v.content
                            }
                        }
                        if(v.role === 'function'){
                            return {
                                role: "user",
                                content: "Function: " + v.content
                            
                            }
                        }
                        return {
                            role: v.role,
                            content: v.content
                        }
                    })
                },
                headers: {
                    "X-Api-Key": db.proxyKey
                }
            })

            const resp:string = res?.data?.response
            
            if(!resp){
                return {
                    type: 'fail',
                    result: JSON.stringify(res.data)
                }
            }

            return {
                type: 'success',
                result: resp.replace(/\\n/g, '\n')
            }
        }
        case 'ollama-hosted':{
            const ollama = new Ollama({host: db.ollamaURL})

            const response = await ollama.chat({
                model: db.ollamaModel,
                messages: formated.map((v) => {
                    return {
                        role: v.role,
                        content: v.content
                    }
                }).filter((v) => {
                    return v.role === 'assistant' || v.role === 'user' || v.role === 'system'
                }),
                stream: true
            })

            const readableStream = new ReadableStream<StreamResponseChunk>({
                async start(controller){
                    for await(const chunk of response){
                        controller.enqueue({
                            "0": chunk.message.content
                        })
                    }
                    controller.close()
                }
            })

            return {
                type: 'streaming',
                result: readableStream
            }
        }
        case 'cohere-command-r':
        case 'cohere-command-r-plus':
        case 'cohere-command-r-08-2024':
        case 'cohere-command-r-03-2024':
        case 'cohere-command-r-plus-04-2024':
        case 'cohere-command-r-plus-08-2024':{
            const modelName = aiModel.replace('cohere-', '')
            let lastChatPrompt = ''
            let preamble = ''

            let lastChat = formated[formated.length-1]
            if(lastChat.role === 'user'){
                lastChatPrompt = lastChat.content
                formated.pop()
            }
            else{
                while(lastChat.role !== 'user'){
                    lastChat = formated.pop()
                    if(!lastChat){
                        return {
                            type: 'fail',
                            result: 'Cohere requires a user message to generate a response'
                        }
                    }
                    lastChatPrompt = (lastChat.role === 'user' ? '' : `${lastChat.role}: `) + '\n' + lastChat.content + lastChatPrompt
                }
            }

            const firstChat = formated[0]
            if(firstChat.role === 'system'){
                preamble = firstChat.content
                formated.shift()
            }

            //reformat chat

            let body = applyParameters({
                message: lastChatPrompt,
                chat_history: formated.map((v) => {
                    if(v.role === 'assistant'){
                        return {
                            role: 'CHATBOT',
                            message: v.content
                        }
                    }
                    if(v.role === 'system'){
                        return {
                            role: 'SYSTEM',
                            message: v.content
                        }
                    }
                    if(v.role === 'user'){
                        return {
                            role: 'USER',
                            message: v.content
                        }
                    }
                    return null
                }).filter((v) => v !== null).filter((v) => {
                    return v.message
                }),
            }, [
                'temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'
            ], {
                'top_k': 'k',
                'top_p': 'p',
            })

            if(aiModel !== 'cohere-command-r-03-2024' && aiModel !== 'cohere-command-r-plus-04-2024'){
                body.safety_mode = "NONE"
            }
            
            if(preamble){
                if(body.chat_history.length > 0){
                    // @ts-ignore
                    body.preamble = preamble
                }
                else{
                    body.message = `system: ${preamble}`
                }
            }

            console.log(body)

            const res = await globalFetch('https://api.cohere.com/v1/chat', {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + db.cohereAPIKey,
                    "Content-Type": "application/json"
                },
                body: body
            })

            if(!res.ok){
                return {
                    type: 'fail',
                    result: JSON.stringify(res.data)
                }
            }

            const result = res.data.text
            if(!result){
                return {
                    type: 'fail',
                    result: JSON.stringify(res.data)
                }
            }

            return {
                type: 'success',
                result: result
            }
        }

        default:{     
            if(raiModel.startsWith('claude-3')){
                let replacerURL = (aiModel === 'reverse_proxy') ? (db.forceReplaceUrl) : ('https://api.anthropic.com/v1/messages')
                let apiKey = (aiModel === 'reverse_proxy') ?  db.proxyKey : db.claudeAPIKey
                if(aiModel === 'reverse_proxy' && db.autofillRequestUrl){
                    if(replacerURL.endsWith('v1')){
                        replacerURL += '/messages'
                    }
                    else if(replacerURL.endsWith('v1/')){
                        replacerURL += 'messages'
                    }
                    else if(!(replacerURL.endsWith('messages') || replacerURL.endsWith('messages/'))){
                        if(replacerURL.endsWith('/')){
                            replacerURL += 'v1/messages'
                        }
                        else{
                            replacerURL += '/v1/messages'
                        }
                    }
                }

                interface Claude3TextBlock {
                    type: 'text',
                    text: string,
                    cache_control?: {"type": "ephemeral"}
                }

                interface Claude3ImageBlock {
                    type: 'image',
                    source: {
                        type: 'base64'
                        media_type: string,
                        data: string
                    }
                    cache_control?: {"type": "ephemeral"}
                }

                type Claude3ContentBlock = Claude3TextBlock|Claude3ImageBlock

                interface Claude3Chat {
                    role: 'user'|'assistant'
                    content: Claude3ContentBlock[]
                }

                interface Claude3ExtendedChat {
                    role: 'user'|'assistant'
                    content: Claude3ContentBlock[]|string
                }

                let claudeChat: Claude3Chat[] = []
                let systemPrompt:string = ''

                const addClaudeChat = (chat:{
                    role: 'user'|'assistant'
                    content: string
                }, multimodals?:MultiModal[]) => {
                    if(claudeChat.length > 0 && claudeChat[claudeChat.length-1].role === chat.role){
                        let content = claudeChat[claudeChat.length-1].content
                        if(multimodals && multimodals.length > 0 && !Array.isArray(content)){
                            content = [{
                                type: 'text',
                                text: content
                            }]
                        }

                        if(Array.isArray(content)){
                            let lastContent = content[content.length-1]
                            if( lastContent?.type === 'text'){
                                lastContent.text += "\n\n" + chat.content
                                content[content.length-1] = lastContent
                            }
                            else{
                                content.push({
                                    type: 'text',
                                    text: chat.content
                                })
                            }

                            if(multimodals && multimodals.length > 0){
                                for(const modal of multimodals){
                                    if(modal.type === 'image'){
                                        const dataurl = modal.base64
                                        const base64 = dataurl.split(',')[1]
                                        const mediaType = dataurl.split(';')[0].split(':')[1]
    
                                        content.unshift({
                                            type: 'image',
                                            source: {
                                                type: 'base64',
                                                media_type: mediaType,
                                                data: base64
                                            }
                                        })
                                    }
                                }
                            }
                        }
                        claudeChat[claudeChat.length-1].content = content
                    }
                    else{
                        let formatedChat:Claude3Chat = {
                            role: chat.role,
                            content: [{
                                type: 'text',
                                text: chat.content
                            }]
                        }
                        if(multimodals && multimodals.length > 0){
                            formatedChat.content = [{
                                type: 'text',
                                text: chat.content
                            }]
                            for(const modal of multimodals){
                                if(modal.type === 'image'){
                                    const dataurl = modal.base64
                                    const base64 = dataurl.split(',')[1]
                                    const mediaType = dataurl.split(';')[0].split(':')[1]

                                    formatedChat.content.unshift({
                                        type: 'image',
                                        source: {
                                            type: 'base64',
                                            media_type: mediaType,
                                            data: base64
                                        }
                                    })
                                }
                            }

                        }
                        claudeChat.push(formatedChat)
                    }
                }
                for(const chat of formated){
                    switch(chat.role){
                        case 'user':{
                            addClaudeChat({
                                role: 'user',
                                content: chat.content
                            }, chat.multimodals)
                            break
                        }
                        case 'assistant':{
                            addClaudeChat({
                                role: 'assistant',
                                content: chat.content
                            }, chat.multimodals)
                            break
                        }
                        case 'system':{
                            if(claudeChat.length === 0){
                                systemPrompt += '\n\n' + chat.content
                            }
                            else{
                                addClaudeChat({
                                    role: 'user',
                                    content: "System: " + chat.content
                                })
                            }
                            break
                        }
                        case 'function':{
                            //ignore function for now
                            break
                        }
                    }
                }
                if(claudeChat.length === 0 && systemPrompt === ''){
                    return {
                        type: 'fail',
                        result: 'No input'
                    }
                }
                if(claudeChat.length === 0 && systemPrompt !== ''){
                    claudeChat.push({
                        role: 'user',
                        content: [{
                            type: 'text',
                            text: 'Start'
                        }]
                    })
                    systemPrompt = ''
                }
                if(claudeChat[0].role !== 'user'){
                    claudeChat.unshift({
                        role: 'user',
                        content: [{
                            type: 'text',
                            text: 'Start'
                        }]
                    })
                }
                if(db.claudeCachingExperimental){
                    for(let i = 0;i<4;i++){
                        const ind = claudeChat.findLastIndex((v) => {
                            if(v.role !== 'user'){
                                return false
                            }
                            if(v.content.length === 0){
                                return false
                            }
                            if(v.content[0].cache_control){ // if it already has cache control, skip
                                return false
                            }
                            return true
                        })
                        console.log(ind)
                        if(ind === -1){
                            break
                        }
                        claudeChat[ind].content[0].cache_control = {
                            type: 'ephemeral'
                        }
                    }
                }

                let finalChat:Claude3ExtendedChat[] = claudeChat

                if(aiModel === 'reverse_proxy'){
                    finalChat = claudeChat.map((v) => {
                        if(v.content.length > 0 && v.content[0].type === 'text'){
                            return {
                                role: v.role,
                                content: v.content[0].text
                            }
                        }
                    })
                }


                let body = applyParameters({
                    model: raiModel,
                    messages: finalChat,
                    system: systemPrompt.trim(),
                    max_tokens: maxTokens,
                    stream: useStreaming ?? false
                }, ['temperature', 'top_k', 'top_p'])

                if(systemPrompt === ''){
                    delete body.system
                }

                const bedrock = db.claudeAws

                if(bedrock && aiModel !== 'reverse_proxy'){
                    function getCredentialParts(key:string) {
                        const [accessKeyId, secretAccessKey, region] = key.split(":");
                      
                        if (!accessKeyId || !secretAccessKey || !region) {
                          throw new Error("The key assigned to this request is invalid.");
                        }
                      
                        return { accessKeyId, secretAccessKey, region };
                    }
                    const { accessKeyId, secretAccessKey, region } = getCredentialParts(apiKey);

                    const AMZ_HOST = "bedrock-runtime.%REGION%.amazonaws.com";
                    const host = AMZ_HOST.replace("%REGION%", region);
                    const stream = false;   // todo?
                    
                    // https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html
                    const modelIDs = [
                      "anthropic.claude-v2",
                      "anthropic.claude-v2:1",
                      "anthropic.claude-3-haiku-20240307-v1:0",
                      "anthropic.claude-3-sonnet-20240229-v1:0",
                      "anthropic.claude-3-opus-20240229-v1:0",
                      "anthropic.claude-3-5-sonnet-20240620-v1:0",
                      "anthropic.claude-3-5-sonnet-20241022-v2:0"
                    ];
                    
                    const awsModel = "us." + (
                        raiModel.includes("3-5-sonnet-20241022") ? modelIDs[6] :
                        raiModel.includes("3-5-sonnet-20240620") ? modelIDs[5] :
                        raiModel.includes("3-opus") ? modelIDs[4] :
                        raiModel.includes("3-sonnet") ? modelIDs[3] : 
                        modelIDs[2]);
                    const url = `https://${host}/model/${awsModel}/invoke${stream ? "-with-response-stream" : ""}`

                    const params = {
                        messages : claudeChat,
                        system: systemPrompt.trim(),
                        max_tokens: maxTokens,
                        // stop_sequences: null,
                        temperature: temperature,
                        top_p: db.top_p,
                        top_k: db.top_k,
                        anthropic_version: "bedrock-2023-05-31",
                    }

                    const rq = new HttpRequest({
                        method: "POST",
                        protocol: "https:",
                        hostname: host,
                        path: `/model/${awsModel}/invoke${stream ? "-with-response-stream" : ""}`,
                        headers: {
                          ["Host"]: host,
                          ["Content-Type"]: "application/json",
                          ["accept"]: "application/json",
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

                    const res = await globalFetch(url, {
                        method: "POST",
                        body: params,
                        headers: signed.headers,
                        plainFetchForce: true,
                        chatId: arg.chatId
                    })

                    if(!res.ok){
                        return {
                            type: 'fail',
                            result: JSON.stringify(res.data)
                        }
                    }
                    if(res.data.error){
                        return {
                            type: 'fail',
                            result: JSON.stringify(res.data.error)
                        }
                    }
                    return {
                        type: 'success',
                        result: res.data.content[0].text
                    
                    }
                }


                let headers:{
                    [key:string]:string
                } = {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                    "accept": "application/json",
                }

                if(db.claudeCachingExperimental){
                    headers['anthropic-beta'] = 'prompt-caching-2024-07-31'
                }

                if(db.usePlainFetch){
                    headers['anthropic-dangerous-direct-browser-access'] = 'true'
                }

                if(useStreaming){
                    
                    const res = await fetchNative(replacerURL, {
                        body: JSON.stringify(body),
                        headers: headers,
                        method: "POST",
                        chatId: arg.chatId
                    })

                    if(res.status !== 200){
                        return {
                            type: 'fail',
                            result: await textifyReadableStream(res.body)
                        }
                    }
                    let rerequesting = false
                    let breakError = ''


                    const stream = new ReadableStream<StreamResponseChunk>({
                        async start(controller){
                            let text = ''
                            let reader = res.body.getReader()
                            const decoder = new TextDecoder()
                            const parser = createParser(async (e) => {
                                try {               
                                    if(e.type === 'event'){
                                        switch(e.event){
                                            case 'content_block_delta': {
                                                if(e.data){
                                                    text += JSON.parse(e.data).delta?.text
                                                    controller.enqueue({
                                                        "0": text
                                                    })
                                                }
                                                break
                                            }
                                            case 'error': {
                                                if(e.data){
                                                    const errormsg:string = JSON.parse(e.data).error?.message
                                                    if(errormsg && errormsg.toLocaleLowerCase().includes('overload') && db.antiClaudeOverload){
                                                        console.log('Overload detected, retrying...')
                                                        reader.cancel()
                                                        rerequesting = true
                                                        await sleep(2000)
                                                        body.max_tokens -= await tokenize(text)
                                                        if(body.max_tokens < 0){
                                                            body.max_tokens = 0
                                                        }
                                                        if(body.messages.at(-1)?.role !== 'assistant'){
                                                            body.messages.push({
                                                                role: 'assistant',
                                                                content: [{
                                                                    type: 'text',
                                                                    text: ''
                                                                }]
                                                            })
                                                        }
                                                        let block = body.messages[body.messages.length-1].content
                                                        if(typeof block === 'string'){
                                                            body.messages[body.messages.length-1].content += text
                                                        }
                                                        else if(block[0].type === 'text'){
                                                            block[0].text += text
                                                        }
                                                        const res = await fetchNative(replacerURL, {
                                                            body: JSON.stringify(body),
                                                            headers: {
                                                                "Content-Type": "application/json",
                                                                "x-api-key": apiKey,
                                                                "anthropic-version": "2023-06-01",
                                                                "accept": "application/json",
                                                            },
                                                            method: "POST",
                                                            chatId: arg.chatId
                                                        })
                                                        if(res.status !== 200){
                                                            breakError = 'Error: ' + await textifyReadableStream(res.body)
                                                            break
                                                        }
                                                        reader = res.body.getReader()
                                                        rerequesting = false
                                                        break
                                                    }
                                                    text += "Error:" + JSON.parse(e.data).error?.message
                                                    if(db.extractJson && db.jsonSchemaEnabled){
                                                        controller.enqueue({
                                                            "0": extractJSON(text, db.jsonSchema)
                                                        })
                                                    }
                                                    else{
                                                        controller.enqueue({
                                                            "0": text
                                                        })
                                                    }
                                                }
                                                break
                                            }
                                        }
                                    }
                                } catch (error) {}
                            })
                            while(true){
                                if(rerequesting){
                                    if(breakError){
                                        controller.enqueue({
                                            "0": breakError
                                        })
                                        break
                                    }
                                    await sleep(1000)
                                    continue
                                }
                                try {
                                    const {done, value} = await reader.read() 
                                    if(done){
                                        if(rerequesting){
                                            continue
                                        }
                                        break
                                    }
                                    parser.feed(decoder.decode(value))                                   
                                } catch (error) {
                                    await sleep(1)
                                }
                            }
                            controller.close()
                        },
                        cancel(){
                        }
                    })

                    return {
                        type: 'streaming',
                        result: stream
                    }

                }
                const res = await globalFetch(replacerURL, {
                    body: body,
                    headers: headers,
                    method: "POST",
                    chatId: arg.chatId
                })

                if(!res.ok){
                    return {
                        type: 'fail',
                        result: JSON.stringify(res.data)
                    }
                }
                if(res.data.error){
                    return {
                        type: 'fail',
                        result: JSON.stringify(res.data.error)
                    }
                }
                const resText = res?.data?.content?.[0]?.text
                if(!resText){
                    return {
                        type: 'fail',
                        result: JSON.stringify(res.data)
                    }
                }
                if(db.extractJson && db.jsonSchemaEnabled){
                    return {
                        type: 'success',
                        result: extractJSON(resText, db.jsonSchema)
                    }
                }
                return {
                    type: 'success',
                    result: resText
                }
            }
            else if(raiModel.startsWith('claude')){

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


                let latestRole = 'user'
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
                    latestRole = v.role
                    if(raiModel.startsWith('claude-2') && (!raiModel.startsWith('claude-2.0'))){
                        if(v.role === 'system' && i === 0){
                            prefix = ''
                        }
                    }
                    return prefix + v.content
                }).join('')

                if(latestRole !== 'assistant'){
                    requestPrompt += '\n\nAssistant: '
                }


                const bedrock = db.claudeAws
                  
                if(bedrock && aiModel !== 'reverse_proxy'){
                    function getCredentialParts(key:string) {
                        const [accessKeyId, secretAccessKey, region] = key.split(":");
                      
                        if (!accessKeyId || !secretAccessKey || !region) {
                          throw new Error("The key assigned to this request is invalid.");
                        }
                      
                        return { accessKeyId, secretAccessKey, region };
                    }
                    const { accessKeyId, secretAccessKey, region } = getCredentialParts(apiKey);

                    const AMZ_HOST = "bedrock-runtime.%REGION%.amazonaws.com";
                    const host = AMZ_HOST.replace("%REGION%", region);

                    const stream = false

                    const LATEST_AWS_V2_MINOR_VERSION = 1;
                    let awsModel = `anthropic.claude-v2:${LATEST_AWS_V2_MINOR_VERSION}`;

                    const pattern = /^(claude-)?(instant-)?(v)?(\d+)(\.(\d+))?(-\d+k)?$/i;
                    const match = raiModel.match(pattern);
                  
                    if (match) {
                        const [, , instant, v, major, dot, minor] = match;
                    
                        if (instant) {
                            awsModel = "anthropic.claude-instant-v1";
                        }
                    
                        // There's only one v1 model
                        else if (major === "1") {
                            awsModel = "anthropic.claude-v1";
                        }
                    
                        // Try to map Anthropic API v2 models to AWS v2 models
                        else if (major === "2") {
                            if (minor === "0") {
                                awsModel = "anthropic.claude-v2";
                            } else if (!v && !dot && !minor) {
                                awsModel = "anthropic.claude-v2";
                            } 
                        }                    
                    }

                    const url = `https://${host}/model/${awsModel}/invoke${stream ? "-with-response-stream" : ""}`
                    const params = {
                        prompt : requestPrompt.startsWith("\n\nHuman: ") ? requestPrompt : "\n\nHuman: " + requestPrompt,
                        max_tokens_to_sample: maxTokens,
                        stop_sequences: ["\n\nHuman:", "\n\nSystem:", "\n\nAssistant:"],
                        temperature: temperature,
                        top_p: db.top_p,
                        //top_k: db.top_k,
                    }
                    const rq = new HttpRequest({
                        method: "POST",
                        protocol: "https:",
                        hostname: host,
                        path: `/model/${awsModel}/invoke${stream ? "-with-response-stream" : ""}`,
                        headers: {
                          ["Host"]: host,
                          ["Content-Type"]: "application/json",
                          ["accept"]: "application/json",
                          //"anthropic-version": "2023-06-01",
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

                    const da = await globalFetch(url, {
                        method: "POST",
                        body: params,
                        headers: signed.headers,
                        plainFetchForce: true,
                        chatId: arg.chatId
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
                    useRisuToken: aiModel === 'reverse_proxy',
                    chatId: arg.chatId
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
                const prompt = applyChatTemplate(formated)

                const realModel = aiModel.split(":::")[1]

                const argument = {
                    "prompt": prompt,
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
                const prompt = applyChatTemplate(formated)
                const v = await runTransformers(prompt, realModel, {
                    temperature: temperature,
                    max_new_tokens: maxTokens,
                    top_k: db.ooba.top_k,
                    top_p: db.ooba.top_p,
                    repetition_penalty: db.ooba.repetition_penalty,
                    typical_p: db.ooba.typical_p,
                })
                return {
                    type: 'success',
                    result: unstringlizeChat(v.generated_text as string, formated, currentChar?.name ?? '')
                }
            }
            if(aiModel.startsWith('local_')){
                console.log('running local model')
                const suggesting = model === "submodel"
                const prompt = applyChatTemplate(formated)
                const stopStrings = getStopStrings(suggesting)
                console.log(stopStrings)
                const modelPath = aiModel.replace('local_', '')
                const res = await runGGUFModel({
                    prompt: prompt,
                    modelPath: modelPath,
                    temperature: temperature,
                    top_p: db.top_p,
                    top_k: db.top_k,
                    maxTokens: maxTokens,
                    presencePenalty: arg.PresensePenalty || (db.PresensePenalty / 100),
                    frequencyPenalty: arg.frequencyPenalty || (db.frequencyPenalty / 100),
                    repeatPenalty: 0,
                    maxContext: db.maxContext,
                    stop: stopStrings,
                })
                let decoded = ''
                const transtream = new TransformStream<Uint8Array, StreamResponseChunk>({
                    async transform(chunk, control) {
                        const decodedChunk = new TextDecoder().decode(chunk)
                        decoded += decodedChunk
                        control.enqueue({
                            "0": decoded
                        })
                    }
                })
                res.pipeTo(transtream.writable)

                return {
                    type: 'streaming',
                    result: transtream.readable
                }
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



export interface KoboldSamplerSettingsSchema {
    rep_pen?: number;
    rep_pen_range?: number;
    rep_pen_slope?: number;
    top_k?: number;
    top_a?: number;
    top_p?: number;
    tfs?: number;
    typical?: number;
    temperature?: number;
}

export interface KoboldGenerationInputSchema extends KoboldSamplerSettingsSchema {
    prompt: string;
    use_memory?: boolean;
    use_story?: boolean;
    use_authors_note?: boolean;
    use_world_info?: boolean;
    use_userscripts?: boolean;
    soft_prompt?: string;
    max_length?: number;
    max_context_length?: number;
    n: number;
    disable_output_formatting?: boolean;
    frmttriminc?: boolean;
    frmtrmblln?: boolean;
    frmtrmspch?: boolean;
    singleline?: boolean;
    disable_input_formatting?: boolean;
    frmtadsnsp?: boolean;
    quiet?: boolean;
    sampler_order?: number[];
    sampler_seed?: number;
    sampler_full_determinism?: boolean;
}
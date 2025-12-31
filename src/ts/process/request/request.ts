import { Ollama } from 'ollama/dist/browser.mjs';
import { language } from "../../../lang";
import { globalFetch } from "../../globalApi.svelte";
import { getModelInfo, LLMFlags, LLMFormat, type LLMModel } from "../../model/modellist";
import { risuChatParser, risuEscape, risuUnescape } from "../../parser.svelte";
import { pluginProcess, pluginV2 } from "../../plugins/plugins";
import { getCurrentCharacter, getCurrentChat, getDatabase, type character } from "../../storage/database.svelte";
import { tokenizeNum } from "../../tokenizer";
import { sleep } from "../../util";
import type { MultiModal, OpenAIChat } from "../index.svelte";
import { getTools } from "../mcp/mcp";
import type { MCPTool, RPCToolCallContent } from "../mcp/mcplib";
import { NovelAIBadWordIds, stringlizeNAIChat } from "../models/nai";
import { OobaParams } from "../prompt";
import { getStopStrings, stringlizeAINChat, unstringlizeAIN, unstringlizeChat } from "../stringlize";
import { applyChatTemplate } from "../templates/chatTemplate";
import { runTransformers } from "../transformers";
import { runTrigger } from "../triggers";
import { requestClaude } from './anthropic';
import { requestGoogleCloudVertex } from './google';
import { requestOpenAI, requestOpenAILegacyInstruct, requestOpenAIResponseAPI } from "./openAI";

export type ToolCall = {
    name: string;
    arguments: string;
}
type ToolCallResponse = {
    caller: ToolCall;
    result: RPCToolCallContent[]
}

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
    schema?:string
    extractJson?:string
    imageResponse?:boolean
    previewBody?:boolean
    staticModel?: string
    escape?:boolean
    tools?: MCPTool[]
    rememberToolUsage?: boolean
}

export interface RequestDataArgumentExtended extends requestDataArgument{
    aiModel?:string
    multiGen?:boolean
    abortSignal?:AbortSignal
    modelInfo?:LLMModel
    customURL?:string
    mode?:ModelModeExtended
    key?:string
    additionalOutput?:string
}

export type requestDataResponse = {
    type: 'success'|'fail'
    result: string
    noRetry?: boolean,
    special?: {
        emotion?: string
    },
    failByServerError?: boolean
    model?: string
}|{
    type: "streaming",
    result: ReadableStream<StreamResponseChunk>,
    special?: {
        emotion?: string
    }
    model?: string
}|{
    type: "multiline",
    result: ['user'|'char',string][],
    special?: {
        emotion?: string
    }
    model?: string
}

export interface StreamResponseChunk{[key:string]:string}

export type Parameter = 'temperature'|'top_k'|'repetition_penalty'|'min_p'|'top_a'|'top_p'|'frequency_penalty'|'presence_penalty'|'reasoning_effort'|'thinking_tokens'|'verbosity'
export type ModelModeExtended = 'model'|'submodel'|'memory'|'emotion'|'otherAx'|'translate'
type ParameterMap = {
    [key in Parameter]?: string;
};

export function setObjectValue<T>(obj: T, key: string, value: any): T {

    const splitKey = key.split('.');
    if(splitKey.length > 1){
        const firstKey = splitKey.shift()
        if(!obj[firstKey]){
            obj[firstKey] = {};
        }
        obj[firstKey] = setObjectValue(obj[firstKey], splitKey.join('.'), value);
        return obj;
    }

    obj[key] = value;
    return obj;
}

export function applyParameters(data: { [key: string]: any }, parameters: Parameter[], rename: ParameterMap, ModelMode:ModelModeExtended, arg:{
    ignoreTopKIfZero?:boolean
} = {}): { [key: string]: any } {
    const db = getDatabase()

    function getEffort(effort:number){
        switch(effort){
            case -1:{
                return 'minimal'
            }
            case 0:{
                return 'low'
            }
            case 1:{
                return 'medium'
            }
            case 2:{
                return 'high'
            }
            default:{
                return 'medium'
            }
        }
    }

    function getVerbosity(verbosity:number){
        switch(verbosity){
            case 0:{
                return 'low'
            }
            case 1:{
                return 'medium'
            }
            case 2:{
                return 'high'
            }
            default:{
                return 'medium'
            }
        }
    }

    if(db.seperateParametersEnabled && ModelMode !== 'model'){
        if(ModelMode === 'submodel'){
            ModelMode = 'otherAx'
        }

        for(const parameter of parameters){
            
            let value:number|string = 0
            if(parameter === 'top_k' && arg.ignoreTopKIfZero && db.seperateParameters[ModelMode][parameter] === 0){
                continue
            }

            switch(parameter){
                case 'temperature':{
                    value = db.seperateParameters[ModelMode].temperature === -1000 ? -1000 : (db.seperateParameters[ModelMode].temperature / 100)
                    break
                }
                case 'top_k':{
                    value = db.seperateParameters[ModelMode].top_k
                    break
                }
                case 'repetition_penalty':{
                    value = db.seperateParameters[ModelMode].repetition_penalty
                    break
                }
                case 'min_p':{
                    value = db.seperateParameters[ModelMode].min_p
                    break
                }
                case 'top_a':{
                    value = db.seperateParameters[ModelMode].top_a
                    break
                }
                case 'top_p':{
                    value = db.seperateParameters[ModelMode].top_p
                    break
                }
                case 'thinking_tokens':{
                    value = db.seperateParameters[ModelMode].thinking_tokens
                    break
                }
                case 'frequency_penalty':{
                    value = db.seperateParameters[ModelMode].frequency_penalty === -1000 ? -1000 : (db.seperateParameters[ModelMode].frequency_penalty / 100)
                    break
                }
                case 'presence_penalty':{
                    value = db.seperateParameters[ModelMode].presence_penalty === -1000 ? -1000 : (db.seperateParameters[ModelMode].presence_penalty / 100)
                    break
                }
                case 'reasoning_effort':{
                    value = getEffort(db.seperateParameters[ModelMode].reasoning_effort)
                    break
                }
                case 'verbosity':{
                    value = getVerbosity(db.seperateParameters[ModelMode].verbosity)
                    break
                }
            }

            if(value === -1000 || value === undefined){
                continue
            }

            data = setObjectValue(data, rename[parameter] ?? parameter, value)
        }
        return data
    }


    for(const parameter of parameters){
        let value:number|string = 0
        if(parameter === 'top_k' && arg.ignoreTopKIfZero && db.top_k === 0){
            continue
        }
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
            case 'reasoning_effort':{
                value = getEffort(db.reasoningEffort)
                break
            }
            case 'verbosity':{
                value = getVerbosity(db.verbosity)
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
            case 'thinking_tokens':{
                value = db.thinkingTokens
                break
            }
        }

        if(value === -1000){
            continue
        }

        data = setObjectValue(data, rename[parameter] ?? parameter, value)
    }
    return data
}

export async function requestChatData(arg:requestDataArgument, model:ModelModeExtended, abortSignal:AbortSignal=null):Promise<requestDataResponse> {
    const db = getDatabase()
    const fallBackModels:string[] = safeStructuredClone(db?.fallbackModels?.[model] ?? [])
    const tools = await getTools()
    fallBackModels.push('')
    let da:requestDataResponse

    if(arg.escape){
        arg.useStreaming = false
        console.warn('Escape is enabled, disabling streaming')
    }

    const originalFormated = safeStructuredClone(arg.formated).map(m => {
        m.content = risuUnescape(m.content)
        return m
    })

    for(let fallbackIndex=0;fallbackIndex<fallBackModels.length;fallbackIndex++){
        let trys = 0
        arg.formated = safeStructuredClone(originalFormated)

        if(fallbackIndex !== 0 && !fallBackModels[fallbackIndex]){
            continue
        }

        while(true){
            
            if(abortSignal?.aborted){
                return {
                    type: 'fail',
                    result: 'Aborted'
                }
            }
    
            if(pluginV2.replacerbeforeRequest.size > 0){
                for(const replacer of pluginV2.replacerbeforeRequest){
                    arg.formated = await replacer(arg.formated, model)
                }
            }
            
            try{
                const currentChar = getCurrentCharacter()
                if(currentChar?.type !== 'group'){
                    const perf = performance.now()
                    const d = await runTrigger(currentChar, 'request', {
                        chat: getCurrentChat(),
                        displayMode: true,
                        displayData: JSON.stringify(arg.formated)
                    })
        
                    const got = JSON.parse(d.displayData)
                    if(!got || !Array.isArray(got)){
                        throw new Error('Invalid return')
                    }
                    arg.formated = got
                    console.log('Trigger time', performance.now() - perf)
                }
            }
            catch(e){
                console.error(e)
            }
            
    
            da = await requestChatDataMain({
                ...arg,
                staticModel: fallBackModels[fallbackIndex],
                tools: tools,
            }, model, abortSignal)

            if(abortSignal?.aborted){
                return {
                    type: 'fail',
                    result: 'Aborted'
                }
            }

            if(da.type === 'success' && arg.escape){
                da.result = risuEscape(da.result)
            }
    
            if(da.type === 'success' && pluginV2.replacerafterRequest.size > 0){
                for(const replacer of pluginV2.replacerafterRequest){
                    da.result = await replacer(da.result, model)
                }
            }
    
            if(da.type === 'success' && db.banCharacterset?.length > 0){
                let failed = false
                for(const set of db.banCharacterset){
                    console.log(set)
                    const checkRegex = new RegExp(`\\p{Script=${set}}`, 'gu')
    
                    if(checkRegex.test(da.result)){
                        trys += 1
                        failed = true
                        break
                    }
                }
    
                if(failed){
                    continue
                }
            }
    
            if(da.type === 'success' && fallbackIndex !== fallBackModels.length-1 && db.fallbackWhenBlankResponse){
                if(da.result.trim() === ''){
                    break
                }
            }
    
            if(da.type !== 'fail' || da.noRetry){
                return {
                    ...da,
                    model: fallBackModels[fallbackIndex]
                }
            }
    
            if(da.failByServerError){
                await sleep(1000)
                if(db.antiServerOverloads){
                    trys -= 0.5 // reduce trys by 0.5, so that it will retry twice as much
                }
            }
            
            trys += 1
            if(trys > db.requestRetrys){
                if(fallbackIndex === fallBackModels.length-1 || da.model === 'custom'){
                    return da
                }
                break
            }
        }   
    }


    return da ?? {
        type: 'fail',
        result: "All models failed"
    }
}

export interface OpenAITextContents {
    type: 'text'
    text: string
}

export interface OpenAIImageContents {
    type: 'image'|'image_url'
    image_url: {
        url: string
        detail: string
    }
}

export type OpenAIContents = OpenAITextContents|OpenAIImageContents

export interface OpenAIToolCall {
    id:string,
    type:'function',
    function:{
        name:string,
        arguments:string
    },
}

export interface OpenAIChatExtra {
    role: 'system'|'user'|'assistant'|'function'|'developer'|'tool'
    content: string|OpenAIContents[]
    memo?:string
    name?:string
    removable?:boolean
    attr?:string[]
    multimodals?:MultiModal[]
    thoughts?:string[]
    prefix?:boolean
    reasoning_content?:string
    cachePoint?:boolean
    function?: {
        name: string
        description?: string
        parameters: any
        strict: boolean
    }
    tool_call_id?: string
    tool_calls?: OpenAIToolCall[]
}

export function reformater(formated:OpenAIChat[],modelInfo:LLMModel|LLMFlags[]){

    const flags = Array.isArray(modelInfo) ? modelInfo : modelInfo.flags
    
    const db = getDatabase()
    let systemPrompt:OpenAIChat|null = null

    if(!flags.includes(LLMFlags.hasFullSystemPrompt)){
        if(flags.includes(LLMFlags.hasFirstSystemPrompt)){
            while(formated[0].role === 'system'){
                if(systemPrompt){
                    systemPrompt.content += '\n\n' + formated[0].content
                }
                else{
                    systemPrompt = formated[0]
                }
                formated = formated.slice(1)
            }
        }

        for(let i=0;i<formated.length;i++){
            if(formated[i].role === 'system'){
                formated[i].content = db.systemContentReplacement ? db.systemContentReplacement.replace('{{slot}}', formated[i].content) : `system: ${formated[i].content}`
                formated[i].role = db.systemRoleReplacement
            }
        }
    }
    
    if(flags.includes(LLMFlags.requiresAlternateRole)){
        let newFormated:OpenAIChat[] = []
        for(let i=0;i<formated.length;i++){
            const m = formated[i]
            if(newFormated.length === 0){
                newFormated.push(m)
                continue
            }

            if(newFormated[newFormated.length-1].role === m.role){
            
                newFormated[newFormated.length-1].content += '\n' + m.content

                if(m.multimodals){
                    if(!newFormated[newFormated.length-1].multimodals){
                        newFormated[newFormated.length-1].multimodals = []
                    }
                    newFormated[newFormated.length-1].multimodals.push(...m.multimodals)
                }

                if(m.thoughts){
                    if(!newFormated[newFormated.length-1].thoughts){
                        newFormated[newFormated.length-1].thoughts = []
                    }
                    newFormated[newFormated.length-1].thoughts.push(...m.thoughts)
                }

                if(m.cachePoint){
                    if(!newFormated[newFormated.length-1].cachePoint){
                        newFormated[newFormated.length-1].cachePoint = true
                    }
                }

                continue
            }
            else{
                newFormated.push(m)
            }
        }
        formated = newFormated
    }

    if(flags.includes(LLMFlags.mustStartWithUserInput)){
        if(formated.length === 0 || formated[0].role !== 'user'){
            formated.unshift({
                role: 'user',
                content: ' '
            })
        }
    }

    if(systemPrompt){
        formated.unshift(systemPrompt)
    }

    return formated
}


export async function requestChatDataMain(arg:requestDataArgument, model:ModelModeExtended, abortSignal:AbortSignal=null):Promise<requestDataResponse> {
    const db = getDatabase()
    const targ:RequestDataArgumentExtended = arg
    targ.formated = safeStructuredClone(arg.formated)
    targ.maxTokens = arg.maxTokens ??db.maxResponse
    targ.temperature = arg.temperature ?? (db.temperature / 100)
    targ.bias = arg.bias
    targ.currentChar = arg.currentChar
    targ.useStreaming = db.useStreaming && arg.useStreaming
    targ.continue = arg.continue ?? false
    targ.biasString = arg.biasString ?? []
    targ.aiModel = arg.staticModel ? arg.staticModel : (model === 'model' ? db.aiModel : db.subModel)
    targ.multiGen = ((db.genTime > 1 && targ.aiModel.startsWith('gpt') && (!arg.continue)) && (!arg.noMultiGen))
    targ.abortSignal = abortSignal
    targ.modelInfo = getModelInfo(targ.aiModel)
    targ.mode = model
    targ.extractJson = arg.extractJson ?? db.extractJson
    if(targ.aiModel === 'reverse_proxy'){
        targ.modelInfo.internalID = db.customProxyRequestModel
        targ.modelInfo.format = db.customAPIFormat
        targ.customURL = db.forceReplaceUrl
        targ.key = db.proxyKey
    }
    if(targ.aiModel.startsWith('xcustom:::')){
        const found = db.customModels.find(m => m.id === targ.aiModel)
        targ.customURL = found?.url
        targ.key = found?.key
    }

    if(db.seperateModelsForAxModels && !arg.staticModel){
        if(db.seperateModels[model]){
            targ.aiModel = db.seperateModels[model]
            targ.modelInfo = getModelInfo(targ.aiModel)
        }
    }

    const format = targ.modelInfo.format

    targ.formated = reformater(targ.formated, targ.modelInfo)

    switch(format){
        case LLMFormat.OpenAICompatible:
        case LLMFormat.Mistral:
            return requestOpenAI(targ)
        case LLMFormat.OpenAILegacyInstruct:
            return requestOpenAILegacyInstruct(targ)
        case LLMFormat.NovelAI:
            return requestNovelAI(targ)
        case LLMFormat.OobaLegacy:
            return requestOobaLegacy(targ)
        case LLMFormat.Plugin:
            return requestPlugin(targ)
        case LLMFormat.Ooba:
            return requestOoba(targ)
        case LLMFormat.VertexAIGemini:
        case LLMFormat.GoogleCloud:
            return requestGoogleCloudVertex(targ)
        case LLMFormat.Kobold:
            return requestKobold(targ)
        case LLMFormat.NovelList:
            return requestNovelList(targ)
        case LLMFormat.Ollama:
            return requestOllama(targ)
        case LLMFormat.Cohere:
            return requestCohere(targ)
        case LLMFormat.Anthropic:
        case LLMFormat.AnthropicLegacy:
        case LLMFormat.AWSBedrockClaude:
            return requestClaude(targ)
        case LLMFormat.Horde:
            return requestHorde(targ)
        case LLMFormat.WebLLM:
            return requestWebLLM(targ)
        case LLMFormat.OpenAIResponseAPI:
            return requestOpenAIResponseAPI(targ)
    }

    return {
        type: 'fail',
        result: (language.errors.unknownModel)
    }
}




async function requestNovelAI(arg:RequestDataArgumentExtended):Promise<requestDataResponse>{
    const formated = arg.formated
    const db = getDatabase()
    const aiModel = arg.aiModel
    const temperature = arg.temperature
    const maxTokens = arg.maxTokens
    const biasString = arg.biasString
    const currentChar = getCurrentCharacter()
    const prompt = stringlizeNAIChat(formated, currentChar?.name ?? '', arg.continue)
    const abortSignal = arg.abortSignal
    let logit_bias_exp:{
        sequence: number[], bias: number, ensure_sequence_finish: false, generate_once: true
    }[] = []

    if(arg.previewBody){
        return {
            type: 'success',
            result: JSON.stringify({
                error: "This model is not supported in preview mode"
            })
        }
    }

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
            "Authorization": "Bearer " + (arg.key ?? db.novelai.token)
        },
        abortSignal,
        chatId: arg.chatId,
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

async function requestOobaLegacy(arg:RequestDataArgumentExtended):Promise<requestDataResponse> {
    const formated = arg.formated
    const db = getDatabase()
    const aiModel = arg.aiModel
    const maxTokens = arg.maxTokens
    const currentChar = getCurrentCharacter()
    const useStreaming = arg.useStreaming
    const abortSignal = arg.abortSignal
    let streamUrl = db.textgenWebUIStreamURL.replace(/\/api.*/, "/api/v1/stream")
    let blockingUrl = db.textgenWebUIBlockingURL.replace(/\/api.*/, "/api/v1/generate")
    let bodyTemplate:{[key:string]:any} = {}
    const prompt = applyChatTemplate(formated)
    let stopStrings = getStopStrings(false)
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

    if(arg.previewBody){
        return {
            type: 'success',
            result: JSON.stringify({
                url: blockingUrl,
                body: bodyTemplate,
                headers: headers
            })      
        }
    }

    if(useStreaming){
        const oobaboogaSocket = new WebSocket(streamUrl);
        const statusCode = await new Promise((resolve) => {
            oobaboogaSocket.onopen = () => resolve(0)
            oobaboogaSocket.onerror = () => resolve(1001)
            oobaboogaSocket.onclose = ({ code }) => resolve(code)
        })
        if(abortSignal?.aborted || statusCode !== 0) {
            oobaboogaSocket.close()
            return ({
                type: "fail",
                result: abortSignal?.reason || `WebSocket connection failed to '${streamUrl}' failed!`,
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
        abortSignal?.addEventListener("abort", close)

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

async function requestOoba(arg:RequestDataArgumentExtended):Promise<requestDataResponse> {
    const formated = arg.formated
    const db = getDatabase()
    const aiModel = arg.aiModel
    const maxTokens = arg.maxTokens
    const temperature = arg.temperature
    const prompt = applyChatTemplate(formated)
    let stopStrings = getStopStrings(false)
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

    if(arg.previewBody){
        return {
            type: 'success',
            result: JSON.stringify({
                url: urlStr,
                body: bodyTemplate,
                headers: {}
            })      
        }
    }

    const response = await globalFetch(urlStr, {
        body: bodyTemplate,
        chatId: arg.chatId,
        abortSignal: arg.abortSignal
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

async function requestPlugin(arg:RequestDataArgumentExtended):Promise<requestDataResponse> {
    const db = getDatabase()
    try {
        const formated = arg.formated
        const maxTokens = arg.maxTokens
        const bias = arg.biasString
        const v2Function = pluginV2.providers.get(db.currentPluginProvider)

        if(arg.previewBody){
            return {
                type: 'success',
                result: JSON.stringify({
                    error: "Plugin is not supported in preview mode"
                })
            }
        }
    
        const d = v2Function ? (await v2Function(applyParameters({
            prompt_chat: formated,
            mode: arg.mode,
            bias: [],
            max_tokens: maxTokens,
        }, [
            'frequency_penalty','min_p','presence_penalty','repetition_penalty','top_k','top_p','temperature'
        ], {}, arg.mode) as any, arg.abortSignal)) : await pluginProcess({
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
                result: (language.errors.unknownModel),
                model: 'custom'
            }
        }
        else if(!d.success){
            return {
                type: 'fail',
                result: d.content instanceof ReadableStream ? await (new Response(d.content)).text() : d.content,
                model: 'custom'
            }
        }
        else if(d.content instanceof ReadableStream){
    
            let fullText = ''
            const piper = new TransformStream<string, StreamResponseChunk>(  {
                transform(chunk, control) {
                    fullText += chunk
                    control.enqueue({
                        "0": fullText
                    })
                }
            })
    
            return {
                type: 'streaming',
                result: d.content.pipeThrough(piper),
                model: 'custom'
            }
        }
        else{
            return {
                type: 'success',
                result: d.content,
                model: 'custom'
            }
        }   
    } catch (error) {
        console.error(error)
        return {
            type: 'fail',
            result: `Plugin Error from ${db.currentPluginProvider}: ` + JSON.stringify(error),
            model: 'custom'
        }
    }
}

async function requestKobold(arg:RequestDataArgumentExtended):Promise<requestDataResponse> {
    const formated = arg.formated
    const db = getDatabase()
    const maxTokens = arg.maxTokens
    const abortSignal = arg.abortSignal

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
    }, arg.mode) as KoboldGenerationInputSchema

    if(arg.previewBody){
        return {
            type: 'success',
            result: JSON.stringify({
                url: url.toString(),
                body: body,
                headers: {}
            })      
        }
    }
    
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

async function requestNovelList(arg:RequestDataArgumentExtended):Promise<requestDataResponse> {

    const formated = arg.formated
    const db = getDatabase()
    const maxTokens = arg.maxTokens
    const temperature = arg.temperature
    const biasString = arg.biasString
    const currentChar = getCurrentCharacter()
    const aiModel = arg.aiModel
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


    if(arg.previewBody){
        return {
            type: 'success',
            result: JSON.stringify({
                url: api_server_url + '/api',
                body: send_body,
                headers: headers
            })      
        }
    }
    const response = await globalFetch(arg.customURL ?? api_server_url + '/api', {
        method: 'POST',
        headers: headers,
        body: send_body,
        chatId: arg.chatId,
        abortSignal: arg.abortSignal
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

async function requestOllama(arg:RequestDataArgumentExtended):Promise<requestDataResponse> {
    const formated = arg.formated
    const db = getDatabase()

    if(arg.previewBody){
        return {
            type: 'success',
            result: JSON.stringify({
                error: "Preview body is not supported for Ollama"
            })
        }
    }

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

async function requestCohere(arg:RequestDataArgumentExtended):Promise<requestDataResponse> {
    const formated = arg.formated
    const db = getDatabase()
    const aiModel = arg.aiModel

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
    }, arg.mode)

    if(aiModel !== 'cohere-command-r-03-2024' && aiModel !== 'cohere-command-r-plus-04-2024'){
        body.safety_mode = "NONE"
    }
    
    if(preamble){
        if(body.chat_history.length > 0){
            body.preamble = preamble
        }
        else{
            body.message = `system: ${preamble}`
        }
    }

    console.log(body)

    if(arg.previewBody){
        return {
            type: 'success',
            result: JSON.stringify({
                url: arg.customURL ?? 'https://api.cohere.com/v1/chat',
                body: body,
                headers: {
                    "Authorization": "Bearer " + (arg.key ?? db.cohereAPIKey),
                    "Content-Type": "application/json"
                }
            })
        }
    }

    const res = await globalFetch(arg.customURL ?? 'https://api.cohere.com/v1/chat', {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + (arg.key ?? db.cohereAPIKey),
            "Content-Type": "application/json"
        },
        body: body,
        abortSignal: arg.abortSignal
    })

    if(!res.ok){
        return {
            type: 'fail',
            result: JSON.stringify(res.data)
        }
    }

    const result = res?.data?.text
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


async function requestHorde(arg:RequestDataArgumentExtended):Promise<requestDataResponse> {
    const formated = arg.formated
    const db = getDatabase()
    const aiModel = arg.aiModel
    const currentChar = getCurrentCharacter()
    const abortSignal = arg.abortSignal

    if(arg.previewBody){
        return {
            type: 'success',
            result: JSON.stringify({
                error: "Preview body is not supported for Horde"
            })
        }
    }

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

async function requestWebLLM(arg:RequestDataArgumentExtended):Promise<requestDataResponse> {
    const formated = arg.formated
    const db = getDatabase()
    const aiModel = arg.aiModel
    const currentChar = getCurrentCharacter()
    const maxTokens = arg.maxTokens
    const temperature = arg.temperature
    const realModel = aiModel.split(":::")[1]
    const prompt = applyChatTemplate(formated)

    if(arg.previewBody){
        return {
            type: 'success',
            result: JSON.stringify({
                error: "Preview body is not supported for WebLLM"
            })
        }
    }
    const v = await runTransformers(prompt, realModel, {
        temperature: temperature,
        max_new_tokens: maxTokens,
        top_k: db.ooba.top_k,
        top_p: db.ooba.top_p,
        repetition_penalty: db.ooba.repetition_penalty,
        typical_p: db.ooba.typical_p,
    } as any)
    return {
        type: 'success',
        result: unstringlizeChat(v.generated_text as string, formated, currentChar?.name ?? '')
    }
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

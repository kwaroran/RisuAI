import { language } from "src/lang"
import { applyParameters, setObjectValue, type OpenAIChatExtra, type OpenAIContents, type OpenAIToolCall, type RequestDataArgumentExtended, type requestDataResponse, type StreamResponseChunk } from "./request"
import { getDatabase } from "src/ts/storage/database.svelte"
import { LLMFlags, LLMFormat } from "src/ts/model/modellist"
import { strongBan, tokenizeNum } from "src/ts/tokenizer"
import { getFreeOpenRouterModel } from "src/ts/model/openrouter"
import { addFetchLog, fetchNative, globalFetch, textifyReadableStream } from "src/ts/globalApi.svelte"
import { isTauri, isNodeServer, isCapacitor } from "src/ts/platform"
import type { OpenAIChatFull } from "../index.svelte"
import { extractJSON, getOpenAIJSONSchema } from "../templates/jsonSchema"
import { applyChatTemplate } from "../templates/chatTemplate"
import { supportsInlayImage } from "../files/inlays"
import { simplifySchema } from "src/ts/util"
import { callTool, decodeToolCall, encodeToolCall } from "../mcp/mcp"
import { alertError } from "src/ts/alert";


interface OAIResponseInputItem {
    content:({
        type: 'input_text',
        text: string
    }|{
        detail: 'high'|'low'|'auto'
        type: 'input_image',
        image_url: string
    }|{
        type: 'input_file',
        file_data: string
        filename?: string
    })[]
    role:'user'|'system'|'developer'
}

interface OAIResponseOutputItem {
    content:({
        type: 'output_text',
        text: string,
        annotations: []
    })[]
    type: 'message',
    status: 'in_progress'|'complete'|'incomplete'
    role:'assistant'
}

interface OAIResponseOutputToolCall {
    arguments: string
    call_id: string
    name: string
    type: 'function_call'
    id: string
    status: 'in_progress'|'complete'|'error'
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


export async function requestOpenAI(arg:RequestDataArgumentExtended):Promise<requestDataResponse>{
    let formatedChat:OpenAIChatExtra[] = []
    const formated = arg.formated
    const db = getDatabase()
    const aiModel = arg.aiModel

    const processToolCalls = async (text:string, originalMessage:any) => {
        // Split text by tool_call tags and process each segment
        const segments = text.split(/(<tool_call>.*?<\/tool_call>)/gms)
        const processedMessages = []
        
        let currentContent = ''
        
        for(let i = 0; i < segments.length; i++) {
            const segment = segments[i]
            
            if(segment.match(/<tool_call>(.*?)<\/tool_call>/gms)) {
                // This is a tool call segment
                const toolCallMatch = segment.match(/<tool_call>(.*?)<\/tool_call>/s)
                if(toolCallMatch) {
                    const call = await decodeToolCall(toolCallMatch[1])
                    if(call) {
                        // Create assistant message with accumulated content and this tool call
                        processedMessages.push({
                            ...originalMessage,
                            role: 'assistant',
                            content: currentContent,
                            tool_calls: [{
                                id: call.call.id,
                                type: 'function',
                                function: {
                                    name: call.call.name,
                                    arguments: call.call.arg
                                }
                            }]
                        })

                        // Add tool response
                        processedMessages.push({
                            role: 'tool',
                            content: call.response.filter(m => m.type === 'text').map(m => m.text).join('\n'),
                            tool_call_id: call.call.id,
                            cachePoint: true
                        })

                        // Reset content for next segment
                        currentContent = ''
                    }
                }
            } else {
                // This is regular text content - accumulate it
                currentContent += segment
            }
        }
        
        // If there's remaining content without tool calls, add it as a regular message
        if(currentContent.trim()) {
            processedMessages.push({
                ...originalMessage,
                role: 'assistant',
                content: currentContent
            })
        }
        
        return processedMessages
    }
      for(let i=0;i<formated.length;i++){
        const m = formated[i]
        
        // Check if message contains tool calls
        if(m.content && m.content.includes('<tool_call>')) {
            const processedMessages = await processToolCalls(m.content, m)
            formatedChat.push(...processedMessages)
        }
        else if(m.multimodals && m.multimodals.length > 0 && m.role === 'user'){
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
            if(arg.modelInfo.flags.includes(LLMFlags.deepSeekPrefix) && i === formatedChat.length-1 && formatedChat[i].role === 'assistant'){
                formatedChat[i].prefix = true
            }
            if(arg.modelInfo.flags.includes(LLMFlags.deepSeekThinkingInput) && i === formatedChat.length-1 && formatedChat[i].thoughts && formatedChat[i].thoughts.length > 0 && formatedChat[i].role === 'assistant'){
                formatedChat[i].reasoning_content = formatedChat[i].thoughts.join('\n')
            }
            delete formatedChat[i].memo
            delete formatedChat[i].removable
            delete formatedChat[i].attr
            delete formatedChat[i].multimodals
            delete formatedChat[i].thoughts
            delete formatedChat[i].cachePoint
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
            return m.content !== '' || (m.multimodals && m.multimodals.length > 0) || m.tool_calls
        })
    }

    for(let i=0;i<arg.biasString.length;i++){
        const bia = arg.biasString[i]
        if(bia[0].startsWith('[[') && bia[0].endsWith(']]')){
            const num = parseInt(bia[0].replace('[[', '').replace(']]', ''))
            arg.bias[num] = bia[1]
            continue
        }

        if(bia[1] === -101){
            arg.bias = await strongBan(bia[0], arg.bias)
            continue
        }
        const tokens = await tokenizeNum(bia[0])

        for(const token of tokens){
            arg.bias[token] = bia[1]

        }
    }


    let requestModel = (aiModel === 'reverse_proxy' || aiModel === 'openrouter') ? db.proxyRequestModel : aiModel
    let openrouterRequestModel = db.openrouterRequestModel
    if(aiModel === 'reverse_proxy'){
        requestModel = db.customProxyRequestModel
    }

    if(aiModel === 'openrouter' && db.openrouterRequestModel === 'risu/free'){
        openrouterRequestModel = await getFreeOpenRouterModel()
    }

    if(arg.modelInfo.flags.includes(LLMFlags.DeveloperRole)){
        formatedChat = formatedChat.map((v) => {
            if(v.role === 'system'){
                v.role = 'developer'
            }
            return v
        })
    }

    console.log(formatedChat)
    if(arg.modelInfo.format === LLMFormat.Mistral){
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
                if(prevChat?.role === chat.role){
                    reformatedChat[reformatedChat.length-1].content += '\n' + chat.content
                    continue
                }
                else if(chat.role === 'system'){
                    if(prevChat?.role === 'user'){
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

        const targs = {
            body: applyParameters({
                model: requestModel,
                messages: reformatedChat,
                safe_prompt: false,
                max_tokens: arg.maxTokens,
            }, ['temperature', 'presence_penalty', 'frequency_penalty', 'top_p'], {}, arg.mode ),
            headers: {
                "Authorization": "Bearer " + (arg.key ?? db.mistralKey),
            },
            abortSignal: arg.abortSignal,
            chatId: arg.chatId
        } as const

        if(arg.previewBody){
            return {
                type: 'success',
                result: JSON.stringify({
                    url: "https://api.mistral.ai/v1/chat/completions",
                    body: targs.body,
                    headers: targs.headers
                })
            }
        }
    
        const res = await globalFetch(arg.customURL ?? "https://api.mistral.ai/v1/chat/completions", targs)

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
            : arg.modelInfo.internalID ? arg.modelInfo.internalID
            : (!requestModel) ? 'gpt-3.5-turbo'
            : requestModel,
        messages: formatedChat,
        max_tokens: arg.maxTokens,
        logit_bias: arg.bias,
        stream: false,

    })


    if(Object.keys(body.logit_bias).length === 0){
        delete body.logit_bias
    }

    if(arg.modelInfo.flags.includes(LLMFlags.OAICompletionTokens)){
        body.max_completion_tokens = body.max_tokens
        delete body.max_tokens
    }

    if(db.generationSeed > 0){
        body.seed = db.generationSeed
    }

    if(db.jsonSchemaEnabled || arg.schema){
        body.response_format = {
            "type": "json_schema",
            "json_schema": getOpenAIJSONSchema(arg.schema)
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
            const provider: typeof db.openrouterProvider = {} as typeof db.openrouterProvider;
            if (db.openrouterProvider.order?.length) {
                provider.order = db.openrouterProvider.order;
            }
            if (db.openrouterProvider.only?.length) {
                provider.only = db.openrouterProvider.only;
            }
            if (db.openrouterProvider.ignore?.length) {
                provider.ignore = db.openrouterProvider.ignore;
            }
            if (Object.keys(provider).length) {
                body.provider = provider;
            }
        }

        if(db.useInstructPrompt){
            delete body.messages
            const prompt = applyChatTemplate(formated)
            body.prompt = prompt
        }
    }

    body = applyParameters(
        body,
        arg.modelInfo.parameters,
        {},
        arg.mode
    )

    if(arg.tools && arg.tools.length > 0){
        body.tools = arg.tools.map(tool => {
            return {
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: simplifySchema(tool.inputSchema),
                }
            }
        })
    }

    if(aiModel === 'reverse_proxy' && db.reverseProxyOobaMode){
        const OobaBodyTemplate = db.reverseProxyOobaArgs

        const keys = Object.keys(OobaBodyTemplate)
        for(const key of keys){
            if(OobaBodyTemplate[key] !== undefined && OobaBodyTemplate[key] !== null){
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
            delete body.logit_bias
        }
    }

    let replacerURL = aiModel === 'openrouter' ? "https://openrouter.ai/api/v1/chat/completions" :
        (arg.customURL) ?? ('https://api.openai.com/v1/chat/completions')

    if(arg.modelInfo?.endpoint){
        replacerURL = arg.modelInfo.endpoint
    }

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
        "Authorization": "Bearer " + (arg.key ?? (aiModel === 'reverse_proxy' ?  db.proxyKey : (aiModel === 'openrouter' ? db.openrouterKey : db.openAIKey))),
        "Content-Type": "application/json"
    }

    if(arg.modelInfo?.keyIdentifier){
        headers["Authorization"] = "Bearer " + db.OaiCompAPIKeys[arg.modelInfo.keyIdentifier]
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
    if(arg.multiGen){
        // Check if tools are enabled - multiGen with tools is not supported
        if(arg.tools && arg.tools.length > 0){
            return {
                type: 'fail',
                result: 'MultiGen mode cannot be used with tool calls. Please disable one of them.'
            }
        }
        body.n = db.genTime
    }
    let throughProxi = (!isTauri) && (!isNodeServer) && (!db.usePlainFetch) && (!isCapacitor)
    if(arg.useStreaming){
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

        if(arg.previewBody){
            return {
                type: 'success',
                result: JSON.stringify({
                    url: replacerURL,
                    body: body,
                    headers: headers
                })
            }
        }
        const da = await fetchNative(replacerURL, {
            body: JSON.stringify(body),
            method: "POST",
            headers: headers,
            signal: arg.abortSignal,
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

        const transtream = getTranStream(arg)

        da.body.pipeTo(transtream.writable)

        return {
            type: 'streaming',
            result: wrapToolStream(transtream.readable, body, headers, replacerURL, arg)
        }
    }

    if(aiModel === 'reverse_proxy' || aiModel.startsWith('xcustom:::')){
        let additionalParams = aiModel === 'reverse_proxy' ? db.additionalParams : []

        if(aiModel.startsWith('xcustom:::')){
            const found = db.customModels.find(m => m.id === aiModel)
            const params = found?.params
            if(params){
                const lines = params.split('\n')
                for(const line of lines){
                    const split = line.split('=')
                    if(split.length >= 2){
                        additionalParams.push([split[0], split.slice(1).join('=')])
                    }
                }
            }
        }

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
                body = setObjectValue(body, key, value)
            }
            else{
                body = setObjectValue(body, key, parseFloat(value))
            }
        }
    }

    if(arg.previewBody){
        return {
            type: 'success',
            result: JSON.stringify({
                url: replacerURL,
                body: body,
                headers: headers
            })
        }
    }

    return requestHTTPOpenAI(replacerURL, body, headers, arg)

}

export async function requestHTTPOpenAI(replacerURL:string,body:any, headers:Record<string,string>, arg:RequestDataArgumentExtended):Promise<requestDataResponse>{
    
    const db = getDatabase()
    const res = await globalFetch(replacerURL, {
        body: body,
        headers: headers,
        abortSignal: arg.abortSignal,
        chatId: arg.chatId
    })

    function processTextResponse(dat: any):string{
        if(dat?.choices[0]?.text){
            let text = dat.choices[0].text as string
            if(arg.extractJson && (db.jsonSchemaEnabled || arg.schema)){
                try {
                    const parsed = JSON.parse(text)
                    const extracted = extractJSON(parsed, arg.extractJson)
                    return extracted
                } catch (error) {
                    console.log(error)
                    return text
                }
            }
            return text
        }
        if(arg.extractJson && (db.jsonSchemaEnabled || arg.schema)){
            return extractJSON(dat.choices[0].message.content, arg.extractJson)
        }
        const msg:OpenAIChatFull = (dat.choices[0].message)
        let result = msg.content
        if(arg.modelInfo.flags.includes(LLMFlags.deepSeekThinkingOutput)){
            console.log("Checking for reasoning content")
            let reasoningContent = ""
            result = result.replace(/(.*)\<\/think\>/gms, (m, p1) => {
                reasoningContent = p1
                return ""
            })
            console.log(`Reasoning Content: ${reasoningContent}`)
            if(reasoningContent){
                reasoningContent = reasoningContent.replace(/\<think\>/gms, '')
                result = `<Thoughts>\n${reasoningContent}\n</Thoughts>\n${result}`
            }
        }
        // For deepseek Official Reasoning Model: https://api-docs.deepseek.com/guides/thinking_mode#api-example
        const reasoningContentField = dat?.choices[0]?.reasoning_content ?? dat?.choices[0]?.message?.reasoning_content
        if(reasoningContentField){
            result = `<Thoughts>\n${reasoningContentField}\n</Thoughts>\n${result}`
        }
        // For openrouter, https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request#response.body.choices.message.reasoning
        if(dat?.choices?.[0]?.message?.reasoning){
            result = `<Thoughts>\n${dat.choices[0].message.reasoning}\n</Thoughts>\n${result}`
        }

        return result
    }

    const dat = res.data as any
    if(res.ok){
        try {
            // Collect all tool_calls from all choices
            let allToolCalls: OpenAIToolCall[] = []
            if(dat.choices) {
                for(const choice of dat.choices) {
                    if(choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
                        allToolCalls = allToolCalls.concat(choice.message.tool_calls)
                    }
                }
            }
            
            // Replace choices[0].message.tool_calls with all collected tool calls
            if(dat.choices?.[0]?.message && allToolCalls.length > 0) {
                dat.choices[0].message.tool_calls = allToolCalls
            }

            if(dat.choices?.[0]?.message?.tool_calls && dat.choices[0].message.tool_calls.length > 0){
                const toolCalls = dat.choices[0].message.tool_calls as OpenAIToolCall[]

                const messages = body.messages as OpenAIChatExtra[]
                
                messages.push(dat.choices[0].message)

                // Remove the last message content if simplifiedToolUse is enabled
                if(db.simplifiedToolUse && messages[messages.length - 1].content) {
                    messages[messages.length - 1].content = ''
                }
                
                const callCodes: string[] = []

                for(const toolCall of toolCalls){
                    if(!toolCall.function || !toolCall.function.name || !toolCall.function.arguments){
                        continue
                    }
                    try {
                        const functionArgs = JSON.parse(toolCall.function.arguments)
                        if(arg.tools && arg.tools.length > 0){
                            const tool = arg.tools.find(t => t.name === toolCall.function.name)
                            if(!tool){
                                messages.push({
                                    role:'tool',
                                    content: 'No tool found with name: ' + toolCall.function.name,
                                    tool_call_id: toolCall.id
                                })
                            }
                            else{
                                const parsed = functionArgs
                                const x = (await callTool(tool.name, parsed)).filter(m => m.type === 'text')
                                if(x.length > 0){
                                    messages.push({
                                        role: 'tool',
                                        content: x[0].text,
                                        tool_call_id: toolCall.id
                                    })
                                    if(arg.rememberToolUsage){
                                        callCodes.push(await encodeToolCall({
                                            call: {
                                                id: toolCall.id,
                                                name: toolCall.function.name,
                                                arg: toolCall.function.arguments
                                            },
                                            response: x
                                        }))
                                    }
                                }
                                else{
                                    messages.push({
                                        role: 'tool',
                                        content: 'Tool call failed with no text response',
                                        tool_call_id: toolCall.id
                                    })
                                }
                            }
                        }
                    } catch (error) {
                        messages.push({
                            role: 'tool',
                            content: 'Tool call failed with error: ' + error,
                            tool_call_id: toolCall.id
                        })
                    }
                }                
                
                body.messages = messages

                // Send the next request recursively
                let resRec
                let attempt = 0
                
                do {
                    attempt++
                    resRec = await requestHTTPOpenAI(replacerURL, body, headers, arg)
                    
                    if (resRec.type != 'fail') {
                        break
                    }
                } while (attempt <= db.requestRetrys) // Retry up to db.requestRetrys times

                const callCode = callCodes.join('\n\n')

                // Combine the tool call results with the main response (does not include text response if simplifiedToolUse is enabled)
                const result = (db.simplifiedToolUse ? '' : (processTextResponse(dat) ?? '') + '\n\n') + callCode
                        
                if(resRec.type === 'fail') {
                    alertError(`Failed to fetch model response after tool execution`)
                    return {
                        type: 'success',
                        result: result
                    }
                } else if(resRec.type === 'success') {
                    return {
                        type: 'success',
                        result: result + '\n\n' + resRec.result
                    }
                }
                        
                return resRec
            }
                    
            if(arg.multiGen && dat.choices){
                if(arg.extractJson && (db.jsonSchemaEnabled || arg.schema)){
                    
                    const c = dat.choices.map((v:{message:{content:string}}) => {
                        const extracted = extractJSON(v.message.content, arg.extractJson)
                        return ["char", extracted]
                    })
                    
                    return {
                        type: 'multiline',
                        result: c
                    }
                }
                return {
                    type: 'multiline',
                    result: dat.choices.map((v) => {
                        return ["char", v.message.content]
                    })
                }
            }            
                    
            const result = processTextResponse(dat) ?? ''
            
            return {
                type: 'success',
                result: result
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

export async function requestOpenAILegacyInstruct(arg:RequestDataArgumentExtended):Promise<requestDataResponse>{
    const formated = arg.formated
    const db = getDatabase()
    const maxTokens = arg.maxTokens
    const temperature = arg.temperature
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

    if(arg.previewBody){
        return {
            type: 'success',
            result: JSON.stringify({
                error: "This model is not supported in preview mode"
            })
        }
    }

    const response = await globalFetch(arg.customURL ?? "https://api.openai.com/v1/completions", {
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
            "Authorization": "Bearer " + (arg.key ?? db.openAIKey)
        },
        chatId: arg.chatId,
        abortSignal: arg.abortSignal
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


type OAIResponseItem = OAIResponseInputItem|OAIResponseOutputItem


export async function requestOpenAIResponseAPI(arg:RequestDataArgumentExtended):Promise<requestDataResponse>{

    const formated = arg.formated
    const db = getDatabase()
    const aiModel = arg.aiModel
    const maxTokens = arg.maxTokens

    const items:OAIResponseItem[] = []

    for(let i=0;i<formated.length;i++){
        const content = formated[i]
        switch(content.role){
            case 'function':
                break
            case 'assistant':{
                const item:OAIResponseOutputItem = {
                    content: [],
                    role: content.role,
                    status: 'complete',
                    type: 'message',
                }

                item.content.push({
                    type: 'output_text',
                    text: content.content,
                    annotations: []
                })

                items.push(item)
                break
            }
            case 'user':
            case 'system':{
                const item:OAIResponseInputItem = {
                    content: [],
                    role: content.role
                }

                item.content.push({
                    type: 'input_text',
                    text: content.content
                })

                content.multimodals ??= []
                for(const multimodal of content.multimodals){
                    if(multimodal.type === 'image'){
                        item.content.push({
                            type: 'input_image',
                            detail: 'auto',
                            image_url: multimodal.base64
                        })
                    }
                    else{
                        item.content.push({
                            type: 'input_file',
                            file_data: multimodal.base64,
                        })
                    }
                }

                items.push(item)
                break
            }
        }
    }

    if(items[items.length-1].role === 'assistant'){
        (items[items.length-1] as OAIResponseOutputItem).status = 'incomplete'
    }
    
    const body = applyParameters({
        model: arg.modelInfo.internalID ?? aiModel,
        input: items,
        max_output_tokens: maxTokens,
        tools: [],
        store: false
    }, ['temperature', 'top_p'], {}, arg.mode)

    let requestURL = arg.customURL ?? "https://api.openai.com/v1/responses"
    if(arg.modelInfo?.endpoint){
        requestURL = arg.modelInfo.endpoint
    }

    let risuIdentify = false
    if(requestURL.startsWith("risu::")){
        risuIdentify = true
        requestURL = requestURL.replace("risu::", '')
    }

    if(aiModel === 'reverse_proxy' && db.autofillRequestUrl){
        try{
            const url = new URL(requestURL)
            const pathSegments = url.pathname.split('/').filter(Boolean)
            const lastSegment = pathSegments[pathSegments.length - 1] ?? ''

            if(url.searchParams.has('api-version') && url.pathname.includes('/responses')){
                // Azure-style Responses API URL already includes the endpoint
            }
            else if(lastSegment === 'responses'){
                // keep as-is
            }
            else if(lastSegment === 'v1'){
                url.pathname = url.pathname.replace(/\/?$/, '/responses')
            }
            else{
                url.pathname = url.pathname.replace(/\/?$/, '/v1/responses')
            }

            requestURL = url.toString()
        }
        catch{
            const [baseURL, query] = requestURL.split('?', 2)
            let nextURL = baseURL
            const pathSegments = nextURL.split('/').filter(Boolean)
            const lastSegment = pathSegments[pathSegments.length - 1] ?? ''
            const hasApiVersion = query?.includes('api-version=')

            if(hasApiVersion && nextURL.includes('/responses')){
                // Azure-style Responses API URL already includes the endpoint
            }
            else if(lastSegment === 'responses'){
                // keep as-is
            }
            else if(lastSegment === 'v1'){
                nextURL += nextURL.endsWith('/') ? 'responses' : '/responses'
            }
            else{
                nextURL += nextURL.endsWith('/') ? 'v1/responses' : '/v1/responses'
            }

            requestURL = query ? `${nextURL}?${query}` : nextURL
        }
    }

    const headers = {
        "Authorization": "Bearer " + (arg.key ?? db.openAIKey),
        "Content-Type": "application/json"
    }

    if(risuIdentify){
        headers["X-Proxy-Risu"] = 'RisuAI'
    }

    if(arg.previewBody){
        return {
            type: 'success',
            result: JSON.stringify({
                url: requestURL,
                body: body,
                headers: headers
            })
        }
    }

    if(db.modelTools.includes('search')){
        body.tools.push('web_search_preview')
    }

    const response = await globalFetch(requestURL, {
        body: body,
        headers: headers,
        chatId: arg.chatId,
        abortSignal: arg.abortSignal
    });

    if(!response.ok){
        return {
            type: 'fail',
            result: (language.errors.httpError + `${JSON.stringify(response.data)}`)
        }
    }

    const calls = (response.data.output?.filter((m:OAIResponseOutputItem|OAIResponseOutputToolCall) => m.type === 'function_call')) as OAIResponseOutputToolCall[]
    let result:string = (response.data.output?.find((m:OAIResponseOutputItem) => m.type === 'message') as OAIResponseOutputItem)?.content?.find(m => m.type === 'output_text')?.text

    if(!result){
        return {
            type: 'fail',
            result: JSON.stringify(response.data)
        }
    }
    return {
        type: 'success',
        result: result
    }
}

function getTranStream(arg:RequestDataArgumentExtended):TransformStream<Uint8Array, StreamResponseChunk> {
    let dataUint:Uint8Array|Buffer = new Uint8Array([])
    let reasoningContent = ""
    const db = getDatabase()

    return new TransformStream<Uint8Array, StreamResponseChunk>({
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
                                if(arg.modelInfo.flags.includes(LLMFlags.deepSeekThinkingOutput)){
                                    readed["0"] = readed["0"].replace(/(.*)\<\/think\>/gms, (m, p1) => {
                                        reasoningContent = p1
                                        return ""
                                    })
                
                                    if(reasoningContent){
                                        reasoningContent = reasoningContent.replace(/\<think\>/gm, '')
                                    }
                                }                
                                if(arg.extractJson && (db.jsonSchemaEnabled || arg.schema)){
                                    for(const key in readed){
                                        const extracted = extractJSON(readed[key], arg.extractJson)
                                        JSONreaded[key] = extracted
                                    }
                                    console.log(JSONreaded)
                                    control.enqueue(JSONreaded)
                                }
                                else if(reasoningContent){
                                    control.enqueue({
                                        "0": `<Thoughts>\n${reasoningContent}\n</Thoughts>\n${readed["0"]}`
                                    })
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
                                    if(arg.multiGen){
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
                                // Check for tool calls in the delta
                                if(choice?.delta?.tool_calls){
                                    if(!readed["__tool_calls"]){
                                        readed["__tool_calls"] = JSON.stringify({})
                                    }
                                    const toolCallsData = JSON.parse(readed["__tool_calls"])
                                    
                                    for(const toolCall of choice.delta.tool_calls) {
                                        const index = toolCall.index ?? 0
                                        const toolCallId = toolCall.id
                                        
                                        // Initialize tool call data if not exists
                                        if(!toolCallsData[index]) {
                                            toolCallsData[index] = {
                                                id: toolCallId || null,
                                                type: 'function',
                                                function: {
                                                    name: null,
                                                    arguments: ''
                                                }
                                            }
                                        }
                                        
                                        // Update tool call data incrementally
                                        if(toolCall.id) {
                                            toolCallsData[index].id = toolCall.id
                                        }
                                        if(toolCall.function?.name) {
                                            toolCallsData[index].function.name = toolCall.function.name
                                        }
                                        if(toolCall.function?.arguments) {
                                            toolCallsData[index].function.arguments += toolCall.function.arguments
                                        }
                                    }
                                    
                                    readed["__tool_calls"] = JSON.stringify(toolCallsData)
                                }
                                if(choice?.delta?.reasoning_content){
                                    reasoningContent += choice.delta.reasoning_content
                                }
                            }
                        } catch (error) {}
                    }
                }
                
                if(arg.modelInfo.flags.includes(LLMFlags.deepSeekThinkingOutput)){
                    readed["0"] = readed["0"].replace(/(.*)\<\/think\>/gms, (m, p1) => {
                        reasoningContent = p1
                        return ""
                    })

                    if(reasoningContent){
                        reasoningContent = reasoningContent.replace(/\<think\>/gm, '')
                    }
                }
                if(arg.extractJson && (db.jsonSchemaEnabled || arg.schema)){
                    for(const key in readed){
                        const extracted = extractJSON(readed[key], arg.extractJson)
                        JSONreaded[key] = extracted
                    }
                    console.log(JSONreaded)
                    control.enqueue(JSONreaded)
                }
                else if(reasoningContent){
                    control.enqueue({
                        "0": `<Thoughts>\n${reasoningContent}\n</Thoughts>\n${readed["0"]}`
                    })
                }
                else{
                    control.enqueue(readed)
                }
            } catch (error) {
                
            }
        }        
    })
}

function wrapToolStream(
    stream: ReadableStream<StreamResponseChunk>,
    body:any,
    headers:Record<string,string>,
    replacerURL:string,
    arg:RequestDataArgumentExtended
):ReadableStream<StreamResponseChunk> {
    return new ReadableStream<StreamResponseChunk>({
        async start(controller) {

            const db = getDatabase()
            let reader = stream.getReader()
            let prefix = ''
            let lastValue

            while(true){
                let {done, value} = await reader.read()

                let content = value?.['0'] || ''
                if(done){
                    value = lastValue ?? {'0': ''}
                    content = value?.['0'] || ''
                    
                    const toolCalls = Object.values(JSON.parse(value?.['__tool_calls'] || '{}') || {}) as OpenAIToolCall[]; 
                    if(toolCalls && toolCalls.length > 0){
                        const messages = body.messages as OpenAIChatExtra[]

                        messages.push({
                            role: 'assistant',
                            content: (db.simplifiedToolUse ? '' : content),
                            tool_calls: toolCalls.map(call => ({
                                id: call.id,
                                type: 'function',
                                function: {
                                    name: call.function.name,
                                    arguments: call.function.arguments
                                }
                            }))
                        })

                        const callCodes: string[] = []
                    
                        for(const toolCall of toolCalls){
                            if(!toolCall.function || !toolCall.function.name || !toolCall.function.arguments){
                                continue
                            }
                            try {
                                const functionArgs = JSON.parse(toolCall.function.arguments)
                                if(arg.tools && arg.tools.length > 0){
                                    const tool = arg.tools.find(t => t.name === toolCall.function.name)
                                    if(!tool){
                                        messages.push({
                                            role:'tool',
                                            content: 'No tool found with name: ' + toolCall.function.name,
                                            tool_call_id: toolCall.id
                                        })
                                    }
                                    else{
                                        const parsed = functionArgs
                                        const x = (await callTool(tool.name, parsed)).filter(m => m.type === 'text')
                                        if(x.length > 0){
                                            messages.push({
                                                role: 'tool',
                                                content: x[0].text,
                                                tool_call_id: toolCall.id
                                            })
                                            if(arg.rememberToolUsage){
                                                callCodes.push(await encodeToolCall({
                                                    call: {
                                                        id: toolCall.id,
                                                        name: toolCall.function.name,
                                                        arg: toolCall.function.arguments
                                                    },
                                                    response: x
                                                }))
                                            }
                                        }
                                        else{
                                            messages.push({
                                                role: 'tool',
                                                content: 'Tool call failed with no text response',
                                                tool_call_id: toolCall.id
                                            })
                                        }
                                    }
                                }
                            } catch (error) {
                                messages.push({
                                    role: 'tool',
                                    content: 'Tool call failed with error: ' + error,
                                    tool_call_id: toolCall.id
                                })
                            }
                        }    
                        
                        body.messages = messages
                        
                        let resRec
                        let attempt = 0
                        let errorFlag = true
                        
                        do {
                            attempt++
                            resRec = await fetchNative(replacerURL, {
                                body: JSON.stringify(body),
                                method: "POST",
                                headers: headers,
                                signal: arg.abortSignal,
                                chatId: arg.chatId
                            })
                            
                            if(resRec.status == 200 && resRec.headers.get('Content-Type').includes('text/event-stream')) {
                                addFetchLog({
                                    body: body,
                                    response: "Streaming",
                                    success: true,
                                    url: replacerURL,
                                })
                                
                                errorFlag = false
                                break
                            }     
                        } while (attempt <= db.requestRetrys) // Retry up to db.requestRetrys times
                        
                        if(errorFlag){
                            alertError(`Failed to fetch model response after tool execution`)
                            return controller.close()
                        }
                        
                        const transtream = getTranStream(arg)                    
                        resRec.body.pipeTo(transtream.writable)
                        
                        reader = transtream.readable.getReader()
                        
                        prefix += (content && !db.simplifiedToolUse ? content + '\n\n' : '') + callCodes.join('\n\n')
                        controller.enqueue({"0": prefix})

                        continue
                    }
                    return controller.close()
                }
                
                lastValue = value
                
                controller.enqueue({"0": (prefix ? prefix + '\n\n' : '') + content})
            }
        }
    })
}

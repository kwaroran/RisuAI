import { language } from "src/lang"
import { alertError } from "src/ts/alert"
import { getDatabase } from "src/ts/storage/database.svelte"
import { LLMFlags } from "src/ts/model/modellist"
import { addFetchLog, fetchNative, globalFetch, textifyReadableStream } from "src/ts/globalApi.svelte"
import { simplifySchema } from "src/ts/util"
import { NANOGPT_RESPONSES_ENDPOINT, NANOGPT_SUBSCRIPTION_RESPONSES_ENDPOINT } from "src/ts/model/providers/nanogpt"

import { extractJSON, getOpenAIJSONSchema } from "../../templates/jsonSchema"
import { callTool, decodeToolCall, encodeToolCall } from "../../mcp/mcp"
import type { RequestDataArgumentExtended, requestDataResponse, StreamResponseChunk } from '../request'
import { applyAdditionalParameters, applyParameters, getAdditionalParameters, isReasoningCapabilityParameter } from '../shared'

import type { OpenAIChatExtra, ResponseFunctionCallItem, ResponseInputItem, ResponseItem, ResponseOutputItem } from './types'
import { getLocalNetworkRequestOptions, type LocalNetworkRequestOptions } from './shared'

function responseTextContentToString(content:any):string{
    if(typeof content === 'string'){
        return content
    }
    if(Array.isArray(content)){
        return content.map((c) => c?.text ?? '').join('\n')
    }
    return ''
}

async function decodeRememberedToolCallsForResponses(text:string):Promise<ResponseItem[]>{
    const items:ResponseItem[] = []
    const segments = text.split(/(<tool_call>.*?<\/tool_call>)/gms)
    let currentContent = ''

    for(const segment of segments){
        const toolCallMatch = segment.match(/<tool_call>(.*?)<\/tool_call>/s)
        if(!toolCallMatch){
            currentContent += segment
            continue
        }

        if(currentContent.trim()){
            items.push({
                content: [{ type: 'output_text', text: currentContent, annotations: [] }],
                role: 'assistant',
                status: 'completed',
                type: 'message'
            })
            currentContent = ''
        }

        const decoded = await decodeToolCall(toolCallMatch[1])
        if(decoded){
            items.push({
                type: 'function_call',
                call_id: decoded.call.id,
                name: decoded.call.name,
                arguments: decoded.call.arg,
                status: 'completed'
            })
            items.push({
                type: 'function_call_output',
                call_id: decoded.call.id,
                output: decoded.response.filter((m) => m.type === 'text').map((m) => m.text).join('\n')
            })
        }
    }

    if(currentContent.trim()){
        items.push({
            content: [{ type: 'output_text', text: currentContent, annotations: [] }],
            role: 'assistant',
            status: 'completed',
            type: 'message'
        })
    }

    return items
}

async function buildResponseInputItems(arg:RequestDataArgumentExtended):Promise<ResponseItem[]>{
    const items:ResponseItem[] = []
    const developerRole = arg.modelInfo.flags.includes(LLMFlags.DeveloperRole)
    const db = getDatabase()

    for(const content of arg.formated as OpenAIChatExtra[]){
        switch(content.role){
            case 'function':
                break
            case 'tool':{
                items.push({
                    type: 'function_call_output',
                    call_id: content.tool_call_id ?? '',
                    output: responseTextContentToString(content.content)
                })
                break
            }
            case 'assistant':{
                if(typeof content.content === 'string' && content.content.includes('<tool_call>')){
                    items.push(...await decodeRememberedToolCallsForResponses(content.content))
                    break
                }

                const text = responseTextContentToString(content.content)
                const item:ResponseOutputItem = {
                    content: text ? [{ type: 'output_text', text: text, annotations: [] }] : [],
                    role: 'assistant',
                    status: 'completed',
                    type: 'message',
                }
                items.push(item)

                if(content.tool_calls){
                    for(const toolCall of content.tool_calls){
                        items.push({
                            type: 'function_call',
                            call_id: toolCall.id,
                            name: toolCall.function.name,
                            arguments: toolCall.function.arguments,
                            status: 'completed'
                        })
                    }
                }
                break
            }
            case 'user':
            case 'developer':
            case 'system':{
                const role = content.role === 'system' && developerRole ? 'developer' : content.role
                const item:ResponseInputItem = {
                    content: [],
                    role: role as 'user' | 'system' | 'developer'
                }

                const text = responseTextContentToString(content.content)
                if(text || db.newOAIHandle === false){
                    item.content.push({ type: 'input_text', text })
                }

                const multimodals = content.multimodals ?? []
                for(const multimodal of multimodals){
                    if(multimodal.type === 'image'){
                        item.content.push({
                            type: 'input_image',
                            detail: (db.gptVisionQuality ?? 'auto') as 'high' | 'low' | 'auto',
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

                if(item.content.length > 0){
                    items.push(item)
                }
                break
            }
        }
    }

    return items
}

function getResponsesRequestURL(arg:RequestDataArgumentExtended):{requestURL:string, risuIdentify:boolean}{
    const db = getDatabase()
    const aiModel = arg.aiModel
    let requestURL = aiModel === 'nanogpt'
        ? (db.nanogptUseSubscriptionEndpoint ? NANOGPT_SUBSCRIPTION_RESPONSES_ENDPOINT : NANOGPT_RESPONSES_ENDPOINT)
        : (arg.customURL ?? "https://api.openai.com/v1/responses")
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

    return { requestURL, risuIdentify }
}

function buildResponsesHeaders(arg:RequestDataArgumentExtended, risuIdentify:boolean):Record<string,string>{
    const db = getDatabase()
    const aiModel = arg.aiModel
    const headers = {
        "Authorization": "Bearer " + (arg.key ?? (aiModel === 'nanogpt' ? db.nanogptKey : aiModel === 'reverse_proxy' ? db.proxyKey : db.openAIKey)),
        "Content-Type": "application/json"
    }

    if(arg.modelInfo?.keyIdentifier){
        headers["Authorization"] = "Bearer " + db.OaiCompAPIKeys[arg.modelInfo.keyIdentifier]
    }
    if(risuIdentify){
        headers["X-Proxy-Risu"] = 'RisuAI'
    }
    if(aiModel === 'nanogpt' && db.nanogptProvider && !db.nanogptUseSubscriptionEndpoint){
        headers["X-Provider"] = db.nanogptProvider
    }

    return headers
}

function getResponsesRequestModel(arg:RequestDataArgumentExtended):string{
    const db = getDatabase()
    if(arg.aiModel === 'nanogpt'){
        return db.nanogptRequestModel || arg.modelInfo.internalID || arg.aiModel
    }
    return arg.modelInfo.internalID || arg.aiModel || 'gpt-4.1'
}

function sanitizeResponsesContinuationItem(item:any):ResponseItem | null{
    if(item?.type === 'function_call' && item.call_id && item.name){
        return {
            type: 'function_call',
            call_id: item.call_id,
            name: item.name,
            arguments: item.arguments ?? '',
            status: item.status ?? 'completed'
        }
    }

    if(item?.type === 'message'){
        const content = (item.content ?? []).flatMap((contentItem:any) => {
            if(contentItem?.type === 'output_text'){
                return [{ type: 'output_text', text: contentItem.text ?? '', annotations: contentItem.annotations ?? [] }]
            }
            if(contentItem?.type === 'refusal'){
                return [{ type: 'refusal', refusal: contentItem.refusal ?? '' }]
            }
            return []
        })

        return {
            type: 'message',
            role: item.role ?? 'assistant',
            status: item.status ?? 'completed',
            content
        }
    }

    return null
}

function cloneResponsesBodyForRequest<T>(value:T):T{
    if(typeof structuredClone === 'function'){
        return structuredClone(value)
    }
    return JSON.parse(JSON.stringify(value))
}

function toExternalResponsesBody(body:Record<string, any>):Record<string, any>{
    const { __lastOutput: _internalLastOutput, ...externalBody } = body
    const requestBody = cloneResponsesBodyForRequest(externalBody)
    if(requestBody.store === false && Array.isArray(requestBody.input)){
        requestBody.input = requestBody.input.flatMap((item:any) => {
            const sanitized = sanitizeResponsesContinuationItem(item)
            if(sanitized){
                return [sanitized]
            }
            if(item?.type === 'reasoning'){
                return []
            }
            if(item && typeof item === 'object'){
                const { id: _serverItemId, ...clientItem } = item
                return [clientItem]
            }
            return [item]
        })
    }
    return requestBody
}

async function buildResponsesBody(arg:RequestDataArgumentExtended):Promise<Record<string, any>>{
    const db = getDatabase()
    const tools:any[] = []

    if(arg.tools && arg.tools.length > 0){
        tools.push(...arg.tools.map((tool) => ({
            type: 'function',
            name: tool.name,
            description: tool.description,
            parameters: simplifySchema(tool.inputSchema),
        })))
    }
    if(db.modelTools.includes('search')){
        tools.push({ type: 'web_search_preview' })
    }

    const responseParameters = arg.modelInfo.parameters.filter((p) =>
        ['temperature', 'top_p', 'reasoning_effort', 'verbosity'].includes(p) || isReasoningCapabilityParameter(p)
    )

    let body = applyParameters({
        model: getResponsesRequestModel(arg),
        input: await buildResponseInputItems(arg),
        max_output_tokens: arg.maxTokens,
        tools: tools,
        store: false
    }, responseParameters, {
        reasoning_effort: 'reasoning.effort',
        verbosity: 'text.verbosity'
    }, arg.mode, {
        modelId: arg.modelInfo.id
    })

    if(body.tools.length === 0){
        delete body.tools
    }
    if(arg.modelInfo.parameters.includes('reasoning_effort' as any)){
        body.reasoning ??= {}
        body.reasoning.summary ??= 'auto'
    }
    if(arg.aiModel === 'ollama-cloud'){
        delete body.store
    }
    if(db.jsonSchemaEnabled || arg.schema){
        body.text ??= {}
        body.text.format = {
            type: 'json_schema',
            ...getOpenAIJSONSchema(arg.schema)
        }
    }

    return body
}

function collectResponsesReasoningText(value:any):string[]{
    if(!value){
        return []
    }
    if(typeof value === 'string'){
        return [value]
    }
    if(Array.isArray(value)){
        return value.flatMap((item) => collectResponsesReasoningText(item))
    }
    if(typeof value !== 'object'){
        return []
    }

    const texts:string[] = []
    for(const key of ['text', 'summary_text', 'reasoning_text', 'reasoning', 'summary']){
        if(typeof value[key] === 'string'){
            texts.push(value[key])
        }
    }
    return texts
}

function extractResponsesReasoningTexts(item:any):string[]{
    if(item?.type !== 'reasoning'){
        return []
    }

    const texts = [
        ...collectResponsesReasoningText(item.summary),
        ...collectResponsesReasoningText(item.content),
    ]
    for(const key of ['text', 'summary_text', 'reasoning_text', 'reasoning']){
        if(typeof item[key] === 'string'){
            texts.push(item[key])
        }
    }

    return texts.filter((text) => text.length > 0)
}

function extractResponsesText(data:any, arg:RequestDataArgumentExtended):string{
    const db = getDatabase()
    const texts:string[] = []
    const refusals:string[] = []
    const thoughts:string[] = []
    const hasTopLevelOutputText = typeof data?.output_text === 'string'

    if(hasTopLevelOutputText){
        texts.push(data.output_text)
    }

    for(const item of data?.output ?? []){
        if(item?.type === 'reasoning'){
            thoughts.push(...extractResponsesReasoningTexts(item))
        }
        if(item?.type !== 'message'){
            continue
        }
        for(const content of item.content ?? []){
            if(!hasTopLevelOutputText && content?.type === 'output_text' && content.text){
                texts.push(content.text)
            }
            if(content?.type === 'refusal' && content.refusal){
                refusals.push(content.refusal)
            }
        }
    }

    if(refusals.length > 0 && texts.length === 0){
        return refusals.join('\n')
    }

    let result = texts.join('\n')
    if(thoughts.length > 0 && !result.startsWith('<Thoughts>')){
        result = `<Thoughts>\n\n${thoughts.join('\n\n')}\n\n</Thoughts>\n${result}`
    }
    if(arg.extractJson && (db.jsonSchemaEnabled || arg.schema)){
        return extractJSON(result, arg.extractJson)
    }

    return result
}

function extractResponsesFunctionCalls(data:any):ResponseFunctionCallItem[]{
    return (data?.output ?? [])
        .filter((item:any) => item?.type === 'function_call' && item.name && item.call_id)
        .map((item:any) => sanitizeResponsesContinuationItem(item))
        .filter((item:any): item is ResponseFunctionCallItem => item?.type === 'function_call')
}

async function appendResponsesToolOutputs(body:any, calls:ResponseFunctionCallItem[], arg:RequestDataArgumentExtended, assistantText:string):Promise<string>{
    const db = getDatabase()
    const input = body.input as ResponseItem[]
    for(const item of body.__lastOutput ?? []){
        const sanitized = sanitizeResponsesContinuationItem(item)
        if(!sanitized){
            continue
        }
        if(db.simplifiedToolUse && item?.type === 'message'){
            input.push({ ...sanitized, content: [] })
        }
        else{
            input.push(sanitized)
        }
    }

    const callCodes:string[] = []
    for(const toolCall of calls){
        let output = 'Tool call failed with no text response'
        try{
            const parsed = toolCall.arguments ? JSON.parse(toolCall.arguments) : {}
            const tool = arg.tools?.find((t) => t.name === toolCall.name)
            if(!tool){
                output = 'No tool found with name: ' + toolCall.name
            }
            else{
                const used = (await callTool(tool.name, parsed)).filter((m) => m.type === 'text')
                if(used.length > 0){
                    output = used[0].text
                    if(arg.rememberToolUsage){
                        callCodes.push(await encodeToolCall({
                            call: {
                                id: toolCall.call_id,
                                name: toolCall.name,
                                arg: toolCall.arguments
                            },
                            response: used
                        }))
                    }
                }
            }
        }
        catch(error){
            output = 'Tool call failed with error: ' + error
        }
        input.push({
            type: 'function_call_output',
            call_id: toolCall.call_id,
            output
        })
    }

    return [assistantText && !db.simplifiedToolUse ? assistantText : '', callCodes.join('\n\n')].filter(Boolean).join('\n\n')
}

async function requestHTTPResponsesAPI(requestURL:string, body:any, headers:Record<string,string>, arg:RequestDataArgumentExtended, networkOptions:LocalNetworkRequestOptions):Promise<requestDataResponse>{
    const db = getDatabase()
    const response = await globalFetch(requestURL, {
        body: toExternalResponsesBody(body),
        headers: headers,
        chatId: arg.chatId,
        abortSignal: arg.abortSignal,
        interceptor: 'openai_response_api',
        networkRoute: networkOptions.networkRoute,
        requestTimeoutMs: networkOptions.requestTimeoutMs
    })

    if(!response.ok){
        return {
            type: 'fail',
            result: (language.errors.httpError + `${JSON.stringify(response.data)}`)
        }
    }

    const data = response.data as any
    if(data?.status === 'failed' || data?.error){
        return { type: 'fail', result: JSON.stringify(data.error ?? data) }
    }
    if(data?.status === 'incomplete'){
        const result = extractResponsesText(data, arg)
        const reason = data?.incomplete_details?.reason ? `Incomplete response: ${data.incomplete_details.reason}` : 'Incomplete response'
        return { type: 'fail', result: result ? `${reason}\n${result}` : reason }
    }

    const calls = extractResponsesFunctionCalls(data)
    if(calls.length > 0){
        body.__lastOutput = data.output ?? []
        const assistantText = extractResponsesText(data, arg)
        const prefix = await appendResponsesToolOutputs(body, calls, arg, assistantText)
        delete body.__lastOutput

        let resRec:requestDataResponse
        let attempt = 0
        do{
            attempt++
            resRec = await requestHTTPResponsesAPI(requestURL, body, headers, arg, networkOptions)
            if(resRec.type !== 'fail'){
                break
            }
        } while(attempt <= db.requestRetrys)

        if(resRec.type === 'success'){
            return { type: 'success', result: prefix ? prefix + '\n\n' + resRec.result : resRec.result }
        }
        return resRec
    }

    const result = extractResponsesText(data, arg)
    if(!result){
        const incomplete = data?.incomplete_details?.reason ? `Incomplete response: ${data.incomplete_details.reason}` : ''
        return { type: 'fail', result: incomplete || JSON.stringify(data) }
    }

    return { type: 'success', result }
}

function getResponsesTranStream(arg:RequestDataArgumentExtended):TransformStream<Uint8Array, StreamResponseChunk>{
    const db = getDatabase()
    const decoder = new TextDecoder()
    let buffer = ''
    let text = ''
    let reasoning = ''
    let error = ''
    const calls:Record<string, ResponseFunctionCallItem> = {}

    const appendReasoning = (incoming?:string) => {
        if(!incoming){
            return
        }
        if(reasoning.endsWith(incoming)){
            return
        }
        if(reasoning){
            reasoning += "\n\n"
        }
        reasoning += incoming
    }

    const emit = (controller:TransformStreamDefaultController<StreamResponseChunk>) => {
        let result = text
        if(reasoning){
            result = `<Thoughts>\n\n${reasoning}\n\n</Thoughts>\n${result}`
        }
        if(arg.extractJson && (db.jsonSchemaEnabled || arg.schema)){
            result = extractJSON(result, arg.extractJson)
        }
        const chunk:Record<string,string> = { "0": error || result }
        if(Object.keys(calls).length > 0){
            chunk["__tool_calls"] = JSON.stringify(calls)
        }
        controller.enqueue(chunk)
    }

    const applyEvent = (event:any) => {
        const type = event?.type
        if(type === 'response.output_text.delta' || type === 'response.refusal.delta'){
            text += event.delta ?? ''
        }
        else if(type === 'response.output_text.done' && event.text && !text.endsWith(event.text)){
            text = event.text
        }
        else if(type === 'response.reasoning_summary_text.delta' || type === 'response.reasoning_text.delta' || type === 'response.reasoning.delta'){
            appendReasoning(event.delta)
        }
        else if(type === 'response.reasoning_summary_text.done' || type === 'response.reasoning_text.done'){
            if(event.text && !reasoning.endsWith(event.text)){
                reasoning = event.text
            }
        }
        else if(type === 'response.function_call_arguments.delta'){
            const key = event.call_id ?? event.item_id ?? event.output_index?.toString() ?? '0'
            calls[key] ??= { type: 'function_call', call_id: event.call_id ?? key, name: '', arguments: '' }
            calls[key].arguments += event.delta ?? ''
        }
        else if(type === 'response.output_item.done' && event.item?.type === 'function_call'){
            if(event.item.id){
                delete calls[event.item.id]
            }
            calls[event.item.call_id] = {
                type: 'function_call',
                call_id: event.item.call_id,
                name: event.item.name,
                arguments: event.item.arguments ?? '',
                status: event.item.status
            }
        }
        else if(type === 'response.failed' || type === 'response.error' || type === 'error'){
            error = JSON.stringify(event.error ?? event)
        }
        else if(type === 'response.completed'){
            const finalText = extractResponsesText(event.response, arg)
            if(finalText){
                text = finalText
                if(finalText.startsWith('<Thoughts>')){
                    reasoning = ''
                }
            }
            for(const call of extractResponsesFunctionCalls(event.response)){
                calls[call.call_id] = call
            }
        }
    }

    const processBufferedEvents = (controller:TransformStreamDefaultController<StreamResponseChunk>, final = false) => {
        const events = buffer.split(/\r?\n\r?\n/)
        buffer = events.pop() ?? ''
        if(final && buffer.trim()){
            events.push(buffer)
            buffer = ''
        }

        let emitted = false
        for(const rawEvent of events){
            const dataLines = rawEvent.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.replace(/^data:\s?/, ''))
            if(dataLines.length === 0){
                continue
            }
            const data = dataLines.join('\n')
            if(data === '[DONE]'){
                emit(controller)
                emitted = true
                continue
            }
            try{
                applyEvent(JSON.parse(data))
            }
            catch{}
            emit(controller)
            emitted = true
        }
        return emitted
    }

    return new TransformStream<Uint8Array, StreamResponseChunk>({
        transform(chunk, controller) {
            buffer += decoder.decode(chunk, { stream: true })
            processBufferedEvents(controller)
        },
        flush(controller) {
            buffer += decoder.decode()
            if(!processBufferedEvents(controller, true)){
                emit(controller)
            }
        }
    })
}

export const __testResponsesAPI = {
    buildResponsesBody,
    buildResponsesHeaders,
    extractResponsesText,
    extractResponsesFunctionCalls,
    getResponsesRequestURL,
    getResponsesTranStream,
    sanitizeResponsesContinuationItem,
    toExternalResponsesBody
}

function wrapResponsesToolStream(stream:ReadableStream<StreamResponseChunk>, body:any, headers:Record<string,string>, requestURL:string, arg:RequestDataArgumentExtended, networkOptions:LocalNetworkRequestOptions):ReadableStream<StreamResponseChunk>{
    return new ReadableStream<StreamResponseChunk>({
        async start(controller) {
            const db = getDatabase()
            let reader = stream.getReader()
            let prefix = ''
            let lastValue:StreamResponseChunk = { "0": '' }

            while(true){
                const { done, value } = await reader.read()
                if(!done){
                    lastValue = value
                    controller.enqueue({ "0": (prefix ? prefix + '\n\n' : '') + (value?.["0"] ?? '') })
                    continue
                }

                const calls = Object.values(JSON.parse(lastValue?.["__tool_calls"] || '{}') || {}) as ResponseFunctionCallItem[]
                if(calls.length === 0){
                    controller.close()
                    return
                }

                body.__lastOutput = calls.map((call) => ({
                    type: 'function_call',
                    call_id: call.call_id,
                    name: call.name,
                    arguments: call.arguments,
                    status: 'completed'
                }))
                const callPrefix = await appendResponsesToolOutputs(body, calls, arg, lastValue?.["0"] ?? '')
                delete body.__lastOutput
                prefix += (prefix && callPrefix ? '\n\n' : '') + callPrefix
                if(prefix){
                    controller.enqueue({ "0": prefix })
                }

                let resRec:Response
                let attempt = 0
                let ok = false
                do{
                    attempt++
                    resRec = await fetchNative(requestURL, {
                        body: JSON.stringify(toExternalResponsesBody(body)),
                        method: "POST",
                        headers: headers,
                        signal: arg.abortSignal,
                        chatId: arg.chatId,
                        interceptor: 'openai_response_api_tool',
                        networkRoute: networkOptions.networkRoute,
                        requestTimeoutMs: networkOptions.requestTimeoutMs
                    })
                    ok = resRec.status === 200 && resRec.headers.get('Content-Type')?.includes('text/event-stream')
                } while(!ok && attempt <= db.requestRetrys)

                if(!ok){
                    alertError(`Failed to fetch model response after tool execution`)
                    controller.close()
                    return
                }

                addFetchLog({
                    body: toExternalResponsesBody(body),
                    response: "Streaming",
                    success: true,
                    url: requestURL,
                    status: resRec.status,
                })

                const transtream = getResponsesTranStream(arg)
                resRec.body.pipeTo(transtream.writable)
                reader = transtream.readable.getReader()
                lastValue = { "0": '' }
            }
        }
    })
}

export async function requestOpenAIResponseAPI(arg:RequestDataArgumentExtended):Promise<requestDataResponse>{
    const db = getDatabase()
    const aiModel = arg.aiModel
    let body = await buildResponsesBody(arg)
    const { requestURL, risuIdentify } = getResponsesRequestURL(arg)
    const headers = buildResponsesHeaders(arg, risuIdentify)

    if(aiModel === 'reverse_proxy' || aiModel?.startsWith('xcustom:::')){
        body = applyAdditionalParameters(body, headers, getAdditionalParameters(aiModel))
    }
    if(!arg.useStreaming){
        body.stream = false
    }

    const localNetworkOptions = getLocalNetworkRequestOptions(requestURL, db, false)
    const streamingLocalNetworkOptions = getLocalNetworkRequestOptions(requestURL, db, true)

    if(arg.previewBody){
        return {
            type: 'success',
            result: JSON.stringify({
                url: requestURL,
                body: toExternalResponsesBody(body),
                headers: headers
            })
        }
    }

    if(arg.useStreaming){
        body.stream = true
        const response = await fetchNative(requestURL, {
            body: JSON.stringify(toExternalResponsesBody(body)),
            method: "POST",
            headers: headers,
            signal: arg.abortSignal,
            chatId: arg.chatId,
            interceptor: 'openai_response_api_streaming',
            networkRoute: streamingLocalNetworkOptions.networkRoute,
            requestTimeoutMs: streamingLocalNetworkOptions.requestTimeoutMs
        })

        if(response.status !== 200){
            return { type: 'fail', result: await textifyReadableStream(response.body) }
        }
        if(!response.headers.get('Content-Type')?.includes('text/event-stream')){
            return { type: 'fail', result: await textifyReadableStream(response.body) }
        }

        addFetchLog({
            body: toExternalResponsesBody(body),
            response: "Streaming",
            success: true,
            url: requestURL,
            status: response.status,
        })

        const transtream = getResponsesTranStream(arg)
        response.body.pipeTo(transtream.writable)
        return {
            type: 'streaming',
            result: wrapResponsesToolStream(transtream.readable, body, headers, requestURL, arg, streamingLocalNetworkOptions)
        }
    }

    return requestHTTPResponsesAPI(requestURL, body, headers, arg, localNetworkOptions)
}

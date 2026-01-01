import { fetchNative, globalFetch, textifyReadableStream } from "src/ts/globalApi.svelte"
import { language } from "src/lang"
import { LLMFlags, LLMFormat } from "src/ts/model/modellist"
import { getDatabase, setDatabase } from "src/ts/storage/database.svelte"
import { simplifySchema } from "src/ts/util"
import { v4 } from "uuid"
import { setInlayAsset, writeInlayImage } from "../files/inlays"
import { extractJSON, getGeneralJSONSchema } from "../templates/jsonSchema"
import { applyParameters, type Parameter, type RequestDataArgumentExtended, type requestDataResponse, type StreamResponseChunk } from "./request"
import { callTool, decodeToolCall, encodeToolCall } from "../mcp/mcp"
import { alertError, alertNormal, alertWait, showHypaV2Alert } from "src/ts/alert";
import { addFetchLog } from "src/ts/globalApi.svelte"

type GeminiFunctionCall = {
    id?: string;
    name: string;
    args: any
}

type GeminiFunctionResponse = {
    id?: string;
    name: string;
    response: any
}

interface GeminiPart{
    text?:string
    thought?:boolean
    thoughtSignature?:string
    "inlineData"?: {
        "mimeType": string,
        "data": string
    },
    functionCall?: GeminiFunctionCall
    functionResponse?: GeminiFunctionResponse
}

interface GeminiChat {
    role: "user"|"model"|"function"
    parts:|GeminiPart[]
}

export async function requestGoogleCloudVertex(arg:RequestDataArgumentExtended):Promise<requestDataResponse> {

    const formated = arg.formated
    const db = getDatabase()
    const maxTokens = arg.maxTokens

    let reformatedChat:GeminiChat[] = []
    let systemPrompt = ''

    if(formated[0].role === 'system'){
        systemPrompt = formated[0].content
        formated.shift()
    }

    for(let i=0;i<formated.length;i++){
        const chat = formated[i]
  
        const prevChat = reformatedChat[reformatedChat.length-1]
        const qRole = 
            chat.role === 'user' ? 'user' :
            chat.role === 'assistant' ? 'model' :
            chat.role

        if (chat.multimodals && chat.multimodals.length > 0) {
            let geminiParts: GeminiPart[] = [];
            
            geminiParts.push({
                text: chat.content,
            });
            
            for (const modal of chat.multimodals) {
                if (
                    (modal.type === "image" && arg.modelInfo.flags.includes(LLMFlags.hasImageInput)) ||
                    (modal.type === "audio" && arg.modelInfo.flags.includes(LLMFlags.hasAudioInput)) ||
                    (modal.type === "video" && arg.modelInfo.flags.includes(LLMFlags.hasVideoInput))
                ) {
                    const dataurl = modal.base64;
                    const base64 = dataurl.split(",")[1];
                    const mediaType = dataurl.split(";")[0].split(":")[1];
        
                    geminiParts.push({
                        inlineData: {
                            mimeType: mediaType,
                            data: base64,
                        }
                    });
                }
            }
    
            reformatedChat.push({
                role: chat.role === 'user' ? 'user' : 'model',
                parts: geminiParts,
            });        }
        else if(chat.role === 'system'){
            if(prevChat?.role === 'user'){
                reformatedChat[reformatedChat.length-1].parts[0].text += '\nsystem:' + chat.content
            }
            else{
                reformatedChat.push({
                    role: "user",
                    parts: [{
                        text: chat.role + ':' + chat.content
                    }]
                })
            }
        }
        else if(chat.role === 'assistant' || chat.role === 'user'){
            reformatedChat.push({
                role: chat.role === 'user' ? 'user' : 'model',
                parts: [{
                    text: chat.content
                }]
            })
        }
        else{
            reformatedChat.push({
                role: "user",
                parts: [{
                    text: chat.role + ':' + chat.content
                }]
            })
        }
    }

    for (let i=0;i<reformatedChat.length;i++){

        let chat = reformatedChat[i]
        for (let j=0;j<chat.parts.length;j++){
            
            const part = chat.parts[j]
            if (part.text && part.text.includes('<tool_call>')){
                // Analyze the entire text to sequentially process multiple tool_calls
                const toolCallMatches = [...part.text.matchAll(/<tool_call>(.*?)<\/tool_call>/g)]
                if (toolCallMatches.length > 0) {
                    // Split the text by tool_call and reconstruct in order
                    const segments = []
                    let lastIndex = 0

                    for (let k = 0; k < toolCallMatches.length; k++) {
                        const match = toolCallMatches[k]
                        // Text before tool_call
                        if (match.index! > lastIndex) {
                            segments.push({
                                type: 'text',
                                content: part.text.substring(lastIndex, match.index).trim(),
                                role: chat.role
                            })
                        }

                        // Handle tool_call
                        const call = await decodeToolCall(match[1])
                        if (call) {
                            const tool = arg?.tools?.find((t) => t.name === call.call.name)
                            if (tool) {
                                segments.push({
                                    type: 'functionCall',
                                    call: call,
                                    tool: tool
                                })
                            }
                        }

                        lastIndex = match.index! + match[0].length
                    }
                    // Last text after the last tool_call
                    if (lastIndex < part.text.length) {
                        segments.push({
                            type: 'text',
                            content: part.text.substring(lastIndex).trim(),
                            role: chat.role
                        })
                    }
                    // Keep the first text in the current part
                    if (segments.length > 0 && segments[0].type === 'text') {
                        part.text = segments[0].content.trim() ? segments[0].content : ''
                        segments.shift()
                    } else {
                        part.text = ''
                    }

                    // Mark the current part for removal if its text is empty
                    const shouldRemoveCurrentPart = !part.text.trim()

                    // Insert the remaining segments in order
                    let insertIndex = i + 1
                    for (const segment of segments) {
                        if (segment.type === 'text') {
                            // Insert only non-empty text
                            if (segment.content.trim()) {
                                reformatedChat.splice(insertIndex, 0, {
                                    role: segment.role,
                                    parts: [{
                                        text: segment.content
                                    }]
                                })
                                insertIndex++
                            }
                        } else if (segment.type === 'functionCall') {
                            // Insert functionCall
                            reformatedChat.splice(insertIndex, 0, {
                                role: 'model',
                                parts: [{
                                    functionCall: {
                                        name: segment.call.call.name,
                                        args: segment.call.call.arg
                                    }
                                }]
                            })
                            insertIndex++

                            // Insert functionResponse
                            reformatedChat.splice(insertIndex, 0, {
                                role: 'function',
                                parts: [{
                                    functionResponse: {
                                        name: segment.call.call.name,
                                        response: {
                                            data: segment.call.response.filter((r) => {
                                                return r.type === 'text'
                                            }).map((r) => {
                                                return r.text
                                            })
                                        }
                                    }
                                }]
                            })
                            insertIndex++
                        }
                    }
                    // Remove the current part if its text is empty
                    if (shouldRemoveCurrentPart) {
                        reformatedChat.splice(i, 1)
                        i = insertIndex - 2 // Adjust index after removal
                    } else {
                        i = insertIndex - 1 // Start from the correct position in the next loop
                    }
                }
            }
        }
    }

    // After tool parsing, merge consecutive chats with the same role
    for (let i = reformatedChat.length - 1; i >= 1; i--) {
        const currentChat = reformatedChat[i]
        const prevChat = reformatedChat[i - 1]

        if (currentChat.role === prevChat.role) {
            // If the same role is consecutive, merge the parts arrays and remove the current chat

            // If the last part of the previous chat and the first part of the current chat are both text, join with \n\n
            const prevLastPart = prevChat.parts[prevChat.parts.length - 1]
            const currentFirstPart = currentChat.parts[0]

            if (prevLastPart.text && currentFirstPart.text) {
                prevLastPart.text += '\n\n' + currentFirstPart.text
                // Add the rest of the current chat's parts except the first
                prevChat.parts.push(...currentChat.parts.slice(1))
            } else {
                // If not text, just merge the parts arrays
                prevChat.parts.push(...currentChat.parts)
            }

            // Remove the current chat
            reformatedChat.splice(i, 1)
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
        {
            "category": "HARM_CATEGORY_CIVIC_INTEGRITY",
            "threshold": "BLOCK_NONE"
        }
    ]

    if(arg.modelInfo.flags.includes(LLMFlags.noCivilIntegrity)){
        uncensoredCatagory.splice(4, 1)
    }

    if(arg.modelInfo.flags.includes(LLMFlags.geminiBlockOff)){
        for(let i=0;i<uncensoredCatagory.length;i++){
            uncensoredCatagory[i].threshold = "OFF"
        }
    }

    let para:Parameter[] = ['temperature', 'top_p', 'top_k', 'presence_penalty', 'frequency_penalty']

    if(arg.modelInfo.flags.includes(LLMFlags.geminiThinking)){
        para.push('thinking_tokens')
    }

    para = para.filter((v) => {
        return arg.modelInfo.parameters.includes(v)
    })

    const body = {
        contents: reformatedChat,
        generation_config: applyParameters({
            "maxOutputTokens": maxTokens
        }, para, {
            'top_p': "topP",
            'top_k': "topK",
            'presence_penalty': "presencePenalty",
            'frequency_penalty': "frequencyPenalty",
            'thinking_tokens': "thinkingBudget"
        }, arg.mode, {
            ignoreTopKIfZero: true
        }),
        safetySettings: uncensoredCatagory,
        systemInstruction: {
            parts: [
                {
                    "text": systemPrompt
                }
            ]
        },
        tools: {
            functionDeclarations: arg?.tools?.map((tool, i) => {
                console.log(tool.name, i)
                return {
                    name: tool.name,
                    description: tool.description,
                    parameters: simplifySchema(tool.inputSchema)
                }
            }) ?? []
        }
    }

    if(arg.modelInfo.flags.includes(LLMFlags.geminiThinking)){
        const internalId = arg.modelInfo.internalID
        const thinkingBudget = body.generation_config.thinkingBudget

        // Gemini 3 models use `thinking_level` (via thinkingConfig.thinkingLevel) instead of `thinking_budget`.
        // Keep UI/param name 'thinking_tokens' but translate it here for compatibility.
        if (internalId && /^gemini-3-/.test(internalId)) {
            const budgetNum = typeof thinkingBudget === 'number' ? thinkingBudget : Number(thinkingBudget)

            // Conservative mapping: keep levels coarse to avoid model-specific strict validation.
            // - gemini-3-flash-preview: LOW/MEDIUM/HIGH
            // - gemini-3-pro* (incl. image): LOW/HIGH
            let thinkingLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH'
            if (internalId === 'gemini-3-flash-preview') {
                if (!Number.isFinite(budgetNum) || budgetNum >= 16384) thinkingLevel = 'HIGH'
                else if (budgetNum >= 4096) thinkingLevel = 'MEDIUM'
                else thinkingLevel = 'LOW'
            } else {
                if (!Number.isFinite(budgetNum) || budgetNum >= 8192) thinkingLevel = 'HIGH'
                else thinkingLevel = 'LOW'
            }

            body.generation_config.thinkingConfig = {
                "thinkingLevel": thinkingLevel,
                "includeThoughts": true,
            }
        } else {
            body.generation_config.thinkingConfig = {
                "thinkingBudget": thinkingBudget,
                "includeThoughts": true,
            }
        }

        delete body.generation_config.thinkingBudget
    }

    if(systemPrompt === ''){
        delete body.systemInstruction
    }

    if(arg.modelInfo.flags.includes(LLMFlags.hasAudioOutput)){
        body.generation_config.responseModalities = [
            'TEXT', 'AUDIO'
        ]
        arg.useStreaming = false
    }
    if(arg.imageResponse || arg.modelInfo.flags.includes(LLMFlags.hasImageOutput)){ 
        body.generation_config.responseModalities = [
            'TEXT', 'IMAGE'
        ]
        arg.useStreaming = false
    }    let headers:{[key:string]:string} = {}

    if(db.gptVisionQuality === 'high'){
        body.generation_config.mediaResolution = "MEDIA_RESOLUTION_MEDIUM"
    }

    const PROJECT_ID = db.google.projectId
    const REGION = db.vertexRegion
    console.log(arg.modelInfo);

    const isVertexGlobalOnlyModel = (modelId: string) => {
        // As of 2025-12, Gemini 3 preview models are only available on the global endpoint.
        return /^gemini-3-.*-preview$/.test(modelId)
    }

    async function generateToken(email:string,key:string){
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error("Web Crypto API is not available in this environment. Please ensure you are using HTTPS.");
        }
        // Input validation
        if (!email.includes("gserviceaccount.com")) {
            throw new Error("Invalid Vertex client email. Must include gserviceaccount.com");
        }
        if (!key.includes("-----BEGIN PRIVATE KEY-----") ||
            !key.includes("-----END PRIVATE KEY-----")) {
            throw new Error("Invalid Vertex private key. Must include proper key markers.");
        }

        function str2ab(privateKey:string):ArrayBuffer {
            const binaryString = atob(privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\\n/g, ""));
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        }

        function base64url(source: Uint8Array | ArrayBuffer): string {
            const bytes = source instanceof ArrayBuffer ? new Uint8Array(source) : source;
            let encodedSource = btoa(String.fromCharCode.apply(null, [...bytes]))
                .replace(/=+$/, "")
                .replace(/\+/g, "-")
                .replace(/\//g, "_");
            return encodedSource;
        }

        const time = Math.floor(Date.now() / 1000);
    
        const header = {
            alg: "RS256",
            typ: "JWT",
        };

        const claimSet = {
            iss: email,
            iat: time,
            exp: time + 3600,
            scope: "https://www.googleapis.com/auth/cloud-platform",
            aud: "https://oauth2.googleapis.com/token",
        };

        const encodedHeader = base64url(new TextEncoder().encode(JSON.stringify(header)));
        const encodedClaimSet = base64url(new TextEncoder().encode(JSON.stringify(claimSet)));
    
        const cryptokey = await crypto.subtle.importKey(
            "pkcs8",
            str2ab(key),
            {
                name: "RSASSA-PKCS1-v1_5",
                hash: { name: "SHA-256" },
            },
            false,
            ["sign"]
        );
    
        const signature = await crypto.subtle.sign(
            "RSASSA-PKCS1-v1_5",
            cryptokey,
            new TextEncoder().encode(`${encodedHeader}.${encodedClaimSet}`)
        );

        const jwt = `${encodedHeader}.${encodedClaimSet}.${base64url(new Uint8Array(signature))}`;

        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        if (!response.ok) {
            let errorText;
            try {
                errorText = JSON.stringify(await response.json());
            } catch {
                errorText = response.status.toString();
            }
            throw new Error(`Failed to refresh google access token: ${errorText}`);
        }

        const data = await response.json();
        const token = data.access_token;

        if (!token) {
            throw new Error("No google access token in the response");
        }

        const db2 = getDatabase()
        db2.vertexAccessToken = token
        db2.vertexAccessTokenExpires = Date.now() + 3500 * 1000
        setDatabase(db2)
        return token;
    }    
    
    if(arg.modelInfo.format === LLMFormat.VertexAIGemini){
        if(db.vertexAccessTokenExpires < Date.now()){
            if (!db.vertexClientEmail || !db.vertexPrivateKey) {
                alertError("Vertex AI authentication information is missing or incomplete. Please check your settings.");
                return { type: 'fail', result: "Vertex AI authentication information is missing or incomplete. Please check your settings." };
            }
            headers['Authorization'] = "Bearer " + await generateToken(db.vertexClientEmail, db.vertexPrivateKey)
        }
        else{
            headers['Authorization'] = "Bearer " + db.vertexAccessToken
        }
    }

    
    if(db.jsonSchemaEnabled || arg.schema){
        body.generation_config.response_mime_type = "application/json"
        body.generation_config.response_schema = getGeneralJSONSchema(arg.schema, ['$schema','additionalProperties'])
        console.log(body.generation_config.response_schema)
    }    
    
    let url = ''
    let apiKey = arg.key || db.google.accessToken
    
    if(arg.customURL){
        let baseURL = arg.customURL
        if (!baseURL.endsWith('/')) {
            baseURL += '/'
        }
        const endpoint = arg.useStreaming ? 'streamGenerateContent' : 'generateContent'
        const u = new URL(`models/${arg.modelInfo.internalID}:${endpoint}`, baseURL)
        u.searchParams.set('key', apiKey)
        if (arg.useStreaming) {
            u.searchParams.set('alt', 'sse')
        }
        url = u.toString()
    }
    else if(arg.modelInfo.format === LLMFormat.VertexAIGemini){
        const endpoint = arg.useStreaming ? 'streamGenerateContent?alt=sse' : 'generateContent'

        // Some models (e.g. Gemini 3 preview) are only available via the global endpoint.
        const effectiveRegion = isVertexGlobalOnlyModel(arg.modelInfo.internalID) ? 'global' : REGION

        url = effectiveRegion === 'global' ?
            `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${effectiveRegion}/publishers/google/models/${arg.modelInfo.internalID}:${endpoint}` :
            `https://${effectiveRegion}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${effectiveRegion}/publishers/google/models/${arg.modelInfo.internalID}:${endpoint}`
        
        }
    else if(arg.modelInfo.format === LLMFormat.GoogleCloud && arg.useStreaming){
        url = `https://generativelanguage.googleapis.com/v1beta/models/${arg.modelInfo.internalID}:streamGenerateContent?key=${apiKey}&alt=sse`
    }
    else{
        url = `https://generativelanguage.googleapis.com/v1beta/models/${arg.modelInfo.internalID}:generateContent?key=${apiKey}`
    }
    // will return error if functionDeclarations is empty
    if(body.tools?.functionDeclarations?.length === 0){
        body.tools = undefined
    }

    if(arg.previewBody){
        return {
            type: 'success',
            result: JSON.stringify({
                url: url,
                body: body,
                headers: headers
            })      
        }
    }

    return requestGoogle(url, body, headers, arg)
}

async function requestGoogle(url:string, body:any, headers:{[key:string]:string}, arg:RequestDataArgumentExtended):Promise<requestDataResponse> {
    
    const db = getDatabase()

    const fallBackGemini = async (originalError:string):Promise<requestDataResponse> => {
        if(!db.antiServerOverloads){
            return {
                type: 'fail',
                result: originalError,
                failByServerError: true
            }
        }

        if(arg?.abortSignal?.aborted){
            return {
                type: 'fail',
                result: originalError,
                failByServerError: true
            }
        }
        if(arg.modelInfo.format === LLMFormat.VertexAIGemini){
            return {
                type: 'fail',
                result: originalError,
                failByServerError: true
            }
        }

        return requestGoogle(url, body, headers, arg)
    }

    // process the text parts into a single text response
    const processTextResponse = (rDatas: {text: string, thought?: boolean}[]) => {
        if(arg.extractJson && (db.jsonSchemaEnabled || arg.schema)){
            for(let i=0;i<rDatas.length;i++){
                const extracted = extractJSON(rDatas[i].text, arg.extractJson)
                rDatas[i].text = extracted
            }
        }
        const thoughts = rDatas.filter(d => d.thought).map(d => d.text).join('\n\n')
        const content = rDatas.filter(d => !d.thought).map(d => d.text).join('\n\n')
        return (thoughts ? `<Thoughts>\n\n${thoughts}\n\n</Thoughts>\n\n` : '') + content
    }

    if((arg.modelInfo.format === LLMFormat.GoogleCloud || arg.modelInfo.format === LLMFormat.VertexAIGemini) && arg.useStreaming){
        headers['Content-Type'] = 'application/json'

        if(arg.previewBody){
            return {
                type: 'success',
                result: JSON.stringify({
                    url: url,
                    body: body,
                    headers: headers
                })      
            }
        }
        const f = await fetchNative(url, {
            headers: headers,
            body: JSON.stringify(body),
            method: 'POST',
            chatId: arg.chatId,
            signal: arg.abortSignal,
        })

        if(f.status !== 200){
            const text = await textifyReadableStream(f.body)
            if(text.includes('RESOURCE_EXHAUSTED')){
                return fallBackGemini(text)
            }
            return {
                type: 'fail',
                result: text
            }
        }

        const transtream = getTranStream() 

        f.body.pipeTo(transtream.writable)

        return {
            type: 'streaming',
            result: wrapToolStream(transtream.readable, body, headers, url, arg)
        }
    }

    const res = await globalFetch(url, {
        headers: headers,
        body: body,
        chatId: arg.chatId,
        abortSignal: arg.abortSignal,
    })
    

    if(!res.ok){
        const text = JSON.stringify(res.data)
        if(text.includes('RESOURCE_EXHAUSTED')){
            return fallBackGemini(text)
        }
        return {
            type: 'fail',
            result: `${JSON.stringify(res.data)}`
        }
    }

    let rDatas:{text: string, thought?: boolean}[] = [] 
    const processDataItem = async (data:any):Promise<GeminiPart[]> => {
        const parts = data?.candidates?.[0]?.content?.parts as GeminiPart[]

        if(parts){
         
            for(let i=0;i<parts.length;i++){
                const part = parts[i]

                if(part.text){
                    rDatas.push({
                        text: part.text,
                        thought: part.thought
                    })
                }

                if(part.inlineData){
                    const imgHTML = new Image()
                    const id = crypto.randomUUID()

                    if(part.inlineData.mimeType.startsWith('image/')){

                        imgHTML.src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                        await writeInlayImage(imgHTML, {
                            id: id
                        })
                        rDatas.push({
                            text: `{{inlayeddata::${id}}}`
                        })
                    }
                    else{
                        const id = v4()
                        await setInlayAsset(id, {
                            name: 'gemini-audio',
                            type: 'audio',
                            data: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                            height: 0,
                            width: 0,
                            ext: part.inlineData.mimeType.split('/')[1],
                        })
                    }
                }
            }   
        }
        return parts
    }

    // traverse responded data if it contains multipart contents
    let parts:GeminiPart[] = []
    if(Array.isArray(res.data)){
        for(const data of res.data){
            const p = await processDataItem(data)
            parts = parts.concat(p)
        }
    }
    else{
        const p = await processDataItem(res.data)
        parts = parts.concat(p)
    }
    parts = parts.filter((p) => p)

    const calls = parts.filter((p) => !!p?.functionCall).map((p) => p?.functionCall as GeminiFunctionCall)

    // If there are function calls, handle calls and send next request
    if(calls.length > 0){
        const chat = body.contents as GeminiChat[]

        // Add the model response part to the request content (only function calls if simplifiedToolUse is enabled)
        if(db.simplifiedToolUse){
            chat.push({
                role: 'model',
                parts: calls.map((call) => {
                    return {
                        functionCall: {
                            name: call.name,
                            args: call.args
                        }
                    } as GeminiPart
                })
            })
        }
        // Add the model response part to the request content (text response and function calls)
        else{
            chat.push({
                role: 'model',
                parts: parts.filter((p) => !p.thought)
            })
        }
        // If the last part is a model response, merge it with the previous model response
        if(chat[chat.length - 2]?.role === 'model') {
            chat[chat.length - 2].parts = chat[chat.length - 2].parts.concat(chat[chat.length - 1].parts)
            chat.pop() 
        }
        
        const functionParts: GeminiPart[] = []
        const callCodes: string[] = []
        const tools = arg?.tools ?? []
        
        // Handle tool calls
        for(const call of calls){
            const functionName = call.name
            const functionArgs = call.args
            
            const tool = tools.find((t) => t.name === functionName)
            if(tool){
                const result = (await callTool(tool.name, functionArgs)).filter((r) => {
                    return r.type === 'text'
                })
                if(result.length === 0){
                    functionParts.push({
                        functionResponse: {
                            name: call.name,
                            response: 'No response from tool.'
                        }
                    })
                }
                
                // Store the encoded tool call history for later use
                if(arg.rememberToolUsage){
                    callCodes.push(await encodeToolCall({
                        call: {
                            id: call.id,
                            name: call.name,
                            arg: call.args
                        },
                        response: result
                    }))
                }
                
                for(let i=0;i<result.length;i++){
                    let response:any = result[i].text
                    try {
                        //try json parse
                        response = {
                            data: JSON.parse(response)
                        }
                    } catch (error) {
                        response = {
                            data: response
                        }
                    }
                    functionParts.push({
                        functionResponse: {
                            name: call.name,
                            response
                        }
                    })
                }
            }
            else{
                functionParts.push({
                    functionResponse: {
                        name: call.name,
                        response: `Tool ${call.name} not found.`
                    }
                })
            }
        }
        
        // Add the user response part to the request content (function responses)
        chat.push({
            role: 'function',
            parts: functionParts
        })

        body.contents = chat

        // Send the next request recursively 
        let resRec
        let attempt = 0
        do {
            attempt++
            resRec = await requestGoogle(url, body, headers, arg)
            
            if (resRec.type != 'fail') {
                break
            }
        } while (attempt <= db.requestRetrys) // Retry up to db.requestRetrys times
        
        // Does not include the text response if simplifiedToolUse is enabled
        const result = (db.simplifiedToolUse ? '' : processTextResponse(rDatas) + '\n\n') + callCodes.join('\n\n')

        // If the next request fails, only the responses so far are returned
        if(resRec.type === 'fail'){
            alertError(`Failed to fetch model response after tool execution`)
            return {
                type: 'success',
                result: result
            }
        } else if(resRec.type === 'success'){
            return {
                type: 'success',
                result: result + '\n\n' + resRec.result
            }
        }
        
        return resRec
    }
    
    const result = processTextResponse(rDatas)

    // fail if the result is empty
    if(!result) {
        return {
            type: 'fail',
            result: `Got empty response: ${JSON.stringify(res.data)}`
        }
    }

    console.log(result)
    return {
        type: 'success',
        result: result
    }
}

function initStreamState(state?: {[key:string]:string}): {[key:string]:string} {
    if(!state) {
        return {
            "__sign_text": "", 
            "__sign_function": "", 
            "__last_thought": "", 
            "__thoughts": "", 
            "__tool_calls": "[]", 
            "0": ""
        };
    }
    state["__sign_text"] = state["__sign_text"] || "";
    state["__sign_function"] = state["__sign_function"] || "";
    state["__last_thought"] = state["__last_thought"] || "";
    state["__thoughts"] = state["__thoughts"] || "";
    state["__tool_calls"] = state["__tool_calls"] || "[]";
    state["0"] = state["0"] || "";
    return state;
}

function getTranStream():TransformStream<Uint8Array, StreamResponseChunk> {
    let buffer = '';

    return new TransformStream<Uint8Array, StreamResponseChunk>({
        transform(chunk, control) {
            buffer += new TextDecoder().decode(chunk);
            const lines = buffer.split('\n');

            let readed = initStreamState();

            try {
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') return;
                    
                        const jsonData = JSON.parse(dataStr);
                        
                        if (jsonData.candidates?.[0]?.content?.parts) {
                            const parts = jsonData.candidates[0].content.parts;
                            for (const part of parts) {
                                if (part.text) {
                                    readed["__thoughts"] += readed["__last_thought"];
                                    readed["__last_thought"] = "";
                                    if (part.thought){
                                        readed["__last_thought"] = part.text;
                                    }
                                    else {
                                        readed["0"] += part.text;
                                    }
                                    if (part.thoughtSignature) {
                                        readed["__sign_text"] = part.thoughtSignature;
                                    }
                                }
                                if (part.functionCall) {
                                    const toolCallsData = JSON.parse(readed["__tool_calls"]);
                                    toolCallsData.push(part.functionCall);
                                    readed["__tool_calls"] = JSON.stringify(toolCallsData);
                                    if(part.thoughtSignature){
                                        readed["__sign_function"] = part.thoughtSignature;
                                    }
                                }
                            }
                        }
                    } 
                }
                control.enqueue(readed)
            } catch (error) { 

            }
        }
    });
}

function wrapToolStream(
    stream: ReadableStream<StreamResponseChunk>,
    body:any,
    headers:Record<string,string>,
    url:string,
    arg:RequestDataArgumentExtended
):ReadableStream<StreamResponseChunk> {
    return new ReadableStream<StreamResponseChunk>({
        async start(controller) {

            const db = getDatabase()
            let reader = stream.getReader()
            let prefix = ''
            let lastValue = initStreamState()

            while(true){
                let {done, value} = await reader.read()

                value = initStreamState(value)

                if(arg.extractJson && (db.jsonSchemaEnabled || arg.schema)){
                    value["0"] = extractJSON(value["0"], arg.extractJson)
                }

                let content = value["0"]
                let thoughts = value["__thoughts"]
                let lastThought = value["__last_thought"]

                if(done){
                    value = initStreamState(lastValue)

                    content = value["0"]
                    thoughts = value["__thoughts"]
                    lastThought = value["__last_thought"]

                    // thoughtSignatures 
                    const signText = value["__sign_text"]
                    const signFunction = value["__sign_function"]

                    const calls = JSON.parse(value["__tool_calls"]) as GeminiFunctionCall[]
                    if(calls && calls.length > 0){
                        const chat = body.contents as GeminiChat[]

                        // Add the model response part to the request content (only function calls if simplifiedToolUse is enabled)
                        if(db.simplifiedToolUse){
                            chat.push({
                                role: 'model',
                                parts: calls.map((call) => {
                                    return {
                                        functionCall: {
                                            name: call.name,
                                            args: call.args
                                        }
                                    } as GeminiPart
                                })
                            })
                        }
                        // Add the model response part to the request content (text response and function calls)
                        else{
                            chat.push({
                                role: 'model',
                                parts: [{
                                    text: content,
                                    ...(signText ? { thoughtSignature: signText } : {})
                                } as GeminiPart]
                                .concat(
                                    calls.map((call, index) => ({
                                        functionCall: {
                                            name: call.name,
                                            args: call.args
                                        },
                                        ...(index === 0 && signFunction ? { thoughtSignature: signFunction } : {})
                                    } as GeminiPart))
                                )
                            })
                        }
                        // If the last part is a model response, merge it with the previous model response
                        if(chat[chat.length - 2]?.role === 'model') {
                            chat[chat.length - 2].parts = chat[chat.length - 2].parts.concat(chat[chat.length - 1].parts)
                            chat.pop() 
                        }
                        const parts: GeminiPart[] = []
                        const callCodes: string[] = []
                        const tools = arg?.tools ?? []
                        // Handle tool calls
                        for(const call of calls){
                            const functionName = call.name
                            const functionArgs = call.args
                            const tool = tools.find((t) => t.name === functionName)
                            if(tool){
                                const result = (await callTool(tool.name, functionArgs)).filter((r) => {
                                    return r.type === 'text'
                                })
                                if(result.length === 0){
                                    parts.push({
                                        functionResponse: {
                                            name: call.name,
                                            response: 'No response from tool.'
                                        }
                                    })
                                }
                                // Store the encoded tool call history for later use
                                if(arg.rememberToolUsage){
                                    callCodes.push(await encodeToolCall({
                                        call: {
                                            id: call.id,
                                            name: call.name,
                                            arg: call.args
                                        },
                                        response: result
                                    }))
                                }
                                for(let i=0;i<result.length;i++){
                                    let response:any = result[i].text
                                    try {
                                        //try json parse
                                        response = {
                                            data: JSON.parse(response)
                                        }
                                    } catch (error) {
                                        response = {
                                            data: response
                                        }
                                    }
                                    parts.push({
                                        functionResponse: {
                                            name: call.name,
                                            response
                                        }
                                    })
                                }
                            }
                            else{
                                parts.push({
                                    functionResponse: {
                                        name: call.name,
                                        response: `Tool ${call.name} not found.`
                                    }
                                })
                            }
                        }
                        // Add the user response part to the request content (function responses)
                        chat.push({
                            role: 'function',
                            parts: parts
                        })

                        body.contents = chat
                        
                        headers['Content-Type'] = 'application/json'

                        let resRec
                        let attempt = 0
                        let errorFlag = true
                        
                        do {
                            attempt++
                            resRec = await fetchNative(url, {
                                headers: headers,
                                body: JSON.stringify(body),
                                method: 'POST',
                                chatId: arg.chatId,
                                signal: arg.abortSignal,
                            })
                        
                            if(resRec.status == 200){
                                addFetchLog({
                                    body: body,
                                    response: "Streaming",
                                    success: true,
                                    url: url,
                                })

                                errorFlag = false
                                break
                            }
                        } while (attempt <= db.requestRetrys) // Retry up to db.requestRetrys times

                        if(errorFlag){
                            alertError(`Failed to fetch model response after tool execution`)
                            return controller.close()
                        }

                        const transtream = getTranStream()
                        resRec.body.pipeTo(transtream.writable)

                        reader = transtream.readable.getReader()

                        if(db.simplifiedToolUse) {
                            prefix += callCodes.join('\n\n')
                        }
                        else {
                            prefix += (thoughts + lastThought ? `<Thoughts>\n\n${thoughts + lastThought}\n\n</Thoughts>\n\n` : '')
                                + (content ? content + '\n\n' : '')
                                + callCodes.join('\n\n')
                        }

                        controller.enqueue({"0": prefix})
                        
                        continue
                    }
                    return controller.close()
                }
                
                lastValue = value

                if(db.streamGeminiThoughts) {
                    controller.enqueue({
                        "0": (prefix ? prefix + '\n\n' : '')
                            + (thoughts ? `<Thoughts>\n\n${thoughts}\n\n</Thoughts>\n\n` : '')
                            + (lastThought ? lastThought + '\n\n' : '') 
                            + content
                    })
                }
                else {
                    controller.enqueue({
                        "0": (prefix ? prefix + '\n\n' : '')
                            + (thoughts + lastThought ? `<Thoughts>\n\n${thoughts + lastThought}\n\n</Thoughts>\n\n` : '')
                            + content
                    })
                }
            }
        }
    })
}

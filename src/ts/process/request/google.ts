import { fetchNative, globalFetch, textifyReadableStream } from "src/ts/globalApi.svelte"
import { LLMFlags, LLMFormat } from "src/ts/model/modellist"
import { getDatabase, setDatabase } from "src/ts/storage/database.svelte"
import { replaceAsync, simplifySchema, sleep } from "src/ts/util"
import { v4 } from "uuid"
import { setInlayAsset, writeInlayImage } from "../files/inlays"
import type { OpenAIChat } from "../index.svelte"
import { extractJSON, getGeneralJSONSchema } from "../templates/jsonSchema"
import { applyParameters, type Parameter, type RequestDataArgumentExtended, type requestDataResponse, type StreamResponseChunk } from "./request"
import { callTool, decodeToolCall, encodeToolCall } from "../mcp/mcp"

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
    "inlineData"?: {
        "mimeType": string,
        "data": string
    },
    functionCall?: GeminiFunctionCall
    functionResponse?: GeminiFunctionResponse
}

interface GeminiChat {
    role: "USER"|"MODEL"
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
            chat.role === 'user' ? 'USER' :
            chat.role === 'assistant' ? 'MODEL' :
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
                role: chat.role === 'user' ? 'USER' : 'MODEL',
                parts: geminiParts,
            });        }
        else if(chat.role === 'system'){
            if(prevChat?.role === 'USER'){
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
                                role: 'MODEL',
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
                                role: 'USER',
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

        if (currentChat.role === prevChat.role && !currentChat.parts[0].functionResponse && !prevChat.parts[0].functionResponse ) {
            // If the same role is consecutive, merge the parts arrays and remove the current chat
            // Ignore function responses for merging (api will malfunction if merged)

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
            'frequency_penalty': "frequencyPenalty"
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

    if(systemPrompt === ''){
        delete body.systemInstruction
    }

    if(arg.modelInfo.flags.includes(LLMFlags.hasAudioOutput)){
        body.generation_config.responseModalities = [
            'TEXT', 'AUDIO'
        ]
        arg.useStreaming = false
    }
    if(arg.imageResponse){
        body.generation_config.responseModalities = [
            'TEXT', 'IMAGE'
        ]
        arg.useStreaming = false
    }    let headers:{[key:string]:string} = {}

    const PROJECT_ID = db.google.projectId
    const REGION = db.vertexRegion
    console.log(arg.modelInfo);

    async function generateToken(email:string,key:string){
        // Input validation
        if (!email.includes("gserviceaccount.com")) {
            throw new Error("Invalid Vertex project id. Must include gserviceaccount.com");
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
    
    if(arg.customURL){
        const u = new URL(arg.customURL)
        u.searchParams.set('key', db.proxyKey)
        url = u.toString()
    }
    else if(arg.modelInfo.format === LLMFormat.VertexAIGemini){
        // VertexAI global endpoint with streaming or non-streaming
        const endpoint = arg.useStreaming ? 'streamGenerateContent' : 'generateContent'
        url = REGION === 'global' ?
            `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${arg.modelInfo.internalID}:${endpoint}` :
            `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${arg.modelInfo.internalID}:${endpoint}`
        
        // VertexAI api will return error if functionDeclarations is empty
        // moved out of if statement as LLMFormat.GoogleCloud requests also need this removed
        //if(body.tools?.functionDeclarations?.length === 0){
        //    body.tools = undefined
        //}
    }
    else if(arg.modelInfo.format === LLMFormat.GoogleCloud && arg.useStreaming){
        url = `https://generativelanguage.googleapis.com/v1beta/models/${arg.modelInfo.internalID}:streamGenerateContent?key=${db.google.accessToken}`
    }
    else{
        url = `https://generativelanguage.googleapis.com/v1beta/models/${arg.modelInfo.internalID}:generateContent?key=${db.google.accessToken}`
    }

    // GoogleAI api will also return an error if functionDeclarations is empty
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
    const processTextResponse = (data: string[]) => {
        if(arg.extractJson && (db.jsonSchemaEnabled || arg.schema)){
            for(let i=0;i<rDatas.length;i++){
                const extracted = extractJSON(data[i], arg.extractJson)
                data[i] = extracted
            }
        }
        
        let ret = data[data.length-1]
        if(data.length > 1){
            if(arg.modelInfo.flags.includes(LLMFlags.geminiThinking)){
                const thought = data.splice(data.length-2, 1)[0]
                ret = `<Thoughts>${thought}</Thoughts>\n\n${data.join('\n\n')}`
            }
            else{
                ret = data.join('\n\n')
            }
        }

        return ret
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
            signal: arg.abortSignal
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

        let fullResult:string = ''

        const stream = new TransformStream<Uint8Array, StreamResponseChunk>(  {
            async transform(chunk, control) {
                fullResult += new TextDecoder().decode(chunk)
                try {
                    let reformatted = fullResult
                    if(reformatted.endsWith(',')){
                        reformatted = fullResult.slice(0, -1) + ']'
                    }
                    if(!reformatted.endsWith(']')){
                        reformatted = fullResult + ']'
                    }

                    const data = JSON.parse(reformatted)

                    let rDatas:string[] = ['']
                    for(const d of data){
                        const parts = d.candidates[0].content?.parts
                        for(let i=0;i<parts.length;i++){
                            const part = parts[i]
                            if(i > 0){
                                rDatas.push('')
                            }
                        }
                    }

                    const result = processTextResponse(rDatas)

                    console.log(result)

                    control.enqueue({
                        '0': result,
                    })
                } catch (error) {
                    console.log(error)
                }
                
            }
        },)

        return {
            type: 'streaming',
            result: f.body.pipeThrough(stream)
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

    // array to store response texts
    let rDatas:string[] = [] 
    const processDataItem = async (data:any):Promise<GeminiFunctionCall[]> => {
        const parts = data?.candidates?.[0]?.content?.parts
        const calls:GeminiFunctionCall[] = []

        if(parts){
         
            for(let i=0;i<parts.length;i++){
                const part = parts[i]

                if(part.text){
                    rDatas.push(part.text)
                }

                if(part.functionCall){
                    calls.push(part.functionCall as GeminiFunctionCall)
                }

                if(part.inlineData){
                    const imgHTML = new Image()
                    const id = crypto.randomUUID()

                    if(part.inlineData.mimeType.startsWith('image/')){

                        imgHTML.src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                        await writeInlayImage(imgHTML, {
                            id: id
                        })
                        rDatas[rDatas.length-1] += (`\n{{inlayeddata::${id}}}\n`)
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
        
        // make sure rDatas has at least one element
        if(rDatas.length === 0){
            rDatas.push('')
        }

        return calls
    }

    // traverse responded data if it contains multipart contents
    let calls:GeminiFunctionCall[] = []
    if (typeof (res.data)[Symbol.iterator] === 'function') {
        for(const data of res.data){
            const c = await processDataItem(data)
            calls = calls.concat(c)
        }
    } else {
        const c = await processDataItem(res.data)
        calls = calls.concat(c)
    }

    // If there are function calls, handle calls and send next request
    if(calls.length > 0){
        const chat = body.contents as GeminiChat[]

        // Add the model response part to the request content (text response and function calls)
        chat.push({
            role: 'MODEL',
            parts: rDatas.map((text) => {
                return {text: text} as GeminiPart
            }).concat(
                calls.map((call) => {
                return {
                    functionCall: {
                        id: call.id,
                        name: call.name,
                        args: call.args
                    }
                } as GeminiPart
            }))
        })
        
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
                            //id: call.id,
                            name: call.name,
                            response: 'No response from tool.'
                        }
                    })
                }
                
                // Store the encoded tool call history for later use
                callCodes.push(await encodeToolCall({
                    call: {
                        id: call.id,
                        name: call.name,
                        arg: call.args
                    },
                    response: result
                }))
                
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
                            //id: call.id,
                            name: call.name,
                            response
                        }
                    })
                }
            }
            else{
                parts.push({
                    functionResponse: {
                        //id: call.id,
                        name: call.name,
                        response: `Tool ${call.name} not found.`
                    }
                })
            }
        }
        
        // Add the user response part to the request content (function responses)
        chat.push({
            role: 'USER',
            parts: parts
        })

        body.contents = chat
        // Send the next request recursively 
        const resRec = await requestGoogle(url, body, headers, arg)
        
        const result = processTextResponse(rDatas) + '\n\n' + callCodes.join('\n\n')

        // If the next request fails, only the responses so far are returned
        if(resRec.type === 'fail'){
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
    console.log(result)
    return {
        type: 'success',
        result: result
    }
}

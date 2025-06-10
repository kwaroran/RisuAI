import { fetchNative, globalFetch, textifyReadableStream } from "src/ts/globalApi.svelte"
import { LLMFlags, LLMFormat } from "src/ts/model/modellist"
import { getDatabase, setDatabase } from "src/ts/storage/database.svelte"
import { simplifySchema, sleep } from "src/ts/util"
import { v4 } from "uuid"
import { setInlayAsset, writeInlayImage } from "../files/inlays"
import type { OpenAIChat } from "../index.svelte"
import { extractJSON, getGeneralJSONSchema } from "../templates/jsonSchema"
import { applyParameters, type Parameter, type RequestDataArgumentExtended, type requestDataResponse, type StreamResponseChunk } from "./request"
import { callTool } from "../mcp/mcp"

type GeminiFunctionCall = {
    id: string;
    name: string;
    args: any
}

type GeminiFunctionResponse = {
    id: string;
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
            });
        } else if (prevChat?.role === qRole) {
            if (reformatedChat[reformatedChat.length-1].parts[
                reformatedChat[reformatedChat.length-1].parts.length-1
            ].inlineData) {
                reformatedChat[reformatedChat.length-1].parts.push({
                    text: chat.content,
                })
            } else {
                reformatedChat[reformatedChat.length-1].parts[
                    reformatedChat[reformatedChat.length-1].parts.length-1
                ].text += '\n' + chat.content
            }
            continue
        }
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
    }

    let headers:{[key:string]:string} = {}

    const PROJECT_ID=db.google.projectId
    const REGION="us-central1"
    console.log(arg.modelInfo)


    async function generateToken(email:string,key:string){
        key = key.replace('-----BEGIN PRIVATE KEY-----','').replace('-----END PRIVATE KEY-----','').replace(/\n/g, '').replace(/\r/g, '').trim()
      
        const time = Math.floor(Date.now() / 1000);
    
        const header = Buffer.from(JSON.stringify({
            alg: "RS256",
            typ: "JWT",
        }))

        const set = Buffer.from(JSON.stringify({
            iss: email,
            iat: time,
            exp: time + 3600,
            scope: "https://www.googleapis.com/auth/cloud-platform",
            aud: "https://oauth2.googleapis.com/token",
        })).toString('base64url');
    
        const cryptokey = await crypto.subtle.importKey(
            "pkcs8",
            this.str2ab(key),
            {
                name: "RSASSA-PKCS1-v1_5",
                hash: { name: "SHA-256" },
            },
            false,
            ["sign"]
        );
    
        const signature = Buffer.from(await crypto.subtle.sign(
            "RSASSA-PKCS1-v1_5",
            cryptokey,
            Buffer.from(`${header}.${set}`)
        )).toString('base64url');
      
        const jwt = `${header}.${set}.${signature}`;

        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        const data = await response.json();

        const token = data.access_token;

        const db2 = getDatabase()
        db2.vertexAccessToken = token
        db2.vertexAccessTokenExpires = Date.now() + 3500 * 1000
        setDatabase(db2)
        return token;
    }

    if(arg.modelInfo.format === LLMFormat.VertexAIGemini){
        if(db.vertexAccessTokenExpires < Date.now()){
            headers['Authorization'] = "Bearer " + generateToken(db.vertexClientEmail, db.vertexPrivateKey)
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
        url =`https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/${arg.modelInfo.internalID}:streamGenerateContent`
    }
    else if(arg.modelInfo.format === LLMFormat.GoogleCloud && arg.useStreaming){
        url = `https://generativelanguage.googleapis.com/v1beta/models/${arg.modelInfo.internalID}:streamGenerateContent?key=${db.google.accessToken}`
    }
    else{
        url = `https://generativelanguage.googleapis.com/v1beta/models/${arg.modelInfo.internalID}:generateContent?key=${db.google.accessToken}`
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

    if(arg.modelInfo.format === LLMFormat.GoogleCloud && arg.useStreaming){
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

                    if(arg.extractJson && (db.jsonSchemaEnabled || arg.schema)){
                        for(let i=0;i<rDatas.length;i++){
                            const extracted = extractJSON(rDatas[i], arg.extractJson)
                            rDatas[i] = extracted
                        }
                    }

                    if(rDatas.length > 1){
                        if(arg.modelInfo.flags.includes(LLMFlags.geminiThinking)){
                            const thought = rDatas.splice(rDatas.length-2, 1)[0]
                            rDatas[rDatas.length-1] = `<Thoughts>${thought}</Thoughts>\n\n${rDatas.join('\n\n')}`
                        }
                        else{
                            rDatas[rDatas.length-1] = rDatas.join('\n\n')
                        }
                    }

                    console.log(rDatas[rDatas.length-1])

                    control.enqueue({
                        '0': rDatas[rDatas.length-1],
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

    let rDatas:string[] = ['']
    const processDataItem = async (data:any):Promise<GeminiFunctionCall[]> => {
        const parts = data?.candidates?.[0]?.content?.parts
        const calls:GeminiFunctionCall[] = []

        if(parts){
         
            for(let i=0;i<parts.length;i++){
                const part = parts[i]
                if(i > 0){
                    rDatas.push('')
                }

                rDatas[rDatas.length-1] += part.text ?? ''

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

    if(calls.length > 0){
        const chat = body.contents as GeminiChat[]
        chat.push({
            role: 'MODEL',
            parts: calls.map((call) => {
                return {
                    functionCall: {
                        id: call.id,
                        name: call.name,
                        args: call.args
                    }
                }
            })
        })

        const parts: GeminiPart[] = []
        const tools = arg?.tools ?? []
        
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
                            id: call.id,
                            name: call.name,
                            response: 'No response from tool.'
                        }
                    })
                }
                else{
                    if(arg.rememberToolUsage){
                        arg.additionalOutput += `<tool_call>${JSON.stringify({
                            call: {
                                id: call.id,
                                name: call.name,
                                arg: call.args
                            },
                            response: result
                        })}</tool_call>`
                    }
                }
                for(let i=0;i<result.length;i++){
                    let response:any = result[i].text
                    try {
                        //try json parse
                        response = JSON.parse(response)
                    } catch (error) {
                        response = {
                            text: response
                        }
                    }
                    parts.push({
                        functionResponse: {
                            id: call.id,
                            name: call.name,
                            response
                        }
                    })
                }
            }
            else{
                parts.push({
                    functionResponse: {
                        id: call.id,
                        name: call.name,
                        response: `Tool ${call.name} not found.`
                    }
                })
            }
            
            chat.push({
                role: 'USER',
                parts: parts
            })

            body.contents = chat

            return requestGoogle(url, body, headers, arg)



        }
    }

    if(arg.extractJson && (db.jsonSchemaEnabled || arg.schema)){
        for(let i=0;i<rDatas.length;i++){
            const extracted = extractJSON(rDatas[i], arg.extractJson)
            rDatas[i] = extracted
        }
    }
    
    if(rDatas.length > 1 && arg.modelInfo.flags.includes(LLMFlags.geminiThinking)){
        const thought = rDatas.splice(rDatas.length-2, 1)[0]
        rDatas[rDatas.length-1] = `<Thoughts>${thought}</Thoughts>\n\n${rDatas.join('\n\n')}`
    }
    else if(rDatas.length > 1){
        rDatas[rDatas.length-1] = rDatas.join('\n\n')
    }

    return {
        type: 'success',
        result: rDatas[rDatas.length-1]
    }
}

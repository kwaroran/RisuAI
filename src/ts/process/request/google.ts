import { language } from "src/lang"
import { applyParameters, setObjectValue, type OpenAIChatExtra, type OpenAIContents, type Parameter, type RequestDataArgumentExtended, type requestDataResponse, type StreamResponseChunk } from "./request"
import { getDatabase, setDatabase } from "src/ts/storage/database.svelte"
import { LLMFlags, LLMFormat } from "src/ts/model/modellist"
import { strongBan, tokenizeNum } from "src/ts/tokenizer"
import { getFreeOpenRouterModel } from "src/ts/model/openrouter"
import { addFetchLog, fetchNative, globalFetch, isNodeServer, isTauri, textifyReadableStream } from "src/ts/globalApi.svelte"
import type { MultiModal, OpenAIChat, OpenAIChatFull } from "../index.svelte"
import { extractJSON, getGeneralJSONSchema, getOpenAIJSONSchema } from "../templates/jsonSchema"
import { applyChatTemplate } from "../templates/chatTemplate"
import { setInlayAsset, supportsInlayImage, writeInlayImage } from "../files/inlays"
import { Capacitor } from "@capacitor/core"
import { Sha256 } from "@aws-crypto/sha256-js";
import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";
import { v4 } from "uuid"
import { sleep } from "src/ts/util"
import { registerClaudeObserver } from "src/ts/observer.svelte"


export async function requestGoogleCloudVertex(arg:RequestDataArgumentExtended):Promise<requestDataResponse> {

    const formated = arg.formated
    const db = getDatabase()
    const maxTokens = arg.maxTokens

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
        try {
            const OAIMessages:OpenAIChat[] = body.contents.map((v) => {
                return {
                    role: v.role === 'USER' ? 'user' : 'assistant',
                    content: v.parts.map((v) => {
                        return v.text ?? ''
                    }).join('\n')
                }
            })
            if(body?.systemInstruction?.parts?.[0]?.text){
                OAIMessages.unshift({
                    role: 'system',
                    content: body.systemInstruction.parts[0].text
                })
            }
            await sleep(2000)
            const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
                body: JSON.stringify({
                    model: arg.modelInfo.internalID,
                    messages: OAIMessages,
                    max_tokens: maxTokens,
                    temperature: body.generation_config?.temperature,
                    top_p: body.generation_config?.topP,
                    presence_penalty: body.generation_config?.presencePenalty,
                    frequency_penalty: body.generation_config?.frequencyPenalty,
                }),
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${db.google.accessToken}`
                },
                signal: arg.abortSignal
            })

            if(!res.ok){
                return {
                    type: 'fail',
                    result: originalError,
                    failByServerError: true
                }
            }

            if(arg?.abortSignal?.aborted){
                return {
                    type: 'fail',
                    result: originalError
                }
            }

            const d = await res.json()

            if(d?.choices?.[0]?.message?.content){
                return {
                    type: 'success',
                    result: d.choices[0].message.content
                }
            }
            else{
                return {
                    type: 'fail',
                    result: originalError,
                    failByServerError: true
                }
            }
        } catch (error) {
            return {
                type: 'fail',
                result: originalError,
                failByServerError: true
            }
        }
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

                            // Due to error, do not use this
                            // rDatas[rDatas.length-1] += part.text ?? ''
                            // if(part.inlineData){
                            //     const imgHTML = new Image()
                            //     const id = crypto.randomUUID()
                            //     imgHTML.src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                            //     writeInlayImage(imgHTML)
                            //     rDatas[rDatas.length-1] += (`\n{{inlayeddata::${id}}}\n`)
                            // }
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
    const processDataItem = async (data:any) => {
        const parts = data?.candidates?.[0]?.content?.parts
        if(parts){
         
            for(let i=0;i<parts.length;i++){
                const part = parts[i]
                if(i > 0){
                    rDatas.push('')
                }

                rDatas[rDatas.length-1] += part.text ?? ''

                if(part.function_call){
                    //TODO: handle tool
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
        
        if(data?.errors){
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
            await processDataItem(data)
        }
    } else {
        await processDataItem(res.data)
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

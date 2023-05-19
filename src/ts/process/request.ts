import { get } from "svelte/store";
import type { OpenAIChat } from ".";
import { DataBase, setDatabase, type character } from "../database";
import { pluginProcess } from "./plugins";
import { language } from "../../lang";
import { stringlizeChat } from "./stringlize";
import { globalFetch } from "../globalApi";

interface requestDataArgument{
    formated: OpenAIChat[]
    bias: {[key:number]:number}
    currentChar?: character
    temperature?: number
    maxTokens?:number
    PresensePenalty?: number
    frequencyPenalty?: number,
    useStreaming?:boolean
}

type requestDataResponse = {
    type: 'success'|'fail'
    result: string
}|{
    type: "streaming",
    result: ReadableStream<string>
}

export async function requestChatData(arg:requestDataArgument, model:'model'|'submodel'):Promise<requestDataResponse> {
    const db = get(DataBase)
    let trys = 0
    while(true){
        const da = await requestChatDataMain(arg, model)
        if(da.type === 'success' || da.type === 'streaming'){
            return da
        }
        trys += 1
        if(trys > db.requestRetrys){
            return da
        }
    }
}

export async function requestChatDataMain(arg:requestDataArgument, model:'model'|'submodel'):Promise<requestDataResponse> {
    const db = get(DataBase)
    let result = ''
    let formated = arg.formated
    let maxTokens = db.maxResponse
    let bias = arg.bias
    let currentChar = arg.currentChar
    const replacer = model === 'model' ? db.forceReplaceUrl : db.forceReplaceUrl2
    const aiModel = model === 'model' ? db.aiModel : db.subModel

    switch(aiModel){
        case 'gpt35':
        case 'gpt4':{
            const body = ({
                model: aiModel ===  'gpt35' ? 'gpt-3.5-turbo' : 'gpt-4',
                messages: formated,
                temperature: arg.temperature ?? (db.temperature / 100),
                max_tokens: arg.maxTokens ?? maxTokens,
                presence_penalty: arg.PresensePenalty ?? (db.PresensePenalty / 100),
                frequency_penalty: arg.frequencyPenalty ?? (db.frequencyPenalty / 100),
                logit_bias: bias,
                stream: false
            })

            let replacerURL = replacer === '' ? 'https://api.openai.com/v1/chat/completions' : replacer

            if(replacerURL.endsWith('v1')){
                replacerURL += '/chat/completions'
            }
            if(replacerURL.endsWith('v1/')){
                replacerURL += 'chat/completions'
            }

            if(db.useStreaming && arg.useStreaming){
                body.stream = true
                const da = await fetch(replacerURL, {
                    body: JSON.stringify(body),
                    method: "POST",
                    headers: {
                        "Authorization": "Bearer " + db.openAIKey,
                        "Content-Type": "application/json"
                    },
                })

                if(da.status !== 200){
                    return {
                        type: "fail",
                        result: await da.text()
                    }
                }

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
                headers: {
                    "Authorization": "Bearer " + db.openAIKey
                },
            })

            const dat = res.data as any
            if(res.ok){
                try {
                    const msg:OpenAIChat = (dat.choices[0].message)
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
        case "textgen_webui":{
            let DURL = db.textgenWebUIURL
            let bodyTemplate:any
            const proompt = stringlizeChat(formated, currentChar?.name ?? '')
            const isNewAPI = DURL.includes('api')
            const stopStrings = [`\nUser:`,`\nuser:`,`\n${db.username}:`]

            if(isNewAPI){
                bodyTemplate = {
                    'max_new_tokens': 80,
                    'do_sample': true,
                    'temperature': (db.temperature / 100),
                    'top_p': 0.9,
                    'typical_p': 1,
                    'repetition_penalty': db.PresensePenalty < 85 ? 0.85 : (db.PresensePenalty / 100),
                    'encoder_repetition_penalty': 1,
                    'top_k': 100,
                    'min_length': 0,
                    'no_repeat_ngram_size': 0,
                    'num_beams': 1,
                    'penalty_alpha': 0,
                    'length_penalty': 1,
                    'early_stopping': false,
                    'truncation_length': maxTokens,
                    'ban_eos_token': false,
                    'stopping_strings': stopStrings,
                    'seed': -1,
                    add_bos_token: true,
                    prompt: proompt
                }
            }
            else{
                const payload = [
                    proompt,
                    {
                        'max_new_tokens': 80,
                        'do_sample': true,
                        'temperature': (db.temperature / 100),
                        'top_p': 0.9,
                        'typical_p': 1,
                        'repetition_penalty': db.PresensePenalty < 85 ? 0.85 : (db.PresensePenalty / 100),
                        'encoder_repetition_penalty': 1,
                        'top_k': 100,
                        'min_length': 0,
                        'no_repeat_ngram_size': 0,
                        'num_beams': 1,
                        'penalty_alpha': 0,
                        'length_penalty': 1,
                        'early_stopping': false,
                        'truncation_length': maxTokens,
                        'ban_eos_token': false,
                        'custom_stopping_strings': stopStrings,
                        'seed': -1,
                        add_bos_token: true,
                    }
                ];
    
                bodyTemplate = { "data": [JSON.stringify(payload)] };
    
            }
            const res = await globalFetch(DURL, {
                body: bodyTemplate,
                headers: {}
            })
            
            const dat = res.data as any
            console.log(DURL)
            console.log(res.data)
            if(res.ok){
                try {
                    let result:string = isNewAPI ? dat.results[0].text : dat.data[0].substring(proompt.length)

                    for(const stopStr of stopStrings){
                        if(result.endsWith(stopStr)){
                            result.substring(0,result.length - stopStr.length)
                        }
                    }

                    return {
                        type: 'success',
                        result: result
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
        default:{            
            return {
                type: 'fail',
                result: (language.errors.unknownModel)
            }
        }
    }
}
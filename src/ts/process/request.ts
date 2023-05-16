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
    frequencyPenalty?: number
}

type requestDataResponse = {
    type: 'success'|'fail'
    result: string
}|{
    type: "streaming",
    result: ReadableStreamDefaultReader<Uint8Array>
}

export async function requestChatData(arg:requestDataArgument, model:'model'|'submodel'):Promise<requestDataResponse> {
    const db = get(DataBase)
    let trys = 0
    while(true){
        const da = await requestChatDataMain(arg, model)
        if(da.type === 'success'){
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
            })

            let replacerURL = replacer === '' ? 'https://api.openai.com/v1/chat/completions' : replacer

            if(replacerURL.endsWith('v1')){
                replacerURL += '/chat/completions'
            }
            if(replacerURL.endsWith('v1/')){
                replacerURL += 'chat/completions'
            }

            if(db.useStreaming){
                const da = await fetch(replacerURL, {
                    body: JSON.stringify(body),
                    headers: {
                        "Authorization": "Bearer " + db.openAIKey
                    },
                })

                const reader = da.body.getReader()

                return {
                    type: 'streaming',
                    result: reader
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
        default:{            
            return {
                type: 'fail',
                result: (language.errors.unknownModel)
            }
        }
    }
}
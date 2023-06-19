import { get } from "svelte/store";
import type { OpenAIChat, OpenAIChatFull } from ".";
import { DataBase, setDatabase, type character } from "../storage/database";
import { pluginProcess } from "./plugins";
import { language } from "../../lang";
import { stringlizeChat, unstringlizeChat } from "./stringlize";
import { globalFetch, isTauri } from "../storage/globalApi";
import { sleep } from "../util";

interface requestDataArgument{
    formated: OpenAIChat[]
    bias: {[key:number]:number}
    currentChar?: character
    temperature?: number
    maxTokens?:number
    PresensePenalty?: number
    frequencyPenalty?: number,
    useStreaming?:boolean
    isGroupChat?:boolean
    useEmotion?:boolean
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
    result: ReadableStream<string>,
    noRetry?: boolean,
    special?: {
        emotion?: string
    }
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

export async function requestChatData(arg:requestDataArgument, model:'model'|'submodel', abortSignal:AbortSignal=null):Promise<requestDataResponse> {
    const db = get(DataBase)
    let trys = 0
    while(true){
        const da = await requestChatDataMain(arg, model, abortSignal)
        if(da.type === 'success' || da.type === 'streaming' || da.noRetry){
            return da
        }
        
        trys += 1
        if(trys > db.requestRetrys){
            return da
        }
    }
}




export async function requestChatDataMain(arg:requestDataArgument, model:'model'|'submodel', abortSignal:AbortSignal=null):Promise<requestDataResponse> {
    const db = get(DataBase)
    let result = ''
    let formated = arg.formated
    let maxTokens = arg.maxTokens ??db.maxResponse
    let temperature = arg.temperature ?? (db.temperature / 100)
    let bias = arg.bias
    let currentChar = arg.currentChar
    const replacer = model === 'model' ? db.forceReplaceUrl : db.forceReplaceUrl2
    const aiModel = model === 'model' ? db.aiModel : db.subModel

    switch(aiModel){
        case 'gpt35':
        case 'gpt35_0613':
        case 'gpt35_16k':
        case 'gpt35_16k_0613':
        case 'gpt4':
        case 'gpt4_32k':
        case 'gpt4_0613':
        case 'gpt4_32k_0613':{

            for(let i=0;i<formated.length;i++){
                if(formated[i].role !== 'function'){
                    if(arg.isGroupChat && formated[i].name){
                        formated[i].content = formated[i].name + ": " + formated[i].content
                    }
                    formated[i].name = undefined
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
            const body = ({
                model: aiModel ===  'gpt35' ? 'gpt-3.5-turbo'
                    : aiModel ===  'gpt35_0613' ? 'gpt-3.5-turbo-0613'
                    : aiModel ===  'gpt35_16k' ? 'gpt-3.5-turbo-16k'
                    : aiModel ===  'gpt35_16k_0613' ? 'gpt-3.5-turbo-16k-0613'
                    : aiModel === 'gpt4' ? 'gpt-4'
                    : aiModel === 'gpt4_32k' ? 'gpt-4-32k'
                    : aiModel === "gpt4_0613" ? 'gpt-4-0613'
                    : aiModel === "gpt4_32k_0613" ? 'gpt-4-32k-0613' : '',
                messages: formated,
                temperature: temperature,
                max_tokens: maxTokens,
                presence_penalty: arg.PresensePenalty ?? (db.PresensePenalty / 100),
                frequency_penalty: arg.frequencyPenalty ?? (db.frequencyPenalty / 100),
                logit_bias: bias,
                stream: false
            })

            let replacerURL = replacer === '' ? 'https://api.openai.com/v1/chat/completions' : replacer

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

            if(db.useStreaming && arg.useStreaming){
                body.stream = true
                const da = await fetch(replacerURL, {
                    body: JSON.stringify(body),
                    method: "POST",
                    headers: {
                        "Authorization": "Bearer " + db.openAIKey,
                        "Content-Type": "application/json"
                    },
                    signal: abortSignal
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
                abortSignal
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

            break
        }
        case 'novelai':{
            if(!isTauri){
                return{
                    type: 'fail',
                    result: "NovelAI doesn't work in web version."
                }
            }
            const proompt = stringlizeChat(formated, currentChar?.name ?? '')
            const params = {
                "input": proompt,
                "model":db.novelai.model,
                "parameters":{
                    "use_string":true,
                    "temperature":1.7,
                    "max_length":90,
                    "min_length":1,
                    "tail_free_sampling":0.6602,
                    "repetition_penalty":1.0565,
                    "repetition_penalty_range":340,
                    "repetition_penalty_frequency":0,
                    "repetition_penalty_presence":0,
                    "use_cache":false,
                    "return_full_text":false,
                    "prefix":"vanilla",
                "order":[3,0]}
            }

            const da = await globalFetch("https://api.novelai.net/ai/generate", {
                body: params,
                headers: {
                    "Authorization": "Bearer " + db.novelai.token
                },
                abortSignal
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

        case "textgen_webui":{
            let DURL = db.textgenWebUIURL
            let bodyTemplate:any
            const proompt = stringlizeChat(formated, currentChar?.name ?? '')
            const isNewAPI = DURL.includes('api')
            const stopStrings = [`\nUser:`,`\nuser:`,`\n${db.username}:`]

            if(isNewAPI){
                bodyTemplate = {
                    'max_new_tokens': db.maxResponse,
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
                headers: {},
                abortSignal
            })
            
            const dat = res.data as any
            if(res.ok){
                try {
                    let result:string = isNewAPI ? dat.results[0].text : dat.data[0].substring(proompt.length)

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
                abortSignal
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
        case "kobold":{
            const proompt = stringlizeChat(formated, currentChar?.name ?? '')
            const url = new URL(db.koboldURL)
            if(url.pathname.length < 3){
                url.pathname = 'api/v1/generate'
            }
            
            const da = await globalFetch(url.toString(), {
                method: "POST",
                body: {
                    "prompt": proompt,
                    "temperature": (db.temperature / 100),
                    "top_p": 0.9
                },
                headers: {
                    "content-type": "application/json",
                },
                abortSignal
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
        case "novellist":{
            const auth_key = db.novellistAPI;
            const api_server_url = 'https://api.tringpt.com/';

            const headers = {
                'Authorization': `Bearer ${auth_key}`,
                'Content-Type': 'application/json'
            };

            const send_body = {
                text: stringlizeChat(formated, currentChar?.name ?? ''),
                length: maxTokens,
                temperature: temperature,
                top_p: 0.7,
                tailfree: 1.0,
                rep_pen: arg.frequencyPenalty ?? (db.frequencyPenalty / 100),
            };

            const response = await globalFetch(api_server_url + '/api', {
                method: 'POST',
                headers: headers,
                body: send_body,
            });

            if(!response.ok){
                return {
                    type: 'fail',
                    result: response.data
                }
            }

            const result = response.data.data[0];

            return {
                'type': 'success',
                'result': unstringlizeChat(result, formated, currentChar?.name ?? '')
            }
        }
        default:{     
            if(aiModel.startsWith('claude')){
                for(let i=0;i<formated.length;i++){
                    if(arg.isGroupChat && formated[i].name){
                        formated[i].content = formated[i].name + ": " + formated[i].content
                    }
                    formated[i].name = undefined
                }



                let requestPrompt = formated.map((v) => {
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
                    return prefix + v.content
                }).join('') + '\n\nAssistant: '

                const da = await globalFetch('https://api.anthropic.com/v1/complete', {
                    method: "POST",
                    body: {
                        prompt : "\n\nHuman: " + requestPrompt,
                        model: aiModel,
                        max_tokens_to_sample: maxTokens,
                        stop_sequences: ["\n\nHuman:", "\n\nSystem:", "\n\nAssistant:"],
                        temperature: temperature,
                    },
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": db.claudeAPIKey
                    }
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
                const proompt = stringlizeChat(formated, currentChar?.name ?? '')

                const realModel = aiModel.split(":::")[1]

                const argument = {
                    "prompt": proompt,
                    "params": {
                        "n": 1,
                        "frmtadsnsp": false,
                        "frmtrmblln": false,
                        "frmtrmspch": false,
                        "frmttriminc": false,
                        "max_context_length": db.maxContext + 100,
                        "max_length": db.maxResponse,
                        "rep_pen": 3,
                        "rep_pen_range": 0,
                        "rep_pen_slope": 10,
                        "singleline": false,
                        "temperature": db.temperature / 100,
                        "tfs": 1,
                        "top_a": 1,
                        "top_k": 100,
                        "top_p": 1,
                        "typical": 1,
                        "sampler_order": [
                            0
                        ]
                    },
                    "trusted_workers": false,
                    "slow_workers": true,
                    "worker_blacklist": false,
                    "dry_run": false,
                    "models": [realModel, realModel.trim(), ' ' + realModel, realModel + ' ']
                }

                const da = await fetch("https://stablehorde.net/api/v2/generate/text/async", {
                    body: JSON.stringify(argument),
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        "apikey": db.hordeConfig.apiKey
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
            return {
                type: 'fail',
                result: (language.errors.unknownModel)
            }
        }
    }
}
import { get } from "svelte/store"
import { DataBase, type character } from "../storage/database"
import { requestChatData } from "./request"
import { alertError } from "../alert"
import { globalFetch, readImage } from "../storage/globalApi"
import { CharEmotion } from "../stores"
import type { OpenAIChat } from "."
import { processZip } from "./processzip"
import { convertToBase64 } from "./uinttobase64" 
import type { List } from "lodash"
import { generateRandomSeed } from "./generateSeed"
export async function stableDiff(currentChar:character,prompt:string){
    const mainPrompt = "assistant is a chat analyzer.\nuser will input a data of situation with key and values before chat, and a chat of a user and character.\nView the status of the chat and change the data.\nif data's key starts with $, it must change it every time.\nif data value is none, it must change it."
    let db = get(DataBase)

    if(db.sdProvider === ''){
        alertError("Stable diffusion is not set in settings.")
        return false
    }

    let proompt = 'Data:'

    let currentSd:[string,string][] = []

    const sdData = currentChar.chats[currentChar.chatPage].sdData
    if(sdData){
        const das = sdData.split('\n')
        for(const data of das){
            const splited = data.split(':::')
            currentSd.push([splited[0].trim(), splited[1].trim()])
        }
    }
    else{
        currentSd = JSON.parse(JSON.stringify(currentChar.sdData))
    }

    for(const d of currentSd){
        let val = d[1].trim()
        if(val === ''){
            val = 'none'
        }

        if(!d[0].startsWith('|') || d[0] === 'negative' || d[0] === 'always'){
            proompt += `\n${d[0].trim()}: ${val}`
        }
    }

    proompt += `\n\nChat:\n${prompt}`

    const promptbody:OpenAIChat[] = [
        {

            role:'system',
            content: mainPrompt
        },
        {
            role: 'user',
            content: `Data:\ncharacter's appearance: red hair, cute, black eyes\ncurrent situation: none\n$character's pose: none\n$character's emotion: none\n\nChat:\nuser: *eats breakfeast* \n I'm ready.\ncharacter: Lemon waits patiently outside your room while you get ready. Once you are dressed and have finished your breakfast, she escorts you to the door.\n"Have a good day at school, Master. Don't forget to study hard and make the most of your time there," Lemon reminds you with a smile as she sees you off.`
        },
        {
            role: 'assistant',
            content: "character's appearance: red hair, cute, black eyes\ncurrent situation:  waking up in the morning\n$character's pose: standing\n$character's emotion: apologetic"
        },
        {

            role:'system',
            content: mainPrompt
        },
        {
            role: 'user',
            content: proompt
        },
    ]

    console.log(proompt)
    const rq = await requestChatData({
        formated: promptbody,
        currentChar: currentChar,
        temperature: 0.2,
        maxTokens: 300,
        bias: {}
    }, 'submodel')


    if(rq.type === 'fail' || rq.type === 'streaming' || rq.type === 'multiline'){
        alertError(`${rq.result}`)
        return false
    }
    else{
        const res = rq.result
        const das = res.split('\n')
        for(const data of das){
            const splited = data.split(':')
            if(splited.length === 2){
                for(let i=0;i<currentSd.length;i++){
                    if(currentSd[i][0].trim() === splited[0]){
                        currentSd[i][1] = splited[1].trim()
                    }
                }
            }
        }
    }

    let returnSdData = currentSd.map((val) => {
        return val.join(':::')
    }).join('\n')

    if(db.sdProvider === 'webui'){

        let prompts:string[] = []
        let neg = ''
        for(let i=0;i<currentSd.length;i++){
            if(currentSd[i][0] !== 'negative'){
                prompts.push(currentSd[i][1])
            }
            else{
                neg = currentSd[i][1]
            }
        }


        const uri = new URL(db.webUiUrl)
        uri.pathname = '/sdapi/v1/txt2img'
        try {
            const da = await globalFetch(uri.toString(), {
                body: {
                    "width": db.sdConfig.width,
                    "height": db.sdConfig.height,
                    "seed": -1,
                    "steps": db.sdSteps,
                    "cfg_scale": db.sdCFG,
                    "prompt": prompts.join(','),
                    "negative_prompt": neg,
                    "sampler_name": db.sdConfig.sampler_name,
                    "enable_hr": db.sdConfig.enable_hr,
                    "denoising_strength": db.sdConfig.denoising_strength,
                    "hr_scale": db.sdConfig.hr_scale,
                    "hr_upscaler": db.sdConfig.hr_upscaler
                },
                headers:{
                    'Content-Type': 'application/json'
                }
            })   

            if(da.ok){
                let charemotions = get(CharEmotion)
                const img = `data:image/png;base64,${da.data.images[0]}`
                console.log(img)
                const emos:[string, string,number][] = [[img, img, Date.now()]]
                charemotions[currentChar.chaId] = emos
                CharEmotion.set(charemotions)
            }
            else{
                alertError(JSON.stringify(da.data))
                return false   
            }

            return returnSdData


        } catch (error) {
            alertError(error)
            return false   
        }
    }
    if(db.sdProvider === 'novelai'){

        let prompts:string[] = []
        let neg = ''
        for(let i=0;i<currentSd.length;i++){
            if(currentSd[i][0] !== 'negative'){
                prompts.push(currentSd[i][1])
            }
            else{
                neg = currentSd[i][1]
            }
        }


        const charimg = currentChar.image; // Uint8Array 형태의 이미지 데이터
        console.log("charimg:" + charimg);
        
        const img = await readImage(charimg)
        console.log("img:" + img);
        const base64 = await convertToBase64(img);
        const base64img = base64.split('base64,')[1];
        
        console.log("base64img:" + base64img);
        let reqlist= {}

        if(db.NAII2I){
            let randomseed = generateRandomSeed(10);
            let seed = parseInt(randomseed, 10);
            reqlist = {
                body: {
                    "action": "img2img",
                    "input": prompts.join(','),
                    "model": db.NAIImgModel,
                    "parameters": {
                        "seed": seed,
                        "extra_noise_seed": seed,
                        "add_original_image": false,
                        "cfg_rescale": 0,
                        "controlnet_strength": 1,
                        "dynamic_threshold": false,
                        "n_samples": 1,
                        "width": db.NAIImgConfig.width,
                        "height": db.NAIImgConfig.height,
                        "sampler": db.NAIImgConfig.sampler,
                        "steps": db.NAIImgConfig.steps,
                        "scale": db.NAIImgConfig.scale,
                        "negative_prompt": neg,
                        "sm": false,
                        "sm_dyn": false,
                        "noise": db.NAIImgConfig.noise,
                        "noise_schedule": "native",
                        "strength": db.NAIImgConfig.strength,
                        "image": base64img,
                        "ucPreset": 2,
                        "uncond_scale": 1
                    }
                },
                headers:{
                    "Authorization": "Bearer " + db.NAIApiKey
                }
            }
        }else{
            reqlist = {
                body: {
                    "input": prompts.join(','),
                    "model": db.NAIImgModel,
                    "parameters": {
                        "width": db.NAIImgConfig.width,
                        "height": db.NAIImgConfig.height,
                        "sampler": db.NAIImgConfig.sampler,
                        "steps": db.NAIImgConfig.steps,
                        "scale": db.NAIImgConfig.scale,
                        "negative_prompt": neg,
                        "sm": db.NAIImgConfig.sm,
                        "sm_dyn": db.NAIImgConfig.sm_dyn
                    }
                },
                headers:{
                    "Authorization": "Bearer " + db.NAIApiKey
                }
            }
        }
        try {
            const da = await globalFetch(db.NAIImgUrl, reqlist)   

            if(da){
                let charemotions = get(CharEmotion)
                const img = await processZip(da.data);
                const emos:[string, string,number][] = [[img, img, Date.now()]]
                charemotions[currentChar.chaId] = emos
                CharEmotion.set(charemotions)
            }
            else{
                alertError(JSON.stringify(da.data))
                return false   
            }

            return returnSdData


        } catch (error) {
            alertError(error)
            return false   
        }
    }
    return ''
}
import { get } from "svelte/store"
import { DataBase, type character } from "../storage/database"
import { requestChatData } from "./request"
import { alertError } from "../alert"
import { globalFetch, readImage } from "../storage/globalApi"
import { CharEmotion } from "../stores"
import type { OpenAIChat } from "."
import { processZip } from "./processzip"
export async function stableDiff(currentChar:character,prompt:string){
    let db = get(DataBase)

    if(db.sdProvider === ''){
        alertError("Stable diffusion is not set in settings.")
        return false
    }


    const proompt = `Chat:\n${prompt}`

    const promptbody:OpenAIChat[] = [
        {

            role:'system',
            content: currentChar.newGenData.instructions
        },
        {
            role: 'user',
            content: proompt
        },
    ]

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

    const r = rq.result


    const genPrompt = currentChar.newGenData.prompt.replaceAll('{{slot}}', r)
    const neg = currentChar.newGenData.negative

    return await generateAIImage(genPrompt, currentChar, neg, '')
}

export async function generateAIImage(genPrompt:string, currentChar:character, neg:string, returnSdData:string){
    const db = get(DataBase)
    if(db.sdProvider === 'webui'){


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
                    "prompt": genPrompt,
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

            if(returnSdData === 'inlay'){
                if(da.ok){
                    return `data:image/png;base64,${da.data.images[0]}`
                }
                else{
                    alertError(JSON.stringify(da.data))
                    return ''
                }
            }

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

        let reqlist= {}

        if(db.NAII2I){
            genPrompt = genPrompt
                .replaceAll('\\(', "♧")
                .replaceAll('\\)', "♤")
                .replaceAll('(','{')
                .replaceAll(')','}')
                .replaceAll('♧','(')
                .replaceAll('♤',')')

            let base64img = ''
            if(db.NAIImgConfig.image === ''){
                const charimg = currentChar.image;
                
                const img = await readImage(charimg)
                base64img = Buffer.from(img).toString('base64');
            }   else{
                base64img = Buffer.from(await readImage(db.NAIImgConfig.image)).toString('base64');
            }
            
            let seed = Math.floor(Math.random() * 10000000000)
            reqlist = {
                body: {
                    "action": "img2img",
                    "input": genPrompt,
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
                },
                rawResponse: true
            }
        }else{
            reqlist = {
                body: {
                    "input": genPrompt,
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
                },
                rawResponse: true,
                plainFetchForce: db.usePlainFetchNAI

            }
        }
        try {
            const da = await globalFetch(db.NAIImgUrl, reqlist)   

            if(returnSdData === 'inlay'){
                if(da.ok){
                    const img = await processZip(da.data);
                    return img
                }
                else{
                    alertError(Buffer.from(da.data).toString())
                    return ''
                }
            }

            if(da.ok){
                let charemotions = get(CharEmotion)
                const img = await processZip(da.data);
                const emos:[string, string,number][] = [[img, img, Date.now()]]
                charemotions[currentChar.chaId] = emos
                CharEmotion.set(charemotions)
            }
            else{
                alertError(Buffer.from(da.data).toString())
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
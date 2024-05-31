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


    const promptItem = `Chat:\n${prompt}`

    const promptbody:OpenAIChat[] = [
        {

            role:'system',
            content: currentChar.newGenData.instructions
        },
        {
            role: 'user',
            content: promptItem
        },
    ]

    const rq = await requestChatData({
        formated: promptbody,
        currentChar: currentChar,
        temperature: 0.2,
        maxTokens: 300,
        bias: {},
        useStreaming: false,
        noMultiGen: true
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

export async function generateAIImage(genPrompt:string, currentChar:character, neg:string, returnSdData:string):Promise<string|false>{
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
            else if(da.ok){
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
        genPrompt = genPrompt
            .replaceAll('\\(', "♧")
            .replaceAll('\\)', "♤")
            .replaceAll('(','{')
            .replaceAll(')','}')
            .replaceAll('♧','(')
            .replaceAll('♤',')')

        let reqlist:any = {}

        if(db.NAII2I){
            let seed = Math.floor(Math.random() * 10000000000)
         
            let base64img = ''
            if(db.NAIImgConfig.image === ''){
                const charimg = currentChar.image;
                
                const img = await readImage(charimg)
                base64img = Buffer.from(img).toString('base64');
            }   else{
                base64img = Buffer.from(await readImage(db.NAIImgConfig.image)).toString('base64');
            }

            let refimgbase64 = undefined
            



            if(db.NAIREF){
                if(db.NAIImgConfig.refimage !== ''){
                    refimgbase64 = Buffer.from(await readImage(db.NAIImgConfig.refimage)).toString('base64');
                }
            }
            
            reqlist = {
                body: {
                    "action": "img2img",
                    "input": genPrompt,
                    "model": db.NAIImgModel,
                    "parameters": {
                        "params_version": 1,
                        "add_original_image": true,
                        "cfg_rescale": 0,
                        "controlnet_strength": 1,
                        "dynamic_thresholding": false,
                        "extra_noise_seed": seed,
                        "n_samples": 1,
                        "width": db.NAIImgConfig.width,
                        "height": db.NAIImgConfig.height,
                        "sampler": db.NAIImgConfig.sampler,
                        "steps": db.NAIImgConfig.steps,
                        "scale": db.NAIImgConfig.scale,
                        "seed": seed,
                        "negative_prompt": neg,
                        "sm": false,
                        "sm_dyn": false,
                        "noise": db.NAIImgConfig.noise,
                        "noise_schedule": "native",
                        "strength": db.NAIImgConfig.strength,
                        "image": base64img,
                        "ucPreset": 3,
                        "uncond_scale": 1,
                        "qualityToggle": false,
                        "lagacy_v3_extend": false,
                        "lagacy": false,
                        "reference_information_extracted": db.NAIImgConfig.InfoExtracted,
                        "reference_strength": db.NAIImgConfig.RefStrength
                    }
                },
                headers:{
                    "Authorization": "Bearer " + db.NAIApiKey
                },
                rawResponse: true
            }

            if(refimgbase64 !== undefined){
                reqlist.body.parameters.reference_image = refimgbase64
            }
        }else{
           

            if (db.NAIREF) {
           
    
                let base64img = ''
                if(db.NAIImgConfig.image === ''){
                    const charimg = currentChar.image;
                    
                    const img = await readImage(charimg)
                    base64img = Buffer.from(img).toString('base64');
                }   else{
                    base64img = Buffer.from(await readImage(db.NAIImgConfig.refimage)).toString('base64');
                }
                reqlist = {
                    body: {
                        "action": "generate",
                        "input": genPrompt,
                        "model": db.NAIImgModel,
                        "parameters": {
                            "params_version": 1,
                            "add_original_image": true,
                            "cfg_rescale": 0,
                            "controlnet_strength": 1,
                            "dynamic_thresholding": false,
                            "n_samples": 1,
                            "width": db.NAIImgConfig.width,
                            "height": db.NAIImgConfig.height,
                            "sampler": db.NAIImgConfig.sampler,
                            "steps": db.NAIImgConfig.steps,
                            "scale": db.NAIImgConfig.scale,
                            "negative_prompt": neg,
                            "sm": db.NAIImgConfig.sm,
                            "sm_dyn": db.NAIImgConfig.sm_dyn,
                            "noise_schedule": "native",
                            "ucPreset": 3,
                            "uncond_scale": 1,
                            "qualityToggle": false,
                            "legacy": false,
                            "lagacy_v3_extend": false,
                            "reference_image": base64img,
                            "reference_strength": db.NAIImgConfig.RefStrength,
                            "reference_information_extracted": db.NAIImgConfig.InfoExtracted
                        }
                    },
                    headers:{
                        "Authorization": "Bearer " + db.NAIApiKey
                    },
                    rawResponse: true
                }
            } else {
                reqlist = {
                    body: {
                        "input": genPrompt,
                        "model": db.NAIImgModel,
                        "parameters": {
                            "params_version": 1,
                            "width": db.NAIImgConfig.width,
                            "height": db.NAIImgConfig.height,
                            "scale": db.NAIImgConfig.scale,
                            "sampler": db.NAIImgConfig.sampler,
                            "steps": db.NAIImgConfig.steps,
                            "n_samples": 1,
                            "ucPreset": 3,
                            "qualityToggle": false,
                            "sm": db.NAIImgConfig.sm,
                            "sm_dyn": db.NAIImgConfig.sm_dyn,
                            "dynamic_thresholding": false,
                            "controlnet_strength": 1,
                            "legacy": false,
                            "add_original_image": true,
                            "uncond_scale": 1,
                            "cfg_rescale": 0,
                            "noise_schedule": "native",
                            "legacy_v3_extend": false,
                            "reference_information_extracted": db.NAIImgConfig.InfoExtracted,
                            "reference_strength": db.NAIImgConfig.RefStrength,
                            "negative_prompt": neg,
                        }
                    },
                    headers:{
                        "Authorization": "Bearer " + db.NAIApiKey
                    },
                    rawResponse: true

                }
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

            else if(da.ok){
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
    if(db.sdProvider === 'dalle'){
        const da = await globalFetch("https://api.openai.com/v1/images/generations", {
            body: {
                "prompt": genPrompt,
                "model": "dall-e-3",
                "response_format": "b64_json",
                "style": "natural",
                "quality": db.dallEQuality || 'standard'
            },
            headers: {
                "Authorization": "Bearer " + db.openAIKey
            }
        })

        console.log(da)

        if(returnSdData === 'inlay'){
            let res = da?.data?.data?.[0]?.b64_json
            if(!res){
                alertError(JSON.stringify(da.data))
                return ''
            }
            return `data:image/png;base64,${res}`
        }

        else if(da.ok){
            let charemotions = get(CharEmotion)
            let img = da?.data?.data?.[0]?.b64_json
            if(!img){
                alertError(JSON.stringify(da.data))
                return false
            }
            img = `data:image/png;base64,${img}`
            const emos:[string, string,number][] = [[img, img, Date.now()]]
            charemotions[currentChar.chaId] = emos
            CharEmotion.set(charemotions)
        }
        else{
            alertError(Buffer.from(da.data).toString())
            return false   
        }
        return returnSdData
    }
    return ''
}
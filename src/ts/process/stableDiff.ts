import { get } from "svelte/store"
import { getDatabase, type character } from "../storage/database.svelte"
import { requestChatData } from "./request"
import { alertError } from "../alert"
import { fetchNative, globalFetch, readImage } from "../globalApi.svelte"
import { CharEmotion, DBState } from "../stores.svelte"
import type { OpenAIChat } from "./index.svelte"
import { processZip } from "./processzip"
import { keiServerURL } from "../kei/kei"
export async function stableDiff(currentChar:character,prompt:string){
    let db = getDatabase()

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
    const db = getDatabase()
    console.log(db.sdProvider)
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
    if(db.sdProvider === 'stability'){
        const formData = new FormData()
        const model = db.stabilityModel
        formData.append('prompt', genPrompt)
        if(model !== 'core' && model !== 'ultra'){
            formData.append('negative_prompt', neg)
            formData.append('model', model)
        }
        if(model === 'core'){
            if(db.stabllityStyle){
                formData.append('style_preset', db.stabllityStyle)
            }
        }
        if(model === 'ultra'){
            formData.append('negative_prompt', neg)
        }

        const uri = model === 'core' ? 'core' : model === 'ultra' ? 'ultra' : 'sd3'
        const da = await fetch("https://api.stability.ai/v2beta/stable-image/generate/" + uri, {
            body: formData,
            headers:{
                "authorization": "Bearer " + db.stabilityKey,
                "accept": "image/*"
            },
            method: 'POST'
        })

        const res = await da.arrayBuffer()
        if(!da.ok){
            alertError(Buffer.from(res).toString())
            return false
        }

        if((da.headers["content-type"] ?? "").startsWith('application/json')){
            alertError(Buffer.from(res).toString())
            return false
        }

        if(returnSdData === 'inlay'){
            return `data:image/png;base64,${Buffer.from(res).toString('base64')}`
        }

        let charemotions = get(CharEmotion)
        const img = `data:image/png;base64,${Buffer.from(res).toString('base64')}`
        const emos:[string, string,number][] = [[img, img, Date.now()]]
        charemotions[currentChar.chaId] = emos
        CharEmotion.set(charemotions)
        return returnSdData


    }

    if(db.sdProvider === 'comfy' || db.sdProvider === 'comfyui'){
        const legacy = db.sdProvider === 'comfy' // Legacy Comfy mode
        const {workflow, posNodeID, posInputName, negNodeID, negInputName} = db.comfyConfig
        const baseUrl = new URL(db.comfyUiUrl)

        const createUrl = (pathname: string, params: Record<string, string> = {}) => {
            const url = db.comfyUiUrl.endsWith('/api') ? new URL(`${db.comfyUiUrl}${pathname}`) : new URL(pathname, baseUrl)
            url.search = new URLSearchParams(params).toString()
            return url.toString()
        }

        const fetchWrapper = async (url: string, options = {}) => {
            console.log(url)
            const response = await globalFetch(url, options)
            if (!response.ok) {
                console.log(JSON.stringify(response.data))
                throw new Error(JSON.stringify(response.data))
            }
            return response.data
        }

        try {
            const prompt = JSON.parse(workflow)
            if(legacy){
                prompt[posNodeID].inputs[posInputName] = genPrompt
                prompt[negNodeID].inputs[negInputName] = neg
            }
            else{
                //search all nodes for the prompt and negative prompt
                const keys = Object.keys(prompt)
                for(let i = 0; i < keys.length; i++){
                    const node = prompt[keys[i]]
                    const inputKeys = Object.keys(node.inputs)
                    for(let j = 0; j < inputKeys.length; j++){
                        let input = node.inputs[inputKeys[j]]
                        if(typeof input === 'string'){
                            input = input.replaceAll('{{risu_prompt}}', genPrompt) 
                            input = input.replaceAll('{{risu_neg}}', neg)
                        }

                        if(inputKeys[j] === 'seed' && typeof input === 'number'){
                            input = Math.floor(Math.random() * 1000000000)
                        }
                        
                        node.inputs[inputKeys[j]] = input
                    }
                }
            }

            const { prompt_id: id } = await fetchWrapper(createUrl('/prompt'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { 'prompt': prompt }
            })
            console.log(`prompt id: ${id}`)

            let item

            const startTime = Date.now()
            const timeout = db.comfyConfig.timeout * 1000
            while (!(item = (await (await fetchNative(createUrl('/history'), {
                headers: { 'Content-Type': 'application/json' },
                method: 'GET'
            })).json())[id])) {
                console.log("Checking /history...")
                if (Date.now() - startTime >= timeout) {
                    alertError("Error: Image generation took longer than expected.");
                    return false
                }
                await new Promise(r => setTimeout(r, 1000))
            } // Check history until the generation is complete.
            const genImgInfo = Object.values(item.outputs).flatMap((output: any) => output.images)[0];

            const imgResponse = await fetchNative(createUrl('/view', {
                filename: genImgInfo.filename,
                subfolder: genImgInfo.subfolder,
                type: genImgInfo.type
            }), {
                headers: { 'Content-Type': 'application/json' }, 
                method: 'GET'
            })
            const img64 = Buffer.from(await imgResponse.arrayBuffer()).toString('base64')

            if(returnSdData === 'inlay'){
                return `data:image/png;base64,${img64}`
            }
            else {
                let charemotions = get(CharEmotion)
                const img = `data:image/png;base64,${img64}`
                const emos:[string, string,number][] = [[img, img, Date.now()]]
                charemotions[currentChar.chaId] = emos
                CharEmotion.set(charemotions)
            }

            return returnSdData
        } catch (error) {
            alertError(error)
            return false
        }
    }
    if(db.sdProvider === 'kei'){
        const db = getDatabase()
        let auth = db?.account?.token
        if(!auth){
            db.account = JSON.parse(localStorage.getItem("fallbackRisuToken"))
            auth = db?.account?.token
        }
        const da = await globalFetch(keiServerURL() + '/imaggen', {
            body: {
                "prompt": genPrompt,
            },
            headers: {
                "x-api-key": auth
            }
        })

        if(!da.ok || !da.data.success){
            alertError(Buffer.from(da.data.message || da.data).toString())
            return false   
        }
        if(returnSdData === 'inlay'){
            return da.data.data
        }
        else{
            let charemotions = get(CharEmotion)
            const img = da.data.data
            const emos:[string, string,number][] = [[img, img, Date.now()]]
            charemotions[currentChar.chaId] = emos
            CharEmotion.set(charemotions)
        }
        return returnSdData
        
    }
    if(db.sdProvider === 'fal'){
        const model = db.falModel
        const token = db.falToken

        let body:{[key:string]:any} = {
            prompt: genPrompt,
            enable_safety_checker: false,
            sync_mode: true,
            image_size: {
                "width": db.sdConfig.width,
                "height": db.sdConfig.height,
            }
        }

        if(db.falModel === 'fal-ai/flux-lora'){
            let loraPath = db.falLora
            if(loraPath.startsWith('urn:') || loraPath.startsWith('civitai:')){
                const id = loraPath.split('@').pop()
                loraPath = `https://civitai.com/api/download/models/${id}?type=Model&format=SafeTensor`
            }
            body.loras = [{
                "path": loraPath,
                "scale": db.falLoraScale
            }]
        }

        if(db.falModel === 'fal-ai/flux-pro'){
            delete body.enable_safety_checker
        }

        const res = await globalFetch('https://fal.run/' + model, {
            headers: {
                "Authorization": "Key " + token,
                "Content-Type": "application/json"
            },
            method: 'POST',
            body: body
        })

        if(!res.ok){
            alertError(JSON.stringify(res.data))
            return false
        }

        let image = res.data?.images?.[0]?.url
        if(!image){
            alertError(JSON.stringify(res.data))
            return false
        }

        if(returnSdData === 'inlay'){
            return image
        }
        else{
            let charemotions = get(CharEmotion)
            const emos:[string, string,number][] = [[image, image, Date.now()]]
            charemotions[currentChar.chaId] = emos
            CharEmotion.set(charemotions)
        }
    }
    return ''
}

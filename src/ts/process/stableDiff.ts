import { get } from "svelte/store"
import { getDatabase, type character } from "../storage/database.svelte"
import { requestChatData } from "./request/request"
import { alertError } from "../alert"
import { fetchNative, globalFetch, readImage } from "../globalApi.svelte"
import { CharEmotion } from "../stores.svelte"
import type { OpenAIChat } from "./index.svelte"
import { processZip } from "./processzip"
import { keiServerURL } from "../kei/kei"
import { random } from "lodash"

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

        const commonReq = {
            body: {
                "input": genPrompt,
                "model": db.NAIImgModel,
                "parameters": {
                    "params_version": 3,
                    "add_original_image": true,
                    "cfg_rescale": db.NAIImgConfig.cfg_rescale,
                    "controlnet_strength": 1,
                    "dynamic_thresholding": db.NAIImgModel.includes('nai-diffusion-3') || db.NAIImgModel.includes('nai-diffusion-furry-3') || db.NAIImgModel.includes('nai-diffusion-2') ? db.NAIImgConfig.decrisp : false,
                    "n_samples": 1,
                    "width": db.NAIImgConfig.width,
                    "height": db.NAIImgConfig.height,
                    "sampler": db.NAIImgConfig.sampler,
                    "steps": db.NAIImgConfig.steps,
                    "scale": db.NAIImgConfig.scale,
                    "negative_prompt": neg,
                    "sm": db.NAIImgModel.includes('nai-diffusion-3') || db.NAIImgModel.includes('nai-diffusion-furry-3') || db.NAIImgModel.includes('nai-diffusion-2') ? db.NAIImgConfig.sm : undefined,
                    "sm_dyn": db.NAIImgModel.includes('nai-diffusion-3') || db.NAIImgModel.includes('nai-diffusion-furry-3') ? db.NAIImgConfig.sm_dyn : undefined,
                    "noise_schedule": db.NAIImgConfig.noise_schedule,
                    "normalize_reference_strength_multiple":true,
                    "ucPreset": 3,
                    "uncond_scale": 1,
                    "qualityToggle": false,
                    "legacy_v3_extend": false,
                    "legacy": false,
                    //add v4
                    "autoSmea": false,
                    "use_coords": false,
                    "legacy_uc": db.NAIImgConfig.legacy_uc,
                    "v4_prompt":{
                        caption:{
                            base_caption:genPrompt,
                            char_captions: []
                        },
                        use_coords: false,
                        use_order: true,
                    },
                    "v4_negative_prompt":{
                        caption:{
                            base_caption:neg,
                            char_captions: []
                        },
                        legacy_uc: db.NAIImgConfig.legacy_uc,
                    },
                    "reference_image_multiple" : [],
                    "reference_strength_multiple" : [],
                    //add reference image
                    "image": undefined, 
                    "strength": undefined,
                    "noise": undefined,
                    //add additional parameters
                    "seed": random(0, 2**32-1),
                    "extra_noise_seed": random(0, 2**32-1),
                    "prefer_brownian": true,
                    "deliberate_euler_ancestral_bug": false,
                    "skip_cfg_above_sigma": null,
                    //add character reference
                    "director_reference_images": [],
                    "director_reference_descriptions": [],
                    "director_reference_information_extracted": [],
                    "director_reference_strength_values": [],
                }
            },
            headers:{
                "Authorization": "Bearer " + db.NAIApiKey
            },
            rawResponse: true
        }

        // Add Variety+ option 
        if(db.NAIImgConfig.variety_plus) {
            if(db.NAIImgModel.includes('nai-diffusion-4-full') || db.NAIImgModel.includes('nai-diffusion-4-curated')
            || db.NAIImgModel.includes('nai-diffusion-3') || db.NAIImgModel.includes('nai-diffusion-furry-3')) {
                commonReq.body.parameters.skip_cfg_above_sigma = Math.sqrt(db.NAIImgConfig.width * db.NAIImgConfig.height) * 0.01889;
            }
            if(db.NAIImgModel.includes('nai-diffusion-4-5-full') || db.NAIImgModel.includes('nai-diffusion-4-5-curated')) {
                commonReq.body.parameters.skip_cfg_above_sigma = Math.sqrt(db.NAIImgConfig.width * db.NAIImgConfig.height) * 0.05766;
            }
        }

        // Add vibe reference_image_multiple if exists
        if(db.NAIImgConfig.reference_mode === 'vibe' && db.NAIImgConfig.vibe_data) {
            const vibeData = db.NAIImgConfig.vibe_data;
            // Determine which model to use based on vibe_model_selection or fallback to current model
            const modelKey = db.NAIImgConfig.vibe_model_selection || 
                            (db.NAIImgModel.includes('nai-diffusion-4-full') ? 'v4full' : 
                             db.NAIImgModel.includes('nai-diffusion-4-curated') ? 'v4curated' : 
                             db.NAIImgModel.includes('nai-diffusion-4-5-full') ? 'v4-5full' :
                             db.NAIImgModel.includes('nai-diffusion-4-5-curated') ? 'v4-5curated' : null);

            if(modelKey && vibeData.encodings && vibeData.encodings[modelKey]) {
                // Initialize arrays if they don't exist
                if(!commonReq.body.parameters.reference_image_multiple) {
                    commonReq.body.parameters.reference_image_multiple = [];
                }
                if(!commonReq.body.parameters.reference_strength_multiple) {
                    commonReq.body.parameters.reference_strength_multiple = [];
                }

                // Use selected encoding or first available
                let encodingKey = db.NAIImgConfig.vibe_model_selection ? 
                                 Object.keys(vibeData.encodings[modelKey]).find(key => 
                                    vibeData.encodings[modelKey][key].params.information_extracted === 
                                    (db.NAIImgConfig.InfoExtracted || 1)) : 
                                 Object.keys(vibeData.encodings[modelKey])[0];

                if(encodingKey) {
                    const encoding = vibeData.encodings[modelKey][encodingKey].encoding;
                    // Add encoding to the array
                    commonReq.body.parameters.reference_image_multiple.push(encoding);

                    // Add reference_strength_multiple if it exists
                    const strength = db.NAIImgConfig.reference_strength_multiple && 
                                    db.NAIImgConfig.reference_strength_multiple.length > 0 ? 
                                    db.NAIImgConfig.reference_strength_multiple[0] : 0.5;
                    commonReq.body.parameters.reference_strength_multiple.push(strength);
                }
            }
        }

        if(db.NAIImgConfig.reference_mode === 'character' &&
            (db.NAIImgModel.includes('nai-diffusion-4-5-full') || db.NAIImgModel.includes('nai-diffusion-4-5-curated'))
        ) {
            let base64img = ''
            if(!db.NAIImgConfig.character_image || db.NAIImgConfig.character_image === ''){
                const charimg = currentChar.image;
                const img = await readImage(charimg)
                if (img) {
                    base64img = Buffer.from(img).toString('base64')
                }
            }   
            else{
                base64img = db.NAIImgConfig.character_base64image;
            }
            
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const imageObj = new Image();
                
                await new Promise<void>((resolve) => {
                    imageObj.onload = () => resolve();
                    imageObj.src = `data:image/png;base64,${base64img}`;
                });
                
                canvas.width = 1472;
                canvas.height = 1472;
                
                const scale = Math.min(1472 / imageObj.width, 1472 / imageObj.height);
                const scaledWidth = Math.floor(imageObj.width * scale);
                const scaledHeight = Math.floor(imageObj.height * scale);
                
                const x = (1472 - scaledWidth) / 2;
                const y = (1472 - scaledHeight) / 2;
                
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, 1472, 1472);
                
                ctx.drawImage(imageObj, x, y, scaledWidth, scaledHeight);
                
                const blob = await new Promise<Blob>((resolve) => {
                    canvas.toBlob(resolve, 'image/png');
                });
                
                if (blob) {
                    const arrayBuffer = await blob.arrayBuffer();
                    base64img = Buffer.from(arrayBuffer).toString('base64');
                }
            } catch (error) {
                console.warn('Image resize failed, using original:', error);
            }
            
            if(base64img){
                commonReq.body.parameters.director_reference_descriptions = [
                    {
                        caption: {
                            base_caption: "character" + (db.NAIImgConfig.style_aware ? "&style" : ""),
                            char_captions: []
                        },
                        legacy_uc: db.NAIImgConfig.legacy_uc,
                    }
                ]
                commonReq.body.parameters.director_reference_images = [base64img]
                commonReq.body.parameters.director_reference_information_extracted = [1]
                commonReq.body.parameters.director_reference_strength_values = [1]
            }
        }

        if(db.NAII2I){
            let seed = random(0, 1000000000);

            let base64img = ''
            if(!db.NAIImgConfig.image || db.NAIImgConfig.image === ''){
                const charimg = currentChar.image;

                const img = await readImage(charimg)
                if (img) {
                    base64img = Buffer.from(img).toString('base64')
                }
            }   
            else{
                base64img = db.NAIImgConfig.base64image;
            }
            
            if(base64img) {
                reqlist = commonReq;
                reqlist.body.action = "img2img";
                reqlist.body.parameters.image = base64img;
                reqlist.body.parameters.strength = db.NAIImgConfig.strength || 0.7;
                reqlist.body.parameters.noise = db.NAIImgConfig.noise || 0;
            }
            
            console.log({img2img:reqlist});
        }else{

            reqlist = commonReq;
            reqlist.body.action = 'generate';

            console.log({nothing:reqlist});
           
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
    if(db.sdProvider === 'Imagen') {
        const model = db.ImagenModel
        const size = db.ImagenImageSize
        const aspect = db.ImagenAspectRatio
        const person = db.ImagenPersonGeneration

        let body:any = {
            instances: [{
                prompt: genPrompt
            }],
            parameters: {
                sampleCount: 1,
                aspectRatio: aspect,
                personGeneration: person,
            }
        }

        if(model === 'imagen-4.0-generate-001' || model === 'imagen-4.0-ultra-generate-001') {
            body.parameters = {
                ...body.parameters,
                sampleImageSize: size
            }
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${db.google.accessToken}`

        const res = await globalFetch(url, {
            headers: {
                "Content-Type": "application/json"
            },
            method: 'POST',
            body: body,
        })

        if(!res.ok) {
            alertError(JSON.stringify(res.data))
            return false
        }

        const img64 = res.data?.predictions?.[0]?.bytesBase64Encoded

        if(!img64) {
            alertError(JSON.stringify(res.data))
            return false
        }
        
        const mimeType = res.data?.predictions?.[0]?.mimeType || 'image/png'
        return `data:${mimeType};base64,${img64}`
    }
    return ''
}

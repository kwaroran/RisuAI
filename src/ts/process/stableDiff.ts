import { get } from "svelte/store"
import { getDatabase, type character } from "../storage/database.svelte"
import { requestChatData } from "./request/request"
import { alertError } from "../alert"
import { fetchNative, globalFetch, readImage } from "../globalApi.svelte"
import { CharEmotion } from "../stores.svelte"
import type { OpenAIChat } from "./index.svelte"
import { processZip } from "./processzip"
import { keiServerURL } from "../kei/kei"
import random from "lodash/random"
import {
    applyNovelAiImg2Img,
    buildNovelAiRequestBody,
    novelAiModelCapabilities,
} from "./novelaiImage"

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


    if(rq.type === 'fail'){
        alertError(rq.result)
        return false
    }
    if(rq.type === 'streaming' || rq.type === 'multiline'){
        alertError('Unexpected response type')
        return false
    }

    const r = rq.result.replace(/<Thoughts>[\s\S]*?<\/Thoughts>/g, '').trim()


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
        let reqlist:any = {}
        const capabilities = novelAiModelCapabilities(db.NAIImgModel)

        const commonReq = {
            body: buildNovelAiRequestBody({
                prompt: genPrompt,
                negativePrompt: neg,
                model: db.NAIImgModel,
                width: db.NAIImgConfig.width,
                height: db.NAIImgConfig.height,
                sampler: db.NAIImgConfig.sampler,
                steps: db.NAIImgConfig.steps,
                scale: db.NAIImgConfig.scale,
                cfgRescale: db.NAIImgConfig.cfg_rescale,
                noiseSchedule: db.NAIImgConfig.noise_schedule,
                seed: random(0, 2**32-1),
                extraNoiseSeed: random(0, 2**32-1),
                decrisp: db.NAIImgConfig.decrisp,
                sm: db.NAIImgConfig.sm,
                smDyn: db.NAIImgConfig.sm_dyn,
                legacyUc: db.NAIImgConfig.legacy_uc,
                varietyPlus: db.NAIImgConfig.variety_plus,
            }),
            headers:{
                "Authorization": "Bearer " + db.NAIApiKey
            },
            rawResponse: true
        }

        // Add vibe reference_image_multiple if exists
        if(capabilities.vibes && db.NAIImgConfig.reference_mode === 'vibe' && db.NAIImgConfig.vibe_data) {
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

        if(capabilities.characterReferences && db.NAIImgConfig.reference_mode === 'character' &&
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
                applyNovelAiImg2Img(reqlist.body, {
                    imageBase64: base64img,
                    strength: db.NAIImgConfig.strength || 0.7,
                    noise: db.NAIImgConfig.noise || 0,
                    extraNoiseSeed: random(0, 2**32-1),
                })
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
    if(db.sdProvider === 'openai-compat'){
        const config = db.openaiCompatImage
        if(!config.url){
            alertError("OpenAI Compatible API URL is not set")
            return false
        }

        const body: {[key:string]: any} = {
            "prompt": genPrompt,
            "response_format": "b64_json",
            "size": config.size || "1024x1024",
            "quality": config.quality || "auto"
        }

        if(config.model){
            body.model = config.model
        }

        const headers: {[key:string]: string} = {
            "Content-Type": "application/json"
        }

        if(config.key){
            headers["Authorization"] = "Bearer " + config.key
        }

        const da = await globalFetch(config.url, {
            body: body,
            headers: headers
        })

        if(returnSdData === 'inlay'){
            let res = da?.data?.data?.[0]?.b64_json
            if(!res){
                alertError(JSON.stringify(da.data))
                return ''
            }
            return `data:image/png;base64,${res}`
        }

        if(da.ok){
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
            alertError(JSON.stringify(da.data))
            return false
        }
        return returnSdData
    }
    if(db.sdProvider === 'wavespeed'){
        const config = db.wavespeedImage
        if (!config.key) {
            alertError('Please enter wavespeed API key')
            return false
        }
        const body: {[key:string]: any} = {}

        // Prompt
        body.prompt = genPrompt

        // reference image
        let base64img = ''
        if (config.reference_mode === 'image') {
            // reference: uploaded image
            base64img = config.reference_base64image
        }
        else if (config.reference_mode === 'character') {
            // reference: auto use the character's default image
            const charimg = currentChar.image;
            const img = await readImage(charimg)
            if (img) {
                base64img = Buffer.from(img).toString('base64')
            }
        }
        if(base64img){
            body.images = [base64img]
        }

        // LoRAs
        if (config.loras && Array.isArray(config.loras)) {
            body.loras = [];
            for (const lora of config.loras) {
                if (lora && lora.path && lora.path.trim() !== "") {
                    body.loras.push({
                        path: lora.path,
                        scale: typeof lora.scale === 'number' ? lora.scale : 1.0
                    });
                }
            }
        }

        // Request
        try {
            // First: submit task
            const requestEndpoint = `https://api.wavespeed.ai/api/v3/${config.model}`
            const requestResponse = await globalFetch(requestEndpoint, {
                body: body,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + config.key
                }
            })
            let requestId: string;
            if (requestResponse.ok) {
                /*
                * submit response:
                * {
                *   code: number = HTTP status code (e.g., 200 for success)
                *   message: string = Status message (e.g., “success”)
                *   data: {
                *     id: string = Unique identifier for the prediction, Task Id
                *   }
                * }
                * */
                requestId = requestResponse.data.data.id
            }
            else {
                alertError(`Submit task failed ${requestResponse.status}: ${requestResponse.data}`)
                return false
            }

            // Second: monitor task
            const taskEndpoint = `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`
            let resultEndpoint: string;
            const POLL_INTERVAL = 3000; // monitor every 3 seconds
            const MAX_WAIT_TIME = 10 * 60 * 1000; // 10 minutes absolute timeout
            const startTime = Date.now();
            while (true) {
                const elapsedTime = Date.now() - startTime;
                if (elapsedTime > MAX_WAIT_TIME) {
                    alertError(`Task timeout after ${MAX_WAIT_TIME / 1000}s`);
                    break;
                }
                const taskResponse = await globalFetch(taskEndpoint, {
                    method: 'GET',
                    headers: {
                        "Authorization": "Bearer " + config.key
                    }
                })
                if (taskResponse.ok) {
                    /*
                    * monitor response:
                    * {
                    *   code: number = HTTP status code (e.g., 200 for success)
                    *   message: string = Status message (e.g., “success”)
                    *   data: {
                    *     status: string = Status of the task: created, processing, completed, or failed
                    *     outputs: string[] = Array of URLs to the generated content (empty when status is not completed)
                    *   }
                    * }
                    * */
                    if (taskResponse.data.data.status === 'completed') {
                        resultEndpoint = taskResponse.data.data.outputs[0]
                        break
                    }
                    else if (taskResponse.data.data.status === 'failed') {
                        alertError(JSON.stringify(taskResponse.data))
                        break
                    }
                    // else keep loop
                    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
                }
                else {
                    alertError(JSON.stringify(taskResponse.data))
                    break
                }
            }
            if (!resultEndpoint) {
                alertError('Task finished but no result URL')
                return false
            }

            // Third: get result
            const resultResponse = await globalFetch(resultEndpoint, {
                method: 'GET',
                headers: {
                    "Authorization": "Bearer " + config.key
                },
                rawResponse: true
            })
            if (resultResponse.ok) {
                // mime-type: jpeg (default), png, webp
                const contentType = resultResponse.headers?.['content-type'] || 'image/jpeg'
                const mimeType = contentType.split(';')[0] // resolve "image/png; charset=utf-8"

                // binary image file, need to convert to base64
                const binary = resultResponse.data
                const res = Buffer.from(binary).toString('base64');
                const img = `data:${mimeType};base64,${res}`

                // inlay mode
                if(returnSdData === 'inlay'){
                    return img
                }
                // default mode
                else {
                    let charemotions = get(CharEmotion)
                    charemotions[currentChar.chaId] = [[img, img, Date.now()]]
                    CharEmotion.set(charemotions)
                    return returnSdData
                }
            }
            else {
                alertError(JSON.stringify(resultResponse.data))
                return false
            }
        } catch (error) {
            alertError(error)
            return false
        }
    }
    return ''
}

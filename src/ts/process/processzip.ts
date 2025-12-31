import { AppendableBuffer, isNodeServer, isTauri, saveAsset, type LocalWriter, type VirtualWriter } from "../globalApi.svelte";
import * as fflate from "fflate";
import { asBuffer, sleep } from "../util";
import { alertStore } from "../alert";
import { Capacitor } from "@capacitor/core";
import { hasher } from "../parser.svelte";
import { hubURL } from "../characterCards";

export async function processZip(dataArray: Uint8Array): Promise<string> {
    const jszip = await import("jszip");
    const blob = new Blob([asBuffer(dataArray)], { type: "application/zip" });
    const zip = new jszip.default();
    const zipData = await zip.loadAsync(blob);

    const imageFile = Object.keys(zipData.files).find(fileName => /\.(jpg|jpeg|png)$/.test(fileName));
    if (imageFile) {
        const imageData = await zipData.files[imageFile].async("base64");
        return `data:image/png;base64,${imageData}`;
    } else {
        throw new Error("No image found in ZIP file");
    }
}

export class CharXWriter{
    zip:fflate.Zip
    writeEnd:boolean = false
    apb = new AppendableBuffer()
    #takenFilenames:Set<string> = new Set()
    constructor(private writer:LocalWriter|WritableStreamDefaultWriter<Uint8Array>|VirtualWriter){
        const handlerAsync = async (err:Error, dat:Uint8Array, final:boolean) => {
            if(dat){
                this.apb.append(dat)
            }
            if(final){
                this.writeEnd = true
            }
        }

        this.zip = new fflate.Zip()
        this.zip.ondata = handlerAsync
    }
    async init(){
        //do nothing, just to make compatible with other writer
    }

    async writeJpeg(img: Uint8Array){
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if(!ctx){
            return
        }
        const imgBlob = new Blob([asBuffer(img)], {type: 'image/jpeg'})
        const imgURL = URL.createObjectURL(imgBlob)
        const imgElement = document.createElement('img')
        imgElement.src = imgURL
        await imgElement.decode()
        canvas.width = imgElement.width
        canvas.height = imgElement.height
        ctx.drawImage(imgElement, 0, 0)
        const blob = await (new Promise((res:BlobCallback, rej) => {
            canvas.toBlob(res, 'image/jpeg')
        }))
        const buf = await blob.arrayBuffer()
        this.apb.append(new Uint8Array(buf))
    }

    async write(key:string,data:Uint8Array|string, level?:0|1|2|3|4|5|6|7|8|9){
        key = this.#sanitizeZipFilename(key)
        let dat:Uint8Array
        if(typeof data === 'string'){
            dat = new TextEncoder().encode(data)
        }
        else{
            dat = data
        }
        this.writeEnd = false
        const file = new fflate.ZipDeflate(key, {
            level: level ?? 0
        });
        this.zip.add(file)
        file.push(dat, true)
        await this.writer.write(this.apb.buffer)
        this.apb.clear()
        if(this.writeEnd){
            await this.writer.close()
        }
        
    }

    #sanitizeZipFilename(filename:string) {
        let sanitized = filename.replace(/[<>:"\\|?*\x00-\x1F]/g, '_');
        sanitized = sanitized.replace(/[. ]+$/, '');
        const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
        if (reservedNames.test(sanitized)) {
            sanitized = '_' + sanitized;
        }
        if (!sanitized || sanitized === '.' || sanitized === '..') {
            sanitized = 'file_' + Date.now();
        }

        const splitName = sanitized.split('.');
        let baseName = splitName.slice(0, -1).join('.');
        const extension = splitName.length > 1 ? '.' + splitName[splitName.length - 1] : '';
        let counter = 1;
        let uniqueName = baseName + extension;
        while (this.#takenFilenames.has(uniqueName)) {
            uniqueName = `${baseName}_${counter}${extension}`;
            counter++;
        }
        
        this.#takenFilenames.add(uniqueName);
        return uniqueName;
    }

    async end(){
        this.zip.end()
        await this.writer.write(this.apb.buffer)
        this.apb.clear()
        if(this.writeEnd){
            await this.writer.close()
        }
    }
}

export class CharXReader{
    unzip:fflate.Unzip
    assets:{[key:string]:string} = {}
    assetBuffers:{[key:string]:AppendableBuffer} = {}
    assetSavePromises:{
        id: string,
        promise: Promise<void>
    }[] = []
    assetQueueDone:Set<string> = new Set()
    excludedFiles:string[] = []
    cardData:string|undefined
    moduleData:Uint8Array|undefined
    allPushed:boolean = false
    fullPromiseResolver:() => void = () => {}
    alertInfo:boolean = false
    assetQueueLength:number = 0
    doneAssets:number = 0
    onQueue: number = 0
    expectedAssets:number = 0
    hashSignal: string|undefined
    skipSaving: boolean = false
    constructor(){
        this.unzip = new fflate.Unzip()
        this.unzip.register(fflate.UnzipInflate)
        this.unzip.onfile = (file) => {
            const assetIndex = file.name
            this.assetBuffers[assetIndex] = new AppendableBuffer()

            file.ondata = (err, dat, final) => {
                this.assetBuffers[assetIndex].append(dat)
                if(final){
                    const assetData = this.assetBuffers[assetIndex].buffer
                    if(assetData.byteLength > 50 * 1024 * 1024){
                        this.excludedFiles.push(assetIndex)
                    }
                    else if(file.name === 'card.json'){
                        this.cardData = new TextDecoder().decode(assetData)
                    }
                    else if(file.name === 'module.risum'){
                        this.moduleData = assetData
                    }
                    else if(file.name.endsWith('.json')){
                        //do nothing
                    }
                    else{
                        this.#processAssetQueue({
                            id: assetIndex,
                            data: assetData
                        })
                    }
                    delete this.assetBuffers[assetIndex]
                }
            }
            
            if(file.originalSize ?? 0 < 50 * 1024 * 1024){
                file.start()
            }
        }
    }

    async makePromise(){
        return new Promise<void>((res, rej) => {
            this.fullPromiseResolver = res
        })
    }

    async #processAssetQueue(asset:{id:string, data:Uint8Array}){
        this.assetQueueLength++
        this.onQueue++
        if(this.alertInfo){
            alertStore.set({ 
                type: 'progress',
                msg: `Loading...`,
                submsg: (this.doneAssets / this.assetQueueLength * 100).toFixed(2)
            })
        }
        if(this.assetSavePromises.length >= 10){
            await Promise.any(this.assetSavePromises.map(a => a.promise))
        }
        this.assetSavePromises = this.assetSavePromises.filter(a => !this.assetQueueDone.has(a.id))
        this.onQueue--
        if(this.assetSavePromises.length > 10){
            this.assetQueueLength--
            return this.#processAssetQueue(asset)
        }
        const savePromise = (async () => {
            const assetSaveId = this.skipSaving ? `assets/${await hasher(asset.data)}.png` : (await saveAsset(asset.data))
            this.assets[asset.id] = assetSaveId

            this.doneAssets++
            this.assetQueueDone.add(asset.id)
            if(this.alertInfo){
                alertStore.set({ 
                    type: 'progress',
                    msg: `Loading...`,
                    submsg: (this.doneAssets / this.assetQueueLength * 100).toFixed(2)
                })
            }
            
            
            if(this.allPushed && this.doneAssets >= this.assetQueueLength){
                if(this.hashSignal){
                    const signalId = await saveAsset(new TextEncoder().encode(this.hashSignal ?? ""))
                }
                this.fullPromiseResolver?.()
            }
        })()
        this.assetSavePromises.push({
            id: asset.id,
            promise: savePromise
        })
    }

    async waitForQueue(){
        
        while(this.assetSavePromises.length + this.onQueue >= 30){
            await sleep(100)
        }
    }

    async push(data:Uint8Array, final:boolean = false){

        if(data.byteLength > 1024 * 1024){
            let pointer = 0
            while(true){
                const chunk = data.slice(pointer, pointer + 1024 * 1024)
                await this.waitForQueue()
                this.unzip.push(chunk, false)
                if(pointer + 1024 * 1024 >= data.byteLength){
                    if(final){
                        this.unzip.push(new Uint8Array(0), final)
                        this.allPushed = final
                    }
                    break
                }
                pointer += 1024 * 1024
            }
            return
        }

        await this.waitForQueue()
        this.unzip.push(data, final)
        this.allPushed = final
    }

    async read(data:Uint8Array|File|ReadableStream<Uint8Array>, arg:{
        alertInfo?:boolean
    } = {}){

        if(data instanceof ReadableStream){
            const reader = data.getReader()
            while(true){
                const {done, value} = await reader.read()
                if(value){
                    await this.push(value, false)
                }
                if(done){
                    await this.push(new Uint8Array(0), true)
                    break
                }
            }
            await this.push(new Uint8Array(0), true)
            return
        }

        const getSlice = async (start:number, end:number) => {
            if(data instanceof Uint8Array){
                return data.slice(start, end)
            }
            if(data instanceof File){
                return new Uint8Array(await data.slice(start, end).arrayBuffer())
            }
        }

        const getLength = () => {
            if(data instanceof Uint8Array){
                return data.byteLength
            }
            if(data instanceof File){
                return data.size
            }
        }

        let pointer = 0
        while(true){
            const chunk = await getSlice(pointer, pointer + 1024 * 1024)
            await this.push(chunk, false)
            if(pointer + 1024 * 1024 >= getLength()){
                await this.push(new Uint8Array(0), true)
                break
            }
            pointer += 1024 * 1024
        }
        await sleep(100)
    }
}


export async function CharXSkippableChecker(data:Uint8Array){
    const hashed = await hasher(data)
    const reHashed = await hasher(new TextEncoder().encode(hashed))
    const x = await fetch(hubURL + '/rs/assets/' + reHashed + '.png')
    return {
        success: x.status >= 200 && x.status < 300,
        hash: hashed
    }
}
import { AppendableBuffer, isNodeServer, isTauri, saveAsset, type LocalWriter, type VirtualWriter } from "../globalApi.svelte";
import * as fflate from "fflate";
import { sleep } from "../util";
import { alertStore } from "../alert";
import { Capacitor } from "@capacitor/core";

export async function processZip(dataArray: Uint8Array): Promise<string> {
    const jszip = await import("jszip");
    const blob = new Blob([dataArray], { type: "application/zip" });
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
        console.log('writeJpeg')
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if(!ctx){
            return
        }
        const imgBlob = new Blob([img], {type: 'image/jpeg'})
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
        console.log('writeJpeg done')
    }

    async write(key:string,data:Uint8Array|string, level?:0|1|2|3|4|5|6|7|8|9){
        console.log('write',key)
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
        await this.zip.add(file)
        await file.push(dat, true)
        await this.writer.write(this.apb.buffer)
        this.apb.buffer = new Uint8Array(0)
        if(this.writeEnd){
            await this.writer.close()
        }
        
    }

    async end(){
        await this.zip.end()
        await this.writer.write(this.apb.buffer)
        this.apb.buffer = new Uint8Array(0)
        if(this.writeEnd){
            await this.writer.close()
        }
    }
}

export class CharXReader{
    unzip:fflate.Unzip
    assets:{[key:string]:string} = {}
    assetBuffers:{[key:string]:AppendableBuffer} = {}
    assetPromises:Promise<void>[] = []
    excludedFiles:string[] = []
    cardData:string|undefined
    moduleData:Uint8Array|undefined
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
                        this.assetPromises.push((async () => {
                            const assetId = await saveAsset(assetData)
                            this.assets[assetIndex] = assetId
                        })())
                    }
                }
            }
            
            if(file.originalSize ?? 0 < 50 * 1024 * 1024){
                file.start()
            }
        }
    }

    async push(data:Uint8Array, final:boolean = false){

        if(data.byteLength > 1024 * 1024){
            let pointer = 0
            while(true){
                const chunk = data.slice(pointer, pointer + 1024 * 1024)
                this.unzip.push(chunk, false)
                await Promise.all(this.assetPromises)
                if(pointer + 1024 * 1024 >= data.byteLength){
                    if(final){
                        this.unzip.push(new Uint8Array(0), final)
                    }
                    break
                }
                pointer += 1024 * 1024
            }
            return
        }

        this.unzip.push(data, final)
        await Promise.all(this.assetPromises)
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

        const alertInfo = () => {
            if(arg.alertInfo){
                alertStore.set({ 
                    type: 'progress',
                    msg: `Loading...`,
                    submsg: (pointer / getLength() * 100).toFixed(2)
                })
            }
        }

        let pointer = 0
        while(true){
            const chunk = await getSlice(pointer, pointer + 1024 * 1024)
            await this.push(chunk, false)
            alertInfo()
            if(pointer + 1024 * 1024 >= getLength()){
                await this.push(new Uint8Array(0), true)
                break
            }
            pointer += 1024 * 1024
            if(!isTauri && !Capacitor.isNativePlatform() &&!isNodeServer){
                const promiseLength = this.assetPromises.length
                this.assetPromises = []
                await sleep(promiseLength * 100)
            }
        }
        await sleep(100)
    }
}
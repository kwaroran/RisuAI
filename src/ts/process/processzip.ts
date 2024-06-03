import { AppendableBuffer, saveAsset, type LocalWriter, type VirtualWriter } from "../storage/globalApi";
import * as fflate from "fflate";
import { sleep } from "../util";

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

    async write(key:string,data:Uint8Array|string){
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
            level: 0
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

    async read(data:Uint8Array|File|ReadableStream<Uint8Array>){
        if(data instanceof Uint8Array){
            this.unzip.push(data, true)
        }
        if(data instanceof File){
            const reader = data.stream().getReader()
            while(true){
                const {done, value} = await reader.read()
                if(done){
                    break
                }
                this.unzip.push(value, false)
            }
            this.unzip.push(new Uint8Array(0), true)
        }
        if(data instanceof ReadableStream){
            const reader = data.getReader()
            while(true){
                const {done, value} = await reader.read()
                if(done){
                    break
                }
                this.unzip.push(value, false)
            }
            this.unzip.push(new Uint8Array(0), true)
        }
        await sleep(500)
        await Promise.all(this.assetPromises)
    }
}
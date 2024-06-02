import { AppendableBuffer, type LocalWriter, type VirtualWriter } from "../storage/globalApi";
import * as fflate from "fflate";

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
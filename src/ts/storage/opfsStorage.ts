import { asBuffer } from "../util";

export class OpfsStorage{

    opfs:FileSystemDirectoryHandle

    async setItem(key:string, value:Uint8Array) {
        await this.Init()
        const handle = await this.opfs.getFileHandle(Buffer.from(key, 'utf-8').toString('hex'), {
            create: true
        })
        const stream = await handle.createWritable()
        await stream.write(asBuffer(value))
        stream.close()
    }
    async getItem(key:string):Promise<Buffer> {
        try {
            await this.Init()
            const handle = await this.opfs.getFileHandle(Buffer.from(key, 'utf-8').toString('hex'), {
                create: false
            })
            const stream = await handle.getFile();
    
            return Buffer.from(await stream.arrayBuffer())   
        } catch (error) {
            if(error instanceof DOMException){
                if(error.name === "NotFoundError"){
                    return null
                }
            }
            throw error
        }
    }
    async keys():Promise<string[]>{
        await this.Init()
        let entries:string[] = []
        for await (const entry of this.opfs.values()) {
            entries.push(Buffer.from(entry.name, 'hex').toString('utf-8'))
        }
        return entries
    }
    async removeItem(key:string){
        try {
            await this.Init()
            await this.opfs.removeEntry(Buffer.from(key, 'utf-8').toString('hex'))
        } catch (error) {
            if(error instanceof DOMException){
                if(error.name === "NotFoundError"){
                    return null
                }
            }
            throw error
        }
    }

    private async Init(){
        if(!this.opfs){
            this.opfs = await window.navigator.storage.getDirectory()
        }
    }

    listItem = this.keys
}
import { Buffer } from 'buffer';
import crc32 from 'crc/crc32';
import { AppendableBuffer, VirtualWriter, type LocalWriter } from './globalApi.svelte';
import { blobToUint8Array } from './util';

class StreamChunkWriter{
    constructor(private data:Uint8Array, private writer:LocalWriter|WritableStreamDefaultWriter<Uint8Array>|VirtualWriter){

    }
    async pushData(data:Uint8Array){
        await this.writer.write(data)
    }
    async init(){
        let pos = 8
        let newData:Uint8Array[] = []


        const data = this.data
        await this.pushData(data.slice(0,8))

        while(pos < data.length){
            const len = data[pos] * 0x1000000 + data[pos+1] * 0x10000 + data[pos+2] * 0x100 + data[pos+3]
            const type = data.slice(pos+4,pos+8)
            const typeString = new TextDecoder().decode(type)
            if(typeString === 'IEND'){
                break
            }
            if(typeString === 'tEXt'){
                const endPos = 12 + len + pos
                //get key
                let key=''
                while(data[pos+8] !== 0){
                    key += String.fromCharCode(data[pos+8])
                    pos++
                    if(pos === endPos || key.length > 6){
                        break
                    }
                }

                if(key !== 'ccv3' && key !== 'chara'){
                    await this.pushData(data.slice(pos,endPos))
                }
                pos = endPos
            }
            else{
                await this.pushData(data.slice(pos,pos+12+len))
                pos += 12 + len
            }
        }
    }
    async write(key:string, val:string|Uint8Array){

        const keyData = new TextEncoder().encode(key)
        const value = Buffer.from(val)
        const lenNum = value.byteLength + keyData.byteLength + 1
        //idk, but uint32array is not working
        const length = new Uint8Array([
            lenNum / 0x1000000 % 0x100,
            lenNum / 0x10000 % 0x100,
            lenNum / 0x100 % 0x100,
            lenNum % 0x100
        ])
        const type = new TextEncoder().encode('tEXt')
        await this.pushData(length)
        await this.pushData(type)
        await this.pushData(keyData)
        await this.pushData(new Uint8Array([0]))
        await this.pushData(value)
        const crc = crc32(Buffer.concat([type,keyData,new Uint8Array([0]),value]))
        await this.pushData(new Uint8Array([
            crc / 0x1000000 % 0x100,
            crc / 0x10000 % 0x100,
            crc / 0x100 % 0x100,
            crc % 0x100
        ]))
    }
    async end() {
        const length = new Uint8Array((new Uint32Array([0])).buffer)
        const type = new TextEncoder().encode('IEND')
        await this.pushData(length)
        await this.pushData(type)
        const crc = crc32(type as Buffer)
        await this.pushData(new Uint8Array([
            crc / 0x1000000 % 0x100,
            crc / 0x10000 % 0x100,
            crc / 0x100 % 0x100,
            crc % 0x100
        ]))
        this.writer.close()
    }
}

export const PngChunk = {
    read: (data:Uint8Array, chunkName:string[], arg:{checkCrc?:boolean} = {}) => {
        let pos = 8
        let chunks:{[key:string]:string} = {}
        while(pos < data.length){
            const len = data[pos] * 0x1000000 + data[pos+1] * 0x10000 + data[pos+2] * 0x100 + data[pos+3]
            const type = data.slice(pos+4,pos+8)
            const typeString = new TextDecoder().decode(type)
            if(arg.checkCrc){
                const crc = data[pos+8+len] * 0x1000000 + data[pos+9+len] * 0x10000 + data[pos+10+len] * 0x100 + data[pos+11+len]
                const crcCheck = crc32(data.slice(pos+4,pos+8+len) as Buffer)
                if(crc !== crcCheck){
                    throw new Error('crc check failed')
                }
            }
            if(typeString === 'IEND'){
                break
            }
            if(typeString === 'tEXt'){
                const chunkData = data.slice(pos+8,pos+8+len)
                let key=''
                let value=''
                for(let i=0;i<70;i++){
                    if(chunkData[i] === 0){
                        key = new TextDecoder().decode(chunkData.slice(0,i))
                        value = new TextDecoder().decode(chunkData.slice(i + 1))
                        break
                    }
                }
                if(chunkName.includes(key)){
                    chunks[key] = value
                }
            }
            pos += 12 + len
        }
        return chunks
    },

    readGenerator: async function*(data:File|Uint8Array|ReadableStream<Uint8Array>, arg:{checkCrc?:boolean,returnTrimed?:boolean} = {}):AsyncGenerator<
        {key:string,value:string}|AppendableBuffer,null
    >{
        if (data instanceof File) {
            if (typeof data.stream === 'function') {
                data = data.stream();
            } else {
                data = await blobToUint8Array(data);
            }
        }
        const reader = data instanceof ReadableStream ? data.getReader() : null
        let readableStreamData = new AppendableBuffer()
        const trimedData = new AppendableBuffer()

        async function appendTrimed(data:Uint8Array){
            if(arg.returnTrimed){
                trimedData.append(data)
            }
        }

        async function slice(start:number,end:number):Promise<Uint8Array> {
            if(data instanceof Uint8Array){
                return data.slice(start,end)
            }
            else{
                while(end > readableStreamData.length()){
                    const rs = await reader.read()
                    if(!rs.value && rs.done){
                        return new Uint8Array(0)
                    }
                    if(!rs.value){
                        continue
                    }
                    readableStreamData.append(rs.value)
                }
                const data = readableStreamData.slice(start, end)

                if(start - readableStreamData.deapended > 200000){
                    readableStreamData.deappend(50000)
                }

                return data
            }
        }

        

        await appendTrimed(await slice(0,8))
        let pos = 8
        const size = data instanceof Uint8Array ? data.length : Infinity
        while(pos < size){
            const dataPart = await slice(pos,pos+4)
            const len = dataPart[0] * 0x1000000 + dataPart[1] * 0x10000 + dataPart[2] * 0x100 + dataPart[3]
            const type = await slice(pos+4,pos+8)
            const typeString = new TextDecoder().decode(type)
            if(arg.checkCrc && !(data instanceof ReadableStream)){ //crc check is not supported for stream
                const dataPart = await slice(pos+8+len,pos+12+len)
                const crc = dataPart[0] * 0x1000000 + dataPart[1] * 0x10000 + dataPart[2] * 0x100 + dataPart[3]
                const crcCheck = crc32(await slice(pos+4,pos+8+len) as Buffer)
                if(crc !== crcCheck){
                    throw new Error('crc check failed')
                }
            }
            if(typeString === 'IEND'){
                await appendTrimed(await slice(pos,pos+12+len))
                break
            }
            else if(typeString === 'tEXt'){
                const chunkData = await slice(pos+8,pos+8+len)
                let key=''
                let value=''
                for(let i=0;i<70;i++){
                    if(chunkData[i] === 0){
                        key = new TextDecoder().decode(chunkData.slice(0,i))
                        value = new TextDecoder().decode(chunkData.slice(i+1))
                        break
                    }
                }
                yield {key,value}
            }
            else{
                await appendTrimed(await slice(pos,pos+12+len))
            }
            pos += 12 + len
        }
        if(arg.returnTrimed){
            yield trimedData
        }
        return null
    },

    trim: (data:Uint8Array) => {
        let pos = 8
        let newData:Uint8Array[] = []
        while(pos < data.length){
            const len = data[pos] * 0x1000000 + data[pos+1] * 0x10000 + data[pos+2] * 0x100 + data[pos+3]
            const type = data.slice(pos+4,pos+8)
            const typeString = new TextDecoder().decode(type)
            if(typeString === 'IEND'){
                newData.push(data.slice(pos,pos+12+len))
                break
            }
            if(typeString === 'tEXt'){
                pos += 12 + len
            }
            else{
                newData.push(data.slice(pos,pos+12+len))
                pos += 12 + len
            }
        }
        newData.push(data.slice(pos))
        return Buffer.concat(newData)
    },


    write: async (data:Uint8Array, chunks:{[key:string]:string}, options:{writer?:LocalWriter} = {}):Promise<void | Buffer> => {
        let pos = 8
        let newData:Uint8Array[] = []

        async function pushData(data:Uint8Array){
            if(options.writer){
                await options.writer.write(data)
            }
            else{
                newData.push(data)
            }
        }

        await pushData(data.slice(0,8))

        while(pos < data.length){
            const len = data[pos] * 0x1000000 + data[pos+1] * 0x10000 + data[pos+2] * 0x100 + data[pos+3]
            const type = data.slice(pos+4,pos+8)
            const typeString = new TextDecoder().decode(type)
            if(typeString === 'IEND'){
                break
            }
            if(typeString === 'tEXt'){
                pos += 12 + len
            }
            else{
                await pushData(data.slice(pos,pos+12+len))
                pos += 12 + len
            }
        }
        for(const key in chunks){
            const keyData = new TextEncoder().encode(key)
            const value = Buffer.from(chunks[key])
            const lenNum = value.byteLength + keyData.byteLength + 1
            //idk, but uint32array is not working
            const length = new Uint8Array([
                lenNum / 0x1000000 % 0x100,
                lenNum / 0x10000 % 0x100,
                lenNum / 0x100 % 0x100,
                lenNum % 0x100
            ])
            const type = new TextEncoder().encode('tEXt')
            await pushData(length)
            await pushData(type)
            await pushData(keyData)
            await pushData(new Uint8Array([0]))
            await pushData(value)
            const crc = crc32(Buffer.concat([type,keyData,new Uint8Array([0]),value]))
            await pushData(new Uint8Array([
                crc / 0x1000000 % 0x100,
                crc / 0x10000 % 0x100,
                crc / 0x100 % 0x100,
                crc % 0x100
            ]))
        }
        //create IEND chunk
        {
            const length = new Uint8Array((new Uint32Array([0])).buffer)
            const type = new TextEncoder().encode('IEND')
            await pushData(length)
            await pushData(type)
            const crc = crc32(type as Buffer)
            await pushData(new Uint8Array([
                crc / 0x1000000 % 0x100,
                crc / 0x10000 % 0x100,
                crc / 0x100 % 0x100,
                crc % 0x100
            ]))
        }

        if(options.writer){
            await options.writer.close()
        }
        else{
            return Buffer.concat(newData)
        }
    },
    streamWriter: StreamChunkWriter
}

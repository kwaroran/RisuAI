import { Packr, decode } from "msgpackr";
import pako from "pako";
import { isTauri } from "./globalApi";

const packr = new Packr({
    useRecords:true
});

export function encodeRisuSave(data:any){
    const encoded = packr.encode(data)
    if(isTauri){
        return pako.deflate(encoded)
    }
    return encoded
}

export function decodeRisuSave(data:Uint8Array){
    try {
        return decode(data)   
    }
    catch (error) {
        try {
            const risuSaveHeader = new Uint8Array(Buffer.from("\u0000\u0000RISU",'utf-8'))
            const realData = data.subarray(risuSaveHeader.length)
            const dec = decode(realData)
            return dec   
        } catch (error) {
            const buf = Buffer.from(pako.inflate(Buffer.from(data)))
            try {
                return JSON.parse(buf.toString('utf-8'))                            
            } catch (error) {
                return decode(buf)
            }
        }
    }
}
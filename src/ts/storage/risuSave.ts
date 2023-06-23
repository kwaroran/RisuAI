import { decode, encode } from "@msgpack/msgpack";
import { isEqual } from "lodash";
import pako from "pako";
import { isTauri } from "./globalApi";


export function encodeRisuSave(data:any){
    const risuSaveHeader = new Uint8Array(Buffer.from("\u0000\u0000RISU",'utf-8'))
    const encoded = encode(data)

    if(isTauri){
        return pako.deflate(encoded)
    }
    const mergedArray = new Uint8Array(risuSaveHeader.length + encoded.length);
    mergedArray.set(risuSaveHeader);
    mergedArray.set(encoded, risuSaveHeader.length);
    return mergedArray
}

export function decodeRisuSave(data:Uint8Array){
    const risuSaveHeader = new Uint8Array(Buffer.from("\u0000\u0000RISU",'utf-8'))
    const sub = data.subarray(0, risuSaveHeader.length)
    if(isEqual(sub, risuSaveHeader)){
        const realData = data.subarray(risuSaveHeader.length)
        const dec = decode(realData)
        return dec
    }
    else{
        try {
            const buf = Buffer.from(pako.inflate(Buffer.from(data)))
            try {
                return JSON.parse(buf.toString('utf-8'))                            
            } catch (error) {
                return decode(buf)
            }
        } catch (error) {
            const realData = data.subarray(risuSaveHeader.length)
            const dec = decode(realData)
            return dec
        }
    }
}
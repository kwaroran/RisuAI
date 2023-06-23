import { decode, encode } from "@msgpack/msgpack";
import { isEqual } from "lodash";
import pako from "pako";


export function encodeRisuSave(data:any){
    const risuSaveHeader = new Uint8Array(Buffer.from("\u0000\u0000RISU",'utf-8'))
    const encoded = encode(data)
    const mergedArray = new Uint8Array(risuSaveHeader.length + encoded.length);
    mergedArray.set(risuSaveHeader);
    mergedArray.set(encoded, risuSaveHeader.length);
    return mergedArray
}

export function decodeRisuSave(data:Uint8Array){
    const risuSaveHeader = new Uint8Array(Buffer.from("\u0000\u0000RISU",'utf-8'))
    const sub = data.subarray(0, risuSaveHeader.length)
    if(isEqual(sub, risuSaveHeader)){
        try {
            const realData = data.subarray(risuSaveHeader.length)
            const dec = decode(realData)
            return dec
        } catch (error) {
            console.error(error)
            throw error
        }
    }
    else{
        return JSON.parse(Buffer.from(pako.inflate(Buffer.from(data))).toString('utf-8'))
    }
}
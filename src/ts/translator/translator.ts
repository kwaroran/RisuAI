import { Body,fetch,ResponseType } from "@tauri-apps/api/http"
import { isTauri } from "../globalApi"

let cache={
    origin: [''],
    trans: ['']
}

export async function translate(params:string, reverse:boolean) {
    if(!isTauri){
        return params
    }
    if(!reverse){
        const ind = cache.origin.indexOf(params)
        if(ind !== -1){
            return cache.trans[ind]
        }
    }
    else{
        const ind = cache.trans.indexOf(params)
        if(ind !== -1){
            return cache.origin[ind]
        }
    }
    return googleTrans(params, reverse)
}

async function googleTrans(text:string, reverse:boolean) {
    const arg = {
        from: reverse ? 'ko' : 'en',
        to: reverse ? 'en' : 'ko',
        host: 'translate.google.com',
    }
    const body = Body.form({
        sl: reverse ? 'ko' : 'en',
        tl: reverse ? 'en' : 'ko',
        q: text,
    })
    const url = `https://${arg.host}/translate_a/single?client=at&dt=t&dt=rm&dj=1`

    const f = await fetch(url, {
        method: "POST",
        body: body,
        responseType: ResponseType.JSON
    })

    const res = f.data as {sentences:{trans?:string}[]}
    return res.sentences.filter((s) => 'trans' in s).map((s) => s.trans).join('');
}
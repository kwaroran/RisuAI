import { Body,fetch,ResponseType } from "@tauri-apps/api/http"
import { isTauri } from "../globalApi"
import { translatorPlugin } from "../process/plugins"
import { sleep } from "../util"

let cache={
    origin: [''],
    trans: ['']
}

let waitTrans = 0

export async function translate(text:string, reverse:boolean) {
    if(!isTauri){
        return text
    }
    const plug = await translatorPlugin(text, reverse ? 'ko' : 'en', reverse ? 'en' : 'ko')
    if(plug){
        return plug.content
    }
    if(!reverse){
        const ind = cache.origin.indexOf(text)
        if(ind !== -1){
            return cache.trans[ind]
        }
    }
    else{
        const ind = cache.trans.indexOf(text)
        if(ind !== -1){
            return cache.origin[ind]
        }
    }

    return googleTrans(text, reverse)
}

async function googleTrans(text:string, reverse:boolean) {
    const time = Date.now()
    if(time < waitTrans){
        const waitTime = waitTrans - time
        waitTrans += 5000
        await sleep(waitTime)
    }
    else{
        waitTrans = time + 5000
    }
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
    if(typeof(f.data) === 'string'){
        return res as unknown as string
    }
    const result = res.sentences.filter((s) => 'trans' in s).map((s) => s.trans).join('');
    cache.origin.push(reverse ? result : text)
    cache.trans.push(reverse ? text : result)
    return result
}
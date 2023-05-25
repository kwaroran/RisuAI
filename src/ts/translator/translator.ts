import { get } from "svelte/store"
import { translatorPlugin } from "../process/plugins"
import { DataBase } from "../database"

let cache={
    origin: [''],
    trans: ['']
}

let waitTrans = 0

export async function translate(text:string, reverse:boolean) {
    let db = get(DataBase)
    const plug = await translatorPlugin(text, reverse ? db.translator: 'en', reverse ? 'en' : db.translator)
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
    let db = get(DataBase)
    const arg = {

        from: reverse ? db.translator : 'en',

        to: reverse ? 'en' : db.translator,

        host: 'translate.googleapis.com',

    }



    const url = `https://${arg.host}/translate_a/single?client=gtx&dt=t&sl=${arg.from}&tl=${arg.to}&q=` + encodeURIComponent(text)



    const f = await fetch(url, {

        method: "GET",

    })

    const res = await f.json()

    

    if(typeof(res) === 'string'){

        return res as unknown as string

    }

    const result = res[0].map((s) => s[0]).filter(Boolean).join('');

    cache.origin.push(reverse ? result : text)

    cache.trans.push(reverse ? text : result)

    return result

}

export async function translateVox(text:string) {
    const plug = await translatorPlugin(text, 'en', 'jp')
    if(plug){
        return plug.content
    }
    
    return jpTrans(text)
}


async function jpTrans(text:string) {

    const host = 'translate.googleapis.com'

    
    const url = `https://${host}/translate_a/single?client=gtx&sl=auto&tl=ja&dt=t&q=` + encodeURIComponent(text)



    const f = await fetch(url, {

        method: "GET",

    })

    const res = await f.json()

    

    if(typeof(res) === 'string'){

        return res as unknown as string

    }

    const result = res[0].map((s) => s[0]).filter(Boolean).join('');

    return result

}
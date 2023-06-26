import { get } from "svelte/store"
import { translatorPlugin } from "../plugins/plugins"
import { DataBase } from "../storage/database"

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

    return googleTrans(text, reverse, db.translator,db.aiModel.startsWith('novellist') ? 'ja' : 'en')
}

async function googleTrans(text:string, reverse:boolean, from:string,target:'en'|'ja') {
    let db = get(DataBase)
    const arg = {

        from: reverse ? from : target,

        to: reverse ? target : from,

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

    const result = (res[0].map((s) => s[0]).filter(Boolean).join('') as string).replace(/\* ([^*]+)\*/g, '*$1*').replace(/\*([^*]+) \*/g, '*$1*');

    cache.origin.push(reverse ? result : text)

    cache.trans.push(reverse ? text : result)

    return result

}

export async function translateVox(text:string) {
    const plug = await translatorPlugin(text, 'en', 'ja')
    if(plug){
        return plug.content
    }
    
    return jaTrans(text)
}


async function jaTrans(text:string) {
    if(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text)){
        return text
    }
    return await googleTrans(text,false, 'en','ja')
}
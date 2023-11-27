import { get } from "svelte/store"
import { translatorPlugin } from "../plugins/plugins"
import { DataBase } from "../storage/database"
import { globalFetch } from "../storage/globalApi"
import { alertError } from "../alert"

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

    return runTranslator(text, reverse, db.translator,db.aiModel.startsWith('novellist') ? 'ja' : 'en')
}

async function runTranslator(text:string, reverse:boolean, from:string,target:'en'|'ja') {
    const arg = {

        from: reverse ? from : target,

        to: reverse ? target : from,

        host: 'translate.googleapis.com',

    }
    const texts = text.split('\n')
    let chunks:[string,boolean][] = [['', true]]

    for(let i = 0; i < texts.length; i++){
        if( texts[i].startsWith('{{img')
            || texts[i].startsWith('{{raw')
            || texts[i].startsWith('{{video')
            || texts[i].startsWith('{{audio')
            && texts[i].endsWith('}}')
            || texts[i].length === 0){
            chunks.push([texts[i], false])
            chunks.push(["", true])
        }
        else{
            chunks[chunks.length-1][0] += texts[i]
        }
    }

    let fullResult:string[] = []

    for(const chunk of chunks){
        if(chunk[1]){
            const trimed = chunk[0].trim();
            if(trimed.length === 0){
                fullResult.push(chunk[0])
                continue
            }
            const result = await translateMain(trimed, arg);

            if(result.startsWith('ERR::')){
                alertError(result)
                return text
            }


            fullResult.push(result.trim())
        }
        else{
            fullResult.push(chunk[0])
        }
    }

    const result = fullResult.join("\n").trim()

    cache.origin.push(reverse ? result : text)
        
    cache.trans.push(reverse ? text : result)


    return result

}

async function translateMain(text:string, arg:{from:string, to:string, host:string}){
    let db = get(DataBase)

    if(db.translatorType === 'deepl'){
        //deepl raise error 525 because of cloudflare
        let url = db.deeplOptions.freeApi ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate"
        const f = await globalFetch(url, {
            headers: {
                "Authorization": "DeepL-Auth-Key " + db.deeplOptions.key,
            },
            body: {
                text: text,
                source_lang: arg.from.toLocaleUpperCase(),
                target_lang: arg.to.toLocaleUpperCase(),
            }
        })

        if(!f.ok){
            return 'ERR::DeepL API Error' + (await f.data)
        }
        return f.data.translations[0].text

    }


    const url = `https://${arg.host}/translate_a/single?client=gtx&dt=t&sl=${arg.from}&tl=${arg.to}&q=` + encodeURIComponent(text)



    const f = await fetch(url, {

        method: "GET",

    })

    const res = await f.json()

    

    if(typeof(res) === 'string'){

        return res as unknown as string

    }

    if((!res[0]) || res[0].length === 0){
        return text
    }

    const result = (res[0].map((s) => s[0]).filter(Boolean).join('') as string).replace(/\* ([^*]+)\*/g, '*$1*').replace(/\*([^*]+) \*/g, '*$1*');
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
    return await runTranslator(text, true, 'en','ja')
}



export async function translateHTML(html: string, reverse:boolean): Promise<string> {
    const dom = new DOMParser().parseFromString(html, 'text/html');
    console.log(html)

    let promises: Promise<void>[] = [];

    async function translateNodeText(node:Node) {
        if(node.textContent.trim().length !== 0){
            node.textContent = await translate(node.textContent || '', reverse);
        }
    }

    // Recursive function to translate all text nodes
    async function translateNode(node: Node, parent?: Node): Promise<void> {
        if (node.nodeType === Node.TEXT_NODE) {
            // Translate the text content of the node
            if(node.textContent && parent){
                const parentName = parent.nodeName.toLowerCase();
                if(parentName === 'script' || parentName === 'style'){
                    return
                }
                if(promises.length > 10){
                    await Promise.all(promises)
                    promises = []
                }
                promises.push(translateNodeText(node))
            }
        } else if(node.nodeType === Node.ELEMENT_NODE) {
            // Translate child nodes
            //skip if it's a script or style tag
            if(node.nodeName.toLowerCase() === 'script' || node.nodeName.toLowerCase() === 'style'){
                return
            }

            for (const child of Array.from(node.childNodes)) {
                await translateNode(child, node);
            }
        }
    }
    

    // Start translation from the body element
    await translateNode(dom.body);

    await Promise.all(promises)
    // Serialize the DOM back to HTML
    const serializer = new XMLSerializer();
    let translatedHTML = serializer.serializeToString(dom);
    // Remove the outer <body> tags
    translatedHTML = translatedHTML.replace(/^<body[^>]*>|<\/body>$/g, '');

    // console.log(html)
    // console.log(translatedHTML)
    // Return the translated HTML, excluding the outer <body> tags if needed
    return translatedHTML
}
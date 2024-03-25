import { get } from "svelte/store"
import { translatorPlugin } from "../plugins/plugins"
import { DataBase, type customscript } from "../storage/database"
import { globalFetch } from "../storage/globalApi"
import { alertError } from "../alert"
import { requestChatData } from "../process/request"
import { doingChat } from "../process"
import type { simpleCharacterArgument } from "../parser"
import { selectedCharID } from "../stores"
import { getModuleRegexScripts } from "../process/modules"

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

export async function runTranslator(text:string, reverse:boolean, from:string,target:string) {
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
    if(db.translatorType === 'llm'){
        const tr = db.translator || 'en'
        return translateLLM(text, {to: tr})
    }
    if(db.translatorType === 'deepl'){
        const body = {
            text: [text],
            target_lang: arg.to.toLocaleUpperCase(),
        }
        let url = db.deeplOptions.freeApi ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate"
        const f = await globalFetch(url, {
            headers: {
                "Authorization": "DeepL-Auth-Key " + db.deeplOptions.key,
                "Content-Type": "application/json"
            },
            body: body
        })

        if(!f.ok){
            return 'ERR::DeepL API Error' + (await f.data)
        }
        return f.data.translations[0].text

    }
    if(db.translatorType === 'deeplX'){
        let url = db.deeplXOptions.url;

        if(url.endsWith('/')){
            url = url.slice(0, -1)
        }

        if(!url.endsWith('/translate')){
            url += '/translate'
        }

        let headers = { "Content-Type": "application/json" }

        const body = {text: text, target_lang: arg.to.toLocaleUpperCase(), source_lang: arg.from.toLocaleUpperCase()}

    
        if(db.deeplXOptions.token.trim() !== '') { headers["Authorization"] = "Bearer " + db.deeplXOptions.token}
        
        //Since the DeepLX API is non-CORS restricted, we can use the plain fetch function
        const f = await globalFetch(url, { method: "POST", headers: headers, body: body, plainFetchForce:true })

        if(!f.ok){ return 'ERR::DeepLX API Error' + (await f.data) }

        const jsonResponse = JSON.stringify(f.data.data)
        return jsonResponse
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

export function isExpTranslator(){
    const db = get(DataBase)
    return db.translatorType === 'llm' || db.translatorType === 'deepl' || db.translatorType === 'deeplX'
}

export async function translateHTML(html: string, reverse:boolean, charArg:simpleCharacterArgument|string = ''): Promise<string> {
    let db = get(DataBase)
    let DoingChat = get(doingChat)
    if(DoingChat){
        if(isExpTranslator()){
            return html
        }
    }
    if(db.translatorType === 'llm'){
        const tr = db.translator || 'en'
        return translateLLM(html, {to: tr})
    }
    const dom = new DOMParser().parseFromString(html, 'text/html');
    console.log(html)

    let promises: Promise<void>[] = [];
    let translationChunks: {
        chunks: string[],
        resolvers: ((text:string) => void)[]
    }[] = [{
        chunks: [],
        resolvers: []
    }]

    async function translateTranslationChunks(force:boolean = false, additionalChunkLength = 0){
        const text: string = translationChunks[translationChunks.length-1].chunks.join('\n')

        if(!force && text.length + additionalChunkLength < 5000){
            return
        }

        const translated = await translate(text, reverse)

        const split = translated.split('\n')


        let i=0;
        let pointer = 0;
        let pointer2 = 0;
        let cl = ''
        console.log(split, translationChunks[translationChunks.length-1].chunks)
        while(i < split.length){
            const chunk = translationChunks[translationChunks.length-1]?.chunks?.[pointer]?.split('\n')
            if(!chunk){
                //error, should not happen. but if it does, just break the loop
                break
            }
            cl += split[i] + '\n'
            pointer2++

            if(chunk.length === pointer2){
                translationChunks[translationChunks.length-1].resolvers[pointer](cl.trim())
                pointer++
                pointer2 = 0
                cl = ''
            }
            i++
        }

        translationChunks[translationChunks.length-1].chunks = []
        translationChunks[translationChunks.length-1].resolvers = []


    }

    async function translateNodeText(node:Node) {
        if(node.textContent.trim().length !== 0){
            if(needSuperChunkedTranslate()){
                const prm = new Promise<string>((resolve) => {
                    translateTranslationChunks(false, node.textContent.length)
                    translationChunks[translationChunks.length-1].resolvers.push(resolve)
                    translationChunks[translationChunks.length-1].chunks.push(node.textContent)
                })
    
                node.textContent = await prm
                return
            }

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

    await translateTranslationChunks(true, 0)

    await Promise.all(promises)
    // Serialize the DOM back to HTML
    const serializer = new XMLSerializer();
    let translatedHTML = serializer.serializeToString(dom);
    // Remove the outer <body> tags
    translatedHTML = translatedHTML.replace(/^<body[^>]*>|<\/body>$/g, '');

    if(charArg !== ''){
        let scripts:customscript[] = []
        if(typeof(charArg) === 'string'){
            const db = get(DataBase)
            const charId = get(selectedCharID)
            const char = db.characters[charId]
            scripts = (getModuleRegexScripts() ?? []).concat(char?.customscript ?? [])
        }
        else{
            scripts = (getModuleRegexScripts() ?? []).concat(charArg?.customscript ?? [])

        }
        for(const script of scripts){
            if(script.type === 'edittrans'){
                const reg = new RegExp(script.in, script.ableFlag ? script.flag : 'g')
                let outScript = script.out.replaceAll("$n", "\n")
                translatedHTML = translatedHTML.replace(reg, outScript)
            }
        }

    }

    // console.log(html)
    // console.log(translatedHTML)
    // Return the translated HTML, excluding the outer <body> tags if needed
    return translatedHTML
}

function needSuperChunkedTranslate(){
    return false //not needed for now
}

let llmCache = new Map<string, string>()
async function translateLLM(text:string, arg:{to:string}){
    if(llmCache.has(text)){
        return llmCache.get(text)
    }
    const db = get(DataBase)
    let prompt = db.translatorPrompt || `You are a translator. translate the following html or text into {{slot}}. do not output anything other than the translation.`
    prompt = prompt.replace('{{slot}}', arg.to)
    const rq = await requestChatData({
        formated: [
            {
                'role': 'system',
                'content': prompt
            },
            {
                'role': 'user',
                'content': text
            }
        ],
        bias: {},
        useStreaming: false,
    }, 'submodel')

    if(rq.type === 'fail' || rq.type === 'streaming' || rq.type === 'multiline'){
        alertError(`${rq.result}`)
        return text
    }
    llmCache.set(text, rq.result)
    return rq.result
}
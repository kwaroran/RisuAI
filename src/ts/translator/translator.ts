import { get } from "svelte/store"
import { translatorPlugin } from "../plugins/plugins"
import { getDatabase, type character, type customscript, type groupChat } from "../storage/database.svelte"
import { globalFetch, isTauri } from "../storage/globalApi"
import { alertError } from "../alert"
import { requestChatData } from "../process/request"
import { doingChat, type OpenAIChat } from "../process"
import { applyMarkdownToNode, parseChatML, type simpleCharacterArgument } from "../parser"
import { selectedCharID } from "../stores"
import { getModuleRegexScripts } from "../process/modules"
import { getNodetextToSentence, sleep } from "../util"
import { processScriptFull } from "../process/scripts"

let cache={
    origin: [''],
    trans: ['']
}

let waitTrans = 0

export async function translate(text:string, reverse:boolean) {
    let db = getDatabase()
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
    let db = getDatabase()
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
        if(!db.noWaitForTranslate){
            if(waitTrans - Date.now() > 0){
                const waitTime = waitTrans - Date.now()
                waitTrans = Date.now() + 3000
                await sleep(waitTime)
            }
        }

        let url = db.deeplXOptions.url ?? 'http://localhost:1188'

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

        return f.data.data;
    }


    const url = `https://${arg.host}/translate_a/single?client=gtx&dt=t&sl=${db.translatorInputLanguage}&tl=${arg.to}&q=` + encodeURIComponent(text)



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
    const db = getDatabase()
    return db.translatorType === 'llm' || db.translatorType === 'deepl' || db.translatorType === 'deeplX'
}

export async function translateHTML(html: string, reverse:boolean, charArg:simpleCharacterArgument|string = '', chatID:number): Promise<string> {
    let alwaysExistChar: character | groupChat | simpleCharacterArgument;
    if(charArg !== ''){
        if(typeof(charArg) === 'string'){
            const db = getDatabase()
            const charId = get(selectedCharID)
            alwaysExistChar = db.characters[charId]
        }
        else{
            alwaysExistChar=charArg
        }
    } else {
        alwaysExistChar = {
            type: 'simple',
            customscript: [],
            virtualscript: null,
            emotionImages: [],
            chaId: 'simple'
        }
    }
    let db = getDatabase()
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
        if(translationChunks.length === 0 || !needSuperChunkedTranslate()){
            return
        }

        const currentChunk = translationChunks[translationChunks.length-1]
        const text: string = currentChunk.chunks.join('\n■\n')

        if(!force && text.length + additionalChunkLength < 5000){
            return
        }

        translationChunks.push({
            chunks: [],
            resolvers: []
        })

        if(!text){
            return
        }

        const translated = await translate(text, reverse)

        const split = translated.split('■')

        console.log(split.length, currentChunk.chunks.length)

        if(split.length !== currentChunk.chunks.length){
            //try translating one by one
            for(let i = 0; i < currentChunk.chunks.length; i++){
                currentChunk.resolvers[i](
                    await translate(currentChunk.chunks[i]
                , reverse))
            }
        }
        
        for(let i = 0; i < split.length; i++){
            console.log(split[i])
            currentChunk.resolvers[i](split[i])
        }


    }

    async function translateNodeText(node:Node, reprocessDisplayScript:boolean = false) {
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

            // node.textContent = await translate(node.textContent || '', reverse);
            let translated = await translate(node.textContent || "", reverse);
            if (!reprocessDisplayScript) {
                node.textContent = translated;
                return;
            }
            
            const { data: processedTranslated } = await processScriptFull(
                alwaysExistChar,
                translated,
                "editdisplay",
                chatID
            );
            // If the translation is the same, don't replace the node
            if (translated == processedTranslated) {
                node.textContent = processedTranslated;
                applyMarkdownToNode(node)
                return;
            }

            // Replace the old node with the new one
            const newNode = document.createElement(
                node.nodeType === Node.TEXT_NODE ? "span" : node.nodeName
            );
            newNode.innerHTML = processedTranslated;
            node.parentNode.replaceChild(newNode, node);
            applyMarkdownToNode(newNode);
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
            // combineTranslation feature
            if (
                db.combineTranslation &&
                node.nodeName.toLowerCase() === "p" &&
                node instanceof HTMLElement
            ) {
                const children = Array.from(node.childNodes);
                const blacklist = ["img", "iframe", "script", "style", "div", "button", "audio", "video"];
                const hasBlacklistChild = children.some((child) =>
                    blacklist.includes(child.nodeName.toLowerCase())
                );
                if (!hasBlacklistChild && (node as Element)?.getAttribute('translate') !== 'no'){
                    const text = getNodetextToSentence(node);
                    const sentences = text.split("\n");
                    if (sentences.length > 1) {
                        // Multiple sentences seperated by <br> tags
                        // reconstruct the p tag
                        node.innerHTML = "";
                        for (const sentence of sentences) {
                            const newNode = document.createElement("span");
                            newNode.textContent = sentence;
                            node.appendChild(newNode);
                            await translateNodeText(newNode, true);
                            node.appendChild(document.createElement("br"));
                        }
                    } else {
                        // Single sentence
                        node.innerHTML = sentences[0];
                        await translateNodeText(node, true);
                    }
                    return;
                }
            }

            for (const child of Array.from(node.childNodes)) {
                if(node.nodeType === Node.ELEMENT_NODE && (node as Element)?.getAttribute('translate') === 'no'){
                    continue
                }
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
    // Remove the outer <html|body|head> tags
    translatedHTML = translatedHTML.replace(/<\/?(html|body|head)[^>]*>/g, '');

    if(charArg !== ''){
        let scripts:customscript[] = []
        scripts = (getModuleRegexScripts() ?? []).concat(alwaysExistChar?.customscript ?? [])
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
    return getDatabase().translatorType === 'deeplX'
}

let llmCache = new Map<string, string>()
async function translateLLM(text:string, arg:{to:string}){
    if(llmCache.has(text)){
        return llmCache.get(text)
    }
    const styleDecodeRegex = /\<risu-style\>(.+?)\<\/risu-style\>/gms
    let styleDecodes:string[] = []
    text = text.replace(styleDecodeRegex, (match, p1) => {
        styleDecodes.push(p1)
        return `<style-data style-index="${styleDecodes.length-1}"></style-data>`
    })

    const db = getDatabase()
    const charIndex = get(selectedCharID)
    const currentChar = db.characters[charIndex]
    let translatorNote
    if (currentChar.type === "character") {
        translatorNote = currentChar.translatorNote ?? ""
    } else {
        translatorNote = ""
    }

    let formated:OpenAIChat[] = []
    let prompt = db.translatorPrompt || `You are a translator. translate the following html or text into {{slot}}. do not output anything other than the translation.`
    let parsedPrompt = parseChatML(prompt.replaceAll('{{slot}}', arg.to).replaceAll('{{solt::content}}', text).replaceAll('{{slot::tnote}}', translatorNote))
    if(parsedPrompt){
        formated = parsedPrompt
    }
    else{
        prompt = prompt.replaceAll('{{slot}}', arg.to).replaceAll('{{slot::tnote}}', translatorNote)
        formated = [
            {
                'role': 'system',
                'content': prompt
            },
            {
                'role': 'user',
                'content': text
            }
        ]
    }
    const rq = await requestChatData({
        formated,
        bias: {},
        useStreaming: false,
        noMultiGen: true,
        maxTokens: db.translatorMaxResponse,
    }, 'submodel')

    if(rq.type === 'fail' || rq.type === 'streaming' || rq.type === 'multiline'){
        alertError(`${rq.result}`)
        return text
    }
    const result = rq.result.replace(/<style-data style-index="(\d+)" ?\/?>/g, (match, p1) => {
        return styleDecodes[parseInt(p1)] ?? ''
    }).replace(/<\/style-data>/g, '')
    llmCache.set(text, result)
    return result
}
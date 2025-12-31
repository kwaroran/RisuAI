import { language } from "src/lang";
import { alertError, alertInput, alertNormal, alertSelect, alertStore } from "../alert";
import { requestChatData } from "../process/request/request";
import { checkCharOrder, globalFetch, saveAsset } from "../globalApi.svelte";
import { isTauri, isNodeServer, isCapacitor } from "src/ts/platform"
import { tokenize } from "../tokenizer";
import { createBlankChar } from "../characters";
import { getDatabase, setDatabase, type character } from "../storage/database.svelte";
import { sleep } from "../util";


type creationResult = { ok: false; data:string }|{ok:"creation";data:character}

async function createBotFromWebMain(prompt:string):Promise<creationResult>{



    const usp = new URLSearchParams()
    usp.append("q","fandom " + prompt)


    const bd = await globalFetch("https://lite.duckduckgo.com/lite/", {
        body: usp,
        rawResponse: true,
        headers: {
            'Content-Type': "application/x-www-form-urlencoded"
        }
    })
    if(!bd.ok){
        return {
            ok: false,
            data: bd.data
        }
    }
    const searchDom = new DOMParser()
    const searchDoc = searchDom.parseFromString(Buffer.from(bd.data).toString('utf-8'), 'text/html')
    const links = searchDoc.querySelectorAll(".link-text")
    let url = ''
    const fandomURL = /(.+?)\.fandom\.com\/wiki\//g
    const wikiggURL = /(.+?)\.wiki\.gg\/wiki\//g

    for(const link of links){
        try {
            let lurl = link.innerHTML.trim()
            if(fandomURL.test(lurl) || wikiggURL.test(lurl)){
                if(!lurl.startsWith("https://")){
                    lurl = "https://" + lurl
                }
                const surl = new URL(lurl)
                const charname = surl.pathname.split("/")[2].toLocaleLowerCase()
                if(charname.includes('main') ||charname.includes('home') || charname.includes('wiki')){
                    continue
                }
                url = lurl
                break
            }   
        } catch (error) {
            console.error(error)
        }
    }

    

    const surl = new URL(url)
    const urlPathName = surl.pathname.split("/")

    while(urlPathName.length > 3){
        urlPathName.pop()
    }
    surl.pathname = urlPathName.join('/')
    url = surl.toString()

    if(url === ''){
        return {
            ok: false,
            data: "Cannot find the character, is the character not popular, or did you misspelled?"
        }
    }

    let val = ''
    let imgID = ''
    const charname = url.split('/').at(-1)

    if(charname.toLocaleLowerCase().startsWith('main') || charname.toLocaleLowerCase().startsWith('wiki')){
        return {
            ok: false,
            data: "Cannot find the character, is the character not popular, or did you misspelled?"
        }
    }

    try {
        const v = await globalFetch(url, {rawResponse: true, method: 'GET'})
        if(!v.ok){
            throw ''
        }
        const parser = new DOMParser()

        const vdom = parser.parseFromString(Buffer.from(v.data).toString(), 'text/html')
        const imgDoms = vdom.querySelectorAll("#mw-content-text .mw-parser-output img")

        let qurl = ''
        let level = 0
        for(const dom of imgDoms){
            const thisLevel = dom.className.includes("thumbnail") ? 2 : 1
            if(thisLevel > level){
                qurl = dom.getAttribute("src") || qurl
                level = thisLevel
            }
        }

        if(qurl){
            const v = await globalFetch(qurl, {rawResponse: true, method: 'GET'})
            if(!v.ok){
                throw ''
            }
            imgID = await saveAsset(v.data)
        }


        await sleep(2000)
    } catch (error) {
        console.error(error)
    }


    try {
        const vurl = `https://bluearchive.fandom.com/api.php?action=visualeditor&format=json&paction=wikitext&page=${charname}&uselang=en&formatversion=2`
        const fv = await globalFetch(vurl)
        if(!fv.ok){
            throw ''
        }
        val = fv.data?.visualeditor?.content ?? ''
        if(val === ''){
            throw ''
        }
    } catch (error) {
        const rurl = url + '?action=edit'
        const v = await globalFetch(rurl, {rawResponse: true, method: 'GET'})

        if(!v.ok){
            console.log(v)
            return {
                ok: false,
                data: "Failed on Reading Site"
            }
        }
        
        const parser = new DOMParser()
        const vdom = parser.parseFromString(Buffer.from(v.data).toString(), 'text/html')
        const ta:HTMLTextAreaElement = vdom.querySelector('textarea#wpTextbox1')
    
        if((!ta) || (!ta.value)){
            console.log(vdom.body.outerHTML)
            return {
                ok: false,
                data: "Data cannot be found inside site."
            }
        }
    
        val = ta.value        
    }

    let tokns = await tokenize(val)
    if (tokns > 3200){
        const v = val.split('\n')
        let chunks:[string,string,number][] = [["main","",0]]

        for(const a of v){
            if(a.startsWith('==') && (a.endsWith('=='))){
                chunks.push([a, a + "\n", 0])
            }
            chunks.at(-1)[1] += a + "\n"
        }
        
        for(let i=0;i<chunks.length;i++){
            chunks[i][2] = await tokenize(chunks[i][1])
        }

        while(tokns > 3200){

            const ind = chunks.length-1

            tokns -= chunks[ind][2]

            chunks.splice(ind, 1)
        }

        val = chunks.map((v) => v[1]).join("\n")
    }


    alertStore.set({
        type: 'wait',
        msg: 'Loading..'
    })
    const rqv = val + "\n\n[[This was a character's wiki page data.]]"
    const ch = await requestChatData({
        formated: [{
            role: 'system',
            content: rqv
        },{
            role: 'system',
            content: "\n\n*Name*:\n*Age*:\n*gender*: \n*race*:\n*Hair style, color*:\n*color, shape of eye*:\n*Personality*:\n*Dress*:\n*Height (cm)*:\n*weight(kg)*:\n*Job*:\n*Specialty*:\n*Features*: \n*Likes*:\n*Dislikes*:\n*Character's background*: \n*Other informations*: \n\n[[This is a format that you must convert to. output the latest information If there is older information. If it is unknown, output as unknown. only output the converted result. now, output the converted result.]]"
        }],
        maxTokens: 600,
        temperature: 0,
        bias: {}
    }, 'submodel')

    if(ch.type === 'multiline' || ch.type === 'fail' || ch.type === 'streaming'){
        return {
            ok: false,
            data: "Request Fail: " + ch.result
        }
    }

    const char = createBlankChar()

    char.name = charname.replaceAll("_"," ")
    char.desc = ch.result
    char.creatorNotes = `Generated by Risuai, Data from ` + url
    if(imgID){
        char.image = imgID
    }
    return {
        ok: "creation",
        data: char
    }

    
}

async function createBotByAI(search:string):Promise<creationResult> {
    if(search.length < 3){
        return
    }
    const ch = await requestChatData({
        formated: [{
            role: 'user',
            content: search
        },{
            role: 'system',
            content: "\n\n*Name*:\n*Age*:\n*gender*: \n*race*:\n*Hair style, color*:\n*color, shape of eye*:\n*Personality*:\n*Dress*:\n*Height (cm)*:\n*weight(kg)*:\n*Job*:\n*Specialty*:\n*Features*: \n*Likes*:\n*Dislikes*:\n*Character's background*: \n*Other informations*: \n\n[[This is a format. you must create a character based on this format according to the user's prompt. Fill up every section. the result must be long and detailed. now, only output the generated result. output the generated result.]]"
        },],
        maxTokens: 800,
        temperature: 0.5,
        bias: {}
    }, 'submodel')

    if(ch.type === 'multiline' || ch.type === 'fail' || ch.type === 'streaming'){
        return {
            ok: false,
            data: "Request Fail: " + ch.result
        }
    }

    const res = ch.result.trim().split("\n")
    let charname = res[0].split(":").at(-1).trim()

    const char = createBlankChar()

    char.name = charname.replaceAll("_"," ")
    char.desc = ch.result
    char.creatorNotes = `Generated by Risuai from prompt: ` + search
    return {
        ok: "creation",
        data: char
    }
}


async function createFirstMsg(charDesc:string) {
    const v = await requestChatData({
        formated: [{
            role: "system",
            content: charDesc + `\n[This was the character's description]`
        },{
            role: "system",
            content: "Create and describe the situation where the character and {{user}} meet, reflecting about information of character and prompt. Line from {{user}} is not allowed."
        }],
        bias: {},
        maxTokens: 600,
        temperature: 0
    }, 'submodel')

    return v
}

async function createBotFromWeb() {
    const sel = parseInt(await alertSelect([language.createBotInternet, language.createBotAI]))
    if(sel === 0){
        if((!isTauri) && (!isNodeServer) && (!isCapacitor)){
            alertNormal(language.noweb)
            return
        }
    }

    let search = (await alertInput((sel === 0) ? language.createBotInternetAlert : language.inputBotGenerationPrompt))
    if(search.length < 3){
        return
    }
    alertStore.set({
        type: 'wait',
        msg: 'Fetching..'
    })
    const d = (sel === 0) ? (await createBotFromWebMain(search)) : (await createBotByAI(search))
    if(d.ok === 'creation'){
        const db = getDatabase()
        const cha = d.data
        const fm =  await createFirstMsg(cha.desc)
        if(fm.type === 'multiline' || fm.type === 'fail' || fm.type === 'streaming'){
            return {
                ok: false,
                data: "Request Fail: " + fm.result
            }
        }
        cha.firstMessage = surroundTextWithAsterisks(fm.result)
        db.characters.push(d.data)
        checkCharOrder()
        setDatabase(db)
        alertNormal(language.creationSuccess)
    }
    else{
        alertError(d.data)
    }
}

export const BotCreator = {
    createBotFromWeb
}

function surroundTextWithAsterisks(fulltext:string) {
    let result:string[] = []

    const splited = fulltext.split("\n")
    for(const text of splited){
        if(!text){
            result.push(text)
            continue
        }
        let output = '';
        let parts = text.split('"');
        for(let i = 0; i < parts.length; i++) {
            let part = parts[i];
            if(i % 2 === 0) {
                let trimmed = part.trim();
                output += trimmed ? '*' + trimmed + '*' : part;
            } else {
                output += '"' + part + '"';
            }
        }
        result.push(output)
    }

    return result.join('\n');
}

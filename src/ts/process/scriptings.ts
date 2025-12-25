import { asBuffer } from 'src/ts/util';
import { getChatVar, hasher, setChatVar, getGlobalChatVar, type simpleCharacterArgument, risuChatParser } from "../parser.svelte";
import { LuaEngine, LuaFactory } from "wasmoon";
import { getCurrentCharacter, getCurrentChat, getDatabase, setDatabase, type Chat, type character, type groupChat, type triggerscript } from "../storage/database.svelte";
import { get } from "svelte/store";
import { ReloadChatPointer, ReloadGUIPointer, selectedCharID } from "../stores.svelte";
import { alertSelect, alertError, alertInput, alertNormal, alertConfirm } from "../alert";
import { HypaProcesser } from "./memory/hypamemory";
import { generateAIImage } from "./stableDiff";
import { writeInlayImage, getInlayAsset } from "./files/inlays";
import type { OpenAIChat, MultiModal } from "./index.svelte";
import { requestChatData } from "./request/request";
import { v4 } from "uuid";
import { getModuleLorebooks, getModuleTriggers } from "./modules";
import { Mutex } from "../mutex";
import { tokenize } from "../tokenizer";
import { fetchNative, readImage } from "../globalApi.svelte";
import { loadLoreBookV3Prompt } from './lorebook.svelte';
import { getPersonaPrompt, getUserName, getUserIcon } from '../util';
let luaFactory:LuaFactory
let ScriptingSafeIds = new Set<string>()
let ScriptingEditDisplayIds = new Set<string>()
let ScriptingLowLevelIds = new Set<string>()
let lastRequestResetTime = 0
let lastRequestsCount = 0

interface BasicScriptingEngineState {
    code?: string;
    mutex: Mutex;
    chat?: Chat;
    setVar?: (key:string, value:string) => void,
    getVar?: (key:string) => string,
}

interface LuaScriptingEngineState extends BasicScriptingEngineState {
    engine?: LuaEngine;
    type: 'lua';
}

interface PythonScriptingEngineState extends BasicScriptingEngineState {
    pyodide?: PyodideContext
    type: 'py';
}

type ScriptingEngineState = LuaScriptingEngineState | PythonScriptingEngineState;

let ScriptingEngines = new Map<string, ScriptingEngineState>()
let luaFactoryPromise: Promise<void> | null = null;
let pendingEngineCreations = new Map<string, Promise<ScriptingEngineState>>();

export async function runScripted(code:string, arg:{
    char?:character|groupChat|simpleCharacterArgument,
    chat?:Chat
    data?: string|OpenAIChat[],
    setVar?: (key:string, value:string) => void,
    getVar?: (key:string) => string,
    lowLevelAccess?: boolean,
    meta?: object,
    mode?: string,
    type?: 'lua'|'py'
}){
    const type: 'lua'|'py' = arg.type ?? 'lua'
    const char = arg.char ?? getCurrentCharacter()
    const data = arg.data ?? ''
    const setVar = arg.setVar ?? setChatVar
    const getVar = arg.getVar ?? getChatVar
    const meta = arg.meta ?? {}
    const mode = arg.mode ?? 'manual'

    let chat = arg.chat ?? getCurrentChat()
    let stopSending = false
    let lowLevelAccess = arg.lowLevelAccess ?? false

    if(type === 'lua'){
        await ensureLuaFactory()
    }
    let ScriptingEngineState = await getOrCreateEngineState(mode, type);
    
    return await ScriptingEngineState.mutex.runExclusive(async () => {
        ScriptingEngineState.chat = chat
        ScriptingEngineState.setVar = setVar
        ScriptingEngineState.getVar = getVar
        if (code !== ScriptingEngineState.code) {
            let declareAPI:(name: string, func:Function) => void

            if(ScriptingEngineState.type === 'lua'){
                console.log('Creating new Lua engine for mode:', mode)
                ScriptingEngineState.engine?.global.close()
                ScriptingEngineState.code = code
                ScriptingEngineState.engine = await luaFactory.createEngine({injectObjects: true})
                const luaEngine = ScriptingEngineState.engine
                declareAPI = (name:string, func:Function) => {
                    luaEngine.global.set(name, func)
                }
            }
            if(ScriptingEngineState.type === 'py'){
                console.log('Creating new Pyodide context for mode:', mode)
                ScriptingEngineState.pyodide?.close()
                ScriptingEngineState.pyodide = new PyodideContext()
                declareAPI = (name:string, func:Function) => {
                    ScriptingEngineState.pyodide?.declareAPI(name, func as any)
                }
            }
            declareAPI('getChatVar', (id:string,key:string) => {
                return ScriptingEngineState.getVar(key)
            })
            declareAPI('setChatVar', (id:string,key:string, value:string) => {
                if(!ScriptingSafeIds.has(id) && !ScriptingEditDisplayIds.has(id)){
                    return
                }
                ScriptingEngineState.setVar(key, value)
            })
            declareAPI('getGlobalVar', (id:string, key:string) => {
                return getGlobalChatVar(key)
            })
            declareAPI('stopChat', (id:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                stopSending = true
            })
            declareAPI('alertError', (id:string, value:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                alertError(value)
            })
            declareAPI('alertNormal', (id:string, value:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                alertNormal(value)
            })
            declareAPI('alertInput', (id:string, value:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                return alertInput(value)
            })
            declareAPI('alertSelect', (id:string, value:string[]) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                return alertSelect(value)
            })
            declareAPI('alertConfirm', (id:string, value:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                return alertConfirm(value).then(res => res ? true : false)
            })

            declareAPI('getChatMain', (id:string, index:number) => {
                const chat = ScriptingEngineState.chat.message.at(index)
                if(!chat){
                    return JSON.stringify(null)
                }
                const data = {
                    role: chat.role,
                    data: chat.data,
                    time: chat.time ?? 0
                }
                return JSON.stringify(data)
            })

            declareAPI('setChat', (id:string, index:number, value:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                const message = ScriptingEngineState.chat.message?.at(index)
                if(message){
                    message.data = value ?? ''
                }
            })
            declareAPI('setChatRole', (id:string, index:number, value:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                const message = ScriptingEngineState.chat.message?.at(index)
                if(message){
                    message.role = value === 'user' ? 'user' : 'char'
                }
            })
            declareAPI('cutChat', (id:string, start:number, end:number) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                ScriptingEngineState.chat.message = ScriptingEngineState.chat.message.slice(start,end)
            })
            declareAPI('removeChat', (id:string, index:number) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                ScriptingEngineState.chat.message.splice(index, 1)
            })
            declareAPI('addChat', (id:string, role:string, value:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                let roleData:'user'|'char' = role === 'user' ? 'user' : 'char'
                ScriptingEngineState.chat.message.push({role: roleData, data: value ?? ''})
            })
            declareAPI('insertChat', (id:string, index:number, role:string, value:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                let roleData:'user'|'char' = role === 'user' ? 'user' : 'char'
                ScriptingEngineState.chat.message.splice(index, 0, {role: roleData, data: value ?? ''})
            })

            declareAPI('getTokens', async (id:string, value:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                return await tokenize(value)
            })

            declareAPI('getChatLength', (id:string) => {
                return ScriptingEngineState.chat.message.length
            })

            declareAPI('getFullChatMain', (id:string) => {
                const data = JSON.stringify(ScriptingEngineState.chat.message.map((v) => {
                    return {
                        role: v.role,
                        data: v.data,
                        time: v.time ?? 0
                    }
                }))
                return data
            })

            declareAPI('sleep', (id:string, time:number) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(true)
                    }, time)
                })
            })

            declareAPI('cbs', (value) => {
                return risuChatParser(value, { chara: getCurrentCharacter() })
            })
            
            declareAPI('setFullChatMain', (id:string, value:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                const realValue = JSON.parse(value)

                ScriptingEngineState.chat.message = realValue.map((v) => {
                    return {
                        role: v.role,
                        data: v.data
                    }
                })
            })

            declareAPI('logMain', (value:string) => {
                console.log(JSON.parse(value))
            })

            declareAPI('reloadDisplay', (id:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                ReloadGUIPointer.set(get(ReloadGUIPointer) + 1)
            })

            declareAPI('reloadChat', (id: string, index: number) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                ReloadChatPointer.update((v) => {
                    v[index] = (v[index] ?? 0) + 1
                    return v
                })
            })

            //Low Level Access
            declareAPI('similarity', async (id:string, source:string, value:string[]) => {
                if(!ScriptingLowLevelIds.has(id)){
                    return
                }
                const processer = new HypaProcesser()
                await processer.addText(value)
                return await processer.similaritySearch(source)
            })

            declareAPI('request', async (id:string, url:string) => {
                if(!ScriptingLowLevelIds.has(id)){
                    return
                }

                if(lastRequestResetTime + 60000 < Date.now()){
                    lastRequestsCount = 0
                    lastRequestResetTime = Date.now()
                }
                
                if(lastRequestsCount > 5){
                    return JSON.stringify({
                        status: 429,
                        data: 'Too many requests. you can request 5 times per minute'
                    })
                }

                lastRequestsCount++

                try {
                    //for security and other reasons, only get request in 120 char is allowed
                    if(url.length > 120){
                        return JSON.stringify({
                            status: 413,
                            data: 'URL to large. max is 120 characters'
                        })
                    }

                    if(!url.startsWith('https://')){
                        return JSON.stringify({
                            status: 400,
                            data: "Only https requests are allowed"
                        })
                    }

                    const bannedURL = [
                        "https://realm.risuai.net",
                        "https://risuai.net",
                        "https://risuai.xyz"
                    ]

                    for(const burl of bannedURL){

                        if(url.startsWith(burl)){
                            return JSON.stringify({
                                status: 400,
                                data: "request to " + url + ' is not allowed'
                            })
                        }
                    }

                    //browser fetch
                    const d = await fetchNative(url, {
                        method: "GET"
                    })
                    const text = await d.text()
                    return JSON.stringify({
                        status: d.status,
                        data: text
                    })

                } catch (error) {
                    return JSON.stringify({
                        status: 400,
                        data: 'internal error'
                    })
                }
            })

            declareAPI('generateImage', async (id:string, value:string, negValue:string = '') => {
                if(!ScriptingLowLevelIds.has(id)){
                    return
                }
                const gen = await generateAIImage(value, char as character, negValue, 'inlay')
                if(!gen){
                    return 'Error: Image generation failed'
                }
                const imgHTML = new Image()
                imgHTML.src = gen
                const inlay = await writeInlayImage(imgHTML)
                return `{{inlay::${inlay}}}`
            })

            declareAPI('getCharacterImageMain', async (id:string) => {
                try {
                    const db = getDatabase()
                    const selectedChar = get(selectedCharID)

                    if (selectedChar < 0 || selectedChar >= db.characters.length) {
                        return ''
                    }

                    const character = db.characters[selectedChar]
                    
                    if (!character || character.type === 'group' || !character.image) {
                        return ''
                    }
                    
                    const img = await readImage(character.image)
                    const imgObj = new Image()
                    const extention = character.image.split('.').at(-1)

                    imgObj.src = URL.createObjectURL(new Blob([asBuffer(img)], {type: `image/${extention}`}))

                    const imgid = await writeInlayImage(imgObj, { name: character.image, ext: extention, id: character.image})

                    if (imgid) {
                        return `{{inlayed::${imgid}}}`
                    }
                    console.warn('Failed to create character image inlay')
                    return ''
                } catch (error) {
                    console.error('Error in getCharacterImageMain:', error)
                    return ''
                }
            })

            declareAPI('getPersonaImageMain', async (id:string) => {
                try {
                    const icon = getUserIcon()

                    if(!icon) {
                        return ''
                    }

                    const img = await readImage(icon)
                    const imgObj = new Image()
                    const extention = icon.split('.').at(-1)

                    imgObj.src = URL.createObjectURL(new Blob([asBuffer(img)], {type: `image/${extention}`}))

                    const imgid = await writeInlayImage(imgObj, { name: icon, ext: extention, id: icon})

                    if (imgid) {
                        return `{{inlayed::${imgid}}}`
                    }
                    
                    console.warn('Failed to create character image inlay')
                    return ''
                } catch (error) {
                    console.error('Error in getCharacterImageMain:', error)
                    return ''
                }
            })

            declareAPI('hash', async (id:string, value:string) => {
                return await hasher(new TextEncoder().encode(value))
            })

            declareAPI('LLMMain', async (id:string, promptStr:string, useMultimodal: boolean = false) => {
                let prompt:{
                    role: string,
                    content: string
                }[] = JSON.parse(promptStr)
                if(!ScriptingLowLevelIds.has(id)){
                    return
                }
                let promptbody:OpenAIChat[] = prompt.map((dict) => {
                    let role:'system'|'user'|'assistant' = 'assistant'
                    switch(dict['role']){
                        case 'system':
                        case 'sys':
                            role = 'system'
                            break
                        case 'user':
                            role = 'user'
                            break
                        case 'assistant':
                        case 'bot':
                        case 'char':{
                            role = 'assistant'
                            break
                        }
                    }

                    return {
                        content: dict['content'] ?? '',
                        role: role,
                    }
                })

                if(useMultimodal) {
                    for(const msg of promptbody) {
                        const inlays:string[] = []
                        msg.content = msg.content.replace(/{{(inlay|inlayed|inlayeddata)::(.+?)}}/g, (
                            match: string,
                            p1: string,
                            p2: string
                        ) => {
                            if(msg.role === 'assistant') {
                                if(p2 && p1 === 'inlayeddata') {
                                    inlays.push(p2)
                                }
                            }
                            else {
                                if(p2) {
                                    inlays.push(p2)
                                }
                            }
                            return ''
                        })
                        
                        const multimodals: MultiModal[] = []
                        for(const inlay of inlays) {
                            const inlayData = await getInlayAsset(inlay)
                            multimodals.push({
                                type: inlayData?.type,
                                base64: inlayData?.data,
                                width: inlayData?.width,
                                height: inlayData?.height
                            })
                        }

                        msg.multimodals = multimodals.length > 0 ? multimodals : undefined
                    }
                }

                const result = await requestChatData({
                    formated: promptbody,
                    bias: {},
                    useStreaming: false,
                    noMultiGen: true,
                }, 'model')

                if(result.type === 'fail'){
                    return JSON.stringify({
                        success: false,
                        result: 'Error: ' + result.result
                    })
                }

                if(result.type === 'streaming' || result.type === 'multiline'){
                    return JSON.stringify({
                        success: false,
                        result: result.result
                    })
                }

                return JSON.stringify({
                    success: true,
                    result: result.result
                })
            })

            declareAPI('simpleLLM', async (id:string, prompt:string) => {
                if(!ScriptingLowLevelIds.has(id)){
                    return
                }
                const result = await requestChatData({
                    formated: [{
                        role: 'user',
                        content: prompt
                    }],
                    bias: {},
                    useStreaming: false,
                    noMultiGen: true,
                }, 'model')

                if(result.type === 'fail'){
                    return {
                        success: false,
                        result: 'Error: ' + result.result
                    }
                }

                if(result.type === 'streaming' || result.type === 'multiline'){
                    return {
                        success: false,
                        result: result.result
                    }
                }

                return {
                    success: true,
                    result: result.result
                }
            })
            
            declareAPI('getName', async (id:string) => {
                const db = getDatabase()
                const selectedChar = get(selectedCharID)
                const char = db.characters[selectedChar]
                return char.name
            })

            declareAPI('setName', async (id:string, name:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                const db = getDatabase()
                const selectedChar = get(selectedCharID)
                if(typeof name !== 'string'){
                    throw('Invalid data type')
                }
                db.characters[selectedChar].name = name
                setDatabase(db)
            })

            declareAPI('getDescription', async (id:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                const db = getDatabase()
                const selectedChar = get(selectedCharID)
                const char = db.characters[selectedChar]
                if(char.type === 'group'){
                    throw('Character is a group')
                }
                return char.desc
            })
            
            declareAPI('setDescription', async (id:string, desc:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                const db = getDatabase()
                const selectedChar = get(selectedCharID)
                const char =db.characters[selectedChar]
                if(typeof data !== 'string'){
                    throw('Invalid data type')
                }
                if(char.type === 'group'){
                    throw('Character is a group')
                }
                char.desc = desc
                db.characters[selectedChar] = char
                setDatabase(db)
            })

            declareAPI('getCharacterFirstMessage', async (id:string) => {
                const db = getDatabase()
                const selectedChar = get(selectedCharID)
                const char = db.characters[selectedChar]
                return char.firstMessage
            })

            declareAPI('setCharacterFirstMessage', async (id:string, data:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                const db = getDatabase()
                const selectedChar = get(selectedCharID)
                const char = db.characters[selectedChar]
                if(typeof data !== 'string'){
                    return false
                }
                char.firstMessage = data
                db.characters[selectedChar] = char
                setDatabase(db)
                return true
            })

            declareAPI('getPersonaName', (id:string) => {
                return getUserName()
            })

            declareAPI('getPersonaDescription', (id:string) => {
                const db = getDatabase()
                const selectedChar = get(selectedCharID)
                const char = db.characters[selectedChar]

                return risuChatParser(getPersonaPrompt(), { chara: char })
            })

            declareAPI('getAuthorsNote', (id:string) => {
                return ScriptingEngineState.chat?.note ?? ''
            })

            declareAPI('getBackgroundEmbedding', async (id:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                const db = getDatabase()
                const selectedChar = get(selectedCharID)
                const char = db.characters[selectedChar]
                return char.backgroundHTML
            })

            declareAPI('setBackgroundEmbedding', async (id:string, data:string) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }
                const db = getDatabase()
                const selectedChar = get(selectedCharID)
                if(typeof data !== 'string'){
                    return false
                }
                db.characters[selectedChar].backgroundHTML = data
                setDatabase(db)
                return true
            })

            // Lore books
            declareAPI('getLoreBooksMain', (id:string, search:string) => {
                const db = getDatabase()
                const selectedChar = db.characters[get(selectedCharID)]
                if (selectedChar.type !== 'character') {
                    return
                }

                const loreBooks = [...selectedChar.chats[selectedChar.chatPage]?.localLore ?? [], ...selectedChar.globalLore, ...getModuleLorebooks()]
                const found = loreBooks.filter((b) => b.comment === search)

                return JSON.stringify(found.map((b) => ({ ...b, content: risuChatParser(b.content, { chara: selectedChar }) })))
            })

            type upsertLoreBookOptions = {
                alwaysActive?: boolean
                insertOrder?: number
                key?: string
                secondKey?: string
                regex?: boolean
            }

            declareAPI('upsertLocalLoreBook', (id:string, name:string, content:string, options:upsertLoreBookOptions) => {
                if(!ScriptingSafeIds.has(id)){
                    return
                }

                if (char.type !== 'character') {
                    return
                }

                const {
                    alwaysActive = false,
                    insertOrder = 100,
                    key = '',
                    regex = false,
                    secondKey = '',
                } = options

                const currentChat = char.chats[char.chatPage]

                const newLocalLoreBooks = currentChat.localLore.filter((book) => book.comment !== name)
                newLocalLoreBooks.push({
                    alwaysActive,
                    comment: name,
                    content: content,
                    insertorder: insertOrder,
                    mode: 'normal',
                    key,
                    secondkey: secondKey,
                    selective: !!secondKey,
                    useRegex: regex,
                })
                currentChat.localLore = newLocalLoreBooks
            })

            declareAPI('loadLoreBooksMain', async (id:string, reserve:number) => {
                if(!ScriptingLowLevelIds.has(id)){
                    return
                }

                const db = getDatabase()

                const selectedChar = db.characters[get(selectedCharID)]

                if (selectedChar.type !== 'character') {
                    return
                }

                const fullLoreBooks = (await loadLoreBookV3Prompt()).actives
                const maxContext = db.maxContext - reserve
                if (maxContext < 0) {
                    return JSON.stringify([])
                }

                let totalTokens = 0
                const loreBooks = []

                for (const book of fullLoreBooks) {
                    const parsed = risuChatParser(book.prompt, { chara: selectedChar }).trim()
                    if (parsed.length === 0) {
                        continue
                    }

                    const tokens = await tokenize(parsed)

                    if (totalTokens + tokens > maxContext) {
                        break
                    }
                    totalTokens += tokens
                    loreBooks.push({
                        data: parsed,
                        role: book.role === 'assistant' ? 'char' : book.role,
                    })
                }

                return JSON.stringify(loreBooks)
            })

            declareAPI('axLLMMain', async (id:string, promptStr:string, useMultimodal: boolean = false) => {
                let prompt:{
                    role: string,
                    content: string
                }[] = JSON.parse(promptStr)
                if(!ScriptingLowLevelIds.has(id)){
                    return
                }
                let promptbody:OpenAIChat[] = prompt.map((dict) => {
                    let role:'system'|'user'|'assistant' = 'assistant'
                    switch(dict['role']){
                        case 'system':
                        case 'sys':
                            role = 'system'
                            break
                        case 'user':
                            role = 'user'
                            break
                        case 'assistant':
                        case 'bot':
                        case 'char':{
                            role = 'assistant'
                            break
                        }
                    }

                    return {
                        content: dict['content'] ?? '',
                        role: role,
                    }
                })

                if(useMultimodal) {
                    for(const msg of promptbody) {
                        const inlays:string[] = []
                        msg.content = msg.content.replace(/{{(inlay|inlayed|inlayeddata)::(.+?)}}/g, (
                            match: string,
                            p1: string,
                            p2: string
                        ) => {
                            if(msg.role === 'assistant') {
                                if(p2 && p1 === 'inlayeddata') {
                                    inlays.push(p2)
                                }
                            }
                            else {
                                if(p2) {
                                    inlays.push(p2)
                                }
                            }
                            return ''
                        })
                        
                        const multimodals: MultiModal[] = []
                        for(const inlay of inlays) {
                            const inlayData = await getInlayAsset(inlay)
                            multimodals.push({
                                type: inlayData?.type,
                                base64: inlayData?.data,
                                width: inlayData?.width,
                                height: inlayData?.height
                            })
                        }

                        msg.multimodals = multimodals.length > 0 ? multimodals : undefined
                    }
                }

                const result = await requestChatData({
                    formated: promptbody,
                    bias: {},
                    useStreaming: false,
                    noMultiGen: true,
                }, 'otherAx')

                if(result.type === 'fail'){
                    return JSON.stringify({
                        success: false,
                        result: 'Error: ' + result.result
                    })
                }

                if(result.type === 'streaming' || result.type === 'multiline'){
                    return JSON.stringify({
                        success: false,
                        result: result.result
                    })
                }

                return JSON.stringify({
                    success: true,
                    result: result.result
                })
            })

            declareAPI('getCharacterLastMessage', (id: string) => {
                const chat = ScriptingEngineState.chat
                if (!chat) {
                    return ''
                }

                const db = getDatabase()
                const selchar = db.characters[get(selectedCharID)]

                let pointer = chat.message.length - 1
                while (pointer >= 0) {
                    if (chat.message[pointer].role === 'char') {
                        const messageData = chat.message[pointer].data
                        return messageData
                    }
                    pointer--
                }

                return selchar.firstMessage
            })

            declareAPI('getUserLastMessage', (id: string) => {
                const chat = ScriptingEngineState.chat
                if (!chat) {
                    return ''
                }

                let pointer = chat.message.length - 1
                while (pointer >= 0) {
                    if (chat.message[pointer].role === 'user') {
                        const messageData = chat.message[pointer].data
                        return messageData
                    }
                    pointer--
                }

                return ''
            })

            declareAPI('getCharacterLastMessage', (id: string) => {
                const chat = ScriptingEngineState.chat
                if (!chat) {
                    return ''
                }

                const db = getDatabase()
                const selchar = db.characters[get(selectedCharID)]

                let pointer = chat.message.length - 1
                while (pointer >= 0) {
                    if (chat.message[pointer].role === 'char') {
                        const messageData = chat.message[pointer].data
                        return messageData
                    }
                    pointer--
                }

                return selchar.firstMessage
            })

            declareAPI('getUserLastMessage', (id: string) => {
                const chat = ScriptingEngineState.chat
                if (!chat) {
                    return ''
                }

                let pointer = chat.message.length - 1
                while (pointer >= 0) {
                    if (chat.message[pointer].role === 'user') {
                        const messageData = chat.message[pointer].data
                        return messageData
                    }
                    pointer--
                }
                return ''
            })

            console.log('Running Lua code:', code)
            if(ScriptingEngineState.type === 'lua'){
                await ScriptingEngineState.engine?.doString(luaCodeWrapper(code))
            }
            if(ScriptingEngineState.type === 'py'){
                await ScriptingEngineState.pyodide?.init(code)
            }
            ScriptingEngineState.code = code
        }
        let accessKey = v4()
        if(mode === 'editDisplay'){
            ScriptingEditDisplayIds.add(accessKey)
        }
        else{
            ScriptingSafeIds.add(accessKey)
            if(lowLevelAccess){
                ScriptingLowLevelIds.add(accessKey)
            }
        }
        let res:any
        if(ScriptingEngineState.type === 'lua'){
            const luaEngine = ScriptingEngineState.engine
            try {
                switch(mode){
                    case 'input':{
                        const func = luaEngine.global.get('onInput')
                        if(func){
                            res = await func(accessKey)
                        }
                        break
                    }
                    case 'output':{
                        const func = luaEngine.global.get('onOutput')
                        if(func){
                            res = await func(accessKey)
                        }
                        break
                    }
                    case 'start':{
                        const func = luaEngine.global.get('onStart')
                        if(func){
                            res = await func(accessKey)
                        }
                        break
                    }
                    case 'onButtonClick':{
                        const func = luaEngine.global.get('onButtonClick')
                        if(func){
                            res = await func(accessKey, data)
                        }
                        break
                    }
                    case 'onFormSubmit':{
                        const func = luaEngine.global.get('onFormSubmit')
                        if(func){
                            res = await func(accessKey, data, JSON.stringify(meta))
                        }
                        break
                    }
                    case 'editRequest':
                    case 'editDisplay':
                    case 'editInput':
                    case 'editOutput':{
                        const func = luaEngine.global.get('callListenMain')
                        if(func){
                            res = await func(mode, accessKey, JSON.stringify(data), JSON.stringify(meta))
                            res = JSON.parse(res)
                        }
                        break
                    }
                    default:{
                        const func = luaEngine.global.get(mode)
                        if(func){
                            res = await func(accessKey)
                        }
                        break
                    }
                }   
                if(res === false){
                    stopSending = true
                }
            } catch (error) {
                console.error(error)
            }
        }
        if(ScriptingEngineState.type === 'py'){
            switch(mode){
                case 'input':{
                    res = await ScriptingEngineState.pyodide?.python(`onInput('${accessKey}')`)
                    break
                }
                case 'output':{
                    res = await ScriptingEngineState.pyodide?.python(`onOutput('${accessKey}')`)
                    break
                }
                case 'start':{
                    res = await ScriptingEngineState.pyodide?.python(`onStart('${accessKey}')`)
                    break
                }
                case 'onButtonClick':{
                    res = await ScriptingEngineState.pyodide?.python(`onButtonClick('${accessKey}', '${data}')`)
                    break
                }
                case 'editRequest':
                case 'editDisplay':
                case 'editInput':
                case 'editOutput':{
                    res = await ScriptingEngineState.pyodide?.python(`callListenMain('${mode}', '${accessKey}', '${JSON.stringify(data)}', '${JSON.stringify(meta)}')`)
                    res = JSON.parse(res)
                    break
                }
                default:{
                    res = await ScriptingEngineState.pyodide?.python(`${mode}('${accessKey}')`)
                    break
                }
            }
        }
        ScriptingSafeIds.delete(accessKey)
        ScriptingLowLevelIds.delete(accessKey)
        chat = ScriptingEngineState.chat

        return {
            stopSending, chat, res
        }
    })
}

async function makeLuaFactory(){
    const _luaFactory = new LuaFactory()
    async function mountFile(name:string){
        let code = ''
        for(let i = 0; i < 3; i++){
            try {
                const res = await fetch('/lua/' + name)
                if(res.status >= 200 && res.status < 300){
                    code = await res.text()
                    break
                }
            } catch (error) {}
        }
        await _luaFactory.mountFile(name,code)
    }

    await mountFile('json.lua')
    luaFactory = _luaFactory
}

async function ensureLuaFactory() {
    if (luaFactory) return;
    
    if (luaFactoryPromise) {
        try {
            await luaFactoryPromise;
        } catch (error) {
            luaFactoryPromise = null;
        }
        return;
    }

    try {
        luaFactoryPromise = makeLuaFactory();
        await luaFactoryPromise;
    } finally {
        luaFactoryPromise = null;
    }
}

async function getOrCreateEngineState(
    mode: string, 
    type: 'lua'|'py'
): Promise<ScriptingEngineState> {
    let engineState = ScriptingEngines.get(mode);
    if (engineState) {
        return engineState;
    }
    
    let pendingCreation = pendingEngineCreations.get(mode);
    if (pendingCreation) {
        return pendingCreation;
    }
    
    const creationPromise = (async () => {
        const engineState: ScriptingEngineState = {
            mutex: new Mutex(),
            type: type,
        };
        ScriptingEngines.set(mode, engineState);
        
        pendingEngineCreations.delete(mode);
        
        return engineState;
    })();
    
    pendingEngineCreations.set(mode, creationPromise);
    
    return creationPromise;
}

function luaCodeWrapper(code:string){
    return `
json = require 'json'

function getChat(id, index)
    return json.decode(getChatMain(id, index))
end

function getFullChat(id)
    return json.decode(getFullChatMain(id))
end

function setFullChat(id, value)
    setFullChatMain(id, json.encode(value))
end

function log(value)
    logMain(json.encode(value))
end

function getLoreBooks(id, search)
    return json.decode(getLoreBooksMain(id, search))
end


function loadLoreBooks(id)
    return json.decode(loadLoreBooksMain(id):await())
end

function LLM(id, prompt, useMultimodal)
    useMultimodal = useMultimodal or false
    return json.decode(LLMMain(id, json.encode(prompt), useMultimodal):await())
end

function axLLM(id, prompt, useMultimodal)
    useMultimodal = useMultimodal or false
    return json.decode(axLLMMain(id, json.encode(prompt), useMultimodal):await())
end

function getCharacterImage(id)
    return getCharacterImageMain(id):await()
end

function getPersonaImage(id)
    return getPersonaImageMain(id):await()
end

local editRequestFuncs = {}
local editDisplayFuncs = {}
local editInputFuncs = {}
local editOutputFuncs = {}

function listenEdit(type, func)
    if type == 'editRequest' then
        editRequestFuncs[#editRequestFuncs + 1] = func
        return
    end

    if type == 'editDisplay' then
        editDisplayFuncs[#editDisplayFuncs + 1] = func
        return
    end

    if type == 'editInput' then
        editInputFuncs[#editInputFuncs + 1] = func
        return
    end

    if type == 'editOutput' then
        editOutputFuncs[#editOutputFuncs + 1] = func
        return
    end

    throw('Invalid type')
end

function getState(id, name)
    local escapedName = "__"..name
    return json.decode(getChatVar(id, escapedName))
end

function setState(id, name, value)
    local escapedName = "__"..name
    setChatVar(id, escapedName, json.encode(value))
end

function async(callback)
    return function(...)
        local co = coroutine.create(callback)
        local safe, result = coroutine.resume(co, ...)

        return Promise.create(function(resolve, reject)
            local checkresult
            local step = function()
                if coroutine.status(co) == "dead" then
                    local send = safe and resolve or reject
                    return send(result)
                end

                safe, result = coroutine.resume(co)
                checkresult()
            end

            checkresult = function()
                if safe and result == Promise.resolve(result) then
                    result:finally(step)
                else
                    step()
                end
            end

            checkresult()
        end)
    end
end

callListenMain = async(function(type, id, value, meta)
    local realValue = json.decode(value)
    local realMeta = json.decode(meta)

    if type == 'editRequest' then
        for _, func in ipairs(editRequestFuncs) do
            realValue = func(id, realValue, realMeta)
        end
    end

    if type == 'editDisplay' then
        for _, func in ipairs(editDisplayFuncs) do
            realValue = func(id, realValue, realMeta)
        end
    end

    if type == 'editInput' then
        for _, func in ipairs(editInputFuncs) do
            realValue = func(id, realValue, realMeta)
        end
    end

    if type == 'editOutput' then
        for _, func in ipairs(editOutputFuncs) do
            realValue = func(id, realValue, realMeta)
        end
    end

    return json.encode(realValue)
end)

${code}
`
}

export async function runLuaEditTrigger<T extends string|OpenAIChat[]>(char:character|groupChat|simpleCharacterArgument, mode:string, content:T, meta?:object):Promise<T>{
    switch(mode){
        case 'editinput':
            mode = 'editInput'
            break
        case 'editoutput':
            mode = 'editOutput'
            break
        case 'editdisplay':
            mode = 'editDisplay'
            break
        case 'editprocess':
            return content
    }

    try {
        let data = content

        const triggers = char.type === 'group' ? (getModuleTriggers()) : (char.triggerscript.map((v) => {
            v.lowLevelAccess = false
            return v
        }).concat(getModuleTriggers()))
    
        for(let trigger of triggers){
            if(trigger?.effect?.[0]?.type === 'triggerlua'){
                const runResult = await runScripted(trigger.effect[0].code, {
                    char: char,
                    lowLevelAccess: false,
                    mode: mode,
                    data,
                    meta,
                })
                data = runResult.res ?? data
            }
        }
        
    
        return data   
    } catch (error) {
        return content
    }
}

export async function runLuaButtonTrigger(char:character|simpleCharacterArgument, triggerKey:string):Promise<any>{
    let runResult
    try {
        const triggers = char.triggerscript.map<triggerscript>((v) => ({
            ...v,
            lowLevelAccess: char.type !== 'simple' ? char.lowLevelAccess ?? false : false
        })).concat(getModuleTriggers())

        for(let trigger of triggers){
            if(trigger?.effect?.[0]?.type === 'triggerlua'){
                runResult = await runScripted(trigger.effect[0].code, {
                    char: char,
                    data: triggerKey,
                    lowLevelAccess: trigger.lowLevelAccess,
                    mode: 'onButtonClick',
                })
            }
        }
    } catch (error) {
        throw(error)
    }
    return runResult   
}

export async function runLuaFormTrigger(char:character|simpleCharacterArgument, triggerKey:string, meta?:object):Promise<any>{
    let runResult
    try {
        const triggers = char.triggerscript.map<triggerscript>((v) => ({
            ...v,
            lowLevelAccess: char.type !== 'simple' ? char.lowLevelAccess ?? false : false
        })).concat(getModuleTriggers())

        for(let trigger of triggers){
            if(trigger?.effect?.[0]?.type === 'triggerlua'){
                runResult = await runScripted(trigger.effect[0].code, {
                    char: char,
                    data: triggerKey,
                    lowLevelAccess: trigger.lowLevelAccess,
                    meta,
                    mode: 'onFormSubmit',
                })
            }
        }
    } catch (error) {
        throw(error)
    }
    return runResult   
}

class PyodideContext{
    worker: Worker;
    apis: Record<string, (...args:any[]) => any> = {};
    inited: boolean = false;
    constructor(){
        this.worker = new Worker(new URL('./pyworker.ts', import.meta.url), {
            type: 'module'
        })
        this.worker.onmessage = (event:MessageEvent) => {
            if(event.data.type === 'call'){
                const { function: func, args, callId } = event.data;
                if(this.apis[func]){
                    this.apis[func](...args).then((result) => {
                        this.worker.postMessage({
                            type: 'functionResult',
                            callId: callId,
                            result: result
                        });
                    }).catch((error) => {
                        this.worker.postMessage({
                            type: 'error',
                            error: error.message,
                            id: callId
                        });
                    });
                } else {
                    this.worker.postMessage({
                        type: 'error',
                        error: `Function ${func} not found`,
                        id: callId
                    });
                }
            }
        }
    }
    async declareAPI(name:string, func:(...args:any[]) => any){
        this.apis[name] = func;
    }
    async init(code:string){
        if(this.inited){
            return;
        }
        const id = crypto.randomUUID();
        return new Promise<void>((resolve, reject) => {
            this.worker.onmessage = (event:MessageEvent) => {
                if(event.data.id !== id){
                    return
                }

                if(event.data.type === 'init'){
                    this.inited = true;
                    resolve();
                } else if(event.data.type === 'error'){
                    reject(new Error(event.data.error));
                }
            };
            this.worker.postMessage({
                type: 'init',
                code: code,
                id: id,
                moduleFunctions: Object.keys(this.apis)
            });
        });
    }
    async python(call:string){
        const id = crypto.randomUUID();
        return new Promise<any>((resolve, reject) => {
            this.worker.onmessage = (event:MessageEvent) => {
                if(event.data.id !== id){
                    return
                }

                if(event.data.type === 'python'){
                    resolve(event.data.call);
                } else if(event.data.type === 'error'){
                    reject(new Error(event.data.error));
                }
            };
            this.worker.postMessage({
                type: 'python',
                call: call,
                id: id
            });
        });
    }
    async close(){
        this.worker.terminate();
    }
}
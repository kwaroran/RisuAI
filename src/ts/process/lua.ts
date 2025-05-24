import { getChatVar, hasher, setChatVar, getGlobalChatVar, type simpleCharacterArgument, risuChatParser } from "../parser.svelte";
import { LuaEngine, LuaFactory } from "wasmoon";
import { getCurrentCharacter, getCurrentChat, getDatabase, setDatabase, type Chat, type character, type groupChat, type loreBook } from "../storage/database.svelte";
import { get } from "svelte/store";
import { ReloadGUIPointer, selectedCharID } from "../stores.svelte";
import { alertSelect, alertError, alertInput, alertNormal } from "../alert";
import { HypaProcesser } from "./memory/hypamemory";
import { generateAIImage } from "./stableDiff";
import { writeInlayImage } from "./files/inlays";
import type { OpenAIChat } from "./index.svelte";
import { requestChatData } from "./request";
import { v4 } from "uuid";
import { getModuleLorebooks, getModuleTriggers } from "./modules";
import { Mutex } from "../mutex";
import { tokenize } from "../tokenizer";
import { fetchNative } from "../globalApi.svelte";
import { loadLoreBookV3Prompt } from './lorebook.svelte';
import { getPersonaPrompt, getUserName } from '../util';

let luaFactory:LuaFactory
let LuaSafeIds = new Set<string>()
let LuaEditDisplayIds = new Set<string>()
let LuaLowLevelIds = new Set<string>()
let lastRequestResetTime = 0
let lastRequestsCount = 0

interface LuaEngineState {
    code?: string;
    engine?: LuaEngine;
    mutex: Mutex;
    chat?: Chat;
    setVar?: (key:string, value:string) => void,
    getVar?: (key:string) => string,
}

let LuaEngines = new Map<string, LuaEngineState>()
let luaFactoryPromise: Promise<void> | null = null;
let pendingEngineCreations = new Map<string, Promise<LuaEngineState>>();

export async function runLua(code:string, arg:{
    char?:character|groupChat|simpleCharacterArgument,
    chat?:Chat
    setVar?: (key:string, value:string) => void,
    getVar?: (key:string) => string,
    lowLevelAccess?: boolean,
    mode?: string,
    data?: any
}){
    const char = arg.char ?? getCurrentCharacter()
    const setVar = arg.setVar ?? setChatVar
    const getVar = arg.getVar ?? getChatVar
    const mode = arg.mode ?? 'manual'
    const data = arg.data ?? {}
    let chat = arg.chat ?? getCurrentChat()
    let stopSending = false
    let lowLevelAccess = arg.lowLevelAccess ?? false

    await ensureLuaFactory()
    let luaEngineState = await getOrCreateEngineState(mode);
    
    return await luaEngineState.mutex.runExclusive(async () => {
        luaEngineState.chat = chat
        luaEngineState.setVar = setVar
        luaEngineState.getVar = getVar
        if (code !== luaEngineState.code) {
            luaEngineState.engine?.global.close()
            luaEngineState.code = code
            luaEngineState.engine = await luaFactory.createEngine({injectObjects: true})
            const luaEngine = luaEngineState.engine
            luaEngine.global.set('getChatVar', (id:string,key:string) => {
                return luaEngineState.getVar(key)
            })
            luaEngine.global.set('setChatVar', (id:string,key:string, value:string) => {
                if(!LuaSafeIds.has(id) && !LuaEditDisplayIds.has(id)){
                    return
                }
                luaEngineState.setVar(key, value)
            })
            luaEngine.global.set('getGlobalVar', (id:string, key:string) => {
                return getGlobalChatVar(key)
            })
            luaEngine.global.set('stopChat', (id:string) => {
                if(!LuaSafeIds.has(id)){
                    return
                }
                stopSending = true
            })
            luaEngine.global.set('alertError', (id:string, value:string) => {
                if(!LuaSafeIds.has(id)){
                    return
                }
                alertError(value)
            })
            luaEngine.global.set('alertNormal', (id:string, value:string) => {
                if(!LuaSafeIds.has(id)){
                    return
                }
                alertNormal(value)
            })
            luaEngine.global.set('alertInput', (id:string, value:string) => {
                if(!LuaSafeIds.has(id)){
                    return
                }
                return alertInput(value)
            })
            luaEngine.global.set('alertSelect', (id:string, value:string[]) => {
                if(!LuaSafeIds.has(id)){
                    return
                }
                return alertSelect(value)
            })
            luaEngine.global.set('setChat', (id:string, index:number, value:string) => {
                if(!LuaSafeIds.has(id)){
                    return
                }
                const message = luaEngineState.chat.message?.at(index)
                if(message){
                    message.data = value
                }
            })
            luaEngine.global.set('setChatRole', (id:string, index:number, value:string) => {
                if(!LuaSafeIds.has(id)){
                    return
                }
                const message = luaEngineState.chat.message?.at(index)
                if(message){
                    message.role = value === 'user' ? 'user' : 'char'
                }
            })
            luaEngine.global.set('cutChat', (id:string, start:number, end:number) => {
                if(!LuaSafeIds.has(id)){
                    return
                }
                luaEngineState.chat.message = luaEngineState.chat.message.slice(start,end)
            })
            luaEngine.global.set('removeChat', (id:string, index:number) => {
                if(!LuaSafeIds.has(id)){
                    return
                }
                luaEngineState.chat.message.splice(index, 1)
            })
            luaEngine.global.set('addChat', (id:string, role:string, value:string) => {
                if(!LuaSafeIds.has(id)){
                    return
                }
                let roleData:'user'|'char' = role === 'user' ? 'user' : 'char'
                luaEngineState.chat.message.push({role: roleData, data: value})
            })
            luaEngine.global.set('insertChat', (id:string, index:number, role:string, value:string) => {
                if(!LuaSafeIds.has(id)){
                    return
                }
                let roleData:'user'|'char' = role === 'user' ? 'user' : 'char'
                luaEngineState.chat.message.splice(index, 0, {role: roleData, data: value})
            })
            luaEngine.global.set('getTokens', async (id:string, value:string) => {
                if(!LuaSafeIds.has(id)){
                    return
                }
                return await tokenize(value)
            })
            luaEngine.global.set('getChatLength', (id:string) => {
                return luaEngineState.chat.message.length
            })

            luaEngine.global.set('getFullChatMain', (id:string) => {
                const data = JSON.stringify(luaEngineState.chat.message.map((v) => {
                    return {
                        role: v.role,
                        data: v.data,
                        time: v.time ?? 0
                    }
                }))
                return data
            })

            luaEngine.global.set('setFullChatMain', (id:string, value:string) => {
                if(!LuaSafeIds.has(id)){
                    return
                }
                const realValue = JSON.parse(value)

                luaEngineState.chat.message = realValue.map((v) => {
                    return {
                        role: v.role,
                        data: v.data
                    }
                })
            })

            luaEngine.global.set('logMain', (value:string) => {
                console.log(JSON.parse(value))
            })

            luaEngine.global.set('reloadDisplay', (id:string) => {
                if(!LuaSafeIds.has(id)){
                    return
                }
                ReloadGUIPointer.set(get(ReloadGUIPointer) + 1)
            })

            //Low Level Access
            luaEngine.global.set('similarity', async (id:string, source:string, value:string[]) => {
                if(!LuaLowLevelIds.has(id)){
                    return
                }
                const processer = new HypaProcesser()
                await processer.addText(value)
                return await processer.similaritySearch(source)
            })

            luaEngine.global.set('request', async (id:string, url:string) => {
                if(!LuaLowLevelIds.has(id)){
                    return
                }

                if(lastRequestResetTime + 60000 < Date.now()){
                    lastRequestsCount = 0
                    lastRequestResetTime = Date.now()
                }
                
                if(lastRequestsCount > 5){
                    return {
                        status: 429,
                        data: 'Too many requests. you can request 5 times per minute'
                    }
                }

                lastRequestsCount++

                try {
                    //for security and other reasons, only get request in 120 char is allowed
                    if(url.length > 120){
                        return {
                            status: 413,
                            data: 'URL to large. max is 120 characters'
                        }
                    }

                    if(!url.startsWith('https://')){
                        return {
                            status: 400,
                            data: "Only https requests are allowed"
                        }
                    }

                    const bannedURL = [
                        "https://realm.risuai.net",
                        "https://risuai.net",
                        "https://risuai.xyz"
                    ]

                    for(const burl of bannedURL){

                        if(url.startsWith(burl)){
                            return {
                                status: 400,
                                data: "request to " + url + ' is not allowed'
                            }
                        }
                    }

                    //browser fetch
                    const d = await fetchNative(url, {
                        method: "GET"
                    })
                    const text = await d.text()
                    return {
                        status: d.status,
                        data: text
                    }

                } catch (error) {
                    return {
                        status: 400,
                        data: 'internal error'
                    }
                }
            })

            luaEngine.global.set('generateImage', async (id:string, value:string, negValue:string = '') => {
                if(!LuaLowLevelIds.has(id)){
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

            luaEngine.global.set('hash', async (id:string, value:string) => {
                return await hasher(new TextEncoder().encode(value))
            })

            luaEngine.global.set('LLMMain', async (id:string, promptStr:string) => {
                let prompt:{
                    role: string,
                    content: string
                }[] = JSON.parse(promptStr)
                if(!LuaLowLevelIds.has(id)){
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

            luaEngine.global.set('simpleLLM', async (id:string, prompt:string) => {
                if(!LuaLowLevelIds.has(id)){
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
            
            luaEngine.global.set('getName', async (id:string) => {
                const db = getDatabase()
                const selectedChar = get(selectedCharID)
                const char = db.characters[selectedChar]
                return char.name
            })

            luaEngine.global.set('setName', async (id:string, name:string) => {
                if(!LuaSafeIds.has(id)){
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

            luaEngine.global.set('getDescription', async (id:string) => {
                if(!LuaSafeIds.has(id)){
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
            
            luaEngine.global.set('setDescription', async (id:string, desc:string) => {
                if(!LuaSafeIds.has(id)){
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

            luaEngine.global.set('getCharacterFirstMessage', async (id:string) => {
                const db = getDatabase()
                const selectedChar = get(selectedCharID)
                const char = db.characters[selectedChar]
                return char.firstMessage
            })

            luaEngine.global.set('setCharacterFirstMessage', async (id:string, data:string) => {
                if(!LuaSafeIds.has(id)){
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

            luaEngine.global.set('getPersonaName', (id:string) => {
                return getUserName()
            })

            luaEngine.global.set('getPersonaDescription', (id:string) => {
                const db = getDatabase()
                const selectedChar = get(selectedCharID)
                const char = db.characters[selectedChar]

                return risuChatParser(getPersonaPrompt(), { chara: char })
            })

            luaEngine.global.set('getAuthorsNote', (id:string) => {
                return luaEngineState.chat?.note ?? ''
            })

            luaEngine.global.set('getBackgroundEmbedding', async (id:string) => {
                if(!LuaSafeIds.has(id)){
                    return
                }
                const db = getDatabase()
                const selectedChar = get(selectedCharID)
                const char = db.characters[selectedChar]
                return char.backgroundHTML
            })

            luaEngine.global.set('setBackgroundEmbedding', async (id:string, data:string) => {
                if(!LuaSafeIds.has(id)){
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
            luaEngine.global.set('getLoreBooksMain', (id:string, search: string) => {
                const db = getDatabase()
                const selectedChar = db.characters[get(selectedCharID)]
                if (selectedChar.type !== 'character') {
                    return
                }

                const loreBooks = [...selectedChar.chats[selectedChar.chatPage]?.localLore ?? [], ...selectedChar.globalLore, ...getModuleLorebooks()]
                const found = loreBooks.filter((b) => b.comment === search)

                return JSON.stringify(found.map((b) => ({ ...b, content: risuChatParser(b.content, { chara: selectedChar }) })))
            })

            luaEngine.global.set('loadLoreBooksMain', async (id:string, reserve:number) => {
                if(!LuaLowLevelIds.has(id)){
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

            luaEngine.global.set('axLLMMain', async (id:string, promptStr:string) => {
                let prompt:{
                    role: string,
                    content: string
                }[] = JSON.parse(promptStr)
                if(!LuaLowLevelIds.has(id)){
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

            await luaEngine.doString(luaCodeWarper(code))
            luaEngineState.code = code
        }
        let accessKey = v4()
        if(mode === 'editDisplay'){
            LuaEditDisplayIds.add(accessKey)
        }
        else{
            LuaSafeIds.add(accessKey)
            if(lowLevelAccess){
                LuaLowLevelIds.add(accessKey)
            }
        }
        let res:any
        const luaEngine = luaEngineState.engine
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
                case 'editRequest':
                case 'editDisplay':
                case 'editInput':
                case 'editOutput':{
                    const func = luaEngine.global.get('callListenMain')
                    if(func){
                        res = await func(mode, accessKey, JSON.stringify(data))
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

        LuaSafeIds.delete(accessKey)
        LuaLowLevelIds.delete(accessKey)
        chat = luaEngineState.chat

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
): Promise<LuaEngineState> {
    let engineState = LuaEngines.get(mode);
    if (engineState) {
        return engineState;
    }
    
    let pendingCreation = pendingEngineCreations.get(mode);
    if (pendingCreation) {
        return pendingCreation;
    }
    
    const creationPromise = (async () => {
        const engineState: LuaEngineState = {
            mutex: new Mutex(),
        };
        LuaEngines.set(mode, engineState);
        
        pendingEngineCreations.delete(mode);
        
        return engineState;
    })();
    
    pendingEngineCreations.set(mode, creationPromise);
    
    return creationPromise;
}

function luaCodeWarper(code:string){
    return `
json = require 'json'

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

function LLM(id, prompt)
    return json.decode(LLMMain(id, json.encode(prompt)):await())
end

function axLLM(id, prompt)
    return json.decode(axLLMMain(id, json.encode(prompt)):await())
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

callListenMain = async(function(type, id, value)
    local realValue = json.decode(value)

    if type == 'editRequest' then
        for _, func in ipairs(editRequestFuncs) do
            realValue = func(id, realValue)
        end
    end

    if type == 'editDisplay' then
        for _, func in ipairs(editDisplayFuncs) do
            realValue = func(id, realValue)
        end
    end

    if type == 'editInput' then
        for _, func in ipairs(editInputFuncs) do
            realValue = func(id, realValue)
        end
    end

    if type == 'editOutput' then
        for _, func in ipairs(editOutputFuncs) do
            realValue = func(id, realValue)
        end
    end

    return json.encode(realValue)
end)

${code}
`
}

export async function runLuaEditTrigger<T extends any>(char:character|groupChat|simpleCharacterArgument, mode:string, content:T):Promise<T>{
    let data = content

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
        const triggers = char.type === 'group' ? (getModuleTriggers()) : (char.triggerscript.map((v) => {
            v.lowLevelAccess = false
            return v
        }).concat(getModuleTriggers()))
    
        for(let trigger of triggers){
            if(trigger?.effect?.[0]?.type === 'triggerlua'){
                const runResult = await runLua(trigger.effect[0].code, {
                    char: char,
                    lowLevelAccess: false,
                    mode: mode,
                    data: data
                })
                data = runResult.res ?? data
            }
        }
        
    
        return data   
    } catch (error) {
        return content
    }
}

export async function runLuaButtonTrigger(char:character|groupChat|simpleCharacterArgument, data:string):Promise<any>{
    let runResult
    try {
        const triggers = char.type === 'group' ? getModuleTriggers() : char.triggerscript.concat(getModuleTriggers())
        const lowLevelAccess = char.type !== 'simple' ? char.lowLevelAccess ?? false : false
        for(let trigger of triggers){
            if(trigger?.effect?.[0]?.type === 'triggerlua'){
                runResult = await runLua(trigger.effect[0].code, {
                    char: char,
                    lowLevelAccess: lowLevelAccess,
                    mode: 'onButtonClick',
                    data: data
                })
            }
        }
    } catch (error) {
        throw(error)
    }
    return runResult   
}

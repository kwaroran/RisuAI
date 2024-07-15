import { getChatVar, risuChatParser, setChatVar, type simpleCharacterArgument } from "../parser";
import { LuaEngine, LuaFactory } from "wasmoon";
import { DataBase, setDatabase, type Chat, type character, type groupChat } from "../storage/database";
import { get } from "svelte/store";
import { CurrentCharacter, CurrentChat, selectedCharID } from "../stores";
import { alertError, alertInput, alertNormal } from "../alert";
import { HypaProcesser } from "./memory/hypamemory";
import { generateAIImage } from "./stableDiff";
import { writeInlayImage } from "./files/image";
import type { OpenAIChat } from ".";
import { requestChatData } from "./request";
import { v4 } from "uuid";
import { getModuleTriggers } from "./modules";

let luaFactory:LuaFactory
let luaEngine:LuaEngine
let lastCode = ''
let LuaSafeIds = new Set<string>()
let LuaEditDisplayIds = new Set<string>()
let LuaLowLevelIds = new Set<string>()

export async function runLua(code:string, arg:{
    char?:character|groupChat|simpleCharacterArgument,
    chat?:Chat
    setVar?: (key:string, value:string) => void,
    getVar?: (key:string) => string,
    lowLevelAccess?: boolean,
    mode?: string,
    data?: any
}){
    const char = arg.char ?? get(CurrentCharacter)
    const setVar = arg.setVar ?? setChatVar
    const getVar = arg.getVar ?? getChatVar
    const mode = arg.mode ?? 'manual'
    const data = arg.data ?? {}
    let chat = arg.chat ?? get(CurrentChat)
    let stopSending = false
    let lowLevelAccess = arg.lowLevelAccess ?? false

    if(!luaEngine || lastCode !== code){
        if(luaEngine){
            luaEngine.global.close()
        }
        if(!luaFactory){
            makeLuaFactory()
        }
        luaEngine = await luaFactory.createEngine()
        luaEngine.global.set('setChatVar', (id:string,key:string, value:string) => {
            if(!LuaSafeIds.has(id) && !LuaEditDisplayIds.has(id)){
                return
            }
            setVar(key, value)
        })
        luaEngine.global.set('getChatVar', (id:string,key:string) => {
            if(!LuaSafeIds.has(id) && !LuaEditDisplayIds.has(id)){
                return
            }
            return getVar(key)
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
        luaEngine.global.set('setChat', (id:string, index:number, value:string) => {
            if(!LuaSafeIds.has(id)){
                return
            }
            const message = chat.message?.at(index)
            if(message){
                message.data = value
            }
            CurrentChat.set(chat)
        })
        luaEngine.global.set('setChatRole', (id:string, index:number, value:string) => {
            if(!LuaSafeIds.has(id)){
                return
            }
            const message = chat.message?.at(index)
            if(message){
                message.role = value === 'user' ? 'user' : 'char'
            }
            CurrentChat.set(chat)
        })
        luaEngine.global.set('cutChat', (id:string, start:number, end:number) => {
            if(!LuaSafeIds.has(id)){
                return
            }
            chat.message = chat.message.slice(start,end)
            CurrentChat.set(chat)
        })
        luaEngine.global.set('removeChat', (id:string, index:number) => {
            if(!LuaSafeIds.has(id)){
                return
            }
            chat.message.splice(index, 1)
            CurrentChat.set(chat)
        })
        luaEngine.global.set('addChat', (id:string, role:string, value:string) => {
            if(!LuaSafeIds.has(id)){
                return
            }
            let roleData:'user'|'char' = role === 'user' ? 'user' : 'char'
            chat.message.push({role: roleData, data: value})
            CurrentChat.set(chat)
        })
        luaEngine.global.set('insertChat', (id:string, index:number, role:string, value:string) => {
            if(!LuaSafeIds.has(id)){
                return
            }
            let roleData:'user'|'char' = role === 'user' ? 'user' : 'char'
            chat.message.splice(index, 0, {role: roleData, data: value})
            CurrentChat.set(chat)
        })
        luaEngine.global.set('removeChat', (id:string, index:number) => {
            if(!LuaSafeIds.has(id)){
                return
            }
            chat.message.splice(index, 1)
            CurrentChat.set(chat)
        })
        luaEngine.global.set('getChatLength', (id:string) => {
            if(!LuaSafeIds.has(id)){
                return
            }
            return chat.message.length
        })
        luaEngine.global.set('getFullChatMain', (id:string) => {
            const data = JSON.stringify(chat.message.map((v) => {
                return {
                    role: v.role,
                    data: v.data
                }
            }))
            return data
        })

        luaEngine.global.set('setFullChatMain', (id:string, value:string) => {
            const realValue = JSON.parse(value)
            if(!LuaSafeIds.has(id)){
                return
            }
            chat.message = realValue.map((v) => {
                return {
                    role: v.role,
                    data: v.data
                }
            })
            CurrentChat.set(chat)
        })

        luaEngine.global.set('logMain', (value:string) => {
            console.log(JSON.parse(value))
        })

        //Low Level Access
        luaEngine.global.set('similarity', (id:string, source:string, value:string[]) => {
            if(!LuaLowLevelIds.has(id)){
                return
            }
            const processer = new HypaProcesser('MiniLM')
            processer.addText(value)
            return processer.similaritySearch(source)
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
            if(!LuaSafeIds.has(id)){
                return
            }
            const db = get(DataBase)
            const selectedChar = get(selectedCharID)
            const char = db.characters[selectedChar]
            return char.name
        })

        luaEngine.global.set('setName', async (id:string, name:string) => {
            if(!LuaSafeIds.has(id)){
                return
            }
            const db = get(DataBase)
            const selectedChar = get(selectedCharID)
            if(typeof name !== 'string'){
                throw('Invalid data type')
            }
            db.characters[selectedChar].name = name
            setDatabase(db)
        })

        luaEngine.global.set('setDescription', async (id:string, desc:string) => {
            if(!LuaSafeIds.has(id)){
                return
            }
            const db = get(DataBase)
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

        luaEngine.global.set('setCharacterFirstMessage', async (id:string, data:string) => {
            if(!LuaSafeIds.has(id)){
                return
            }
            const db = get(DataBase)
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

        luaEngine.global.set('getCharacterFirstMessage', async (id:string) => {
            if(!LuaSafeIds.has(id)){
                return
            }
            const db = get(DataBase)
            const selectedChar = get(selectedCharID)
            const char = db.characters[selectedChar]
            return char.firstMessage
        })

        luaEngine.global.set('getBackgroundEmbedding', async (id:string) => {
            if(!LuaSafeIds.has(id)){
                return
            }
            const db = get(DataBase)
            const selectedChar = get(selectedCharID)
            const char = db.characters[selectedChar]
            return char.backgroundHTML
        })

        luaEngine.global.set('setBackgroundEmbedding', async (id:string, data:string) => {
            if(!LuaSafeIds.has(id)){
                return
            }
            const db = get(DataBase)
            const selectedChar = get(selectedCharID)
            if(typeof data !== 'string'){
                return false
            }
            db.characters[selectedChar].backgroundHTML = data
            setDatabase(db)
            return true
        })

        await luaEngine.doString(luaCodeWarper(code))
        lastCode = code
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
    try {
        switch(mode){
            case 'input':{
                const func = luaEngine.global.get('onInput')
                if(func){
                    res = await func(accessKey)
                }
            }
            case 'output':{
                const func = luaEngine.global.get('onOutput')
                if(func){
                    res = await func(accessKey)
                }
            }
            case 'start':{
                const func = luaEngine.global.get('onStart')
                if(func){
                    res = await func(accessKey)
                }
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
            }
            default:{
                const func = luaEngine.global.get(mode)
                if(func){
                    res = await func(accessKey)
                }
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

    return {
        stopSending, chat, res
    }
}

async function makeLuaFactory(){
    luaFactory = new LuaFactory()
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
        await luaFactory.mountFile(name,code)
    }

    await mountFile('json.lua')
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

function LLM(id, prompt)
    return json.decode(LLMMain(id, json.encode(prompt)))
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

function callListenMain(type, id, value)
    local realValue = json.decode(value)

    if type == 'editRequest' then
        for _, func in ipairs(editRequestFuncs) do
            realValue = func(id, realValue)
        end
    end

    if type == 'editDisplay' then
        for _, func in ipairs(editDisplayFuncs) do
            realValue = func(id, realValue)
            print(realValue)
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
end

function getState(id, name)
    local escapedName = "__"..name
    return json.decode(getChatVar(id, escapedName))
end

function setState(id, name, value)
    local escapedName = "__"..name
    setChatVar(id, escapedName, json.encode(value))
end


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
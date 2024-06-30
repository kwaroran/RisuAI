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
            LuaLowLevelIds.add(v4())
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
        
        alertError('Lua Error: ' + error)
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
    await luaFactory.mountFile(`json.lua`,String.raw`
--
-- json.lua
--
-- Copyright (c) 2020 rxi
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy of
-- this software and associated documentation files (the "Software"), to deal in
-- the Software without restriction, including without limitation the rights to
-- use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
-- of the Software, and to permit persons to whom the Software is furnished to do
-- so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in all
-- copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.
--
local json = { _version = "0.1.2" }
-------------------------------------------------------------------------------
-- Encode
-------------------------------------------------------------------------------
local encode
local escape_char_map = {
    [ "\\" ] = "\\",
    [ "\"" ] = "\"",
    [ "\b" ] = "b",
    [ "\f" ] = "f",
    [ "\n" ] = "n",
    [ "\r" ] = "r",
    [ "\t" ] = "t",
}
local escape_char_map_inv = { [ "/" ] = "/" }
for k, v in pairs(escape_char_map) do
    escape_char_map_inv[v] = k
end
local function escape_char(c)
    return "\\" .. (escape_char_map[c] or string.format("u%04x", c:byte()))
end
local function encode_nil(val)
    return "null"
end
local function encode_table(val, stack)
    local res = {}
    stack = stack or {}
    -- Circular reference?
    if stack[val] then error("circular reference") end
    stack[val] = true
    if rawget(val, 1) ~= nil or next(val) == nil then
    -- Treat as array -- check keys are valid and it is not sparse
    local n = 0
    for k in pairs(val) do
        if type(k) ~= "number" then
        error("invalid table: mixed or invalid key types")
        end
        n = n + 1
    end
    if n ~= #val then
        error("invalid table: sparse array")
    end
    -- Encode
    for i, v in ipairs(val) do
        table.insert(res, encode(v, stack))
    end
    stack[val] = nil
    return "[" .. table.concat(res, ",") .. "]"
    else
    -- Treat as an object
    for k, v in pairs(val) do
        if type(k) ~= "string" then
        error("invalid table: mixed or invalid key types")
        end
        table.insert(res, encode(k, stack) .. ":" .. encode(v, stack))
    end
    stack[val] = nil
    return "{" .. table.concat(res, ",") .. "}"
    end
end
local function encode_string(val)
    return '"' .. val:gsub('[%z\1-\31\\"]', escape_char) .. '"'
end
local function encode_number(val)
    -- Check for NaN, -inf and inf
    if val ~= val or val <= -math.huge or val >= math.huge then
    error("unexpected number value '" .. tostring(val) .. "'")
    end
    return string.format("%.14g", val)
end
local type_func_map = {
    [ "nil"     ] = encode_nil,
    [ "table"   ] = encode_table,
    [ "string"  ] = encode_string,
    [ "number"  ] = encode_number,
    [ "boolean" ] = tostring,
}
encode = function(val, stack)
    local t = type(val)
    local f = type_func_map[t]
    if f then
    return f(val, stack)
    end
    error("unexpected type '" .. t .. "'")
end
function json.encode(val)
    return ( encode(val) )
end
-------------------------------------------------------------------------------
-- Decode
-------------------------------------------------------------------------------
local parse
local function create_set(...)
    local res = {}
    for i = 1, select("#", ...) do
    res[ select(i, ...) ] = true
    end
    return res
end
local space_chars   = create_set(" ", "\t", "\r", "\n")
local delim_chars   = create_set(" ", "\t", "\r", "\n", "]", "}", ",")
local escape_chars  = create_set("\\", "/", '"', "b", "f", "n", "r", "t", "u")
local literals      = create_set("true", "false", "null")
local literal_map = {
    [ "true"  ] = true,
    [ "false" ] = false,
    [ "null"  ] = nil,
}
local function next_char(str, idx, set, negate)
    for i = idx, #str do
    if set[str:sub(i, i)] ~= negate then
        return i
    end
    end
    return #str + 1
end
local function decode_error(str, idx, msg)
    local line_count = 1
    local col_count = 1
    for i = 1, idx - 1 do
    col_count = col_count + 1
    if str:sub(i, i) == "\n" then
        line_count = line_count + 1
        col_count = 1
    end
    end
    error( string.format("%s at line %d col %d", msg, line_count, col_count) )
end
local function codepoint_to_utf8(n)
    -- http://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=iws-appendixa
    local f = math.floor
    if n <= 0x7f then
    return string.char(n)
    elseif n <= 0x7ff then
    return string.char(f(n / 64) + 192, n % 64 + 128)
    elseif n <= 0xffff then
    return string.char(f(n / 4096) + 224, f(n % 4096 / 64) + 128, n % 64 + 128)
    elseif n <= 0x10ffff then
    return string.char(f(n / 262144) + 240, f(n % 262144 / 4096) + 128,
                        f(n % 4096 / 64) + 128, n % 64 + 128)
    end
    error( string.format("invalid unicode codepoint '%x'", n) )
end
local function parse_unicode_escape(s)
    local n1 = tonumber( s:sub(1, 4),  16 )
    local n2 = tonumber( s:sub(7, 10), 16 )
    -- Surrogate pair?
    if n2 then
    return codepoint_to_utf8((n1 - 0xd800) * 0x400 + (n2 - 0xdc00) + 0x10000)
    else
    return codepoint_to_utf8(n1)
    end
end
local function parse_string(str, i)
    local res = ""
    local j = i + 1
    local k = j
    while j <= #str do
    local x = str:byte(j)
    if x < 32 then
        decode_error(str, j, "control character in string")
    elseif x == 92 then -- '\': Escape
        res = res .. str:sub(k, j - 1)
        j = j + 1
        local c = str:sub(j, j)
        if c == "u" then
        local hex = str:match("^[dD][89aAbB]%x%x\\u%x%x%x%x", j + 1)
                    or str:match("^%x%x%x%x", j + 1)
                    or decode_error(str, j - 1, "invalid unicode escape in string")
        res = res .. parse_unicode_escape(hex)
        j = j + #hex
        else
        if not escape_chars[c] then
            decode_error(str, j - 1, "invalid escape char '" .. c .. "' in string")
        end
        res = res .. escape_char_map_inv[c]
        end
        k = j + 1
    elseif x == 34 then -- '"': End of string
        res = res .. str:sub(k, j - 1)
        return res, j + 1
    end
    j = j + 1
    end
    decode_error(str, i, "expected closing quote for string")
end
local function parse_number(str, i)
    local x = next_char(str, i, delim_chars)
    local s = str:sub(i, x - 1)
    local n = tonumber(s)
    if not n then
    decode_error(str, i, "invalid number '" .. s .. "'")
    end
    return n, x
end
local function parse_literal(str, i)
    local x = next_char(str, i, delim_chars)
    local word = str:sub(i, x - 1)
    if not literals[word] then
    decode_error(str, i, "invalid literal '" .. word .. "'")
    end
    return literal_map[word], x
end
local function parse_array(str, i)
    local res = {}
    local n = 1
    i = i + 1
    while 1 do
    local x
    i = next_char(str, i, space_chars, true)
    -- Empty / end of array?
    if str:sub(i, i) == "]" then
        i = i + 1
        break
    end
    -- Read token
    x, i = parse(str, i)
    res[n] = x
    n = n + 1
    -- Next token
    i = next_char(str, i, space_chars, true)
    local chr = str:sub(i, i)
    i = i + 1
    if chr == "]" then break end
    if chr ~= "," then decode_error(str, i, "expected ']' or ','") end
    end
    return res, i
end
local function parse_object(str, i)
    local res = {}
    i = i + 1
    while 1 do
    local key, val
    i = next_char(str, i, space_chars, true)
    -- Empty / end of object?
    if str:sub(i, i) == "}" then
        i = i + 1
        break
    end
    -- Read key
    if str:sub(i, i) ~= '"' then
        decode_error(str, i, "expected string for key")
    end
    key, i = parse(str, i)
    -- Read ':' delimiter
    i = next_char(str, i, space_chars, true)
    if str:sub(i, i) ~= ":" then
        decode_error(str, i, "expected ':' after key")
    end
    i = next_char(str, i + 1, space_chars, true)
    -- Read value
    val, i = parse(str, i)
    -- Set
    res[key] = val
    -- Next token
    i = next_char(str, i, space_chars, true)
    local chr = str:sub(i, i)
    i = i + 1
    if chr == "}" then break end
    if chr ~= "," then decode_error(str, i, "expected '}' or ','") end
    end
    return res, i
end
local char_func_map = {
    [ '"' ] = parse_string,
    [ "0" ] = parse_number,
    [ "1" ] = parse_number,
    [ "2" ] = parse_number,
    [ "3" ] = parse_number,
    [ "4" ] = parse_number,
    [ "5" ] = parse_number,
    [ "6" ] = parse_number,
    [ "7" ] = parse_number,
    [ "8" ] = parse_number,
    [ "9" ] = parse_number,
    [ "-" ] = parse_number,
    [ "t" ] = parse_literal,
    [ "f" ] = parse_literal,
    [ "n" ] = parse_literal,
    [ "[" ] = parse_array,
    [ "{" ] = parse_object,
}
parse = function(str, idx)
    local chr = str:sub(idx, idx)
    local f = char_func_map[chr]
    if f then
    return f(str, idx)
    end
    decode_error(str, idx, "unexpected character '" .. chr .. "'")
end
function json.decode(str)
    if type(str) ~= "string" then
    error("expected argument of type string, got " .. type(str))
    end
    local res, idx = parse(str, next_char(str, 1, space_chars, true))
    idx = next_char(str, idx, space_chars, true)
    if idx <= #str then
    decode_error(str, idx, "trailing garbage")
    end
    return res
end
return json
`);
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
            if(trigger.effect[0].type === 'triggerlua'){
                const runResult = await runLua(trigger.effect[0].code, {
                    char: char,
                    lowLevelAccess: false,
                    mode: mode,
                    data: data
                })
                console.log(runResult)
                data = runResult.res ?? data
            }
        }
        
    
        return data   
    } catch (error) {
        console.error(error)
        return content
    }
}
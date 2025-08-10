import { LuaEngine, LuaFactory } from "wasmoon";
import type { LuaScriptingEngineState } from ".";

export let luaFactory: LuaFactory

let luaFactoryPromise: Promise<void> | null = null;

async function makeLuaFactory() {
    const _luaFactory = new LuaFactory()
    async function mountFile(name: string) {
        let code = ''
        for (let i = 0; i < 3; i++) {
            try {
                const res = await fetch('/lua/' + name)
                if (res.status >= 200 && res.status < 300) {
                    code = await res.text()
                    break
                }
            } catch (error) { }
        }
        await _luaFactory.mountFile(name, code)
    }

    await mountFile('json.lua')
    luaFactory = _luaFactory
}

export async function ensureLuaFactory() {
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

export function luaCodeWrapper(code: string) {
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

export async function runLuaCode(
    ScriptingEngineState: LuaScriptingEngineState,
    mode: string,
    accessKey: string,
    data: any,
    meta: any
) {
    let res: any
    const luaEngine = ScriptingEngineState.engine
    try {
        switch (mode) {
            case 'input': {
                const func = luaEngine.global.get('onInput')
                if (func) {
                    res = await func(accessKey)
                }
                break
            }
            case 'output': {
                const func = luaEngine.global.get('onOutput')
                if (func) {
                    res = await func(accessKey)
                }
                break
            }
            case 'start': {
                const func = luaEngine.global.get('onStart')
                if (func) {
                    res = await func(accessKey)
                }
                break
            }
            case 'onButtonClick': {
                const func = luaEngine.global.get('onButtonClick')
                if (func) {
                    res = await func(accessKey, data)
                }
                break
            }
            case 'editRequest':
            case 'editDisplay':
            case 'editInput':
            case 'editOutput': {
                const func = luaEngine.global.get('callListenMain')
                if (func) {
                    res = await func(mode, accessKey, JSON.stringify(data), JSON.stringify(meta))
                    res = JSON.parse(res)
                }
                break
            }
            default: {
                const func = luaEngine.global.get(mode)
                if (func) {
                    res = await func(accessKey)
                }
                break
            }
        }
        if (res === false) {
            return { stopSending: true, res }
        }
    } catch (error) {
        console.error(error)
    }
    return { stopSending: false, res }
}
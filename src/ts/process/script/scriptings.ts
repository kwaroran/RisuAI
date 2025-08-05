import { getChatVar, setChatVar, type simpleCharacterArgument } from "src/ts/parser.svelte";
import { getCurrentCharacter, getCurrentChat, type Chat, type character, type groupChat } from "src/ts/storage/database.svelte";
import type { OpenAIChat } from "src/ts/process/index.svelte";
import { v4 } from "uuid";
import { declareAPI, getAccessKeys } from "./api";
import { PyodideContext, runPythonCode } from "./engine/python";
import { ensureLuaFactory, luaCodeWrapper, luaFactory, runLuaCode } from "./engine/lua";
import { getOrCreateEngineState, type LuaScriptingEngineState, type PythonScriptingEngineState } from "./engine";

export async function runScripted(code: string, arg: {
    char?: character | groupChat | simpleCharacterArgument,
    chat?: Chat
    data?: string | OpenAIChat[],
    setVar?: (key: string, value: string) => void,
    getVar?: (key: string) => string,
    lowLevelAccess?: boolean,
    meta?: object,
    mode?: string,
    type?: 'lua' | 'py'
}) {
    const type: 'lua' | 'py' = arg.type ?? 'lua'
    const char = arg.char ?? getCurrentCharacter()
    const data = arg.data ?? ''
    const setVar = arg.setVar ?? setChatVar
    const getVar = arg.getVar ?? getChatVar
    const meta = arg.meta ?? {}
    const mode = arg.mode ?? 'manual'

    let chat = arg.chat ?? getCurrentChat()
    let stopSending = false
    let lowLevelAccess = arg.lowLevelAccess ?? false

    if (type === 'lua') {
        await ensureLuaFactory()
    }
    let ScriptingEngineState = await getOrCreateEngineState(mode, type);

    return await ScriptingEngineState.mutex.runExclusive(async () => {
        ScriptingEngineState.chat = chat
        ScriptingEngineState.setVar = setVar
        ScriptingEngineState.getVar = getVar
        if (code !== ScriptingEngineState.code) {
            let declare: (name: string, func: Function) => void

            if (ScriptingEngineState.type === 'lua') {
                console.log('Creating new Lua engine for mode:', mode)
                ScriptingEngineState.engine?.global.close()
                ScriptingEngineState.code = code
                ScriptingEngineState.engine = await luaFactory.createEngine({ injectObjects: true })
                const luaEngine = ScriptingEngineState.engine
                declare = (name: string, func: Function) => {
                    luaEngine.global.set(name, func)
                }
            }
            if (ScriptingEngineState.type === 'py') {
                console.log('Creating new Pyodide context for mode:', mode)
                ScriptingEngineState.pyodide?.close()
                ScriptingEngineState.pyodide = new PyodideContext()
                declare = (name: string, func: Function) => {
                    ScriptingEngineState.pyodide?.declareAPI(name, func as any)
                }
            }
            declareAPI(declare, ScriptingEngineState, () => { stopSending = true }, char)

            console.log('Running Lua code:', code)
            if (ScriptingEngineState.type === 'lua') {
                await ScriptingEngineState.engine?.doString(luaCodeWrapper(code))
            }
            if (ScriptingEngineState.type === 'py') {
                await ScriptingEngineState.pyodide?.init(code)
            }
            ScriptingEngineState.code = code
        }
        let accessKey = v4()
        const { ScriptingSafeIds, ScriptingEditDisplayIds, ScriptingLowLevelIds } = getAccessKeys()
        if (mode === 'editDisplay') {
            ScriptingEditDisplayIds.add(accessKey)
        }
        else {
            ScriptingSafeIds.add(accessKey)
            if (lowLevelAccess) {
                ScriptingLowLevelIds.add(accessKey)
            }
        }

        let res: any
        if (ScriptingEngineState.type === 'lua') {
            const { stopSending: stop, res: result } = await runLuaCode(ScriptingEngineState as LuaScriptingEngineState, mode, accessKey, data, meta)
            stopSending = stop
            res = result
        }
        if (ScriptingEngineState.type === 'py') {
            const { stopSending: stop, res: result } = await runPythonCode(ScriptingEngineState as PythonScriptingEngineState, mode, accessKey, data, meta)
            stopSending = stop
            res = result
        }

        ScriptingSafeIds.delete(accessKey)
        ScriptingLowLevelIds.delete(accessKey)
        chat = ScriptingEngineState.chat

        return {
            stopSending, chat, res
        }
    })
}
import type { LuaEngine } from "wasmoon";
import type { character, groupChat } from "../storage/database";
import { risuChatParser } from "../parser";

export let LuaSafeIds = new Set<string>()

export function registerLuaProcess(engine:LuaEngine, char:character|groupChat) {
    engine.global.set('cbs', (code:string) => {
        const parsed = risuChatParser(code, {
            chara: char,
        })
        return parsed
    })
}


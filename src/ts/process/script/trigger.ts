import type { OpenAIChat } from "src/ts/process/index.svelte";
import { getModuleTriggers } from "src/ts/process/modules";
import type { character, groupChat, triggerscript } from "src/ts/storage/database.svelte";
import { runScripted } from "./scriptings";
import type { simpleCharacterArgument } from "src/ts/parser.svelte";

export async function runLuaEditTrigger<T extends string | OpenAIChat[]>(char: character | groupChat | simpleCharacterArgument, mode: string, content: T, meta?: object): Promise<T> {
    switch (mode) {
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

        for (let trigger of triggers) {
            if (trigger?.effect?.[0]?.type === 'triggerlua') {
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

export async function runLuaButtonTrigger(char: character | groupChat | simpleCharacterArgument, data: string): Promise<any> {
    let runResult
    try {
        const triggers = char.type === 'group' ? getModuleTriggers() : char.triggerscript.map<triggerscript>((v) => ({
            ...v,
            lowLevelAccess: char.type !== 'simple' ? char.lowLevelAccess ?? false : false
        })).concat(getModuleTriggers())

        for (let trigger of triggers) {
            if (trigger?.effect?.[0]?.type === 'triggerlua') {
                runResult = await runScripted(trigger.effect[0].code, {
                    char: char,
                    lowLevelAccess: trigger.lowLevelAccess,
                    mode: 'onButtonClick',
                    data: data
                })
            }
        }
    } catch (error) {
        throw (error)
    }
    return runResult
}

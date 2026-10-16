import { get } from 'svelte/store'
import { DBState, selectedCharID } from '../stores.svelte'
import { parseKeyValue } from '../util'
import { getCurrentCharacter, getCurrentChat } from '../storage/database.svelte'

export function getChatVar(key:string): string {
    const selectedChar = get(selectedCharID)
    const char = DBState.db.characters[selectedChar]
    if(!char){
        return 'null'
    }
    const chat = char.chats[char.chatPage]
    chat.scriptstate ??= {}
    const state = (chat.scriptstate['$' + key])
    if(state === undefined || state === null){
        const defaultVariables = parseKeyValue(char.defaultVariables).concat(parseKeyValue(DBState.db.templateDefaultVariables))
        const findResult = defaultVariables.find((f) => {
            return f[0] === key
        })
        if(findResult){
            return findResult[1]
        }
        return 'null'
    }
    return state.toString()
}

export function setChatVar(key:string, value:string): boolean {
    const selectedChar = get(selectedCharID)
    const chat = DBState.db.characters[selectedChar].chats[DBState.db.characters[selectedChar].chatPage]
    chat.scriptstate ??= {}

    const stateKey = '$' + key
    if(chat.scriptstate[stateKey] === value){
        return false
    }

    chat.scriptstate[stateKey] = value
    return true
}

export function getGLChatVar(key:string): string {
    console.log('getGLChatVar', key)
    const chat = getCurrentChat()
    return chat?.GLGlobalVariables?.[key]
}

export function setGLChatVar(key:string, value:string) {
    console.log('setGLChatVar', key, value)
    const chat = getCurrentChat()
    if(chat){
        console.log('setGLChatVar', key, value, chat.GLGlobalVariables)
        chat.GLGlobalVariables ??= {}
        chat.GLGlobalVariables[key] = value
    }
}

export function getGlobalChatVar(key:string): string {
    const vt = getGLChatVar(key)
    if(vt !== 'null' && vt){
        return vt
    }
    return DBState.db.globalChatVariables[key] ?? 'null'
}

export function setGlobalChatVar(key:string, value:string) {
    if(getCurrentChat()?.useLocallySetGlobalVariables){
        setGLChatVar(key, value)
        return
    }
    else if(getGLChatVar(key) !== undefined){
        delete getCurrentChat().GLGlobalVariables[key]
    }
    DBState.db.globalChatVariables[key] = value
}

export function isLocallyHandledGlobalChatVar(key:string): boolean {
    return !!getGLChatVar(key)
}

export function removeLocallyHandledGlobalChatVar(key:string): boolean {
    if(getGLChatVar(key) !== undefined){
        delete getCurrentChat().GLGlobalVariables[key]
        return true
    }
    return false
}
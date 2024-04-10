import { cloneDeep } from "lodash";
import { risuChatParser } from "../parser";
import { DataBase, type Chat, type character } from "../storage/database";
import { tokenize } from "../tokenizer";
import { getModuleTriggers } from "./modules";
import { get } from "svelte/store";
import { CurrentCharacter, CurrentChat, selectedCharID } from "../stores";
import { processMultiCommand } from "./command";

export interface triggerscript{
    comment: string;
    type: 'start'|'manual'|'output'|'input'
    conditions: triggerCondition[]
    effect:triggerEffect[]
}

export type triggerCondition = triggerConditionsVar|triggerConditionsExists|triggerConditionsChatIndex

export type triggerEffect = triggerEffectSetvar|triggerEffectSystemPrompt|triggerEffectImpersonate|triggerEffectCommand|triggerEffectStop|triggerEffectRunTrigger

export type triggerConditionsVar = {
    type:'var'|'value'
    var:string
    value:string
    operator:'='|'!='|'>'|'<'|'>='|'<='|'null'
}

export type triggerConditionsChatIndex = {
    type:'chatindex'
    value:string
    operator:'='|'!='|'>'|'<'|'>='|'<='|'null'
}

export type triggerConditionsExists ={
    type: 'exists'
    value:string
    type2: 'strict'|'loose'|'regex',
    depth: number
}

export interface triggerEffectSetvar{
    type: 'setvar',
    operator: '='|'+='|'-='|'*='|'/='
    var:string
    value:string
}

export interface triggerEffectSystemPrompt{
    type: 'systemprompt',
    location: 'start'|'historyend'|'promptend',
    value:string
}

export interface triggerEffectImpersonate{
    type: 'impersonate'
    role: 'user'|'char',
    value:string
}type triggerMode = 'start'|'manual'|'output'|'input'

export interface triggerEffectCommand{
    type: 'command',
    value: string
}

export interface triggerEffectRunTrigger{
    type: 'runtrigger',
    value: string
}

export interface triggerEffectStop{
    type: 'stop'
}

export type additonalSysPrompt = {
    start:string,
    historyend: string,
    promptend: string
}

export async function runTrigger(char:character,mode:triggerMode, arg:{
    chat: Chat,
    recursiveCount?: number
    additonalSysPrompt?: additonalSysPrompt
    stopSending?: boolean
    manualName?: string
}){
    arg.recursiveCount ??= 0
    char = cloneDeep(char)
    let varChanged = false
    let stopSending = arg.stopSending ?? false
    const currentChat = get(CurrentChat)
    let additonalSysPrompt:additonalSysPrompt = arg.additonalSysPrompt ?? {
        start:'',
        historyend: '',
        promptend: ''
    }
    const triggers = char.triggerscript.concat(getModuleTriggers())
    let chat = cloneDeep(arg.chat ?? char.chats[char.chatPage])
    if((!triggers) || (triggers.length === 0)){
        return null
    }

    function getVar(key:string){
        return `${chat.scriptstate?.['$' + key]}`
    }

    function setVar(key:string, value:string){
        const selectedCharId = get(selectedCharID)
        const currentCharacter = get(CurrentCharacter)
        const db = get(DataBase)
        varChanged = true
        chat.scriptstate ??= {}
        chat.scriptstate['$' + key] = value
        currentChat.scriptstate = chat.scriptstate
        currentCharacter.chats[currentCharacter.chatPage].scriptstate = chat.scriptstate
        db.characters[selectedCharId].chats[currentCharacter.chatPage].scriptstate = chat.scriptstate

        
    }
    
    
    for(const trigger of triggers){
        if(arg.manualName){
            if(trigger.comment !== arg.manualName){
                continue
            }
        }
        else if(mode !== trigger.type){
            continue
        }

        let pass = true
        for(const condition of trigger.conditions){
            if(condition.type === 'var' || condition.type === 'chatindex' || condition.type === 'value'){
                let varValue =  (condition.type === 'var') ? (getVar(condition.var) ?? 'null') :
                                (condition.type === 'chatindex') ? (chat.message.length.toString()) :
                                (condition.type === 'value') ? condition.var : null
                                
                if(varValue === undefined || varValue === null){
                    pass = false
                    break
                }
                else{
                    const conditionValue = risuChatParser(condition.value,{chara:char})
                    varValue = risuChatParser(varValue,{chara:char})
                    switch(condition.operator){
                        case '=':
                            if(varValue !== conditionValue){
                                pass = false
                            }
                            break
                        case '!=':
                            if(varValue === conditionValue){
                                pass = false
                            }
                            break
                        case '>':
                            if(Number(varValue) > Number(conditionValue)){
                                pass = false
                            }
                            break
                        case '<':
                            if(Number(varValue) < Number(conditionValue)){
                                pass = false
                            }
                            break
                        case '>=':
                            if(Number(varValue) >= Number(conditionValue)){
                                pass = false
                            }
                            break
                        case '<=':
                            if(Number(varValue) <= Number(conditionValue)){
                                pass = false
                            }
                            break
                        case 'null':
                            if(varValue !== '[Null]'){
                                pass = false
                            }
                            break
                    }
                }
            }
            else if(condition.type === 'exists'){
                const conditionValue = risuChatParser(condition.value,{chara:char})
                const val = risuChatParser(conditionValue,{chara:char})
                let da =  chat.message.slice(0-condition.depth).map((v)=>v.data).join(' ')
                if(condition.type2 === 'strict'){
                    pass = da.split(' ').includes(val)
                }
                else if(condition.type2 === 'loose'){
                    pass = da.toLowerCase().includes(val.toLowerCase())
                }
                else if(condition.type2 === 'regex'){
                    pass = new RegExp(val).test(da)
                }
            }
            if(!pass){
                break
            }
        }
        if(!pass){
            continue
        }
        for(const effect of trigger.effect){
            switch(effect.type){
                case'setvar': {
                    const effectValue = risuChatParser(effect.value,{chara:char})
                    const varKey  = risuChatParser(effect.var,{chara:char})
                    switch(effect.operator){
                        case '=':{
                            setVar(varKey, effectValue)
                            break
                        }
                        case '+=':{
                            setVar(varKey, (Number(getVar(varKey)) + Number(effectValue)).toString())
                            break
                        }
                        case '-=':{
                            setVar(varKey, (Number(getVar(varKey)) - Number(effectValue)).toString())
                            break
                        }
                        case '*=':{
                            setVar(varKey, (Number(getVar(varKey)) * Number(effectValue)).toString())
                            break
                        }
                        case '/=':{
                            setVar(varKey, (Number(getVar(varKey)) / Number(effectValue)).toString())
                            break
                        }
                    }
                    break
                }
                case 'systemprompt':{
                    const effectValue = risuChatParser(effect.value,{chara:char})
                    additonalSysPrompt[effect.location] += effectValue + "\n\n"
                    break
                }
                case 'impersonate':{
                    const effectValue = risuChatParser(effect.value,{chara:char})
                    if(effect.role === 'user'){
                        chat.message.push({role: 'user', data: effectValue})
                    }
                    else if(effect.role === 'char'){
                        chat.message.push({role: 'char', data: effectValue})
                    }
                    break
                }
                case 'command':{
                    const effectValue = risuChatParser(effect.value,{chara:char})
                    await processMultiCommand(effectValue)
                    break
                }
                case 'stop':{
                    stopSending = true
                    break
                }
                case 'runtrigger':{
                    if(arg.recursiveCount < 10){
                        arg.recursiveCount++
                        const r = await runTrigger(char,'manual',{
                            chat,
                            recursiveCount: arg.recursiveCount,
                            additonalSysPrompt,
                            stopSending,
                            manualName: effect.value
                        })
                        if(r){
                            additonalSysPrompt = r.additonalSysPrompt
                            chat = r.chat
                            stopSending = r.stopSending
                        }
                    }
                    break
                }
            }
        }
    }
    
    let caculatedTokens = 0
    if(additonalSysPrompt.start){
        caculatedTokens += await tokenize(additonalSysPrompt.start)
    }
    if(additonalSysPrompt.historyend){
        caculatedTokens += await tokenize(additonalSysPrompt.historyend)
    }
    if(additonalSysPrompt.promptend){
        caculatedTokens += await tokenize(additonalSysPrompt.promptend)
    }
    if(varChanged){
        const currentChat = get(CurrentChat)
        currentChat.scriptstate = chat.scriptstate
    }

    return {additonalSysPrompt, chat, tokens:caculatedTokens, stopSending}

}
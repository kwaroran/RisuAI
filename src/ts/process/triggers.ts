import { cloneDeep } from "lodash";
import { getVarChat, risuChatParser } from "../parser";
import type { Chat, character } from "../storage/database";
import { tokenize } from "../tokenizer";

export interface triggerscript{
    comment: string;
    type: 'start'|'manual'|'output'|'input'
    conditions: triggerCondition[]
    effect:triggerEffect[]
}

export type triggerCondition = triggerConditionsVar|triggerConditionsExists|triggerConditionsChatIndex

export type triggerEffect = triggerEffectSetvar|triggerEffectSystemPrompt|triggerEffectImpersonate

export type triggerConditionsVar = {
    type:'var'
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

export type additonalSysPrompt = {
    start:string,
    historyend: string,
    promptend: string
}

export async function runTrigger(char:character,mode:triggerMode, arg:{
    chat: Chat
}){
    char = cloneDeep(char)
    let additonalSysPrompt:additonalSysPrompt = {
        start:'',
        historyend: '',
        promptend: ''
    }
    const triggers = char.triggerscript
    const chat = cloneDeep(arg.chat ?? char.chats[char.chatPage])
    if((!triggers) || (triggers.length === 0)){
        return null
    }
    let varValues = getVarChat(-1, char)
    let varValuesChanged = false
    for(const trigger of triggers){
        if(mode !== trigger.type){
            continue
        }

        let pass = true
        for(const condition of trigger.conditions){
            if(condition.type === 'var' || condition.type === 'chatindex'){
                const varValue = (condition.type === 'var') ? (varValues[condition.var] ?? '[Null]') : (chat.message.length)
                if(varValue === undefined || varValue === null){
                    pass = false
                    break
                }
                else{
                    switch(condition.operator){
                        case '=':
                            if(varValue !== condition.value){
                                pass = false
                            }
                            break
                        case '!=':
                            if(varValue === condition.value){
                                pass = false
                            }
                            break
                        case '>':
                            if(Number(varValue) > Number(condition.value)){
                                pass = false
                            }
                            break
                        case '<':
                            if(Number(varValue) < Number(condition.value)){
                                pass = false
                            }
                            break
                        case '>=':
                            if(Number(varValue) >= Number(condition.value)){
                                pass = false
                            }
                            break
                        case '<=':
                            if(Number(varValue) <= Number(condition.value)){
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
                const val = risuChatParser(condition.value,{chara:char, var:varValues})
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
            if(effect.type === 'setvar'){
                switch(effect.operator){
                    case '=':
                        varValues[effect.var] = effect.value
                        break
                    case '+=':
                        varValues[effect.var] = (Number(varValues[effect.var]) + Number(effect.value)).toString()
                        break
                    case '-=':
                        varValues[effect.var] = (Number(varValues[effect.var]) - Number(effect.value)).toString()
                        break
                    case '*=':
                        varValues[effect.var] = (Number(varValues[effect.var]) * Number(effect.value)).toString()
                        break
                    case '/=':
                        varValues[effect.var] = (Number(varValues[effect.var]) / Number(effect.value)).toString()
                        break
                }
                varValuesChanged = true
            }
            else if(effect.type === 'systemprompt'){
                additonalSysPrompt[effect.location] += effect.value + "\n\n"
            }
            else if(effect.type === 'impersonate'){
                if(effect.role === 'user'){
                    chat.message.push({role: 'user', data: effect.value})
                }
                else if(effect.role === 'char'){
                    chat.message.push({role: 'char', data: effect.value})
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

    return {additonalSysPrompt, chat, tokens:caculatedTokens}

}
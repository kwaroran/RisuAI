import { getVarChat } from "../parser";
import type { character } from "../storage/database";

export interface triggerscript{
    comment: string;
    type: 'start'|'manual'|'output'|'input'
    conditions: triggerCondition[]
    effect:triggerEffect[]
}

export type triggerCondition = triggerConditionsVar|triggerConditionsExists

export type triggerEffect = triggerEffectSetvar|triggerEffectSystemPrompt|triggerEffectImpersonate

export type triggerConditionsVar = {
    type:'var'
    var:string
    value:string
    operator:'='|'!='|'>'|'<'|'>='|'<='
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

export function runTrigger(char:character,mode:triggerMode){
    let additonalSysPrompt = {
        start:'',
        historyend: '',
        promptend: ''
    }
    let varValues = getVarChat(-1, char)
    let varValuesChanged = false
    const triggers = char.triggerscript
    const chat = char.chats[char.chatPage]
    if(!triggers){
        return {additonalSysPrompt, char}
    }

    for(const trigger of triggers){
        if(mode !== trigger.type){
            continue
        }

        let pass = true
        for(const condition of trigger.conditions){
            if(condition.type === 'var'){
                const varValue = varValues[condition.var]
                if(varValue === undefined || varValue === null){
                    pass = false
                    break
                }
                else{
                    if(condition.operator === '='){
                        if(varValue !== condition.value){
                            pass = false
                            break
                        }
                    }
                    else if(condition.operator === '!='){
                        if(varValue === condition.value){
                            pass = false
                            break
                        }
                    }
                    else if(condition.operator === '>'){
                        if(Number(varValue) > Number(condition.value)){
                            pass = false
                            break
                        }
                    }
                    else if(condition.operator === '<'){
                        if(Number(varValue) < Number(condition.value)){
                            pass = false
                            break
                        }
                    }
                    else if(condition.operator === '>='){
                        if(Number(varValue) >= Number(condition.value)){
                            pass = false
                            break
                        }
                    }
                    else if(condition.operator === '<='){
                        if(Number(varValue) <= Number(condition.value)){
                            pass = false
                            break
                        }
                    }
                }
            }
            else if(condition.type === 'exists'){
                let da =  chat.message.slice(0-condition.depth).map((v)=>v.data).join(' ')
                if(condition.type2 === 'strict'){
                    pass = da.split(' ').includes(condition.value)
                }
                else if(condition.type2 === 'loose'){
                    pass = da.toLowerCase().includes(condition.value.toLowerCase())
                }
                else if(condition.type2 === 'regex'){
                    pass = new RegExp(condition.value).test(da)
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

    if(varValuesChanged){
        chat.message[chat.message.length-1].data = chat.message.at(-1).data.replaceAll(/{{(setvar|getvar)::.+?}}/gis,'') + Object.keys(varValues).map((v)=>`{{setvar::${v}::${varValues[v]}}}`).join('')
    }

    char.chats[char.chatPage] = chat

    return {additonalSysPrompt, char}

}
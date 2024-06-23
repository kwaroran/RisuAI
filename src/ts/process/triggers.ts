import { risuChatParser } from "../parser";
import { DataBase, type Chat, type character } from "../storage/database";
import { tokenize } from "../tokenizer";
import { getModuleTriggers } from "./modules";
import { get } from "svelte/store";
import { selectedCharID } from "../stores";
import { CurrentChat } from "../storage/database";
import { CurrentCharacter } from "../storage/database";
import { processMultiCommand } from "./command";
import { parseKeyValue } from "../util";
import { alertError, alertInput, alertNormal, alertSelect } from "../alert";
import type { OpenAIChat } from ".";
import { HypaProcesser } from "./memory/hypamemory";
import { requestChatData } from "./request";
import { generateAIImage } from "./stableDiff";
import { writeInlayImage } from "./files/image";

export interface triggerscript{
    comment: string;
    type: 'start'|'manual'|'output'|'input'
    conditions: triggerCondition[]
    effect:triggerEffect[]
    lowLevelAccess?: boolean
}

export type triggerCondition = triggerConditionsVar|triggerConditionsExists|triggerConditionsChatIndex

export type triggerEffect = triggerEffectCutChat|triggerEffectModifyChat|triggerEffectImgGen|triggerEffectRegex|triggerEffectRunLLM|triggerEffectCheckSimilarity|triggerEffectSendAIprompt|triggerEffectShowAlert|triggerEffectSetvar|triggerEffectSystemPrompt|triggerEffectImpersonate|triggerEffectCommand|triggerEffectStop|triggerEffectRunTrigger

export type triggerConditionsVar = {
    type:'var'|'value'
    var:string
    value:string
    operator:'='|'!='|'>'|'<'|'>='|'<='|'null'|'true'
}

export type triggerConditionsChatIndex = {
    type:'chatindex'
    value:string
    operator:'='|'!='|'>'|'<'|'>='|'<='|'null'|'true'
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

export interface triggerEffectCutChat{
    type: 'cutchat',
    start: string,
    end: string
}

export interface triggerEffectModifyChat{
    type: 'modifychat',
    index: string,
    value: string
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

export interface triggerEffectRegex{
    type: 'extractRegex',
    value: string
    regex: string
    flags: string
    result: string
    inputVar: string
}

export interface triggerEffectShowAlert{
    type: 'showAlert',
    alertType: string
    value: string
    inputVar: string
}

export interface triggerEffectRunTrigger{
    type: 'runtrigger',
    value: string
}

export interface triggerEffectStop{
    type: 'stop'
}

export interface triggerEffectSendAIprompt{
    type: 'sendAIprompt'
}

export interface triggerEffectImgGen{
    type: 'runImgGen',
    value: string,
    negValue: string,
    inputVar: string
}


export interface triggerEffectCheckSimilarity{
    type: 'checkSimilarity',
    source: string,
    value: string,
    inputVar: string
}

export interface triggerEffectRunLLM{
    type: 'runLLM',
    value: string,
    inputVar: string
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
    char = structuredClone(char)
    let varChanged = false
    let stopSending = arg.stopSending ?? false
    const CharacterlowLevelAccess = char.lowLevelAccess ?? false
    let sendAIprompt = false
    const currentChat = get(CurrentChat)
    let additonalSysPrompt:additonalSysPrompt = arg.additonalSysPrompt ?? {
        start:'',
        historyend: '',
        promptend: ''
    }
    const triggers = char.triggerscript.map((v) => {
        v.lowLevelAccess = CharacterlowLevelAccess
        return v
    }).concat(getModuleTriggers())
    const db = get(DataBase)
    const defaultVariables = parseKeyValue(char.defaultVariables).concat(parseKeyValue(db.templateDefaultVariables))
    let chat = structuredClone(arg.chat ?? char.chats[char.chatPage])
    if((!triggers) || (triggers.length === 0)){
        return null
    }

    function getVar(key:string){
        const state = chat.scriptstate?.['$' + key]
        if(state === undefined || state === null){
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
                        case 'true': {
                            if(varValue !== 'true' && varValue !== '1'){
                                pass = false
                            }
                            break
                        }
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
                            if(varValue !== 'null'){
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
                    if(arg.recursiveCount < 10 || trigger.lowLevelAccess){
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
                case 'cutchat':{
                    const start = Number(risuChatParser(effect.start,{chara:char}))
                    const end = Number(risuChatParser(effect.end,{chara:char}))
                    chat.message = chat.message.slice(start,end)
                    break
                }
                case 'modifychat':{
                    const index = Number(risuChatParser(effect.index,{chara:char}))
                    const value = risuChatParser(effect.value,{chara:char})
                    if(chat.message[index]){
                        chat.message[index].data = value
                    }
                    break
                }

                // low level access only
                case 'showAlert':{
                    if(!trigger.lowLevelAccess){
                        break
                    }

                    const effectValue = risuChatParser(effect.value,{chara:char})
                    const inputVar = risuChatParser(effect.inputVar,{chara:char})

                    switch(effect.alertType){
                        case 'normal':{
                            alertNormal(effectValue)
                            break
                        }
                        case 'error':{
                            alertError(effectValue)
                            break
                        }
                        case 'input':{
                            const val = await alertInput(effectValue)
                            setVar(inputVar, val)
                        }
                        case 'select':{
                            const val = await alertSelect(effectValue.split('§'))
                            setVar(inputVar, val)
                        }
                    }
                    break
                }

                case 'sendAIprompt':{
                    if(!trigger.lowLevelAccess){
                        break
                    }
                    sendAIprompt = true
                    break
                }

                case 'runLLM':{
                    if(!trigger.lowLevelAccess){
                        break
                    }
                    const effectValue = risuChatParser(effect.value,{chara:char})
                    const varName = effect.inputVar
                    let promptbody:OpenAIChat[] = []
                    let currentRole:'user'|'assistant'|'system'
                    
                    const splited = effectValue.split('\n')

                    for(let i = 0; i < splited.length; i++){
                        const line = splited[i]
                        if(line.startsWith('@@role ')){
                            const role = line.split(' ')[1]
                            switch(role){
                                case 'user':
                                case 'assistant':
                                case 'system':
                                    currentRole = role
                                    break
                                default:
                                    currentRole = 'system'
                                    break
                            }
                            promptbody.push({role: currentRole, content: ''})
                            continue
                        }
                        else if(promptbody.length === 0){
                            promptbody.push({role: 'system', content: line})
                        }
                        else{
                            promptbody[promptbody.length - 1].content += line
                        }
                    }

                    promptbody = promptbody.map((e) => {
                        e.content = e.content.trim()
                        return e
                    }).filter((e) => e.content.length > 0)

                    const result = await requestChatData({
                        formated: promptbody,
                        bias: {},
                        useStreaming: false,
                        noMultiGen: true,
                    }, 'model')

                    if(result.type === 'fail' || result.type === 'streaming' || result.type === 'multiline'){
                        setVar(varName, 'Error: ' + result.result)
                    }
                    else{
                        setVar(varName, result.result)
                    }

                    break
                }

                case 'checkSimilarity':{
                    if(!trigger.lowLevelAccess){
                        break
                    }

                    const processer = new HypaProcesser('MiniLM')
                    const effectValue = risuChatParser(effect.value,{chara:char})
                    const source = risuChatParser(effect.source,{chara:char})
                    await processer.addText(effectValue.split('§'))
                    const val = await processer.similaritySearch(source)
                    setVar(effect.inputVar, val.join('§'))
                    break
                }

                case 'extractRegex':{
                    if(!trigger.lowLevelAccess){
                        break
                    }

                    const effectValue = risuChatParser(effect.value,{chara:char})
                    const regex = new RegExp(effect.regex, effect.flags)
                    const regexResult = regex.exec(effectValue)
                    const result = effect.result.replace(/\$[0-9]+/g, (match) => {
                        const index = Number(match.slice(1))
                        return regexResult[index]
                    }).replace(/\$&/g, regexResult[0]).replace(/\$\$/g, '$')

                    setVar(effect.inputVar, result)
                    break
                }

                case 'runImgGen':{
                    if(!trigger.lowLevelAccess){
                        break
                    }

                    const effectValue = risuChatParser(effect.value,{chara:char})
                    const negValue = risuChatParser(effect.negValue,{chara:char})
                    const gen = await generateAIImage(effectValue, char, negValue, 'inlay')
                    if(!gen){
                        setVar(effect.inputVar, 'Error: Image generation failed')
                        break
                    }
                    const imgHTML = new Image()
                    imgHTML.src = gen
                    const inlay = await writeInlayImage(imgHTML)
                    const res = `{{inlay::${inlay}}}`
                    setVar(effect.inputVar, res)
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

    return {additonalSysPrompt, chat, tokens:caculatedTokens, stopSending, sendAIprompt}

}
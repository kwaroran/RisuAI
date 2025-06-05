import { parseChatML, risuChatParser } from "../parser.svelte";
import { getCurrentCharacter, getCurrentChat, getDatabase, setCurrentCharacter, type Chat, type character } from "../storage/database.svelte";
import { tokenize } from "../tokenizer";
import { getModuleTriggers } from "./modules";
import { get } from "svelte/store";
import { ReloadChatPointer, ReloadGUIPointer, selectedCharID } from "../stores.svelte";
import { processMultiCommand } from "./command";
import { parseKeyValue, sleep } from "../util";
import { alertError, alertInput, alertNormal, alertSelect } from "../alert";
import type { OpenAIChat } from "./index.svelte";
import { HypaProcesser } from "./memory/hypamemory";
import { requestChatData, type OpenAIChatExtra } from "./request";
import { generateAIImage } from "./stableDiff";
import { writeInlayImage } from "./files/inlays";
import { runScripted } from "./scriptings";


export interface triggerscript{
    comment: string;
    type: 'start'|'manual'|'output'|'input'|'display'|'request'
    conditions: triggerCondition[]
    effect:triggerEffect[]
    lowLevelAccess?: boolean
}

export type triggerCondition = triggerConditionsVar|triggerConditionsExists|triggerConditionsChatIndex

export type triggerEffect = triggerEffectV1|triggerCode|triggerEffectV2
export type triggerEffectV1 = triggerEffectCutChat|triggerEffectModifyChat|triggerEffectImgGen|triggerEffectRegex|triggerEffectRunLLM|triggerEffectCheckSimilarity|triggerEffectSendAIprompt|triggerEffectShowAlert|triggerEffectSetvar|triggerEffectSystemPrompt|triggerEffectImpersonate|triggerEffectCommand|triggerEffectStop|triggerEffectRunTrigger
export type triggerEffectV2 =   triggerV2Header|triggerV2IfVar|triggerV2Else|triggerV2EndIndent|triggerV2SetVar|triggerV2Loop|triggerV2BreakLoop|
                                triggerV2RunTrigger|triggerV2ConsoleLog|triggerV2StopTrigger|triggerV2CutChat|triggerV2ModifyChat|triggerV2SystemPrompt|triggerV2Impersonate|
                                triggerV2Command|triggerV2SendAIprompt|triggerV2ImgGen|triggerV2CheckSimilarity|triggerV2RunLLM|triggerV2ShowAlert|triggerV2ExtractRegex|
                                triggerV2GetLastMessage|triggerV2GetMessageAtIndex|triggerV2GetMessageCount|triggerV2GetLastMessage|triggerV2GetMessageAtIndex|
                                triggerV2GetMessageCount|triggerV2ModifyLorebook|triggerV2GetLorebook|triggerV2GetLorebookCount|triggerV2GetLorebookEntry|
                                triggerV2SetLorebookActivation|triggerV2GetLorebookIndexViaName|triggerV2LoopNTimes|triggerV2Random|triggerV2GetCharAt|
                                triggerV2GetCharCount|triggerV2ToLowerCase|triggerV2ToUpperCase|triggerV2SetCharAt|triggerV2SplitString|triggerV2GetCharacterDesc|
                                triggerV2SetCharacterDesc|triggerV2MakeArrayVar|triggerV2GetArrayVarLength|triggerV2GetArrayVar|triggerV2SetArrayVar|
                                triggerV2PushArrayVar|triggerV2PopArrayVar|triggerV2ShiftArrayVar|triggerV2UnshiftArrayVar|triggerV2SpliceArrayVar|triggerV2GetFirstMessage|
                                triggerV2SliceArrayVar|triggerV2GetIndexOfValueInArrayVar|triggerV2RemoveIndexFromArrayVar|triggerV2ConcatString|triggerV2GetLastUserMessage|
                                triggerV2GetLastCharMessage|triggerV2GetAlertInput|triggerV2GetDisplayState|triggerV2SetDisplayState|triggerV2UpdateGUI|triggerV2UpdateChatAt|triggerV2Wait|
                                triggerV2GetRequestState|triggerV2SetRequestState|triggerV2GetRequestStateRole|triggerV2SetRequestStateRole|triggerV2GetReuqestStateLength|triggerV2IfAdvanced|
                                triggerV2QuickSearchChat|triggerV2StopPromptSending|triggerV2Tokenize

export type triggerConditionsVar = {
    type:'var'|'value'
    var:string
    value:string
    operator:'='|'!='|'>'|'<'|'>='|'<='|'null'|'true'
}

export type triggerCode = {
    type: 'triggercode'|'triggerlua',
    code: string
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
}

type triggerMode = 'start'|'manual'|'output'|'input'|'display'|'request'

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

export interface triggerEffectRunAxLLM{
    type: 'runAxLLM',
    value: string,
    inputVar: string
}

export type additonalSysPrompt = {
    start:string,
    historyend: string,
    promptend: string
}

export type triggerV2Header = {
    type: 'v2Header',
    code?: string,
    indent: number
}

export type triggerV2IfVar = {
    type: 'v2If',
    condition: '='|'!='|'>'|'<'|'>='|'<=',
    targetType: 'var'|'value',
    target: string,
    source: string,
    indent: number
}

export type triggerV2Else = {
    type: 'v2Else'
    indent: number
}

export type triggerV2EndIndent = {
    type: 'v2EndIndent',
    endOfLoop?: boolean,
    indent: number
}

export type triggerV2SetVar = {
    type: 'v2SetVar',
    operator: '='|'+='|'-='|'*='|'/='|'%=',
    var: string,
    valueType: 'var'|'value',
    value: string,
    indent: number
}

export type triggerV2Loop = {
    type: 'v2Loop',
    indent: number
}

export type triggerV2LoopNTimes = {
    type: 'v2LoopNTimes',
    value: string,
    valueType: 'var'|'value',
    indent: number
}

export type triggerV2BreakLoop = {
    type: 'v2BreakLoop',
    indent: number
}

export type triggerV2RunTrigger = {
    type: 'v2RunTrigger',
    target: string,
    indent: number
}

export type triggerV2ConsoleLog = {
    type: 'v2ConsoleLog',
    sourceType: 'var'|'value',
    source: string,
    indent: number
}

export type triggerV2StopTrigger = {
    type: 'v2StopTrigger',
    indent: number
}

export type triggerV2CutChat = {
    type: 'v2CutChat',
    start: string,
    startType: 'var'|'value',
    end: string,
    endType: 'var'|'value',
    indent: number
}

export type triggerV2ModifyChat = {
    type: 'v2ModifyChat',
    index: string,
    indexType: 'var'|'value',
    value: string,
    valueType: 'var'|'value',
    indent: number
}

export type triggerV2SystemPrompt = {
    type: 'v2SystemPrompt',
    location: 'start'|'historyend'|'promptend',
    value: string,
    valueType: 'var'|'value',
    indent: number
}

export type triggerV2Impersonate = {
    type: 'v2Impersonate',
    role: 'user'|'char',
    value: string,
    valueType: 'var'|'value',
    indent: number
}

export type triggerV2Command = {
    type: 'v2Command',
    value: string,
    valueType: 'var'|'value',
    indent: number
}

export type triggerV2SendAIprompt = {
    type: 'v2SendAIprompt',
    indent: number
}

export type triggerV2ImgGen = {
    type: 'v2ImgGen',
    value: string,
    valueType: 'var'|'value',
    negValue: string,
    negValueType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2CheckSimilarity = {
    type: 'v2CheckSimilarity',
    source: string,
    sourceType: 'var'|'value',
    value: string,
    valueType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2RunLLM = {
    type: 'v2RunLLM',
    value: string,
    valueType: 'var'|'value',
    model: 'model'|'submodel',
    outputVar: string,
    indent: number
}

export type triggerV2ShowAlert = {
    type: 'v2ShowAlert',
    value: string,
    valueType: 'var'|'value',
    indent: number
}

export type triggerV2ExtractRegex = {
    type: 'v2ExtractRegex',
    value: string,
    valueType: 'var'|'value',
    regex: string,
    regexType: 'var'|'value',
    flags: string,
    flagsType: 'var'|'value',
    result: string,
    resultType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2GetLastMessage = {
    type: 'v2GetLastMessage',
    outputVar: string,
    indent: number
}

export type triggerV2GetMessageAtIndex = {
    type: 'v2GetMessageAtIndex',
    index: string,
    indexType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2GetMessageCount = {
    type: 'v2GetMessageCount',
    outputVar: string,
    indent: number
}

export type triggerV2ModifyLorebook = {
    type: 'v2ModifyLorebook',
    target: string,
    targetType: 'var'|'value',
    value: string,
    valueType: 'var'|'value',
    indent: number
}

export type triggerV2GetLorebook = {
    type: 'v2GetLorebook',
    target: string,
    targetType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2GetLorebookCount = {
    type: 'v2GetLorebookCount',
    outputVar: string,
    indent: number
}

export type triggerV2GetLorebookEntry = {
    type: 'v2GetLorebookEntry',
    index: string,
    indexType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2SetLorebookActivation = {
    type: 'v2SetLorebookActivation',
    index: string,
    indexType: 'var'|'value',
    value: boolean,
    indent: number
}

export type triggerV2GetLorebookIndexViaName = {
    type: 'v2GetLorebookIndexViaName',
    name: string,
    nameType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2Random = {
    type: 'v2Random',
    min: string,
    minType: 'var'|'value',
    max: string,
    maxType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2GetCharAt = {
    type: 'v2GetCharAt',
    source: string,
    sourceType: 'var'|'value',
    index: string,
    indexType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2GetCharCount = {
    type: 'v2GetCharCount',
    source: string,
    sourceType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2ToLowerCase = {
    type: 'v2ToLowerCase',
    source: string,
    sourceType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2ToUpperCase = {
    type: 'v2ToUpperCase',
    source: string,
    sourceType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2SetCharAt = {
    type: 'v2SetCharAt',
    source: string,
    sourceType: 'var'|'value',
    index: string,
    indexType: 'var'|'value',
    value: string,
    valueType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2SplitString = {
    type: 'v2SplitString',
    source: string,
    sourceType: 'var'|'value',
    delimiter: string,
    delimiterType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2GetCharacterDesc = {
    type: 'v2GetCharacterDesc',
    outputVar: string,
    indent: number
}

export type triggerV2SetCharacterDesc = {
    type: 'v2SetCharacterDesc',
    value: string,
    valueType: 'var'|'value',
    indent: number
}

export type triggerV2MakeArrayVar = {
    type: 'v2MakeArrayVar',
    var: string,
    indent: number
}

export type triggerV2GetArrayVarLength = {
    type: 'v2GetArrayVarLength',
    var: string,
    outputVar: string,
    indent: number
}

export type triggerV2GetArrayVar = {
    type: 'v2GetArrayVar',
    var: string,
    index: string,
    indexType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2SetArrayVar = {
    type: 'v2SetArrayVar',
    var: string,
    index: string,
    indexType: 'var'|'value',
    value: string,
    valueType: 'var'|'value',
    indent: number
}

export type triggerV2PushArrayVar = {
    type: 'v2PushArrayVar',
    var: string,
    value: string,
    valueType: 'var'|'value',
    indent: number
}

export type triggerV2PopArrayVar = {
    type: 'v2PopArrayVar',
    var: string,
    outputVar: string,
    indent: number
}

export type triggerV2ShiftArrayVar = {
    type: 'v2ShiftArrayVar',
    var: string,
    outputVar: string,
    indent: number
}

export type triggerV2UnshiftArrayVar = {
    type: 'v2UnshiftArrayVar',
    var: string,
    value: string,
    valueType: 'var'|'value',
    indent: number
}

export type triggerV2SpliceArrayVar = {
    type: 'v2SpliceArrayVar',
    var: string,
    start: string,
    startType: 'var'|'value',
    item: string,
    itemType: 'var'|'value',
    indent: number
}

export type triggerV2SliceArrayVar = {
    type: 'v2SliceArrayVar',
    var: string,
    start: string,
    startType: 'var'|'value',
    end: string,
    endType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2GetIndexOfValueInArrayVar = {
    type: 'v2GetIndexOfValueInArrayVar',
    var: string,
    value: string,
    valueType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2RemoveIndexFromArrayVar = {
    type: 'v2RemoveIndexFromArrayVar',
    var: string,
    index: string,
    indexType: 'var'|'value',
    indent: number
}

export type triggerV2ConcatString = {
    type: 'v2ConcatString',
    source1: string,
    source1Type: 'var'|'value',
    source2: string,
    source2Type: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2GetLastUserMessage = {
    type: 'v2GetLastUserMessage',
    outputVar: string,
    indent: number
}

export type triggerV2GetLastCharMessage = {
    type: 'v2GetLastCharMessage',
    outputVar: string,
    indent: number
}

export type triggerV2GetFirstMessage = {
    type: 'v2GetFirstMessage',
    outputVar: string,
    indent: number
}

export type triggerV2GetAlertInput = {
    type: 'v2GetAlertInput',
    display: string,
    displayType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2GetDisplayState = {
    type: 'v2GetDisplayState',
    outputVar: string,
    indent: number
}

export type triggerV2SetDisplayState = {
    type: 'v2SetDisplayState',
    value: string,
    valueType: 'var'|'value',
    indent: number
}

export type triggerV2GetRequestState = {
    type: 'v2GetRequestState',
    outputVar: string,
    index: string,
    indexType: 'var'|'value',
    indent: number
}

export type triggerV2GetRequestStateRole = {
    type: 'v2GetRequestStateRole',
    outputVar: string,
    index: string,
    indexType: 'var'|'value',
    indent: number
}

export type triggerV2SetRequestState = {
    type: 'v2SetRequestState',
    value: string,
    valueType: 'var'|'value',
    index: string,
    indexType: 'var'|'value',
    indent: number
}

export type triggerV2SetRequestStateRole = {
    type: 'v2SetRequestStateRole',
    value: string,
    valueType: 'var'|'value',
    index: string,
    indexType: 'var'|'value',
    indent: number
}

export type triggerV2GetReuqestStateLength = {
    type: 'v2GetRequestStateLength',
    outputVar: string,
    indent: number
}

export type triggerV2UpdateGUI = {
    type: 'v2UpdateGUI',
    indent: number
}

export type triggerV2UpdateChatAt = {
    type: 'v2UpdateChatAt',
    index: string,
    indent: number
}

export type triggerV2Wait = {
    type: 'v2Wait',
    value: string,
    valueType: 'var'|'value',
    indent: number
}

export type triggerV2IfAdvanced = {
    type: 'v2IfAdvanced',
    condition: '='|'!='|'>'|'<'|'>='|'<='|'≒'|'∋'|'∈'|'∌'|'∉'|'≡'
    targetType: 'var'|'value',
    target: string,
    sourceType: 'var'|'value',
    source: string,
    indent: number
}

export type triggerV2QuickSearchChat = {
    type: 'v2QuickSearchChat',
    value: string,
    valueType: 'var'|'value',
    condition: 'loose'|'strict'|'regex',
    depth: string,
    depthType: 'var'|'value',
    outputVar: string,
    indent: number
}

export type triggerV2StopPromptSending = {
    type: 'v2StopPromptSending',
    indent: number
}

export type triggerV2Tokenize = {
    type: 'v2Tokenize',
    indent: number,
    value: string
    valueType: "var"|"value"
    outputVar:string
}

const safeSubset = [
    'v2SetVar',
    'v2If',
    'v2IfAdvanced',
    'v2Else',
    'v2EndIndent',
    'v2LoopNTimes',
    'v2BreakLoop',
    'v2ConsoleLog',
    'v2StopTrigger',
    'v2Random',
    'v2ExtractRegex',
    'v2GetCharAt',
    'v2GetCharCount',
    'v2ToLowerCase',
    'v2ToUpperCase',
    'v2SetCharAt',
    'v2SplitString',
    'v2ConcatString',
    'v2MakeArrayVar',
    'v2GetArrayVarLength',
    'v2GetArrayVar',
    'v2SetArrayVar',
    'v2PushArrayVar',
    'v2PopArrayVar',
    'v2ShiftArrayVar',
    'v2UnshiftArrayVar',
    'v2SpliceArrayVar',
    'v2SliceArrayVar',
    'v2GetIndexOfValueInArrayVar',
    'v2RemoveIndexFromArrayVar'
]

export const displayAllowList = [
    'v2GetDisplayState',
    'v2SetDisplayState',
    ...safeSubset
]

export const requestAllowList = [
    'v2GetRequestState',
    'v2SetRequestState',
    'v2GetRequestStateRole',
    'v2SetRequestStateRole',
    'v2GetRequestStateLength',
    ...safeSubset
]

export async function runTrigger(char:character,mode:triggerMode, arg:{
    chat: Chat,
    recursiveCount?: number
    additonalSysPrompt?: additonalSysPrompt
    stopSending?: boolean
    manualName?: string
    displayMode?: boolean
    displayData?: string
    tempVars?: Record<string, string>
}){
    arg.recursiveCount ??= 0
    char = arg.displayMode ? char : safeStructuredClone(char)
    let varChanged = false
    let stopSending = arg.stopSending ?? false
    const CharacterlowLevelAccess = char.lowLevelAccess ?? false
    let sendAIprompt = false
    const currentChat = getCurrentChat()
    let additonalSysPrompt:additonalSysPrompt = arg.additonalSysPrompt ?? {
        start:'',
        historyend: '',
        promptend: ''
    }
    const triggers = char.triggerscript.map((v) => {
        v.lowLevelAccess = CharacterlowLevelAccess
        return v
    }).concat(getModuleTriggers())
    const db = getDatabase()
    const defaultVariables = parseKeyValue(char.defaultVariables).concat(parseKeyValue(db.templateDefaultVariables))
    let chat = arg.displayMode ? arg.chat : safeStructuredClone(arg.chat ?? char.chats[char.chatPage])
    if((!triggers) || (triggers.length === 0)){
        return null
    }

    let tempVars:Record<string, string> = arg.tempVars ?? {}

    function getVar(key:string){
        const state = chat.scriptstate?.['$' + key]
        if(state === undefined || state === null){
            const findResult = defaultVariables.find((f) => {
                return f[0] === key
            })
            if(findResult){
                return findResult[1]
            }
            if(arg.displayMode){
                return tempVars[key] ?? 'null'
            }
            return 'null'
        }
        return state.toString()
    }

    function setVar(key:string, value:string){
        if(arg.displayMode){
            tempVars[key] = value
            return
        }
        const selectedCharId = get(selectedCharID)
        const currentCharacter = getCurrentCharacter()
        const db = getDatabase()
        varChanged = true
        chat.scriptstate ??= {}
        chat.scriptstate['$' + key] = value
        currentChat.scriptstate = chat.scriptstate
        currentCharacter.chats[currentCharacter.chatPage].scriptstate = chat.scriptstate
        db.characters[selectedCharId].chats[currentCharacter.chatPage].scriptstate = chat.scriptstate
    }
    
    
    for(const trigger of triggers){
        let tempVars:Record<string, number> = {}

        if(trigger.effect[0]?.type === 'triggercode' || trigger.effect[0]?.type === 'triggerlua'){
            //
        }
        else if(arg.manualName){
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
                            if(Number(varValue) <= Number(conditionValue)){
                                pass = false
                            }
                            break
                        case '<':
                            if(Number(varValue) >= Number(conditionValue)){
                                pass = false
                            }
                            break
                        case '>=':
                            if(Number(varValue) < Number(conditionValue)){
                                pass = false
                            }
                            break
                        case '<=':
                            if(Number(varValue) > Number(conditionValue)){
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

        for(let index = 0; index < trigger.effect.length; index++){
            const effect = trigger.effect[index]
            if(mode === 'display' && !displayAllowList.includes(effect.type)){
                continue
            }
            if(mode === 'request' && !requestAllowList.includes(effect.type)){
                continue
            }
            switch(effect.type){
                case'setvar': {
                    const effectValue = risuChatParser(effect.value,{chara:char})
                    const varKey  = risuChatParser(effect.var,{chara:char})
                    let originalVar = Number(getVar(varKey))
                    if(Number.isNaN(originalVar)){
                        originalVar = 0
                    }
                    let resultValue = ''
                    switch(effect.operator){
                        case '=':{
                            resultValue = effectValue
                            break
                        }
                        case '+=':{
                            resultValue = (originalVar + Number(effectValue)).toString()
                            break
                        }
                        case '-=':{
                            resultValue = (originalVar - Number(effectValue)).toString()
                            break
                        }
                        case '*=':{
                            resultValue = (originalVar * Number(effectValue)).toString()
                            break
                        }
                        case '/=':{
                            resultValue = (originalVar / Number(effectValue)).toString()
                            break
                        }
                    }
                    setVar(varKey, resultValue)
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
                case 'stop':
                case 'v2StopPromptSending':{
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

                    if(arg.displayMode){
                        return
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
                            break;
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
                    let promptbody:OpenAIChat[] = parseChatML(effectValue)
                    if(!promptbody){
                        promptbody = [{role:'user', content:effectValue}]
                    }
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

                    const processer = new HypaProcesser()
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

                case 'triggerlua':{
                    const triggerCodeResult = await runScripted(effect.code,{
                        lowLevelAccess: trigger.lowLevelAccess,
                        mode: mode === 'manual' ? arg.manualName : mode,
                        setVar: setVar,
                        getVar: getVar,
                        char: char,
                        chat: chat,
                    })

                    if(triggerCodeResult.stopSending){
                        stopSending = true
                    }
                    chat = triggerCodeResult.chat
                    break
                }

                //V2 triggers
                case 'v2Header':{
                    //Header for V2 triggers to identify the start of a new trigger
                    break
                }
                case 'v2SetVar':{
                    const effectValue = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    const varKey  = risuChatParser(effect.var,{chara:char})
                    let originalVar = Number(getVar(varKey))
                    if(Number.isNaN(originalVar)){
                        originalVar = 0
                    }
                    let resultValue = ''
                    switch(effect.operator){
                        case '=':{
                            resultValue = effectValue
                            break
                        }
                        case '+=':{
                            resultValue = (originalVar + Number(effectValue)).toString()
                            break
                        }
                        case '-=':{
                            resultValue = (originalVar - Number(effectValue)).toString()
                            break
                        }
                        case '*=':{
                            resultValue = (originalVar * Number(effectValue)).toString()
                            break
                        }
                        case '/=':{
                            resultValue = (originalVar / Number(effectValue)).toString()
                            break
                        }
                        case '%=':{
                            resultValue = (originalVar % Number(effectValue)).toString()
                            break
                        }
                    }
                    setVar(varKey, resultValue)
                    break
                }
                case 'v2If':
                case 'v2IfAdvanced':{
                    const sourceValue = (effect.type === 'v2If' || effect.sourceType === 'var') ? getVar(risuChatParser(effect.source,{chara:char})) : risuChatParser(effect.source,{chara:char})
                    const targetValue = effect.targetType === 'value' ? risuChatParser(effect.target,{chara:char}) : getVar(risuChatParser(effect.target,{chara:char}))
                    let pass = false
                    switch(effect.condition){
                        case '=':{                            
                            if(!isNaN(Number(sourceValue)) && !isNaN(Number(targetValue))){ //to check like 1.0 = 1
                                pass = Number(sourceValue) === Number(targetValue)
                            }
                            else{
                                pass = sourceValue === targetValue
                            }
                            break
                        }
                        case '!=':{
                            if(!isNaN(Number(sourceValue)) && !isNaN(Number(targetValue))){ //to check like 1.0 = 1
                                pass = Number(sourceValue) !== Number(targetValue)
                            }
                            else{
                                pass = sourceValue !== targetValue
                            }
                            break
                        }
                        case '>':{
                            pass = Number(sourceValue) > Number(targetValue)
                            break
                        }
                        case '<':{
                            pass = Number(sourceValue) < Number(targetValue)
                            break
                        }
                        case '>=':{
                            pass = Number(sourceValue) >= Number(targetValue)
                            break
                        }
                        case '<=':{
                            pass = Number(sourceValue) <= Number(targetValue)
                            break
                        }
                        case '∈':{
                            try {
                                pass = JSON.parse(targetValue).includes(sourceValue)
                            } catch (error) {
                                pass = false
                            }
                            break
                        }
                        case '∋':{
                            try {
                                pass = JSON.parse(sourceValue).includes(targetValue)
                            } catch (error) {
                                pass = false
                            }
                            break
                        }
                        case '∉':{
                            try {
                                pass = !JSON.parse(targetValue).includes(sourceValue)
                            } catch (error) {
                                pass = true
                            }
                            break
                        }
                        case '∌':{
                            try {
                                pass = !JSON.parse(sourceValue).includes(targetValue)
                            } catch (error) {
                                pass = true
                            }
                            break
                        }
                        case '≒':{
                            const num1 = Number(sourceValue)
                            const num2 = Number(targetValue)
                            if(Number.isNaN(num1) || Number.isNaN(num2)){
                                pass = sourceValue.toLocaleLowerCase().replace(/ /g,'') === targetValue.toLocaleLowerCase().replace(/ /g,'')
                            }
                            else{
                                pass = Math.abs(num1 - num2) < 0.0001
                            }
                            break
                        }
                        case '≡':{
                            if(targetValue === 'true'){
                                pass = sourceValue === 'true' || sourceValue === '1'
                            }
                            else if(targetValue === 'false'){
                                pass = !(sourceValue === 'true' || sourceValue === '1')
                            }
                            else{
                                pass = sourceValue === targetValue
                            }
                        }
                    }


                    if(!pass){
                        let indent = effect.indent + 1
                        for(; index < trigger.effect.length; index++){
                            const ef = trigger.effect[index] as triggerEffectV2
                            if(ef.type === 'v2EndIndent' && indent === ef.indent){
                                const nextEf = trigger.effect[index + 1] as triggerEffectV2
                                indent--
                                if(nextEf?.type === 'v2Else' && nextEf?.indent === indent){
                                    index++
                                }

                                break
                            }
                        }
                    }
                    break
                }
                case 'v2Else':{
                    //since if handles the else if the if is false, we can skip the else
                    const indent = effect.indent + 1
                    for(; index < trigger.effect.length; index++){
                        const ef = trigger.effect[index] as triggerEffectV2
                        if(ef.type === 'v2EndIndent' && indent === ef.indent){
                            break
                        }
                    }
                    break
                }
                case 'v2EndIndent':{
                    if(effect.endOfLoop){
                        const indent = effect.indent - 1
                        const originalIndex = index
                        for(; index >= 0; index--){
                            const ef = trigger.effect[index] as triggerEffectV2
                            if((ef.type === 'v2Loop' || ef.type === 'v2LoopNTimes') && indent === ef.indent){
                                
                                if(ef.type === 'v2LoopNTimes'){
                                    let value = ef.valueType === 'value' ? risuChatParser(ef.value,{chara:char}) : getVar(risuChatParser(ef.value,{chara:char}))
                                    let valueNum = Number(value)
                                    if(Number.isNaN(valueNum)){
                                        valueNum = 0
                                    }
                                    tempVars[index + 'LoopNTimes'] = (tempVars[index + 'LoopNTimes'] ?? 0) + 1
                                    if(tempVars[index + 'LoopNTimes'] >= valueNum){
                                        index = originalIndex
                                    }
                                    else{
                                        break
                                    }
                                }

                                break
                            }
                        }
                        
                        //this is for preventing lagging
                        tempVars['loopTimes'] = (tempVars['loopTimes'] ?? 0) + 1
                        if(tempVars['loopTimes'] > 100){
                            await sleep(1)
                            tempVars['loopTimes'] = 0
                        }
                    }
                    break
                }
                case 'v2Loop':
                case 'v2LoopNTimes':{
                    //Looping is handled by the v2EndIndent
                    break
                }
                case 'v2BreakLoop':{
                    for(; index < trigger.effect.length; index++){
                        const ef = trigger.effect[index] as triggerEffectV2
                        if(ef.type === 'v2EndIndent' && ef.endOfLoop){
                            break
                        }
                    }
                    break
                }
                case 'v2RunTrigger':{
                    if(arg.recursiveCount < 10 || trigger.lowLevelAccess){
                        arg.recursiveCount++
                        const r = await runTrigger(char,'manual',{
                            chat,
                            recursiveCount: arg.recursiveCount,
                            additonalSysPrompt,
                            stopSending,
                            manualName: effect.target
                        })
                        if(r){
                            additonalSysPrompt = r.additonalSysPrompt
                            chat = r.chat
                            stopSending = r.stopSending
                        }
                    }
                    break
                }
                case 'v2ConsoleLog':{
                    const sourceValue = effect.sourceType === 'value' ? risuChatParser(effect.source,{chara:char}) : getVar(risuChatParser(effect.source,{chara:char}))
                    console.log(sourceValue)
                    break
                }
                case 'v2StopTrigger':{
                    index = trigger.effect.length
                    break
                }
                case 'v2CutChat':{
                    let start = effect.startType === 'value' ? Number(risuChatParser(effect.start,{chara:char})) : Number(getVar(risuChatParser(effect.start,{chara:char})))
                    let end = effect.endType === 'value' ? Number(risuChatParser(effect.end,{chara:char})) : Number(getVar(risuChatParser(effect.end,{chara:char})))
                    if(isNaN(start)){
                        start = 0
                    }
                    if(isNaN(end)){
                        end = chat.message.length
                    }
                    
                    chat.message = chat.message.slice(start,end)
                    break
                }
                case 'v2ModifyChat':{
                    let index = effect.indexType === 'value' ? Number(risuChatParser(effect.index,{chara:char})) : Number(getVar(risuChatParser(effect.index,{chara:char})))
                    let value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    if(chat.message[index]){
                        chat.message[index].data = value
                    }
                    break
                }
                case 'v2SystemPrompt':{
                    let value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    additonalSysPrompt[effect.location] += value + "\n\n"
                    break
                }
                case 'v2Impersonate':{
                    let value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    if(effect.role === 'user'){
                        chat.message.push({role: 'user', data: value})
                    }
                    else if(effect.role === 'char'){
                        chat.message.push({role: 'char', data: value})
                    }
                    break
                }
                case 'v2Command':{
                    let value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    await processMultiCommand(value)
                    break
                }
                case 'v2SendAIprompt':{
                    if(!trigger.lowLevelAccess){
                        break
                    }
                    sendAIprompt = true
                    break
                }
                case 'v2ImgGen':{
                    if(!trigger.lowLevelAccess){
                        break
                    }
                    let value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    let negValue = effect.negValueType === 'value' ? risuChatParser(effect.negValue,{chara:char}) : getVar(risuChatParser(effect.negValue,{chara:char}))
                    let gen = await generateAIImage(value, char, negValue, 'inlay')
                    if(!gen){
                        setVar(effect.outputVar, 'null')
                        break
                    }
                    let imgHTML = new Image()
                    imgHTML.src = gen
                    let inlay = await writeInlayImage(imgHTML)
                    let res = `{{inlay::${inlay}}}`
                    setVar(effect.outputVar, res)
                    break

                }
                case 'v2CheckSimilarity':{
                    if(!trigger.lowLevelAccess){
                        break
                    }
                    let source = effect.sourceType === 'value' ? risuChatParser(effect.source,{chara:char}) : getVar(risuChatParser(effect.source,{chara:char}))
                    let value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    let processer = new HypaProcesser()
                    await processer.addText(value.split('§'))
                    let val = await processer.similaritySearch(source)
                    setVar(effect.outputVar, val.join('§'))
                    break
                }
                case 'v2RunLLM':{
                    if(!trigger.lowLevelAccess){
                        break
                    }
                    let value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    let varName = effect.outputVar
                    let promptbody = parseChatML(value)
                    if(!promptbody){
                        promptbody = [{role:'user', content:value}]
                    }
                    let result = await requestChatData({
                        formated: promptbody,
                        bias: {},
                        useStreaming: false,
                        noMultiGen: true,
                    }, effect.model)

                    if(result.type === 'fail' || result.type === 'streaming' || result.type === 'multiline'){
                        setVar(varName, 'null')
                    }
                    else{
                        setVar(varName, result.result)
                    }
                    break
                }
                case 'v2ShowAlert':{
                    if(arg.displayMode){
                        return
                    }
                    let value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    alertNormal(value)
                    break
                }
                case 'v2ExtractRegex':{
                    let value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    let regex = new RegExp(effect.regex, effect.flags)
                    let regexResult = regex.exec(value)
                    let result = effect.result.replace(/\$[0-9]+/g, (match) => {
                        let index = Number(match.slice(1))
                        return regexResult[index]
                    }).replace(/\$&/g, regexResult[0]).replace(/\$\$/g, '$')

                    setVar(effect.outputVar, result)
                    break
                }
                case 'v2GetLastMessage':{
                    setVar(effect.outputVar, chat.message[chat.message.length - 1]?.data ?? 'null')
                    break
                }
                case 'v2GetMessageAtIndex':{
                    let index = effect.indexType === 'value' ? Number(risuChatParser(effect.index,{chara:char})) : Number(getVar(risuChatParser(effect.index,{chara:char})))
                    setVar(effect.outputVar, chat.message[index]?.data ?? 'null')
                    break
                }
                case 'v2GetMessageCount':{
                    setVar(effect.outputVar, chat.message.length.toString())
                    break
                }
                case 'v2ModifyLorebook':{
                    char.globalLore = char.globalLore ?? []
                    const target = effect.targetType === 'value' ? risuChatParser(effect.target,{chara:char}) : getVar(risuChatParser(effect.target,{chara:char}))
                    const value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))

                    const index = char.globalLore.findIndex((v) => v[0] === target)
                    if(index !== -1){
                        char.globalLore[index][1] = value
                    }

                    const db = getDatabase()
                    const selectedCharId = get(selectedCharID)
                    db.characters[selectedCharId].globalLore = char.globalLore
                    setCurrentCharacter(db.characters[selectedCharId])
                    break
                }
                case 'v2GetLorebook':{
                    char.globalLore = char.globalLore ?? []
                    const target = effect.targetType === 'value' ? risuChatParser(effect.target,{chara:char}) : getVar(risuChatParser(effect.target,{chara:char}))
                    const index = char.globalLore.findIndex((v) => v[0] === target)
                    setVar(effect.outputVar, index === -1 ? 'null' : char.globalLore[index][1])
                    break
                }
                case 'v2GetLorebookCount':{
                    char.globalLore = char.globalLore ?? []
                    setVar(effect.outputVar, char.globalLore.length.toString())
                    break
                }
                case 'v2GetLorebookEntry':{
                    char.globalLore = char.globalLore ?? []
                    let index = effect.indexType === 'value' ? Number(risuChatParser(effect.index,{chara:char})) : Number(getVar(risuChatParser(effect.index,{chara:char})))
                    if(Number.isNaN(index)){
                        index = 0
                    }
                    setVar(effect.outputVar, char.globalLore[index]?.[1] ?? 'null')
                    break
                }
                case 'v2SetLorebookActivation':{
                    char.globalLore = char.globalLore ?? []
                    let index = effect.indexType === 'value' ? Number(risuChatParser(effect.index,{chara:char})) : Number(getVar(risuChatParser(effect.index,{chara:char})))
                    let value = effect.value
                    char.globalLore[index][2] = value

                    const selectedCharId = get(selectedCharID)
                    const db = getDatabase()
                    db.characters[selectedCharId].globalLore = char.globalLore
                    setCurrentCharacter(char)

                    break
                }
                case 'v2GetLorebookIndexViaName':{
                    char.globalLore = char.globalLore ?? []
                    let name = effect.nameType === 'value' ? risuChatParser(effect.name,{chara:char}) : getVar(risuChatParser(effect.name,{chara:char}))
                    let index = char.globalLore.findIndex((v) => v[0] === name)
                    setVar(effect.outputVar, index.toString())
                    break
                }
                case 'v2Random':{
                    let min = effect.minType === 'value' ? Number(risuChatParser(effect.min,{chara:char})) : Number(getVar(risuChatParser(effect.min,{chara:char})))
                    let max = effect.maxType === 'value' ? Number(risuChatParser(effect.max,{chara:char})) : Number(getVar(risuChatParser(effect.max,{chara:char})))

                    let output = Math.floor(Math.random() * (max - min + 1) + min)
                    setVar(effect.outputVar, output.toString())
                    break
                }
                case 'v2GetCharAt':{
                    let source = effect.sourceType === 'value' ? risuChatParser(effect.source,{chara:char}) : getVar(risuChatParser(effect.source,{chara:char}))
                    let index = effect.indexType === 'value' ? Number(risuChatParser(effect.index,{chara:char})) : Number(getVar(risuChatParser(effect.index,{chara:char})))
                    setVar(effect.outputVar, source[index] ?? 'null')
                    break
                }
                case 'v2GetCharCount':{
                    let source = effect.sourceType === 'value' ? risuChatParser(effect.source,{chara:char}) : getVar(risuChatParser(effect.source,{chara:char}))
                    setVar(effect.outputVar, source.length.toString())
                    break
                }
                case 'v2ToLowerCase':{
                    let source = effect.sourceType === 'value' ? risuChatParser(effect.source,{chara:char}) : getVar(risuChatParser(effect.source,{chara:char}))
                    setVar(effect.outputVar, source.toLowerCase())
                    break
                }
                case 'v2ToUpperCase':{
                    let source = effect.sourceType === 'value' ? risuChatParser(effect.source,{chara:char}) : getVar(risuChatParser(effect.source,{chara:char}))
                    setVar(effect.outputVar, source.toUpperCase())
                    break
                }
                case 'v2SetCharAt':{
                    let source = effect.sourceType === 'value' ? risuChatParser(effect.source,{chara:char}) : getVar(risuChatParser(effect.source,{chara:char}))
                    let index = effect.indexType === 'value' ? Number(risuChatParser(effect.index,{chara:char})) : Number(getVar(risuChatParser(effect.index,{chara:char})))
                    let value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    const source2 = source.split('')
                    source2[index] = value
                    setVar(effect.outputVar, source2.join(''))
                    break
                }
                case 'v2SplitString':{
                    let source = effect.sourceType === 'value' ? risuChatParser(effect.source,{chara:char}) : getVar(risuChatParser(effect.source,{chara:char}))
                    let delimiter = effect.delimiterType === 'value' ? risuChatParser(effect.delimiter,{chara:char}) : getVar(risuChatParser(effect.delimiter,{chara:char}))
                    setVar(effect.outputVar, JSON.stringify(source.split(delimiter)))
                    break
                }
                case 'v2GetCharacterDesc':{
                    setVar(effect.outputVar, char.desc)
                    break
                }
                case 'v2SetCharacterDesc':{
                    let value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    char.desc = value
                    const selectedCharId = get(selectedCharID)
                    const db = getDatabase();
                    (db.characters[selectedCharId] as character).desc = value
                    setCurrentCharacter(char)
                    break
                }
                case 'v2MakeArrayVar':{
                    if(effect.var.startsWith('[') && effect.var.endsWith(']')){
                        return
                    }

                    setVar(effect.var, '[]')
                    break
                }
                case 'v2GetArrayVarLength':{
                    try {
                        let varValue = getVar(effect.var)
                        let arr = JSON.parse(varValue)
                        setVar(effect.outputVar, arr.length.toString())
                    } catch (error) {
                        setVar(effect.outputVar, '0')
                    }
                    break
                }
                case 'v2GetArrayVar':{
                    try {
                        let varValue = getVar(effect.var)
                        let arr = JSON.parse(varValue)
                        let index = effect.indexType === 'value' ? Number(risuChatParser(effect.index,{chara:char})) : Number(getVar(risuChatParser(effect.index,{chara:char})))
                        setVar(effect.outputVar, arr[index] ?? 'null')
                    } catch (error) {
                        setVar(effect.outputVar, 'null')
                    }
                    break
                }
                case 'v2PushArrayVar':{
                    try {
                        let varValue = getVar(effect.var)
                        let arr = JSON.parse(varValue)
                        let value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                        arr.push(value)
                        setVar(effect.var, JSON.stringify(arr))
                    } catch (error) {
                        setVar(effect.var, '[]')
                    }
                    break
                }
                case 'v2PopArrayVar':{
                    try {
                        let varValue = getVar(effect.var)
                        let arr = JSON.parse(varValue)
                        arr.pop()
                        setVar(effect.var, JSON.stringify(arr))
                    } catch (error) {
                        setVar(effect.var, '[]')
                    }
                    break
                }
                case 'v2ShiftArrayVar':{
                    try {
                        let varValue = getVar(effect.var)
                        let arr = JSON.parse(varValue)
                        arr.shift()
                        setVar(effect.var, JSON.stringify(arr))
                    } catch (error) {
                        setVar(effect.var, '[]')
                    }
                    break
                }
                case 'v2UnshiftArrayVar':{
                    try {
                        let varValue = getVar(effect.var)
                        let arr = JSON.parse(varValue)
                        let value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                        arr.unshift(value)
                        setVar(effect.var, JSON.stringify(arr))
                    } catch (error) {
                        setVar(effect.var, '[]')
                    }
                    break
                }
                case 'v2SpliceArrayVar':{
                    try {
                        let varValue = getVar(effect.var)
                        let arr = JSON.parse(varValue)
                        let start = effect.startType === 'value' ? Number(risuChatParser(effect.start,{chara:char})) : Number(getVar(risuChatParser(effect.start,{chara:char})))
                        let value = effect.itemType === 'value' ? risuChatParser(effect.item,{chara:char}) : getVar(risuChatParser(effect.item,{chara:char}))
                        arr.splice(start, 0, value)
                        setVar(effect.var, JSON.stringify(arr))
                    } catch (error) {
                        setVar(effect.var, '[]')
                    }
                    break
                }
                case 'v2SliceArrayVar':{
                    try {
                        let varValue = getVar(effect.var)
                        let arr = JSON.parse(varValue)
                        let start = effect.startType === 'value' ? Number(risuChatParser(effect.start,{chara:char})) : Number(getVar(risuChatParser(effect.start,{chara:char})))
                        let end = effect.endType === 'value' ? Number(risuChatParser(effect.end,{chara:char})) : Number(getVar(risuChatParser(effect.end,{chara:char})))
                        
                        setVar(effect.outputVar, JSON.stringify(arr.slice(start,end)))
                    } catch (error) {
                        setVar(effect.outputVar, '[]')
                    }
                    break
                }
                case 'v2GetIndexOfValueInArrayVar':{
                    try {
                        let varValue = getVar(effect.var)
                        let arr = JSON.parse(varValue)
                        let value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                        setVar(effect.outputVar, arr.indexOf(value).toString())
                    } catch (error) {
                        setVar(effect.outputVar, '-1')
                    }
                    break
                }
                case 'v2RemoveIndexFromArrayVar':{
                    try {
                        let varValue = getVar(effect.var)
                        let arr = JSON.parse(varValue)
                        let index = effect.indexType === 'value' ? Number(risuChatParser(effect.index,{chara:char})) : Number(getVar(risuChatParser(effect.index,{chara:char})))
                        arr.splice(index, 1)
                        setVar(effect.var, JSON.stringify(arr))
                    } catch (error) {
                        setVar(effect.var, '[]')
                    }
                    break
                }
                case 'v2ConcatString':{
                    let source1 = effect.source1Type === 'value' ? risuChatParser(effect.source1,{chara:char}) : getVar(risuChatParser(effect.source1,{chara:char}))
                    let source2 = effect.source2Type === 'value' ? risuChatParser(effect.source2,{chara:char}) : getVar(risuChatParser(effect.source2,{chara:char}))
                    setVar(effect.outputVar, source1 + source2)
                    break
                }
                case 'v2GetLastUserMessage':{
                    let lastUserMessage = chat.message.slice().reverse().find((v) => v.role === 'user')
                    setVar(effect.outputVar, lastUserMessage?.data ?? 'null')
                    break
                }
                case 'v2GetLastCharMessage':{
                    let lastCharMessage = chat.message.slice().reverse().find((v) => v.role === 'char')
                    setVar(effect.outputVar, lastCharMessage?.data ?? 'null')
                    break
                }
                case 'v2GetFirstMessage':{
                    setVar(effect.outputVar, chat.fmIndex === -1 ? char.firstMessage : char.alternateGreetings[chat.fmIndex])
                    break
                }
                case 'v2GetAlertInput':{
                    if(arg.displayMode){
                        return
                    }
                    let value = await alertInput(
                        effect.displayType === 'value' ? risuChatParser(effect.display,{chara:char}) : getVar(risuChatParser(effect.display,{chara:char}))
                    )
                    setVar(effect.outputVar, value)
                    break
                }
                case 'v2SetArrayVar':{
                    const value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    const index = effect.indexType === 'value' ? Number(risuChatParser(effect.index,{chara:char})) : Number(getVar(risuChatParser(effect.index,{chara:char})))
                    if(Number.isNaN(index)){
                        break
                    }
                    try {
                        let varValue = getVar(effect.var)
                        let arr = JSON.parse(varValue)
                        arr[index] = value
                        setVar(effect.var, JSON.stringify(arr))
                    } catch (error) {
                        
                    }
                    break
                }
                case 'v2GetDisplayState':{
                    if(!arg.displayMode){
                        return
                    }
                    
                    setVar(effect.outputVar, arg.displayData ?? 'null')
                    break
                }
                case 'v2SetDisplayState':{
                    if(!arg.displayMode){
                        return
                    }
                    arg.displayData = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    break
                }
                case 'v2UpdateGUI':{
                    ReloadGUIPointer.set(get(ReloadGUIPointer) + 1)
                    break
                }
                case 'v2UpdateChatAt':{
                    ReloadChatPointer.update((v) => {
                        v[effect.index] = (v[effect.index] ?? 0) + 1
                        return v
                    })
                    break
                }
                case 'v2Wait':{
                    let value = effect.valueType === 'value' ? Number(risuChatParser(effect.value,{chara:char})) : Number(getVar(risuChatParser(effect.value,{chara:char})))
                    await sleep(value * 1000)
                    break
                }
                case 'v2GetRequestState':{
                    if(!arg.displayMode){
                        return
                    }
                    const json = JSON.parse(arg.displayData) as OpenAIChat[]
                    const index = effect.indexType === 'value' ? Number(risuChatParser(effect.index,{chara:char})) : Number(getVar(risuChatParser(effect.index,{chara:char})))
                    const content = json?.[index]?.content ?? 'null'
                    setVar(effect.outputVar, content)
                    break
                }
                case 'v2SetRequestState':{
                    if(!arg.displayMode){
                        return
                    }
                    const json = JSON.parse(arg.displayData) as OpenAIChat[]
                    const index = effect.indexType === 'value' ? Number(risuChatParser(effect.index,{chara:char})) : Number(getVar(risuChatParser(effect.index,{chara:char})))
                    const value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    json[index].content = value
                    arg.displayData = JSON.stringify(json)
                    break
                }
                case 'v2GetRequestStateRole':{
                    if(!arg.displayMode){
                        return
                    }
                    const json = JSON.parse(arg.displayData) as OpenAIChat[]
                    const index = effect.indexType === 'value' ? Number(risuChatParser(effect.index,{chara:char})) : Number(getVar(risuChatParser(effect.index,{chara:char})))
                    const content = json?.[index]?.role ?? 'null'
                    setVar(effect.outputVar, content)
                    break
                }
                case 'v2SetRequestStateRole':{
                    if(!arg.displayMode){
                        return
                    }
                    const json = JSON.parse(arg.displayData) as OpenAIChat[]
                    const index = effect.indexType === 'value' ? Number(risuChatParser(effect.index,{chara:char})) : Number(getVar(risuChatParser(effect.index,{chara:char})))
                    const value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    if(value === 'user' || value === 'assistant' || value === 'system'){
                        json[index].role = value
                    }
                    arg.displayData = JSON.stringify(json)
                    break
                }

                case 'v2GetRequestStateLength':{
                    if(!arg.displayMode){
                        return
                    }
                    const json = JSON.parse(arg.displayData) as OpenAIChat[]
                    setVar(effect.outputVar, json.length.toString())
                    break
                }
                case 'v2QuickSearchChat':{
                    const value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    const depth = effect.depthType === 'value' ? Number(risuChatParser(effect.depth,{chara:char})) : Number(getVar(risuChatParser(effect.depth,{chara:char})))
                    const condition = effect.condition

                    if(isNaN(depth)){
                        setVar(effect.outputVar, '0')
                        break
                    }
                    let pass = false
                    let da =  chat.message.slice(0-depth).map((v)=>v.data).join(' ')
                    if(condition === 'strict'){
                        pass = da.split(' ').includes(value)
                    }
                    else if(condition === 'loose'){
                        pass = da.toLowerCase().includes(value.toLowerCase())
                    }
                    else if(condition === 'regex'){
                        pass = new RegExp(value).test(da)
                    }
                    setVar(effect.outputVar, pass ? '1' : '0')
                    break
                }
                case 'v2Tokenize':{
                    const value = effect.valueType === 'value' ? risuChatParser(effect.value,{chara:char}) : getVar(risuChatParser(effect.value,{chara:char}))
                    setVar(effect.outputVar, (await tokenize(value)).toString())
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
        const currentChat = getCurrentChat()
        currentChat.scriptstate = chat.scriptstate
        ReloadGUIPointer.set(get(ReloadGUIPointer) + 1)
    }

    return {additonalSysPrompt, chat, tokens:caculatedTokens, stopSending, sendAIprompt, displayData: arg.displayData, tempVars: arg.tempVars}

}
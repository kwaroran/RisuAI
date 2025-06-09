<script lang="ts">
    import { PlusIcon, XIcon, ArrowLeftIcon } from "lucide-svelte";
    import { language } from "src/lang";
    import Button from "src/lib/UI/GUI/Button.svelte";
    import CheckInput from "src/lib/UI/GUI/CheckInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import Portal from "src/lib/UI/GUI/Portal.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
    import { type triggerEffectV2, type triggerEffect, type triggerscript, displayAllowList, requestAllowList, type triggerV2IfAdvanced } from "src/ts/process/triggers";
    import { onDestroy, onMount } from "svelte";

    interface Props {
        value?: triggerscript[];
        lowLevelAble?: boolean;
    }

    const effectV2Types = [
        //Special
        'v2GetDisplayState',
        'v2SetDisplayState',
        'v2GetRequestState',
        'v2SetRequestState',
        'v2GetRequestStateRole',
        'v2SetRequestStateRole',
        'v2GetRequestStateLength',

        //Control
        'v2SetVar',
        'v2If',
        'v2IfAdvanced',
        'v2LoopNTimes',
        'v2Loop',
        'v2BreakLoop',
        'v2RunTrigger',
        'v2ConsoleLog',
        'v2StopTrigger',

        //Chat
        'v2CutChat',
        'v2ModifyChat',
        'v2SystemPrompt',
        'v2Impersonate',
        'v2Command',
        'v2GetLastMessage',
        'v2GetLastUserMessage',
        'v2GetLastCharMessage',
        'v2GetMessageAtIndex',
        'v2GetMessageCount',
        'v2GetFirstMessage',
        'v2QuickSearchChat',

        //Low Level
        'v2SendAIprompt',
        'v2ImgGen',
        'v2CheckSimilarity',
        'v2RunLLM',

        //Alert
        'v2ShowAlert',
        'v2GetAlertInput',

        //Lorebook
        'v2ModifyLorebook',
        'v2GetLorebook',
        'v2GetLorebookCount',
        'v2GetLorebookEntry',
        'v2SetLorebookActivation',
        'v2GetLorebookIndexViaName',

        //String
        'v2ExtractRegex',
        'v2GetCharAt',
        'v2GetCharCount',
        'v2ToLowerCase',
        'v2ToUpperCase',
        'v2SetCharAt',
        'v2SplitString',
        'v2ConcatString',

        //Character
        'v2GetCharacterDesc',
        'v2SetCharacterDesc',

        //Array
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
        'v2RemoveIndexFromArrayVar',

        //Others
        'v2Random',
        'v2UpdateGUI',
        'v2UpdateChatAt',
        'v2Wait',
        "v2StopPromptSending",
        'v2Tokenize'
    ]


    const lowLevelOnly = [
        'v2SendAIprompt',
        'v2RunLLM',
        'v2CheckSimilarity',
        'v2RunImgGen'

    ]

    const specialTypes = [
        'v2GetDisplayState',
        'v2SetDisplayState',
        'v2GetRequestState',
        'v2SetRequestState',
        'v2GetRequestStateRole',
        'v2SetRequestStateRole',
        'v2GetRequestStateLength',
    ]
    
    let lastClickTime = 0
    let { value = $bindable([]), lowLevelAble = false }: Props = $props();
    let selectedIndex = $state(0);
    let selectedEffectIndex = $state(-1);
    let menuMode = $state(0)
    let editTrigger:triggerEffectV2 = $state(null as triggerEffectV2)
    let addElse = $state(false)
    let selectMode = $state(0) //0 = trigger 1 = effect
    let contextMenu = $state(false)
    let contextMenuLoc = $state({x: 0, y: 0, style: ''})
    let menu0Container = $state<HTMLDivElement>(null)
    let menu0ScrollPosition = $state(0)

    type VirtualClipboard = {
        type: 'trigger',
        value: triggerscript[]
    }|{
        type: 'effect',
        value: triggerEffect[]
    }
    let clipboard:VirtualClipboard = $state(null)

    
    $effect(() => {
        if(menuMode === 0){
            addElse = false
            if(menu0Container) {
                setTimeout(() => {
                    menu0Container.scrollTop = menu0ScrollPosition
                }, 0)
            }
        } else if(menuMode === 1 || menuMode === 2 || menuMode === 3) {
            if(menu0Container) {
                menu0ScrollPosition = menu0Container.scrollTop
            }
        }
    })

    const close = () => {
        selectedIndex = 0;
    }

    const checkSupported = (e:string) => {
        if(value[selectedIndex].type === 'display'){
            return displayAllowList.includes(e)
        }
        if(value[selectedIndex].type === 'request'){
            return requestAllowList.includes(e)
        }
        if(specialTypes.includes(e)){
            return false
        }

        if(lowLevelAble){
            return true
        }
        return !lowLevelOnly.includes(e)
    }
    const makeDefaultEditType = (type:string) => {
        switch(type){
            case 'v2SetVar':
                editTrigger = {
                    type: 'v2SetVar',
                    operator: '=',
                    var: '',
                    value: '',
                    valueType: 'value',
                    indent: 0
                }
                break;
            case 'v2If':
                editTrigger = {
                    type: 'v2If',
                    indent: 0,
                    condition: '=',
                    targetType: 'value',
                    target: '',
                    source: ''
                }
                break;
            case 'v2IfAdvanced':
                editTrigger = {
                    type: 'v2IfAdvanced',
                    indent: 0,
                    condition: '=',
                    targetType: 'value',
                    target: '',
                    sourceType: 'value',
                    source: '',
                }
                break;
            case 'v2Else':
                editTrigger = {
                    type: 'v2Else',
                    indent: 0
                }
                break;
            case 'v2Loop':
                editTrigger = {
                    type: 'v2Loop',
                    indent: 0,
                }
                break;
            case 'v2LoopNTimes':
                editTrigger = {
                    type: 'v2LoopNTimes',
                    indent: 0,
                    value: '10',
                    valueType: 'value'
                }
                break;
            case 'v2BreakLoop':
                editTrigger = {
                    type: 'v2BreakLoop',
                    indent: 0
                }
                break;
            case 'v2RunTrigger':
                editTrigger = {
                    type: 'v2RunTrigger',
                    indent: 0,
                    target: ''
                }
                break;
            case 'v2ConsoleLog':
                editTrigger = {
                    type: 'v2ConsoleLog',
                    indent: 0,
                    sourceType: 'value',
                    source: ''
                }
                break;
            case 'v2StopTrigger':
                editTrigger = {
                    type: 'v2StopTrigger',
                    indent: 0
                }
                break;
            case 'v2CutChat':
                editTrigger = {
                    type: 'v2CutChat',
                    indent: 0,
                    start: '0',
                    end: '0',
                    startType: 'value',
                    endType: 'value'
                }
                break;
            case 'v2ModifyChat':
                editTrigger = {
                    type: 'v2ModifyChat',
                    index: '',
                    indexType: 'value',
                    value: '',
                    valueType: 'value',
                    indent: 0
                }
                break;
            case 'v2SystemPrompt':
                editTrigger = {
                    type: 'v2SystemPrompt',
                    location: 'start',
                    value: '',
                    valueType: 'value',
                    indent: 0
                }
                break;
            case 'v2Impersonate':
                editTrigger = {
                    type: 'v2Impersonate',
                    role: 'user',
                    value: '',
                    valueType: 'value',
                    indent: 0
                }
                break;
            case 'v2Command':
                editTrigger = {
                    type: 'v2Command',
                    value: '',
                    valueType: 'value',
                    indent: 0
                }
                break;
            case 'v2SendAIprompt':
                editTrigger = {
                    type: 'v2SendAIprompt',
                    indent: 0
                }
                break;
            case 'v2ImgGen':
                editTrigger = {
                    type: 'v2ImgGen',
                    value: '',
                    valueType: 'value',
                    negValue: '',
                    negValueType: 'value',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2CheckSimilarity':
                editTrigger = {
                    type: 'v2CheckSimilarity',
                    source: '',
                    sourceType: 'value',
                    value: '',
                    valueType: 'value',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2RunLLM':
                editTrigger = {
                    type: 'v2RunLLM',
                    value: '',
                    valueType: 'value',
                    outputVar: '',
                    indent: 0,
                    model: 'model'
                }
                break;
            case 'v2ShowAlert':
                editTrigger = {
                    type: 'v2ShowAlert',
                    value: '',
                    valueType: 'value',
                    indent: 0
                }
                break;
            case 'v2ExtractRegex':
                editTrigger = {
                    type: 'v2ExtractRegex',
                    value: '',
                    valueType: 'value',
                    regex: '',
                    regexType: 'value',
                    flags: '',
                    flagsType: 'value',
                    result: '',
                    resultType: 'value',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2GetLastMessage':
                editTrigger = {
                    type: 'v2GetLastMessage',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2GetMessageAtIndex':
                editTrigger = {
                    type: 'v2GetMessageAtIndex',
                    index: '',
                    indexType: 'value',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2GetMessageCount':
                editTrigger = {
                    type: 'v2GetMessageCount',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2ModifyLorebook':
                editTrigger = {
                    type: 'v2ModifyLorebook',
                    target: '',
                    targetType: 'value',
                    value: '',
                    valueType: 'value',
                    indent: 0
                }
                break;
            case 'v2GetLorebook':
                editTrigger = {
                    type: 'v2GetLorebook',
                    target: '',
                    targetType: 'value',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2GetLorebookCount':
                editTrigger = {
                    type: 'v2GetLorebookCount',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2GetLorebookEntry':
                editTrigger = {
                    type: 'v2GetLorebookEntry',
                    index: '',
                    indexType: 'value',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2SetLorebookActivation':
                editTrigger = {
                    type: 'v2SetLorebookActivation',
                    index: '',
                    indexType: 'value',
                    value: true,
                    indent: 0
                }
                break;
            case 'v2GetLorebookIndexViaName':
                editTrigger = {
                    type: 'v2GetLorebookIndexViaName',
                    name: '',
                    nameType: 'value',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2Random':
                editTrigger = {
                    type: 'v2Random',
                    outputVar: '',
                    min: '0',
                    max: '100',
                    minType: 'value',
                    maxType: 'value',
                    indent: 0
                }
                break;
            case 'v2GetCharAt':
                editTrigger = {
                    type: 'v2GetCharAt',
                    source: '',
                    sourceType: 'value',
                    index: '',
                    indexType: 'value',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2GetCharCount':
                editTrigger = {
                    type: 'v2GetCharCount',
                    source: '',
                    sourceType: 'value',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2ToLowerCase':
                editTrigger = {
                    type: 'v2ToLowerCase',
                    source: '',
                    sourceType: 'value',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2ToUpperCase':
                editTrigger = {
                    type: 'v2ToUpperCase',
                    source: '',
                    sourceType: 'value',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2SetCharAt':
                editTrigger = {
                    type: 'v2SetCharAt',
                    source: '',
                    sourceType: 'value',
                    index: '',
                    indexType: 'value',
                    value: '',
                    valueType: 'value',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2SplitString':
                editTrigger = {
                    type: 'v2SplitString',
                    source: '',
                    sourceType: 'value',
                    delimiter: '',
                    delimiterType: 'value',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2GetCharacterDesc':
                editTrigger = {
                    type: 'v2GetCharacterDesc',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2SetCharacterDesc':
                editTrigger = {
                    type: 'v2SetCharacterDesc',
                    value: '',
                    valueType: 'value',
                    indent: 0
                }
                break;
            case 'v2MakeArrayVar':
                editTrigger = {
                    type: 'v2MakeArrayVar',
                    var: '',
                    indent: 0
                }
                break;
            case 'v2GetArrayVarLength':
                editTrigger = {
                    type: 'v2GetArrayVarLength',
                    var: '',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2GetArrayVar':
                editTrigger = {
                    type: 'v2GetArrayVar',
                    var: '',
                    index: '',
                    indexType: 'value',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2SetArrayVar':
                editTrigger = {
                    type: 'v2SetArrayVar',
                    var: '',
                    index: '',
                    indexType: 'value',
                    value: '',
                    valueType: 'value',
                    indent: 0
                }
                break;
            case 'v2Tokenize':{
                editTrigger = {
                    type: 'v2Tokenize',
                    value: '',
                    valueType: 'value',
                    indent: 0,
                    outputVar: ""
                }
            }
            case 'v2PushArrayVar':
                editTrigger = {
                    type: 'v2PushArrayVar',
                    var: '',
                    value: '',
                    valueType: 'value',
                    indent: 0
                }
                break;
            case 'v2PopArrayVar':
                editTrigger = {
                    type: 'v2PopArrayVar',
                    var: '',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2ShiftArrayVar':
                editTrigger = {
                    type: 'v2ShiftArrayVar',
                    var: '',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2UnshiftArrayVar':
                editTrigger = {
                    type: 'v2UnshiftArrayVar',
                    var: '',
                    value: '',
                    valueType: 'value',
                    indent: 0
                }
                break;
            case 'v2SpliceArrayVar':
                editTrigger = {
                    type: 'v2SpliceArrayVar',
                    var: '',
                    start: '',
                    startType: 'value',
                    item: '',
                    itemType: 'value',
                    indent: 0
                }
                break;
            case 'v2SliceArrayVar':
                editTrigger = {
                    type: 'v2SliceArrayVar',
                    var: '',
                    start: '',
                    startType: 'value',
                    end: '',
                    endType: 'value',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2GetIndexOfValueInArrayVar':
                editTrigger = {
                    type: 'v2GetIndexOfValueInArrayVar',
                    var: '',
                    value: '',
                    valueType: 'value',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2RemoveIndexFromArrayVar':
                editTrigger = {
                    type: 'v2RemoveIndexFromArrayVar',
                    var: '',
                    index: '',
                    indexType: 'value',
                    indent: 0
                }
                break;
            case 'v2ConcatString':
                editTrigger = {
                    type: 'v2ConcatString',
                    source1: '',
                    source1Type: 'value',
                    source2: '',
                    source2Type: 'value',
                    outputVar: '',
                    indent: 0
                }
                break;
            case 'v2GetLastUserMessage':{
                editTrigger = {
                    type: 'v2GetLastUserMessage',
                    outputVar: '',
                    indent: 0
                }
                break;
            }
            case 'v2GetLastCharMessage':{
                editTrigger = {
                    type: 'v2GetLastCharMessage',
                    outputVar: '',
                    indent: 0
                }
                break;
            }
            case 'v2GetFirstMessage':{
                editTrigger = {
                    type: 'v2GetFirstMessage',
                    outputVar: '',
                    indent: 0
                }
                break;
            }
            case 'v2GetAlertInput':{
                editTrigger = {
                    type: 'v2GetAlertInput',
                    outputVar: '',
                    indent: 0,
                    display: '',
                    displayType: 'value'
                }
                break;
            }
            case 'v2GetDisplayState':{
                editTrigger = {
                    type: 'v2GetDisplayState',
                    outputVar: '',
                    indent: 0
                }
                break;
            }
            case 'v2SetDisplayState':{
                editTrigger = {
                    type: 'v2SetDisplayState',
                    value: '',
                    valueType: 'value',
                    indent: 0
                }
                break;
            }
            case 'v2UpdateGUI':{
                editTrigger = {
                    type: 'v2UpdateGUI',
                    indent: 0
                }
                break;
            }
            case 'v2UpdateChatAt':{
                editTrigger = {
                    type: 'v2UpdateChatAt',
                    index: '0',
                    indent: 0
                }
                break;
            }
            case 'v2Wait':{
                editTrigger = {
                    type: 'v2Wait',
                    value: '1',
                    valueType: 'value',
                    indent: 0
                }
                break;
            }
            case 'v2GetRequestState':{
                editTrigger = {
                    type: 'v2GetRequestState',
                    outputVar: '',
                    index: '',
                    indexType: 'value',
                    indent: 0
                }
                break;
            }
            case 'v2SetRequestState':{
                editTrigger = {
                    type: 'v2SetRequestState',
                    value: '',
                    valueType: 'value',
                    index: '',
                    indexType: 'value',
                    indent: 0
                }
                break;
            }
            case 'v2GetRequestStateRole':{
                editTrigger = {
                    type: 'v2GetRequestStateRole',
                    outputVar: '',
                    index: '',
                    indexType: 'value',
                    indent: 0
                }
                break;
            }
            case 'v2SetRequestStateRole':{
                editTrigger = {
                    type: 'v2SetRequestStateRole',
                    value: '',
                    valueType: 'value',
                    index: '',
                    indexType: 'value',
                    indent: 0
                }
                break;
            }
            case 'v2GetRequestStateLength':{
                editTrigger = {
                    type: 'v2GetRequestStateLength',
                    outputVar: '',
                    indent: 0
                }
                break;
            }
            case 'v2StopPromptSending':{
                editTrigger = {
                    type: 'v2StopPromptSending',
                    indent: 0
                }
                break;
            }
            case 'v2QuickSearchChat':{
                editTrigger = {
                    type: 'v2QuickSearchChat',
                    value: '',
                    valueType: 'value',
                    indent: 0,
                    condition: 'loose',
                    depth: '3',
                    depthType: 'value',
                    outputVar: ''
                }
                break;
            }
        }
    }

    const deleteEffect = () => {
        const type = value[selectedIndex].effect[selectedEffectIndex]
        value[selectedIndex].effect.splice(selectedEffectIndex, 1)
        if(type.type === 'v2If' || type.type === 'v2IfAdvanced' || type.type === 'v2Loop' || type.type === 'v2Else' || type.type === 'v2LoopNTimes'){
            let pointer = selectedEffectIndex
            let indent = (type as triggerEffectV2).indent
            while(pointer < value[selectedIndex].effect.length){
                if(value[selectedIndex].effect[pointer].type === 'v2EndIndent' && (value[selectedIndex].effect[pointer] as triggerEffectV2).indent === indent + 1){
                    value[selectedIndex].effect.splice(pointer, 1)
                    if(value?.[selectedIndex]?.effect?.[pointer]?.type === 'v2Else'){
                        value[selectedIndex].effect.splice(pointer, 1)
                        continue
                    }
                    else{
                        break
                    }
                }
                (value[selectedIndex].effect[pointer] as triggerEffectV2).indent -= 1
                pointer += 1
            }
        }


        selectedEffectIndex -= 1
        if(selectedEffectIndex < 0){
            selectedEffectIndex = 0
        }
    }

    const copyEffect = () => {
        const type = value[selectedIndex].effect[selectedEffectIndex]
        if(type.type === 'v2If' || type.type === 'v2IfAdvanced' || type.type === 'v2Loop' || type.type === 'v2Else' || type.type === 'v2LoopNTimes'){
            return
        }
        clipboard = {
            type: 'effect',
            value: safeStructuredClone([type])
        }
    }

    const pasteEffect = async () => {
        if(clipboard?.type !== 'effect'){
            return
        }

        for(const effect of clipboard.value){
            value[selectedIndex].effect.splice(selectedEffectIndex, 0, safeStructuredClone(effect))
            selectedEffectIndex += 1
        }
    }

    const copyTrigger = () => {
        clipboard = {
            type: 'trigger',
            value: safeStructuredClone([value[selectedIndex]])
        }
    }

    const pasteTrigger = async () => {
        if(clipboard?.type !== 'trigger'){
            return
        }

        for(const trigger of clipboard.value){
            value.splice(selectedIndex, 0, safeStructuredClone(trigger))
            selectedIndex += 1
        }
    }

    const deleteTrigger = () => {
        if(value.length <= 2){
            return
        }
        value.splice(selectedIndex, 1)
        selectedIndex -= 1
        if(selectedIndex < 1){
            selectedIndex = 1
        }
    }

    const handleKeydown = (e:KeyboardEvent) => {
        console.log(e.key)
        if(e.key === 'Escape'){
            if(menuMode === 0){
                close()
            }
            else{
                menuMode = 0
            }
        }
        if(selectedIndex > 0 && selectedEffectIndex !== -1 && menuMode === 0 && selectMode === 1){
            if(e.key === 'ArrowUp'){
                if(selectedEffectIndex > 0){
                    selectedEffectIndex -= 1

                    if(e.altKey){
                        const before = value[selectedIndex].effect[selectedEffectIndex] as triggerEffectV2
                        const after = value[selectedIndex].effect[selectedEffectIndex + 1] as triggerEffectV2
                        if(
                            before.type !== 'v2EndIndent' && after.type !== 'v2EndIndent'
                            && before.type !== 'v2If' && after.type !== 'v2If'
                            && before.type !== 'v2IfAdvanced' && after.type !== 'v2IfAdvanced'
                            && before.type !== 'v2Loop' && after.type !== 'v2Loop'
                            && before.type !== 'v2LoopNTimes' && after.type !== 'v2LoopNTimes'
                            && before.indent === after.indent
                        ){
                            value[selectedIndex].effect[selectedEffectIndex] = after
                            value[selectedIndex].effect[selectedEffectIndex + 1] = before
                        }
                    }
                }
                e.preventDefault()
            }
            if(e.key === 'ArrowDown'){
                if(selectedEffectIndex < value[selectedIndex].effect.length - 1){
                    selectedEffectIndex += 1

                    if(e.altKey){
                        const before = value[selectedIndex].effect[selectedEffectIndex] as triggerEffectV2
                        const after = value[selectedIndex].effect[selectedEffectIndex - 1] as triggerEffectV2
                        if(
                            before.type !== 'v2EndIndent' && after.type !== 'v2EndIndent'
                            && before.type !== 'v2If' && after.type !== 'v2If'
                            && before.type !== 'v2IfAdvanced' && after.type !== 'v2IfAdvanced'
                            && before.type !== 'v2Loop' && after.type !== 'v2Loop'
                            && before.type !== 'v2LoopNTimes' && after.type !== 'v2LoopNTimes'
                            && before.indent === after.indent
                        ){
                            value[selectedIndex].effect[selectedEffectIndex] = after
                            value[selectedIndex].effect[selectedEffectIndex - 1] = before
                        }
                    }
                }
                e.preventDefault()
            }
            if(e.key === 'c' && e.ctrlKey){
                copyEffect()
                e.preventDefault()
            }
            if(e.key === 'v' && e.ctrlKey){
                //paste
                pasteEffect()
                e.preventDefault()
            }
            if(e.key === 'Delete'){
                deleteEffect()
                e.preventDefault()
            }
        }
        if(selectedIndex > 0 && menuMode === 0 && selectMode === 0){
            if(e.key === 'ArrowUp'){
                if(selectedIndex > 1){
                    selectedIndex -= 1

                    if(e.altKey){
                        const before = value[selectedIndex]
                        const after = value[selectedIndex + 1]
                        value[selectedIndex] = after
                        value[selectedIndex + 1] = before
                    }
                }
                e.preventDefault()
            }
            if(e.key === 'ArrowDown'){
                if(selectedIndex < value.length - 1){
                    selectedIndex += 1

                    if(e.altKey){
                        const before = value[selectedIndex]
                        const after = value[selectedIndex - 1]
                        value[selectedIndex] = after
                        value[selectedIndex - 1] = before
                    }
                }
                e.preventDefault()
            }
            if(e.key === 'c' && e.ctrlKey){
                copyTrigger()
                e.preventDefault()
            }
            if(e.key === 'v' && e.ctrlKey){
                pasteTrigger()
                e.preventDefault()
            }
            //Delete is forrbidden due to the fact that misclicks can cause huge data loss
        }
    }

    const handleContextMenu = (e, mode, effectIndex = -1, effect = null) => {
        contextMenu = true
        selectMode = mode
        
        const clickPos = {x: e.clientX, y: e.clientY}
        
        const yPosition = clickPos.y > (window.innerHeight * 0.75)
            ? `bottom: ${window.innerHeight - clickPos.y}px;`
            : `top: ${clickPos.y}px;`
        
        const xPosition = clickPos.x > (window.innerWidth * 0.75)
            ? `right: ${window.innerWidth - clickPos.x}px;`
            : `left: ${clickPos.x}px;`
        
        contextMenuLoc = {
            x: clickPos.x, 
            y: clickPos.y,
            style: `${yPosition} ${xPosition}`
        }
        
        if (mode === 1) {
            selectedEffectIndex = effectIndex
            
            if (effect) {
                editTrigger = effect as triggerEffectV2
            }
        }
        
        e.preventDefault()
        e.stopPropagation()
    }

    const formatEffectDisplay = (effect:triggerEffect) => {
        const type = effect.type

        if(!checkSupported(type)){
            return `<span class="text-red-500">${language.triggerDesc.v2UnsupportedTriggerDesc}</span>`
        }

        const txt = (language.triggerDesc[type + 'Desc'] as string || type).replace(/{{(.+?)}}/g, (match, p1) => {
            const d = effect[p1]
            
            if(p1.endsWith('Type')){
                return `<span class="text-blue-500">${d || 'null' }</span>`
            }
            if(p1 === 'condition' || p1 === 'operator'){
                return `<span class="text-green-500">${d || 'null'}</span>`
            }
            if(effect[p1 + 'Type'] === 'var'){
                return `<span class="text-yellow-500">${d || 'null'}</span>`
            }
            if(effect[p1 + 'Type'] === 'value'){
                return `<span class="text-green-500">"${d}"</span>`
            }
            if(effect.type === 'v2If' && p1 === 'source'){
                return `<span class="text-yellow-500">${d || 'null'}</span>`
            }
            if(effect.type === 'v2SetVar' && p1 === 'var'){
                return `<span class="text-yellow-500">${d || 'null'}</span>`
            }
            return `<span class="text-blue-500">${d || 'null'}</span>`
        })

        return `<div class="text-purple-500" style="margin-left:${(effect as triggerEffectV2).indent}rem">${txt}</div>`
    }
    
    onMount(() => {
        window.addEventListener('keydown', handleKeydown);
    })

    onDestroy(() => {
        window.removeEventListener('keydown', handleKeydown);
    })
</script>

<div
    class="contain w-full max-w-full mt-2 flex flex-col border-selected border-1 bg-darkbg rounded-md"
>
    <Button onclick={(e) => {
        e.stopPropagation()
        menuMode = 0
        selectedIndex = 1
    }}>
        {language.edit}
    </Button>
</div>




{#if selectedIndex > 0}
<Portal>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="text-textcolor absolute top-0 bottom-0 bg-black bg-opacity-50 max-w-full w-full h-full z-40 flex justify-center items-center" onclick={(e) => {
        e.stopPropagation()
        contextMenu = false
    }}>
        {#if contextMenu}
            <div class="absolute flex-col gap-2 w-28 p-2 flex bg-darkbg border border-darkborderc rounded-md" style={contextMenuLoc.style}>
                {#if selectedEffectIndex !== -1 && value[selectedIndex].effect[selectedEffectIndex].type !== 'v2EndIndent' && selectMode === 1}
                    <button class="text-textcolor2 hover:text-textcolor" onclick={() => {
                        menuMode = 3
                    }}>
                        {language.edit}
                    </button>
                {/if}

                {#if (selectedEffectIndex !== -1 && value[selectedIndex].effect[selectedEffectIndex].type !== 'v2EndIndent') || selectMode === 0}
                    <button class="text-textcolor2 hover:text-textcolor" onclick={() => {
                        if(selectMode === 1){
                            copyEffect()
                        }
                        else{
                            copyTrigger()
                        }
                    }}>
                        {language.copy}
                    </button>
                {/if}

                <button class="text-textcolor2 hover:text-textcolor" onclick={() => {
                    if(selectMode === 1){
                        pasteEffect()
                    }
                    else{
                        pasteTrigger()
                    }
                }}>
                    {language.paste}
                </button>

                {#if (selectedEffectIndex !== -1 && value[selectedIndex].effect[selectedEffectIndex].type !== 'v2EndIndent') || selectMode === 0}
                    <button class="text-textcolor2 hover:text-textcolor" onclick={() => {
                        if(selectMode === 1){
                            deleteEffect()
                        }
                        else{
                            deleteTrigger()
                        }
                    }}>
                        {language.remove}
                    </button>
                {/if}
            </div>
        {/if}
        <div class="max-w-full p-2 border border-darkborderc bg-bgcolor flex max-h-full flex-col-reverse md:flex-row overflow-y-auto md:overflow-y-visible" class:w-7xl={menuMode === 0} class:w-3xl={menuMode !== 0} class:h-full={menuMode!==2}>
            {#if menuMode === 0}
                <div class="pr-2 md:w-96 flex flex-col md:h-full mt-2 md:mt-0">
                    <div class="flex-1 flex flex-col overflow-y-auto">
                        {#each value as trigger, i}
                            {#if i === 0}
                                <!-- Header, skip the first trigger -->
                            {:else}
                                <button
                                    class="p-2 text-start text-textcolor2 hover:text-textcolor"
                                    class:bg-darkbg={selectedIndex === i}
                                    onclick={() => {
                                        selectMode = 0
                                        selectedIndex = i
                                    }}
                                    oncontextmenu={(e) => handleContextMenu(e, 0, i)}
                                >
                                    {trigger.comment || 'Unnamed Trigger'}
                                </button>
                            {/if}
                        {/each}
                    </div>
                    <div>
                        <button class="p-2 border-t-darkborderc text-start text-textcolor2 hover:text-textcolor focus:bg-bgcolor" onclick={() => {
                            value.push({
                                comment: "",
                                type: "start",
                                conditions: [],
                                effect: []
                            })
                            selectedIndex = value.length - 1
                        }}>
                            <PlusIcon />
                        </button>
                    </div>
                    <Button className="mt-2" onclick={close}>Close</Button>
                </div>

                <div class="md:flex-1 bg-darkbg flex-col flex h-svh min-h-svh md:h-auto md:min-h-0">
                    <div class="pb-2 grid grid-cols-2" onclick={() => {
                        selectMode = 1
                        selectedEffectIndex = -1
                    }}>
                        <div class="p-2 flex flex-col">
                            <span class="block text-textcolor2">{language.name}</span>
                            <TextInput value={value[selectedIndex].comment} onchange={(e) => {
                                const comment = e.currentTarget.value
                                const prev = value[selectedIndex].comment
                                for(let i = 1; i < value.length; i++){
                                    for(let j = 0; j < value[i].effect.length; j++){
                                        const effect = value[i].effect[j]
                                        if(effect.type === 'v2RunTrigger' && effect.target === prev){
                                            effect.target = comment
                                        }
                                    }
                                }
                                value[selectedIndex].comment = comment
                            }} />
                        </div>
                        <div class="p-2 flex flex-col">
                            <span class="block text-textcolor2">{language.triggerOn}</span>
                            <SelectInput bind:value={value[selectedIndex].type}>
                                <OptionInput value="start">{language.triggerStart}</OptionInput>
                                <OptionInput value="output">{language.triggerOutput}</OptionInput>
                                <OptionInput value="input">{language.triggerInput}</OptionInput>
                                <OptionInput value="manual">{language.triggerManual}</OptionInput>
                                <OptionInput value="display">{language.editDisplay}</OptionInput>
                                <OptionInput value="request">{language.editProcess}</OptionInput>

                            </SelectInput>
                        </div>
                    </div>
                    <div class="border border-darkborderc ml-2 rounded-md flex-1 mr-2 overflow-x-auto overflow-y-auto" bind:this={menu0Container}>
                        {#each value[selectedIndex].effect as effect, i}
                            <button class="p-2 w-full text-start text-purple-500"
                                class:hover:bg-selected={selectedEffectIndex !== i}
                                class:bg-selected={selectedEffectIndex === i}
                                onclick={() => {
                                    if(selectedEffectIndex === i && lastClickTime + 500 > Date.now()){
                                        menuMode = 1
                                    }

                                    selectMode = 1
                                    lastClickTime = Date.now()
                                    selectedEffectIndex = i
                                }}
                                oncontextmenu={(e) => handleContextMenu(e, 1, i, effect)}
                            >
                                {#if effect.type === 'v2EndIndent'}
                                    <div class="text-textcolor" style:margin-left={effect.indent + 'rem'}>...</div>
                                {:else}
                                    {@html formatEffectDisplay(effect)}
                                {/if}
                            </button>
                        {/each}
                        <button class="p-2 w-full text-start hover:bg-selected" onclick={() => {
                            //add effect
                            if(lastClickTime + 500 > Date.now()){
                                selectedEffectIndex = -1
                                menuMode = 1
                            }
                            lastClickTime = Date.now()
                        }} oncontextmenu={(e) => handleContextMenu(e, 1)}>
                            ...
                        </button>
                    </div>
                </div>
            {:else if menuMode === 1}
                <div class="flex-1 bg-darkbg flex-col flex overflow-y-auto">
                    <div class="p-4 border-b border-darkborderc">
                        <button class="p-2 border-t-darkborderc text-start text-textcolor2 hover:text-textcolor" onclick={() => {
                            menuMode = 0
                        }}>
                            <ArrowLeftIcon />
                        </button>
                    </div>
                    {#each effectV2Types.filter((e) => {

                        return checkSupported(e)
                    }) as type}
                        <button class="p-2 hover:bg-selected" onclick={(e) => {
                            e.stopPropagation()
                            makeDefaultEditType(type)
                            menuMode = 2
                        }}>{language.triggerDesc[type]}</button>
                    {/each}
                </div>
            {:else if menuMode === 2 || menuMode === 3}
                <div class="flex-1 flex-col flex overflow-y-auto">
                    <div class="flex items-center gap-2 mb-4">
                        <button class="p-2 border-t-darkborderc text-start text-textcolor2 hover:text-textcolor" onclick={() => {
                            menuMode = 0
                        }}>
                            <ArrowLeftIcon />
                        </button>
                        <h2 class="text-xl">
                            {language.triggerDesc[editTrigger.type]}
                        </h2>
                    </div>
                    {#if editTrigger.type === 'v2SetVar'}
                        <span class="block text-textcolor">{language.varName}</span>
                        <TextInput bind:value={editTrigger.var} />
                        <span class="block text-textcolor">{language.operator}</span>
                        <SelectInput bind:value={editTrigger.operator}>
                            <OptionInput value="="> = </OptionInput>
                            <OptionInput value="+="> + </OptionInput>
                            <OptionInput value="-="> - </OptionInput>
                            <OptionInput value="*="> × </OptionInput>
                            <OptionInput value="/="> ÷ </OptionInput>
                            <OptionInput value="%="> % </OptionInput>
                        </SelectInput>
                        <span class="block text-textcolor">{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />
                    {:else if editTrigger.type === 'v2If' || editTrigger.type === 'v2IfAdvanced'}
                        
                        <span class="block text-textcolor">{editTrigger.type === 'v2If' ? language.varName : 'A'}</span>
                        {#if editTrigger.type === 'v2IfAdvanced'}
                            <SelectInput bind:value={editTrigger.sourceType}>
                                <OptionInput value="value">{language.value}</OptionInput>
                                <OptionInput value="var">{language.var}</OptionInput>
                            </SelectInput>
                        {/if}
                        <TextInput bind:value={editTrigger.source} />

                        <span class="block text text-textcolor">{language.condition}</span>
                        <SelectInput bind:value={editTrigger.condition} onchange={(e) => {
                            if(e.currentTarget.value === '≡'){
                                const trg = editTrigger as triggerV2IfAdvanced
                                trg.condition = '≡'
                                trg.target = 'true'
                                trg.targetType = 'value'
                            }
                        }}>
                            <OptionInput value="="> = </OptionInput>
                            <OptionInput value="!="> ≠ </OptionInput>
                            <OptionInput value=">"> {">"} </OptionInput>
                            <OptionInput value="<"> {"<"} </OptionInput>
                            <OptionInput value=">="> {"≥"} </OptionInput>
                            <OptionInput value="<="> {"≤"} </OptionInput>
                            {#if editTrigger.type === 'v2IfAdvanced'}
                                <OptionInput value="≒"> ≒ </OptionInput>
                                <OptionInput value="∋"> ∋ </OptionInput>
                                <OptionInput value="∈"> ∈ </OptionInput>
                                <OptionInput value="∌"> ∌ </OptionInput>
                                <OptionInput value="∉"> ∉ </OptionInput>
                                <OptionInput value="≡"> ≡ </OptionInput>
                            {/if}
                        </SelectInput>

                        <span class="block text-textcolor">{editTrigger.type === 'v2If' ? language.value : 'B'}</span>
                        {#if editTrigger.condition === '≡'}
                            <SelectInput bind:value={editTrigger.target}>
                                <OptionInput value="true">true</OptionInput>
                                <OptionInput value="false">false</OptionInput>
                                <OptionInput value="null">null</OptionInput>
                            </SelectInput>
                        {:else}
                            <SelectInput bind:value={editTrigger.targetType}>
                                <OptionInput value="value">{language.value}</OptionInput>
                                <OptionInput value="var">{language.var}</OptionInput>
                            </SelectInput>
                            <TextInput bind:value={editTrigger.target} />
                        {/if}

                        <CheckInput bind:check={addElse} name={language.addElse} className="mt-4"/>
                    {:else if editTrigger.type === 'v2RunTrigger'}
                        <span class="block text-textcolor">{language.trigger}</span>
                        <SelectInput bind:value={editTrigger.target}>
                            {#each value as trigger, i}
                                {#if i === 0}
                                    <!-- Header, skip the first trigger -->
                                {:else}
                                    <OptionInput value={trigger.comment}>{trigger.comment || 'Unnamed Trigger'}</OptionInput>
                                {/if}
                            {/each}
                        </SelectInput>
                    {:else if editTrigger.type === 'v2ConsoleLog'}
                        <span class="block text-textcolor">{language.value}</span>
                        <SelectInput bind:value={editTrigger.sourceType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.source} />

                    {:else if editTrigger.type === 'v2ShowAlert'}
                        <span>{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />

                    {:else if editTrigger.type === 'v2RunLLM'}
                        <span>{language.prompt}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />

                        <span>{language.model}</span>
                        <SelectInput bind:value={editTrigger.model}>
                            <OptionInput value="model">{language.model}</OptionInput>
                            <OptionInput value="submodel">{language.submodel}</OptionInput>
                        </SelectInput>

                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />

                    {:else if editTrigger.type === 'v2CheckSimilarity'}
                        <span>{language.source}</span>
                        <SelectInput bind:value={editTrigger.sourceType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.source} />
                        <span>{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    {:else if editTrigger.type === 'v2CutChat'}
                        <span>{language.start}</span>
                        <SelectInput bind:value={editTrigger.startType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.start} />
                        <span>{language.end}</span>
                        <SelectInput bind:value={editTrigger.endType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.end} />
                        
                    {:else if editTrigger.type === 'v2Command'}
                        <span>{language.cmd}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />

                    {:else if editTrigger.type === 'v2SystemPrompt'}
                        <span>{language.location}</span>
                        <SelectInput bind:value={editTrigger.location}>
                            <OptionInput value="start">{language.sysStart}</OptionInput>
                            <OptionInput value="historyend">{language.sysHistoryEnd}</OptionInput>
                            <OptionInput value="promptend">{language.sysPromptEnd}</OptionInput>
                        </SelectInput>
                        <span>{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextAreaInput highlight bind:value={editTrigger.value} />

                    {:else if editTrigger.type === 'v2Impersonate'}
                        <span>{language.role}</span>
                        <SelectInput bind:value={editTrigger.role}>
                            <OptionInput value="user">user</OptionInput>
                            <OptionInput value="char">char</OptionInput>
                        </SelectInput>
                        <span>{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextAreaInput highlight bind:value={editTrigger.value} />

                    {:else if editTrigger.type === 'v2ModifyChat'}
                        <span>{language.index}</span>
                        <SelectInput bind:value={editTrigger.indexType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.index} />
                        <span>{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextAreaInput highlight bind:value={editTrigger.value} />
                    {:else if editTrigger.type === 'v2LoopNTimes'}
                        <span>{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />
                    {:else if editTrigger.type === 'v2GetLastMessage'}
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />

                    {:else if editTrigger.type === 'v2GetMessageAtIndex'}
                        <span class="block text-textcolor">{language.index}</span>
                        <SelectInput bind:value={editTrigger.indexType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.index} />
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />

                    {:else if editTrigger.type === 'v2GetMessageCount'}
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />

                    {:else if editTrigger.type === 'v2ModifyLorebook'}
                        <span class="block text-textcolor">{language.target}</span>
                        <SelectInput bind:value={editTrigger.targetType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.target} />
                        <span class="block text-textcolor">{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />

                    {:else if editTrigger.type === 'v2GetLorebook'}
                        <span class="block text-textcolor">{language.target}</span>
                        <SelectInput bind:value={editTrigger.targetType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.target} />
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />

                    {:else if editTrigger.type === 'v2GetLorebookCount'}
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />

                    {:else if editTrigger.type === 'v2GetLorebookEntry'}
                        <span class="block text-textcolor">{language.index}</span>
                        <SelectInput bind:value={editTrigger.indexType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.index} />
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />

                    {:else if editTrigger.type === 'v2SetLorebookActivation'}
                        <span class="block text-textcolor">{language.index}</span>
                        <SelectInput bind:value={editTrigger.indexType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.index} />
                        <CheckInput bind:check={addElse} name={language.value} className="mt-4" />
                    {:else if editTrigger.type === 'v2GetLorebookIndexViaName'}
                        <span class="block text-textcolor">{language.name}</span>
                        <SelectInput bind:value={editTrigger.nameType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.name} />
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    {:else if editTrigger.type === 'v2Random'}
                        <span class="block text text-textcolor">{language.min}</span>
                        <SelectInput bind:value={editTrigger.minType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.min} />
                        <span class="block text text-textcolor">{language.max}</span>
                        <SelectInput bind:value={editTrigger.maxType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.max} />

                        <span class="block text text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    {:else if editTrigger.type === 'v2GetCharAt'}
                        <span>{language.source}</span>
                        <SelectInput bind:value={editTrigger.sourceType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.source} />
                        <span>{language.index}</span>
                        <SelectInput bind:value={editTrigger.indexType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.index} />
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    

                    {:else if editTrigger.type === 'v2GetCharCount'}
                        <span>{language.source}</span>
                        <SelectInput bind:value={editTrigger.sourceType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.source} />
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    
                    {:else if editTrigger.type === 'v2ImgGen'}
                        <span>{language.prompt}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />

                        <span>{language.negPrompt}</span>
                        <SelectInput bind:value={editTrigger.negValueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.negValue} />

                        <span>{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />

                    {:else if editTrigger.type === 'v2ToLowerCase'}
                        <span>{language.source}</span>
                        <SelectInput bind:value={editTrigger.sourceType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.source} />
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />

                    {:else if editTrigger.type === 'v2ToUpperCase'}
                        <span>{language.source}</span>
                        <SelectInput bind:value={editTrigger.sourceType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.source} />
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />

                    {:else if editTrigger.type === 'v2SetCharAt'}
                        <span>{language.source}</span>
                        <SelectInput bind:value={editTrigger.sourceType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.source} />
                        <span>{language.index}</span>
                        <SelectInput bind:value={editTrigger.indexType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.index} />
                        <span>{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />

                    {:else if editTrigger.type === 'v2SplitString'}
                        <span>{language.source}</span>
                        <SelectInput bind:value={editTrigger.sourceType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.source} />
                        <span>{language.delimiter}</span>
                        <SelectInput bind:value={editTrigger.delimiterType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.delimiter} />
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />

                    {:else if editTrigger.type === 'v2GetCharacterDesc'}
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />

                    {:else if editTrigger.type === 'v2SetCharacterDesc'}
                        <span>{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />
                    {:else if editTrigger.type === 'v2ExtractRegex'}
                        <span>{language.input}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />
                        <span>Regex: IN</span>
                        <SelectInput bind:value={editTrigger.regexType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.regex} />

                        <span>Regex: OUT</span>
                        <SelectInput bind:value={editTrigger.resultType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.result} />

                        <span>Regex: FLAG</span>
                        <SelectInput bind:value={editTrigger.flagsType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.flags} />

                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    {:else if editTrigger.type === 'v2MakeArrayVar'}
                        <span class="block text-textcolor">{language.var}</span>
                        <TextInput bind:value={editTrigger.var} />

                    {:else if editTrigger.type === 'v2GetArrayVarLength'}
                        <span class="block text-textcolor">{language.var}</span>
                        <TextInput bind:value={editTrigger.var} />
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />

                    {:else if editTrigger.type === 'v2GetArrayVar'}
                        <span class="block text-textcolor">{language.var}</span>
                        <TextInput bind:value={editTrigger.var} />
                        <span class="block text-textcolor">{language.index}</span>
                        <SelectInput bind:value={editTrigger.indexType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.index} />
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />

                    {:else if editTrigger.type === 'v2SetArrayVar'}
                        <span class="block text-textcolor">{language.var}</span>
                        <TextInput bind:value={editTrigger.var} />
                        <span class="block text-textcolor">{language.index}</span>
                        <SelectInput bind:value={editTrigger.indexType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.index} />
                        <span class="block text-textcolor">{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />

                    {:else if editTrigger.type === 'v2PushArrayVar'}
                        <span class="block text-textcolor">{language.var}</span>
                        <TextInput bind:value={editTrigger.var} />
                        <span class="block text-textcolor">{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />

                    {:else if editTrigger.type === 'v2PopArrayVar'}
                        <span class="block text-textcolor">{language.var}</span>
                        <TextInput bind:value={editTrigger.var} />
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />

                    {:else if editTrigger.type === 'v2ShiftArrayVar'}
                        <span class="block text-textcolor">{language.var}</span>
                        <TextInput bind:value={editTrigger.var} />
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />

                    {:else if editTrigger.type === 'v2UnshiftArrayVar'}
                        <span class="block text-textcolor">{language.var}</span>
                        <TextInput bind:value={editTrigger.var} />
                        <span class="block text-textcolor">{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />

                    {:else if editTrigger.type === 'v2SpliceArrayVar'}
                        <span class="block text-textcolor">{language.var}</span>
                        <TextInput bind:value={editTrigger.var} />
                        <span class="block text-textcolor">{language.start}</span>
                        <SelectInput bind:value={editTrigger.startType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.start} />
                        <span class="block text-textcolor">{language.value}</span>
                        <SelectInput bind:value={editTrigger.itemType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.item} />
                    {:else if editTrigger.type === 'v2SliceArrayVar'}
                        <span class="block text-textcolor">{language.var}</span>
                        <TextInput bind:value={editTrigger.var} />
                        <span class="block text-textcolor">{language.start}</span>
                        <SelectInput bind:value={editTrigger.startType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.start} />
                        <span class="block text-textcolor">{language.end}</span>
                        <SelectInput bind:value={editTrigger.endType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.end} />
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    {:else if editTrigger.type === 'v2GetIndexOfValueInArrayVar'}
                        <span class="block text-textcolor">{language.var}</span>
                        <TextInput bind:value={editTrigger.var} />

                        <span class="block text-textcolor">{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>

                        <TextInput bind:value={editTrigger.value} />

                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    {:else if editTrigger.type === 'v2RemoveIndexFromArrayVar'}
                        <span class="block text-textcolor">{language.var}</span>
                        <TextInput bind:value={editTrigger.var} />

                        <span class="block text-textcolor">{language.index}</span>
                        <SelectInput bind:value={editTrigger.indexType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.index} />
                    {:else if editTrigger.type === 'v2ConcatString'}
                        <span class="block text-textcolor">A</span>
                        <SelectInput bind:value={editTrigger.source1Type}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.source1} />

                        <span class="block text-textcolor">B</span>
                        <SelectInput bind:value={editTrigger.source2Type}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.source2} />

                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    {:else if editTrigger.type === 'v2GetLastUserMessage'}
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    {:else if editTrigger.type === 'v2GetLastCharMessage'}
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    {:else if editTrigger.type === 'v2GetFirstMessage'}
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    {:else if editTrigger.type === 'v2GetAlertInput'}
                        <span class="block text-textcolor">{language.value}</span>
                        <SelectInput bind:value={editTrigger.displayType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.display} />

                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    {:else if editTrigger.type === 'v2GetDisplayState'}
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    {:else if editTrigger.type === 'v2SetDisplayState'}
                        <span class="block text-textcolor">{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />
                    {:else if editTrigger.type === 'v2Wait'}
                        <span class="block text-textcolor">{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />
                    {:else if editTrigger.type === 'v2GetRequestState'}
                        <span class="block text-textcolor">{language.index}</span>
                        <SelectInput bind:value={editTrigger.indexType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.index} />

                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    {:else if editTrigger.type === 'v2GetRequestStateRole'}
                        <span class="block text-textcolor">{language.index}</span>
                        <SelectInput bind:value={editTrigger.indexType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.index} />

                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    {:else if editTrigger.type === 'v2SetRequestState'}
                        <span class="block text-textcolor">{language.index}</span>
                        <SelectInput bind:value={editTrigger.indexType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.index} />

                        <span class="block text-textcolor">{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />
                    {:else if editTrigger.type === 'v2SetRequestStateRole'}
                        <span class="block text-textcolor">{language.index}</span>
                        <SelectInput bind:value={editTrigger.indexType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.index} />

                        <span class="block text-textcolor">{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />
                    {:else if editTrigger.type === 'v2GetRequestStateLength'}
                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    {:else if editTrigger.type === 'v2QuickSearchChat'}
                        <span class="block text-textcolor">{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />

                        <span class="block text-textcolor">{language.condition}</span>
                        <SelectInput bind:value={editTrigger.condition}>
                            <OptionInput value="loose">loose</OptionInput>
                            <OptionInput value="strict">strict</OptionInput>
                            <OptionInput value="regex">regex</OptionInput>
                        </SelectInput>

                        <span class="block text-textcolor">{language.depth}</span>
                        <SelectInput bind:value={editTrigger.depthType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.depth} />

                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    {:else if editTrigger.type === 'v2Tokenize'}
                        <span class="block text-textcolor">{language.value}</span>
                        <SelectInput bind:value={editTrigger.valueType}>
                            <OptionInput value="value">{language.value}</OptionInput>
                            <OptionInput value="var">{language.var}</OptionInput>
                        </SelectInput>
                        <TextInput bind:value={editTrigger.value} />

                        <span class="block text-textcolor">{language.outputVar}</span>
                        <TextInput bind:value={editTrigger.outputVar} />
                    {:else if editTrigger.type === 'v2UpdateChatAt'}
                        <span class="block text-textcolor">{language.index}</span>
                        <TextInput bind:value={editTrigger.index} />
                    {:else}
                        <span>{language.noConfig}</span>
                    {/if}

                    <Button className="mt-4" onclick={() => {
                        if(selectedEffectIndex === -1){
                            value[selectedIndex].effect.push(editTrigger)

                            if(editTrigger.type === 'v2If'  || editTrigger.type === 'v2IfAdvanced' || editTrigger.type === 'v2Loop' || editTrigger.type === 'v2Else' || editTrigger.type === 'v2LoopNTimes'){
                                value[selectedIndex].effect.push({
                                    type: 'v2EndIndent',
                                    indent: editTrigger.indent + 1,
                                    endOfLoop: editTrigger.type === 'v2Loop' || editTrigger.type === 'v2LoopNTimes'
                                })

                                if(addElse){
                                    value[selectedIndex].effect.push({
                                        type: 'v2Else',
                                        indent: editTrigger.indent
                                    })
                                    value[selectedIndex].effect.push({
                                        type: 'v2EndIndent',
                                        indent: editTrigger.indent + 1
                                    })
                                }
                            }
                        }
                        else if(menuMode === 2){
                            editTrigger.indent = (value[selectedIndex].effect[selectedEffectIndex] as triggerEffectV2).indent
                            if(editTrigger.type === 'v2If' || editTrigger.type === 'v2IfAdvanced' || editTrigger.type === 'v2Loop' || editTrigger.type === 'v2LoopNTimes' || editTrigger.type === 'v2Else'){
                                value[selectedIndex].effect.splice(selectedEffectIndex, 0, {
                                    type: 'v2EndIndent',
                                    indent: editTrigger.indent + 1,
                                    endOfLoop: editTrigger.type === 'v2Loop' || editTrigger.type === 'v2LoopNTimes'
                                })
                                
                                if(addElse){
                                    value[selectedIndex].effect.splice(selectedEffectIndex, 0, {
                                        type: 'v2Else',
                                        indent: editTrigger.indent
                                    })
                                    value[selectedIndex].effect.splice(selectedEffectIndex, 0, {
                                        type: 'v2EndIndent',
                                        indent: editTrigger.indent + 1
                                    })
                                }
                            }
                            value[selectedIndex].effect.splice(selectedEffectIndex, 0, editTrigger)
                        }
                        else{
                            value[selectedIndex].effect[selectedEffectIndex] = editTrigger
                        }
                        menuMode = 0
                    }}>Save</Button>

                    {#if menuMode === 3}
                        <Button className="mt-2" onclick={() => {
                            deleteEffect()
                            selectedEffectIndex = -1
                            menuMode = 0
                        }}>Delete</Button>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</Portal>
{/if}
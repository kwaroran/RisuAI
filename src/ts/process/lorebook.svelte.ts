import { get } from "svelte/store";
import {selectedCharID} from '../stores.svelte'
import { type Message, type loreBook } from "../storage/database.svelte";
import { DBState } from '../stores.svelte';
import { tokenize } from "../tokenizer";
import { checkNullish, findCharacterbyId, selectSingleFile } from "../util";
import { alertError, alertNormal } from "../alert";
import { language } from "../../lang";
import { downloadFile } from "../globalApi.svelte";
import { getModuleLorebooks } from "./modules";
import { CCardLib } from "@risuai/ccardlib";

export function addLorebook(type:number) {
    const selectedID = get(selectedCharID)
    if(type === 0){
        DBState.db.characters[selectedID].globalLore.push({
            key: '',
            comment: `New Lore ${DBState.db.characters[selectedID].globalLore.length + 1}`,
            content: '',
            mode: 'normal',
            insertorder: 100,
            alwaysActive: false,
            secondkey: "",
            selective: false
        })
    }
    else{
        const page = DBState.db.characters[selectedID].chatPage
        DBState.db.characters[selectedID].chats[page].localLore.push({
            key: '',
            comment: `New Lore ${DBState.db.characters[selectedID].chats[page].localLore.length + 1}`,
            content: '',
            mode: 'normal',
            insertorder: 100,
            alwaysActive: false,
            secondkey: "",
            selective: false
        })
    }
}

export async function loadLoreBookV3Prompt(){
    const selectedID = get(selectedCharID)
    const char = DBState.db.characters[selectedID]
    const page = char.chatPage
    const characterLore = char.globalLore ?? []
    const chatLore = char.chats[page].localLore ?? []
    const moduleLorebook = getModuleLorebooks()
    const fullLore = safeStructuredClone(characterLore.concat(chatLore).concat(moduleLorebook))
    const currentChat = char.chats[page].message
    const loreDepth = char.loreSettings?.scanDepth ?? DBState.db.loreBookDepth
    const loreToken = char.loreSettings?.tokenBudget ?? DBState.db.loreBookToken
    const fullWordMatchingSetting = char.loreSettings?.fullWordMatching ?? false
    const chatLength = currentChat.length + 1 //includes first message
    const recursiveScanning = char.loreSettings?.recursiveScanning ?? true
    let recursiveAdditionalPrompt = ''

    const searchMatch = (messages:Message[],arg:{
        keys:string[],
        searchDepth:number,
        regex:boolean
        fullWordMatching:boolean
        recursiveAdditionalPrompt:string,
        all?:boolean
    }) => {
        const sliced = messages.slice(messages.length - arg.searchDepth,messages.length)
        arg.keys = arg.keys.map(key => key.trim()).filter(key => key.length > 0)
        let mText = '\x01' +  sliced.map((msg) => {
            if(msg.role === 'user'){
                return `{{${DBState.db.username}}}:` + msg.data
            }
            else{
                return `{{${msg.name ?? (msg.saying ? findCharacterbyId(msg.saying)?.name : null) ?? char.name}}}:` + msg.data
            }
        }).join('\x01')
        if(arg.recursiveAdditionalPrompt){
            mText += arg.recursiveAdditionalPrompt
        }
        if(arg.regex){
            for(const regexString of arg.keys){
                if(!regexString.startsWith('/')){
                    return false
                }
                const regexFlag = regexString.split('/').pop()
                if(regexFlag){
                    arg.keys[0] = regexString.replace('/'+regexFlag,'')
                    try {
                        const regex = new RegExp(arg.keys[0],regexFlag)
                        return regex.test(mText)
                    } catch (error) {
                        return false
                    }
                }
                return false
            }
        }

        mText = mText.toLocaleLowerCase()
        mText = mText.replace(/\{\{\/\/(.+?)\}\}/g,'').replace(/\{\{comment:(.+?)\}\}/g,'')

        let allMode = arg.all ?? false
        let allModeMatched = true

        if(arg.fullWordMatching){
            const splited = mText.split(' ')
            for(const key of arg.keys){
                if(splited.includes(key.toLocaleLowerCase())){
                    if(!allMode){
                        return true
                    }
                }
                else if(allMode){
                    allModeMatched = false
                }
            }
        }
        else{
            mText = mText.replace(/ /g,'')
            for(const key of arg.keys){
                const realKey = key.toLocaleLowerCase().replace(/ /g,'')
                if(mText.includes(realKey)){
                    if(!allMode){
                        return true
                    }
                }
                else if(allMode){
                    allModeMatched = false
                }
            }
        }
        if(allMode && allModeMatched){
            return true
        }
        return false
    
    }

    let matching = true
    let actives:{
        depth:number,
        pos:string,
        prompt:string
        role:'system'|'user'|'assistant'
        order:number
        tokens:number
        priority:number
    }[] = []
    let activatedIndexes:number[] = []
    let disabledUIPrompts:string[] = []
    let matchTimes = 0
    while(matching){
        matching = false
        for(let i=0;i<fullLore.length;i++){
            if(activatedIndexes.includes(i)){
                continue
            }
            if(!fullLore[i].alwaysActive && !fullLore[i].key){
                continue
            }
            let activated = true
            let pos = ''
            let depth = 0
            let scanDepth = loreDepth
            let order = fullLore[i].insertorder
            let priority = fullLore[i].insertorder
            let forceState:string = 'none'
            let role:'system'|'user'|'assistant' = 'system'
            let searchQueries:{
                keys:string[],
                negative:boolean,
                all?:boolean
            }[] = []
            let fullWordMatching = fullWordMatchingSetting
            const content = CCardLib.decorator.parse(fullLore[i].content, (name, arg) => {
                switch(name){
                    case 'end':{
                        pos = 'depth'
                        depth = 0
                        return
                    }
                    case 'activate_only_after':{
                        const int = parseInt(arg[0])
                        if(Number.isNaN(int)){
                            return false
                        }
                        if(chatLength < int){
                            activated = false
                        }
                        return
                    }
                    case 'activate_only_every': {
                        const int = parseInt(arg[0])
                        if(Number.isNaN(int)){
                            return false
                        }
                        if(chatLength % int !== 0){
                            activated = false
                        }
                        return
                    }
                    case 'keep_activate_after_match':{
                        //TODO
                        return false
                    }
                    case 'dont_activate_after_match': {
                        //TODO
                        return false
                    }
                    case 'depth':
                    case 'reverse_depth':{
                        const int = parseInt(arg[0])
                        if(Number.isNaN(int)){
                            return false
                        }
                        depth = int
                        pos = name === 'depth' ? 'depth' : 'reverse_depth'
                        return
                    }
                    case 'instruct_depth':
                    case 'reverse_instruct_depth':
                    case 'instruct_scan_depth':{
                        //the instruct mode does not exists in risu
                        return false
                    }
                    case 'role':{
                        if(arg[0] === 'user' || arg[0] === 'assistant' || arg[0] === 'system'){
                            role = arg[0]
                            return
                        }
                        return false
                    }
                    case 'scan_depth':{
                        scanDepth = parseInt(arg[0])
                        return
                    }
                    case 'is_greeting':{
                        const int = parseInt(arg[0])
                        if(Number.isNaN(int)){
                            return false
                        }
                        if(((char.chats[page].fmIndex ?? -1) + 1) !== int){
                            activated = false
                        }
                    }
                    case 'position':{
                        if(arg[0].startsWith('pt_') || ["after_desc", "before_desc", "personality", "scenario"].includes(arg[0])){
                            pos = arg[0]
                            return
                        }
                        return false
                    }
                    case 'ignore_on_max_context':{
                        priority = -1000
                        return
                    }
                    case 'additional_keys':{
                        searchQueries.push({
                            keys: arg,
                            negative: false
                        })
                        return
                    }
                    case 'exclude_keys':{
                        searchQueries.push({
                            keys: arg,
                            negative: true
                        })
                        return
                    }
                    case 'exclude_keys_all':{
                        searchQueries.push({
                            keys: arg,
                            negative: true,
                            all: true
                        })
                        return
                    }
                    case 'match_full_word':{
                        fullWordMatching = true
                        return
                    }
                    case 'match_partial_word':{
                        fullWordMatching = false
                        return
                    }
                    case 'is_user_icon':{
                        //TODO
                        return false
                    }
                    case 'activate':{
                        forceState = 'activate'
                        return
                    }
                    case 'dont_activate':{
                        forceState = 'deactivate'
                        return
                    }
                    case 'disable_ui_prompt':{
                        if(['post_history_instructions','system_prompt'].includes(arg[0])){
                            disabledUIPrompts.push(arg[0])
                            return
                        }
                        return false
                    }
                    case 'probability':{
                        if(Math.random() * 100 > parseInt(arg[0])){
                            activated = false
                        }
                    }
                    case 'priority':{
                        priority = parseInt(arg[0])
                        return
                    }
                    default:{
                        return false
                    }
                }
            })
            

            if(!activated || forceState !== 'none' || fullLore[i].alwaysActive){
                //if the lore is not activated or force activated, skip the search
            }
            else{
                searchQueries.push({
                    keys: fullLore[i].key.split(','),
                    negative: false
                })

                if(fullLore[i].secondkey && fullLore[i].selective){
                    searchQueries.push({
                        keys: fullLore[i].secondkey.split(','),
                        negative: false
                    })
                }
    
                for(const query of searchQueries){
                    const result = searchMatch(currentChat, {
                        keys: query.keys,
                        searchDepth: scanDepth,
                        regex: fullLore[i].useRegex,
                        fullWordMatching: fullWordMatching,
                        recursiveAdditionalPrompt: recursiveAdditionalPrompt,
                        all: query.all
                    })
                    if(query.negative){
                        if(result){
                            activated = false
                            break
                        }
                    }
                    else{
                        if(!result){
                            activated = false
                            break
                        }
                    }
                }
            }

            if(forceState === 'activate'){
                activated = true
            }
            else if(forceState === 'deactivate'){
                activated = false
            }

            if(activated){
                actives.push({
                    depth: depth,
                    pos: pos,
                    prompt: content,
                    role: role,
                    order: order,
                    tokens: await tokenize(content),
                    priority: priority
                })
                activatedIndexes.push(i)
                if(recursiveScanning){
                    matching = true
                    recursiveAdditionalPrompt += content + '\n\n'
                }
            }
        }
    }

    const activesSorted = actives.sort((a,b) => {
        return b.priority - a.priority
    })

    let usedTokens = 0

    const activesFiltered = activesSorted.filter((act) => {
        if(usedTokens + act.tokens <= loreToken){
            usedTokens += act.tokens
            return true
        }
        return false
    })

    const activesResorted = activesFiltered.sort((a,b) => {
        return b.order - a.order
    })

    return {
        actives: activesResorted.reverse()
    }

}

export async function importLoreBook(mode:'global'|'local'|'sglobal'){
    const selectedID = get(selectedCharID)
    const page = mode === 'sglobal' ? -1 : DBState.db.characters[selectedID].chatPage
    let lore = 
        mode === 'global' ? DBState.db.characters[selectedID].globalLore : 
        DBState.db.characters[selectedID].chats[page].localLore
    const lorebook = (await selectSingleFile(['json', 'lorebook'])).data
    if(!lorebook){
        return
    }
 


    try {
        const importedlore = JSON.parse(Buffer.from(lorebook).toString('utf-8'))
        if(importedlore.type === 'risu' && importedlore.data){
            const datas:loreBook[] = importedlore.data
            for(const data of datas){
                lore.push(data)
            }
        }
        else if(importedlore.entries){
            const entries:{[key:string]:CCLorebook} = importedlore.entries
            lore.push(...convertExternalLorebook(entries))
        }
        if(mode === 'global'){
            DBState.db.characters[selectedID].globalLore = lore
        }
        else{
            DBState.db.characters[selectedID].chats[page].localLore = lore
        }
    } catch (error) {
        alertError(`${error}`)
    }
}

interface CCLorebook{
    key:string[]
    comment:string
    content:string
    order:number
    constant:boolean,
    name:string,
    keywords:string[],
    priority:number
    entry:string
    secondary_keys:string[]
    selective:boolean
    forceActivation:boolean
    keys:string[]
    displayName:string
    text:string
    contextConfig?: {
        budgetPriority:number
        prefix:string
        suffix:string
    }
}

export function convertExternalLorebook(entries:{[key:string]:CCLorebook}){
    let lore:loreBook[] = []
    for(const key in entries){
        const currentLore = entries[key]
        lore.push({
            key: currentLore.key ? currentLore.key.join(', ') :
                currentLore.keys ? currentLore.keys.join(', ') :
                currentLore.keywords ? currentLore.keywords.join(', ') : '',
            insertorder: currentLore.order ?? currentLore.priority ?? currentLore?.contextConfig?.budgetPriority ?? 0,
            comment: currentLore.comment || currentLore.name || currentLore.displayName || '',
            content: currentLore.content || currentLore.entry || currentLore.text || '',
            mode: "normal",
            alwaysActive: currentLore.constant ?? currentLore.forceActivation ?? false,
            secondkey: currentLore.secondary_keys ? currentLore.secondary_keys.join(', ') : "",
            selective: currentLore.selective ?? false
        })
    }
    return lore
}

export async function exportLoreBook(mode:'global'|'local'|'sglobal'){
    try {
        const selectedID = get(selectedCharID)
        const page = mode === 'sglobal' ? -1 : DBState.db.characters[selectedID].chatPage
        const lore = 
            mode === 'global' ? DBState.db.characters[selectedID].globalLore : 
            DBState.db.characters[selectedID].chats[page].localLore        
        const stringl = Buffer.from(JSON.stringify({
            type: 'risu',
            ver: 1,
            data: lore
        }), 'utf-8')

        await downloadFile(`lorebook_export.json`, stringl)

        alertNormal(language.successExport)
    } catch (error) {
        alertError(`${error}`)
    }
}
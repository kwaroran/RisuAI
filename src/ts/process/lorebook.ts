import { get } from "svelte/store";
import {selectedCharID} from '../stores'
import { DataBase, setDatabase, type Message, type loreBook } from "../storage/database";
import { tokenize } from "../tokenizer";
import { checkNullish, selectSingleFile } from "../util";
import { alertError, alertNormal } from "../alert";
import { language } from "../../lang";
import { downloadFile } from "../storage/globalApi";
import { HypaProcesser } from "./memory/hypamemory";
import { getModuleLorebooks } from "./modules";

export function addLorebook(type:number) {
    let selectedID = get(selectedCharID)
    let db = get(DataBase)
    if(type === 0){
        db.characters[selectedID].globalLore.push({
            key: '',
            comment: `New Lore ${db.characters[selectedID].globalLore.length + 1}`,
            content: '',
            mode: 'normal',
            insertorder: 100,
            alwaysActive: false,
            secondkey: "",
            selective: false
        })
    }
    else{
        const page = db.characters[selectedID].chatPage
        db.characters[selectedID].chats[page].localLore.push({
            key: '',
            comment: `New Lore ${db.characters[selectedID].chats[page].localLore.length + 1}`,
            content: '',
            mode: 'normal',
            insertorder: 100,
            alwaysActive: false,
            secondkey: "",
            selective: false
        })
    }
    setDatabase(db)
}

interface formatedLore{
    keys:string[]|'always'|{type:'regex',regex:string},
    secondKey:string[]|{type:'regex',regex:string}
    content: string
    order: number
    activatied: boolean
}

const rmRegex = / |\n/g

export async function loadLoreBookPrompt(){
    
    const selectedID = get(selectedCharID)
    const db = get(DataBase)
    const char = db.characters[selectedID]
    const page = char.chatPage
    const characterLore = char.globalLore ?? []
    const chatLore = char.chats[page].localLore ?? []
    const moduleLorebook = getModuleLorebooks()
    const fullLore = characterLore.concat(chatLore).concat(moduleLorebook)
    const currentChat = char.chats[page].message
    const loreDepth = char.loreSettings?.scanDepth ?? db.loreBookDepth
    const loreToken = char.loreSettings?.tokenBudget ?? db.loreBookToken
    const fullWordMatching = char.loreSettings?.fullWordMatching ?? false

    let activatiedPrompt: string[] = []

    let formatedLore:formatedLore[] = []

    for (const lore of fullLore){
        if(lore){
            if(lore.key.length > 1 || lore.alwaysActive){
                if(!checkNullish(lore.activationPercent)){
                    let activationPercent = lore.activationPercent
                    if(isNaN(activationPercent) || !activationPercent || activationPercent < 0){
                        activationPercent = 0
                    }
                    if(activationPercent < (Math.random() * 100)){
                        continue
                    }
                }

                if(lore.key?.startsWith('@@@')){
                    lore.key = lore.key.replace('@@@','@@')
                }
                formatedLore.push({
                    keys: lore.alwaysActive ? 'always' : (lore.key?.startsWith("@@regex ")) ? ({type:'regex',regex:lore.key.replace('@@regex ','')}) :
                        (lore.key ?? '').replace(rmRegex, '').toLocaleLowerCase().split(',').filter((a) => {
                            return a.length > 1
                        }),
                    secondKey: lore.selective ? ((lore.secondkey?.startsWith("@@regex ")) ? ({type:'regex',regex:lore.secondkey.replace('@@regex ','')}) :
                        (lore.secondkey ?? '').replace(rmRegex, '').toLocaleLowerCase().split(',').filter((a) => {
                            return a.length > 1
                        })) : [],
                    content: lore.content,
                    order: lore.insertorder,
                    activatied: false
                })
            }
        }
    }

    formatedLore.sort((a, b) => {
        return b.order - a.order
    })

    const formatedChatMain = currentChat.slice(currentChat.length - loreDepth,currentChat.length).map((msg) => {
        return msg.data
    }).join('||').replace(rmRegex,'').toLocaleLowerCase()

    let loreListUpdated = true
    
    while(loreListUpdated){
        loreListUpdated = false
        const formatedChat = formatedChatMain + activatiedPrompt.join('').replace(rmRegex,'').toLocaleLowerCase()
        const formatedChatList = fullWordMatching ? formatedChat.split(' ') : formatedChat
        for(let i=0;i<formatedLore.length;i++){
            const lore = formatedLore[i]
            if(lore.activatied){
                continue
            }
            const totalTokens = await tokenize(activatiedPrompt.concat([lore.content]).join('\n\n'))
            if(totalTokens > loreToken){
                break
            }

            if(lore.keys === 'always'){
                activatiedPrompt.push(lore.content)
                lore.activatied = true
                loreListUpdated = true
                continue
            }
    
            let firstKeyActivation = false
            if(Array.isArray(lore.keys)){
                for(const key of lore.keys){
                    if(key){
                        if(formatedChatList.includes(key)){
                            firstKeyActivation = true
                            break
                        }
                    }
                }
            }
            else{
                if(formatedChat.match(new RegExp(lore.keys.regex,'g'))){
                    firstKeyActivation = true
                }
            }
    
            if(firstKeyActivation){
                if(Array.isArray(lore.secondKey)){
                    if(lore.secondKey.length === 0){
                        activatiedPrompt.push(lore.content)
                        lore.activatied = true
                        loreListUpdated = true
                        continue
                    }
                    for(const key of lore.secondKey){
                        if(formatedChatList.includes(key)){
                            activatiedPrompt.push(lore.content)
                            lore.activatied = true
                            loreListUpdated = true
                            break
                        }
                    }
                }
                else{
                    if(formatedChat.match(new RegExp(lore.secondKey.regex,'g'))){
                        firstKeyActivation = true
                    }
                }
            }
        }
        if(!(char.loreSettings?.recursiveScanning)){
            break
        }
    }


    let sactivated:string[] = []
    let decoratedArray:{
        depth:number,
        pos:string,
        prompt:string
    }[] = []
    activatiedPrompt = activatiedPrompt.filter((v) => {
        const decorated = decoratorParser(v)
        if(decorated.decorators['dont_activate']){
            return false
        }
        if(decorated.decorators['depth'] && decorated.decorators['depth'][0] === '0'){
            sactivated.push(decorated.prompt)
            return false
        }
        if(decorated.decorators['position']){
            decoratedArray.push({
                depth: -1,
                pos: decorated.decorators['position'][0],
                prompt: decorated.prompt
            })
            return false
        }
        if(decorated.decorators)
        return true
    })

    return {
        act: activatiedPrompt.reverse().join('\n\n'),
        special_act: sactivated.reverse().join('\n\n'),
        decorated: decoratedArray
    }
}


export async function loadLoreBookV3Prompt(){
    const selectedID = get(selectedCharID)
    const db = get(DataBase)
    const char = db.characters[selectedID]
    const page = char.chatPage
    const characterLore = char.globalLore ?? []
    const chatLore = char.chats[page].localLore ?? []
    const moduleLorebook = getModuleLorebooks()
    const fullLore = structuredClone(characterLore.concat(chatLore).concat(moduleLorebook))
    const currentChat = char.chats[page].message
    const loreDepth = char.loreSettings?.scanDepth ?? db.loreBookDepth
    const loreToken = char.loreSettings?.tokenBudget ?? db.loreBookToken
    const fullWordMatching = char.loreSettings?.fullWordMatching ?? false

    const searchMatch = (text:Message[],arg:{
        keys:string[],
        searchDepth:number,
        regex:boolean
        fullWordMatching:boolean
    }) => {
        const sliced = text.slice(text.length - arg.searchDepth,text.length)
        let mText = sliced.join(" ")
        if(arg.regex){
            const regexString = arg.keys[0]
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
        }

        mText = mText.toLowerCase()

        if(arg.fullWordMatching){
            const splited = mText.split(' ')
            return arg.keys.some((key) => {
                return splited.includes(key)
            })
        }
        else{
            return arg.keys.some((key) => {
                return mText.includes(key.toLowerCase())
            })
        }
    
    }

    let matching = true
    let sactivated:string[] = []
    let decoratedArray:{
        depth:number,
        pos:string,
        prompt:string
    }[] = []
    let activatied:string[] = []

    while(matching){
        matching = false
        for(let i=0;i<fullLore.length;i++){
            const decorated = decoratorParser(fullLore[i].content)
            const searchDepth = decorated.decorators['scan_depth'] ? parseInt(decorated.decorators['scan_depth'][0]) : loreDepth

            let matched = searchMatch(currentChat,{
                keys: fullLore[i].key.split(','),
                searchDepth: searchDepth,
                regex: fullLore[i].key.startsWith('/'),
                fullWordMatching: fullWordMatching
            })

            if(decorated.decorators['dont_activate']){
                continue
            }
            if(!matched){
                continue
            }

            const addtitionalKeys = decorated.decorators['additional_keys'] ?? []

            if(addtitionalKeys.length > 0){
                const additionalMatched = searchMatch(currentChat,{
                    keys: decorated.decorators['additional_keys'],
                    searchDepth: searchDepth,
                    regex: false,
                    fullWordMatching: fullWordMatching
                })

                if(!additionalMatched){
                    continue
                }
            }

            const excludeKeys = decorated.decorators['exclude_keys'] ?? []

            if(excludeKeys.length > 0){
                const excludeMatched = searchMatch(currentChat,{
                    keys: decorated.decorators['exclude_keys'],
                    searchDepth: searchDepth,
                    regex: false,
                    fullWordMatching: fullWordMatching
                })

                if(excludeMatched){
                    continue
                }
            }

            matching = true
            fullLore.splice(i,1)
            i--
            
            const depth = decorated.decorators['depth'] ? parseInt(decorated.decorators['depth'][0]) : null
            if(depth === 0){
                sactivated.push(decorated.prompt)
                continue
            }
            if(depth){
                decoratedArray.push({
                    depth: depth,
                    pos: '',
                    prompt: decorated.prompt
                })
                continue
            }
            if(decorated.decorators['position']){
                decoratedArray.push({
                    depth: -1,
                    pos: decorated.decorators['position'][0],
                    prompt: decorated.prompt
                })
                continue
            }

            activatied.push(decorated.prompt)
        }
    }

}
const supportedDecorators = ['depth','dont_activate','position','scan_depth','additional_keys', 'exclude_keys']
export function decoratorParser(prompt:string){
    const split = prompt.split('\n')
    let decorators:{[name:string]:string[]} = {}

    let fallbacking = false
    for(let i=0;i<split.length;i++){
        const line = split[i].trim()
        if(line.startsWith('@@')){
            const data = line.startsWith('@@@') ? line.replace('@@@','') : line.replace('@@','')
            const name = data.split(' ')[0]
            const values = data.replace(name,'').trim().split(',')
            if(!supportedDecorators.includes(name)){
                fallbacking = true
                continue
            }
            if((!line.startsWith('@@@')) || fallbacking){
                decorators[name] = values
            }
        }
        else if(line === '@@end' || line === '@@@end'){
            decorators['depth'] = ['0']
        }
        else{
            return {
                prompt: split.slice(i).join('\n').trim(),
                decorators: decorators
            }
        }
    }
    return {
        prompt: '',
        decorators: decorators
    }
}

export async function importLoreBook(mode:'global'|'local'|'sglobal'){
    const selectedID = get(selectedCharID)
    let db = get(DataBase)
    const page = mode === 'sglobal' ? -1 : db.characters[selectedID].chatPage
    let lore = 
        mode === 'global' ? db.characters[selectedID].globalLore : 
        db.characters[selectedID].chats[page].localLore
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
            db.characters[selectedID].globalLore = lore
        }
        else{
            db.characters[selectedID].chats[page].localLore = lore
        }
        setDatabase(db)
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
        const db = get(DataBase)
        const page = mode === 'sglobal' ? -1 :  db.characters[selectedID].chatPage
        const lore = 
            mode === 'global' ? db.characters[selectedID].globalLore : 
            db.characters[selectedID].chats[page].localLore        
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
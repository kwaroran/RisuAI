import { get } from "svelte/store";
import {selectedCharID} from '../stores'
import { DataBase, setDatabase, type loreBook } from "../storage/database";
import { tokenize } from "../tokenizer";
import { checkNullish, selectSingleFile } from "../util";
import { alertError, alertNormal } from "../alert";
import { language } from "../../lang";
import { downloadFile } from "../storage/globalApi";

export function addLorebook(type:number) {
    let selectedID = get(selectedCharID)
    let db = get(DataBase)
    if(type === -1){
        db.loreBook[db.loreBookPage].data.push({
            key: '',
            comment: `New Lore ${db.loreBook[db.loreBookPage].data.length + 1}`,
            content: '',
            mode: 'normal',
            insertorder: 100,
            alwaysActive: false,
            secondkey: "",
            selective: false
        })
    }
    else if(type === 0){
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
    const globalLore = db.loreBook[db.loreBookPage]?.data ?? []
    const fullLore = characterLore.concat(chatLore.concat(globalLore))
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

                formatedLore.push({
                    keys: lore.alwaysActive ? 'always' : (lore.key?.startsWith("@@@regex ")) ? ({type:'regex',regex:lore.key.replace('@@@regex ','')}) :
                        (lore.key ?? '').replace(rmRegex, '').toLocaleLowerCase().split(',').filter((a) => {
                            return a.length > 1
                        }),
                    secondKey: lore.selective ? ((lore.secondkey?.startsWith("@@@regex ")) ? ({type:'regex',regex:lore.secondkey.replace('@@@regex ','')}) :
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
    activatiedPrompt = activatiedPrompt.filter((v) => {
        if(v.startsWith("@@@end")){
            sactivated.push(v.replace('@@@end','').trim())
            return false
        }
        return true
    })

    return {
        act: activatiedPrompt.reverse().join('\n\n'),
        special_act: sactivated.reverse().join('\n\n')
    }
}


export async function importLoreBook(mode:'global'|'local'|'sglobal'){
    const selectedID = get(selectedCharID)
    let db = get(DataBase)
    const page = mode === 'sglobal' ? -1 : db.characters[selectedID].chatPage
    let lore = 
        mode === 'global' ? db.characters[selectedID].globalLore : 
        mode === 'sglobal' ? db.loreBook[db.loreBookPage].data :
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
            const entries:{[key:string]:{
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
            }} = importedlore.entries
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
        }
        if(mode === 'global'){
            db.characters[selectedID].globalLore = lore
        }
        else if(mode === 'sglobal'){
            db.loreBook[db.loreBookPage].data = lore
        }
        else{
            db.characters[selectedID].chats[page].localLore = lore
        }
        setDatabase(db)
    } catch (error) {
        alertError(`${error}`)
    }
}

export async function exportLoreBook(mode:'global'|'local'|'sglobal'){
    try {
        const selectedID = get(selectedCharID)
        const db = get(DataBase)
        const page = mode === 'sglobal' ? -1 :  db.characters[selectedID].chatPage
        const lore = 
            mode === 'global' ? db.characters[selectedID].globalLore : 
            mode === 'sglobal' ? db.loreBook[db.loreBookPage].data :
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
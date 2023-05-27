import { get } from "svelte/store";
import {selectedCharID} from '../stores'
import { DataBase, setDatabase, type loreBook } from "../storage/database";
import { tokenize } from "../tokenizer";
import { selectSingleFile } from "../util";
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
    keys:string[]|'always',
    secondKey:string[]
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

    let activatiedPrompt: string[] = []

    let formatedLore:formatedLore[] = []

    for (const lore of fullLore){
        if(lore){
            if(lore.key.length > 1 || lore.alwaysActive){
                formatedLore.push({
                    keys: lore.alwaysActive ? 'always' : (lore.key ?? '').replace(rmRegex, '').toLocaleLowerCase().split(',').filter((a) => {
                        return a.length > 1
                    }),
                    secondKey: lore.selective ? (lore.secondkey ?? '').replace(rmRegex, '').toLocaleLowerCase().split(',').filter((a) => {
                        return a.length > 1
                    }) : [],
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
            for(const key of lore.keys){
                if(key){
                    if(formatedChat.includes(key)){
                        firstKeyActivation = true
                        break
                    }
                }
            }
    
            if(firstKeyActivation){
                if(lore.secondKey.length === 0){
                    activatiedPrompt.push(lore.content)
                    lore.activatied = true
                    loreListUpdated = true
                    continue
                }
                for(const key of lore.secondKey){
                    if(formatedChat.includes(key)){
                        activatiedPrompt.push(lore.content)
                        lore.activatied = true
                        loreListUpdated = true
                        break
                    }
                }
            }
        }
        if(!(char.loreSettings?.recursiveScanning)){
            break
        }
    }

    return activatiedPrompt.reverse().join('\n\n')
}


export async function importLoreBook(mode:'global'|'local'|'sglobal'){
    const selectedID = get(selectedCharID)
    let db = get(DataBase)
    const page = mode === 'sglobal' ? -1 : db.characters[selectedID].chatPage
    let lore = 
        mode === 'global' ? db.characters[selectedID].globalLore : 
        mode === 'sglobal' ? db.loreBook[db.loreBookPage].data :
        db.characters[selectedID].chats[page].localLore
    const lorebook = (await selectSingleFile(['json'])).data
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
                constant:boolean
            }} = importedlore.entries
            for(const key in entries){
                const currentLore = entries[key]
                lore.push({
                    key: currentLore.key.join(', '),
                    insertorder: currentLore.order,
                    comment: currentLore.comment.length < 1 ? 'Unnamed Imported Lore' : currentLore.comment,
                    content: currentLore.content,
                    mode: "normal",
                    alwaysActive: currentLore.constant,
                    secondkey: "",
                    selective: false
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
import { get } from "svelte/store";
import {selectedCharID} from '../stores'
import { DataBase, setDatabase, type loreBook } from "../database";
import { tokenize } from "../tokenizer";
import { selectSingleFile } from "../util";
import { alertError, alertNormal } from "../alert";
import { language } from "../../lang";
import { downloadFile } from "../globalApi";

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
    keys:string[]|'always',
    secondKey:string[]
    content: string
    order: number
}

const rmRegex = / |\n/g

export async function loadLoreBookPrompt(){
    const selectedID = get(selectedCharID)
    const db = get(DataBase)
    const page = db.characters[selectedID].chatPage
    const globalLore = db.characters[selectedID].globalLore
    const charLore = db.characters[selectedID].chats[page].localLore
    const fullLore = globalLore.concat(charLore)
    const currentChat = db.characters[selectedID].chats[page].message

    let activatiedPrompt: string[] = []

    let formatedLore:formatedLore[] = []

    for (const lore of fullLore){
        if(lore.key.length > 1 || lore.alwaysActive){
            formatedLore.push({
                keys: lore.alwaysActive ? 'always' : lore.key.replace(rmRegex, '').toLocaleLowerCase().split(',').filter((a) => {
                    return a.length > 1
                }),
                secondKey: lore.selective ? lore.secondkey.replace(rmRegex, '').toLocaleLowerCase().split(',').filter((a) => {
                    return a.length > 1
                }) : [],
                content: lore.content,
                order: lore.insertorder
            })
        }
    }

    formatedLore.sort((a, b) => {
        return b.order - a.order
    })

    const formatedChat = currentChat.slice(currentChat.length - db.loreBookDepth,currentChat.length).map((msg) => {
        return msg.data
    }).join('||').replace(rmRegex,'').toLocaleLowerCase()

    for(const lore of formatedLore){
        const totalTokens = await tokenize(activatiedPrompt.concat([lore.content]).join('\n\n'))
        if(totalTokens > db.loreBookToken){
            break
        }

        if(lore.keys === 'always'){
            activatiedPrompt.push(lore.content)
            continue
        }

        let firstKeyActivation = false
        for(const key of lore.keys){
            if(formatedChat.includes(key)){
                firstKeyActivation = true
                break
            }
        }

        if(firstKeyActivation && lore.secondKey.length === 0){
            activatiedPrompt.push(lore.content)
            continue
        }

        for(const key of lore.secondKey){
            if(formatedChat.includes(key)){
                activatiedPrompt.push(lore.content)
                break
            }
        }
    }

    return activatiedPrompt.reverse().join('\n\n')
}


export async function importLoreBook(mode:'global'|'local'){
    const selectedID = get(selectedCharID)
    let db = get(DataBase)
    const page = db.characters[selectedID].chatPage
    let lore = mode === 'global' ? db.characters[selectedID].globalLore : db.characters[selectedID].chats[page].localLore
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
        else{
            db.characters[selectedID].chats[page].localLore = lore
        }
        setDatabase(db)
    } catch (error) {
        alertError(`${error}`)
    }
}

export async function exportLoreBook(mode:'global'|'local'){
    try {
        const selectedID = get(selectedCharID)
        const db = get(DataBase)
        const page = db.characters[selectedID].chatPage
        const lore = mode === 'global' ? db.characters[selectedID].globalLore : db.characters[selectedID].chats[page].localLore
        
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
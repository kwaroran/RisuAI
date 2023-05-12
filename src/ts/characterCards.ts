import { get } from "svelte/store"
import { alertConfirm, alertError, alertNormal, alertStore } from "./alert"
import { DataBase, defaultSdDataFunc, type character, saveImage, setDatabase, type customscript } from "./database"
import { checkNullish, selectSingleFile, sleep } from "./util"
import { language } from "src/lang"
import { encode as encodeMsgpack, decode as decodeMsgpack } from "@msgpack/msgpack";
import { v4 as uuidv4 } from 'uuid';
import exifr from 'exifr'
import { PngMetadata } from "./exif"
import { characterFormatUpdate } from "./characters"
import { downloadFile, readImage } from "./globalApi"
import { cloneDeep } from "lodash"

type CharacterBook = null  

export async function importCharacter() {
    try {
        const f = await selectSingleFile(['png', 'json'])
        if(!f){
            return
        }
        if(f.name.endsWith('json')){
            const da = JSON.parse(Buffer.from(f.data).toString('utf-8'))
            if(await importSpecv2(da)){
                let db = get(DataBase)
                return db.characters.length - 1
            }
            if((da.char_name || da.name) && (da.char_persona || da.description) && (da.char_greeting || da.first_mes)){
                let db = get(DataBase)
                db.characters.push(convertOldTavernAndJSON(da))
                DataBase.set(db)
                alertNormal(language.importedCharacter)
                return
            }
            else{
                alertError(language.errors.noData)
                return
            }
        }
        alertStore.set({
            type: 'wait',
            msg: 'Loading... (Reading)'
        })
        await sleep(10)
        const img = f.data
        const readed = (await exifr.parse(img, true))
        if(readed.chara){
            // standard spec v2 imports
            const charaData:CharacterCardV2 = JSON.parse(Buffer.from(readed.chara, 'base64').toString('utf-8'))
            if(await importSpecv2(charaData, img)){
                let db = get(DataBase)
                return db.characters.length - 1
            }
        }
        if(readed.risuai){
            // old risu imports
            await sleep(10)
            const va = decodeMsgpack(Buffer.from(readed.risuai, 'base64')) as any
            if(va.type !== 101){
                alertError(language.errors.noData)
                return
            }

            let char:character = va.data
            let db = get(DataBase)
            if(char.emotionImages && char.emotionImages.length > 0){
                for(let i=0;i<char.emotionImages.length;i++){
                    alertStore.set({
                        type: 'wait',
                        msg: `Loading... (Getting Emotions ${i} / ${char.emotionImages.length})`
                    })
                    await sleep(10)
                    const imgp = await saveImage(char.emotionImages[i][1] as any)
                    char.emotionImages[i][1] = imgp
                }
            }
            char.chats = [{
                message: [],
                note: '',
                name: 'Chat 1',
                localLore: []
            }]

            if(checkNullish(char.sdData)){
                char.sdData = defaultSdDataFunc()
            }

            char.chatPage = 0
            char.image = await saveImage(PngMetadata.filter(img))
            db.characters.push(characterFormatUpdate(char))
            char.chaId = uuidv4()
            setDatabase(db)
            alertNormal(language.importedCharacter)
            return db.characters.length - 1
        }
        else if(readed.chara){
            const charaData:OldTavernChar = JSON.parse(Buffer.from(readed.chara, 'base64').toString('utf-8'))
            const imgp = await saveImage(PngMetadata.filter(img))
            let db = get(DataBase)
            db.characters.push(convertOldTavernAndJSON(charaData, imgp))
            DataBase.set(db)
            alertNormal(language.importedCharacter)
            return db.characters.length - 1
        }   
        else{
            alertError(language.errors.noData)
            return null
        }
    } catch (error) {
        alertError(`${error}`)
        return null
    }
}

export async function characterHubImport() {
    const charPath = (new URLSearchParams(location.search)).get('charahub')
    try {
        if(charPath){
            const url = new URL(location.href);
            url.searchParams.delete('charahub');
            window.history.pushState(null, '', url.toString());
            const chara = await fetch("https://api.characterhub.org/api/characters/download", {
                method: "POST",
                body: JSON.stringify({
                    "format": "tavern",
                    "fullPath": charPath,
                    "version": "main"
                }),
                headers: {
                    "content-type": "application/json"
                }
            })
            const img = new Uint8Array(await chara.arrayBuffer())
    
            const readed = (await exifr.parse(img, true))
            {
                const charaData:CharacterCardV2 = JSON.parse(Buffer.from(readed.chara, 'base64').toString('utf-8'))
                if(await importSpecv2(charaData, img)){
                    
                    return
                }
            }
            {
                const imgp = await saveImage(PngMetadata.filter(img))
                let db = get(DataBase)
                const charaData:OldTavernChar = JSON.parse(Buffer.from(readed.chara, 'base64').toString('utf-8'))    
                db.characters.push(convertOldTavernAndJSON(charaData, imgp))
    
                DataBase.set(db)
                alertNormal(language.importedCharacter)
                return
            }
        }
    } catch (error) {
        alertError(language.errors.noData)
        return null
    }
}


function convertOldTavernAndJSON(charaData:OldTavernChar, imgp:string|undefined = undefined):character{


    return {
        name: charaData.name ?? 'unknown name',
        firstMessage: charaData.first_mes ?? 'unknown first message',
        desc:  charaData.description ?? '',
        notes: '',
        chats: [{
            message: [],
            note: '',
            name: 'Chat 1',
            localLore: []
        }],
        chatPage: 0,
        image: imgp,
        emotionImages: [],
        bias: [],
        globalLore: [],
        viewScreen: 'none',
        chaId: uuidv4(),
        sdData: defaultSdDataFunc(),
        utilityBot: false,
        customscript: [],
        exampleMessage: charaData.mes_example,
        creatorNotes:'',
        systemPrompt:'',
        postHistoryInstructions:'',
        alternateGreetings:[],
        tags:[],
        creator:"",
        characterVersion: 0,
        personality: charaData.personality ?? '',
        scenario:charaData.scenario ?? '',
        firstMsgIndex: -1
    }
}

export async function exportChar(charaID:number) {
    const db = get(DataBase)
    let char:character = JSON.parse(JSON.stringify(db.characters[charaID]))

    if(!char.image){
        alertError('Image Required')
        return
    }
    const conf = await alertConfirm(language.exportConfirm)
    if(!conf){
        return
    }

    alertStore.set({
        type: 'wait',
        msg: 'Loading...'
    })

    let img = await readImage(char.image)

    try{
        if(char.emotionImages && char.emotionImages.length > 0){
            for(let i=0;i<char.emotionImages.length;i++){
                alertStore.set({
                    type: 'wait',
                    msg: `Loading... (Getting Emotions ${i} / ${char.emotionImages.length})`
                })
                const rData = await readImage(char.emotionImages[i][1])
                char.emotionImages[i][1] = rData as any
            }
        }
    
        char.chats = []

        alertStore.set({
            type: 'wait',
            msg: 'Loading... (Compressing)'
        })

        await sleep(10)

        const data = Buffer.from(encodeMsgpack({
            data: char,
            type: 101
        })).toString('base64')

        alertStore.set({
            type: 'wait',
            msg: 'Loading... (Writing Exif)'
        })

        const tavernData:OldTavernChar = {
            avatar: "none",
            chat: "",
            create_date: `${Date.now()}`,
            description: char.desc,
            first_mes: char.firstMessage,
            mes_example: "<START>",
            name: char.name,
            personality: "",
            scenario: "",
            talkativeness: "0.5"
        }

        await sleep(10)
        img = PngMetadata.write(img, {
            'chara': Buffer.from(JSON.stringify(tavernData)).toString('base64'),
            'risuai': data
        })

        alertStore.set({
            type: 'wait',
            msg: 'Loading... (Writing)'
        })
        
        char.image = ''
        await sleep(10)
        await downloadFile(`${char.name.replace(/[<>:"/\\|?*\.\,]/g, "")}_export.png`, img)

        alertNormal(language.successExport)

    }
    catch(e){
        alertError(`${e}`)
    }

}


async function importSpecv2(card:CharacterCardV2, img?:Uint8Array):Promise<boolean>{
    if(!card ||card.spec !== 'chara_card_v2'){
        return false
    }
    const data = card.data
    const im = img ? await saveImage(PngMetadata.filter(img)) : undefined
    let db = get(DataBase)

    const risuext = cloneDeep(data.extensions.risuai)
    let emotions:[string, string][] = []
    let bias:[string, number][] = []
    let viewScreen: "none" | "emotion" | "imggen" = 'none'
    let customScripts:customscript[] = []
    let utilityBot = false
    let sdData = defaultSdDataFunc()

    if(risuext){
        if(risuext.emotions){
            for(let i=0;i<risuext.emotions.length;i++){
                alertStore.set({
                    type: 'wait',
                    msg: `Loading... (Getting Emotions ${i} / ${risuext.emotions.length})`
                })
                await sleep(10)
                const imgp = await saveImage(Buffer.from(risuext.emotions[i][1], 'base64'))
                emotions.push([risuext.emotions[i][0],imgp])
            }
        }
        bias = risuext.bias ?? bias
        viewScreen = risuext.viewScreen ?? viewScreen
        customScripts = risuext.customScripts ?? customScripts
        utilityBot = risuext.utilityBot ?? utilityBot
        sdData = risuext.sdData ?? sdData
    }

    let char:character = {
        name: data.name ?? '',
        firstMessage: data.first_mes ?? '',
        desc: data.description ?? '',
        notes: '',
        chats: [{
            message: [],
            note: '',
            name: 'Chat 1',
            localLore: []
        }],
        chatPage: 0,
        image: im,
        emotionImages: emotions,
        bias: bias,
        globalLore: [], //lorebook
        viewScreen: viewScreen,
        chaId: uuidv4(),
        sdData: sdData,
        utilityBot: utilityBot,
        customscript: customScripts,
        exampleMessage: data.mes_example ?? '',
        creatorNotes:data.creator_notes ?? '',
        systemPrompt:data.system_prompt ?? '',
        postHistoryInstructions:data.post_history_instructions ?? '',
        alternateGreetings:data.alternate_greetings ?? [],
        tags:data.tags ?? [],
        creator:data.creator ?? '',
        characterVersion: data.character_version ?? 0,
        personality:data.personality ?? '',
        scenario:data.scenario ?? '',
        firstMsgIndex: -1,
        removedQuotes: false
    }

    
    setDatabase(db)

    alertNormal(language.importedCharacter)
    return true

}


type CharacterCardV2 = {
    spec: 'chara_card_v2'
    spec_version: '2.0' // May 8th addition
    data: {
        name: string
        description: string
        personality: string
        scenario: string
        first_mes: string
        mes_example: string
        creator_notes: string
        system_prompt: string
        post_history_instructions: string
        alternate_greetings: string[]
        character_book?: CharacterBook
        tags: string[]
        creator: string
        character_version: number
        extensions: {
            risuai?:{
                emotions?:[string, string][]
                bias?:[string, number][],
                viewScreen?: "none" | "emotion" | "imggen",
                customScripts?:customscript[]
                utilityBot?: boolean,
                sdData?:[string,string][]
            }
        }
    }
}  


interface OldTavernChar{
    avatar: "none"
    chat: string
    create_date: string
    description: string
    first_mes: string
    mes_example: string
    name: string
    personality: ""
    scenario: ""
    talkativeness: "0.5"
}

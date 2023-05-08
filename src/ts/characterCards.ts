import { get } from "svelte/store"
import { alertConfirm, alertError, alertNormal, alertStore } from "./alert"
import { DataBase, defaultSdDataFunc, type character, saveImage, setDatabase } from "./database"
import { checkNullish, selectSingleFile, sleep } from "./util"
import { language } from "src/lang"
import { encode as encodeMsgpack, decode as decodeMsgpack } from "@msgpack/msgpack";
import { v4 as uuidv4 } from 'uuid';
import exifr from 'exifr'
import { PngMetadata } from "./exif"
import { characterFormatUpdate } from "./characters"
import { downloadFile, readImage } from "./globalApi"

type OfficialCardSpec = {
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
        extensions: Record<string, any>
    }
}
  
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
                return
            }
            if((da.char_name || da.name) && (da.char_persona || da.description) && (da.char_greeting || da.first_mes)){
                let db = get(DataBase)
                db.characters.push({
                    name: da.char_name ?? da.name,
                    firstMessage: da.char_greeting ?? da.first_mes,
                    desc: da.char_persona ?? da.description,
                    notes: '',
                    chats: [{
                        message: [],
                        note: '',
                        name: 'Chat 1',
                        localLore: []
                    }],
                    chatPage: 0,
                    image: '',
                    emotionImages: [],
                    bias: [],
                    globalLore: [],
                    viewScreen: 'none',
                    chaId: uuidv4(),
                    sdData: defaultSdDataFunc(),
                    utilityBot: false,
                    customscript: [],
                    exampleMessage: ''
                })
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

        console.log(readed)
        if(readed.chara){
            // standard spec v2 imports
            const charaData:CharacterCardV2 = JSON.parse(Buffer.from(readed.chara, 'base64').toString('utf-8'))
            if(await importSpecv2(charaData)){
                return
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
            if(charaData.first_mes && charaData.name && charaData.description){
                const imgp = await saveImage(PngMetadata.filter(img))
                let db = get(DataBase)
                db.characters.push({
                    name: charaData.name,
                    firstMessage: charaData.first_mes,
                    desc: charaData.description,
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
                    exampleMessage: ''
                })
                DataBase.set(db)
                alertNormal(language.importedCharacter)
                return db.characters.length - 1
            }
            alertError(language.errors.noData)
            return null
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


async function importSpecv2(card:CharacterCardV2):Promise<boolean>{
    if(!card ||card.spec !== 'chara_card_v2'){
        return false
    }
    let data = card.data

    let db = get(DataBase)

    const risuext = data.extensions.risuai
    if(risuext && risuext.emotions){
        for(let i=0;i<risuext.emotions.length;i++){
            alertStore.set({
                type: 'wait',
                msg: `Loading... (Getting Emotions ${i} / ${risuext.emotions.length})`
            })
            await sleep(10)
            const imgp = await saveImage(risuext.emotions[i][1] as any)
            data.extensions.risuai.emotions[i][1] = imgp
        }
    }
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
                emotions:[string, string][]
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
    mes_example: "<START>"
    name: string
    personality: ""
    scenario: ""
    talkativeness: "0.5"
}

import { get } from "svelte/store"
import { DataBase, saveImage, setDatabase } from "./storage/database"
import { selectSingleFile, sleep } from "./util"
import { alertError, alertNormal, alertStore } from "./alert"
import { downloadFile, readImage } from "./storage/globalApi"
import { language } from "src/lang"
import { cloneDeep } from "lodash"
import { reencodeImage } from "./image"
import { PngChunk } from "./pngChunk"

export async function selectUserImg() {
    const selected = await selectSingleFile(['png'])
    if(!selected){
        return
    }
    const img = selected.data
    let db = get(DataBase)
    const imgp = await saveImage(img)
    db.userIcon = imgp
    db.personas[db.selectedPersona] = {
        name: db.username,
        icon: db.userIcon,
        personaPrompt: db.personaPrompt,
        largePersonaPortrait: db.largePersonaPortrait
    }
    setDatabase(db)
}

export function saveUserPersona() {
    let db = get(DataBase)
    db.personas[db.selectedPersona] = {
        name: db.username,
        icon: db.userIcon,
        personaPrompt: db.personaPrompt,
        largePersonaPortrait: db.largePersonaPortrait
    }
    setDatabase(db)
}

export function changeUserPersona(id:number, save:'save'|'noSave' = 'save') {
    if(save === 'save'){
        saveUserPersona()
    }
    let db = get(DataBase)
    const pr = db.personas[id]
    db.personaPrompt = pr.personaPrompt
    db.username = pr.name,
    db.userIcon = pr.icon
    db.selectedPersona = id
    db.largePersonaPortrait = pr.largePersonaPortrait
    setDatabase(db)
}



interface PersonaCard {
    name: string
    personaPrompt: string
}

export async function exportUserPersona(){
    let db = get(DataBase)
    if(!db.userIcon){
        alertError(language.errors.noUserIcon)
        return
    }
    if((!db.username) || (!db.personaPrompt)){
        alertError("username or persona prompt is empty")
        return
    }


    let img = await readImage(db.userIcon)

    let card:PersonaCard = cloneDeep({
        name: db.username,
        personaPrompt: db.personaPrompt,
    })

    alertStore.set({
        type: 'wait',
        msg: 'Loading... (Writing Exif)'
    })

    await sleep(10)

    img = (await PngChunk.write(await reencodeImage(img), {
        "persona":Buffer.from(JSON.stringify(card)).toString('base64')
    })) as Uint8Array

    alertStore.set({
        type: 'wait',
        msg: 'Loading... (Writing)'
    })
    
    await sleep(10)
    await downloadFile(`${db.username.replace(/[<>:"/\\|?*\.\,]/g, "")}_export.png`, img)

    alertNormal(language.successExport)
}

export async function importUserPersona(){

    try {
        const v = await selectSingleFile(['png'])
        const decoded = PngChunk.read(v.data, ['persona'])?.persona
        if(!decoded){
            alertError(language.errors.noData)
            return
        }
        const data:PersonaCard = JSON.parse(Buffer.from(decoded, 'base64').toString('utf-8'))
        if(data.name && data.personaPrompt){
            let db = get(DataBase)
            db.personas.push({
                name: data.name,
                icon: await saveImage(await reencodeImage(v.data)),
                personaPrompt: data.personaPrompt,
                largePersonaPortrait: false
            })
            setDatabase(db)
            alertNormal(language.successImport)
        }else{
            alertError(language.errors.noData)
        }

    } catch (error) {
        alertError(`${error}`)
        return
    }
}
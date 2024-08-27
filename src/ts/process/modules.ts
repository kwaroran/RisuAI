import { language } from "src/lang"
import { alertConfirm, alertError, alertModuleSelect, alertNormal } from "../alert"
import { DataBase, setDatabase, type customscript, type loreBook, type triggerscript } from "../storage/database"
import { downloadFile } from "../storage/globalApi"
import { get } from "svelte/store"
import { CurrentCharacter, CurrentChat } from "../stores"
import { selectSingleFile } from "../util"
import { v4 } from "uuid"
import { convertExternalLorebook } from "./lorebook"
import { encode } from "msgpackr"
import { decodeRPack, encodeRPack } from "../rpack/rpack_bg"

export interface RisuModule{
    name: string
    description: string
    lorebook?: loreBook[]
    regex?: customscript[]
    cjs?: string
    trigger?: triggerscript[]
    id: string
    lowLevelAccess?: boolean
    hideIcon?: boolean
    backgroundEmbedding?:string
}

export async function exportModule(module:RisuModule){
    const dat = await encodeRPack(Buffer.from(JSON.stringify({
        ...module,
        type: 'risuModule'
    }, null, 2), 'utf-8'))

    await downloadFile(module.name + '.risum', dat)
    alertNormal(language.successExport)
}

export async function importModule(){
    const f = await selectSingleFile(['json', 'lorebook', 'risum'])
    if(!f){
        return
    }
    let fileData = f.data
    const db = get(DataBase)
    try {
        if(f.name.endsWith('.risum')){
            fileData = Buffer.from(await decodeRPack(fileData))
        }
        const importData = JSON.parse(Buffer.from(fileData).toString())
        if(importData.type === 'risuModule'){
            if(
                (!importData.name)
                || (!importData.id)
            ){
                alertError(language.errors.noData)
                return
            }
            importData.id = v4()

            if(importData.lowLevelAccess){
                const conf = await alertConfirm(language.lowLevelAccessConfirm)
                if(!conf){
                    return false
                }
            }
            db.modules.push(importData)
            setDatabase(db)
            return
        }
        if(importData.type === 'risu' && importData.data){
            const lores:loreBook[] = importData.data
            const importModule = {
                name: importData.name || 'Imported Lorebook',
                description: importData.description || 'Converted from risu lorebook',
                lorebook: lores,
                id: v4()
            }
            db.modules.push(importModule)
            setDatabase(db)
            return
        }
        if(importData.entries){
            const lores:loreBook[] = convertExternalLorebook(importData.entries)
            const importModule = {
                name: importData.name || 'Imported Lorebook',
                description: importData.description || 'Converted from external lorebook',
                lorebook: lores,
                id: v4()
            }
            db.modules.push(importModule)
            setDatabase(db)
            return
        }
        if(importData.type === 'regex'  && importData.data){
            const regexs:customscript[] = importData.data
            const importModule = {
                name: importData.name || 'Imported Regex',
                description: importData.description || 'Converted from risu regex',
                regex: regexs,
                id: v4()
            }
            db.modules.push(importModule)
            setDatabase(db)
            return
        }
    } catch (error) {
        alertNormal(language.errors.noData)
    }
}

function getModuleById(id:string){
    const db = get(DataBase)
    for(let i=0;i<db.modules.length;i++){
        if(db.modules[i].id === id){
            return db.modules[i]
        }
    }
    return null
}

let lastModules = ''
let lastModuleData:RisuModule[] = []
export function getModules(ids:string[]){
    const idsJoined = ids.join('-')
    if(lastModules === idsJoined){
        return lastModuleData
    }

    let modules:RisuModule[] = []
    for(const id of ids){
        const module = getModuleById(id)
        modules.push(module)
    }
    lastModules = idsJoined
    lastModuleData = modules
    return modules

}


export function getModuleLorebooks() {
    const currentChat = get(CurrentChat)
    const db = get(DataBase)
    if (!currentChat) return []
    let moduleIds = currentChat.modules ?? []
    moduleIds = moduleIds.concat(db.enabledModules)
    const modules = getModules(moduleIds)
    let lorebooks: loreBook[] = []
    for (const module of modules) {
        if(!module){
            continue
        }
        if (module.lorebook) {
            lorebooks = lorebooks.concat(module.lorebook)
        }
    }
    return lorebooks
}


export function getModuleTriggers() {
    const currentChat = get(CurrentChat)
    const db = get(DataBase)
    if (!currentChat) return []
    let moduleIds = currentChat.modules ?? []
    moduleIds = moduleIds.concat(db.enabledModules)
    const modules = getModules(moduleIds)
    let triggers: triggerscript[] = []
    for (const module of modules) {
        if(!module){
            continue
        }
        if (module.trigger) {
            triggers = triggers.concat(module.trigger.map((t) => {
                t.lowLevelAccess = module.lowLevelAccess
                return t
            }))
        }
    }
    return triggers
}

export function getModuleRegexScripts() {
    const currentChat = get(CurrentChat)
    const db = get(DataBase)
    if (!currentChat) return []
    let moduleIds = currentChat.modules ?? []
    moduleIds = moduleIds.concat(db.enabledModules)
    const modules = getModules(moduleIds)
    let customscripts: customscript[] = []
    for (const module of modules) {
        if(!module){
            continue
        }
        if (module.regex) {
            customscripts = customscripts.concat(module.regex)
        }
    }
    return customscripts
}

export async function applyModule() {
    const sel = await alertModuleSelect()
    if (!sel) {
        return
    }

    const module = structuredClone(getModuleById(sel))
    if (!module) {
        return
    }

    const currentChar = get(CurrentCharacter)
    if (!currentChar) {
        return
    }
    if(currentChar.type === 'group'){
        return
    }

    if (module.lorebook) {
        for (const lore of module.lorebook) {
            currentChar.globalLore.push(lore)
        }
    }
    if (module.regex) {
        for (const regex of module.regex) {
            currentChar.customscript.push(regex)
        }
    }
    if (module.trigger) {
        for (const trigger of module.trigger) {
            currentChar.triggerscript.push(trigger)
        }
    }

    CurrentCharacter.set(currentChar)

    alertNormal(language.successApplyModule)
}
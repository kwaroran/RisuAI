import { language } from "src/lang"
import { alertError, alertNormal } from "../alert"
import { DataBase, setDatabase, type customscript, type loreBook, type triggerscript } from "../storage/database"
import { downloadFile } from "../storage/globalApi"
import { get } from "svelte/store"
import { CurrentChat } from "../stores"
import { selectSingleFile } from "../util"
import { v4 } from "uuid"

export interface RisuModule{
    name: string
    description: string
    lorebook?: loreBook[]
    regex?: customscript[]
    cjs?: string
    trigger?: triggerscript[]
    id: string
}

export async function exportModule(module:RisuModule){
    await downloadFile(module.name + '.json', JSON.stringify({
        ...module,
        type: 'risuModule'
    }, null, 2))
    alertNormal(language.successExport)
}

export async function importModule(){
    const f = await selectSingleFile(['json'])
    if(!f){
        return
    }
    const file = f.data
    try {
        const importedModule = JSON.parse(Buffer.from(file).toString())
        if(importedModule.type === 'risuModule'){
            const db = get(DataBase)
            if(
                (!importedModule.name)
                || (!importedModule.description)
                || (!importedModule.id)
            ){
                alertError(language.errors.noData)
            }
            importedModule.id = v4()
            db.modules.push(importedModule)
            setDatabase(db)
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


export function getModuleLorebooks() {
    const currentChat = get(CurrentChat)
    const db = get(DataBase)
    if (!currentChat) return []
    let moduleIds = currentChat.modules ?? []
    moduleIds = moduleIds.concat(db.enabledModules)
    let lorebooks: loreBook[] = []
    for (const moduleId of moduleIds) {
        const module = getModuleById(moduleId)
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
    let triggers: triggerscript[] = []
    for (const moduleId of moduleIds) {
        const module = getModuleById(moduleId)
        if(!module){
            continue
        }
        if (module.trigger) {
            triggers = triggers.concat(module.trigger)
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
    let customscripts: customscript[] = []
    for (const moduleId of moduleIds) {
        const module = getModuleById(moduleId)
        if(!module){
            continue
        }
        if (module.regex) {
            customscripts = customscripts.concat(module.regex)
        }
    }
    return customscripts
}
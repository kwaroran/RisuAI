import { language } from "src/lang"
import { alertConfirm, alertError, alertModuleSelect, alertNormal, alertStore } from "../alert"
import { DataBase, setDatabase, type customscript, type loreBook, type triggerscript } from "../storage/database"
import { AppendableBuffer, downloadFile, isNodeServer, isTauri, readImage, saveAsset } from "../storage/globalApi"
import { get } from "svelte/store"
import { CurrentCharacter, CurrentChat } from "../stores"
import { selectSingleFile, sleep } from "../util"
import { v4 } from "uuid"
import { convertExternalLorebook } from "./lorebook"
import { encode } from "msgpackr"
import { decodeRPack, encodeRPack } from "../rpack/rpack_bg"
import { convertImage } from "../parser"
import { Capacitor } from "@capacitor/core"

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
    assets?:[string,string,string][]
    namespace?:string
}

export async function exportModule(module:RisuModule, arg:{
    alertEnd?:boolean
    saveData?:boolean
} = {}){
    const alertEnd = arg.alertEnd ?? true
    const saveData = arg.saveData ?? true
    const apb = new AppendableBuffer()
    const writeLength = (len:number) => {
        const lenbuf = Buffer.alloc(4)
        lenbuf.writeUInt32LE(len, 0)
        apb.append(lenbuf)
    }
    const writeByte = (byte:number) => {
        //byte is 0-255
        const buf = Buffer.alloc(1)
        buf.writeUInt8(byte, 0)
        apb.append(buf)
    }

    const assets = module.assets ?? []
    module = structuredClone(module)
    module.assets ??= []
    module.assets = module.assets.map((asset) => {
        return [asset[0], '', asset[2]] as [string,string,string]
    })

    const mainbuf = await encodeRPack(Buffer.from(JSON.stringify({
        module: module,
        type: 'risuModule'
    }, null, 2), 'utf-8'))

    writeByte(111) //magic number
    writeByte(0) //version
    writeLength(mainbuf.length)
    apb.append(mainbuf)

    for(let i=0;i<assets.length;i++){
        const asset = assets[i]
        writeByte(1) //mark as asset
        alertStore.set({
            type: 'wait',
            msg: `Loading... (Adding Assets ${i} / ${assets.length})`
        })
        let rData = await readImage(asset[1])
        if(!rData){
            rData = new Uint8Array(0) //blank buffer
        }
        let encoded = await encodeRPack(Buffer.from(await convertImage(rData)))
        writeLength(encoded.length)
        apb.append(encoded)
    }

    writeByte(0) //end of file

    if(saveData){
        await downloadFile(module.name + '.risum', apb.buffer)
    }
    if(alertEnd){
        alertNormal(language.successExport)
    }

    return apb.buffer
}

export async function readModule(buf:Buffer):Promise<RisuModule> {
    let pos = 0

    const readLength = () => {
        const len = buf.readUInt32LE(pos)
        pos += 4
        return len
    }
    const readByte = () => {
        const byte = buf.readUInt8(pos)
        pos += 1
        return byte
    }
    const readData = (len:number) => {
        const data = buf.subarray(pos, pos + len)
        pos += len
        return data
    }

    if(readByte() !== 111){
        console.error("Invalid magic number")
        alertError(language.errors.noData)
        return
    }
    if(readByte() !== 0){ //Version check
        console.error("Invalid version")
        alertError(language.errors.noData)
        return
    }

    const mainLen = readLength()
    const mainData = readData(mainLen)
    const main:{
        type:'risuModule'
        module:RisuModule
    } = JSON.parse(Buffer.from(await decodeRPack(mainData)).toString())

    if(main.type !== 'risuModule'){
        console.error("Invalid module type")
        alertError(language.errors.noData)
        return
    }

    let module = main.module

    let i = 0
    while(true){
        const mark = readByte()
        if(mark === 0){
            break
        }
        if(mark !== 1){
            alertError(language.errors.noData)
            return
        }
        const len = readLength()
        const data = readData(len)
        module.assets[i][1] = await saveAsset(Buffer.from(await decodeRPack(data)))
        alertStore.set({
            type: 'wait',
            msg: `Loading... (Adding Assets ${i} / ${module.assets.length})`
        })
        if(!isTauri && !Capacitor.isNativePlatform() &&!isNodeServer){
            await sleep(100)
        }
        i++
    }
    alertStore.set({
        type: 'none',
        msg: ''
    })

    module.id = v4()
    return module
}

export async function importModule() {
    const f = await selectSingleFile(['json', 'lorebook', 'risum'])
    if (!f) {
        return
    }
    let fileData = f.data
    const db = get(DataBase)
    if (f.name.endsWith('.risum')) {
        try {
            const buf = Buffer.from(fileData)
            const module = await readModule(buf)
            db.modules.push(module)
            setDatabase(db)
            console.log("Imported Module:", {
                name: module.name,
                description: module.description,
                assets: module.assets,
                triggers: module.trigger,
                regex: module.regex,
                lorebook: module.lorebook
            })
            return
        } catch (error) {
            console.error(error)
            alertError(language.errors.noData)
        }
    }
    try {
        const importData = JSON.parse(Buffer.from(fileData).toString())
        if (importData.type === 'risuModule') {
            if (
                (!importData.name)
                || (!importData.id)
            ) {
                alertError(language.errors.noData)
                return
            }
            importData.id = v4()

            if (importData.lowLevelAccess) {
                const conf = await alertConfirm(language.lowLevelAccessConfirm)
                if (!conf) {
                    return false
                }
            }
            db.modules.push(importData)
            setDatabase(db)
            console.log("Imported Module:", {
                name: importData.name,
                description: importData.description,
                assets: importData.assets,
                triggers: importData.trigger,
                regex: importData.regex,
                lorebook: importData.lorebook
            })
            return
        }
        if (importData.type === 'risu' && importData.data) {
            const lores: loreBook[] = importData.data
            const importModule = {
                name: importData.name || 'Imported Lorebook',
                description: importData.description || 'Converted from risu lorebook',
                lorebook: lores,
                id: v4()
            }
            db.modules.push(importModule)
            setDatabase(db)
            console.log("Imported Module:", {
                name: importModule.name,
                description: importModule.description,
                assets: importModule.assets,
                triggers: importModule.trigger,
                regex: importModule.regex,
                lorebook: importModule.lorebook
            })
            return
        }
        if (importData.entries) {
            const lores: loreBook[] = convertExternalLorebook(importData.entries)
            const importModule = {
                name: importData.name || 'Imported Lorebook',
                description: importData.description || 'Converted from external lorebook',
                lorebook: lores,
                id: v4()
            }
            db.modules.push(importModule)
            setDatabase(db)
            console.log("Imported Module:", {
                name: importModule.name,
                description: importModule.description,
                assets: importModule.assets,
                triggers: importModule.trigger,
                regex: importModule.regex,
                lorebook: importModule.lorebook
            })
            return
        }
        if (importData.type === 'regex' && importData.data) {
            const regexs: customscript[] = importData.data
            const importModule = {
                name: importData.name || 'Imported Regex',
                description: importData.description || 'Converted from risu regex',
                regex: regexs,
                id: v4()
            }
            db.modules.push(importModule)
            setDatabase(db)
            console.log("Imported Module:", {
                name: importModule.name,
                description: importModule.description,
                assets: importModule.assets,
                triggers: importModule.trigger,
                regex: importModule.regex,
                lorebook: importModule.lorebook
            })
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

function getModuleByIds(ids:string[]){
    let modules:RisuModule[] = []
    const db = get(DataBase)
    for(let i=0;i<ids.length;i++){
        const module = db.modules.find((m) => m.id === ids[i] || (m.namespace === ids[i] && m.namespace))
        if(module){
            modules.push(module)
        }
    }
    return modules
}

let lastModules = ''
let lastModuleData:RisuModule[] = []
export function getModules(){
    const currentChat = get(CurrentChat)
    const db = get(DataBase)
    let ids = db.enabledModules ?? []
    if (currentChat){
        ids = ids.concat(currentChat.modules ?? [])
    }
    if(db.moduleIntergration){
        const intList = db.moduleIntergration.split(',').map((s) => s.trim())
        ids = ids.concat(intList)
    }
    const idsJoined = ids.join('-')
    if(lastModules === idsJoined){
        return lastModuleData
    }

    let modules:RisuModule[] = getModuleByIds(ids)
    lastModules = idsJoined
    lastModuleData = modules
    return modules

}


export function getModuleLorebooks() {
    const modules = getModules()
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

export function getModuleAssets() {
    const modules = getModules()
    let assets: [string,string,string][] = []
    for (const module of modules) {
        if(!module){
            continue
        }
        if (module.assets) {
            assets = assets.concat(module.assets)
        }
    }
    return assets
}


export function getModuleTriggers() {
    const modules = getModules()
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
    const modules = getModules()
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
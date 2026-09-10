import {
    writeFile,
    BaseDirectory,
    readFile,
    mkdir,
    remove,
    readDir
} from "@tauri-apps/plugin-fs"
import { forageStorage, requiresFullEncoderReload } from "../globalApi.svelte"
import { isTauri, isNodeServer } from "src/ts/platform"
import { DBState } from "../stores.svelte"
import type { NodeStorage } from "../storage/nodeStorage"
import { compress as fflateCompress, decompress as fflateDecompress } from "fflate"
import { fetchProtectedResource } from "../sionyw"
import { alertClear, alertConfirm, alertError, alertWait } from "../alert"
import { language } from "src/lang"
import type { Database, character } from "../storage/database.svelte"
import { coldStorageHeader, getColdStorageAffectedCharacters, getColdStorageBackupName, isColdStorageBackupData, listColdDataKeysFromDb } from "./coldstorageData"

export {
    coldStorageHeader,
    getColdStorageBackupKey,
    getColdStorageBackupName,
    isColdStorageBackupData,
    replaceColdStoragePayloadResources,
    listColdDataKeysFromDb
} from "./coldstorageData"

async function decompress(data:Uint8Array) {
    return new Promise<Uint8Array>((resolve, reject) => {
        fflateDecompress(data, (err, decompressed) => {
            if (err) {
                return reject(err)
            }
            resolve(decompressed)
        })
    })
}

export async function getColdStorageItem(key:string, opts:{
    accountFallback?:boolean
} = {}) {

    if(forageStorage.isAccount && !opts.accountFallback){
        const d = await fetchProtectedResource('/hub/account/coldstorage', {
            method: 'GET',
            headers: {
                'x-risu-key': key,
            }
        })

        if(d.status === 200){
            const buf = await d.arrayBuffer()
            const text = new TextDecoder().decode(await decompress(new Uint8Array(buf)))
            return JSON.parse(text)
        }
        return await getColdStorageItem(key, {
            accountFallback: true
        })
    }
    else if(isNodeServer){
        try {
            const storage = forageStorage.realStorage as NodeStorage
            const f = await storage.getItem('coldstorage/' + key)
            if(!f){
                return null
            }
            const text = new TextDecoder().decode(await decompress(new Uint8Array(f)))
            return JSON.parse(text)
        }
        catch (error) {
            return null
        }
    }
    else if(isTauri){
        try {
            const f = await readFile('./coldstorage/'+key+'.json', {
                baseDir: BaseDirectory.AppData
            })
            const text = new TextDecoder().decode(await decompress(new Uint8Array(f)))
            return JSON.parse(text)
        } catch (error) {
            return null
        }
    }
    else{
        //use opfs
        try {
            const opfs = await navigator.storage.getDirectory()
            const file = await opfs.getFileHandle('coldstorage_' + key+'.json')
            if(!file){
                return null
            }
            const d = await file.getFile()
            if(!d){
                return null
            }
            const buf = await d.arrayBuffer()
            const text = new TextDecoder().decode(await decompress(new Uint8Array(buf)))
            return JSON.parse(text)
        } catch (error) {
            return null
        }
    }
}

async function compressColdStorageValue(value:any):Promise<Uint8Array | null> {
    try {
        const json = JSON.stringify(value)
        return await (new Promise<Uint8Array>((resolve, reject) => {
            fflateCompress(new TextEncoder().encode(json), (err, result) => {
                if (err) {
                    return reject(err)
                }
                resolve(result)
            })
        }))
    } catch (error) {
        console.error('Cold storage compression failed:', error)
        return null
    }
}

export async function setAccountColdStorageItem(key:string, value:any):Promise<boolean> {
    const compressed = await compressColdStorageValue(value)
    if(!compressed){
        return false
    }

    try {
        const res = await fetchProtectedResource('/hub/account/coldstorage', {
            method: 'POST',
            headers: {
                'x-risu-key': key,
                'content-type': 'application/octet-stream'
            },
            body: compressed as any
        })
        if(res.status !== 200){
            console.error('Error setting cold storage item:', await res.text().catch(() => 'unknown'))
            return false
        }
        return true
    } catch (error) {
        console.error('Cold storage account write failed:', error)
        return false
    }
}

export async function setColdStorageItem(key:string, value:any):Promise<boolean> {
    console.log("setting cold storage item", key, value)

    if(forageStorage.isAccount){
        return await setAccountColdStorageItem(key, value)
    }

    const compressed = await compressColdStorageValue(value)
    if(!compressed){
        return false
    }

    if(isNodeServer){
        try {
            const storage = forageStorage.realStorage as NodeStorage
            await storage.setItem('coldstorage/' + key, compressed)
            return true
        } catch (error) {
            console.error('Cold storage node write failed:', error)
            return false
        }
    }

    else if(isTauri){
        try {
            await mkdir('./coldstorage', { recursive: true, baseDir: BaseDirectory.AppData })
            await writeFile('./coldstorage/'+key+'.json', compressed, { baseDir: BaseDirectory.AppData })
            return true
        } catch (error) {
            console.error('Cold storage Tauri write failed:', error)
            return false
        }
    }
    else{
        //use opfs
        try {
            const opfs = await navigator.storage.getDirectory()
            const file = await opfs.getFileHandle('coldstorage_' + key+'.json', { create: true })
            const writable = await file.createWritable()
            await writable.write(compressed as any)
            await writable.close()
            return true
        } catch (error) {
            console.error('Cold storage OPFS write failed:', error)
            return false
        }
    }
}

export async function listColdStorageItems():Promise<{items:string[]}> {
    if(forageStorage.isAccount){
        const d = await fetchProtectedResource('/hub/account/coldstorage', {
            method: 'GET',
            headers: {
                'x-risu-key': '@list-keys',
            }
        })

        if(d.status === 200){
            return await d.json()
        }
        return null
    }

    else if(isNodeServer){
        const fullKeys = await (forageStorage.realStorage as NodeStorage).keys()
        const keys = fullKeys.filter(k => k.startsWith('coldstorage/')).map(k => k.replace('coldstorage/', ''))
        return {
            items: keys
        }
    }

    else if(isTauri){
        const entries = await readDir('./coldstorage', { baseDir: BaseDirectory.AppData })
        const keys = entries.filter(e => e.name.endsWith('.json')).map(e => e.name.slice(0, -5))
        return {
            items: keys
        }
    }
    else{
        const opfs = await navigator.storage.getDirectory()
        const entries = opfs.entries()
        const keys = []
        for await (const [name, handle] of entries) {
            if(name.startsWith('coldstorage_') && name.endsWith('.json')){
                keys.push(name.slice(12, -5))
            }
        }
        return {
            items: keys
        }
    }
}

export async function cleanColdStorage(){
    const actualUsedKeys = await listColdDataKeys()
    const allKeys = (await listColdStorageItems()).items
    const unusedKeys = allKeys.filter(k => !actualUsedKeys.includes(k))
    console.log('Cleaning cold storage, actual used keys:', actualUsedKeys, 'all keys:', allKeys, 'unused keys:', unusedKeys)

    if(forageStorage.isAccount || isNodeServer){
        await removeColdStorageItems(unusedKeys)
    }
    else{
        for(let i=0;i<unusedKeys.length;i++){
            const key = unusedKeys[i]
            alertWait(`Removing unused cold storage item: ${key} (${i + 1} / ${unusedKeys.length})`)
            await removeColdStorageItems([key])
        }
    }

    alertClear()
}

async function removeColdStorageItems(keys:string[]) {
    
    if(forageStorage.isAccount){
        try {
            const res = await fetchProtectedResource('/hub/account/coldstorage', {
                method: 'POST',
                headers: {
                    'x-risu-key': 'remove',
                    'x-action': 'remove'
                },
                body: JSON.stringify({ keys })
            })
            if(res.status !== 200){
                console.error('Error removing cold storage item:', await res.text().catch(() => 'unknown'))
            }
        } catch (error) {
            console.error('Cold storage account remove failed:', error)
        }
    }
    else if(isNodeServer){
        try {
            const storage = forageStorage.realStorage as NodeStorage
            const deleteKeys = keys.map(k => 'coldstorage/' + k);
            (storage as NodeStorage).removeItem(deleteKeys)
        } catch (error) {
            console.error(error)
        }
    }
    else if(isTauri){
        try {
            for(let i=0;i<keys.length;i++){
                await remove('./coldstorage/'+keys[i]+'.json', { baseDir: BaseDirectory.AppData })
            }
        } catch (error) {
            console.error(error)
        }
    }
    else{
        //use opfs
        try {
            const opfs = await navigator.storage.getDirectory()
            for(let i=0;i<keys.length;i++){
                await opfs.removeEntry('coldstorage_' + keys[i]+'.json')
            }
        } catch (error) {
            console.error(error)
        }
    }
}

export async function listColdDataKeys(db: Pick<Database, 'characters'|'pluginCustomStorage'> = DBState.db): Promise<string[]> {
    return listColdDataKeysFromDb(db)
}

export type ColdStorageBackupPayload = {
    key: string
    backupName: string
    value: unknown
    encoded: Uint8Array
}

export async function collectColdStorageBackupPayloads(db: Pick<Database, 'characters'|'pluginCustomStorage'> = DBState.db): Promise<{
    payloads: ColdStorageBackupPayload[]
    missingKeys: string[]
    invalidKeys: string[]
}> {
    const coldKeys = await listColdDataKeys(db)
    const payloads: ColdStorageBackupPayload[] = []
    const missingKeys: string[] = []
    const invalidKeys: string[] = []

    for (const key of coldKeys) {
        try {
            const value = await getColdStorageItem(key)
            if (!value) {
                missingKeys.push(key)
                continue
            }

            if (!isColdStorageBackupData(value)) {
                invalidKeys.push(key)
                continue
            }

            payloads.push({
                key,
                backupName: getColdStorageBackupName(key),
                value,
                encoded: new TextEncoder().encode(JSON.stringify(value))
            })
        } catch (error) {
            console.error(`Failed to read cold storage item ${key}:`, error)
            missingKeys.push(key)
        }
    }

    return { payloads, missingKeys, invalidKeys }
}

export async function confirmIncompleteColdStorageOperation(
    db: Pick<Database, 'characters'>,
    unavailableKeys: Iterable<string>,
    operation: 'backup' | 'restore',
): Promise<boolean> {
    const uniqueUnavailableKeys = Array.from(new Set(unavailableKeys))
    if (uniqueUnavailableKeys.length === 0) {
        return true
    }

    const affected = getColdStorageAffectedCharacters(db, uniqueUnavailableKeys)
    const characterNames = affected.characterNames.join(', ')
    const message = operation === 'backup'
        ? language.errors.coldStorageIncompleteBackupConfirm(
            characterNames,
            uniqueUnavailableKeys.length,
            affected.unresolvedKeys.length,
        )
        : language.errors.coldStorageIncompleteRestoreConfirm(
            characterNames,
            uniqueUnavailableKeys.length,
            affected.unresolvedKeys.length,
        )

    return await alertConfirm(message)
}

async function makeColdDataForCharacter(i:number, coldTime:number): Promise<boolean>{
    const lastInteraction = DBState.db.characters[i].lastInteraction ?? Date.now()
    if(lastInteraction < coldTime && !DBState.db.characters[i].coldstorage){
        console.log(`Character ${DBState.db.characters[i].name ?? i} has not been interacted with since ${new Date(lastInteraction).toLocaleDateString()}, moving to cold storage`)
        const id = crypto.randomUUID()
        const writeSuccess = await setColdStorageItem(id, {
            character: DBState.db.characters[i]
        })

        if(!writeSuccess){
            console.error(`Cold storage write failed for character ${i}, keeping original data`)
            return false
        }

        const verifyData = await getColdStorageItem(id)
        if(!verifyData || (!Array.isArray(verifyData) && !verifyData.character)){
            console.error(`Cold storage verification failed for character ${DBState.db.characters[i].chaId ?? i}, keeping original data`, verifyData)
            return false
        }

        //get cold storaged chats in this character
        const coldStoragedChats:string[] = []
        for(let j=0;j<DBState.db.characters[i].chats.length;j++){
            const chat = DBState.db.characters[i].chats[j]
            if(chat.message?.[0]?.data?.startsWith(coldStorageHeader)){
                const coldDataKey = chat.message[0].data.slice(coldStorageHeader.length)
                coldStoragedChats.push(coldDataKey)
            }
        }

        // Not a full character object,
        // just the data needed to show in the character list and load the chat when clicked. The rest will be loaded back when the character is opened.
        const coldCharacter:character = {
            type: 'character',
            image: DBState.db.characters[i].image,
            name: DBState.db.characters[i].name,
            chats: [{
                message: [{
                    time: Date.now(),
                    data: '',
                    role: 'char'
                }],
                note: "",
                name: "",
                localLore: []
            }],
            chatPage: 0,
            chaId: DBState.db.characters[i].chaId,
            firstMsgIndex: 0,
            coldstorage: id,
            coldStoragedChats: coldStoragedChats
        } as any

        DBState.db.characters[i] = coldCharacter
        return true
    }

    return false
}

async function makeColdDataForChat(i:number, j:number, coldTime:number): Promise<boolean>{
    
    const chat = DBState.db.characters[i].chats[j]
    let greatestTime = chat.lastDate ?? 0

    if(chat.message.length < 4){
        //it is inefficient to store small data
        return false
    }

    if(chat.message?.[0]?.data?.startsWith(coldStorageHeader)){
        //already cold storage
        return false
    }

    if(DBState.db.characters[i].coldstorage){
        //character is in cold storage, no need to cold storage individual chats
        return false
    }


    for(let k=0;k<chat.message.length;k++){
        const message = chat.message[k]
        const time = message.time
        if(!time){
            continue
        }

        if(time > greatestTime){
            greatestTime = time
        }
    }

    if(greatestTime < coldTime){
        const id = crypto.randomUUID()
        const writeSuccess = await setColdStorageItem(id, {
            message: chat.message,
            hypaV2Data: chat.hypaV2Data,
            hypaV3Data: chat.hypaV3Data,
            scriptstate: chat.scriptstate,
            localLore: chat.localLore
        })

        if(!writeSuccess){
            console.error(`Cold storage write failed for chat ${chat.id ?? j} in character ${i}, keeping original data`)
            alertError(language.errors.coldStorageWriteFailed)
            return false
        }

        // Verify the data can be read back before replacing
        const verifyData = await getColdStorageItem(id)
        if(!verifyData || (!Array.isArray(verifyData) && !verifyData.message)){
            console.error(`Cold storage verification failed for chat ${chat.id ?? j}, keeping original data`)
            alertError(language.errors.coldStorageVerifyFailed)
            return false
        }

        chat.message = [{
            time: Date.now(),
            data: coldStorageHeader + id,
            role: 'char'
        }]
        chat.hypaV2Data = {
            chunks:[],
            mainChunks: [],
            lastMainChunkID: 0,
        }
        chat.hypaV3Data = {
            summaries:[]
        }
        chat.scriptstate = {}
        chat.localLore = []
        
        return true
    }

    return false
}

async function migratePluginStorageKeyToColdStorage(key:string): Promise<boolean>{
    const value = DBState.db.pluginCustomStorage?.[key]
    if(value === undefined){
        return false
    }

    const id = crypto.randomUUID()
    const writeSuccess = await setColdStorageItem(id, value)

    if(!writeSuccess){
        console.error(`Cold storage write failed for plugin storage key ${key}, keeping original data`)
        return false
    }

    const verifyData = await getColdStorageItem(id)
    if(verifyData === null || verifyData === undefined){
        console.error(`Cold storage verification failed for plugin storage key ${key}, keeping original data`)
        return false
    }

    DBState.db.pluginCustomStorage._coldplugin ??= {}
    DBState.db.pluginCustomStorage._coldplugin[key] = id
    delete DBState.db.pluginCustomStorage[key]
    return true
}

async function migratePluginStorageToColdStorage(): Promise<boolean>{
    if(!DBState.db.pluginCustomStorage){
        return false
    }

    //legacy keys stored inline before pluginStorage became coldstorage-backed
    const legacyKeys = Object.keys(DBState.db.pluginCustomStorage).filter(key => key !== '_coldplugin')
    let didChange = false

    for(let i=0;i<legacyKeys.length;i++){
        alertWait(`Migrating plugin storage to cold storage... ${legacyKeys.length - i} items left`)
        const changed = await migratePluginStorageKeyToColdStorage(legacyKeys[i])
        if(changed){
            didChange = true
        }
    }

    return didChange
}

export async function makeColdData(){

    if(!DBState.db.coldstorage){
        return
    }

    const currentTime = Date.now()
    const coldTime = currentTime - 1000 * 60 * 60 * 24 * 10 //10 days before now
    const queue:(() => Promise<boolean>)[] = []
    let didChange = false

    if(await migratePluginStorageToColdStorage()){
        didChange = true
    }

    for(let i=0;i<DBState.db.characters.length;i++){
        queue.push(() => makeColdDataForCharacter(i, coldTime))
    }

    while(queue.length > 0){
        const batch = queue.splice(0, 5) //process 5 at a time to avoid blocking
        alertWait(`Creating character cold storage data... ${queue.length} items left`)
        const results = await Promise.all(batch.map(fn => fn()))

        if(results.some(Boolean)){
            didChange = true
        }
    }

    for(let i=0;i<DBState.db.characters.length;i++){
        for(let j=0;j<DBState.db.characters[i].chats.length;j++){
            queue.push(() => makeColdDataForChat(i, j, coldTime))
        }
    }

    while(queue.length > 0){
        const batch = queue.splice(0, 5) //process 5 at a time to avoid blocking
        alertWait(`Creating chat cold storage data... ${queue.length} items left`)
        const results = await Promise.all(batch.map(fn => fn()))

        if(results.some(Boolean)){
            didChange = true
        }
    }

    if(didChange){
        requiresFullEncoderReload.state = true
    }
    
    alertClear()
}

export async function preLoadChat(characterIndex:number, chatIndex:number){
    const chat = DBState.db?.characters?.[characterIndex]?.chats?.[chatIndex]   

    if(!chat){
        return
    }

    if(chat.message?.[0]?.data?.startsWith(coldStorageHeader)){
        //bring back from cold storage
        const coldDataKey = chat.message[0].data.slice(coldStorageHeader.length)
        const coldData = await getColdStorageItem(coldDataKey)
        if(coldData && Array.isArray(coldData)){
            chat.message = coldData
            chat.lastDate = Date.now()
        }
        else if(coldData?.message){
            chat.message = coldData.message
            chat.hypaV2Data = coldData.hypaV2Data
            chat.hypaV3Data = coldData.hypaV3Data
            chat.scriptstate = coldData.scriptstate
            chat.localLore = coldData.localLore
            chat.lastDate = Date.now()
        }
        else{
            // Cold storage data is missing or corrupted.
            // Replace with an error message so the user knows what happened
            // instead of silently showing a broken pointer.
            console.error(`Cold storage data not found for key: ${coldDataKey}`)
            chat.message = [{
                time: Date.now(),
                data: `[Cold storage data could not be loaded. Key: ${coldDataKey}]`,
                role: 'char'
            }]
            chat.lastDate = Date.now()
            return
        }
    }

}

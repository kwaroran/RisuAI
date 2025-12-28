import {
    writeFile,
    BaseDirectory,
    readFile,
    exists,
    mkdir,
    remove
} from "@tauri-apps/plugin-fs"
import { forageStorage, isNodeServer, isTauri } from "../globalApi.svelte"
import { DBState } from "../stores.svelte"
import type { NodeStorage } from "../storage/nodeStorage"
import { fetchProtectedResource } from "../sionyw"

export const coldStorageHeader = '\uEF01COLDSTORAGE\uEF01'

async function decompress(data:Uint8Array) {
    const fflate = await import('fflate')
    return new Promise<Uint8Array>((resolve, reject) => {
        fflate.decompress(data, (err, decompressed) => {
            if (err) {
                reject(err)
            }
            resolve(decompressed)
        })
    })
}

async function getColdStorageItem(key:string) {

    if(forageStorage.isAccount){
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
        return null
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

async function setColdStorageItem(key:string, value:any) {

    const fflate = await import('fflate')
    const json = JSON.stringify(value)
    const compressed = await (new Promise<Uint8Array>((resolve, reject) => {   
        fflate.compress(new TextEncoder().encode(json), (err, compressed) => {
            if (err) {
                reject(err)
            }
            resolve(compressed)
        })
    }))
    
    if(forageStorage.isAccount){
        const res = await fetchProtectedResource('/hub/account/coldstorage', {
            method: 'POST',
            headers: {
                'x-risu-key': key,
                'content-type': 'application/json'
            },
            body: compressed as any
        })
        if(res.status !== 200){
            try {
                console.error('Error setting cold storage item')
                console.error(await res.text())   
            } catch (error) {}
        }
        return
    }
    else if(isNodeServer){
        try {
            const storage = forageStorage.realStorage as NodeStorage
            await storage.setItem('coldstorage/' + key, compressed)
            return
        } catch (error) {
            console.error(error)
        }
    }

    else if(isTauri){
        try {
            if(!(await exists('./coldstorage'))){
                await mkdir('./coldstorage', { recursive: true, baseDir: BaseDirectory.AppData })
            }
            await writeFile('./coldstorage/'+key+'.json', compressed, { baseDir: BaseDirectory.AppData })
        } catch (error) {
            console.error(error)
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
        } catch (error) {
            console.error(error)
        }
    }
}

async function removeColdStorageItem(key:string) {
    if(isTauri){
        try {
            await remove('./coldstorage/'+key+'.json')
        } catch (error) {
            console.error(error)
        }
    }
    else{
        //use opfs
        try {
            const opfs = await navigator.storage.getDirectory()
            await opfs.removeEntry('coldstorage_' + key+'.json')
        } catch (error) {
            console.error(error)
        }
    }
}

export async function makeColdData(){

    if(!DBState.db.chatCompression){
        return
    }

    const currentTime = Date.now()
    const coldTime = currentTime - 1000 * 60 * 60 * 24 * 30 //30 days before now

    for(let i=0;i<DBState.db.characters.length;i++){
        for(let j=0;j<DBState.db.characters[i].chats.length;j++){
            
            const chat = DBState.db.characters[i].chats[j]
            let greatestTime = chat.lastDate ?? 0

            if(chat.message.length < 4){
                //it is inefficient to store small data
                continue
            }

            if(chat.message?.[0]?.data?.startsWith(coldStorageHeader)){
                //already cold storage
                continue
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
                await setColdStorageItem(id, {
                    message: chat.message,
                    hypaV2Data: chat.hypaV2Data,
                    hypaV3Data: chat.hypaV3Data,
                    scriptstate: chat.scriptstate,
                    localLore: chat.localLore
                })
                chat.message = [{
                    time: currentTime,
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

            }
        }
    }
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
        else if(coldData){
            chat.message = coldData.message
            chat.hypaV2Data = coldData.hypaV2Data
            chat.hypaV3Data = coldData.hypaV3Data
            chat.scriptstate = coldData.scriptstate
            chat.localLore = coldData.localLore
        }
        await setColdStorageItem(coldDataKey + '_accessMeta', {
            lastAccess: Date.now()
        })
    }

}
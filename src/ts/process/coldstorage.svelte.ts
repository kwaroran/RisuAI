import {
    writeFile,
    BaseDirectory,
    readFile,
    exists,
    mkdir,
    readDir,
    remove
} from "@tauri-apps/plugin-fs"
import { forageStorage, isTauri } from "../globalApi.svelte"
import { DBState } from "../stores.svelte"
import { hubURL } from "../characterCards"
import type { AccountStorage } from "../storage/accountStorage"

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
        const d = await fetch(hubURL + '/hub/account/coldstorage', {
            method: 'GET',
            headers: {
                'x-risu-key': key,
                'x-risu-auth': (forageStorage.realStorage as AccountStorage).auth
            }
        })

        if(d.status === 200){
            const buf = await d.arrayBuffer()
            const text = new TextDecoder().decode(await decompress(new Uint8Array(buf)))
            return JSON.parse(text)
        }
        return null
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
        const res = await fetch(hubURL + '/hub/account/coldstorage', {
            method: 'POST',
            headers: {
                'x-risu-key': key,
                'x-risu-auth': (forageStorage.realStorage as AccountStorage).auth,
                'content-type': 'application/json'
            },
            body: compressed
        })
        if(res.status !== 200){
            try {
                console.error('Error setting cold storage item')
                console.error(await res.text())   
            } catch (error) {}
        }
        return
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
            await writable.write(compressed)
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
                await setColdStorageItem(id, chat.message)
                chat.message = [{
                    time: currentTime,
                    data: coldStorageHeader + id,
                    role: 'char'
                }]
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
        if(coldData){
            chat.message = coldData
            chat.lastDate = Date.now()
        }
        await setColdStorageItem(coldDataKey + '_accessMeta', {
            lastAccess: Date.now()
        })
    }

}
import {
    writeFile,
    BaseDirectory,
    readFile,
    exists,
    mkdir,
    readDir,
    remove
} from "@tauri-apps/plugin-fs"
import { isTauri } from "../globalApi.svelte"
import { DBState } from "../stores.svelte"

const coldStorageHeader = '\uEF01COLDSTORAGE\uEF01'

async function getColdStorageItem(key:string) {
    
    if(isTauri){
        try {
            const f = await readFile('./coldstorage/'+key+'.json')
            const text = new TextDecoder().decode(f)
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
            const text = new TextDecoder().decode(buf)
            return JSON.parse(text)
        } catch (error) {
            return null
        }
    }
}

async function setColdStorageItem(key:string, value:any) {
    if(isTauri){
        try {
            if(!(await exists('./coldstorage'))){
                await mkdir('./coldstorage', { recursive: true })
            }
            const text = JSON.stringify(value)
            await writeFile('./coldstorage/'+key+'.json', new TextEncoder().encode(text))
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
            const text = JSON.stringify(value)
            await writable.write(new TextEncoder().encode(text))
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

    const currentTime = Date.now()
    const coldTime = currentTime - 1000 * 60 * 60 * 24 * 30 //30 days before now

    for(let i=0;i<DBState.db.characters.length;i++){
        for(let j=0;j<DBState.db.characters[i].chats.length;j++){
            
            const chat = DBState.db.characters[i].chats[j]
            let greatestTime = 0

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
        }
        await setColdStorageItem(coldDataKey + '_accessMeta', {
            lastAccess: Date.now()
        })
    }

}
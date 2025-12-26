import { writable } from "svelte/store"
import { getDatabase } from "./database.svelte"
import localforage from "localforage"
import { alertLogin, alertNormalWait, alertStore } from "../alert"
import { forageStorage, getUnpargeables } from "../globalApi.svelte"
import { encodeRisuSaveLegacy } from "./risuSave"
import { v4 } from "uuid"
import { language } from "src/lang"
import { sleep } from "../util"
import { fetchProtectedResource } from "../sionyw"

export const AccountWarning = writable('')
const risuSession = Date.now().toFixed(0)
const cachedForage = localforage.createInstance({name: "risuaiAccountCached"})

let seenWarnings:string[] = []

export class AccountStorage{
    auth:string
    usingSync:boolean

    async setItem(key:string, value:Uint8Array) {
        this.checkAuth()
        let da:Response

        let daText:string|undefined = undefined
        const getDaText = async () => {
            if(daText === undefined){
                daText = await da.text()
            }
            return daText
        }


        while((!da) || da.status === 403){

            const saveDate = Date.now().toFixed(0)

            da = await fetchProtectedResource('/api/account/write', {
                method: "POST",
                body: value as any,
                headers: {
                    'content-type': 'application/octet-stream',
                    'x-risu-key': key,
                    'X-Format': 'nocheck',
                    'x-risu-session': risuSession,
                    'x-risu-save-date': saveDate
                }
            })
            if(key === 'database/database.bin'){
                cachedForage.setItem(key, value).then(() => {
                    cachedForage.setItem(key + '__date', saveDate)
                })
            }

            if(da.headers.get('Content-Type') === 'application/json'){
                const json = JSON.parse(await getDaText())
                if(json?.warning){
                    if(!seenWarnings.includes(json.warning)){
                        seenWarnings.push(json.warning)
                        AccountWarning.set(json.warning)
                    }
                }
                if(json?.reloadSession){
                    alertNormalWait(language.activeTabChange).then(() => {
                        location.reload()
                    })
                    await sleep(100000000) // wait forever
                    return
                }
            }

            if(da.status === 304){
                return key
            }
            if(da.status === 403){
                if(da.headers.get('x-risu-status') === 'warn'){
                    return
                }
                localStorage.setItem("fallbackRisuToken",await alertLogin())
                this.checkAuth()
            }
        }
        if(da.status < 200 || da.status >= 300){
            throw await getDaText()
        }
        return await getDaText()
    }
    async getItem(key:string, callback?:(status:number) => void):Promise<Buffer> {
        this.checkAuth()
        if(key.startsWith('assets/')){
            const k:ArrayBuffer = await localforage.getItem(key)
            if(k){
                return Buffer.from(k)
            }
        }
        let da:Response
        const saveDate = await cachedForage.getItem(key + '__date') as number|undefined
        const perf = performance.now()
        while((!da) || da.status === 403){
            da = await fetchProtectedResource('/api/account/read/' + Buffer.from(key ,'utf-8').toString('hex') + 
                (key.includes('database') ? ('|' + v4()) : ''), {
                method: "GET",
                headers: {
                    'x-risu-key': key,
                    'x-risu-save-date': (saveDate || 0).toString()
                }
            })
            if(da.status === 403){
                localStorage.setItem("fallbackRisuToken",await alertLogin())
                this.checkAuth()
            }
        }
        if(da.status === 303){
            const data = await da.json()
            if(data.match){
                const c = Buffer.from(await cachedForage.getItem(key))
                return c
            }
            else{
                return null
            }
        }

        if(da.status < 200 || da.status >= 300){
            throw await da.text()
        }
        if(da.status === 204){
            return null
        }
        if(key.startsWith('assets/')){
            const ab = await da.arrayBuffer()
            await localforage.setItem(key, ab)
            return Buffer.from(ab)
        }
        if(!callback){
            const ab = await da.arrayBuffer()
            return Buffer.from(ab)
        }
        const size = parseInt(da.headers.get('x-body-size'))
        const appendable = new Uint8Array(size)
        const reader = da.body.getReader()

        let i = 0
        while(true){
            const {done, value} = await reader.read()
            if(done){
                break
            }
            appendable.set(value, i)
            i += value.length
            callback(i/size)
        }

        return Buffer.from(appendable)
    }
    async keys():Promise<string[]>{
        let db = getDatabase()
        return getUnpargeables(db, 'pure')
    }
    async removeItem(key:string){
        throw "Error: You cannot remove data in account. report this to dev if you found this."
    }

    private checkAuth(){
        const db = getDatabase()
        this.auth = db?.account?.token
        if(!this.auth){
            try {
                db.account = JSON.parse(localStorage.getItem("fallbackRisuToken"))
                this.auth = db?.account?.token
                db.account.useSync = true
            } catch (error) {}
        }
    }


    listItem = this.keys
}

export async function unMigrationAccount() {
    const keys = await forageStorage.keys()
    let db = getDatabase()
    let i = 0;
    const MigrationStorage = localforage.createInstance({name: "risuai"})
    
    for(const key of keys){
        alertStore.set({
            type: "wait",
            msg: `Migrating your data...(${i}/${keys.length})`
        })
        await MigrationStorage.setItem(key,await forageStorage.getItem(key))
        i += 1
    }

    db.account = null
    await MigrationStorage.setItem('database/database.bin', encodeRisuSaveLegacy(db))

    alertStore.set({
        type: "none",
        msg: ""
    })

    localStorage.setItem('dosync', 'avoid')
    localStorage.removeItem('accountst')
    localStorage.removeItem('fallbackRisuToken')
    location.reload()
}
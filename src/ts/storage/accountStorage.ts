import { get } from "svelte/store"
import { DataBase } from "./database"
import { hubURL } from "../characterCards"
import localforage from "localforage"
import { alertLogin, alertStore } from "../alert"
import { forageStorage, getUnpargeables, replaceDbResources } from "./globalApi"
import { encodeRisuSave } from "./risuSave"
import { v4 } from "uuid"

export class AccountStorage{
    auth:string
    usingSync:boolean

    async setItem(key:string, value:Uint8Array) {
        this.checkAuth()
        let da:Response
        while((!da) || da.status === 403){
            da = await fetch(hubURL + '/api/account/write', {
                method: "POST",
                body: value,
                headers: {
                    'content-type': 'application/json',
                    'x-risu-key': key,
                    'x-risu-auth': this.auth
                }
            })
            if(da.status === 304){
                return key
            }
            if(da.status === 403){
                localStorage.setItem("fallbackRisuToken",await alertLogin())
                this.checkAuth()
            }
        }
        if(da.status < 200 || da.status >= 300){
            throw await da.text()
        }
        return await da.text()
    }
    async getItem(key:string):Promise<Buffer> {
        this.checkAuth()
        if(key.startsWith('assets/')){
            const k:ArrayBuffer = await localforage.getItem(key)
            if(k){
                return Buffer.from(k)
            }
        }
        let da:Response
        while((!da) || da.status === 403){
            da = await fetch(hubURL + '/api/account/read/' + Buffer.from(key ,'utf-8').toString('hex') + 
                (key.includes('database') ? ('|' + v4()) : ''), {
                method: "GET",
                headers: {
                    'x-risu-key': key,
                    'x-risu-auth': this.auth
                }
            })
            if(da.status === 403){
                localStorage.setItem("fallbackRisuToken",await alertLogin())
                this.checkAuth()
            }
        }
        if(da.status < 200 || da.status >= 300){
            throw await da.text()
        }
        if(da.status === 204){
            return null
        }
        const ab = await da.arrayBuffer()
        if(key.startsWith('assets/')){
            await localforage.setItem(key, ab)
        }
        return Buffer.from(ab)
    }
    async keys():Promise<string[]>{
        let db = get(DataBase)
        return getUnpargeables(db, 'pure')
    }
    async removeItem(key:string){
        throw "Error: You cannot remove data in account. report this to dev if you found this."
    }

    private checkAuth(){
        const db = get(DataBase)
        this.auth = db?.account?.token
        if(!this.auth){
            db.account = JSON.parse(localStorage.getItem("fallbackRisuToken"))
            this.auth = db?.account?.token
            db.account.useSync = true
        }
    }


    listItem = this.keys
}

export async function unMigrationAccount() {
    const keys = await forageStorage.keys()
    let db = get(DataBase)
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
    await MigrationStorage.setItem('database/database.bin', encodeRisuSave(db))

    alertStore.set({
        type: "none",
        msg: ""
    })

    localStorage.setItem('dosync', 'avoid')
    localStorage.removeItem('accountst')
    localStorage.removeItem('fallbackRisuToken')
    location.reload()
}
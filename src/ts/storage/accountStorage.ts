import { get } from "svelte/store"
import { DataBase } from "./database"
import { hubURL } from "../characterCards"
import localforage from "localforage"

export class AccountStorage{
    auth:string
    usingSync:boolean

    async setItem(key:string, value:Uint8Array) {
        await this.checkAuth()
        const da = await fetch(hubURL + '/api/account/write', {
            method: "POST",
            body: value,
            headers: {
                'content-type': 'application/json',
                'x-risu-key': key,
                'x-risu-auth': this.auth ?? sessionStorage.getItem("fallbackRisuToken")
            }
        })
        if(da.status < 200 || da.status >= 300){
            throw await da.text()
        }
        return await da.text()
    }
    async getItem(key:string):Promise<Buffer> {
        await this.checkAuth()
        if(key.startsWith('assets/')){
            const k:ArrayBuffer = await localforage.getItem(key)
            if(k){
                return Buffer.from(k)
            }
        }
        const da = await fetch(hubURL + '/api/account/read', {
            method: "GET",
            headers: {
                'x-risu-key': key,
                'x-risu-auth': this.auth ?? sessionStorage.getItem("fallbackRisuToken")
            }
        })
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
        throw "Error: You cannot list in account. report this to dev if you found this."
    }
    async removeItem(key:string){
        throw "Error: You remove data in account. report this to dev if you found this."
    }

    private async checkAuth(){
        const db = get(DataBase)
        this.auth = db?.account?.token
        if(!this.auth){
            db.account = {
                id: "",
                token: sessionStorage.getItem("fallbackRisuToken"),
                useSync: true,
                data: {}
            }
        }
    }


    listItem = this.keys
}
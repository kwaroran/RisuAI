import { get } from "svelte/store"
import { DataBase } from "./database"
import { hubURL } from "../characterCards"

export class AccountStorage{
    auth:string

    async setItem(key:string, value:Uint8Array) {
        await this.checkAuth()
        const da = await fetch(hubURL + '/api/account/write', {
            method: "POST",
            body: JSON.stringify({
                content: Buffer.from(value).toString('base64')
            }),
            headers: {
                'content-type': 'application/json',
                'file-path': Buffer.from(key, 'utf-8').toString('hex'),
                'risu-auth': this.auth
            }
        })
        if(da.status < 200 || da.status >= 300){
            throw "setItem Error"
        }
        const data = await da.json()
        if(data.error){
            throw data.error
        }
    }
    async getItem(key:string):Promise<Buffer> {
        if(key.startsWith('assets/')){
            return Buffer.from(await (await fetch(`${hubURL}/resource/` + key)).arrayBuffer())
        }
        await this.checkAuth()
        const da = await fetch(hubURL + '/api/account/read', {
            method: "GET",
            headers: {
                'file-path': Buffer.from(key, 'utf-8').toString('hex'),
                'risu-auth': this.auth
            }
        })
        const data = await da.json()
        if(da.status < 200 || da.status >= 300){
            throw "getItem Error"
        }
        if(data.error){
            throw data.error
        }
        if(data.content === null){
            return null
        }
        return Buffer.from(data.content, 'base64')
    }
    async keys():Promise<string[]>{
        await this.checkAuth()
        const da = await fetch(hubURL + '/api/account/list', {
            method: "GET",
            headers:{
                'risu-auth': this.auth
            }
        })
        const data = await da.json()
        if(da.status < 200 || da.status >= 300){
            throw "listItem Error"
        }
        if(data.error){
            throw data.error
        }
        return data.content
    }
    async removeItem(key:string){
        await this.checkAuth()
        const da = await fetch(hubURL + '/api/account/remove', {
            method: "GET",
            headers: {
                'file-path': Buffer.from(key, 'utf-8').toString('hex'),
                'risu-auth': this.auth
            }
        })
        if(da.status < 200 || da.status >= 300){
            throw "removeItem Error"
        }
        const data = await da.json()
        if(data.error){
            throw data.error
        }
    }

    private async checkAuth(){
        this.auth = get(DataBase)?.account?.token

    }


    listItem = this.keys
}
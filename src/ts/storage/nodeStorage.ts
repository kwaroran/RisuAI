import { language } from "src/lang"
import { alertInput } from "../alert"

let auth:string = null
let authChecked = false

export class NodeStorage{
    async setItem(key:string, value:Uint8Array) {
        await this.checkAuth()
        const da = await fetch('/api/write', {
            method: "POST",
            body: value,
            headers: {
                'content-type': 'application/octet-stream',
                'file-path': Buffer.from(key, 'utf-8').toString('hex'),
                'risu-auth': auth
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
        await this.checkAuth()
        const da = await fetch('/api/read', {
            method: "GET",
            headers: {
                'file-path': Buffer.from(key, 'utf-8').toString('hex'),
                'risu-auth': auth
            }
        })
        if(da.status < 200 || da.status >= 300){
            throw "getItem Error"
        }

        const data = Buffer.from(await da.arrayBuffer())
        if (data.length == 0){
            return null
        }
        return data
    }
    async keys(prefix:string = ""):Promise<string[]>{
        await this.checkAuth()
        const da = await fetch('/api/list', {
            method: "GET",
            headers:{
                'risu-auth': auth,
                'key-prefix': prefix
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
        const da = await fetch('/api/remove', {
            method: "GET",
            headers: {
                'file-path': Buffer.from(key, 'utf-8').toString('hex'),
                'risu-auth': auth
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

    async patchItem(key: string, patchData: {patch: any[], expectedVersion: number}): Promise<boolean> {
        await this.checkAuth()
        
        const da = await fetch('/api/patch', {
            method: "POST",
            body: JSON.stringify(patchData),
            headers: {
                'content-type': 'application/json',
                'file-path': Buffer.from(key, 'utf-8').toString('hex'),
                'risu-auth': auth
            }
        })
        
        if(da.status === 409) {
            // Version mismatch - throw specific error for client to handle
            throw new Error('Version mismatch')
        }
        
        if(da.status < 200 || da.status >= 300){
            return false
        }
        const data = await da.json()
        if(data.error){
            return false
        }
        return true
    }

    private async checkAuth(){
        if(!auth){
            auth = localStorage.getItem('risuauth')
        }

        if(!authChecked){
            const data = await (await fetch('/api/password',{
                headers: {
                    'risu-auth': auth ?? ''
                }
            })).json()

            if(data.status === 'unset'){
                const input = await digestPassword(await alertInput(language.setNodePassword))
                await fetch('/api/set_password',{
                    method: "POST",
                    body:JSON.stringify({
                        password: input 
                    }),
                    headers: {
                        'content-type': 'application/json'
                    }
                })
                auth = input
                localStorage.setItem('risuauth', auth)
            }
            else if(data.status === 'incorrect'){
                while(true){
                    const input = await digestPassword(await alertInput(language.inputNodePassword))
                    const data = await (await fetch('/api/password',{
                        headers: {
                            'risu-auth': input ?? ''
                        }
                    })).json()
                    if(data.status !== 'unset'){
                        auth = input
                        localStorage.setItem('risuauth', auth)
                        await this.checkAuth()
                        break
                    }
                }
            }
            else{
                authChecked = true
            }
        }
    }


    listItem = this.keys
}

async function digestPassword(message:string) {
    const crypt = await (await fetch('/api/crypto', {
        body: JSON.stringify({
            data: message
        }),
        headers: {
            'content-type': 'application/json'
        },
        method: "POST"
    })).text()
    
    return crypt;
}

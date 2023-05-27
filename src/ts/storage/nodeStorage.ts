
export class NodeStorage{
    async setItem(key:string, value:Uint8Array) {
        const da = await fetch('/api/write', {
            method: "POST",
            body: JSON.stringify({
                content: Buffer.from(value).toString('base64')
            }),
            headers: {
                'content-type': 'application/json',
                'file-path': Buffer.from(key, 'utf-8').toString('hex')
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
        const da = await fetch('/api/read', {
            method: "GET",
            headers: {
                'file-path': Buffer.from(key, 'utf-8').toString('hex')
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
        const da = await fetch('/api/list', {
            method: "GET",
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
        const da = await fetch('/api/list', {
            method: "GET",
            headers: {
                'file-path': Buffer.from(key, 'utf-8').toString('hex')
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


    listItem = this.keys
}
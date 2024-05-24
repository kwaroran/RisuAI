import * as CapFS from '@capacitor/filesystem'

function encodeKeySafe(oldKey:string){
    return oldKey.replace(/_/g, '__').replace(/\//g, '_s').replace(/\./g, '_d').replace(/\$/g, '_t').replace(/-/g, '_h').replace(/:/g, '_c') + '.bin'
}

function decodeKeySafe(newKey:string){
    newKey = newKey.substring(0, newKey.length-4)
    return newKey.replace(/_c/g, ':').replace(/_h/g, '-').replace(/_t/g, '$').replace(/_d/g, '.').replace(/_s/g, '/').replace(/__/g, '_')
}


export class MobileStorage{
    async setItem(key:string, value:Uint8Array) {
        await CapFS.Filesystem.writeFile({
            path: encodeKeySafe(key),
            data: Buffer.from(value).toString('base64'),
            directory: CapFS.Directory.External,
            recursive: true,
        })
    }
    async getItem(key:string):Promise<Buffer> {
        try {
            const b64 = await CapFS.Filesystem.readFile({
                path: encodeKeySafe(key),
                directory: CapFS.Directory.External,   
            })
            return Buffer.from(b64.data as string, 'base64')
        } catch (error) {
            if(error){
                if(error.message.includes(`does not exist`)){
                    return null
                }
            }
            throw error
        }
    }
    async keys():Promise<string[]>{
        const files = await CapFS.Filesystem.readdir({
            path: '',
            directory: CapFS.Directory.External,
        })

        return files.files.map(f=>decodeKeySafe(f.name))
    }
    async removeItem(key:string){
        await CapFS.Filesystem.deleteFile({
            path: encodeKeySafe(key),
            directory: CapFS.Directory.External,   
        })
    }

    listItem = this.keys
}

function byteLengthToString(byteLength:number):string{
    if(byteLength < 1024){
        return byteLength + ' B'
    }
    if(byteLength < 1024*1024){
        return (byteLength/1024).toFixed(2) + ' KB'
    }
    if(byteLength < 1024*1024*1024){
        return (byteLength/1024/1024).toFixed(2) + ' MB'
    }
    return (byteLength/1024/1024/1024).toFixed(2) + ' GB'
}

export async function capStorageInvestigation(){
    const investResults:{
        key:string,
        size:string,
    }[] = []

    const files = await CapFS.Filesystem.readdir({
        path: '',
        directory: CapFS.Directory.External,
    })

    for(const file of files.files){
        const key = decodeKeySafe(file.name)
        const size = file.size
        investResults.push({key, size: byteLengthToString(size)})
    }

    const estimated = await navigator.storage.estimate()

    if(estimated){
        investResults.push({key:'webstorage', size:byteLengthToString(estimated.usage)})
    }

    return investResults
}
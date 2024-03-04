import * as CapFS from '@capacitor/filesystem'
import { get } from 'svelte/store';
import { DataBase } from './database';
import { getUnpargeables } from './globalApi';

export class MobileStorage{
    async setItem(key:string, value:Uint8Array) {
        await CapFS.Filesystem.writeFile({
            path: key,
            data: Buffer.from(value).toString('base64'),
            directory: CapFS.Directory.External,
            recursive: true,
        })
    }
    async getItem(key:string):Promise<Buffer> {
        try {
            const b64 = await CapFS.Filesystem.readFile({
                path: key,
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
        let db = get(DataBase)
        return getUnpargeables(db, 'pure')
    }
    async removeItem(key:string){
        await CapFS.Filesystem.deleteFile({
            path: key,
            directory: CapFS.Directory.External,   
        })
    }

    listItem = this.keys
}
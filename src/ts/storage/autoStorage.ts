import localforage from "localforage"
import { isNodeServer, replaceDbResources, supportsPatchSync } from "../globalApi.svelte"
import { NodeStorage } from "./nodeStorage"
import { OpfsStorage } from "./opfsStorage"
import { alertInput, alertSelect, alertStore } from "../alert"
import { getDatabase, type Database } from "./database.svelte"
import { AccountStorage } from "./accountStorage"
import { decodeRisuSave, encodeRisuSaveLegacy } from "./risuSave";
import { language } from "src/lang"
import { MobileStorage } from "./mobileStorage"
import { Capacitor } from "@capacitor/core"

export class AutoStorage{
    isAccount:boolean = false

    realStorage:LocalForage|NodeStorage|OpfsStorage|AccountStorage|MobileStorage

    async setItem(key:string, value:Uint8Array):Promise<string|null> {
        await this.Init()
        if(this.isAccount){
            return await (this.realStorage as AccountStorage).setItem(key, value)
        }
        await this.realStorage.setItem(key, value)
        return null
    }
    async getItem(key:string):Promise<Buffer> {
        await this.Init()
        return await this.realStorage.getItem(key)

    }
    async keys(prefix:string = ""):Promise<string[]>{
        await this.Init()
        let result: string[]
        if(this.realStorage instanceof NodeStorage) {
            result =  await this.realStorage.keys(prefix)
        }
        else {
            result = await this.realStorage.keys()
        }
        return result.filter((key) => key.startsWith(prefix.trim()))
    }
    async removeItem(key:string){
        await this.Init()
        return await this.realStorage.removeItem(key)
    }

    async patchItem(key: string, patchData: {patch: any[], expectedVersion: number}): Promise<boolean> {
        await this.Init()
        // Only NodeStorage supports patching for now
        if (this.realStorage instanceof NodeStorage && supportsPatchSync) {
            return await (this.realStorage as NodeStorage).patchItem(key, patchData)
        }
        return false
    }

    async checkAccountSync(){
        let db = getDatabase()
        if(this.isAccount){
            return true
        }
        if(localStorage.getItem('dosync') === 'avoid'){
            return false
        }
        if((localStorage.getItem('dosync') === 'sync' || db?.account?.useSync) && (localStorage.getItem('accountst') !== 'able')){
            const keys = await this.realStorage.keys()
            let i = 0;
            const accountStorage = new AccountStorage()

            const a = accountStorage.getItem('database/database.bin')
            if(a){
                const sel = await alertSelect([language.loadDataFromAccount, language.saveCurrentDataToAccount])
                if(sel === "0"){
                    this.realStorage = accountStorage
                    alertStore.set({
                        type: "none",
                        msg: ""
                    })
                    localStorage.setItem('accountst', 'able')
                    localStorage.setItem('fallbackRisuToken',JSON.stringify(db.account))
                    this.isAccount = true
                    return true
                }
            }

            const confirm = await alertInput(`to overwrite your data, type "RISUAI"`)
            if(confirm !== "RISUAI"){
                localStorage.setItem('dosync', 'avoid')
                return false
            }

            let replaced:{[key:string]:string} = {}
            
            for(const key of keys){
                alertStore.set({
                    type: "wait",
                    msg: `Migrating your data...(${i}/${keys.length})`
                })
                const rkey = await accountStorage.setItem(key,await this.realStorage.getItem(key))
                if(rkey !== key){
                    replaced[key] = rkey
                }
                i += 1
            }

            const dba = replaceDbResources(db, replaced)
            const comp = encodeRisuSaveLegacy(dba, 'compression')
            //try decoding
            try {
                const z:Database = await decodeRisuSave(comp)
                if(z.formatversion){
                    await accountStorage.setItem('database/database.bin', comp)
                }
                
            } catch (error) {}
            this.realStorage = accountStorage
            alertStore.set({
                type: "none",
                msg: ""
            })

            localStorage.setItem('accountst', 'able')
            localStorage.setItem('fallbackRisuToken',JSON.stringify(db.account))
            this.isAccount = true
            await localforage.clear()
            return true
        }
        else if(localStorage.getItem('accountst') === 'able'){
            localStorage.setItem('accountst', 'able')
            this.realStorage = new AccountStorage()
            this.isAccount = true
        }
        return false
    }

    async Init(){
        if(!this.realStorage){
            if(localStorage.getItem('accountst') === 'able'){
                this.realStorage = new AccountStorage()
                this.isAccount = true
                return
            }
            if(Capacitor.isNativePlatform()){
                this.realStorage = new MobileStorage()
                return
            }
            if(isNodeServer){
                console.log("using node storage")
                this.realStorage = new NodeStorage()
                return
            }
            else if(window.navigator?.storage?.getDirectory &&
                    FileSystemFileHandle?.prototype?.createWritable &&
                    localStorage.getItem('opfs_flag!') === "able"){
                console.log("using opfs storage")

                const forage = localforage.createInstance({
                    name: "risuai"
                })

                const i = await forage.getItem("database/database.bin")

                if((!i) || (await forage.getItem("migrated"))){
                    this.realStorage = new OpfsStorage()
                    return
                }
                else if(!(await forage.getItem("denied_opfs"))){
                    console.log("migrating")
                    const keys = await forage.keys()
                    let i = 0;
                    const opfs = new OpfsStorage()
                    for(const key of keys){
                        alertStore.set({
                            type: "wait",
                            msg: `Migrating your data...(${i}/${keys.length})`
                        })
                        await opfs.setItem(key,await forage.getItem(key))
                        i += 1
                    }
                    this.realStorage = opfs
                    alertStore.set({
                        type: "none",
                        msg: ""
                    })
                    await forage.setItem("migrated", true)
                    return
                }
            }
            console.log("using forage storage")
            this.realStorage = localforage.createInstance({
                name: "risuai"
            })
        }
    }

    listItem = this.keys
}

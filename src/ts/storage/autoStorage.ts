import localforage from "localforage"
import { isNodeServer } from "./globalApi"
import { NodeStorage } from "./nodeStorage"
import { OpfsStorage } from "./opfsStorage"
import { alertConfirm, alertStore } from "../alert"
import { get } from "svelte/store"
import { DataBase } from "./database"
import { AccountStorage } from "./accountStorage"

export class AutoStorage{
    isAccount:boolean = false

    realStorage:LocalForage|NodeStorage|OpfsStorage|AccountStorage

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
    async keys():Promise<string[]>{
        await this.Init()
        return await this.realStorage.keys()

    }
    async removeItem(key:string){
        await this.Init()
        return await this.realStorage.removeItem(key)
    }

    checkAccountSync(){
        let db = get(DataBase)
        if(db.account?.useSync){
            console.log("using account storage")
            sessionStorage.setItem('fallbackRisuToken',db.account?.token)
            this.realStorage = new AccountStorage()
            this.isAccount = true
            return true
        }
        return false
    }

    private async Init(){
        if(!this.realStorage){
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
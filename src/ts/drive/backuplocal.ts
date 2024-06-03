import { BaseDirectory, readBinaryFile, readDir, writeBinaryFile } from "@tauri-apps/api/fs";
import { alertError, alertNormal, alertStore, alertWait } from "../alert";
import { LocalWriter, forageStorage, isTauri } from "../storage/globalApi";
import { decodeRisuSave, encodeRisuSave } from "../storage/risuSave";
import { get } from "svelte/store";
import { DataBase } from "../storage/database";
import { save } from "@tauri-apps/api/dialog";
import { relaunch } from "@tauri-apps/api/process";
import { sleep } from "../util";
import { hubURL } from "../characterCards";

function getBasename(data:string){
    const baseNameRegex = /\\/g
    const splited = data.replace(baseNameRegex, '/').split('/')
    const lasts = splited[splited.length-1]
    return lasts
}


export async function SaveLocalBackup(){
    alertWait("Saving local backup...")
    const writer = new LocalWriter()
    const r = await writer.init()
    if(!r){
        alertError('Failed')
        return
    }

    //check backup data is corrupted
    const corrupted = await fetch(hubURL + '/backupcheck', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(get(DataBase)),
    })
    if(corrupted.status === 400){
        alertError('Failed, Backup data is corrupted')
        return
    }
    

    if(isTauri){
        const assets = await readDir('assets', {dir: BaseDirectory.AppData})
        let i = 0;
        for(let asset of assets){
            i += 1;
            alertWait(`Saving local Backup... (${i} / ${assets.length})`)
            const key = asset.name
            if(!key || !key.endsWith('.png')){
                continue
            }
            await writer.writeBackup(key, await readBinaryFile(asset.path))
        }
    }
    else{
        const keys = await forageStorage.keys()

        for(let i=0;i<keys.length;i++){
            alertWait(`Saving local Backup... (${i} / ${keys.length})`)

            const key = keys[i]
            if(!key || !key.endsWith('.png')){
                continue
            }
            await writer.writeBackup(key, await forageStorage.getItem(key))
            if(forageStorage.isAccount){
                await sleep(1000)
            }
        }
    }

    const dbData = encodeRisuSave(get(DataBase), 'compression')

    alertWait(`Saving local Backup... (Saving database)`)

    await writer.writeBackup('database.risudat', dbData)

    alertNormal('Success')

    await writer.close()
}

export async function LoadLocalBackup(){
    //select file
    try {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.bin'
        input.onchange = async () => {
            if(!input.files || input.files.length === 0){
                input.remove()
                return
            }
            const file = input.files[0]
            const reader = new FileReader()
            input.remove()
            reader.onload = async () => {
                const buffer = reader.result as ArrayBuffer
                const bufferLength = buffer.byteLength
                for(let i=0;i<bufferLength;){
                    const progress = (i / bufferLength * 100).toFixed(2)
                    alertWait(`Loading local Backup... (${progress}%)`)
                    
                    const nameLength = new Uint32Array(buffer.slice(i, i+4))[0]
                    i += 4
                    const name = new TextDecoder().decode(new Uint8Array(buffer.slice(i, i+nameLength)))
                    i += nameLength
                    const dataLength = new Uint32Array(buffer.slice(i, i+4))[0]
                    i += 4
                    const data = new Uint8Array(buffer.slice(i, i+dataLength))
                    i += dataLength
                    if(name === 'database.risudat'){
                        const db = new Uint8Array(data)
                        const dbData = await decodeRisuSave(db)
                        DataBase.set(dbData)
                        if(isTauri){
                            await writeBinaryFile('database/database.bin', db, {dir: BaseDirectory.AppData})
                            relaunch()
                            alertStore.set({
                                type: "wait",
                                msg: "Success, Refreshing your app."
                            })
                        }
                        else{
                            await forageStorage.setItem('database/database.bin', db)
                            location.search = ''
                            alertStore.set({
                                type: "wait",
                                msg: "Success, Refreshing your app."
                            })
                        }
                        continue
                    }
                    if(isTauri){
                        await writeBinaryFile(`assets/` + name, data ,{dir: BaseDirectory.AppData})
                    }
                    else{
                        await forageStorage.setItem('assets/' + name, data)
                    }
                    await sleep(10)
                    if(forageStorage.isAccount){
                        await sleep(1000)
                    }
                }
            }
            reader.readAsArrayBuffer(file)
        }
    
        input.click()   
    } catch (error) {
        console.error(error)
        alertError('Failed, Is file corrupted?')
    }
}
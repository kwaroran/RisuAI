import { BaseDirectory, readFile, readDir, writeFile } from "@tauri-apps/plugin-fs";
import { alertError, alertNormal, alertStore, alertWait } from "../alert";
import { LocalWriter, forageStorage, isTauri } from "../globalApi.svelte";
import { decodeRisuSave, encodeRisuSaveLegacy } from "../storage/risuSave";
import { getDatabase, setDatabaseLite } from "../storage/database.svelte";
import { relaunch } from "@tauri-apps/plugin-process";
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
        body: JSON.stringify(getDatabase()),
    })
    if(corrupted.status === 400){
        alertError('Failed, Backup data is corrupted')
        return
    }

    if(isTauri){
        const assets = await readDir('assets', {baseDir: BaseDirectory.AppData})
        let i = 0;
        for(let asset of assets){
            i += 1;
            alertWait(`Saving local Backup... (${i} / ${assets.length})`)
            const key = asset.name
            if(!key || !key.endsWith('.png')){
                continue
            }
            await writer.writeBackup(key, await readFile('assets/' + asset.name, {baseDir: BaseDirectory.AppData}))
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
            await writer.writeBackup(key, await forageStorage.getItem(key) as unknown as Uint8Array)
            if(forageStorage.isAccount){
                await sleep(1000)
            }
        }
    }

    const dbData = encodeRisuSaveLegacy(getDatabase(), 'compression')

    alertWait(`Saving local Backup... (Saving database)`)

    await writer.writeBackup('database.risudat', dbData)

    alertNormal('Success')

    await writer.close()
}

export async function LoadLocalBackup(){
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.bin';
        input.onchange = async () => {
            if (!input.files || input.files.length === 0) {
                input.remove();
                return;
            }
            const file = input.files[0];
            input.remove();

            const reader = file.stream().getReader();
            const CHUNK_SIZE = 1024 * 1024; // 1MB chunk size
            let bytesRead = 0;
            let remainingBuffer = new Uint8Array();

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                bytesRead += value.length;
                const progress = ((bytesRead / file.size) * 100).toFixed(2);
                alertWait(`Loading local Backup... (${progress}%)`);

                const newBuffer = new Uint8Array(remainingBuffer.length + value.length);
                newBuffer.set(remainingBuffer);
                newBuffer.set(value, remainingBuffer.length);
                remainingBuffer = newBuffer;

                let offset = 0;
                while (offset + 4 <= remainingBuffer.length) {
                    const nameLength = new Uint32Array(remainingBuffer.slice(offset, offset + 4).buffer)[0];

                    if (offset + 4 + nameLength > remainingBuffer.length) {
                        break;
                    }
                    const nameBuffer = remainingBuffer.slice(offset + 4, offset + 4 + nameLength);
                    const name = new TextDecoder().decode(nameBuffer);

                    if (offset + 4 + nameLength + 4 > remainingBuffer.length) {
                        break;
                    }
                    const dataLength = new Uint32Array(remainingBuffer.slice(offset + 4 + nameLength, offset + 4 + nameLength + 4).buffer)[0];

                    if (offset + 4 + nameLength + 4 + dataLength > remainingBuffer.length) {
                        break;
                    }
                    const data = remainingBuffer.slice(offset + 4 + nameLength + 4, offset + 4 + nameLength + 4 + dataLength);

                    if (name === 'database.risudat') {
                        const db = new Uint8Array(data);
                        const dbData = await decodeRisuSave(db);
                        setDatabaseLite(dbData);
                        if (isTauri) {
                            await writeFile('database/database.bin', db, { baseDir: BaseDirectory.AppData });
                            await relaunch();
                            alertStore.set({
                                type: "wait",
                                msg: "Success, Refreshing your app."
                            });
                        } else {
                            await forageStorage.setItem('database/database.bin', db);
                            location.search = '';
                            alertStore.set({
                                type: "wait",
                                msg: "Success, Refreshing your app."
                            });
                        }
                    } else {
                        if (isTauri) {
                            await writeFile(`assets/` + name, data, { baseDir: BaseDirectory.AppData });
                        } else {
                            await forageStorage.setItem('assets/' + name, data);
                        }
                    }
                    await sleep(10);
                    if (forageStorage.isAccount) {
                        await sleep(1000);
                    }

                    offset += 4 + nameLength + 4 + dataLength;
                }
                remainingBuffer = remainingBuffer.slice(offset);
            }

            alertNormal('Success');
        };

        input.click();
    } catch (error) {
        console.error(error);
        alertError('Failed, Is file corrupted?')
    }
}
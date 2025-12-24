import { alertError, alertInput, alertNormal, alertSelect, alertStore } from "../alert";
import { getDatabase, type Database } from "../storage/database.svelte";
import { forageStorage, getUnpargeables, isTauri, openURL } from "../globalApi.svelte";
import { BaseDirectory, exists, readFile, readDir, writeFile } from "@tauri-apps/plugin-fs";
import { language } from "../../lang";
import { relaunch } from '@tauri-apps/plugin-process';
import { sleep } from "../util";
import { hubURL } from "../characterCards";
import { decodeRisuSave, encodeRisuSaveLegacy } from "../storage/risuSave";

export async function checkDriver(type:'save'|'load'|'loadtauri'|'savetauri'|'reftoken'){
    const CLIENT_ID = '580075990041-l26k2d3c0nemmqiu3d3aag01npfrkn76.apps.googleusercontent.com';
    const REDIRECT_URI = type === 'reftoken' ? 'https://sv.risuai.xyz/drive' : "https://risuai.xyz/"
    const SCOPE = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata';
    const encodedRedirectUri = encodeURIComponent(REDIRECT_URI);
    const authorizationUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodedRedirectUri}&scope=${SCOPE}&response_type=code&state=${type}`;
    

    if(type === 'reftoken'){
        const authorizationUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodedRedirectUri}&scope=${SCOPE}&response_type=code&state=${"accesstauri"}&access_type=offline&prompt=consent`;
        return authorizationUrl
    }

    if(type === 'save' || type === 'load'){
        location.href = (authorizationUrl);
    }
    else{
        
        try {
            if(isTauri){
                openURL(authorizationUrl)
            }
            else{
                window.open(authorizationUrl)
            }
            let code = await alertInput(language.pasteAuthCode)
            if(code.includes(' ')){
                code = code.substring(code.lastIndexOf(' ')).trim()
            }
            if(type === 'loadtauri'){
                await loadDrive(code, 'backup')
            }
            else{
                await backupDrive(code)
            }
        } catch (error) {
            console.error(error)
            alertError(`Backup Error: ${error}`)
        }
    }
}


export async function checkDriverInit() {
    try {
        const loc = new URLSearchParams(location.search)
        const code = loc.get('code')
    
        if(code){
            const res = await fetch(`/drive?code=${encodeURIComponent(code)}`)
            if(res.status >= 200 && res.status < 300){
                const json:{
                    access_token:string,
                    expires_in:number
                } = await res.json()
                const da = loc.get('state')
                if(da === 'save'){
                    await backupDrive(json.access_token)
                }
                else if(da === 'load'){
                    await loadDrive(json.access_token, 'backup')
                }
                else if(da === 'savetauri' || da === 'loadtauri'){
                    alertStore.set({
                        type: 'wait2',
                        msg: `Copy and paste this Auth Code: ${json.access_token}`
                    })
                }
                else if(da === 'accesstauri'){
                    alertStore.set({
                        type: 'wait2',
                        msg: JSON.stringify(json)
                    })
                }
            }
            else{
                alertError(await res.text())
                location.search = ''
            }
            return true
        }
        else{
            return false
        }   
    } catch (error) {
        console.error(error)
        alertError(`Backup Error: ${error}`)
        const currentURL = new URL(location.href)
        currentURL.search = ''
        window.history.replaceState( {} , "", currentURL.href );
        await sleep(100000)
        return false
    }
}

let lastSaved:number = parseInt(localStorage.getItem('risu_lastsaved') ?? '-1')
let BackupDb:Database = null


export async function syncDrive() {
    BackupDb = safeStructuredClone(getDatabase())
    return
}


async function backupDrive(ACCESS_TOKEN:string) {
    alertStore.set({
        type: "wait",
        msg: "Uploading Backup..."
    })

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

    const files:DriveFile[] = await getFilesInFolder(ACCESS_TOKEN)

    const fileNames = files.map((d) => {
        return d.name
    })

    if(isTauri){
        const assets = await readDir('assets', {baseDir: BaseDirectory.AppData})
        let i = 0;
        for(let asset of assets){
            i += 1;
            alertStore.set({
                type: "wait",
                msg: `Uploading Backup... (${i} / ${assets.length})`
            })
            const key = asset.name
            if(!key || !key.endsWith('.png')){
                continue
            }
            const formatedKey = newFormatKeys(key)
            if(!fileNames.includes(formatedKey)){
                await createFileInFolder(ACCESS_TOKEN, formatedKey, await readFile('assets/' + asset.name, {baseDir: BaseDirectory.AppData}))
            }
        }
    }
    else{
        const keys = await forageStorage.keys()

        for(let i=0;i<keys.length;i++){
            alertStore.set({
                type: "wait",
                msg: `Uploading Backup... (${i} / ${keys.length})`
            })
            const key = keys[i]
            if(!key.endsWith('.png')){
                continue
            }
            const formatedKey = newFormatKeys(key)
            if(!fileNames.includes(formatedKey)){
                await createFileInFolder(ACCESS_TOKEN, formatedKey, await forageStorage.getItem(key) as unknown as Uint8Array)
            }
        }
    }

    const dbData = encodeRisuSaveLegacy(getDatabase(), 'compression')

    alertStore.set({
        type: "wait",
        msg: `Uploading Backup... (Saving database)`
    })

    await createFileInFolder(ACCESS_TOKEN, `${(Date.now() / 1000).toFixed(0)}-database.risudat`, dbData)


    alertNormal('Success')
}

type DriveFile = {
    mimeType:string
    name:string
    id: string
}

async function loadDrive(ACCESS_TOKEN:string, mode: 'backup'|'sync'):Promise<void|"noSync"> {
    if(mode === 'backup'){
        alertStore.set({
            type: "wait",
            msg: "Loading Backup..."
        })
    }
    const files:DriveFile[] = await getFilesInFolder(ACCESS_TOKEN)
    let foragekeys:string[] = []
    let loadedForageKeys = false
    let db = getDatabase()

    async function checkImageExists(images:string) {
        if(db?.account?.useSync){
            return false
        }
        if(isTauri){
            return await exists(`assets/` + images, {baseDir: BaseDirectory.AppData})
        }
        else{
            if(!loadedForageKeys){
                foragekeys = await forageStorage.keys()
                loadedForageKeys = true
            }
            return foragekeys.includes('assets/' + images)
        }
    }
    const fileNames = files.map((d) => {
        return d.name
    })


    let dbs:[DriveFile,number][] = []
    let noSyncData = true

    if(mode === 'backup'){
        for(const f of files){
            if(f.name.endsWith("-database.risudat")){
                const tm = parseInt(f.name.split('-')[0])
                if(isNaN(tm)){
                    continue
                }
                else{
                    dbs.push([f,tm])
                }
            }
        }
        dbs.sort((a,b) => {
            return b[1] - a[1]
        })
    }
    else if(mode === 'sync'){
        for(const f of files){
            if(f.name.endsWith("-database.risudat2")){
                const tm = parseInt(f.name.split('-')[0])
                if(isNaN(tm)){
                    continue
                }
                else{
                    if(tm > lastSaved){
                        dbs.push([f,tm])
                    }
                    noSyncData = false
                }
            }
        }
        dbs.sort((a,b) => {
            return b[1] - a[1]
        })
    }

    if(noSyncData && mode === 'sync'){
        return 'noSync'
    }

    if(dbs.length !== 0){
        if(mode === 'sync'){
            alertStore.set({
                type: "wait",
                msg: "Sync Data..."
            })
        }
        async function getDbFromList(){
            let selectables:string[] = []
            for(let i=0;i<dbs.length;i++){
                selectables.push(`Backup saved in ${(new Date(dbs[i][1] * 1000)).toLocaleString()}`)
                if(selectables.length > 7){
                    break
                }
            }
            const selectedIndex = (await alertSelect([language.loadLatest, language.loadOthers]) === '0') ? 0 : parseInt(await alertSelect(selectables))
            const selectedDb = dbs[selectedIndex][0]
            const decompressedDb:Database = await decodeRisuSave(await getFileData(ACCESS_TOKEN, selectedDb.id))
            return decompressedDb
        }
    
        const db:Database = mode === 'backup' ? await getDbFromList() : JSON.parse(Buffer.from(await getFileData(ACCESS_TOKEN, dbs[0][0].id)).toString('utf-8'))
        lastSaved = Date.now()
        localStorage.setItem('risu_lastsaved', `${lastSaved}`)
        const requiredImages = (getUnpargeables(db))
        let ind = 0;
        let errorLogs:string[] = []
        for(const images of requiredImages){
            ind += 1
            for(let tries=0;tries<3;tries++){
                const formatedImage = tries === 0 ? newFormatKeys(images) : formatKeys(images)
                if(mode === 'sync'){
                    alertStore.set({
                        type: "wait",
                        msg: `Sync Files... (${ind} / ${requiredImages.length})`
                    })
                }
                else{
                    alertStore.set({
                        type: "wait",
                        msg: `Loading Backup... (${ind} / ${requiredImages.length})`
                    })
                }
                if(await checkImageExists(images)){
                    //skip process
                }
                else{
                    if(formatedImage.length >= 7){
                        if(fileNames.includes(formatedImage)){
                            for(const file of files){
                                if(file.name === formatedImage){
                                    const fData = await getFileData(ACCESS_TOKEN, file.id)
                                    if(isTauri){
                                        await writeFile(`assets/` + images, fData ,{baseDir: BaseDirectory.AppData})
        
                                    }
                                    else{
                                        await forageStorage.setItem('assets/' + images, fData)
                                    }
                                    tries = 3
                                }
                            }
                        }
                        else{
                            alertStore.set({
                                type: "wait",
                                msg: `Loading Backup... (${ind} / ${requiredImages.length}) (Error in ${formatedImage})`
                            })
                            await sleep(1000)
                        }
                    }
                }
            }
        }
        db.didFirstSetup = true
        const dbData = encodeRisuSaveLegacy(db, 'compression')

        if(isTauri){
            await writeFile('database/database.bin', dbData, {baseDir: BaseDirectory.AppData})
            relaunch()
            alertStore.set({
                type: "wait",
                msg: "Success, Refreshing your app."
            })
        }
        else{
            await forageStorage.setItem('database/database.bin', dbData)
            location.search = ''
            alertStore.set({
                type: "wait",
                msg: "Success, Refreshing your app."
            })
        }
    }
    else if(mode === 'backup'){
        location.search = ''
    }
}

function checkImageExist(image:string){

}


function formatKeys(name:string) {
    return getBasename(name).replace(/\_/g, '__').replace(/\./g,'_d').replace(/\//,'_s') + '.png'
}

function newFormatKeys(name:string) {
    let n = getBasename(name)
    const bf = Buffer.from(n).toString('hex')
    return n + '.bin'
}

async function getFilesInFolder(ACCESS_TOKEN:string, nextPageToken=''): Promise<DriveFile[]> {
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&pageSize=300` + nextPageToken;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
    });
    
    if (response.ok) {
        const data = await response.json();
        if(data.nextPageToken){
            return (data.files as DriveFile[]).concat(await getFilesInFolder(ACCESS_TOKEN, `&pageToken=${data.nextPageToken}`))
        }
        return data.files as DriveFile[];
    } else {
        throw(`Error: ${response.status}`);
    }
}

async function createFileInFolder(accessToken:string, fileName:string, content:Uint8Array, mimeType = 'application/octet-stream') {
    const metadata = {
      name: fileName,
      mimeType: mimeType,
      parents: ["appDataFolder"],
    };
  
    const body = new FormData();
    body.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    body.append("file", new Blob([content as any], { type: mimeType }));
  
    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: body,
      }
    );
  
    const result = await response.json();
  
    if (response.ok) {
      return result;
    } else {
      console.error("Error creating file:", result);
      throw new Error(result.error.message);
    }
}
  
const baseNameRegex = /\\/g
function getBasename(data:string){
    const splited = data.replace(baseNameRegex, '/').split('/')
    const lasts = splited[splited.length-1]
    return lasts
}

async function getFileData(ACCESS_TOKEN:string,fileId:string) {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  
    const request = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`
      }
    };
  
    const response = await fetch(url, request);
  
    if (response.ok) {
      const data = new Uint8Array(await response.arrayBuffer());
      return data;
    } else {
        throw "Error in response when reading files in folder"
    }
  }
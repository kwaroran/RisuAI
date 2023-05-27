import { get } from "svelte/store";
import { alertError, alertInput, alertNormal, alertSelect, alertStore } from "../alert";
import { DataBase, setDatabase, type Database } from "../storage/database";
import { forageStorage, getUnpargeables, isNodeServer, isTauri, openURL } from "../storage/globalApi";
import pako from "pako";
import { BaseDirectory, exists, readBinaryFile, readDir, writeBinaryFile } from "@tauri-apps/api/fs";
import { language } from "../../lang";
import { relaunch } from '@tauri-apps/api/process';
import { open } from '@tauri-apps/api/shell';

export async function checkDriver(type:'save'|'load'|'loadtauri'|'savetauri'|'reftoken'){
    const CLIENT_ID = '580075990041-l26k2d3c0nemmqiu3d3aag01npfrkn76.apps.googleusercontent.com';
    const REDIRECT_URI = (isTauri || isNodeServer) ? "https://risuai.xyz/" : `https://${location.host}/`
    const SCOPE = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata';
    const encodedRedirectUri = encodeURIComponent(REDIRECT_URI);
    const authorizationUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodedRedirectUri}&scope=${SCOPE}&response_type=code&state=${type}`;
    

    if(type === 'reftoken'){
        const authorizationUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodedRedirectUri}&scope=${SCOPE}&response_type=code&state=${"accesstauri"}&access_type=offline&prompt=consent`;
        openURL(authorizationUrl)
        return
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
                await loadDrive(code)
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
                    await loadDrive(json.access_token)
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
        location.search = ''
        console.error(error)
        alertError(`Backup Error: ${error}`)
        return false
    }
}




async function backupDrive(ACCESS_TOKEN:string) {
    alertStore.set({
        type: "wait",
        msg: "Uploading Backup..."
    })

    const files:DriveFile[] = await getFilesInFolder(ACCESS_TOKEN)

    const fileNames = files.map((d) => {
        return d.name
    })

    if(isTauri){
        const assets = await readDir('assets', {dir: BaseDirectory.AppData})
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
            const formatedKey = formatKeys(key)
            if(!fileNames.includes(formatedKey)){
                await createFileInFolder(ACCESS_TOKEN, formatedKey, await readBinaryFile(asset.path))
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
            const formatedKey = formatKeys(key)
            if(!fileNames.includes(formatedKey)){
                await createFileInFolder(ACCESS_TOKEN, formatedKey, await forageStorage.getItem(key))
            }
        }
    }

    const dbjson = JSON.stringify(get(DataBase))
    const dbData = pako.deflate(
        Buffer.from(dbjson, 'utf-8')
    )

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

async function loadDrive(ACCESS_TOKEN:string) {
    alertStore.set({
        type: "wait",
        msg: "Loading Backup..."
    })
    const files:DriveFile[] = await getFilesInFolder(ACCESS_TOKEN)
    let foragekeys:string[] = []
    let loadedForageKeys = false

    async function checkImageExists(images:string) {
        if(isTauri){
            return await exists(`assets/` + images, {dir: BaseDirectory.AppData})
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

    if(dbs.length !== 0){
        let selectables:string[] = []
        for(let i=0;i<dbs.length;i++){
            selectables.push(`Backup saved in ${(new Date(dbs[i][1] * 1000)).toLocaleString()}`)
            if(selectables.length > 7){
                break
            }
        }
        const selectedIndex = (await alertSelect([language.loadLatest, language.loadOthers]) === '0') ? 0 : parseInt(await alertSelect(selectables))
        const selectedDb = dbs[selectedIndex][0]
        
        const db:Database = JSON.parse(Buffer.from(pako.inflate(await getFileData(ACCESS_TOKEN, selectedDb.id))).toString('utf-8'))
        const requiredImages = (getUnpargeables(db))
        let ind = 0;
        for(const images of requiredImages){
            ind += 1
            const formatedImage = formatKeys(images)
            alertStore.set({
                type: "wait",
                msg: `Loading Backup... (${ind} / ${requiredImages.length})`
            })
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
                                    await writeBinaryFile(`assets/` + images, fData ,{dir: BaseDirectory.AppData})
    
                                }
                                else{
                                    await forageStorage.setItem('assets/' + images, fData)
                                }
                            }
                        }
                    }
                    else{
                        throw `cannot find file in drive: ${formatedImage}`
                    }
                }
            }
        }
        db.didFirstSetup = true
        const dbjson = JSON.stringify(db)
        const dbData = pako.deflate(
            Buffer.from(dbjson, 'utf-8')
        )

        if(isTauri){
            await writeBinaryFile('database/database.bin', dbData, {dir: BaseDirectory.AppData})
            relaunch()
            alertStore.set({
                type: "wait",
                msg: "Success, Refresh your app."
            })
        }
        else{
            await forageStorage.setItem('database/database.bin', dbData)
            location.search = ''
            alertStore.set({
                type: "wait",
                msg: "Success, Refresh your app."
            })
        }
    }
    else{
        location.search = ''
    }
}

function checkImageExist(image:string){

}


function formatKeys(name:string) {
    return getBasename(name).replace(/\_/g, '__').replace(/\./g,'_d').replace(/\//,'_s') + '.png'
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
    body.append("file", new Blob([content], { type: mimeType }));
  
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
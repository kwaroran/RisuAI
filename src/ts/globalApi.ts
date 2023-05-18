import { writeBinaryFile,BaseDirectory, readBinaryFile, exists, createDir, readDir, removeFile } from "@tauri-apps/api/fs"
import { changeFullscreen, checkNullish, findCharacterbyId, sleep } from "./util"
import localforage from 'localforage'
import { convertFileSrc, invoke } from "@tauri-apps/api/tauri"
import { v4 as uuidv4 } from 'uuid';
import { appDataDir, join } from "@tauri-apps/api/path";
import { get } from "svelte/store";
import { DataBase, loadedStore, setDatabase, type Database, updateTextTheme, defaultSdDataFunc } from "./database";
import pako from "pako";
import { appWindow } from "@tauri-apps/api/window";
import { checkOldDomain, checkUpdate } from "./update";
import { selectedCharID } from "./stores";
import { Body, ResponseType, fetch as TauriFetch } from "@tauri-apps/api/http";
import { loadPlugins } from "./process/plugins";
import { alertError, alertStore } from "./alert";
import { checkDriverInit } from "./drive/drive";
import { hasher } from "./parser";
import { characterHubImport } from "./characterCards";

//@ts-ignore
export const isTauri = !!window.__TAURI__
export const forageStorage = localforage.createInstance({
    name: "risuai"
})

interface fetchLog{
    body:string
    header:string
    response:string
    success:boolean,
    date:string
    url:string
}

let fetchLog:fetchLog[] = []

export async function downloadFile(name:string, data:Uint8Array) {
    const downloadURL = (data:string, fileName:string) => {
        const a = document.createElement('a')
        a.href = data
        a.download = fileName
        document.body.appendChild(a)
        a.style.display = 'none'
        a.click()
        a.remove()
    }

    if(isTauri){
        await writeBinaryFile(name, data, {dir: BaseDirectory.Download})
    }
    else{
        downloadURL(`data:png/image;base64,${Buffer.from(data).toString('base64')}`, name)
    }
}

let fileCache:{
    origin: string[], res:(Uint8Array|'loading'|'done')[]
} = {
    origin: [],
    res: []
}

let pathCache:{[key:string]:string} = {}
let checkedPaths:string[] = []

export async function getFileSrc(loc:string) {
    if(isTauri){
        if(loc.startsWith('assets')){
            if(appDataDirPath === ''){
                appDataDirPath = await appDataDir();
            }
            const cached = pathCache[loc]
            if(cached){
                return convertFileSrc(cached)
            }
            else{
                const joined = await join(appDataDirPath,loc)
                pathCache[loc] = joined
                return convertFileSrc(joined)
            }
        }
        return convertFileSrc(loc)
    }
    try {
        if(usingSw){
            const encoded = Buffer.from(loc,'utf-8').toString('hex')
            let ind = fileCache.origin.indexOf(loc)
            if(ind === -1){
                ind = fileCache.origin.length 
                fileCache.origin.push(loc)
                fileCache.res.push('loading')
                try {
                    const hasCache:boolean = (await (await fetch("/sw/check/" + encoded)).json()).able
                    if(hasCache){
                        fileCache.res[ind] = 'done'
                        return "/sw/img/" + encoded
                    }
                    else{
                        const f:Uint8Array = await forageStorage.getItem(loc)
                        await fetch("/sw/register/" + encoded, {
                            method: "POST",
                            body: f 
                        })
                        fileCache.res[ind] = 'done'
                        await sleep(10)
                    }
                    return "/sw/img/" + encoded   
                } catch (error) {

                }
            }
            else{
                const f = fileCache.res[ind]
                if(f === 'loading'){
                    while(fileCache.res[ind] === 'loading'){
                        await sleep(10)
                    }
                }
                return "/sw/img/" + encoded
            }
        }
        else{
            let ind = fileCache.origin.indexOf(loc)
            if(ind === -1){
                ind = fileCache.origin.length 
                fileCache.origin.push(loc)
                fileCache.res.push('loading')
                const f:Uint8Array = await forageStorage.getItem(loc)
                fileCache.res[ind] = f
                return `data:image/png;base64,${Buffer.from(f).toString('base64')}`  
            }
            else{
                const f = fileCache.res[ind]
                if(f === 'loading'){
                    while(fileCache.res[ind] === 'loading'){
                        await sleep(10)
                    }
                    return `data:image/png;base64,${Buffer.from(fileCache.res[ind]).toString('base64')}`  
                }
                return `data:image/png;base64,${Buffer.from(f).toString('base64')}`  
            }
        }
    } catch (error) {
        console.error(error)
        return ''
    }
}

let appDataDirPath = ''

export async function readImage(data:string) {
    if(isTauri){
        if(data.startsWith('assets')){
            if(appDataDirPath === ''){
                appDataDirPath = await appDataDir();
            }
            return await readBinaryFile(await join(appDataDirPath,data))
        }
        return await readBinaryFile(data)
    }
    else{
        return (await forageStorage.getItem(data) as Uint8Array)
    }
}

export async function saveAsset(data:Uint8Array, customId:string = ''){
    let id = ''
    if(customId !== ''){
        id = customId
    }
    else{
        try {
            id = await hasher(data)
        } catch (error) {
            id = uuidv4()
        }
    }
    if(isTauri){
        await writeBinaryFile(`assets/${id}.png`, data ,{dir: BaseDirectory.AppData})
        return `assets/${id}.png`
    }
    else{
        await forageStorage.setItem(`assets/${id}.png`, data)
        return `assets/${id}.png`
    }
}

let lastSave = ''

export async function saveDb(){
    lastSave =JSON.stringify(get(DataBase))
    while(true){
        const dbjson = JSON.stringify(get(DataBase))
        if(dbjson !== lastSave){
            lastSave = dbjson
            const dbData = pako.deflate(
                Buffer.from(dbjson, 'utf-8')
            )
            if(isTauri){
                await writeBinaryFile('database/database.bin', dbData, {dir: BaseDirectory.AppData})
            }
            else{
                await forageStorage.setItem('database/database.bin', dbData)
            }
            console.log('saved')
        }

        await sleep(500)
    }
}

let usingSw = false

export async function loadData() {
    const loaded = get(loadedStore)
    if(!loaded){
        try {
            if(isTauri){
                appWindow.maximize()
                if(!await exists('', {dir: BaseDirectory.AppData})){
                    await createDir('', {dir: BaseDirectory.AppData})
                }
                if(!await exists('database', {dir: BaseDirectory.AppData})){
                    await createDir('database', {dir: BaseDirectory.AppData})
                }
                if(!await exists('assets', {dir: BaseDirectory.AppData})){
                    await createDir('assets', {dir: BaseDirectory.AppData})
                }
                if(!await exists('database/database.bin', {dir: BaseDirectory.AppData})){
                    await writeBinaryFile('database/database.bin',
                        pako.deflate(Buffer.from(JSON.stringify({}), 'utf-8'))
                    ,{dir: BaseDirectory.AppData})
                }
                setDatabase(
                    JSON.parse(Buffer.from(pako.inflate(Buffer.from(await readBinaryFile('database/database.bin',{dir: BaseDirectory.AppData})))).toString('utf-8'))
                )
                await checkUpdate()
                await changeFullscreen()
    
            }
            else{
                let gotStorage:Uint8Array = await forageStorage.getItem('database/database.bin')
                if(checkNullish(gotStorage)){
                    gotStorage = pako.deflate(Buffer.from(JSON.stringify({}), 'utf-8'))
                    await forageStorage.setItem('database/database.bin', gotStorage)
                }
                setDatabase(
                    JSON.parse(Buffer.from(pako.inflate(Buffer.from(gotStorage))).toString('utf-8'))
                )
                const isDriverMode = await checkDriverInit()
                if(isDriverMode){
                    return
                }
                if(navigator.serviceWorker){
                    usingSw = true
                    await navigator.serviceWorker.register("/sw.js", {
                        scope: "/"
                    });

                    await sleep(100)
                    const da = await fetch('/sw/init')
                    if(!(da.status >= 200 && da.status < 300)){
                        location.reload()
                    }
                }
                else{
                    usingSw = false
                }
                checkOldDomain()
                if(get(DataBase).didFirstSetup){
                    characterHubImport()
                }
            }
            try {
                await pargeChunks()
            } catch (error) {}
            try {
                await loadPlugins()            
            } catch (error) {}
            await checkNewFormat()
            updateTextTheme()
            loadedStore.set(true)
            selectedCharID.set(-1)
            saveDb()   
        } catch (error) {
            alertError(`${error}`)
        }
    }
}

const knownHostes = ["localhost","172.0.0.1"]

export async function globalFetch(url:string, arg:{body?:any,headers?:{[key:string]:string}, rawResponse?:boolean, method?:"POST"|"GET"}) {
    try {
        const db = get(DataBase)
        const method = arg.method ?? "POST"
    
        function addFetchLog(response:any, success:boolean){
            try{
                fetchLog.unshift({
                    body: JSON.stringify(arg.body, null, 2),
                    header: JSON.stringify(arg.headers ?? {}, null, 2),
                    response: JSON.stringify(response, null, 2),
                    success: success,
                    date: (new Date()).toLocaleTimeString(),
                    url: url
                })
            }
            catch{
                fetchLog.unshift({
                    body: JSON.stringify(arg.body, null, 2),
                    header: JSON.stringify(arg.headers ?? {}, null, 2),
                    response: `${response}`,
                    success: success,
                    date: (new Date()).toLocaleTimeString(),
                    url: url
                })
            }
        }
    
        const urlHost = (new URL(url)).hostname
        let forcePlainFetch = knownHostes.includes(urlHost) && (!isTauri)
    
        if(db.requestmet === 'plain' || forcePlainFetch){
            try {
                let headers = arg.headers ?? {}
                if(!headers["Content-Type"]){
                    headers["Content-Type"] =  `application/json`
                }
                const furl = new URL(url)
    
                const da = await fetch(furl, {
                    body: JSON.stringify(arg.body),
                    headers: arg.headers,
                    method: method
                })
    
                if(arg.rawResponse){
                    addFetchLog("Uint8Array Response", da.ok)
                    return {
                        ok: da.ok,
                        data: new Uint8Array(await da.arrayBuffer())
                    }   
                }
                else{
                    const dat = await da.json()
                    addFetchLog(dat, da.ok)
                    return {
                        ok: da.ok,
                        data: dat
                    }
                }
    
            } catch (error) {
                return {
                    ok: false,
                    data: `${error}`,
                }
            }
        }
        if(db.requestmet === 'proxy'){
            try {
                let headers = arg.headers ?? {}
                if(!headers["Content-Type"]){
                    headers["Content-Type"] =  `application/json`
                }
                const furl = new URL(db.requestproxy)
                furl.pathname = url
    
                const da = await fetch(furl, {
                    body: JSON.stringify(arg.body),
                    headers: arg.headers,
                    method: method
                })
    
                if(arg.rawResponse){
                    addFetchLog("Uint8Array Response", da.ok)
                    return {
                        ok: da.ok,
                        data: new Uint8Array(await da.arrayBuffer())
                    }   
                }
                else{
                    const dat = await da.json()
                    addFetchLog(dat, da.ok)
                    return {
                        ok: da.ok,
                        data: dat
                    }
                }
    
            } catch (error) {
                return {
                    ok: false,
                    data: `${error}`,
                }
            }
        }
        if(isTauri){
            if(db.requester === 'new'){
                try {
                    let preHeader = arg.headers ?? {}
                    preHeader["Content-Type"] = `application/json`
                    const body = JSON.stringify(arg.body)
                    const header = JSON.stringify(preHeader)
                    const res:string = await invoke('native_request', {url:url, body:body, header:header, method: method})
                    const d:{
                        success: boolean
                        body:string
                    } = JSON.parse(res)
                    
                    if(!d.success){
                        addFetchLog(Buffer.from(d.body, 'base64').toString('utf-8'), false)
                        return {
                            ok:false,
                            data: Buffer.from(d.body, 'base64').toString('utf-8')
                        }
                    }
                    else{
                        if(arg.rawResponse){
                            addFetchLog("Uint8Array Response", true)
                            return {
                                ok:true,
                                data: new Uint8Array(Buffer.from(d.body, 'base64'))
                            }
                        }
                        else{
                            addFetchLog(JSON.parse(Buffer.from(d.body, 'base64').toString('utf-8')), true)
                            return {
                                ok:true,
                                data: JSON.parse(Buffer.from(d.body, 'base64').toString('utf-8'))
                            }
                        }
                    }   
                } catch (error) {
                    return {
                        ok: false,
                        data: `${error}`,
                    }
                }
            }
    
            const body = Body.json(arg.body)
            const headers = arg.headers ?? {}
            const d = await TauriFetch(url, {
                body: body,
                method: method,
                headers: headers,
                timeout: {
                    secs: db.timeOut,
                    nanos: 0
                },
                responseType: arg.rawResponse ? ResponseType.Binary : ResponseType.JSON
            })
            if(arg.rawResponse){
                addFetchLog("Uint8Array Response", d.ok)
                return {
                    ok: d.ok,
                    data: new Uint8Array(d.data as number[]),
                }
            }
            else{
                addFetchLog(d.data, d.ok)
                return {
                    ok: d.ok,
                    data: d.data,
                }
            }
        }
        else{
            try {
                let headers = arg.headers ?? {}
                if(!headers["Content-Type"]){
                    headers["Content-Type"] =  `application/json`
                }
                if(arg.rawResponse){
                    const furl = `/proxy?url=${encodeURIComponent(url)}`
                
                    const da = await fetch(furl, {
                        body: JSON.stringify(arg.body),
                        headers: {
                            "risu-header": encodeURIComponent(JSON.stringify(arg.headers))
                        },
                        method: method
                    })
    
                    addFetchLog("Uint8Array Response", da.ok)
                    return {
                        ok: da.ok,
                        data: new Uint8Array(await da.arrayBuffer())
                    }   
                }
                else{
                    const furl = `/proxy?url=${encodeURIComponent(url)}`
    
                    const da = await fetch(furl, {
                        body: JSON.stringify(arg.body),
                        headers: {
                            "risu-header": encodeURIComponent(JSON.stringify(arg.headers))
                        },
                        method: method
                    })
    
                    const dat = await da.json()
                    addFetchLog(dat, da.ok)
                    return {
                        ok: da.ok,
                        data: dat
                    }
                }
            } catch (error) {
                console.log(error)
                return {
                    ok:false,
                    data: `${error}`
                }
            }
        }   
    } catch (error) {
        return {
            ok:false,
            data: `${error}`
        }
    }
}

const re = /\\/g
function getBasename(data:string){
    const splited = data.replace(re, '/').split('/')
    const lasts = splited[splited.length-1]
    return lasts
}

export function getUnpargeables(db:Database) {
    let unpargeable:string[] = []

    function addUnparge(data:string){
        if(!data){
            return
        }
        if(data === ''){
            return
        }
        const bn = getBasename(data)
        if(!unpargeable.includes(bn)){
            unpargeable.push(getBasename(data))
        }
    }

    addUnparge(db.customBackground)
    addUnparge(db.userIcon)

    for(const cha of db.characters){
        if(cha.image){
            addUnparge(cha.image)
        }
        if(cha.emotionImages){
            for(const em of cha.emotionImages){
                addUnparge(em[1])
            }
        }
        if(cha.type !== 'group'){
            if(cha.additionalAssets){
                for(const em of cha.additionalAssets){
                    addUnparge(em[1])
                }
            }
        }
    }
    return unpargeable
}

async function checkNewFormat() {
    let db = get(DataBase)

    if(!db.formatversion){
        function checkParge(data:string){

            if(data.startsWith('assets') || (data.length < 3)){
                return data
            }
            else{
                const d = 'assets/' + (data.replace(/\\/g, '/').split('assets/')[1])
                if(!d){
                    return data
                }
                return d
            }
        }
    
        db.customBackground = checkParge(db.customBackground)
        db.userIcon = checkParge(db.userIcon)
    
        for(let i=0;i<db.characters.length;i++){
            if(db.characters[i].image){
                db.characters[i].image = checkParge(db.characters[i].image)
            }
            if(db.characters[i].emotionImages){
                for(let i2=0;i2<db.characters[i].emotionImages.length;i2++){
                    if(db.characters[i].emotionImages[i2] && db.characters[i].emotionImages[i2].length >= 2){
                        db.characters[i].emotionImages[i2][1] = checkParge(db.characters[i].emotionImages[i2][1])
                    }
                }
            }
        }
    
        db.formatversion = 2
    }
    if(db.formatversion < 3){

        for(let i=0;i<db.characters.length;i++){
            let cha = db.characters[i]
            if(cha.type === 'character'){
                if(checkNullish(cha.sdData)){
                    cha.sdData = defaultSdDataFunc()
                }
            }
        }

        db.formatversion = 3
    }
    setDatabase(db)
}

async function pargeChunks(){
    const db = get(DataBase)

    const unpargeable = getUnpargeables(db)
    if(isTauri){
        const assets = await readDir('assets', {dir: BaseDirectory.AppData})
        for(const asset of assets){
            const n = getBasename(asset.name)
            if(unpargeable.includes(n) || (!n.endsWith('png'))){
            }
            else{
                await removeFile(asset.path)
            }
        }
    }
    else{
        const indexes = await forageStorage.keys()
        for(const asset of indexes){
            const n = getBasename(asset)
            if(unpargeable.includes(n) || (!asset.endsWith(".png"))){
            }
            else{
                await forageStorage.removeItem(asset)
            }
        }
    }
}

export function getRequestLog(){
    let logString = ''
    const b = '\n\`\`\`json\n'
    const bend = '\n\`\`\`\n'

    for(const log of fetchLog){
        logString += `## ${log.date}\n\n* Request URL\n\n${b}${log.url}${bend}\n\n* Request Body\n\n${b}${log.body}${bend}\n\n* Request Header\n\n${b}${log.header}${bend}\n\n`
                    + `* Response Body\n\n${b}${log.response}${bend}\n\n* Response Success\n\n${b}${log.success}${bend}\n\n`
    }
    console.log(logString)
    return logString
}
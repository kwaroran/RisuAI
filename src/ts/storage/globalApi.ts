import { writeBinaryFile,BaseDirectory, readBinaryFile, exists, createDir, readDir, removeFile } from "@tauri-apps/api/fs"
import { changeFullscreen, checkNullish, findCharacterbyId, sleep } from "../util"
import { convertFileSrc, invoke } from "@tauri-apps/api/tauri"
import { v4 as uuidv4 } from 'uuid';
import { appDataDir, join } from "@tauri-apps/api/path";
import { get } from "svelte/store";
import {open} from '@tauri-apps/api/shell'
import { DataBase, loadedStore, setDatabase, type Database, defaultSdDataFunc } from "./database";
import { appWindow } from "@tauri-apps/api/window";
import { checkOldDomain, checkUpdate } from "../update";
import { botMakerMode, selectedCharID } from "../stores";
import { Body, ResponseType, fetch as TauriFetch } from "@tauri-apps/api/http";
import { loadPlugins } from "../plugins/plugins";
import { alertConfirm, alertError } from "../alert";
import { checkDriverInit, syncDrive } from "../drive/drive";
import { hasher } from "../parser";
import { characterURLImport, hubURL } from "../characterCards";
import { cloneDeep } from "lodash";
import { defaultJailbreak, defaultMainPrompt, oldJailbreak, oldMainPrompt } from "./defaultPrompts";
import { loadRisuAccountData } from "../drive/accounter";
import { decodeRisuSave, encodeRisuSave } from "./risuSave";
import { AutoStorage } from "./autoStorage";
import { updateAnimationSpeed } from "../gui/animation";
import { updateColorScheme, updateTextTheme } from "../gui/colorscheme";

//@ts-ignore
export const isTauri = !!window.__TAURI__
//@ts-ignore
export const isNodeServer = !!globalThis.__NODE__
export const forageStorage = new AutoStorage()

interface fetchLog{
    body:string
    header:string
    response:string
    success:boolean,
    date:string
    url:string
}

let fetchLog:fetchLog[] = []

export async function downloadFile(name:string, data:Uint8Array|ArrayBuffer) {
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

        if(forageStorage.isAccount && loc.startsWith('assets')){
            return hubURL + `/rs/` + loc
        }
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

export async function saveAsset(data:Uint8Array, customId:string = '', fileName:string = ''){
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
    let fileExtension:string = 'png'
    if(fileName && fileName.split('.').length > 0){
        fileExtension = fileName.split('.').pop()
    }
    if(isTauri){
        await writeBinaryFile(`assets/${id}.${fileExtension}`, data ,{dir: BaseDirectory.AppData})
        return `assets/${id}.${fileExtension}`
    }
    else{
        let form = `assets/${id}.${fileExtension}`
        const replacer = await forageStorage.setItem(form, data)
        if(replacer){
            return replacer
        }
        return form
    }
}

let lastSave = ''

export async function saveDb(){
    lastSave =JSON.stringify(get(DataBase))
    let changed = false
    syncDrive()
    DataBase.subscribe(() => {
        changed = true
    })
    let savetrys = 0
    while(true){
        try {
            if(changed){
                changed = false
                let db = get(DataBase)
                db.saveTime = Math.floor(Date.now() / 1000)
                const dbData = encodeRisuSave(db)
                if(isTauri){
                    await writeBinaryFile('database/database.bin', dbData, {dir: BaseDirectory.AppData})
                    await writeBinaryFile(`database/dbbackup-${(Date.now()/100).toFixed()}.bin`, dbData, {dir: BaseDirectory.AppData})
                }
                else{
                    await forageStorage.setItem('database/database.bin', dbData)
                    if(!forageStorage.isAccount){
                        await forageStorage.setItem(`database/dbbackup-${(Date.now()/100).toFixed()}.bin`, dbData)
                    }
                    if(forageStorage.isAccount){
                        await sleep(2500);
                    }
                }
                if(!forageStorage.isAccount){
                    await getDbBackups()
                }
                savetrys = 0
            }
            await sleep(500)
        } catch (error) {
            if(savetrys > 4){
                await alertConfirm(`DBSaveError: ${error.message ?? error}. report to the developer.`)
            }
            else{
                
            }
        }
    }
}


async function getDbBackups() {
    let db = get(DataBase)
    if(db?.account?.useSync){
        return
    }
    if(isTauri){
        const keys = await readDir('database', {dir: BaseDirectory.AppData})
        let backups:number[] = []
        for(const key of keys){
            if(key.name.startsWith("dbbackup-")){
                let da = key.name.substring(9)
                da = da.substring(0,da.length-4)
                backups.push(parseInt(da))
            }
        }
        backups.sort((a, b) => b - a)
        while(backups.length > 20){
            const last = backups.pop()
            await removeFile(`database/dbbackup-${last}.bin`,{dir: BaseDirectory.AppData})
        }
        return backups
    }
    else{
        const keys = await forageStorage.keys()
        let backups:number[] = []
        for(const key of keys){
            if(key.startsWith("database/dbbackup-")){
                let da = key.substring(18)
                da = da.substring(0,da.length-4)
                backups.push(parseInt(da))
            }
        }
        while(backups.length > 20){
            const last = backups.pop()
            await forageStorage.removeItem(`database/dbbackup-${last}.bin`)
        }
        return backups
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
                        encodeRisuSave({})
                    ,{dir: BaseDirectory.AppData})
                }
                try {
                    setDatabase(
                        decodeRisuSave(await readBinaryFile('database/database.bin',{dir: BaseDirectory.AppData}))
                    )
                } catch (error) {
                    const backups = await getDbBackups()
                    let backupLoaded = false
                    for(const backup of backups){
                        try {
                            const backupData = await readBinaryFile(`database/dbbackup-${backup}.bin`,{dir: BaseDirectory.AppData})
                            setDatabase(
                                decodeRisuSave(backupData)
                            )
                            backupLoaded = true
                        } catch (error) {
                            console.error(error)
                        }
                    }
                    if(!backupLoaded){
                        throw "Your save file is corrupted"
                    }
                }
                await checkUpdate()
                await changeFullscreen()
    
            }
            else{
                let gotStorage:Uint8Array = await forageStorage.getItem('database/database.bin')
                if(checkNullish(gotStorage)){
                    gotStorage = encodeRisuSave({})
                    await forageStorage.setItem('database/database.bin', gotStorage)
                }
                try {
                    setDatabase(
                        decodeRisuSave(gotStorage)
                    )
                } catch (error) {
                    const backups = await getDbBackups()
                    let backupLoaded = false
                    for(const backup of backups){
                        try {
                            const backupData:Uint8Array = await forageStorage.getItem(`database/dbbackup-${backup}.bin`)
                            setDatabase(
                                decodeRisuSave(backupData)
                            )
                            backupLoaded = true
                        } catch (error) {}
                    }
                    if(!backupLoaded){
                        throw "Your save file is corrupted"
                    }
                }
                if(await forageStorage.checkAccountSync()){
                    let gotStorage:Uint8Array = await forageStorage.getItem('database/database.bin')
                    if(checkNullish(gotStorage)){
                        gotStorage = encodeRisuSave({})
                        await forageStorage.setItem('database/database.bin', gotStorage)
                    }
                    try {
                        setDatabase(
                            decodeRisuSave(gotStorage)
                        )
                    } catch (error) {
                        const backups = await getDbBackups()
                        let backupLoaded = false
                        for(const backup of backups){
                            try {
                                const backupData:Uint8Array = await forageStorage.getItem(`database/dbbackup-${backup}.bin`)
                                setDatabase(
                                    decodeRisuSave(backupData)
                                )
                                backupLoaded = true
                            } catch (error) {}
                        }
                        if(!backupLoaded){
                            throw "Your save file is corrupted"
                        }
                    }
                }
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
                    characterURLImport()
                }
            }
            try {
                await pargeChunks()
            } catch (error) {}
            try {
                await loadPlugins()            
            } catch (error) {}
            if(get(DataBase).account){
                try {
                    await loadRisuAccountData()                    
                } catch (error) {}
            }
            await checkNewFormat()
            const db = get(DataBase);
            updateColorScheme()
            updateTextTheme()
            updateAnimationSpeed()
            if(db.botSettingAtStart){
                botMakerMode.set(true)
            }
            loadedStore.set(true)
            selectedCharID.set(-1)
            saveDb()   
        } catch (error) {
            alertError(`${error}`)
        }
    }
}

const knownHostes = ["localhost","127.0.0.1"]

export function addFetchLog(arg:{
    body:any,
    headers?:{[key:string]:string},
    response:any,
    success:boolean,
    url:string
}){
    fetchLog.unshift({
        body: JSON.stringify(arg.body, null, 2),
        header: JSON.stringify(arg.headers ?? {}, null, 2),
        response: JSON.stringify(arg.response, null, 2),
        success: arg.success,
        date: (new Date()).toLocaleTimeString(),
        url: arg.url
    })
}

export async function globalFetch(url:string, arg:{
    plainFetchForce?:boolean,
    body?:any,
    headers?:{[key:string]:string},
    rawResponse?:boolean,
    method?:"POST"|"GET",
    abortSignal?:AbortSignal,
    useRisuToken?:boolean
} = {}): Promise<{
    ok: boolean;
    data: any;
    headers:{[key:string]:string},
}> {
    try {
        const db = get(DataBase)
        const method = arg.method ?? "POST"
        db.requestmet = "normal"
    
        if(arg.abortSignal && arg.abortSignal.aborted){
            return {
                ok: false,
                data: 'aborted',
                headers: {}
            }
        }
        
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
        let forcePlainFetch = (knownHostes.includes(urlHost) && (!isTauri)) || db.usePlainFetch || arg.plainFetchForce
        //check if the url is a local url like localhost
        if(urlHost.includes("localhost") || urlHost.includes("172.0.0.1") || urlHost.includes("0.0.0.0")){
            if((!isTauri) && (!isNodeServer)){
                return {
                    ok: false,
                    data: 'You are trying local request on web version. this is not allowed dude to browser security policy. use the desktop version instead, or use tunneling service like ngrok and set the cors to allow all.',
                    headers: {}
                }
            }
        }

        if(forcePlainFetch){
            try {
                let headers = arg.headers ?? {}
                if(!headers["Content-Type"]){
                    headers["Content-Type"] =  `application/json`
                }
                const furl = new URL(url)
    
                const da = await fetch(furl, {
                    body: JSON.stringify(arg.body),
                    headers: arg.headers,
                    method: method,
                    signal: arg.abortSignal
                })
    
                if(arg.rawResponse){
                    addFetchLog("Uint8Array Response", da.ok && da.status >= 200 && da.status < 300)
                    return {
                        ok: da.ok && da.status >= 200 && da.status < 300,
                        data: new Uint8Array(await da.arrayBuffer()),
                        headers: Object.fromEntries(da.headers)
                    }   
                }
                else{
                    const dat = await da.json()
                    addFetchLog(dat, da.ok && da.status >= 200 && da.status < 300)
                    return {
                        ok: da.ok && da.status >= 200 && da.status < 300,
                        data: dat,
                        headers: Object.fromEntries(da.headers)
                    }
                }
    
            } catch (error) {
                return {
                    ok: false,
                    data: `${error}`,
                    headers: {}
                }
            }
        }
        if(isTauri){
            const body = (!arg.body) ? null :
                (arg.body instanceof URLSearchParams) ? (Body.text(arg.body.toString())) : (Body.json(arg.body))
            const headers = arg.headers ?? {}
            const fetchPromise = TauriFetch(url, {
                body: body,
                method: method,
                headers: headers,
                timeout: {
                    secs: db.timeOut,
                    nanos: 0
                },
                responseType: arg.rawResponse ? ResponseType.Binary : ResponseType.JSON,
                
            })

            //abort the promise when abort signal is triggered
            let abortFn:() => void = () => {}

            const abortPromise = (new Promise<"aborted">((res,rej) => {
                abortFn = () => {
                    res("aborted")
                }
                if(arg.abortSignal){
                    arg.abortSignal?.addEventListener('abort', abortFn)
                }
            }))

            const result = await Promise.any([fetchPromise,abortPromise])

            if(arg.abortSignal){
                arg.abortSignal.removeEventListener('abort', abortFn)
            }

            if(result === 'aborted'){
                return {
                    ok: false,
                    data: 'aborted',
                    headers: {}
                }
            }

            if(arg.rawResponse){
                addFetchLog("Uint8Array Response", result.ok)
                return {
                    ok: result.ok,
                    data: new Uint8Array(result.data as number[]),
                    headers: result.headers
                }
            }
            else{
                addFetchLog(result.data, result.ok)
                return {
                    ok: result.ok,
                    data: result.data,
                    headers: result.headers
                }
            }
        }
        else{
            try {
                let body:any
                if(arg.body instanceof URLSearchParams){
                    const argBody = arg.body as URLSearchParams
                    body = argBody.toString()
                    let headers = arg.headers ?? {}
                    if(!headers["Content-Type"]){
                        headers["Content-Type"] =  `application/x-www-form-urlencoded`
                    }
                }
                else{
                    body = JSON.stringify(arg.body)
                    let headers = arg.headers ?? {}
                    if(!headers["Content-Type"]){
                        headers["Content-Type"] =  `application/json`
                    }
                }
                if(arg.rawResponse){
                    const furl = ((!isTauri) && (!isNodeServer)) ? `${hubURL}/proxy2` : `/proxy2`
                
                    let headers = {
                        "risu-header": encodeURIComponent(JSON.stringify(arg.headers)),
                        "risu-url": encodeURIComponent(url),
                        "Content-Type": "application/json",
                    }
                    if(arg.useRisuToken){
                        headers["x-risu-tk"] = "use"
                    }

                    const da = await fetch(furl, {
                        body: body,
                        headers: headers,
                        method: method,
                        signal: arg.abortSignal
                    })
    
                    addFetchLog("Uint8Array Response", da.ok && da.status >= 200 && da.status < 300)
                    return {
                        ok: da.ok && da.status >= 200 && da.status < 300,
                        data: new Uint8Array(await da.arrayBuffer()),
                        headers: Object.fromEntries(da.headers)
                    }   
                }
                else{
                    const furl = ((!isTauri) && (!isNodeServer)) ? `${hubURL}/proxy2` : `/proxy2`

                    let headers = {
                        "risu-header": encodeURIComponent(JSON.stringify(arg.headers)),
                        "risu-url": encodeURIComponent(url),
                        "Content-Type": "application/json"
                    }
                    if(arg.useRisuToken){
                        headers["x-risu-tk"] = "use"
                    }
                    const da = await fetch(furl, {
                        body: body,
                        headers: headers,
                        method: method
                    })
                    const daText = await da.text()
                    try {
                        const dat = JSON.parse(daText)
                        addFetchLog(dat, da.ok && da.status >= 200 && da.status < 300)
                        return {
                            ok: da.ok && da.status >= 200 && da.status < 300,
                            data: dat,
                            headers: Object.fromEntries(da.headers)
                        }   
                    } catch (error) {
                        addFetchLog(daText, false)
                        let errorMsg = (daText.startsWith('<!DOCTYPE')) ? ("Responded HTML. is your url, api key and password correct?") : (daText)
                        return {
                            ok:false,
                            data: errorMsg,
                            headers: Object.fromEntries(da.headers)
                        }
                    }
                }
            } catch (error) {
                return {
                    ok:false,
                    data: `${error}`,
                    headers: {}
                }
            }
        }   
    } catch (error) {
        console.error(error)
        return {
            ok:false,
            data: `${error}`,
            headers: {}
        }
    }
}

const re = /\\/g
function getBasename(data:string){
    const splited = data.replace(re, '/').split('/')
    const lasts = splited[splited.length-1]
    return lasts
}

export function getUnpargeables(db:Database, uptype:'basename'|'pure' = 'basename') {
    let unpargeable:string[] = []

    function addUnparge(data:string){
        if(!data){
            return
        }
        if(data === ''){
            return
        }
        const bn = uptype === 'basename' ? getBasename(data) : data
        if(!unpargeable.includes(bn)){
            unpargeable.push(bn)
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

    if(db.personas){
        db.personas.map((v) => {
            addUnparge(v.icon)
        })
    }
    return unpargeable
}


export function replaceDbResources(db:Database,replacer:{[key:string]:string}) {
    let unpargeable:string[] = []

    function replaceData(data:string){
        if(!data){
            return data
        }
        return replacer[data] ?? data
    }

    db.customBackground = replaceData(db.customBackground)
    db.userIcon = replaceData(db.userIcon)

    for(const cha of db.characters){
        if(cha.image){
            cha.image = replaceData(cha.image)
        }
        if(cha.emotionImages){
            for(let i=0;i<cha.emotionImages.length;i++){
                cha.emotionImages[i][1] = replaceData(cha.emotionImages[i][1])
            }
        }
        if(cha.type !== 'group'){
            if(cha.additionalAssets){
                for(let i=0;i<cha.additionalAssets.length;i++){
                    cha.additionalAssets[i][1] = replaceData(cha.additionalAssets[i][1])
                }
            }
        }
    }
    return db
}

async function checkNewFormat() {
    let db = get(DataBase)

    //check data integrity
    db.characters = db.characters.map((v) => {
        if(!v){
            return null
        }
        v.chaId ??= uuidv4()
        v.type ??= 'character'
        v.chatPage ??= 0
        v.chats ??= []
        v.customscript ??= []
        v.firstMessage ??= ''
        v.globalLore ??= []
        v.name ??= ''
        v.viewScreen ??= 'none'
        v.emotionImages = v.emotionImages ?? []

        if(v.type === 'character'){
            v.bias ??= []
            v.characterVersion ??= ''
            v.creator ??= ''
            v.desc ??= ''
            v.utilityBot ??= false
            v.tags ??= []
            v.systemPrompt ??= ''
            v.scenario ??= ''
        }
        return v
    }).filter((v) => {
        return v !== null
    })


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
    if(!db.characterOrder){
        db.characterOrder = []
    }
    if(db.mainPrompt === oldMainPrompt){
        db.mainPrompt = defaultMainPrompt
    }
    if(db.mainPrompt === oldJailbreak){
        db.mainPrompt = defaultJailbreak
    }

    setDatabase(db)
    checkCharOrder()
}

export function checkCharOrder() {
    let db = get(DataBase)
    db.characterOrder = db.characterOrder ?? []
    let ordered = cloneDeep(db.characterOrder ?? [])
    for(let i=0;i<db.characterOrder.length;i++){
        const folder =db.characterOrder[i]
        if(typeof(folder) !== 'string' && folder){
            for(const f of folder.data){
                ordered.push(f)
            }
        }
    }

    let charIdList:string[] = []

    for(let i=0;i<db.characters.length;i++){
        const charId = db.characters[i].chaId
        charIdList.push(charId)
        if(!ordered.includes(charId)){
            db.characterOrder.push(charId)
        }
    }


    for(let i=0;i<db.characterOrder.length;i++){
        const data =db.characterOrder[i]
        if(typeof(data) !== 'string'){
            if(!data){
                db.characterOrder.splice(i,1)
                i--;
                continue
            }
            if(data.data.length === 0){
                db.characterOrder.splice(i,1)
                i--;
                continue
            }
            for(let i2=0;i2<data.data.length;i2++){
                const data2 = data.data[i2]
                if(!charIdList.includes(data2)){
                    data.data.splice(i2,1)
                    i2--;
                }
            }
            db.characterOrder[i] = data
        }
        else{
            if(!charIdList.includes(data)){
                db.characterOrder.splice(i,1)
                i--;
            }
        }
    }


    setDatabase(db)
}

async function pargeChunks(){
    const db = get(DataBase)
    if(db.account?.useSync){
        return
    }

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
    return logString
}

export function openURL(url:string){
    if(isTauri){
        open(url)
    }
    else{
        window.open(url, "_blank")
    }
}

function formDataToString(formData: FormData): string {
    const params: string[] = [];
  
    for (const [name, value] of formData.entries()) {
      params.push(`${encodeURIComponent(name)}=${encodeURIComponent(value.toString())}`);
    }
  
    return params.join('&');
}

export function getModelMaxContext(model:string):number|undefined{
    if(model.startsWith('gpt35')){
        if(model.includes('16k')){
            return 16000
        }
        return 4000
    }
    if(model.startsWith('gpt4')){
        if(model.includes('32k')){
            return 32000
        }
        return 8000
    }

    return undefined
}
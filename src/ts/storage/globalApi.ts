import { writeBinaryFile,BaseDirectory, readBinaryFile, exists, createDir, readDir, removeFile } from "@tauri-apps/api/fs"

import { changeFullscreen, checkNullish, findCharacterbyId, sleep } from "../util"
import { convertFileSrc, invoke } from "@tauri-apps/api/tauri"
import { v4 as uuidv4, v4 } from 'uuid';
import { appDataDir, join } from "@tauri-apps/api/path";
import { get } from "svelte/store";
import {open} from '@tauri-apps/api/shell'
import { DataBase, loadedStore, setDatabase, type Database, defaultSdDataFunc } from "./database";
import { appWindow } from "@tauri-apps/api/window";
import { checkRisuUpdate } from "../update";
import { MobileGUI, botMakerMode, selectedCharID } from "../stores";
import { Body, ResponseType, fetch as TauriFetch } from "@tauri-apps/api/http";
import { loadPlugins } from "../plugins/plugins";
import { alertConfirm, alertError, alertNormal, alertNormalWait, alertSelect, alertTOS, alertWait } from "../alert";
import { checkDriverInit, syncDrive } from "../drive/drive";
import { hasher } from "../parser";
import { characterURLImport, hubURL } from "../characterCards";
import { defaultJailbreak, defaultMainPrompt, oldJailbreak, oldMainPrompt } from "./defaultPrompts";
import { loadRisuAccountData } from "../drive/accounter";
import { decodeRisuSave, encodeRisuSave } from "./risuSave";
import { AutoStorage } from "./autoStorage";
import { updateAnimationSpeed } from "../gui/animation";
import { updateColorScheme, updateTextThemeAndCSS } from "../gui/colorscheme";
import { saveDbKei } from "../kei/backup";
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import * as CapFS from '@capacitor/filesystem'
import { save } from "@tauri-apps/api/dialog";
import type { RisuModule } from "../process/modules";
import { listen } from '@tauri-apps/api/event'
import { registerPlugin } from '@capacitor/core';
import { language } from "src/lang";
import { startObserveDom } from "../observer";
import { removeDefaultHandler } from "src/main";
import { updateGuisize } from "../gui/guisize";
import { encodeCapKeySafe } from "./mobileStorage";
import { updateLorebooks } from "../characters";
import { initMobileGesture } from "../hotkey";

//@ts-ignore
export const isTauri = !!window.__TAURI__
//@ts-ignore
export const isNodeServer = !!globalThis.__NODE__
export const forageStorage = new AutoStorage()
export const googleBuild = false

interface fetchLog{
    body:string
    header:string
    response:string
    success:boolean,
    date:string
    url:string
    responseType?:string
    chatId?:string
}

let fetchLog:fetchLog[] = []

async function writeBinaryFileFast(appPath: string, data: Uint8Array) {
    const secret = await invoke('get_http_secret') as string;
    const port = await invoke('get_http_port') as number;

    const apiUrl = `http://127.0.0.1:${port}/?path=${encodeURIComponent(appPath)}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'x-tauri-secret': secret
        },
        body: new Blob([data])
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
}

export async function downloadFile(name:string, dat:Uint8Array|ArrayBuffer|string) {
    if(typeof(dat) === 'string'){
        dat = Buffer.from(dat, 'utf-8')
    }
    const data = new Uint8Array(dat)
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

async function checkCapFileExists(getUriOptions: CapFS.GetUriOptions): Promise<boolean> {
    try {
        await CapFS.Filesystem.stat(getUriOptions);
        return true;
    } catch (checkDirException) {
        if (checkDirException.message === 'File does not exist') {
            return false;
        } else {
            throw checkDirException;
        }
    }
}
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
    if(forageStorage.isAccount && loc.startsWith('assets')){
        return hubURL + `/rs/` + loc
    }
    if(Capacitor.isNativePlatform()){
        if(!await checkCapFileExists({
            path: encodeCapKeySafe(loc),
            directory: CapFS.Directory.External
        })){
            return ''
        }
        const uri = await CapFS.Filesystem.getUri({
            path: encodeCapKeySafe(loc),
            directory: CapFS.Directory.External
        })
        return Capacitor.convertFileSrc(uri.uri)
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
        await writeBinaryFileFast(`assets/${id}.${fileExtension}`, data);
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

export async function loadAsset(id:string){
    if(isTauri){
        return await readBinaryFile(id,{dir: BaseDirectory.AppData})
    }
    else{
        return await forageStorage.getItem(id) as Uint8Array
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
    let gotChannel = false
    const sessionID = v4()
    let channel:BroadcastChannel
    if(window.BroadcastChannel){
        channel = new BroadcastChannel('risu-db')
    }
    if(channel){
        channel.onmessage = async (ev) => {
            if(ev.data === sessionID){
                return
            }
            if(!gotChannel){
                gotChannel = true
                alertWait(language.activeTabChange)
                location.reload()
            }
        }
    }
    let savetrys = 0
    while(true){
        try {
            if(changed){
                if(gotChannel){
                    //Data is saved in other tab
                    await sleep(1000)
                    continue
                }
                if(channel){
                    channel.postMessage(sessionID)
                }
                changed = false
                let db = get(DataBase)
                db.saveTime = Math.floor(Date.now() / 1000)
                if(isTauri){
                    const dbData = encodeRisuSave(db)
                    await writeBinaryFileFast('database/database.bin', dbData);
                    await writeBinaryFileFast(`database/dbbackup-${(Date.now()/100).toFixed()}.bin`, dbData);
                }
                else{
                    if(!forageStorage.isAccount){
                        const dbData = encodeRisuSave(db)
                        await forageStorage.setItem('database/database.bin', dbData)
                        await forageStorage.setItem(`database/dbbackup-${(Date.now()/100).toFixed()}.bin`, dbData)
                    }
                    if(forageStorage.isAccount){
                        const dbData = encodeRisuSave(db, 'compression')
                        const z:Database = decodeRisuSave(dbData)
                        if(z.formatversion){
                            await forageStorage.setItem('database/database.bin', dbData)
                        }
                        await sleep(5000);
                    }
                }
                if(!forageStorage.isAccount){
                    await getDbBackups()
                }
                savetrys = 0
            }
            await saveDbKei()
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
        return []
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
                    await writeBinaryFileFast('database/database.bin', encodeRisuSave({}));
                }
                try {
                    const decoded = decodeRisuSave(await readBinaryFile('database/database.bin',{dir: BaseDirectory.AppData}))
                    setDatabase(decoded)
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
                await checkRisuUpdate()
                await changeFullscreen()
    
            }
            else{
                let gotStorage:Uint8Array = await forageStorage.getItem('database/database.bin')
                if(checkNullish(gotStorage)){
                    gotStorage = encodeRisuSave({})
                    await forageStorage.setItem('database/database.bin', gotStorage)
                }
                try {
                    const decoded = decodeRisuSave(gotStorage)
                    console.log(decoded)
                    setDatabase(decoded)
                } catch (error) {
                    console.error(error)
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
                if(navigator.serviceWorker && (!Capacitor.isNativePlatform())){
                    usingSw = true
                    await registerSw()
                }
                else{
                    usingSw = false
                }
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
            try {
                //@ts-ignore
                const isInStandaloneMode = (window.matchMedia('(display-mode: standalone)').matches) || (window.navigator.standalone) || document.referrer.includes('android-app://');              
                if(isInStandaloneMode){
                    await navigator.storage.persist()
                }
            } catch (error) {
                
            }
            await checkNewFormat()
            const db = get(DataBase);
            updateColorScheme()
            updateTextThemeAndCSS()
            updateAnimationSpeed()
            updateHeightMode()
            updateErrorHandling()
            updateGuisize()
            if(db.botSettingAtStart){
                botMakerMode.set(true)
            }
            if((db.betaMobileGUI && window.innerWidth <= 800) || import.meta.env.VITE_RISU_LITE === 'TRUE'){
                initMobileGesture()
                MobileGUI.set(true)
            }
            loadedStore.set(true)
            selectedCharID.set(-1)
            startObserveDom()
            saveDb()
            if(import.meta.env.VITE_RISU_TOS === 'TRUE'){
                alertTOS().then((a) => {
                    if(a === false){
                        location.reload()
                    }
                })
            }
        } catch (error) {
            alertError(`${error}`)
        }
    }
}

export async function getFetchData(id:string) {
  for(const log of fetchLog){
      if(log.chatId === id){
          return log
      }
  }
  return null
}

function updateErrorHandling(){
    removeDefaultHandler()
    const errorHandler = (event: ErrorEvent) => {
        console.error(event.error)
        alertError(event.error)
    }
    const rejectHandler = (event: PromiseRejectionEvent) => {
        console.error(event.reason)
        alertError(event.reason)
    }
    window.addEventListener('error', errorHandler)
    window.addEventListener('unhandledrejection', rejectHandler)
}

const knownHostes = ["localhost","127.0.0.1","0.0.0.0"]

interface GlobalFetchArgs {
  plainFetchForce?: boolean;
  plainFetchDeforce?: boolean;
  body?: any;
  headers?: { [key: string]: string };
  rawResponse?: boolean;
  method?: 'POST' | 'GET';
  abortSignal?: AbortSignal;
  useRisuToken?: boolean;
  chatId?: string;
}

interface GlobalFetchResult {
  ok: boolean;
  data: any;
  headers: { [key: string]: string };
}

export function addFetchLog(arg:{
  body:any,
  headers?:{[key:string]:string},
  response:any,
  success:boolean,
  url:string,
  resType?:string,
  chatId?:string
}){
  fetchLog.unshift({
      body: typeof(arg.body) === 'string' ? arg.body : JSON.stringify(arg.body, null, 2),
      header: JSON.stringify(arg.headers ?? {}, null, 2),
      response: typeof(arg.response) === 'string' ? arg.response : JSON.stringify(arg.response, null, 2),
      responseType: arg.resType ?? 'json',
      success: arg.success,
      date: (new Date()).toLocaleTimeString(),
      url: arg.url,
      chatId: arg.chatId
  })
  return fetchLog.length - 1
}



export async function globalFetch(url: string, arg: GlobalFetchArgs = {}): Promise<GlobalFetchResult> {
  try {
    const db = get(DataBase)
    const method = arg.method ?? "POST"
    db.requestmet = "normal"

    if (arg.abortSignal?.aborted) { return { ok: false, data: 'aborted', headers: {} }}

    const urlHost = new URL(url).hostname
    const forcePlainFetch = ((knownHostes.includes(urlHost) && !isTauri) || db.usePlainFetch || arg.plainFetchForce) && !arg.plainFetchDeforce

    if (knownHostes.includes(urlHost) && !isTauri && !isNodeServer){
        return { ok: false, headers: {}, data: 'You are trying local request on web version. This is not allowed due to browser security policy. Use the desktop version instead, or use a tunneling service like ngrok and set the CORS to allow all.' }
    }

    // Simplify the globalFetch function: Detach built-in functions
    if (forcePlainFetch) {
        return await fetchWithPlainFetch(url, arg);
    }
    if (isTauri) {
        return await fetchWithTauri(url, arg);
    }
    if (Capacitor.isNativePlatform()) {
        return await fetchWithCapacitor(url, arg);
    }
    return await fetchWithProxy(url, arg);
    
  } catch (error) {
    console.error(error);
    return { ok: false, data: `${error}`, headers: {} };
  }
}

// Decoupled globalFetch built-in function
function addFetchLogInGlobalFetch(response:any, success:boolean, url:string, arg:GlobalFetchArgs){
    try{
        fetchLog.unshift({
            body: JSON.stringify(arg.body, null, 2),
            header: JSON.stringify(arg.headers ?? {}, null, 2),
            response: JSON.stringify(response, null, 2),
            success: success,
            date: (new Date()).toLocaleTimeString(),
            url: url,
            chatId: arg.chatId
        })
    }
    catch{
        fetchLog.unshift({
            body: JSON.stringify(arg.body, null, 2),
            header: JSON.stringify(arg.headers ?? {}, null, 2),
            response: `${response}`,
            success: success,
            date: (new Date()).toLocaleTimeString(),
            url: url,
            chatId: arg.chatId
        })
    }

    if(fetchLog.length > 20){
        fetchLog.pop()
    }
}

// Decoupled globalFetch built-in function
async function fetchWithPlainFetch(url: string, arg: GlobalFetchArgs): Promise<GlobalFetchResult> {
  try {
    const headers = { 'Content-Type': 'application/json', ...arg.headers };
    const response = await fetch(new URL(url), { body: JSON.stringify(arg.body), headers, method: arg.method ?? "POST", signal: arg.abortSignal });
    const data = arg.rawResponse ? new Uint8Array(await response.arrayBuffer()) : await response.json();
    const ok = response.ok && response.status >= 200 && response.status < 300;
    addFetchLogInGlobalFetch(data, ok, url, arg);
    return { ok, data, headers: Object.fromEntries(response.headers) };
  } catch (error) {
    return { ok: false, data: `${error}`, headers: {} };
  }
}

// Decoupled globalFetch built-in function
async function fetchWithTauri(url: string, arg: GlobalFetchArgs): Promise<GlobalFetchResult> {
  const body = !arg.body ? null : arg.body instanceof URLSearchParams ? Body.text(arg.body.toString()) : Body.json(arg.body);
  const headers = arg.headers ?? {};
  const fetchPromise = TauriFetch(url, {
    body,
    method: arg.method ?? 'POST',
    headers,
    timeout: { secs: get(DataBase).timeOut, nanos: 0 },
    responseType: arg.rawResponse ? ResponseType.Binary : ResponseType.JSON,
  });

  let abortFn = () => {};
  const abortPromise = new Promise<"aborted">((res, rej) => {
    abortFn = () => res("aborted");
    arg.abortSignal?.addEventListener('abort', abortFn);
  });

  const result = await Promise.any([fetchPromise, abortPromise]);
  arg.abortSignal?.removeEventListener('abort', abortFn);

  if (result === 'aborted') {
    return { ok: false, data: 'aborted', headers: {} };
  }

  const data = arg.rawResponse ? new Uint8Array(result.data as number[]) : result.data;
  addFetchLogInGlobalFetch(data, result.ok, url, arg);
  return { ok: result.ok, data, headers: result.headers };
}

// Decoupled globalFetch built-in function
async function fetchWithCapacitor(url: string, arg: GlobalFetchArgs): Promise<GlobalFetchResult> {
  const { body, headers = {}, rawResponse } = arg;
  headers["Content-Type"] = body instanceof URLSearchParams ? "application/x-www-form-urlencoded" : "application/json";

  const res = await CapacitorHttp.request({ url, method: arg.method ?? "POST", headers, data: body, responseType: rawResponse ? "arraybuffer" : "json" });

  addFetchLogInGlobalFetch(rawResponse ? "Uint8Array Response" : res.data, true, url, arg);

  return {
    ok: true,
    data: rawResponse ? new Uint8Array(res.data as ArrayBuffer) : res.data,
    headers: res.headers,
  };
}

// Decoupled globalFetch built-in function
async function fetchWithProxy(url: string, arg: GlobalFetchArgs): Promise<GlobalFetchResult> {
  try {
    const furl = !isTauri && !isNodeServer ? `${hubURL}/proxy2` : `/proxy2`;
    arg.headers["Content-Type"] ??= arg.body instanceof URLSearchParams ? "application/x-www-form-urlencoded" : "application/json";
    const headers = {
      "risu-header": encodeURIComponent(JSON.stringify(arg.headers)),
      "risu-url": encodeURIComponent(url),
      "Content-Type": arg.body instanceof URLSearchParams ? "application/x-www-form-urlencoded" : "application/json",
      ...(arg.useRisuToken && { "x-risu-tk": "use" }),
    };

    const body = arg.body instanceof URLSearchParams ? arg.body.toString() : JSON.stringify(arg.body);

    const response = await fetch(furl, { body, headers, method: arg.method ?? "POST", signal: arg.abortSignal });
    const isSuccess = response.ok && response.status >= 200 && response.status < 300;

    if (arg.rawResponse) {
      const data = new Uint8Array(await response.arrayBuffer());
      addFetchLogInGlobalFetch("Uint8Array Response", isSuccess, url, arg);
      return { ok: isSuccess, data, headers: Object.fromEntries(response.headers) };
    }

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      addFetchLogInGlobalFetch(data, isSuccess, url, arg);
      return { ok: isSuccess, data, headers: Object.fromEntries(response.headers) };
    } catch (error) {
      const errorMsg = text.startsWith('<!DOCTYPE') ? "Responded HTML. Is your URL, API key, and password correct?" : text;
      addFetchLogInGlobalFetch(text, false, url, arg);
      return { ok: false, data: errorMsg, headers: Object.fromEntries(response.headers) };
    }
  } catch (error) {
    return { ok: false, data: `${error}`, headers: {} };
  }
}

async function registerSw() {
    await navigator.serviceWorker.register("/sw.js", {
        scope: "/"
    });
    await sleep(100)
    const da = await fetch('/sw/init')
    if(!(da.status >= 200 && da.status < 300)){
        location.reload()
    }
    else{

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
            if(cha.vits){
                const keys = Object.keys(cha.vits.files)
                for(const key of keys){
                    const vit = cha.vits.files[key]
                    addUnparge(vit)
                }
            }
            if(cha.ccAssets){
                for(const asset of cha.ccAssets){
                    addUnparge(asset.uri)
                }
            }
        }
    }

    if(db.modules){
        for(const module of db.modules){
            const assets = module.assets
            if(assets){
                for(const asset of assets){
                    addUnparge(asset[1])
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

    db.modules = (db.modules ?? []).map((v) => {
        if(v.lorebook){
            v.lorebook = updateLorebooks(v.lorebook)
        }
        return v
    })

    db.personas = (db.personas ?? []).map((v) => {
        v.id ??= uuidv4()
        return v
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
    if(db.formatversion < 4){
        db.modules ??= []
        db.enabledModules ??=[]
        //convert globallore and global regex to modules
        if(db.globalscript && db.globalscript.length > 0){
            const id = v4()
            let regexModule:RisuModule = {
                name: "Global Regex",
                description: "Converted from legacy global regex",
                id: id,
                regex: structuredClone(db.globalscript)
            }
            db.modules.push(regexModule)
            db.enabledModules.push(id)
            db.globalscript = []
        }
        if(db.loreBook && db.loreBook.length > 0){
            const selIndex = db.loreBookPage
            for(let i=0;i<db.loreBook.length;i++){
                const id = v4()
                let lbModule:RisuModule = {
                    name: db.loreBook[i].name || "Unnamed Global Lorebook",
                    description: "Converted from legacy global lorebook",
                    id: id,
                    lorebook: structuredClone(db.loreBook[i].data)
                }
                db.modules.push(lbModule)
                if(i === selIndex){
                    db.enabledModules.push(id)
                }
                db.globalscript = []
            }
            db.loreBook = []
        }

        db.formatversion = 4
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
    for(let i=0;i<db.characters.length;i++){
        const trashTime = db.characters[i].trashTime
        const targetTrashTime = trashTime ? trashTime + 1000 * 60 * 60 * 24 * 3 : 0
        if(trashTime && targetTrashTime < Date.now()){
            db.characters.splice(i,1)
            i--
        }
    }
    setDatabase(db)
    checkCharOrder()
}

export function checkCharOrder() {
    let db = get(DataBase)
    db.characterOrder = db.characterOrder ?? []
    let ordered = structuredClone(db.characterOrder ?? [])
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
        const char = db.characters[i]
        const charId = char.chaId
        if(!char.trashTime){
            charIdList.push(charId)
        }
        if(!ordered.includes(charId)){
            if(charId !== '§temp' && charId !== '§playground' && !char.trashTime){
                db.characterOrder.push(charId)
            }
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
            if(unpargeable.includes(n)){
            }
            else{
                await removeFile(asset.path)
            }
        }
    }
    else{
        const indexes = await forageStorage.keys()
        for(const asset of indexes){
            if(!asset.startsWith('assets/')){
                continue
            }
            const n = getBasename(asset)
            if(unpargeable.includes(n)){
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
        if(model.includes('turbo')){
            return 128000 
        }
        if(model.includes('32k')){
            return 32000
        }
        return 8000
    }

    return undefined
}

export class TauriWriter{
    path: string
    firstWrite: boolean = true
    constructor(path: string){
        this.path = path
    }

    async write(data:Uint8Array) {
        await writeBinaryFile(this.path, data, {
            append: !this.firstWrite
        })
        this.firstWrite = false
    }

    async close(){
        // do nothing
    }
}

class MobileWriter{
    path: string
    firstWrite: boolean = true
    constructor(path: string){
        this.path = path
    }

    async write(data:Uint8Array) {
        if(this.firstWrite){
            if(!await CapFS.Filesystem.checkPermissions()){
                await CapFS.Filesystem.requestPermissions()
            }
            await CapFS.Filesystem.writeFile({
                path: this.path,
                data: Buffer.from(data).toString('base64'),
                recursive: true,
                directory: CapFS.Directory.Documents
            })
        }
        else{
            await CapFS.Filesystem.appendFile({
                path: this.path,
                data: Buffer.from(data).toString('base64'),
                directory: CapFS.Directory.Documents
            })
        }
        
        this.firstWrite = false
    }

    async close(){
        // do nothing
    }
}


export class LocalWriter{
    writer: WritableStreamDefaultWriter|TauriWriter|MobileWriter
    async init(name = 'Binary', ext = ['bin']) {
        if(isTauri){
            const filePath = await save({
                filters: [{
                  name: name,
                  extensions: ext
                }]
            });
            if(!filePath){
                return false
            }
            this.writer = new TauriWriter(filePath)
            return true
        }
        if(Capacitor.isNativePlatform()){
            this.writer = new MobileWriter(name + '.' + ext[0])
            return true
        }
        const streamSaver = await import('streamsaver')
        const writableStream = streamSaver.createWriteStream(name + '.' + ext[0])
        this.writer = writableStream.getWriter()
        return true
    }
    async writeBackup(name:string,data: Uint8Array){
        const encodedName = new TextEncoder().encode(getBasename(name))
        const nameLength = new Uint32Array([encodedName.byteLength])
        await this.writer.write(new Uint8Array(nameLength.buffer))
        await this.writer.write(encodedName)
        const dataLength = new Uint32Array([data.byteLength])
        await this.writer.write(new Uint8Array(dataLength.buffer))
        await this.writer.write(data)
    }
    async write(data:Uint8Array) {
        await this.writer.write(data)
    }
    async close(){
        await this.writer.close()
    }
}

export class VirtualWriter{
    buf = new AppendableBuffer()
    async write(data:Uint8Array) {
        this.buf.append(data)
    }
    async close(){
        // do nothing
    }
}

let fetchIndex = 0
let nativeFetchData:{[key:string]:StreamedFetchChunk[]} = {}

interface StreamedFetchChunkData{
    type:'chunk',
    body:string,
    id:string
}

interface StreamedFetchHeaderData{
    type:'headers',
    body:{[key:string]:string},
    id:string,
    status:number
}

interface StreamedFetchEndData{
    type:'end',
    id:string
}

type StreamedFetchChunk = StreamedFetchChunkData|StreamedFetchHeaderData|StreamedFetchEndData
interface StreamedFetchPlugin {
    streamedFetch(options: { id: string, url:string, body:string, headers:{[key:string]:string} }): Promise<{"error":string,"success":boolean}>;
    addListener(eventName: 'streamed_fetch', listenerFunc: (data:StreamedFetchChunk) => void): void;
}

let streamedFetchListening = false
let capStreamedFetch:StreamedFetchPlugin|undefined

if(isTauri){
    listen('streamed_fetch', (event) => {
        try {
            const parsed = JSON.parse(event.payload as string)
            const id = parsed.id
            nativeFetchData[id]?.push(parsed)
        } catch (error) {
            console.error(error)
        }
    }).then((v) => {
        streamedFetchListening = true
    })
}
if(Capacitor.isNativePlatform()){
    capStreamedFetch = registerPlugin<StreamedFetchPlugin>('CapacitorHttp', CapacitorHttp)

    capStreamedFetch.addListener('streamed_fetch', (data) => {
        try {
            nativeFetchData[data.id]?.push(data)
        } catch (error) {
            console.error(error)
        }
    })
    streamedFetchListening = true
}

export class AppendableBuffer{
    buffer:Uint8Array
    deapended:number = 0
    constructor(){
        this.buffer = new Uint8Array(0)
    }
    append(data:Uint8Array){
        const newBuffer = new Uint8Array(this.buffer.length + data.length)
        newBuffer.set(this.buffer, 0)
        newBuffer.set(data, this.buffer.length)
        this.buffer = newBuffer
    }
    deappend(length:number){
        this.buffer = this.buffer.slice(length)
        this.deapended += length
    }
    slice(start:number, end:number){
        return this.buffer.slice(start - this.deapended, end - this.deapended)
    }
    length(){
        return this.buffer.length + this.deapended
    }

}

const pipeFetchLog = (fetchLogIndex:number, readableStream:ReadableStream<Uint8Array>) => {
    let textDecoderBuffer = new AppendableBuffer()
    let textDecoderPointer = 0
    const textDecoder = TextDecoderStream ? (new TextDecoderStream()) : new TransformStream<Uint8Array, string>({
        transform(chunk, controller) {
            try{
                textDecoderBuffer.append(chunk)
                const decoded = new TextDecoder('utf-8', {
                    fatal: true
                }).decode(textDecoderBuffer.buffer)
                let newString = decoded.slice(textDecoderPointer)
                textDecoderPointer = decoded.length
                controller.enqueue(newString)
            }
            catch{}
        }
    })
    textDecoder.readable.pipeTo(new WritableStream({
        write(chunk) {
            fetchLog[fetchLogIndex].response += chunk
        }
    }))
    const writer = textDecoder.writable.getWriter()
    return new ReadableStream<Uint8Array>({
        start(controller) {
            readableStream.pipeTo(new WritableStream({
                write(chunk) {
                    controller.enqueue(chunk)
                    writer.write(chunk)
                },
                close() {
                    controller.close()
                    writer.close()
                }
            }))
        }
    })
}

export async function fetchNative(url:string, arg:{
    body:string,
    headers?:{[key:string]:string},
    method?:"POST",
    signal?:AbortSignal,
    useRisuTk?:boolean,
    chatId?:string
}):Promise<{ body: ReadableStream<Uint8Array>; headers: Headers; status: number }> {
    let headers = arg.headers ?? {}
    const db = get(DataBase)
    let throughProxy = (!isTauri) && (!isNodeServer) && (!db.usePlainFetch)
    let fetchLogIndex = addFetchLog({
        body: arg.body,
        headers: arg.headers,
        response: 'Streamed Fetch',
        success: true,
        url: url,
        resType: 'stream',
        chatId: arg.chatId
    })
    if(isTauri){
        fetchIndex++
        if(arg.signal && arg.signal.aborted){
            throw new Error('aborted')
        }
        if(fetchIndex >= 100000){
            fetchIndex = 0
        }
        let fetchId = fetchIndex.toString().padStart(5,'0')
        nativeFetchData[fetchId] = []
        let resolved = false

        let error = ''
        while(!streamedFetchListening){
            await sleep(100)
        }
        if(isTauri){
            invoke('streamed_fetch', {
                id: fetchId,
                url: url,
                headers: JSON.stringify(headers),
                body: arg.body,
            }).then((res) => {
                try {
                    const parsedRes = JSON.parse(res as string)
                    if(!parsedRes.success){
                        error = parsedRes.body
                        resolved = true
                    }   
                } catch (error) {
                    error = JSON.stringify(error)
                    resolved = true
                }
            })
        }
        else if(capStreamedFetch){
            capStreamedFetch.streamedFetch({
                id: fetchId,
                url: url,
                headers: headers,
                body: Buffer.from(arg.body).toString('base64'),
            }).then((res) => {
                if(!res.success){
                    error = res.error
                    resolved = true
                }
            })
        }

        let resHeaders:{[key:string]:string} = null
        let status = 400

        let readableStream = pipeFetchLog(fetchLogIndex,new ReadableStream<Uint8Array>({
            async start(controller) {
                while(!resolved || nativeFetchData[fetchId].length > 0){
                    if(nativeFetchData[fetchId].length > 0){
                        const data = nativeFetchData[fetchId].shift()
                        if(data.type === 'chunk'){
                            const chunk = Buffer.from(data.body, 'base64')
                            controller.enqueue(chunk)
                        }
                        if(data.type === 'headers'){
                            resHeaders = data.body
                            status = data.status
                        }
                        if(data.type === 'end'){
                            resolved = true
                        }
                    }
                    await sleep(10)
                }
                controller.close()
            }
        }))

        while(resHeaders === null && !resolved){
            await sleep(10)
        }

        if(resHeaders === null){
            resHeaders = {}
        }

        if(error !== ''){
            throw new Error(error)
        }

        return {
            body: readableStream,
            headers: new Headers(resHeaders),
            status: status
        }


    }
    else if(throughProxy){
        const r = await fetch(hubURL + `/proxy2`, {
            body: arg.body,
            headers: arg.useRisuTk ? {
                "risu-header": encodeURIComponent(JSON.stringify(headers)),
                "risu-url": encodeURIComponent(url),
                "Content-Type": "application/json",
                "x-risu-tk": "use"
            }: {
                "risu-header": encodeURIComponent(JSON.stringify(headers)),
                "risu-url": encodeURIComponent(url),
                "Content-Type": "application/json"
            },
            method: "POST",
            signal: arg.signal
        })

        return {
            body: pipeFetchLog(fetchLogIndex, r.body),
            headers: r.headers,
            status: r.status
        }
    }
    else{
        return await fetch(url, {
            body: arg.body,
            headers: headers,
            method: arg.method,
            signal: arg.signal
        })
    }
}

export function textifyReadableStream(stream:ReadableStream<Uint8Array>){
    return new Response(stream).text()
}

export function toggleFullscreen(){

    const fullscreenElement = document.fullscreenElement
    fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen({
        navigationUI: "hide"
    })
}

export function trimNonLatin(data:string){
    return data .replace(/[^\x00-\x7F]/g, "")
                .replace(/ +/g, ' ')
                .trim()
}

export function updateHeightMode(){
    const db = get(DataBase)
    const root = document.querySelector(':root') as HTMLElement;
    switch(db.heightMode){
        case 'auto':
            root.style.setProperty('--risu-height-size', '100%');
            break
        case 'vh':
            root.style.setProperty('--risu-height-size', '100vh');
            break
        case 'dvh':
            root.style.setProperty('--risu-height-size', '100dvh');
            break
        case 'lvh':
            root.style.setProperty('--risu-height-size', '100lvh');
            break
        case 'svh':
            root.style.setProperty('--risu-height-size', '100svh');
            break
        case 'percent':
            root.style.setProperty('--risu-height-size', '100%');
            break
    }
}

export class BlankWriter{
    constructor(){
    }
    async init(){
        //do nothing, just to make compatible with other writer

    }
    async write(key:string,data:Uint8Array|string){
        //do nothing, just to make compatible with other writer
    }
    async end(){
        //do nothing, just to make compatible with other writer
    }
}

export async function loadInternalBackup(){
    
    const keys = isTauri ? (await readDir('database', {dir: BaseDirectory.AppData})).map((v) => {
        return v.name
    }) : (await forageStorage.keys())
    let internalBackups:string[] = []
    for(const key of keys){
        if(key.includes('dbbackup-')){
            internalBackups.push(key)
        }
    }

    const selectOptions = [
        'Cancel',
        ...(internalBackups.map((a) => {
            return (new Date(parseInt(a.replace('database/dbbackup-', '').replace('dbbackup-','')) * 100)).toLocaleString()
        }))
    ]

    const alertResult = parseInt(
        await alertSelect(selectOptions)
    ) - 1

    if(alertResult === -1){
        return
    }

    const selectedBackup = internalBackups[alertResult]

    const data = isTauri ? (
        await readBinaryFile('database/' + selectedBackup, {dir: BaseDirectory.AppData})
    ) : (await forageStorage.getItem(selectedBackup))

    setDatabase(
        decodeRisuSave(data)
    )

    await alertNormal('Loaded backup')

    

}
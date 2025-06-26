import {
    writeFile,
    BaseDirectory,
    readFile,
    exists,
    mkdir,
    readDir,
    remove
} from "@tauri-apps/plugin-fs"
import { changeFullscreen, checkNullish, findCharacterbyId, sleep } from "./util"
import { convertFileSrc, invoke } from "@tauri-apps/api/core"
import { v4 as uuidv4, v4 } from 'uuid';
import { appDataDir, join } from "@tauri-apps/api/path";
import { get } from "svelte/store";
import {open} from '@tauri-apps/plugin-shell'
import { setDatabase, type Database, defaultSdDataFunc, getDatabase, type character } from "./storage/database.svelte";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { checkRisuUpdate } from "./update";
import { MobileGUI, botMakerMode, selectedCharID, loadedStore, DBState, LoadingStatusState } from "./stores.svelte";
import { loadPlugins } from "./plugins/plugins";
import { alertConfirm, alertError, alertNormal, alertNormalWait, alertSelect, alertTOS, alertWait } from "./alert";
import { checkDriverInit, syncDrive } from "./drive/drive";
import { hasher } from "./parser.svelte";
import { characterURLImport, hubURL } from "./characterCards";
import { defaultJailbreak, defaultMainPrompt, oldJailbreak, oldMainPrompt } from "./storage/defaultPrompts";
import { loadRisuAccountData } from "./drive/accounter";
import { decodeRisuSave, encodeRisuSave, encodeRisuSaveLegacy } from "./storage/risuSave";
import { AutoStorage } from "./storage/autoStorage";
import { updateAnimationSpeed } from "./gui/animation";
import { updateColorScheme, updateTextThemeAndCSS } from "./gui/colorscheme";
import { saveDbKei } from "./kei/backup";
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import * as CapFS from '@capacitor/filesystem'
import { save } from "@tauri-apps/plugin-dialog";
import { listen } from '@tauri-apps/api/event'
import { registerPlugin } from '@capacitor/core';
import { language } from "src/lang";
import { startObserveDom } from "./observer.svelte";
import { updateGuisize } from "./gui/guisize";
import { encodeCapKeySafe } from "./storage/mobileStorage";
import { updateLorebooks } from "./characters";
import { initMobileGesture } from "./hotkey";
import { fetch as TauriHTTPFetch } from '@tauri-apps/plugin-http';
import { moduleUpdate } from "./process/modules";
import type { AccountStorage } from "./storage/accountStorage";
import { makeColdData } from "./process/coldstorage.svelte";
import { compare } from 'fast-json-patch'

//@ts-ignore
export const isTauri = !!window.__TAURI_INTERNALS__
//@ts-ignore
export const isNodeServer = !!globalThis.__NODE__
//@ts-ignore
export const supportsPatchSync = !!globalThis.__PATCH_SYNC__
export const forageStorage = new AutoStorage()
export const googleBuild = false
export const isMobile = navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i)

const appWindow = isTauri ? getCurrentWebviewWindow() : null

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
        await writeFile(name, data, {baseDir: BaseDirectory.Download})
    }
    else{
        const blob = new Blob([data], { type: 'application/octet-stream' })
        const url = URL.createObjectURL(blob)

        downloadURL(url, name)

        setTimeout(() => {
            URL.revokeObjectURL(url)
        }, 10000)

        
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

/**
 * Checks if a file exists in the Capacitor filesystem.
 * 
 * @param {CapFS.GetUriOptions} getUriOptions - The options for getting the URI of the file.
 * @returns {Promise<boolean>} - A promise that resolves to true if the file exists, false otherwise.
 */
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

/**
 * Gets the source URL of a file.
 * 
 * @param {string} loc - The location of the file.
 * @returns {Promise<string>} - A promise that resolves to the source URL of the file.
 */
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
                        const f:Uint8Array = await forageStorage.getItem(loc) as unknown as Uint8Array
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
                const f:Uint8Array = await forageStorage.getItem(loc) as unknown as Uint8Array
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

/**
 * Reads an image file and returns its data.
 * 
 * @param {string} data - The path to the image file.
 * @returns {Promise<Uint8Array>} - A promise that resolves to the data of the image file.
 */
export async function readImage(data:string) {
    if(isTauri){
        if(data.startsWith('assets')){
            if(appDataDirPath === ''){
                appDataDirPath = await appDataDir();
            }
            return await readFile(await join(appDataDirPath,data))
        }
        return await readFile(data)
    }
    else{
        return (await forageStorage.getItem(data) as unknown as Uint8Array)
    }
}

/**
 * Saves an asset file with the given data, custom ID, and file name.
 * 
 * @param {Uint8Array} data - The data of the asset file.
 * @param {string} [customId=''] - The custom ID for the asset file.
 * @param {string} [fileName=''] - The name of the asset file.
 * @returns {Promise<string>} - A promise that resolves to the path of the saved asset file.
 */
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
        await writeFile(`assets/${id}.${fileExtension}`, data, {
            baseDir: BaseDirectory.AppData
        });
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

/**
 * Loads an asset file with the given ID.
 * 
 * @param {string} id - The ID of the asset file to load.
 * @returns {Promise<Uint8Array>} - A promise that resolves to the data of the loaded asset file.
 */
export async function loadAsset(id:string){
    if(isTauri){
        return await readFile(id,{baseDir: BaseDirectory.AppData})
    }
    else{
        return await forageStorage.getItem(id) as unknown as Uint8Array
    }
}

let lastSave = ''
let lastSyncedDb: any = null
let dbVersion = 0 // Track local database version for patch sync
export let saving = $state({
    state: false
})

/**
 * Attempts to save database changes using patch synchronization.
 * @returns {Promise<boolean>} Returns true if patch was successfully applied or no changes exist, false if full save is required.
 */
async function tryPatchSave(db: Database): Promise<boolean> {
    // Initial save cannot use patch, so return false to trigger full save.
    if (lastSyncedDb === null) {
        return false;
    }

    try {
        const serializedDb = $state.snapshot(db);
        const patch = compare(lastSyncedDb, serializedDb);

        if (patch.length > 0) {
            const success = await forageStorage.patchItem('database/database.bin', {
                patch: patch,
                expectedVersion: dbVersion
            });

            if (success) {
                lastSyncedDb = serializedDb;
                dbVersion++;
                console.log(`[Patch] Successfully applied patch, new version: ${dbVersion}`);
                return true;
            }
            console.warn('[Patch] Patch failed, falling back to full save');
            return false;
        }
        return true; // No changes detected, treat as success
    } catch (error) {
        console.error('[Patch] Error during patch attempt:', error);
        return false; // Fall back to full save on error
    }
}

/**
 * Saves the current state of the database.
 * 
 * @returns {Promise<void>} - A promise that resolves when the database has been saved.
 */
export async function saveDb(){
    let changed = false
    syncDrive()
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
                alertNormalWait(language.activeTabChange).then(() => {
                    location.reload()
                })
            }
        }
    }


    $effect.root(() => {

        let selIdState = $state(0)
        let oldSaveHash = ''

        selectedCharID.subscribe((v) => {
            selIdState = v
        })

        $effect(() => {
            $state.snapshot(DBState?.db?.characters?.[selIdState])
            for(const key in DBState.db){
                if(key !== 'characters'){
                    $state.snapshot(DBState.db[key])
                }
            }

            changed = true
        })
    })

    let savetrys = 0
    let lastDbData = new Uint8Array(0)
    await sleep(1000)
    while(true){
        if(!changed){
            await sleep(500)
            continue
        }

        saving.state = true
        changed = false

        try {
            if(gotChannel){
                //Data is saved in other tab
                await sleep(1000)
                continue
            }
            if(channel){
                channel.postMessage(sessionID)
            }
            let db = getDatabase()
            if(!db.characters){
                await sleep(1000)
                continue
            }
            if(isTauri){
                const dbData = encodeRisuSaveLegacy(db)
                await writeFile('database/database.bin', dbData, {baseDir: BaseDirectory.AppData});
                await writeFile(`database/dbbackup-${(Date.now()/100).toFixed()}.bin`, dbData, {baseDir: BaseDirectory.AppData});
            }
            else{                
                if(!forageStorage.isAccount){                    
                    // Patch-based sync for Node server                    
                    if (isNodeServer && supportsPatchSync) {
                        const patchSuccessful = await tryPatchSave(db);

                        // If this is the first save or patch failed, fall back to full save.
                        if (!patchSuccessful) {
                            const dbData = encodeRisuSaveLegacy(db);
                            await forageStorage.setItem('database/database.bin', dbData);
                            await forageStorage.setItem(`database/dbbackup-${(Date.now()/100).toFixed()}.bin`, dbData);

                            // (Re)initialize patch tracking state after full save.
                            lastSyncedDb = $state.snapshot(db);
                            dbVersion = 0;
                            console.log('[Patch] Full save completed, patch tracking (re)initialized.');
                        }
                    } else {
                        // Standard save method for environments that don't support patches 
                        const dbData = encodeRisuSaveLegacy(db);
                        await forageStorage.setItem('database/database.bin', dbData);
                        await forageStorage.setItem(`database/dbbackup-${(Date.now()/100).toFixed()}.bin`, dbData);
                    }
                }
                if(forageStorage.isAccount){
                    const dbData = await encodeRisuSave(db)
                    
                    if(lastDbData.length === dbData.length){
                        let same = true
                        for(let i = 20; i < dbData.length; i++){
                            if(dbData[i] !== lastDbData[i]){
                                same = false
                                break
                            }
                        }   

                        if(same){
                            await sleep(500)
                            continue
                        }
                    }

                    lastDbData = dbData
                    const z:Database = await decodeRisuSave(dbData)
                    if(z.formatversion){
                        await forageStorage.setItem('database/database.bin', dbData)
                    }

                    await sleep(3000)
                }
            }
            if(!forageStorage.isAccount){
                await getDbBackups()
            }
            savetrys = 0
            
            await saveDbKei()
            await sleep(500)
        } catch (error) {
            savetrys += 1
            if(savetrys > 4){
                await alertConfirm(`DBSaveError: ${error.message ?? error}. report to the developer.`)
            }
            else{
                console.error(error)
            }
        }

        saving.state = false
    }
}

/**
 * Retrieves the database backups.
 * 
 * @returns {Promise<number[]>} - A promise that resolves to an array of backup timestamps.
 */
async function getDbBackups() {
    let db = getDatabase()
    if(db?.account?.useSync){
        return []
    }
    if(isTauri){
        const keys = await readDir('database', {baseDir: BaseDirectory.AppData})
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
            await remove(`database/dbbackup-${last}.bin`,{baseDir: BaseDirectory.AppData})
        }
        return backups
    }
    else{
        const keys = await forageStorage.keys("database/dbbackup-")

        const backups = keys
          .filter(key => key.startsWith('database/dbbackup-'))
          .map(key => parseInt(key.slice(18, -4)))
          .sort((a, b) => b - a);

        while(backups.length > 20){
            const last = backups.pop()
            await forageStorage.removeItem(`database/dbbackup-${last}.bin`)
        }
        return backups
    }
}

let usingSw = false

/**
 * Loads the application data.
 * 
 * @returns {Promise<void>} - A promise that resolves when the data has been loaded.
 */
export async function loadData() {
    const loaded = get(loadedStore)
    if(!loaded){
        try {
            if(isTauri){
                LoadingStatusState.text = "Checking Files..."
                appWindow.maximize()
                if(!await exists('', {baseDir: BaseDirectory.AppData})){
                    await mkdir('', {baseDir: BaseDirectory.AppData})
                }
                if(!await exists('database', {baseDir: BaseDirectory.AppData})){
                    await mkdir('database', {baseDir: BaseDirectory.AppData})
                }
                if(!await exists('assets', {baseDir: BaseDirectory.AppData})){
                    await mkdir('assets', {baseDir: BaseDirectory.AppData})
                }
                if(!await exists('database/database.bin', {baseDir: BaseDirectory.AppData})){
                    await writeFile('database/database.bin', encodeRisuSaveLegacy({}), {baseDir: BaseDirectory.AppData});
                }
                try {
                    LoadingStatusState.text = "Reading Save File..."
                    const readed = await readFile('database/database.bin',{baseDir: BaseDirectory.AppData})
                    LoadingStatusState.text = "Cleaning Unnecessary Files..."
                    getDbBackups() //this also cleans the backups
                    LoadingStatusState.text = "Decoding Save File..."
                    const decoded = await decodeRisuSave(readed)
                    setDatabase(decoded)
                } catch (error) {
                    LoadingStatusState.text = "Reading Backup Files..."
                    const backups = await getDbBackups()
                    let backupLoaded = false
                    for(const backup of backups){
                        if (!backupLoaded) {
                            try {
                                LoadingStatusState.text = `Reading Backup File ${backup}...`
                                const backupData = await readFile(`database/dbbackup-${backup}.bin`, {baseDir: BaseDirectory.AppData})
                                setDatabase(
                                  await decodeRisuSave(backupData)
                                )
                                backupLoaded = true
                            } catch (error) {
                                console.error(error)
                            }
                        }
                    }
                    if(!backupLoaded){
                        throw "Your save file is corrupted"
                    }
                }
                LoadingStatusState.text = "Checking Update..."
                await checkRisuUpdate()
                await changeFullscreen()
    
            }
            else{
                await forageStorage.Init()

                LoadingStatusState.text = "Loading Local Save File..."
                let gotStorage:Uint8Array = await forageStorage.getItem('database/database.bin') as unknown as Uint8Array
                LoadingStatusState.text = "Decoding Local Save File..."
                if(checkNullish(gotStorage)){
                    gotStorage = encodeRisuSaveLegacy({})
                    await forageStorage.setItem('database/database.bin', gotStorage)
                }
                try {
                    const decoded = await decodeRisuSave(gotStorage)
                    console.log(decoded)
                    setDatabase(decoded)
                    lastSyncedDb = $state.snapshot(decoded)
                    dbVersion = 0 // Initialize version tracking
                } catch (error) {
                    console.error(error)
                    const backups = await getDbBackups()
                    let backupLoaded = false
                    for(const backup of backups){
                        try {
                            LoadingStatusState.text = `Reading Backup File ${backup}...`
                            const backupData:Uint8Array = await forageStorage.getItem(`database/dbbackup-${backup}.bin`) as unknown as Uint8Array
                            setDatabase(
                                await decodeRisuSave(backupData)
                            )
                            backupLoaded = true
                        } catch (error) {}
                    }
                    if(!backupLoaded){
                        throw "Your save file is corrupted"
                    }
                }

                if(await forageStorage.checkAccountSync()){
                    LoadingStatusState.text = "Checking Account Sync..."
                    let gotStorage:Uint8Array = await (forageStorage.realStorage as AccountStorage).getItem('database/database.bin', (v) => {
                        LoadingStatusState.text = `Loading Remote Save File ${(v*100).toFixed(2)}%`
                    })
                    if(checkNullish(gotStorage)){
                        gotStorage = encodeRisuSaveLegacy({})
                        await forageStorage.setItem('database/database.bin', gotStorage)
                    }
                    try {
                        setDatabase(
                            await decodeRisuSave(gotStorage)
                        )
                    } catch (error) {
                        const backups = await getDbBackups()
                        let backupLoaded = false
                        for(const backup of backups){
                            try {
                                LoadingStatusState.text = `Reading Backup File ${backup}...`
                                const backupData:Uint8Array = await forageStorage.getItem(`database/dbbackup-${backup}.bin`) as unknown as Uint8Array
                                setDatabase(
                                    await decodeRisuSave(backupData)
                                )
                                backupLoaded = true
                            } catch (error) {}
                        }
                        if(!backupLoaded){
                            throw "Your save file is corrupted"
                        }
                    }
                }
                LoadingStatusState.text = "Rechecking Account Sync..."
                await forageStorage.checkAccountSync()
                LoadingStatusState.text = "Checking Drive Sync..."
                const isDriverMode = await checkDriverInit()
                if(isDriverMode){
                    return
                }
                LoadingStatusState.text = "Checking Service Worker..."
                if(navigator.serviceWorker && (!Capacitor.isNativePlatform())){
                    usingSw = true
                    await registerSw()
                }
                else{
                    usingSw = false
                }
                if(getDatabase().didFirstSetup){
                    characterURLImport()
                }
            }
            LoadingStatusState.text = "Checking Unnecessary Files..."
            try {
                await pargeChunks()
            } catch (error) {
                console.error(error)
            }
            LoadingStatusState.text = "Loading Plugins..."
            try {
                await loadPlugins()            
            } catch (error) {}
            if(getDatabase().account){
                LoadingStatusState.text = "Checking Account Data..."
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
            LoadingStatusState.text = "Checking For Format Update..."
            await checkNewFormat()
            const db = getDatabase();

            LoadingStatusState.text = "Updating States..."
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
            makeColdData()
            saveDb()
            moduleUpdate()
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

/**
 * Retrieves fetch data for a given chat ID.
 * 
 * @param {string} id - The chat ID to search for in the fetch log.
 * @returns {fetchLog | null} - The fetch log entry if found, otherwise null.
 */
export async function getFetchData(id: string) {
  for (const log of fetchLog) {
    if (log.chatId === id) {
      return log;
    }
  }
  return null;
}

/**
 * Updates the error handling by removing the default handler and adding custom handlers for errors and unhandled promise rejections.
 */
function updateErrorHandling() {
  const errorHandler = (event: ErrorEvent) => {
    console.error(event.error);
    alertError(event.error);
  };
  const rejectHandler = (event: PromiseRejectionEvent) => {
    console.error(event.reason);
    alertError(event.reason);
  };
  window.addEventListener('error', errorHandler);
  window.addEventListener('unhandledrejection', rejectHandler);
}

const knownHostes = ["localhost", "127.0.0.1", "0.0.0.0"];

/**
 * Interface representing the arguments for the global fetch function.
 * 
 * @interface GlobalFetchArgs
 * @property {boolean} [plainFetchForce] - Whether to force plain fetch.
 * @property {any} [body] - The body of the request.
 * @property {{ [key: string]: string }} [headers] - The headers of the request.
 * @property {boolean} [rawResponse] - Whether to return the raw response.
 * @property {'POST' | 'GET'} [method] - The HTTP method to use.
 * @property {AbortSignal} [abortSignal] - The abort signal to cancel the request.
 * @property {boolean} [useRisuToken] - Whether to use the Risu token.
 * @property {string} [chatId] - The chat ID associated with the request.
 */
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

/**
 * Interface representing the result of the global fetch function.
 * 
 * @interface GlobalFetchResult
 * @property {boolean} ok - Whether the request was successful.
 * @property {any} data - The data returned from the request.
 * @property {{ [key: string]: string }} headers - The headers returned from the request.
 */
interface GlobalFetchResult {
  ok: boolean;
  data: any;
  headers: { [key: string]: string };
  status: number;
}

/**
 * Adds a fetch log entry.
 * 
 * @param {Object} arg - The arguments for the fetch log entry.
 * @param {any} arg.body - The body of the request.
 * @param {{ [key: string]: string }} [arg.headers] - The headers of the request.
 * @param {any} arg.response - The response from the request.
 * @param {boolean} arg.success - Whether the request was successful.
 * @param {string} arg.url - The URL of the request.
 * @param {string} [arg.resType] - The response type.
 * @param {string} [arg.chatId] - The chat ID associated with the request.
 * @returns {number} - The index of the added fetch log entry.
 */
export function addFetchLog(arg: {
  body: any,
  headers?: { [key: string]: string },
  response: any,
  success: boolean,
  url: string,
  resType?: string,
  chatId?: string
}): number {
  fetchLog.unshift({
    body: typeof (arg.body) === 'string' ? arg.body : JSON.stringify(arg.body, null, 2),
    header: JSON.stringify(arg.headers ?? {}, null, 2),
    response: typeof (arg.response) === 'string' ? arg.response : JSON.stringify(arg.response, null, 2),
    responseType: arg.resType ?? 'json',
    success: arg.success,
    date: (new Date()).toLocaleTimeString(),
    url: arg.url,
    chatId: arg.chatId
  });
  return 0;
}

/**
 * Performs a global fetch request.
 * 
 * @param {string} url - The URL to fetch.
 * @param {GlobalFetchArgs} [arg={}] - The arguments for the fetch request.
 * @returns {Promise<GlobalFetchResult>} - The result of the fetch request.
 */
export async function globalFetch(url: string, arg: GlobalFetchArgs = {}): Promise<GlobalFetchResult> {
  try {
    const db = getDatabase();
    const method = arg.method ?? "POST";
    db.requestmet = "normal";

    if (arg.abortSignal?.aborted) { return { ok: false, data: 'aborted', headers: {}, status: 400 }; }

    const urlHost = new URL(url).hostname
    const forcePlainFetch = ((knownHostes.includes(urlHost) && !isTauri) || db.usePlainFetch || arg.plainFetchForce) && !arg.plainFetchDeforce

    if (knownHostes.includes(urlHost) && !isTauri && !isNodeServer) {
      return { ok: false, headers: {}, status:400, data: 'You are trying local request on web version. This is not allowed due to browser security policy. Use the desktop version instead, or use a tunneling service like ngrok and set the CORS to allow all.' };
    }

    if (forcePlainFetch) {
      return await fetchWithPlainFetch(url, arg);
    }
    //userScriptFetch is provided by userscript
    if(window.userScriptFetch){
        return await fetchWithUSFetch(url, arg);
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
    return { ok: false, data: `${error}`, headers: {}, status: 400 };
  }
}

/**
 * Adds a fetch log entry in the global fetch log.
 * 
 * @param {any} response - The response data.
 * @param {boolean} success - Indicates if the fetch was successful.
 * @param {string} url - The URL of the fetch request.
 * @param {GlobalFetchArgs} arg - The arguments for the fetch request.
 */
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

/**
 * Performs a fetch request using plain fetch.
 * 
 * @param {string} url - The URL to fetch.
 * @param {GlobalFetchArgs} arg - The arguments for the fetch request.
 * @returns {Promise<GlobalFetchResult>} - The result of the fetch request.
 */
async function fetchWithPlainFetch(url: string, arg: GlobalFetchArgs): Promise<GlobalFetchResult> {
  try {
    const headers = { 'Content-Type': 'application/json', ...arg.headers };
    const response = await fetch(new URL(url), { body: JSON.stringify(arg.body), headers, method: arg.method ?? "POST", signal: arg.abortSignal });
    const data = arg.rawResponse ? new Uint8Array(await response.arrayBuffer()) : await response.json();
    const ok = response.ok && response.status >= 200 && response.status < 300;
    addFetchLogInGlobalFetch(data, ok, url, arg);
    return { ok, data, headers: Object.fromEntries(response.headers), status: response.status };
  } catch (error) {
    return { ok: false, data: `${error}`, headers: {}, status: 400 };
  }
}

/**
 * Performs a fetch request using userscript provided fetch.
 * 
 * @param {string} url - The URL to fetch.
 * @param {GlobalFetchArgs} arg - The arguments for the fetch request.
 * @returns {Promise<GlobalFetchResult>} - The result of the fetch request.
 */
async function fetchWithUSFetch(url: string, arg: GlobalFetchArgs): Promise<GlobalFetchResult> {
    try {
      const headers = { 'Content-Type': 'application/json', ...arg.headers };
      const response = await userScriptFetch(url, { body: JSON.stringify(arg.body), headers, method: arg.method ?? "POST", signal: arg.abortSignal });
      const data = arg.rawResponse ? new Uint8Array(await response.arrayBuffer()) : await response.json();
      const ok = response.ok && response.status >= 200 && response.status < 300;
      addFetchLogInGlobalFetch(data, ok, url, arg);
      return { ok, data, headers: Object.fromEntries(response.headers), status: response.status };
    } catch (error) {
      return { ok: false, data: `${error}`, headers: {}, status: 400 };
    }
  }

/**
 * Performs a fetch request using Tauri.
 * 
 * @param {string} url - The URL to fetch.
 * @param {GlobalFetchArgs} arg - The arguments for the fetch request.
 * @returns {Promise<GlobalFetchResult>} - The result of the fetch request.
 */
async function fetchWithTauri(url: string, arg: GlobalFetchArgs): Promise<GlobalFetchResult> {
    try {
        const headers = { 'Content-Type': 'application/json', ...arg.headers };
        const response = await TauriHTTPFetch(new URL(url), { body: JSON.stringify(arg.body), headers, method: arg.method ?? "POST", signal: arg.abortSignal });
        const data = arg.rawResponse ? new Uint8Array(await response.arrayBuffer()) : await response.json();
        const ok = response.status >= 200 && response.status < 300;
        addFetchLogInGlobalFetch(data, ok, url, arg);
        return { ok, data, headers: Object.fromEntries(response.headers), status: response.status };
    } catch (error) {
        
    }
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
    status: res.status
  };
}

/**
 * Performs a fetch request using a proxy.
 * 
 * @param {string} url - The URL to fetch.
 * @param {GlobalFetchArgs} arg - The arguments for the fetch request.
 * @returns {Promise<GlobalFetchResult>} - The result of the fetch request.
 */
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
      return { ok: isSuccess, data, headers: Object.fromEntries(response.headers), status: response.status };
    }

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      addFetchLogInGlobalFetch(data, isSuccess, url, arg);
      return { ok: isSuccess, data, headers: Object.fromEntries(response.headers), status: response.status };
    } catch (error) {
      const errorMsg = text.startsWith('<!DOCTYPE') ? "Responded HTML. Is your URL, API key, and password correct?" : text;
      addFetchLogInGlobalFetch(text, false, url, arg);
      return { ok: false, data: errorMsg, headers: Object.fromEntries(response.headers), status: response.status };
    }
  } catch (error) {
    return { ok: false, data: `${error}`, headers: {}, status: 400 };
  }
}

/**
 * Registers the service worker and initializes it.
 * 
 * @returns {Promise<void>} - A promise that resolves when the service worker is registered and initialized.
 */
async function registerSw() {
    await navigator.serviceWorker.register("/sw.js", {
        scope: "/"
    });
    await sleep(100);
    const da = await fetch('/sw/init');
    if (!(da.status >= 200 && da.status < 300)) {
        location.reload();
    }
}

/**
 * Regular expression to match backslashes.
 * 
 * @constant {RegExp}
 */
const re = /\\/g;

/**
 * Gets the basename of a given path.
 * 
 * @param {string} data - The path to get the basename from.
 * @returns {string} - The basename of the path.
 */
function getBasename(data: string) {
    const splited = data.replace(re, '/').split('/');
    const lasts = splited[splited.length - 1];
    return lasts;
}

/**
 * Retrieves unpargeable resources from the database.
 * 
 * @param {Database} db - The database to retrieve unpargeable resources from.
 * @param {'basename'|'pure'} [uptype='basename'] - The type of unpargeable resources to retrieve.
 * @returns {string[]} - An array of unpargeable resources.
 */
export function getUnpargeables(db: Database, uptype: 'basename' | 'pure' = 'basename') {
    let unpargeable: string[] = [];

    /**
     * Adds a resource to the unpargeable list if it is not already included.
     * 
     * @param {string} data - The resource to add.
     */
    function addUnparge(data: string) {
        if (!data) {
            return;
        }
        if (data === '') {
            return;
        }
        const bn = uptype === 'basename' ? getBasename(data) : data;
        if (!unpargeable.includes(bn)) {
            unpargeable.push(bn);
        }
    }

    addUnparge(db.customBackground);
    addUnparge(db.userIcon);

    for (const cha of db.characters) {
        if (cha.image) {
            addUnparge(cha.image);
        }
        if (cha.emotionImages) {
            for (const em of cha.emotionImages) {
                addUnparge(em[1]);
            }
        }
        if (cha.type !== 'group') {
            if (cha.additionalAssets) {
                for (const em of cha.additionalAssets) {
                    addUnparge(em[1]);
                }
            }
            if (cha.vits) {
                const keys = Object.keys(cha.vits.files);
                for (const key of keys) {
                    const vit = cha.vits.files[key];
                    addUnparge(vit);
                }
            }
            if (cha.ccAssets) {
                for (const asset of cha.ccAssets) {
                    addUnparge(asset.uri);
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
            addUnparge(v.icon);
        });
    }

    if(db.characterOrder){
        db.characterOrder.forEach((item) => {
            if (typeof item === 'object' && 'imgFile' in item) {
                addUnparge(item.imgFile);
            }
        })
    }
    return unpargeable;
}


/**
 * Replaces database resources with the provided replacer object.
 * 
 * @param {Database} db - The database object containing resources to be replaced.
 * @param {{[key: string]: string}} replacer - An object mapping original resource keys to their replacements.
 * @returns {Database} - The updated database object with replaced resources.
 */
export function replaceDbResources(db: Database, replacer: { [key: string]: string }): Database {
    let unpargeable: string[] = [];

    /**
     * Replaces a given data string with its corresponding value from the replacer object.
     * 
     * @param {string} data - The data string to be replaced.
     * @returns {string} - The replaced data string or the original data if no replacement is found.
     */
    function replaceData(data: string): string {
        if (!data) {
            return data;
        }
        return replacer[data] ?? data;
    }

    db.customBackground = replaceData(db.customBackground);
    db.userIcon = replaceData(db.userIcon);

    for (const cha of db.characters) {
        if (cha.image) {
            cha.image = replaceData(cha.image);
        }
        if (cha.emotionImages) {
            for (let i = 0; i < cha.emotionImages.length; i++) {
                cha.emotionImages[i][1] = replaceData(cha.emotionImages[i][1]);
            }
        }
        if (cha.type !== 'group') {
            if (cha.additionalAssets) {
                for (let i = 0; i < cha.additionalAssets.length; i++) {
                    cha.additionalAssets[i][1] = replaceData(cha.additionalAssets[i][1]);
                }
            }
        }
    }
    return db;
}

/**
 * Checks and updates the database format to the latest version.
 * 
 * @returns {Promise<void>} - A promise that resolves when the database format check and update is complete.
 */
async function checkNewFormat(): Promise<void> {
    let db = getDatabase();

    // Check data integrity
    db.characters = db.characters.map((v) => {
        if (!v) {
            return null;
        }
        v.chaId ??= uuidv4();
        v.type ??= 'character';
        v.chatPage ??= 0;
        v.chats ??= [];
        v.customscript ??= [];
        v.firstMessage ??= '';
        v.globalLore ??= [];
        v.name ??= '';
        v.viewScreen ??= 'none';
        v.emotionImages = v.emotionImages ?? [];

        if (v.type === 'character') {
            v.bias ??= [];
            v.characterVersion ??= '';
            v.creator ??= '';
            v.desc ??= '';
            v.utilityBot ??= false;
            v.tags ??= [];
            v.systemPrompt ??= '';
            v.scenario ??= '';
        }
        return v;
    }).filter((v) => {
        return v !== null;
    });

    db.modules = (db.modules ?? []).map((v) => {
        if (v?.lorebook) {
            v.lorebook = updateLorebooks(v.lorebook);
        }
        return v
    }).filter((v) => {
        return v !== null && v !== undefined;
    });

    db.personas = (db.personas ?? []).map((v) => {
        v.id ??= uuidv4()
        return v
    }).filter((v) => {
        return v !== null && v !== undefined;
    });

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
                return d;
            }
        }

        db.customBackground = checkParge(db.customBackground);
        db.userIcon = checkParge(db.userIcon);

        for (let i = 0; i < db.characters.length; i++) {
            if (db.characters[i].image) {
                db.characters[i].image = checkParge(db.characters[i].image);
            }
            if (db.characters[i].emotionImages) {
                for (let i2 = 0; i2 < db.characters[i].emotionImages.length; i2++) {
                    if (db.characters[i].emotionImages[i2] && db.characters[i].emotionImages[i2].length >= 2) {
                        db.characters[i].emotionImages[i2][1] = checkParge(db.characters[i].emotionImages[i2][1]);
                    }
                }
            }
        }

        db.formatversion = 2;
    }
    if (db.formatversion < 3) {
        for (let i = 0; i < db.characters.length; i++) {
            let cha = db.characters[i];
            if (cha.type === 'character') {
                if (checkNullish(cha.sdData)) {
                    cha.sdData = defaultSdDataFunc();
                }
            }
        }

        db.formatversion = 3;
    }
    if (db.formatversion < 4) {
        //migration removed due to issues
        db.formatversion = 4;
    }
    if (!db.characterOrder) {
        db.characterOrder = [];
    }
    if (db.mainPrompt === oldMainPrompt) {
        db.mainPrompt = defaultMainPrompt;
    }
    if (db.mainPrompt === oldJailbreak) {
        db.mainPrompt = defaultJailbreak;
    }
    for (let i = 0; i < db.characters.length; i++) {
        const trashTime = db.characters[i].trashTime;
        const targetTrashTime = trashTime ? trashTime + 1000 * 60 * 60 * 24 * 3 : 0;
        if (trashTime && targetTrashTime < Date.now()) {
            db.characters.splice(i, 1);
            i--;
        }
    }
    setDatabase(db);
    checkCharOrder();
}

/**
 * Checks and updates the character order in the database.
 * Ensures that all characters are properly ordered and removes any invalid entries.
 */
export function checkCharOrder() {
    let db = getDatabase()
    db.characterOrder = db.characterOrder ?? []
    let ordered = []
    for(let i=0;i<db.characterOrder.length;i++){
        const folder =db.characterOrder[i]
        if(typeof(folder) !== 'string' && folder){
            for(const f of folder.data){
                ordered.push(f)
            }
        }
        if(typeof(folder) === 'string'){
            ordered.push(folder)
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

/**
 * Purges chunks of data that are not needed.
 * Removes files from the assets directory that are not in the list of unpargeable items.
 */
async function pargeChunks(){
    const db = getDatabase()
    if(db.account?.useSync){
        return
    }

    const unpargeable = getUnpargeables(db)
    if(isTauri){
        const assets = await readDir('assets', {baseDir: BaseDirectory.AppData})
        console.log(assets)
        for(const asset of assets){
            try {
                const n = getBasename(asset.name)
                if(unpargeable.includes(n)){
                    console.log('unpargeable', n)
                }
                else{
                    console.log('pargeable', n)
                    await remove('assets/' + asset.name, {baseDir: BaseDirectory.AppData})
                }
            } catch (error) {
                console.log('error', asset.name)
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

/**
 * Retrieves the request log as a formatted string.
 * 
 * @returns {string} The formatted request log.
 */
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

/**
 * Opens a URL in the appropriate environment.
 * 
 * @param {string} url - The URL to open.
 */
export function openURL(url:string){
    if(isTauri){
        open(url)
    }
    else{
        window.open(url, "_blank")
    }
}

/**
 * Converts FormData to a URL-encoded string.
 * 
 * @param {FormData} formData - The FormData to convert.
 * @returns {string} The URL-encoded string.
 */
function formDataToString(formData: FormData): string {
    const params: string[] = [];
  
    for (const [name, value] of formData.entries()) {
      params.push(`${encodeURIComponent(name)}=${encodeURIComponent(value.toString())}`);
    }
  
    return params.join('&');
}

/**
 * Gets the maximum context length for a given model.
 * 
 * @param {string} model - The model name.
 * @returns {number|undefined} The maximum context length, or undefined if the model is not recognized.
 */
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

/**
 * A writer class for Tauri environment.
 */
export class TauriWriter{
    path: string
    firstWrite: boolean = true

    /**
     * Creates an instance of TauriWriter.
     * 
     * @param {string} path - The file path to write to.
     */
    constructor(path: string){
        this.path = path
    }

    /**
     * Writes data to the file.
     * 
     * @param {Uint8Array} data - The data to write.
     */
    async write(data:Uint8Array) {
        await writeFile(this.path, data, {
            append: !this.firstWrite
        })
        this.firstWrite = false
    }

    /**
     * Closes the writer. (No operation for TauriWriter)
     */
    async close(){
        // do nothing
    }
}

/**
 * A writer class for mobile environment.
 */
class MobileWriter{
    path: string
    firstWrite: boolean = true

    /**
     * Creates an instance of MobileWriter.
     * 
     * @param {string} path - The file path to write to.
     */
    constructor(path: string){
        this.path = path
    }

    /**
     * Writes data to the file.
     * 
     * @param {Uint8Array} data - The data to write.
     */
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

    /**
     * Closes the writer. (No operation for MobileWriter)
     */
    async close(){
        // do nothing
    }
}


/**
 * Class representing a local writer.
 */
export class LocalWriter {
    writer: WritableStreamDefaultWriter | TauriWriter | MobileWriter

    /**
     * Initializes the writer.
     * 
     * @param {string} [name='Binary'] - The name of the file.
     * @param {string[]} [ext=['bin']] - The file extensions.
     * @returns {Promise<boolean>} - A promise that resolves to a boolean indicating success.
     */
    async init(name = 'Binary', ext = ['bin']): Promise<boolean> {
        if (isTauri) {
            const filePath = await save({
                filters: [{
                    name: name,
                    extensions: ext
                }]
            });
            if (!filePath) {
                return false
            }
            this.writer = new TauriWriter(filePath)
            return true
        }
        if (Capacitor.isNativePlatform()) {
            this.writer = new MobileWriter(name + '.' + ext[0])
            return true
        }
        const streamSaver = await import('streamsaver')
        const writableStream = streamSaver.createWriteStream(name + '.' + ext[0])
        this.writer = writableStream.getWriter()
        return true
    }

    /**
     * Writes backup data to the file.
     * 
     * @param {string} name - The name of the backup.
     * @param {Uint8Array} data - The data to write.
     */
    async writeBackup(name: string, data: Uint8Array): Promise<void> {
        const encodedName = new TextEncoder().encode(getBasename(name))
        const nameLength = new Uint32Array([encodedName.byteLength])
        await this.writer.write(new Uint8Array(nameLength.buffer))
        await this.writer.write(encodedName)
        const dataLength = new Uint32Array([data.byteLength])
        await this.writer.write(new Uint8Array(dataLength.buffer))
        await this.writer.write(data)
    }

    /**
     * Writes data to the file.
     * 
     * @param {Uint8Array} data - The data to write.
     */
    async write(data: Uint8Array): Promise<void> {
        await this.writer.write(data)
    }

    /**
     * Closes the writer.
     */
    async close(): Promise<void> {
        await this.writer.close()
    }
}

/**
 * Class representing a virtual writer.
 */
export class VirtualWriter {
    buf = new AppendableBuffer()

    /**
     * Writes data to the buffer.
     * 
     * @param {Uint8Array} data - The data to write.
     */
    async write(data: Uint8Array): Promise<void> {
        this.buf.append(data)
    }

    /**
     * Closes the writer. (No operation for VirtualWriter)
     */
    async close(): Promise<void> {
        // do nothing
    }
}

/**
 * Index for fetch operations.
 * @type {number}
 */
let fetchIndex = 0

/**
 * Stores native fetch data.
 * @type {{ [key: string]: StreamedFetchChunk[] }}
 */
let nativeFetchData: { [key: string]: StreamedFetchChunk[] } = {}

/**
 * Interface representing a streamed fetch chunk data.
 * @interface
 */
interface StreamedFetchChunkData {
    type: 'chunk',
    body: string,
    id: string
}

/**
 * Interface representing a streamed fetch header data.
 * @interface
 */
interface StreamedFetchHeaderData {
    type: 'headers',
    body: { [key: string]: string },
    id: string,
    status: number
}

/**
 * Interface representing a streamed fetch end data.
 * @interface
 */
interface StreamedFetchEndData {
    type: 'end',
    id: string
}

/**
 * Type representing a streamed fetch chunk.
 * @typedef {StreamedFetchChunkData | StreamedFetchHeaderData | StreamedFetchEndData} StreamedFetchChunk
 */
type StreamedFetchChunk = StreamedFetchChunkData | StreamedFetchHeaderData | StreamedFetchEndData

/**
 * Interface representing a streamed fetch plugin.
 * @interface
 */
interface StreamedFetchPlugin {
    /**
     * Performs a streamed fetch operation.
     * @param {Object} options - The options for the fetch operation.
     * @param {string} options.id - The ID of the fetch operation.
     * @param {string} options.url - The URL to fetch.
     * @param {string} options.body - The body of the fetch request.
     * @param {{ [key: string]: string }} options.headers - The headers of the fetch request.
     * @returns {Promise<{ error: string, success: boolean }>} - The result of the fetch operation.
     */
    streamedFetch(options: { id: string, url: string, body: string, headers: { [key: string]: string } }): Promise<{ "error": string, "success": boolean }>;

    /**
     * Adds a listener for the specified event.
     * @param {string} eventName - The name of the event.
     * @param {(data: StreamedFetchChunk) => void} listenerFunc - The function to call when the event is triggered.
     */
    addListener(eventName: 'streamed_fetch', listenerFunc: (data: StreamedFetchChunk) => void): void;
}

/**
 * Indicates whether streamed fetch listening is active.
 * @type {boolean}
 */
let streamedFetchListening = false

/**
 * The streamed fetch plugin instance.
 * @type {StreamedFetchPlugin | undefined}
 */
let capStreamedFetch: StreamedFetchPlugin | undefined

if (isTauri) {
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

if (Capacitor.isNativePlatform()) {
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

/**
 * A class to manage a buffer that can be appended to and deappended from.
 */
export class AppendableBuffer {
    buffer: Uint8Array
    deapended: number = 0

    /**
     * Creates an instance of AppendableBuffer.
     */
    constructor() {
        this.buffer = new Uint8Array(0)
    }

    /**
     * Appends data to the buffer.
     * @param {Uint8Array} data - The data to append.
     */
    append(data: Uint8Array) {
        const newBuffer = new Uint8Array(this.buffer.length + data.length)
        newBuffer.set(this.buffer, 0)
        newBuffer.set(data, this.buffer.length)
        this.buffer = newBuffer
    }

    /**
     * Deappends a specified length from the buffer.
     * @param {number} length - The length to deappend.
     */
    deappend(length: number) {
        this.buffer = this.buffer.slice(length)
        this.deapended += length
    }

    /**
     * Slices the buffer from start to end.
     * @param {number} start - The start index.
     * @param {number} end - The end index.
     * @returns {Uint8Array} - The sliced buffer.
     */
    slice(start: number, end: number) {
        return this.buffer.slice(start - this.deapended, end - this.deapended)
    }

    /**
     * Gets the total length of the buffer including deappended length.
     * @returns {number} - The total length.
     */
    length() {
        return this.buffer.length + this.deapended
    }
}

/**
 * Pipes the fetch log to a readable stream.
 * @param {number} fetchLogIndex - The index of the fetch log.
 * @param {ReadableStream<Uint8Array>} readableStream - The readable stream to pipe.
 * @returns {ReadableStream<Uint8Array>} - The new readable stream.
 */
const pipeFetchLog = (fetchLogIndex: number, readableStream: ReadableStream<Uint8Array>) => {
    let textDecoderBuffer = new AppendableBuffer()
    let textDecoderPointer = 0
    const textDecoder = TextDecoderStream ? (new TextDecoderStream()) : new TransformStream<Uint8Array, string>({
        transform(chunk, controller) {
            try {
                textDecoderBuffer.append(chunk)
                const decoded = new TextDecoder('utf-8', {
                    fatal: true
                }).decode(textDecoderBuffer.buffer)
                let newString = decoded.slice(textDecoderPointer)
                textDecoderPointer = decoded.length
                controller.enqueue(newString)
            } catch { }
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

/**
 * Fetches data from a given URL using native fetch or through a proxy.
 * @param {string} url - The URL to fetch data from.
 * @param {Object} arg - The arguments for the fetch request.
 * @param {string} arg.body - The body of the request.
 * @param {Object} [arg.headers] - The headers of the request.
 * @param {string} [arg.method="POST"] - The HTTP method of the request.
 * @param {AbortSignal} [arg.signal] - The signal to abort the request.
 * @param {boolean} [arg.useRisuTk] - Whether to use Risu token.
 * @param {string} [arg.chatId] - The chat ID associated with the request.
 * @returns {Promise<Object>} - A promise that resolves to an object containing the response body, headers, and status.
 * @returns {ReadableStream<Uint8Array>} body - The response body as a readable stream.
 * @returns {Headers} headers - The response headers.
 * @returns {number} status - The response status code.
 * @throws {Error} - Throws an error if the request is aborted or if there is an error in the response.
 */
export async function fetchNative(url:string, arg:{
    body?:string|Uint8Array|ArrayBuffer,
    headers?:{[key:string]:string},
    method?:"POST"|"GET"|"PUT"|"DELETE",
    signal?:AbortSignal,
    useRisuTk?:boolean,
    chatId?:string
}):Promise<Response> {

    console.log(arg.body,'body')
    if(arg.body === undefined && (arg.method === 'POST' || arg.method === 'PUT') ){
        throw new Error('Body is required for POST and PUT requests')
    }

    arg.method = arg.method ?? 'POST'

    let headers = arg.headers ?? {}
    let realBody:Uint8Array

    if(arg.method === 'GET' || arg.method === 'DELETE'){
        realBody = undefined
    }
    else if(typeof arg.body === 'string'){
        realBody = new TextEncoder().encode(arg.body)
    }
    else if(arg.body instanceof Uint8Array){
        realBody = arg.body
    }
    else if(arg.body instanceof ArrayBuffer){
        realBody = new Uint8Array(arg.body)
    }
    else{
        throw new Error('Invalid body type')
    }

    const db = getDatabase()
    let throughProxy = (!isTauri) && (!isNodeServer) && (!db.usePlainFetch)
    let fetchLogIndex = addFetchLog({
        body: new TextDecoder().decode(realBody),
        headers: arg.headers,
        response: 'Streamed Fetch',
        success: true,
        url: url,
        resType: 'stream',
        chatId: arg.chatId,
    })
    if(window.userScriptFetch){
        return await window.userScriptFetch(url,{
            body: realBody,
            headers: headers,
            method: arg.method,
            signal: arg.signal
        })
    }
    else if(isTauri){
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
                body: realBody ? Buffer.from(realBody).toString('base64') : '',
                method: arg.method
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
                body: realBody ? Buffer.from(realBody).toString('base64') : '',
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
                            controller.enqueue(chunk as unknown as Uint8Array)
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

        return new Response(readableStream, {
            headers: new Headers(resHeaders),
            status: status
        })


    }
    else if(throughProxy){

        const r = await fetch(hubURL + `/proxy2`, {
            body: realBody,
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
            method: arg.method,
            signal: arg.signal
        })

        return new Response(r.body, {
            headers: r.headers,
            status: r.status
        })
    }
    else{
        return await fetch(url, {
            body: realBody,
            headers: headers,
            method: arg.method,
            signal: arg.signal,
        })
    }
}

/**
 * Converts a ReadableStream of Uint8Array to a text string.
 * 
 * @param {ReadableStream<Uint8Array>} stream - The readable stream to convert.
 * @returns {Promise<string>} A promise that resolves to the text content of the stream.
 */
export function textifyReadableStream(stream:ReadableStream<Uint8Array>){
    return new Response(stream).text()
}

/**
 * Toggles the fullscreen mode of the document.
 * If the document is currently in fullscreen mode, it exits fullscreen.
 * If the document is not in fullscreen mode, it requests fullscreen with navigation UI hidden.
 */
export function toggleFullscreen(){
    const fullscreenElement = document.fullscreenElement
    fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen({
        navigationUI: "hide"
    })
}

/**
 * Removes non-Latin characters from a string, replaces multiple spaces with a single space, and trims the string.
 * 
 * @param {string} data - The input string to be processed.
 * @returns {string} The processed string with non-Latin characters removed, multiple spaces replaced by a single space, and trimmed.
 */
export function trimNonLatin(data:string){
    return data .replace(/[^\x00-\x7F]/g, "")
                .replace(/ +/g, ' ')
                .trim()
}

/**
 * Updates the height mode of the document based on the value stored in the database.
 * 
 * The height mode can be one of the following values: 'auto', 'vh', 'dvh', 'lvh', 'svh', or 'percent'.
 * The corresponding CSS variable '--risu-height-size' is set accordingly.
 */
export function updateHeightMode(){
    const db = getDatabase()
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

/**
 * A class that provides a blank writer implementation.
 * 
 * This class is used to provide a no-op implementation of a writer, making it compatible with other writer interfaces.
 */
export class BlankWriter{
    constructor(){
    }

    /**
     * Initializes the writer.
     * 
     * This method does nothing and is provided for compatibility with other writer interfaces.
     */
    async init(){
        //do nothing, just to make compatible with other writer
    }

    /**
     * Writes data to the writer.
     * 
     * This method does nothing and is provided for compatibility with other writer interfaces.
     * 
     * @param {string} key - The key associated with the data.
     * @param {Uint8Array|string} data - The data to be written.
     */
    async write(key:string,data:Uint8Array|string){
        //do nothing, just to make compatible with other writer
    }

    /**
     * Ends the writing process.
     * 
     * This method does nothing and is provided for compatibility with other writer interfaces.
     */
    async end(){
        //do nothing, just to make compatible with other writer
    }
}

export async function loadInternalBackup(){
    
    const keys = isTauri ? (await readDir('database', {baseDir: BaseDirectory.AppData})).map((v) => {
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
        await readFile('database/' + selectedBackup, {baseDir: BaseDirectory.AppData})
    ) : (await forageStorage.getItem(selectedBackup))

    setDatabase(
        await decodeRisuSave(Buffer.from(data) as unknown as Uint8Array)
    )

    await alertNormal('Loaded backup')

    

}

/**
 * A debugging class for performance measurement.
*/

export class PerformanceDebugger{
    kv:{[key:string]:number[]} = {}
    startTime:number
    endTime:number

    /**
     * Starts the timing measurement.
    */
    start(){
        this.startTime = performance.now()
    }

    /**
     * Ends the timing measurement and records the time difference.
     * 
     * @param {string} key - The key to associate with the recorded time.
    */
    endAndRecord(key:string){
        this.endTime = performance.now()
        if(!this.kv[key]){
            this.kv[key] = []
        }
        this.kv[key].push(this.endTime - this.startTime)
    }

    /**
     * Ends the timing measurement, records the time difference, and starts a new timing measurement.
     * 
     * @param {string} key - The key to associate with the recorded time.
    */
    endAndRecordAndStart(key:string){
        this.endAndRecord(key)
        this.start()
    }

    /**
     * Logs the average time for each key to the console.
    */
    log(){
        let table:{[key:string]:number} = {}

        for(const key in this.kv){
            table[key] = this.kv[key].reduce((a,b) => a + b, 0) / this.kv[key].length
        }


        console.table(table)
    }

    combine(other:PerformanceDebugger){
        for(const key in other.kv){
            if(!this.kv[key]){
                this.kv[key] = []
            }
            this.kv[key].push(...other.kv[key])
        }
    }
}

export function getLanguageCodes(){
    let languageCodes:{
        code: string
        name: string
    }[] = []

    for(let i=0x41;i<=0x5A;i++){
        for(let j=0x41;j<=0x5A;j++){
            languageCodes.push({
                code: String.fromCharCode(i) + String.fromCharCode(j),
                name: ''
            })
        }
    }
    
    languageCodes = languageCodes.map(v => {
        return {
            code: v.code.toLocaleLowerCase(),
            name: new Intl.DisplayNames([
                DBState.db.language === 'cn' ? 'zh' : DBState.db.language
            ], {
                type: 'language',
                fallback: 'none'
            }).of(v.code)
        }
    }).filter((a) => {
        return a.name
    }).sort((a, b) => a.name.localeCompare(b.name))

    return languageCodes
}

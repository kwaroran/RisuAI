import {
    writeFile,
    BaseDirectory,
    readFile,
    exists,
    mkdir,
    readDir,
    remove
} from "@tauri-apps/plugin-fs"
import { changeFullscreen, checkNullish, sleep } from "./util"
import { Channel, convertFileSrc, invoke } from "@tauri-apps/api/core"
import { v4 as uuidv4, v4 } from 'uuid';
import { appDataDir, join } from "@tauri-apps/api/path";
import { get } from "svelte/store";
import { open } from '@tauri-apps/plugin-shell'
import streamSaver from 'streamsaver';
import { setDatabase, type Database, defaultSdDataFunc, getDatabase, appVer, getCurrentCharacter, type character, type groupChat, appSubVer } from "./storage/database.svelte";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { checkRisuUpdate } from "./update";
import { MobileGUI, botMakerMode, selectedCharID, loadedStore, DBState, LoadingStatusState, selIdState, ReloadGUIPointer, bodyIntercepterStore } from "./stores.svelte";
import { loadPlugins } from "./plugins/plugins.svelte";
import { alertConfirm, alertError, alertMd, alertNormal, alertNormalWait, alertSelect, alertTOS, waitAlert } from "./alert";
import { checkDriverInit, syncDrive } from "./drive/drive";
import { hasher } from "./parser/parser.svelte";
import { characterURLImport, hubURL } from "./characterCards";
import { defaultJailbreak, defaultMainPrompt, oldJailbreak, oldMainPrompt } from "./storage/defaultPrompts";
import { loadRisuAccountData } from "./drive/accounter";
import { decodeRisuSave, encodeRisuSaveLegacy, RisuSaveEncoder, type toSaveType } from "./storage/risuSave";
import { AutoStorage } from "./storage/autoStorage";
import { updateAnimationSpeed } from "./gui/animation";
import { updateColorScheme, updateTextThemeAndCSS } from "./gui/colorscheme";
import { autoServerBackup, saveDbKei } from "./kei/backup";
import { save } from "@tauri-apps/plugin-dialog";
import { language } from "src/lang";
import { startObserveDom } from "./observer.svelte";
import { updateGuisize } from "./gui/guisize";
import { updateLorebooks } from "./characters";
import { initMobileGesture } from "./hotkey";
import { fetch as TauriHTTPFetch } from '@tauri-apps/plugin-http';
import { moduleUpdate } from "./process/modules";
import type { AccountStorage } from "./storage/accountStorage";
import { getColdStorageItem, makeColdData } from "./process/coldstorage.svelte";
import { isTauri, isNodeServer } from "./platform";
import { isLocalNetworkUrl } from "./network/localNetwork";
import { decodeProxyJobWsChunk, formatProxyStreamErrorMessage, parseProxyJobWsEvent } from "./network/proxyJobWs";
import { pipeStreamWithTextLog } from "./network/streamFetchLog";
import { getNodeServerProxyAuth } from "./storage/nodeStorage";

export const forageStorage = new AutoStorage()

const appWindow = isTauri ? getCurrentWebviewWindow() : null

interface fetchLog {
    body: string
    header: string
    response: string
    success: boolean,
    date: string
    url: string
    responseType?: string
    chatId?: string
    status?: number
}

let fetchLog: fetchLog[] = []

export async function downloadFile(name: string, dat: Uint8Array | ArrayBuffer | string) {
    if (typeof (dat) === 'string') {
        dat = Buffer.from(dat, 'utf-8')
    }
    const data = new Uint8Array(dat)
    const downloadURL = (data: string, fileName: string) => {
        const a = document.createElement('a')
        a.href = data
        a.download = fileName
        document.body.appendChild(a)
        a.style.display = 'none'
        a.click()
        a.remove()
    }

    if (isTauri) {
        await writeFile(name, data, { baseDir: BaseDirectory.Download })
    }
    else {
        const blob = new Blob([data], { type: 'application/octet-stream' })
        const url = URL.createObjectURL(blob)

        downloadURL(url, name)

        setTimeout(() => {
            URL.revokeObjectURL(url)
        }, 10000)


    }
}

let fileCache: {
    origin: string[], res: (Uint8Array | 'loading' | 'done')[]
} = {
    origin: [],
    res: []
}

let pathCache: { [key: string]: string } = {}
let checkedPaths: string[] = []

/**
 * Gets the source URL of a file.
 * 
 * @param {string} loc - The location of the file.
 * @returns {Promise<string>} - A promise that resolves to the source URL of the file.
 */
export async function getFileSrc(loc: string) {
    if (isTauri) {
        if (loc.startsWith('assets')) {
            if (appDataDirPath === '') {
                appDataDirPath = await appDataDir();
            }
            const cached = pathCache[loc]
            if (cached) {
                return convertFileSrc(cached)
            }
            else {
                const joined = await join(appDataDirPath, loc)
                pathCache[loc] = joined
                return convertFileSrc(joined)
            }
        }
        return convertFileSrc(loc)
    }
    if (forageStorage.isAccount && loc.startsWith('assets')) {
        return hubURL + `/rs/` + loc
    }
    try {
        if (usingSw) {
            const encoded = Buffer.from(loc, 'utf-8').toString('hex')
            let ind = fileCache.origin.indexOf(loc)
            if (ind === -1) {
                ind = fileCache.origin.length
                fileCache.origin.push(loc)
                fileCache.res.push('loading')
                try {
                    const hasCache: boolean = (await (await fetch("/sw/check/" + encoded)).json()).able
                    if (hasCache) {
                        fileCache.res[ind] = 'done'
                        return "/sw/img/" + encoded
                    }
                    else {
                        const f: Uint8Array = await forageStorage.getItem(loc) as unknown as Uint8Array
                        await fetch("/sw/register/" + encoded, {
                            method: "POST",
                            body: f as any
                        })
                        fileCache.res[ind] = 'done'
                        await sleep(10)
                    }
                    return "/sw/img/" + encoded
                } catch (error) {

                }
            }
            else {
                const f = fileCache.res[ind]
                if (f === 'loading') {
                    while (fileCache.res[ind] === 'loading') {
                        await sleep(10)
                    }
                }
                return "/sw/img/" + encoded
            }
        }
        else {
            let ind = fileCache.origin.indexOf(loc)
            if (ind === -1) {
                ind = fileCache.origin.length
                fileCache.origin.push(loc)
                fileCache.res.push('loading')
                const f: Uint8Array = await forageStorage.getItem(loc) as unknown as Uint8Array
                fileCache.res[ind] = f
                return `data:image/png;base64,${Buffer.from(f).toString('base64')}`
            }
            else {
                const f = fileCache.res[ind]
                if (f === 'loading') {
                    while (fileCache.res[ind] === 'loading') {
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
export async function readImage(data: string) {
    if (isTauri) {
        if (data.startsWith('assets')) {
            if (appDataDirPath === '') {
                appDataDirPath = await appDataDir();
            }
            return await readFile(await join(appDataDirPath, data))
        }
        return await readFile(data)
    }
    else {
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
export async function saveAsset(data: Uint8Array, customId: string = '', fileName: string = '') {
    let id = ''
    if (customId !== '') {
        id = customId
    }
    else {
        try {
            id = await hasher(data)
        } catch (error) {
            id = uuidv4()
        }
    }
    let fileExtension: string = 'png'
    if (fileName && fileName.split('.').length > 0) {
        fileExtension = fileName.split('.').pop()
    }
    if (isTauri) {
        await writeFile(`assets/${id}.${fileExtension}`, data, {
            baseDir: BaseDirectory.AppData
        });
        return `assets/${id}.${fileExtension}`
    }
    else {
        let form = `assets/${id}.${fileExtension}`
        const replacer = await forageStorage.setItem(form, data)
        if (replacer) {
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
export async function loadAsset(id: string) {
    if (isTauri) {
        return await readFile(id, { baseDir: BaseDirectory.AppData })
    }
    else {
        return await forageStorage.getItem(id) as unknown as Uint8Array
    }
}

let lastSave = ''
export let saving = $state({
    state: false
})

/**
 * Saves the current state of the database.
 * 
 * @returns {Promise<void>} - A promise that resolves when the database has been saved.
 */
export let requiresFullEncoderReload = $state({
    state: false
})
export async function saveDb() {
    let changed = false
    syncDrive()
    let gotChannel = false
    const sessionID = v4()
    let channel: BroadcastChannel
    if (window.BroadcastChannel) {
        channel = new BroadcastChannel('risu-db')
    }
    if (channel) {
        channel.onmessage = (ev) => {
            if (ev.data === sessionID) {
                return
            }
            if (!gotChannel) {
                gotChannel = true
                alertNormalWait(language.activeTabChange).then(() => {
                    location.reload()
                })
            }
        }
    }

    const changeTracker: toSaveType = {
        character: [],
        chat: [],
        botPreset: false,
        modules: false,
        loadouts: false,
        plugins: false,
        pluginCustomStorage: false
    }

    let encoder = new RisuSaveEncoder()
    await encoder.init(getDatabase(), {
        compression: forageStorage.isAccount
    })

    $effect.root(() => {

        let selIdState = $state(0)

        const debounceTime = 500; // 500 milliseconds
        let saveTimeout: ReturnType<typeof setTimeout> | null = null;

        selectedCharID.subscribe((v) => {
            selIdState = v
        })

        function saveTimeoutExecute() {
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }
            saveTimeout = setTimeout(() => {
                changed = true;
            }, debounceTime);
        }

        $effect(() => {
            DBState.db.botPresetsId
            DBState.db.botPresets.length
            changeTracker.botPreset = true
            saveTimeoutExecute()
        })
        $effect(() => {
            $state.snapshot(DBState.db.modules)
            changeTracker.modules = true
            saveTimeoutExecute()
        })
        $effect(() => {
            $state.snapshot(DBState.db.loadouts)
            changeTracker.loadouts = true
            saveTimeoutExecute()
        })
        $effect(() => {
            $state.snapshot(DBState.db.plugins)
            changeTracker.plugins = true
            saveTimeoutExecute()
        })
        $effect(() => {
            $state.snapshot(DBState.db.pluginCustomStorage)
            changeTracker.pluginCustomStorage = true
            saveTimeoutExecute()
        })
        $effect(() => {
            for (const key in DBState.db) {
                if (
                    key !== 'characters' && key !== 'botPresets' && key !== 'modules' &&
                    key !== 'loadouts' && key !== 'plugins' && key !== 'pluginCustomStorage'
                ) {
                    $state.snapshot(DBState.db[key])
                }
            }
            if (DBState?.db?.characters?.[selIdState]) {
                for (const key in DBState.db.characters[selIdState]) {
                    if (key !== 'chats') {
                        $state.snapshot(DBState.db.characters[selIdState][key])
                    }
                }
                $state.snapshot(DBState.db.characters[selIdState].chats)
                if (changeTracker.character[0] !== DBState.db.characters[selIdState]?.chaId) {
                    changeTracker.character.unshift(DBState.db.characters[selIdState]?.chaId)
                }
                if (
                    changeTracker.chat[0]?.[0] !== DBState.db.characters[selIdState]?.chaId ||
                    changeTracker.chat[0]?.[1] !== DBState.db.characters[selIdState]?.chats[DBState.db.characters[selIdState]?.chatPage].id
                ) {
                    changeTracker.chat.unshift([DBState.db.characters[selIdState]?.chaId, DBState.db.characters[selIdState]?.chats[DBState.db.characters[selIdState]?.chatPage].id])
                }
            }
            saveTimeoutExecute()
        })
    })

    let savetrys = 0
    let lastDbData = new Uint8Array(0)
    await sleep(1000)
    while (true) {
        if (!changed) {
            await sleep(500)
            continue
        }

        saving.state = true
        changed = false
        try {

            if (requiresFullEncoderReload.state) {
                encoder = new RisuSaveEncoder()
                await encoder.init(getDatabase(), {
                    compression: forageStorage.isAccount,
                    skipRemoteSavingOnCharacters: false
                })
                requiresFullEncoderReload.state = false
            }

            let toSave = safeStructuredClone(changeTracker)
            changeTracker.character = changeTracker.character.length === 0 ? [] : [changeTracker.character[0]]
            changeTracker.chat = changeTracker.chat.length === 0 ? [] : [changeTracker.chat[0]]
            changeTracker.botPreset = false
            changeTracker.modules = false
            if (gotChannel) {
                //Data is saved in other tab
                await sleep(1000)
                continue
            }
            if (channel) {
                channel.postMessage(sessionID)
            }
            let db = getDatabase()
            if (!db.characters) {
                await sleep(1000)
                continue
            }

            await encoder.set(db, toSave)
            const encoded = encoder.encode()
            if (!encoded) {
                await sleep(1000)
                continue
            }
            const dbData = new Uint8Array(encoded)
            if (isTauri) {
                await writeFile('database/database.bin', dbData, { baseDir: BaseDirectory.AppData });
                await writeFile(`database/dbbackup-${(Date.now() / 100).toFixed()}.bin`, dbData, { baseDir: BaseDirectory.AppData });
            }
            else {

                await forageStorage.setItem('database/database.bin', dbData)
                if (!forageStorage.isAccount) {
                    await forageStorage.setItem(`database/dbbackup-${(Date.now() / 100).toFixed()}.bin`, dbData)
                }
                if (forageStorage.isAccount) {
                    await sleep(3000)
                }
            }
            if (!forageStorage.isAccount) {
                await getDbBackups()
            }
            savetrys = 0
            await saveDbKei()
            await sleep(500)
        } catch (error) {
            savetrys += 1
            if (savetrys > 4) {
                alertError(error)
            }
            else {
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
export async function getDbBackups() {
    let db = getDatabase()
    if (db?.account?.useSync && !isTauri && !isNodeServer) {
        return []
    }
    if (isTauri) {
        const keys = await readDir('database', { baseDir: BaseDirectory.AppData })
        let backups: number[] = []
        for (const key of keys) {
            if (key.name.startsWith("dbbackup-")) {
                let da = key.name.substring(9)
                da = da.substring(0, da.length - 4)
                backups.push(parseInt(da))
            }
        }
        backups.sort((a, b) => b - a)
        while (backups.length > 20) {
            const last = backups.pop()
            await remove(`database/dbbackup-${last}.bin`, { baseDir: BaseDirectory.AppData })
        }
        return backups
    }
    else {
        const keys = await forageStorage.keys()

        const backups = keys
            .filter(key => key.startsWith('database/dbbackup-'))
            .map(key => parseInt(key.slice(18, -4)))
            .sort((a, b) => b - a);

        while (backups.length > 20) {
            const last = backups.pop()
            await forageStorage.removeItem(`database/dbbackup-${last}.bin`)
        }
        return backups
    }
}

let usingSw = false

export function setUsingSw(value: boolean) {
    usingSw = value
}

/**
 * Retrieves fetch data for a given chat ID.
 * 
 * @param {string} id - The chat ID to search for in the fetch log.
 * @returns {fetchLog | null} - The fetch log entry if found, otherwise null.
 */
export function getFetchData(id: string) {
    for (const log of fetchLog) {
        if (log.chatId === id) {
            return log;
        }
    }
    return null;
}

const knownHostes = ["localhost", "127.0.0.1", "0.0.0.0"];
const webLocalNetworkBlockedMessage = "웹에서는 사설망 직접 호출 불가. Tauri 또는 LAN Node self-host 사용";
const defaultProxyJobHeartbeatSec = 15;

function getProxy2Url() {
    return !isTauri && !isNodeServer ? `${hubURL}/proxy2` : `/proxy2`;
}

function getProxyStreamJobBaseUrl() {
    return isNodeServer ? '' : `${hubURL}`;
}

function buildTimeoutSignal(originalSignal?: AbortSignal, timeoutMs?: number) {
    if (!timeoutMs || timeoutMs <= 0) {
        return {
            signal: originalSignal,
            cleanup: () => { /* no-op */ }
        };
    }

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (originalSignal) {
        if (originalSignal.aborted) {
            controller.abort();
        }
        else {
            originalSignal.addEventListener('abort', onAbort, { once: true });
        }
    }

    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return {
        signal: controller.signal,
        cleanup: () => {
            clearTimeout(timeoutId);
            originalSignal?.removeEventListener('abort', onAbort);
        }
    };
}

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
export interface GlobalFetchArgs {
    plainFetchForce?: boolean;
    plainFetchDeforce?: boolean;
    body?: any;
    headers?: { [key: string]: string };
    rawResponse?: boolean;
    method?: 'POST' | 'GET';
    abortSignal?: AbortSignal;
    useRisuToken?: boolean;
    chatId?: string;
    interceptor?: string;
    requestTimeoutMs?: number;
    networkRoute?: 'auto' | 'local_network';
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
    chatId?: string,
    status?: number
}): number {
    fetchLog.unshift({
        body: typeof (arg.body) === 'string' ? arg.body : JSON.stringify(arg.body, null, 2),
        header: JSON.stringify(arg.headers ?? {}, null, 2),
        response: typeof (arg.response) === 'string' ? arg.response : JSON.stringify(arg.response, null, 2),
        responseType: arg.resType ?? 'json',
        success: arg.success,
        date: (new Date()).toLocaleTimeString(),
        url: arg.url,
        chatId: arg.chatId,
        status: arg.status
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
        if (arg.abortSignal?.aborted) { return { ok: false, data: 'aborted', headers: {}, status: 400 }; }

        const urlHost = new URL(url).hostname
        const useLocalNetworkRoute = arg.networkRoute === 'local_network' && isLocalNetworkUrl(url)
        const forcePlainFetch = ((knownHostes.includes(urlHost) && !isTauri) || db.usePlainFetch || arg.plainFetchForce) && !arg.plainFetchDeforce && !useLocalNetworkRoute

        if (useLocalNetworkRoute && !isTauri && !isNodeServer) {
            return { ok: false, headers: {}, status: 400, data: webLocalNetworkBlockedMessage };
        }

        if (knownHostes.includes(urlHost) && !isTauri && !isNodeServer) {
            return { ok: false, headers: {}, status: 400, data: 'You are trying local request on web version. This is not allowed due to browser security policy. Use the desktop version instead, or use a tunneling service like ngrok and set the CORS to allow all.' };
        }

        if(arg.interceptor){
            for (const interceptor of bodyIntercepterStore) {
                try {
                    arg.body = await interceptor.callback(arg.body, arg.interceptor) || arg.body
                }
                catch (e) {
                    console.error(e)
                }
            }
        }

        const timeoutSignal = buildTimeoutSignal(arg.abortSignal, arg.requestTimeoutMs)
        const requestArg = timeoutSignal.signal === arg.abortSignal
            ? arg
            : { ...arg, abortSignal: timeoutSignal.signal }

        try {
            if (useLocalNetworkRoute) {
                if (isTauri) {
                    return await fetchWithTauri(url, requestArg);
                }
                return await fetchWithProxy(url, requestArg);
            }
            if (forcePlainFetch) {
                return await fetchWithPlainFetch(url, requestArg);
            }
            //userScriptFetch is provided by userscript
            if (window.userScriptFetch) {
                return await fetchWithUSFetch(url, requestArg);
            }
            if (isTauri) {
                return await fetchWithTauri(url, requestArg);
            }
            return await fetchWithProxy(url, requestArg);
        } finally {
            timeoutSignal.cleanup();
        }

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
function addFetchLogInGlobalFetch(response: any, success: boolean, url: string, arg: GlobalFetchArgs, status?: number) {
    try {
        fetchLog.unshift({
            body: JSON.stringify(arg.body, null, 2),
            header: JSON.stringify(arg.headers ?? {}, null, 2),
            response: JSON.stringify(response, null, 2),
            success: success,
            date: (new Date()).toLocaleTimeString(),
            url: url,
            chatId: arg.chatId,
            status: status
        })
    }
    catch {
        fetchLog.unshift({
            body: JSON.stringify(arg.body, null, 2),
            header: JSON.stringify(arg.headers ?? {}, null, 2),
            response: `${response}`,
            success: success,
            date: (new Date()).toLocaleTimeString(),
            url: url,
            chatId: arg.chatId,
            status: status
        })
    }

    if (fetchLog.length > 20) {
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
        addFetchLogInGlobalFetch(data, ok, url, arg, response.status);
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
        addFetchLogInGlobalFetch(data, ok, url, arg, response.status);
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
        addFetchLogInGlobalFetch(data, ok, url, arg, response.status);
        return { ok, data, headers: Object.fromEntries(response.headers), status: response.status };
    } catch (error) {
        return { ok: false, data: `${error}`, headers: {}, status: 400 };
    }
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
        const furl = getProxy2Url();
        arg.headers ??= {};
        arg.headers["Content-Type"] ??= arg.body instanceof URLSearchParams ? "application/x-www-form-urlencoded" : "application/json";
        const nodeProxyAuth = isNodeServer ? await getNodeServerProxyAuth() : null;
        const headers = {
            "risu-header": encodeURIComponent(JSON.stringify(arg.headers)),
            "risu-url": encodeURIComponent(url),
            "Content-Type": arg.body instanceof URLSearchParams ? "application/x-www-form-urlencoded" : "application/json",
            ...(arg.useRisuToken && { "x-risu-tk": "use" }),
            ...(arg.requestTimeoutMs && { "risu-timeout-ms": Math.max(1, Math.floor(arg.requestTimeoutMs)).toString() }),
            ...(nodeProxyAuth && { "risu-auth": nodeProxyAuth }),
            ...(DBState?.db?.requestLocation && { "risu-location": DBState.db.requestLocation }),
        };

        const body = arg.body instanceof URLSearchParams ? arg.body.toString() : JSON.stringify(arg.body);

        const response = await fetch(furl, { body, headers, method: arg.method ?? "POST", signal: arg.abortSignal });
        const isSuccess = response.ok && response.status >= 200 && response.status < 300;

        if (arg.rawResponse) {
            const data = new Uint8Array(await response.arrayBuffer());
            addFetchLogInGlobalFetch("Uint8Array Response", isSuccess, url, arg, response.status);
            return { ok: isSuccess, data, headers: Object.fromEntries(response.headers), status: response.status };
        }

        const text = await response.text();
        try {
            const data = JSON.parse(text);
            addFetchLogInGlobalFetch(data, isSuccess, url, arg, response.status);
            return { ok: isSuccess, data, headers: Object.fromEntries(response.headers), status: response.status };
        } catch (error) {
            const errorMsg = text.startsWith('<!DOCTYPE') ? "Responded HTML. Is your URL, API key, and password correct?" : text;
            addFetchLogInGlobalFetch(text, false, url, arg, response.status);
            return { ok: false, data: errorMsg, headers: Object.fromEntries(response.headers), status: response.status };
        }
    } catch (error) {
        return { ok: false, data: `${error}`, headers: {}, status: 400 };
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
export function getBasename(data: string) {
    const splited = data.replace(re, '/').split('/');
    const lasts = splited[splited.length - 1];
    return lasts;
}

export async function getUncleanables(db: Database, uptype: 'basename' | 'pure' = 'basename') {
    let chars: (character|groupChat)[] = []
    if (db.characters) {
        for(let cha of db.characters){
            if(cha?.coldstorage){
                const coldData = await getColdStorageItem(cha.coldstorage!)
                if(coldData?.character && coldData.character.chaId === cha.chaId){
                    cha = coldData.character
                }
            }
            chars.push(cha)
        }
    }

    return getUncleanablesSync(db, uptype, { chars });
}

/**
 * Retrieves uncleanable resources from the database.
 * 
 * @param {Database} db - The database to retrieve uncleanable resources from.
 * @param {'basename'|'pure'} [uptype='basename'] - The type of uncleanable resources to retrieve.
 * @returns {Promise<string[]>} - An array of uncleanable resources.
 */
export function getUncleanablesSync(db: Database, uptype: 'basename' | 'pure' = 'basename', options?:{
    chars: (character|groupChat)[],
}) {
    const uncleanable = new Set<string>();

    /**
     * Adds a resource to the uncleanable list if it is not already included.
     * 
     * @param {string} data - The resource to add.
     */
    function addUncleanable(data: string) {
        if (!data) {
            return;
        }
        if (data === '') {
            return;
        }
        const bn = uptype === 'basename' ? getBasename(data) : data;
        uncleanable.add(bn);
    }

    addUncleanable(db.customBackground);
    addUncleanable(db.userIcon);
    const chars = options?.chars ?? db.characters

    for (let cha of chars) {
        if (cha.image) {
            addUncleanable(cha.image);
        }
        if (cha.emotionImages) {
            for (const em of cha.emotionImages) {
                addUncleanable(em[1]);
            }
        }
        if (cha.type !== 'group') {
            if (cha.additionalAssets) {
                for (const em of cha.additionalAssets) {
                    addUncleanable(em[1]);
                }
            }
            if (cha.vits) {
                const keys = Object.keys(cha.vits.files);
                for (const key of keys) {
                    const vit = cha.vits.files[key];
                    addUncleanable(vit);
                }
            }
            if (cha.ccAssets) {
                for (const asset of cha.ccAssets) {
                    addUncleanable(asset.uri);
                }
            }
        }
    }

    if (db.modules) {
        for (const module of db.modules) {
            const assets = module.assets
            if (assets) {
                for (const asset of assets) {
                    addUncleanable(asset[1])
                }
            }
            if(module.icon){
                addUncleanable(module.icon)
            }
        }
    }

    if (db.personas) {
        db.personas.map((v) => {
            addUncleanable(v.icon);

            if(v.embeddedModule){
                const assets = v.embeddedModule.assets
                if (assets) {
                    for (const asset of assets) {
                        addUncleanable(asset[1])
                    }
                }
                if(v.embeddedModule.icon){
                    addUncleanable(v.embeddedModule.icon)
                }
            }
        });
    }

    if (db.characterOrder) {
        db.characterOrder.forEach((item) => {
            if (typeof item === 'object' && 'imgFile' in item) {
                addUncleanable(item.imgFile);
            }
        })
    }
    return Array.from(uncleanable);
}


/**
 * Replaces database resources with the provided replacer object.
 * 
 * @param {Database} db - The database object containing resources to be replaced.
 * @param {{[key: string]: string}} replacer - An object mapping original resource keys to their replacements.
 * @returns {Database} - The updated database object with replaced resources.
 */
export function replaceDbResources(db: Database, replacer: { [key: string]: string }): Database {
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
 * Checks and updates the character order in the database.
 * Ensures that all characters are properly ordered and removes any invalid entries.
 */
export function checkCharOrder() {
    DBState.db.characterOrder = DBState.db.characterOrder ?? []
    let ordered = []
    for (let i = 0; i < DBState.db.characterOrder.length; i++) {
        const folder = DBState.db.characterOrder[i]
        if (typeof (folder) !== 'string' && folder) {
            for (const f of folder.data) {
                ordered.push(f)
            }
        }
        if (typeof (folder) === 'string') {
            ordered.push(folder)
        }
    }

    let charIdList: string[] = []

    for (let i = 0; i < DBState.db.characters.length; i++) {
        const char = DBState.db.characters[i]
        const charId = char.chaId
        if (!char.trashTime) {
            charIdList.push(charId)
        }
        if (!ordered.includes(charId)) {
            if (charId !== '§temp' && charId !== '§playground' && !char.trashTime) {
                DBState.db.characterOrder.push(charId)
            }
        }
    }


    for (let i = 0; i < DBState.db.characterOrder.length; i++) {
        const data = DBState.db.characterOrder[i]
        if (typeof (data) !== 'string') {
            if (!data) {
                DBState.db.characterOrder.splice(i, 1)
                i--;
                continue
            }
            if (data.data.length === 0) {
                DBState.db.characterOrder.splice(i, 1)
                i--;
                continue
            }
            for (let i2 = 0; i2 < data.data.length; i2++) {
                const data2 = data.data[i2]
                if (!charIdList.includes(data2)) {
                    data.data.splice(i2, 1)
                    i2--;
                }
            }
            DBState.db.characterOrder[i] = data
        }
        else {
            if (!charIdList.includes(data)) {
                DBState.db.characterOrder.splice(i, 1)
                i--;
            }
        }
    }
}

/**
 * Retrieves the request log as a formatted string.
 * 
 * @returns {string} The formatted request log.
 */
export function getRequestLog() {
    let logString = ''
    const b = '\n\`\`\`json\n'
    const bend = '\n\`\`\`\n'

    for (const log of fetchLog) {
        logString += `## ${log.date}\n\n* Request URL\n\n${b}${log.url}${bend}\n\n* Request Body\n\n${b}${log.body}${bend}\n\n* Request Header\n\n${b}${log.header}${bend}\n\n`
            + `* Response Body\n\n${b}${log.response}${bend}\n\n* Response Success\n\n${b}${log.success}${bend}\n\n`
    }
    return logString
}

/**
 * Retrieves the fetch logs array.
 *
 * @returns {fetchLog[]} The fetch logs array.
 */
export function getFetchLogs() {
    return fetchLog
}

/**
 * Opens a URL in the appropriate environment.
 * 
 * @param {string} url - The URL to open.
 */
export function openURL(url: string) {
    if (isTauri) {
        open(url)
    }
    else {
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
 * A writer class for Tauri environment.
 */
export class TauriWriter {
    path: string
    firstWrite: boolean = true

    /**
     * Creates an instance of TauriWriter.
     * 
     * @param {string} path - The file path to write to.
     */
    constructor(path: string) {
        this.path = path
    }

    /**
     * Writes data to the file.
     * 
     * @param {Uint8Array} data - The data to write.
     */
    async write(data: Uint8Array) {
        await writeFile(this.path, data, {
            append: !this.firstWrite
        })
        this.firstWrite = false
    }

    /**
     * Closes the writer. (No operation for TauriWriter)
     */
    async close() {
        // do nothing
    }
}


/**
 * Class representing a local writer.
 */
export class LocalWriter {
    writer: WritableStreamDefaultWriter | TauriWriter

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
    write(data: Uint8Array): void {
        this.buf.append(data)
    }

    /**
     * Closes the writer. (No operation for VirtualWriter)
     */
    close(): void {
        // do nothing
    }
}

interface StreamedFetchHeaderData {
    type: 'headers',
    headers: { [key: string]: string },
    status: number
}

interface StreamedFetchEndData {
    type: 'end'
}

interface StreamedFetchErrorData {
    type: 'error',
    message: string
}

type StreamedFetchEvent = StreamedFetchHeaderData | StreamedFetchEndData | StreamedFetchErrorData

/**
 * A class to manage a buffer that can be appended to and deappended from.
 */
export class AppendableBuffer {
    deapended: number = 0
    #buffer: Uint8Array
    #byteLength: number = 0

    /**
     * Creates an instance of AppendableBuffer.
     */
    constructor() {
        this.#buffer = new Uint8Array(128)
    }

    get buffer(): Uint8Array {
        return this.#buffer.slice(0, this.#byteLength)
    }

    /**
     * Appends data to the buffer.
     * @param {Uint8Array} data - The data to append.
     */
    append(data: Uint8Array) {
        // New way (faster)
        const requiredLength = this.#byteLength + data.length
        if (this.#buffer.byteLength < requiredLength) {
            let newLength = this.#buffer.byteLength * 2
            while (newLength < requiredLength) {
                newLength *= 2
            }
            const newBuffer = new Uint8Array(newLength)
            newBuffer.set(this.#buffer)
            this.#buffer = newBuffer
        }
        this.#buffer.set(data, this.#byteLength)
        this.#byteLength += data.length
    }

    /**
     * Deappends a specified length from the buffer.
     * @param {number} length - The length to deappend.
     */
    deappend(length: number) {
        this.#buffer = this.#buffer.slice(length)
        this.deapended += length
        this.#byteLength -= length
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
        return this.#byteLength + this.deapended
    }

    /**
     * Clears the buffer.
     */
    clear() {
        this.#buffer = new Uint8Array(128)
        this.#byteLength = 0
        this.deapended = 0
    }
}

/**
 * Pipes the fetch log to a readable stream.
 * @param {number} fetchLogIndex - The index of the fetch log.
 * @param {ReadableStream<Uint8Array>} readableStream - The readable stream to pipe.
 * @returns {ReadableStream<Uint8Array>} - The new readable stream.
 */
const pipeFetchLog = (fetchLogIndex: number, readableStream: ReadableStream<Uint8Array>) => {
    const logEntry = fetchLog[fetchLogIndex]
    return pipeStreamWithTextLog(readableStream, (responseText) => {
        if (logEntry) {
            logEntry.response = responseText
        }
    })
}

function toNativeFetchError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error))
}

async function fetchViaTauriStream(url: string, arg: {
    body: Uint8Array,
    headers: { [key: string]: string },
    method: "POST" | "GET" | "PUT" | "DELETE",
    signal?: AbortSignal,
    requestTimeoutMs?: number,
}): Promise<Response> {
    if (arg.signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError')
    }

    const fetchId = uuidv4()
    let responseHeaders: { [key: string]: string } = {}
    let responseStatus = 400
    let headersSettled = false
    let settled = false
    let registered = false
    let cancelRequested = false
    let cancelSent = false
    let streamController: ReadableStreamDefaultController<Uint8Array>
    let resolveHeaders: () => void = () => {}
    let rejectHeaders: (error: Error) => void = () => {}

    const headersReady = new Promise<void>((resolve, reject) => {
        resolveHeaders = resolve
        rejectHeaders = reject
    })

    const cleanup = () => {
        arg.signal?.removeEventListener('abort', abortHandler)
    }

    const cancelNative = async () => {
        cancelRequested = true
        if (!registered || cancelSent) {
            return
        }
        cancelSent = true
        try {
            await invoke('cancel_streamed_fetch', { id: fetchId })
        } catch (error) {
            console.error('Failed to cancel native stream', error)
        }
    }

    const fail = (error: Error) => {
        if (settled) {
            return
        }
        settled = true
        cleanup()
        if (!headersSettled) {
            headersSettled = true
            rejectHeaders(error)
            return
        }
        streamController.error(error)
    }

    const abortHandler = () => {
        fail(new DOMException('The operation was aborted.', 'AbortError'))
        void cancelNative()
    }

    const channel = new Channel<StreamedFetchEvent | ArrayBuffer>()
    channel.onmessage = (message) => {
        if (settled) {
            return
        }

        if (message instanceof ArrayBuffer) {
            streamController.enqueue(new Uint8Array(message))
            return
        }

        if (ArrayBuffer.isView(message)) {
            streamController.enqueue(new Uint8Array(message.buffer, message.byteOffset, message.byteLength))
            return
        }

        if (message.type === 'headers') {
            if (!headersSettled) {
                responseHeaders = message.headers
                responseStatus = message.status
                headersSettled = true
                resolveHeaders()
            }
            return
        }

        if (message.type === 'error') {
            fail(new Error(message.message))
            return
        }

        if (!headersSettled) {
            fail(new Error('Native stream ended before response headers were received'))
            return
        }

        settled = true
        cleanup()
        streamController.close()
    }

    const readableStream = new ReadableStream<Uint8Array>({
        start(controller) {
            streamController = controller
        },
        async cancel() {
            if (!settled) {
                settled = true
                cleanup()
            }
            await cancelNative()
        }
    })

    arg.signal?.addEventListener('abort', abortHandler, { once: true })
    if (arg.signal?.aborted) {
        abortHandler()
    }

    const startRequest = invoke('streamed_fetch', {
        id: fetchId,
        url,
        headers: arg.headers,
        body: arg.body ? Buffer.from(arg.body).toString('base64') : '',
        method: arg.method,
        timeout_secs: arg.requestTimeoutMs ? Math.max(1, Math.ceil(arg.requestTimeoutMs / 1000)) : undefined,
        channel,
    }).then(async () => {
        registered = true
        if (cancelRequested) {
            await cancelNative()
        }
    }).catch((error) => {
        fail(toNativeFetchError(error))
    })

    await Promise.all([startRequest, headersReady])

    return new Response(readableStream, {
        headers: new Headers(responseHeaders),
        status: responseStatus,
    })
}

async function fetchViaProxyJobWs(url: string, arg: {
    body: Uint8Array,
    headers?: { [key: string]: string },
    method: "POST" | "GET" | "PUT" | "DELETE",
    signal?: AbortSignal,
    requestTimeoutMs?: number,
    chatId?: string,
    fetchLogIndex?: number | null
}): Promise<Response> {
    const auth = await getNodeServerProxyAuth();

    const requestSignal = arg.signal;
    const baseUrl = getProxyStreamJobBaseUrl();

    let jobId = '';
    const createRes = await fetch(`${baseUrl}/proxy-stream-jobs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'risu-auth': auth
        },
        body: JSON.stringify({
            url,
            method: arg.method,
            headers: arg.headers ?? {},
            bodyBase64: Buffer.from(arg.body).toString('base64'),
            timeoutMs: arg.requestTimeoutMs,
            heartbeatSec: defaultProxyJobHeartbeatSec
        }),
        signal: requestSignal
    });

    if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Proxy stream job creation failed: ${createRes.status} ${errText}`);
    }

    const created = await createRes.json() as { jobId?: string };
    if (!created.jobId) {
        throw new Error('Proxy stream job creation returned no jobId');
    }
    jobId = created.jobId;

    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${location.host}/proxy-stream-jobs/${encodeURIComponent(jobId)}/ws?risu-auth=${encodeURIComponent(auth)}`;

    let headersReady = false;
    let status = 200;
    let responseHeaders: HeadersInit = { 'content-type': 'text/event-stream' };
    let settled = false;
    let resolveHeaders: () => void = () => {};
    const waitHeaders = new Promise<void>((resolve) => {
        resolveHeaders = resolve;
    });
    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
    const encoder = new TextEncoder();

    const ws = new WebSocket(wsUrl);
    const readable = new ReadableStream<Uint8Array>({
        start(controller) {
            streamController = controller;
        },
        cancel() {
            try {
                ws.close();
            } catch {
                // no-op
            }
        }
    });
    const pipedReadable = arg.fetchLogIndex != null ? pipeFetchLog(arg.fetchLogIndex, readable) : readable;

    const ensureHeadersReady = () => {
        if (!headersReady) {
            headersReady = true;
            resolveHeaders();
        }
    };

    const closeAndEnd = () => {
        if (settled) {
            return;
        }
        settled = true;
        if (streamController) {
            try {
                streamController.close();
            } catch {
                // no-op
            }
        }
        try {
            ws.close();
        } catch {
            // no-op
        }
    };

    ws.onmessage = (event) => {
        const parsed = parseProxyJobWsEvent(typeof event.data === 'string' ? event.data : '');
        if (!parsed || !streamController) {
            return;
        }
        switch (parsed.type) {
            case 'job_accepted':
            case 'ping':
                return;
            case 'upstream_headers':
                status = parsed.status;
                responseHeaders = parsed.headers ?? {};
                ensureHeadersReady();
                return;
            case 'chunk':
                ensureHeadersReady();
                streamController.enqueue(decodeProxyJobWsChunk(parsed.dataBase64));
                return;
            case 'error': {
                status = parsed.status ?? 502;
                responseHeaders = { 'content-type': 'text/plain; charset=utf-8' };
                ensureHeadersReady();
                const msg = formatProxyStreamErrorMessage(parsed.status, parsed.message);
                streamController.enqueue(encoder.encode(msg));
                closeAndEnd();
                return;
            }
            case 'done':
                ensureHeadersReady();
                closeAndEnd();
                return;
        }
    };

    ws.onerror = () => {
        if (!streamController) {
            return;
        }
        status = 502;
        responseHeaders = { 'content-type': 'text/plain; charset=utf-8' };
        ensureHeadersReady();
        streamController.enqueue(encoder.encode('Proxy WebSocket stream error'));
        closeAndEnd();
    };

    ws.onclose = () => {
        if (!headersReady) {
            status = 502;
            responseHeaders = { 'content-type': 'text/plain; charset=utf-8' };
            ensureHeadersReady();
        }
        closeAndEnd();
    };

    const abortHandler = () => {
        status = 499;
        responseHeaders = { 'content-type': 'text/plain; charset=utf-8' };
        ensureHeadersReady();
        if (streamController && !settled) {
            streamController.enqueue(encoder.encode('Aborted'));
        }
        void fetch(`${baseUrl}/proxy-stream-jobs/${encodeURIComponent(jobId)}`, {
            method: 'DELETE',
            headers: {
                'risu-auth': auth
            }
        }).catch(() => {});
        closeAndEnd();
    };
    if (requestSignal?.aborted) {
        abortHandler();
    }
    else {
        requestSignal?.addEventListener('abort', abortHandler, { once: true });
    }

    await waitHeaders;
    requestSignal?.removeEventListener('abort', abortHandler);
    return new Response(pipedReadable, {
        status,
        headers: new Headers(responseHeaders)
    });
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
export async function fetchNative(url: string, arg: {
    body?: string | Uint8Array | ArrayBuffer,
    headers?: { [key: string]: string },
    method?: "POST" | "GET" | "PUT" | "DELETE",
    signal?: AbortSignal,
    useRisuTk?: boolean,
    chatId?: string
    interceptor?: string
    logFetch?: boolean
    requestTimeoutMs?: number
    networkRoute?: 'auto' | 'local_network'
}): Promise<Response> {

    const useInterceptor = !!arg.interceptor
    console.log(arg.body, 'body')
    if (arg.body === undefined && (arg.method === 'POST' || arg.method === 'PUT')) {
        throw new Error('Body is required for POST and PUT requests')
    }

    arg.method = arg.method ?? 'POST'

    let headers = arg.headers ?? {}
    let realBody: Uint8Array

    if (arg.method === 'GET' || arg.method === 'DELETE') {
        realBody = undefined
    }
    else if (typeof arg.body === 'string') {
        let body: string = arg.body
        if(useInterceptor) {
            for (const interceptor of bodyIntercepterStore) {
                try {
                    body = await interceptor.callback(body, arg.interceptor) || body
                }
                catch (e) {
                    console.error(e)
                }
            }
        }
        realBody = new TextEncoder().encode(body)
    }
    else if (arg.body instanceof Uint8Array) {
        realBody = arg.body
    }
    else if (arg.body instanceof ArrayBuffer) {
        realBody = new Uint8Array(arg.body)
    }
    else {
        throw new Error('Invalid body type')
    }

    const db = getDatabase()
    const useLocalNetworkRoute = arg.networkRoute === 'local_network' && isLocalNetworkUrl(url)
    if (useLocalNetworkRoute && !isTauri && !isNodeServer) {
        throw new Error(webLocalNetworkBlockedMessage)
    }
    let throughProxy = (!isTauri) && (!isNodeServer) && (!db.usePlainFetch)
    if (useLocalNetworkRoute) {
        if (isNodeServer) {
            throughProxy = true
        }
        else if (isTauri) {
            throughProxy = false
        }
    }
    const timeoutSignal = buildTimeoutSignal(arg.signal, arg.requestTimeoutMs)
    const requestSignal = timeoutSignal.signal
    const shouldLogFetch = arg.logFetch ?? true
    let fetchLogIndex: number | null = null
    if (shouldLogFetch) {
        fetchLogIndex = addFetchLog({
            body: new TextDecoder().decode(realBody),
            headers: arg.headers,
            response: 'Streamed Fetch',
            success: true,
            url: url,
            resType: 'stream',
            chatId: arg.chatId,
        })
    }
    try {
        if (window.userScriptFetch && !throughProxy) {
            return await window.userScriptFetch(url, {
            body: realBody as any,
            headers: headers,
            method: arg.method,
            signal: requestSignal
        })
        }
        else if (isTauri) {
            const response = await fetchViaTauriStream(url, {
                body: realBody,
                headers,
                method: arg.method,
                signal: arg.signal,
                requestTimeoutMs: arg.requestTimeoutMs,
            })

            if (shouldLogFetch && fetchLogIndex !== null && response.body) {
                return new Response(pipeFetchLog(fetchLogIndex, response.body), {
                    headers: response.headers,
                    status: response.status,
                })
            }

            return response
        }
    else if (throughProxy) {
        const useProxyJobWs = isNodeServer
            && arg.interceptor === 'openai_streaming'
            && arg.method === 'POST'
            && useLocalNetworkRoute;
        const nodeProxyAuth = isNodeServer ? await getNodeServerProxyAuth() : null;

        if (useProxyJobWs) {
            try {
                return await fetchViaProxyJobWs(url, {
                    body: realBody,
                    headers,
                    method: arg.method,
                    signal: requestSignal,
                    requestTimeoutMs: arg.requestTimeoutMs,
                    chatId: arg.chatId,
                    fetchLogIndex
                });
            } catch (wsErr) {
                console.warn('[ProxyJobWS] fallback to /proxy2 due to error:', wsErr);
            }
        }

        const r = await fetch(getProxy2Url(), {
            body: realBody as any,
            headers: arg.useRisuTk ? {
                "risu-header": encodeURIComponent(JSON.stringify(headers)),
                "risu-url": encodeURIComponent(url),
                "Content-Type": "application/json",
                "x-risu-tk": "use",
                ...(arg.requestTimeoutMs && { "risu-timeout-ms": Math.max(1, Math.floor(arg.requestTimeoutMs)).toString() }),
                ...(nodeProxyAuth ? { "risu-auth": nodeProxyAuth } : {}),
                ...(DBState?.db?.requestLocation && { "risu-location": DBState.db.requestLocation }),
            } : {
                "risu-header": encodeURIComponent(JSON.stringify(headers)),
                "risu-url": encodeURIComponent(url),
                "Content-Type": "application/json",
                ...(arg.requestTimeoutMs && { "risu-timeout-ms": Math.max(1, Math.floor(arg.requestTimeoutMs)).toString() }),
                ...(nodeProxyAuth ? { "risu-auth": nodeProxyAuth } : {}),
                ...(DBState?.db?.requestLocation && { "risu-location": DBState.db.requestLocation }),
            },
            method: arg.method,
            signal: requestSignal
        })

        return new Response(r.body, {
            headers: r.headers,
            status: r.status
        })
    }
    else {
        return await fetch(url, {
            body: realBody as any,
            headers: headers,
            method: arg.method,
            signal: requestSignal,
        })
    }
    } finally {
        timeoutSignal.cleanup()
    }
}

/**
 * Converts a ReadableStream of Uint8Array to a text string.
 * 
 * @param {ReadableStream<Uint8Array>} stream - The readable stream to convert.
 * @returns {Promise<string>} A promise that resolves to the text content of the stream.
 */
export function textifyReadableStream(stream: ReadableStream<Uint8Array>) {
    return new Response(stream).text()
}

/**
 * Toggles the fullscreen mode of the document.
 * If the document is currently in fullscreen mode, it exits fullscreen.
 * If the document is not in fullscreen mode, it requests fullscreen with navigation UI hidden.
 */
export function toggleFullscreen() {
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
export function trimNonLatin(data: string) {
    return data.replace(/[^\x00-\x7F]/g, "")
        .replace(/ +/g, ' ')
        .trim()
}

/**
 * A class that provides a blank writer implementation.
 * 
 * This class is used to provide a no-op implementation of a writer, making it compatible with other writer interfaces.
 */
export class BlankWriter {
    constructor() {
    }

    /**
     * Initializes the writer.
     * 
     * This method does nothing and is provided for compatibility with other writer interfaces.
     */
    async init() {
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
    async write(key: string, data: Uint8Array | string) {
        //do nothing, just to make compatible with other writer
    }

    /**
     * Ends the writing process.
     * 
     * This method does nothing and is provided for compatibility with other writer interfaces.
     */
    async end() {
        //do nothing, just to make compatible with other writer
    }
}

export async function loadInternalBackup() {

    const keys = isTauri ? (await readDir('database', { baseDir: BaseDirectory.AppData })).map((v) => {
        return v.name
    }) : (await forageStorage.keys())
    let internalBackups: string[] = []
    for (const key of keys) {
        if (key.includes('dbbackup-')) {
            internalBackups.push(key)
        }
    }

    const selectOptions = [
        'Cancel',
        ...(internalBackups.map((a) => {
            return (new Date(parseInt(a.replace('database/dbbackup-', '').replace('dbbackup-', '')) * 100)).toLocaleString()
        }))
    ]

    const alertResult = parseInt(
        await alertSelect(selectOptions)
    ) - 1

    if (alertResult === -1) {
        return
    }

    const selectedBackup = internalBackups[alertResult]

    const data = isTauri ? (
        await readFile('database/' + selectedBackup, { baseDir: BaseDirectory.AppData })
    ) : (await forageStorage.getItem(selectedBackup))

    setDatabase(
        await decodeRisuSave(Buffer.from(data) as unknown as Uint8Array)
    )

    alertNormal('Loaded backup')



}

/**
 * A debugging class for performance measurement.
*/

export class PerformanceDebugger {
    kv: { [key: string]: number[] } = {}
    startTime: number
    endTime: number

    /**
     * Starts the timing measurement.
    */
    start() {
        this.startTime = performance.now()
    }

    /**
     * Ends the timing measurement and records the time difference.
     * 
     * @param {string} key - The key to associate with the recorded time.
    */
    endAndRecord(key: string) {
        this.endTime = performance.now()
        if (!this.kv[key]) {
            this.kv[key] = []
        }
        this.kv[key].push(this.endTime - this.startTime)
    }

    /**
     * Ends the timing measurement, records the time difference, and starts a new timing measurement.
     * 
     * @param {string} key - The key to associate with the recorded time.
    */
    endAndRecordAndStart(key: string) {
        this.endAndRecord(key)
        this.start()
    }

    /**
     * Logs the average time for each key to the console.
    */
    log() {
        let table: { [key: string]: number } = {}

        for (const key in this.kv) {
            table[key] = this.kv[key].reduce((a, b) => a + b, 0) / this.kv[key].length
        }


        console.table(table)
    }

    combine(other: PerformanceDebugger) {
        for (const key in other.kv) {
            if (!this.kv[key]) {
                this.kv[key] = []
            }
            this.kv[key].push(...other.kv[key])
        }
    }
}

export function getLanguageCodes() {
    let languageCodes: {
        code: string
        name: string
    }[] = []

    for (let i = 0x41; i <= 0x5A; i++) {
        for (let j = 0x41; j <= 0x5A; j++) {
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

export function getVersionString(): string {
    let versionString = appVer
    if(appSubVer) {
        versionString += '-' + appSubVer
    }
    if (import.meta.env.VITE_RISU_NIGHTLY_BUILD === 'TRUE') {
        versionString = 'Nightly Build ' + import.meta.env.VITE_RISU_BUILD_TIME
    }
    if (window.location.hostname === 'stable.risuai.xyz') {
        versionString += ' (Stable)';
    }
    return versionString
}

export function toGetter<T extends object>(
    getterFn: () => T,
    args?: {
        //blocks this.children from being accessed
        restrictChildren:string[]
    }
): T {

    const dummyTarget = () => { };

    return new Proxy(dummyTarget, {
        get(target, prop, receiver) {

            const realInstance = getterFn();
            
            if (args?.restrictChildren && args.restrictChildren.includes(prop as string)) {
                throw new Error(`Access to property '${String(prop)}' is restricted`);
            }

            if (realInstance === null || realInstance === undefined) {
                return (realInstance as any)[prop];
            }

            const value = Reflect.get(realInstance as object, prop);

            if (typeof value === 'function') {
                return value.bind(realInstance);
            }

            return value;
        },

        set(target, prop, value, receiver) {

            if(args?.restrictChildren && args.restrictChildren.includes(prop as string)) {
                throw new Error(`Access to property '${String(prop)}' is restricted`);
            }
            const realInstance = getterFn();
            return Reflect.set(realInstance as object, prop, value, receiver);
        },

        has(target, prop) {
            const realInstance = getterFn();
            return Reflect.has(realInstance as object, prop);
        },

        ownKeys(target) {
            const realInstance = getterFn();
            return Reflect.ownKeys(realInstance as object);
        },

        construct(target, argArray, newTarget) {
            const realInstance = getterFn() as any;
            return new realInstance(...argArray);
        },

        deleteProperty(target, prop) {
            const realInstance = getterFn();
            return Reflect.deleteProperty(realInstance as object, prop);
        },

        getPrototypeOf() {
            const realInstance = getterFn();
            return Reflect.getPrototypeOf(realInstance as object);
        }
    }) as unknown as T;
}

const countriesWithAiLaw = new Set<string>([

    // EU
    // AI Act
    // https://artificialintelligenceact.eu/
    
    "AT",
    "BE",
    "BG",
    "HR",
    "CY",
    "CZ",
    "DK",
    "EE",
    "FI",
    "FR",
    "DE",
    "EL",
    "GR",
    "HU",
    "IE",
    "IT",
    "LV",
    "LT",
    "LU",
    "MT",
    "NL",
    "PL",
    "PT",
    "RO",
    "SK",
    "SI",
    "ES",
    "SE",

    //China 
    //Measures for Labeling of AI-Generated Synthetic Content
    // 关于印发《人工智能生成合成内容标识办法》的通知 
    // https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm
    "CN",

    //Although CN Law doesn't apply, just in case
    "HK",
    "MO",

    //TW isn't under mainland china jurisdiction
    //de facto, de jure in TW law, unlike HK and MO,
    //So we don't include it for now
    //"TW", 

    // Republic of Korea
    // AI Basic Act
    // 인공지능 발전과 신뢰 기반 조성 등에 관한 기본법
    // https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%9D%B8%EA%B3%B5%EC%A7%80%EB%8A%A5%20%EB%B0%9C%EC%A0%84%EA%B3%BC%20%EC%8B%A0%EB%A2%B0%20%EA%B8%B0%EB%B0%98%20%EC%A1%B0%EC%84%B1%20%EB%93%B1%EC%97%90%20%EA%B4%80%ED%95%9C%20%EA%B8%B0%EB%B3%B8%EB%B2%95/(20676,20250121)
    "KR",

    // Vietnam
    // Digital Tech Law
    // Luật Công nghệ số
    "VN",

])

export function aiLawApplies(): boolean {

    //TODO: implement actual logic
    //lets now assume it always applies
    //so we don't have legal issues later

    return true
}

export function aiWatermarkingLawApplies(): boolean {

    //TODO: implement actual logic
    //lets now assume it is false for now,
    //becuase very few countries have it for now
    return false
}

export const chatFoldedState = $state<{
    data: null| {
        targetCharacterId: string,
        targetChatId: string,
        targetMessageId: string,
    }
}>({
    data: null
})

//Since its exported, we cannot use $derived here
export let chatFoldedStateMessageIndex = $state({
    index: -1
})

$effect.root(() => {
    $effect(() => {
        if(!chatFoldedState.data){
            return
        }
        const char = DBState.db.characters[selIdState.selId]
        const chat = char.chats[char.chatPage]
        if(chatFoldedState.data.targetCharacterId !== char.chaId){
            chatFoldedState.data = null
        }
        if(chatFoldedState.data.targetChatId !== chat.id){
            chatFoldedState.data = null
        }
    })

    $effect(() => {
        if(chatFoldedState.data === null){
            chatFoldedStateMessageIndex.index = -1
            return
        }
        const char = DBState.db.characters[selIdState.selId]
        const chat = char.chats[char.chatPage]
        const messageIndex = chat.message.findIndex((v) => {
            return chatFoldedState.data?.targetMessageId === v.chatId
        })
        if(messageIndex === -1){
            console.warn('Target message for folding id' + chatFoldedState.data?.targetMessageId + ' not found')
            chatFoldedStateMessageIndex.index = -1
            return
        }
        chatFoldedStateMessageIndex.index = messageIndex
    })
})

export function foldChatToMessage(targetMessageIdOrIndex: string | number) {
    let targetMessageId = ''
    if (typeof targetMessageIdOrIndex === 'number') {
        const char = getCurrentCharacter()
        const chat = char.chats[char.chatPage]
        const message = chat.message[targetMessageIdOrIndex]
        targetMessageId = message.chatId
    }
    else{
        targetMessageId = targetMessageIdOrIndex
    }
    const char = getCurrentCharacter()
    const chat = char.chats[char.chatPage]
    chatFoldedState.data = {
        targetCharacterId: char.chaId,
        targetChatId: chat.id,
        targetMessageId: targetMessageId,
    }
}

export function changeChatTo(IdOrIndex: string | number) {
    let index = -1
    if (typeof IdOrIndex === 'number') {
        index = IdOrIndex
    }

    if (typeof IdOrIndex === 'string') {
        const currentCharacter = getCurrentCharacter()
        index = currentCharacter.chats.findIndex((v) => {
            return v.id === IdOrIndex
        })
    }

    if(index === -1){
        return
    }

    DBState.db.characters[selIdState.selId].chatPage = index
    ReloadGUIPointer.set(Math.random())
}

export function createChatCopyName(originalName: string,type:'Copy'|'Branch'): string {
    let name = originalName.replaceAll(/\(((Copy|Branch)( \d+)?)\)$/g, '').trim()
    let copyIndex = 1
    let newName = `${name} (${type})`
    const char = getCurrentCharacter()
    while (char.chats.find((v) => v.name === newName)) {
        copyIndex++
        newName = `${name} (${type} ${copyIndex})`
    }
    return newName
}

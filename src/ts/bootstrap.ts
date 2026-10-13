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
import { v4 as uuidv4 } from 'uuid';
import { get } from "svelte/store";
import { setDatabase, defaultSdDataFunc, getDatabase } from "./storage/database.svelte";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { checkRisuUpdate } from "./update";
import { MobileGUI, botMakerMode, selectedCharID, loadedStore, DBState, LoadingStatusState } from "./stores.svelte";
import { loadPlugins } from "./plugins/plugins.svelte";
import { alertError, alertMd, alertTOS, waitAlert, alertConfirm, alertInput } from "./alert";
import { checkDriverInit } from "./drive/drive";
import { characterURLImport } from "./characterCards";
import { defaultJailbreak, defaultMainPrompt, oldJailbreak, oldMainPrompt } from "./storage/defaultPrompts";
import { loadRisuAccountData } from "./drive/accounter";
import { decodeRisuSave, encodeRisuSaveLegacy } from "./storage/risuSave";
import { updateAnimationSpeed } from "./gui/animation";
import { updateColorScheme, updateTextThemeAndCSS } from "./gui/colorscheme";
import { autoServerBackup } from "./kei/backup";
import { language } from "src/lang";
import { startObserveDom } from "./observer.svelte";
import { updateGuisize } from "./gui/guisize";
import { updateLorebooks } from "./characters";
import { initMobileGesture } from "./hotkey";
import { moduleUpdate } from "./process/modules";
import type { AccountStorage } from "./storage/accountStorage";
import { makeColdData } from "./process/coldstorage.svelte";
import { getRemoteSaveCleanupAction, getRemoteSavePayloadName } from "./storage/remoteSaveCleanup";
import {
    forageStorage,
    saveDb,
    getDbBackups,
    getUncleanables,
    getBasename,
    setUsingSw,
    checkCharOrder
} from "./globalApi.svelte";
import { isTauri } from "./platform";
import { registerModelDynamic } from "./model/modellist";
import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";

const appWindow = isTauri ? getCurrentWebviewWindow() : null

/**
 * Loads the application data.
 */
export async function loadData() {
    const loaded = get(loadedStore)
    if (!loaded) {
        try {
            if (isTauri) {
                LoadingStatusState.text = "Checking Files..."
                appWindow.maximize()
                if (!await exists('', { baseDir: BaseDirectory.AppData })) {
                    await mkdir('', { baseDir: BaseDirectory.AppData })
                }
                if (!await exists('database', { baseDir: BaseDirectory.AppData })) {
                    await mkdir('database', { baseDir: BaseDirectory.AppData })
                }
                if (!await exists('assets', { baseDir: BaseDirectory.AppData })) {
                    await mkdir('assets', { baseDir: BaseDirectory.AppData })
                }
                if (!await exists('database/database.bin', { baseDir: BaseDirectory.AppData })) {
                    await writeFile('database/database.bin', encodeRisuSaveLegacy({}), { baseDir: BaseDirectory.AppData });
                }
                const appDataDirPath = await appDataDir();
                try {
                    LoadingStatusState.text = "Reading Save File..."
                    const dbPath = await join(appDataDirPath, 'database/database.bin');
                    const assetUrl = convertFileSrc(dbPath);
                    const response = await fetch(assetUrl);
                    if (!response.ok) {
                        throw new Error(`Failed to load database: ${response.status}`);
                    }
                    const readed = new Uint8Array(await response.arrayBuffer());
                    LoadingStatusState.text = "Cleaning Unnecessary Files..."
                    getDbBackups() //this also cleans the backups
                    LoadingStatusState.text = "Decoding Save File..."
                    const decoded = await decodeRisuSave(readed)
                    setDatabase(decoded)
                } catch (error) {
                    LoadingStatusState.text = "Reading Backup Files..."
                    const backups = await getDbBackups()
                    let backupLoaded = false
                    for (const backup of backups) {
                        if (!backupLoaded) {
                            try {
                                LoadingStatusState.text = `Reading Backup File ${backup}...`
                                const backupPath = await join(appDataDirPath, `database/dbbackup-${backup}.bin`);
                                const backupAssetUrl = convertFileSrc(backupPath);
                                const backupResponse = await fetch(backupAssetUrl);
                                if (!backupResponse.ok) {
                                    throw new Error(`Failed to load backup ${backup}: ${backupResponse.status}`);
                                }
                                const backupData = new Uint8Array(await backupResponse.arrayBuffer());
                                setDatabase(
                                    await decodeRisuSave(backupData)
                                )
                                backupLoaded = true
                            } catch (error) {
                                console.error(error)
                            }
                        }
                    }
                    if (!backupLoaded) {
                        throw "Your save file is corrupted"
                    }
                }
                LoadingStatusState.text = "Checking Update..."
                await checkRisuUpdate()
                await changeFullscreen()

            }
            else {
                await forageStorage.Init()

                LoadingStatusState.text = "Loading Local Save File..."
                let gotStorage: Uint8Array = await forageStorage.getItem('database/database.bin') as unknown as Uint8Array
                LoadingStatusState.text = "Decoding Local Save File..."
                if (checkNullish(gotStorage)) {
                    gotStorage = encodeRisuSaveLegacy({})
                    await forageStorage.setItem('database/database.bin', gotStorage)
                }
                try {
                    const decoded = await decodeRisuSave(gotStorage)
                    console.log(decoded)
                    setDatabase(decoded)
                } catch (error) {
                    console.error(error)
                    const backups = await getDbBackups()
                    let backupLoaded = false
                    for (const backup of backups) {
                        try {
                            LoadingStatusState.text = `Reading Backup File ${backup}...`
                            const backupData: Uint8Array = await forageStorage.getItem(`database/dbbackup-${backup}.bin`) as unknown as Uint8Array
                            setDatabase(
                                await decodeRisuSave(backupData)
                            )
                            backupLoaded = true
                            // Backups are newest first; stop at the newest one that loads
                            break
                        } catch (error) { }
                    }
                    if (!backupLoaded) {
                        throw "Forage: Your save file is corrupted"
                    }
                }

                if (await forageStorage.checkAccountSync()) {
                    LoadingStatusState.text = "Checking Account Sync..."
                    let gotStorage: Uint8Array = await (forageStorage.realStorage as AccountStorage).getItem('database/database.bin', (v) => {
                        LoadingStatusState.text = `Loading Remote Save File ${(v * 100).toFixed(2)}%`
                    })
                    if (checkNullish(gotStorage)) {
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
                        for (const backup of backups) {
                            try {
                                LoadingStatusState.text = `Reading Backup File ${backup}...`
                                const backupData: Uint8Array = await forageStorage.getItem(`database/dbbackup-${backup}.bin`) as unknown as Uint8Array
                                setDatabase(
                                    await decodeRisuSave(backupData)
                                )
                                backupLoaded = true
                                break
                            } catch (error) { }
                        }
                        if (!backupLoaded) {
                            // throw "Your save file is corrupted"
                            await autoServerBackup()
                            await sleep(10000)
                        }
                    }
                }
                LoadingStatusState.text = "Rechecking Account Sync..."
                await forageStorage.checkAccountSync()
                LoadingStatusState.text = "Checking Drive Sync..."
                const isDriverMode = await checkDriverInit()
                if (isDriverMode) {
                    return
                }
                LoadingStatusState.text = "Checking Service Worker..."
                if (navigator.serviceWorker) {
                    setUsingSw(true)
                    await registerSw()
                }
                else {
                    setUsingSw(false)
                }
                if (getDatabase().didFirstSetup) {
                    characterURLImport()
                }
            }
            LoadingStatusState.text = "Loading Plugins..."
            try {
                await loadPlugins()
            } catch (error) { }
            if (getDatabase().account) {
                LoadingStatusState.text = "Checking Account Data..."
                try {
                    await loadRisuAccountData()
                } catch (error) { }
            }
            try {
                //@ts-expect-error navigator.standalone is iOS Safari non-standard property, not in Navigator interface
                const isInStandaloneMode = (window.matchMedia('(display-mode: standalone)').matches) || (window.navigator.standalone) || document.referrer.includes('android-app://');
                if (isInStandaloneMode) {
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
            if (!localStorage.getItem('nightlyWarned') && import.meta.env.VITE_RISU_NIGHTLY_BUILD === 'TRUE') {
                alertMd(language.nightlyWarning)
                await waitAlert()
                localStorage.setItem('nightlyWarned', 'true')
            }
            if (db.botSettingAtStart) {
                botMakerMode.set(true)
            }
            if ((db.betaMobileGUI && window.innerWidth <= 800) || import.meta.env.VITE_RISU_LITE === 'TRUE') {
                initMobileGesture()
                MobileGUI.set(true)
            }
            await makeColdData()
            loadedStore.set(true)
            selectedCharID.set(-1)
            startObserveDom()
            assignIds()
            registerModelDynamic()
            saveDb()
            moduleUpdate()
            cleanChunks()
            alertTOS().then((a) => {
                if (a === false) {
                    location.reload()
                }
            })
            
        } catch (error) {
            alertError(error)
        }
    }
}


/**
 * Registers the service worker and initializes it.
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
 * Updates the error handling by adding custom handlers for errors and unhandled promise rejections.
 */
function updateErrorHandling() {
    const errorHandler = (event: ErrorEvent) => {
        console.error(event.error);
        if(!(event.error.target instanceof Worker)){
            alertError(event.error);            
        }
    };
    const rejectHandler = (event: PromiseRejectionEvent) => {
        console.error(event.reason);
        alertError(event.reason);
    };
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectHandler);
}

/**
 * Updates the height mode of the document based on the value stored in the database.
 */
function updateHeightMode() {
    const db = getDatabase()
    const root = document.querySelector(':root') as HTMLElement;
    switch (db.heightMode) {
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
 * Checks and updates the database format to the latest version.
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

    db.modules = await Promise.all((db.modules ?? []).map(async (v) => {
        if (v?.lorebook) {
            if (!Array.isArray(v.lorebook)) {
                console.error('Critical: Invalid lorebook format detected in module');
                console.error('Module data:', JSON.stringify(v, null, 2));
                
                // Alert user about corrupted data
                alertError(language.bootstrap.dataCorruptionDetected(v.name || 'Unknown', typeof v.lorebook));
                await waitAlert();
                
                // Ask if user wants to report the issue
                const shouldReport = await alertConfirm(language.bootstrap.reportErrorQuestion);
                
                if (shouldReport) {
                    try {
                        // Collect diagnostic information (without personal data)
                        const diagnosticInfo = {
                            timestamp: new Date().toISOString(),
                            moduleName: v.name || 'Unknown',
                            lorebookType: typeof v.lorebook,
                            lorebookValue: JSON.stringify(v.lorebook).substring(0, 500), // First 500 chars only
                            isArray: Array.isArray(v.lorebook),
                            keys: v.lorebook ? Object.keys(v.lorebook).join(', ') : 'N/A',
                            formatVersion: db.formatversion || 'Unknown'
                        };
                        
                        // Show the diagnostic info and allow user to copy or send
                        const reportData = JSON.stringify(diagnosticInfo, null, 2);
                        await alertMd(language.bootstrap.diagnosticInformation(reportData));
                        await waitAlert();
                        
                        console.log('Diagnostic information for developers:', diagnosticInfo);
                    } catch (reportError) {
                        console.error('Failed to generate diagnostic report:', reportError);
                    }
                }
                
                // Ask if user wants to reset the data
                const shouldReset = await alertConfirm(language.bootstrap.resetLorebookQuestion);
                
                if (shouldReset) {
                    v.lorebook = [];
                    console.log('Lorebook reset to empty array by user choice');
                } else {
                    console.warn('User chose to keep corrupted lorebook data');
                }
            } else {
                v.lorebook = updateLorebooks(v.lorebook);
            }
        }
        return v
    }));
    
    db.modules = db.modules.filter((v) => {
        return v !== null && v !== undefined;
    });

    db.personas = (db.personas ?? []).map((v) => {
        v.id ??= uuidv4()
        return v
    }).filter((v) => {
        return v !== null && v !== undefined;
    });

    if (!db.formatversion) {
        function checkClean(data: string) {

            if (data.startsWith('assets') || (data.length < 3)) {
                return data
            }
            else {
                const d = 'assets/' + (data.replace(/\\/g, '/').split('assets/')[1])
                if (!d) {
                    return data
                }
                return d;
            }
        }

        db.customBackground = checkClean(db.customBackground);
        db.userIcon = checkClean(db.userIcon);

        for (let i = 0; i < db.characters.length; i++) {
            if (db.characters[i].image) {
                db.characters[i].image = checkClean(db.characters[i].image);
            }
            if (db.characters[i].emotionImages) {
                for (let i2 = 0; i2 < db.characters[i].emotionImages.length; i2++) {
                    if (db.characters[i].emotionImages[i2] && db.characters[i].emotionImages[i2].length >= 2) {
                        db.characters[i].emotionImages[i2][1] = checkClean(db.characters[i].emotionImages[i2][1]);
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
    if (db.formatversion < 5) {
        if (db.loreBookToken < 8000) {
            db.loreBookToken = 8000;
        }
        db.formatversion = 5;
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
 * Purges chunks of data that are not needed.
 */
async function cleanChunks(options:{
    cleanColdStorage?: boolean
} = {}) {
    const cleanColdStorage = options.cleanColdStorage ?? false
    const db = getDatabase()
    if (db.account?.useSync) {
        return
    }
    if(db.coldstorage && !cleanColdStorage){
        return
    }

    const uncleanable = new Set(await getUncleanables(db))
    if (isTauri) {
        const assets = await readDir('assets', { baseDir: BaseDirectory.AppData })
        console.log(assets)
        for (const asset of assets) {
            try {
                const n = getBasename(asset.name)
                if (!uncleanable.has(n)) {
                    await remove('assets/' + asset.name, { baseDir: BaseDirectory.AppData })
                }
            } catch (error) {
                console.log('error', asset.name)
            }
        }

        
        if(!await exists('remotes', { baseDir: BaseDirectory.AppData })) {
            await mkdir('remotes', { baseDir: BaseDirectory.AppData })
        }

        const remotes = await readDir('remotes', { baseDir: BaseDirectory.AppData })

        const remoteUncleanables = new Set<string>(
            db.characters.map((v) => v.chaId)
        )
        for (const remote of remotes) {
            try {
                const remoteFileName = getBasename(remote.name)
                const remotePayloadName = getRemoteSavePayloadName(remoteFileName)
                if(!remotePayloadName){
                    continue
                }
                const fexists = remoteUncleanables.has(remotePayloadName)
                if(!fexists){

                    const metaPath = 'remotes/' + remote.name + '.meta'
                    let metaExists = false
                    let metaLastUsed:unknown
                    try {
                        metaExists = await exists(metaPath, { baseDir: BaseDirectory.AppData })
                        if (metaExists) {
                            const meta = await readFile(metaPath, { baseDir: BaseDirectory.AppData })
                            const metaJson = JSON.parse(new TextDecoder().decode(meta))
                            metaLastUsed = metaJson.lastUsed
                        }
                    } catch (error) {}

                    const cleanupAction = getRemoteSaveCleanupAction({
                        fileName: remoteFileName,
                        activeCharacterIds: remoteUncleanables,
                        hasMeta: metaExists,
                        metaLastUsed
                    })
                    if(cleanupAction === 'create-meta'){
                        const metaJson = {
                            lastUsed: Date.now()
                        }
                        await writeFile(metaPath, new TextEncoder().encode(JSON.stringify(metaJson)), { baseDir: BaseDirectory.AppData })
                    }
                    else if(cleanupAction === 'delete'){
                        await remove('remotes/' + remote.name, { baseDir: BaseDirectory.AppData })
                        await remove(metaPath, { baseDir: BaseDirectory.AppData })
                    }
                }
            } catch (error) {
                console.log('error', remote.name)
            }
        }
    }
    else {
        const indexes = await forageStorage.keys()
        const characterIds = new Set<string>(
            db.characters.map((v) => v.chaId)
        )
        for (const asset of indexes) {
            if (asset.startsWith('assets/')) {
                const n = getBasename(asset)
                if(!uncleanable.has(n)) {
                    await forageStorage.removeItem(asset)
                }
            }
            else if (asset.endsWith('.meta')){
                continue
            }
            else if (asset.startsWith('remotes/')) {
                const name = getBasename(asset).slice(0, -10) //remove .local.bin
                const exists = characterIds.has(name)
                if(!exists){
                    let okayToDelete = false
                    try {
                        const metaPath = asset + '.meta'
                        const metaExists = (await forageStorage.keys()).includes(metaPath)
                        if (metaExists) {
                            const metaData: Uint8Array = await forageStorage.getItem(metaPath) as unknown as Uint8Array
                            const metaJson = JSON.parse(new TextDecoder().decode(metaData))
                            const lastUsed = metaJson.lastUsed as number
                            if(Date.now() - lastUsed > 1000 * 60 * 60 * 24 * 7) { //not used for 7 days
                                okayToDelete = true
                            }
                        }
                        else{
                            //write meta for next time
                            const metaJson = {
                                lastUsed: Date.now()
                            }
                            await forageStorage.setItem(metaPath, new TextEncoder().encode(JSON.stringify(metaJson)))
                        }
                    } catch (error) {}
                    if (okayToDelete) {
                        await forageStorage.removeItem(asset)
                    }
                }
            }
        }
    }
}


/**
 * Assigns unique IDs to characters and chats.
 */
function assignIds() {
    if (!DBState?.db?.characters) {
        return
    }
    const assignedIds = new Set<string>()
    for (let i = 0; i < DBState.db.characters.length; i++) {
        const cha = DBState.db.characters[i]
        if (!cha.chaId) {
            cha.chaId = uuidv4()
        }
        if (assignedIds.has(cha.chaId)) {
            console.warn(`Duplicate chaId found: ${cha.chaId}. Assigning new ID.`);
            cha.chaId = uuidv4();
        }
        assignedIds.add(cha.chaId)
        for (let i2 = 0; i2 < cha.chats.length; i2++) {
            const chat = cha.chats[i2]
            if (!chat.id) {
                chat.id = uuidv4()
            }
            if (assignedIds.has(chat.id)) {
                console.warn(`Duplicate chat ID found: ${chat.id}. Assigning new ID.`);
                chat.id = uuidv4();
            }
            assignedIds.add(chat.id)
        }
    }
}

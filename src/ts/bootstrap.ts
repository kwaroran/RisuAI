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
import { setDatabase, type Database, defaultSdDataFunc, getDatabase } from "./storage/database.svelte";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { checkRisuUpdate } from "./update";
import { MobileGUI, botMakerMode, selectedCharID, loadedStore, DBState, LoadingStatusState } from "./stores.svelte";
import { loadPlugins } from "./plugins/plugins";
import { alertError, alertMd, alertTOS, waitAlert } from "./alert";
import { checkDriverInit } from "./drive/drive";
import { characterURLImport } from "./characterCards";
import { defaultJailbreak, defaultMainPrompt, oldJailbreak, oldMainPrompt } from "./storage/defaultPrompts";
import { loadRisuAccountData } from "./drive/accounter";
import { decodeRisuSave, encodeRisuSaveLegacy } from "./storage/risuSave";
import { updateAnimationSpeed } from "./gui/animation";
import { updateColorScheme, updateTextThemeAndCSS } from "./gui/colorscheme";
import { autoServerBackup } from "./kei/backup";
import { Capacitor } from '@capacitor/core';
import { language } from "src/lang";
import { startObserveDom } from "./observer.svelte";
import { updateGuisize } from "./gui/guisize";
import { updateLorebooks } from "./characters";
import { initMobileGesture } from "./hotkey";
import { moduleUpdate } from "./process/modules";
import type { AccountStorage } from "./storage/accountStorage";
import { makeColdData } from "./process/coldstorage.svelte";
import {
    isTauri,
    forageStorage,
    isNodeServer,
    saveDb,
    getDbBackups,
    getUnpargeables,
    getBasename,
    setUsingSw,
    checkCharOrder
} from "./globalApi.svelte";

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
                try {
                    LoadingStatusState.text = "Reading Save File..."
                    const readed = await readFile('database/database.bin', { baseDir: BaseDirectory.AppData })
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
                                const backupData = await readFile(`database/dbbackup-${backup}.bin`, { baseDir: BaseDirectory.AppData })
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
                if (navigator.serviceWorker && (!Capacitor.isNativePlatform())) {
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
            LoadingStatusState.text = "Checking Unnecessary Files..."
            try {
                await pargeChunks()
            } catch (error) {
                console.error(error)
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
            if (!localStorage.getItem('nightlyWarned') && window.location.hostname === 'nightly.risuai.xyz') {
                alertMd(language.nightlyWarning)
                await waitAlert()
                //for testing, leave empty
                localStorage.setItem('nightlyWarned', '')
            }
            if (db.botSettingAtStart) {
                botMakerMode.set(true)
            }
            if ((db.betaMobileGUI && window.innerWidth <= 800) || import.meta.env.VITE_RISU_LITE === 'TRUE') {
                initMobileGesture()
                MobileGUI.set(true)
            }
            loadedStore.set(true)
            selectedCharID.set(-1)
            startObserveDom()
            assignIds()
            makeColdData()
            saveDb()
            moduleUpdate()
            if (import.meta.env.VITE_RISU_TOS === 'TRUE') {
                alertTOS().then((a) => {
                    if (a === false) {
                        location.reload()
                    }
                })
            }
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
        alertError(event.error);
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

    if (!db.formatversion) {
        function checkParge(data: string) {

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
async function pargeChunks() {
    const db = getDatabase()
    if (db.account?.useSync) {
        return
    }

    const unpargeable = new Set(getUnpargeables(db))
    if (isTauri) {
        const assets = await readDir('assets', { baseDir: BaseDirectory.AppData })
        console.log(assets)
        for (const asset of assets) {
            try {
                const n = getBasename(asset.name)
                if (unpargeable.has(n)) {
                    console.log('unpargeable', n)
                }
                else {
                    console.log('pargeable', n)
                    await remove('assets/' + asset.name, { baseDir: BaseDirectory.AppData })
                }
            } catch (error) {
                console.log('error', asset.name)
            }
        }
    }
    else {
        const indexes = await forageStorage.keys()
        for (const asset of indexes) {
            if (!asset.startsWith('assets/')) {
                continue
            }
            const n = getBasename(asset)
            if (unpargeable.has(n)) {
            }
            else {
                await forageStorage.removeItem(asset)
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
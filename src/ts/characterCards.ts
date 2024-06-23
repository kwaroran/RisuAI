import { get, writable, type Writable } from "svelte/store"
import { alertCardExport, alertConfirm, alertError, alertInput, alertMd, alertNormal, alertSelect, alertStore, alertTOS, alertWait } from "./alert"
import { DataBase, defaultSdDataFunc, type character, setDatabase, type customscript, type loreSettings, type loreBook, type triggerscript, importPreset, type groupChat } from "./storage/database"
import { checkNullish, decryptBuffer, encryptBuffer, isKnownUri, selectFileByDom, selectMultipleFile, sleep } from "./util"
import { language } from "src/lang"
import { v4 as uuidv4, v4 } from 'uuid';
import { characterFormatUpdate } from "./characters"
import { AppendableBuffer, BlankWriter, checkCharOrder, downloadFile, isNodeServer, isTauri, loadAsset, LocalWriter, openURL, readImage, saveAsset, VirtualWriter } from "./storage/globalApi"
import { SettingsMenuIndex, ShowRealmFrameStore, selectedCharID, settingsOpen } from "./stores"
import { CurrentCharacter } from "./storage/database"
import { convertImage, hasher } from "./parser"
import { CCardLib, type CharacterCardV3, type LorebookEntry } from '@risuai/ccardlib'
import { reencodeImage } from "./process/files/image"
import { PngChunk } from "./pngChunk"
import type { OnnxModelFiles } from "./process/transformers"
import { CharXReader, CharXWriter } from "./process/processzip"
import { Capacitor } from "@capacitor/core"

export const hubURL = "https://sv.risuai.xyz"

export async function importCharacter() {
    try {
        const files = await selectFileByDom(["*"], 'multiple')
        if(!files){
            return
        }

        for(const f of files){
            console.log(f)
            await importCharacterProcess({
                name: f.name,
                data: f
            })
            checkCharOrder()
        }
    } catch (error) {
        alertError(`${error}`)
        return null
    }
}

async function importCharacterProcess(f:{
    name: string;
    data: Uint8Array|File|ReadableStream<Uint8Array>
}) {
    if(f.name.endsWith('json')){
        if(f.data instanceof ReadableStream){
            return null
        }
        const data = f.data instanceof Uint8Array ? f.data : new Uint8Array(await f.data.arrayBuffer())
        const da = JSON.parse(Buffer.from(data).toString('utf-8'))
        if(await importCharacterCardSpec(da)){
            let db = get(DataBase)
            return db.characters.length - 1
        }
        if((da.char_name || da.name) && (da.char_persona || da.description) && (da.char_greeting || da.first_mes)){
            let db = get(DataBase)
            db.characters.push(convertOldTavernAndJSON(da))
            DataBase.set(db)
            alertNormal(language.importedCharacter)
            return
        }
        else{
            alertError(language.errors.noData)
            return
        }
    }

    if(f.name.endsWith('charx')){
        console.log('reading charx')
        alertStore.set({
            type: 'wait',
            msg: 'Loading... (Reading)'
        })
        const reader = new CharXReader()
        await reader.read(f.data, {
            alertInfo: true
        })
        const cardData = reader.cardData
        if(!cardData){
            alertError(language.errors.noData)
            return
        }
        const card = JSON.parse(cardData)
        if(CCardLib.character.check(card) !== 'v3'){
            alertError(language.errors.noData)
            return
        }
        await importCharacterCardSpec(card, undefined, 'normal', reader.assets)
        let db = get(DataBase)
        return db.characters.length - 1
    }

    if(!f.name.endsWith('png')){
        alertError(language.errors.noData)
        return
    }
    

    alertStore.set({
        type: 'wait',
        msg: 'Loading... (Reading)'
    })
    await sleep(10)
    
    // const readed = PngChunk.read(img, ['chara'])?.['chara']
    let readedChara = ''
    let readedCCv3 = ''
    let img:Uint8Array
    const readGenerator = PngChunk.readGenerator(f.data, {
        returnTrimed: true
    })
    const assets:{[key:string]:string} = {}
    for await (const chunk of readGenerator){
        console.log(chunk)
        if(!chunk){
            continue
        }
        if(chunk instanceof AppendableBuffer){
            img = chunk.buffer
            break
        }
        if(chunk.key === 'chara'){
            //For memory reason, limit to 5MB
            if(readedChara.length < 5 * 1024 * 1024){
                readedChara = chunk.value
            }
            continue
        }
        if(chunk.key === 'ccv3'){
            if(readedCCv3.length < 5 * 1024 * 1024){
                readedCCv3 = chunk.value
            }
            continue
        }
        if(chunk.key.startsWith('chara-ext-asset_')){
            const assetIndex = (chunk.key.replace('chara-ext-asset_', ''))
            alertWait('Loading... (Reading Asset ' + assetIndex + ')' )
            const assetData = Buffer.from(chunk.value, 'base64')
            const assetId = await saveAsset(assetData)
            assets[assetIndex] = assetId
        }
    }
    if(!readedChara && !readedCCv3){
        alertError(language.errors.noData)
        return
    }

    if(!readedChara){
        readedChara = readedCCv3
    }

    if(!img){
        console.error("No Image Found")
        alertError(language.errors.noData)
        return
    }

    if(readedChara.startsWith('rcc||')){
        const parts = readedChara.split('||')
        const type = parts[1]
        if(type === 'rccv1'){
            if(parts.length !== 5){
                alertError(language.errors.noData)
                return
            }
            const encrypted = Buffer.from(parts[2], 'base64')
            const hashed = await hasher(encrypted)
            if(hashed !== parts[3]){
                alertError(language.errors.noData)
                return
            }
            const metaData:RccCardMetaData = JSON.parse(Buffer.from(parts[4], 'base64').toString('utf-8'))
            if(metaData.usePassword){
                const password = await alertInput(language.inputCardPassword)
                if(!password){
                    return
                }
                else{
                    try {
                        const decrypted = await decryptBuffer(encrypted, password)         
                        const charaData:CharacterCardV2Risu = JSON.parse(Buffer.from(decrypted).toString('utf-8'))
                        if(await importCharacterCardSpec(charaData, img, "normal", assets)){
                            let db = get(DataBase)
                            return db.characters.length - 1
                        }
                        else{
                            throw new Error('Error while importing')
                        }
                    } catch (error) {
                        alertError(language.errors.wrongPassword)
                        return
                    }
                }
            }
            else{
                const decrypted = await decryptBuffer(encrypted, 'RISU_NONE')
                try {
                    const charaData:CharacterCardV2Risu = JSON.parse(Buffer.from(decrypted).toString('utf-8'))
                    if(await importCharacterCardSpec(charaData, img, "normal", assets)){
                        let db = get(DataBase)
                        return db.characters.length - 1
                    }   
                } catch (error) {
                    alertError(language.errors.noData)
                    return
                }
            }

        }
    }
    else {
        const parsed = JSON.parse(Buffer.from(readedChara, 'base64').toString('utf-8'))
        //fix readedChara version pointing number instead of string because of previous version
        if(typeof (parsed as CharacterCardV2Risu)?.data?.character_version === 'number'){
            (parsed as CharacterCardV2Risu).data.character_version = (parsed as CharacterCardV2Risu).data.character_version.toString()
        }

        const checkedVersion = CCardLib.character.check(parsed)
        if(checkedVersion === 'v2' || checkedVersion === 'v3'){
            if(await importCharacterCardSpec(parsed, img, "normal", assets)){
                let db = get(DataBase)
                return db.characters.length - 1
            }
        }
    }
    const charaData:OldTavernChar = JSON.parse(Buffer.from(readedChara, 'base64').toString('utf-8'))
    console.log(charaData)
    const imgp = await saveAsset(await reencodeImage(img))
    let db = get(DataBase)
    db.characters.push(convertOldTavernAndJSON(charaData, imgp))
    DataBase.set(db)
    alertNormal(language.importedCharacter)
    return db.characters.length - 1
}

export const getRealmInfo = async (realmPath:string) => {
    const url = new URL(location.href);
    url.searchParams.delete('realm');
    window.history.pushState(null, '', url.toString());

    const res = await fetch(`${hubURL}/hub/info/${realmPath}`)
    if(res.status !== 200){
        alertError(await res.text())
        return
    }
    showRealmInfoStore.set(await res.json())
}

export const showRealmInfoStore:Writable<null|hubType> = writable(null)

export async function characterURLImport() {
    const realmPath = (new URLSearchParams(location.search)).get('realm')
    try {
        if(realmPath){
           getRealmInfo(realmPath)
        }
    } catch (error) {
        
    }

    const charPath = (new URLSearchParams(location.search)).get('charahub')
    try {
        if(charPath){
            alertWait('Loading from Chub...')
            const url = new URL(location.href);
            url.searchParams.delete('charahub');
            window.history.pushState(null, '', url.toString());
            const chara = await fetch("https://api.chub.ai/api/characters/download", {
                method: "POST",
                body: JSON.stringify({
                    "format": "tavern",
                    "fullPath": charPath,
                    "version": "main"
                }),
                headers: {
                    "content-type": "application/json"
                }
            })
            const img = new Uint8Array(await chara.arrayBuffer())
            await importCharacterProcess({
                name: 'charahub.png',
                data: img
            })
        }
    } catch (error) {
        alertError(language.errors.noData)
        return null
    }


    const hash = location.hash
    if(hash.startsWith('#import_module=')){
        const data = hash.replace('#import_module=', '')
        const importData = JSON.parse(Buffer.from(decodeURIComponent(data), 'base64').toString('utf-8'))
        importData.id = v4()

        const db = get(DataBase)
        if(importData.lowLevelAccess){
            const conf = await alertConfirm(language.lowLevelAccessConfirm)
            if(!conf){
                return false
            }
        }
        db.modules.push(importData)
        setDatabase(db)
        alertNormal(language.successImport)
        SettingsMenuIndex.set(1)
        settingsOpen.set(true)
        return
    }
    if(hash.startsWith('#import_preset=')){
        const data = hash.replace('#import_preset=', '')
        const importData =Buffer.from(decodeURIComponent(data), 'base64')
        await importPreset({
            name: 'imported.risupreset',
            data: importData
        })
        SettingsMenuIndex.set(14)
        settingsOpen.set(true)
        return
    
    }
}


function convertOldTavernAndJSON(charaData:OldTavernChar, imgp:string|undefined = undefined):character{


    return {
        name: charaData.name ?? 'unknown name',
        firstMessage: charaData.first_mes ?? 'unknown first message',
        desc:  charaData.description ?? '',
        notes: '',
        chats: [{
            message: [],
            note: '',
            name: 'Chat 1',
            localLore: []
        }],
        chatPage: 0,
        image: imgp,
        emotionImages: [],
        bias: [],
        globalLore: [],
        viewScreen: 'none',
        chaId: uuidv4(),
        sdData: defaultSdDataFunc(),
        utilityBot: false,
        customscript: [],
        exampleMessage: charaData.mes_example,
        creatorNotes:'',
        systemPrompt:'',
        postHistoryInstructions:'',
        alternateGreetings:[],
        tags:[],
        creator:"",
        characterVersion: '',
        personality: charaData.personality ?? '',
        scenario:charaData.scenario ?? '',
        firstMsgIndex: -1,
        replaceGlobalNote: "",
        triggerscript: [],
        additionalText: ''
    }
}

export async function exportChar(charaID:number):Promise<string> {
    const db = get(DataBase)
    let char = structuredClone(db.characters[charaID])

    if(char.type === 'group'){
        return ''
    }

    if(!char.image){
        alertError('Image Required')
        return ''
    }

    const option = await alertCardExport()
    if(option.type === ''){
        exportCharacterCard(char, option.type2 === 'json' ? 'json' : (option.type2 === 'charx' ? 'charx' : 'png'), {spec: 'v3'})
    }
    else if(option.type === 'ccv2'){
        exportCharacterCard(char,'png', {spec: 'v2'})
    }
    else if(option.type === 'realm'){
        ShowRealmFrameStore.set("character")
    }
    else{
        return option.type
    }
    return ''
}


async function importCharacterCardSpec(card:CharacterCardV2Risu|CharacterCardV3, img?:Uint8Array, mode:'hub'|'normal' = 'normal', assetDict:{[key:string]:string} = {}):Promise<boolean>{
    if(!card ||(card.spec !== 'chara_card_v2' && card.spec !== 'chara_card_v3' )){
        return false
    }

    const data = card.data
    console.log(card)
    let im = img ? await saveAsset(await reencodeImage(img)) : undefined
    let db = get(DataBase)

    const risuext = structuredClone(data.extensions.risuai)
    let emotions:[string, string][] = []
    let bias:[string, number][] = []
    let viewScreen: "none" | "emotion" | "imggen" = 'none'
    let customScripts:customscript[] = []
    let utilityBot = false
    let sdData = defaultSdDataFunc()
    let extAssets:[string,string,string][] = []
    let ccAssets:{
        type: string
        uri: string
        name: string
        ext: string
    }[] = []
    
    let vits:null|OnnxModelFiles = null
    if(risuext && card.spec === 'chara_card_v2'){
        if(risuext.emotions){
            for(let i=0;i<risuext.emotions.length;i++){
                alertStore.set({
                    type: 'wait',
                    msg: `Loading... (Getting Emotions ${i} / ${risuext.emotions.length})`
                })
                await sleep(10)
                if(risuext.emotions[i][1].startsWith('__asset:')){
                    const key = risuext.emotions[i][1].replace('__asset:', '')
                    const imgp = assetDict[key]
                    if(!imgp){
                        throw new Error('Error while importing, asset ' + key + ' not found')
                    }
                    emotions.push([risuext.emotions[i][0],imgp])
                    continue
                }
                const imgp = await saveAsset(mode === 'hub' ? (await getHubResources(risuext.emotions[i][1])) : Buffer.from(risuext.emotions[i][1], 'base64'))
                emotions.push([risuext.emotions[i][0],imgp])
            }
        }
        if(risuext.additionalAssets){
            for(let i=0;i<risuext.additionalAssets.length;i++){
                alertStore.set({
                    type: 'wait',
                    msg: `Loading... (Getting Assets ${i} / ${risuext.additionalAssets.length})`
                })
                await sleep(10)
                let fileName = ''
                if(risuext.additionalAssets[i].length >= 3)
                    fileName = risuext.additionalAssets[i][2]
                if(risuext.additionalAssets[i][1].startsWith('__asset:')){
                    const key = risuext.additionalAssets[i][1].replace('__asset:', '')
                    const imgp = assetDict[key]
                    if(!imgp){
                        throw new Error('Error while importing, asset ' + key + ' not found')
                    }
                    extAssets.push([risuext.additionalAssets[i][0],imgp,fileName])
                    continue
                }
                const imgp = await saveAsset(mode === 'hub' ? (await getHubResources(risuext.additionalAssets[i][1])) :Buffer.from(risuext.additionalAssets[i][1], 'base64'), '', fileName)
                extAssets.push([risuext.additionalAssets[i][0],imgp,fileName])
            }
        }
        if(risuext.vits){
            const keys = Object.keys(risuext.vits)
            for(let i=0;i<keys.length;i++){
                alertStore.set({
                    type: 'wait',
                    msg: `Loading... (Getting VITS ${i} / ${keys.length})`
                })
                await sleep(10)
                const key = keys[i]
                if(risuext.vits[key].startsWith('__asset:')){
                    const rkey = risuext.vits[key].replace('__asset:', '')
                    const imgp = assetDict[rkey]
                    if(!imgp){
                        throw new Error('Error while importing, asset ' + rkey + ' not found')
                    }
                    risuext.vits[key] = imgp
                    continue
                }
                const imgp = await saveAsset(mode === 'hub' ? (await getHubResources(risuext.vits[key])) : Buffer.from(risuext.vits[key], 'base64'))
                risuext.vits[key] = imgp
            }

            if(keys.length > 0){
                vits = {
                    name: "Imported VITS",
                    files: risuext.vits,
                    id: uuidv4().replace(/-/g, '')
                }
            }


        }

        if(risuext){
            bias = risuext.bias ?? bias
            viewScreen = risuext.viewScreen ?? viewScreen
            customScripts = risuext.customScripts ?? customScripts
            utilityBot = risuext.utilityBot ?? utilityBot
            sdData = risuext.sdData ?? sdData
        }
    }
    if(card.spec === 'chara_card_v3'){
        const data = card.data //required for type checking
        if(data.assets){
            for(let i=0;i<data.assets.length;i++){
                alertStore.set({
                    type: 'wait',
                    msg: `Loading... (Getting Assets ${i} / ${data.assets.length})`
                })
                await sleep(10)
                let fileName = ''
                let imgp = ''
                if(data.assets[i].name){
                    fileName = data.assets[i].name
                }
                if(data.assets[i].uri.startsWith('__asset:')){
                    const key = data.assets[i].uri.replace('__asset:', '')
                    imgp = assetDict[key]
                    if(!imgp){
                        throw new Error('Error while importing, asset ' + key + ' not found')
                    }
                }
                else if(data.assets[i].uri === 'ccdefault:'){
                    imgp = im
                }
                else if(data.assets[i].uri.startsWith('embeded://')){
                    const key = data.assets[i].uri.replace('embeded://', '')
                    imgp = assetDict[key]
                    if(!imgp){
                        throw new Error('Error while importing, asset ' + key + ' not found')
                    }
                }
                else if(data.assets[i].uri.startsWith('data:')){
                    //data uri
                    const b64 = data.assets[i].uri.split(',')[1]
                    if(b64.length < 50 * 1024 * 1024){
                        imgp = await saveAsset(Buffer.from(b64, 'base64'))
                    }
                    else{
                        alertError('Data URI too large')
                        continue
                    }
                }
                else{
                    continue
                }
                if(data.assets[i].type === 'emotion'){
                    emotions.push([fileName,imgp])
                }
                else if(data.assets[i].type === 'x-risu-asset'){
                    extAssets.push([fileName,imgp, data.assets[i].ext ?? 'unknown'])
                }
                else if(data.assets[i].type === 'icon' && data.assets[i].name === 'main'){
                    im = imgp
                }
                else{
                    ccAssets.push({
                        type: data.assets[i].type ?? 'asset',
                        uri: imgp,
                        name: fileName,
                        ext: data.assets[i].ext ?? 'unknown'
                    })
                    console.log(ccAssets)
                }
            }
        }

        if(risuext){
            bias = risuext.bias ?? bias
            viewScreen = risuext.viewScreen ?? viewScreen
            customScripts = risuext.customScripts ?? customScripts
            utilityBot = risuext.utilityBot ?? utilityBot
            sdData = risuext.sdData ?? sdData
        }
    }

    if(risuext && risuext?.lowLevelAccess){
        const conf = await alertConfirm(language.lowLevelAccessConfirm)
        if(!conf){
            return false
        }
    }
    const charbook = data.character_book
    let lorebook:loreBook[] = []
    let loresettings:undefined|loreSettings = undefined
    let loreExt:undefined|any = undefined
    if(charbook){
        if((!checkNullish(charbook.recursive_scanning)) &&
            (!checkNullish(charbook.scan_depth)) &&
            (!checkNullish(charbook.token_budget))){
            loresettings = {
                tokenBudget:charbook.token_budget,
                scanDepth:charbook.scan_depth,
                recursiveScanning: charbook.recursive_scanning,
                fullWordMatching: charbook?.extensions?.risu_fullWordMatching ?? false,
            }
        }

        loreExt = charbook.extensions

        for(const book of charbook.entries){
            lorebook.push({
                key: book.keys.join(', '),
                secondkey: book.secondary_keys?.join(', ') ?? '',
                insertorder: book.insertion_order,
                comment: book.name ?? book.comment ?? "",
                content: book.content,
                mode: "normal",
                alwaysActive: book.constant ?? false,
                selective: book.selective ?? false,
                extentions: {...book.extensions, risu_case_sensitive: book.case_sensitive},
                activationPercent: book.extensions?.risu_activationPercent,
                loreCache: book.extensions?.risu_loreCache ?? null,
                //@ts-ignore
                useRegex: book.use_regex ?? false
            })
        }

    }

    let ext = structuredClone(data?.extensions ?? {})

    for(const key in ext){
        if(key === 'risuai'){
            delete ext[key]
        }
        if(key === 'depth_prompt'){
            delete ext[key]
        }
    }

    let char:character = {
        name: data.name ?? '',
        firstMessage: data.first_mes ?? '',
        desc: data.description ?? '',
        notes: '',
        chats: [{
            message: [],
            note: '',
            name: 'Chat 1',
            localLore: []
        }],
        chatPage: 0,
        image: im,
        emotionImages: emotions,
        bias: bias,
        globalLore: lorebook, //lorebook
        viewScreen: viewScreen,
        chaId: uuidv4(),
        sdData: sdData,
        utilityBot: utilityBot,
        customscript: customScripts,
        exampleMessage: data.mes_example ?? '',
        creatorNotes:data.creator_notes ?? '',
        systemPrompt:data.system_prompt ?? '',
        postHistoryInstructions:'',
        alternateGreetings:data.alternate_greetings ?? [],
        tags:data.tags ?? [],
        creator:data.creator ?? '',
        characterVersion: `${data.character_version}` ?? '',
        personality:data.personality ?? '',
        scenario:data.scenario ?? '',
        firstMsgIndex: -1,
        removedQuotes: false,
        loreSettings: loresettings,
        loreExt: loreExt,
        additionalData: {
            tag: data.tags ?? [],
            creator: data.creator,
            character_version: data.character_version
        },
        additionalAssets: extAssets,
        replaceGlobalNote: data.post_history_instructions ?? '',
        backgroundHTML: data?.extensions?.risuai?.backgroundHTML,
        license: data?.extensions?.risuai?.license,
        triggerscript: data?.extensions?.risuai?.triggerscript ?? [],
        private: data?.extensions?.risuai?.private ?? false,
        additionalText: data?.extensions?.risuai?.additionalText ?? '',
        virtualscript: '', //removed dude to security issue
        extentions: ext ?? {},
        largePortrait: data?.extensions?.risuai?.largePortrait ?? (!data?.extensions?.risuai),
        lorePlus: data?.extensions?.risuai?.lorePlus ?? false,
        inlayViewScreen: data?.extensions?.risuai?.inlayViewScreen ?? false,
        newGenData: data?.extensions?.risuai?.newGenData ?? undefined,
        vits: vits,
        ttsMode: vits ? 'vits' : 'normal',
        imported: true,
        source: card?.data?.extensions?.risuai?.source ?? [],
        ccAssets: ccAssets,
        lowLevelAccess: risuext?.lowLevelAccess ?? false
    }

    if(card.spec === 'chara_card_v3'){
        char.group_only_greetings = card.data.group_only_greetings ?? []
        char.nickname = card.data.nickname ?? ''
        char.source = card.data.source ?? card.data?.extensions?.risuai?.source ?? []
        char.creation_date = card.data.creation_date ?? 0
        char.modification_date = card.data.modification_date ?? 0
    }

    db.characters.push(char)
    

    setDatabase(db)

    alertNormal(language.importedCharacter)
    return true

}



async function createBaseV2(char:character) {
    
    let charBook:charBookEntry[] = []
    for(const lore of char.globalLore){
        let ext:{
            risu_case_sensitive?: boolean;
            risu_activationPercent?: number
            risu_loreCache?: {
                key:string
                data:string[]
            }
        } = structuredClone(lore.extentions ?? {})

        let caseSensitive = ext.risu_case_sensitive ?? false
        ext.risu_activationPercent = lore.activationPercent
        ext.risu_loreCache = lore.loreCache

        charBook.push({
            keys: lore.key.split(',').map(r => r.trim()),
            secondary_keys: lore.selective ? lore.secondkey.split(',').map(r => r.trim()) : undefined,
            content: lore.content,
            extensions: ext,
            enabled: true,
            insertion_order: lore.insertorder,
            constant: lore.alwaysActive,
            selective:lore.selective,
            name: lore.comment,
            comment: lore.comment,
            case_sensitive: caseSensitive,
        })
    }
    char.loreExt ??= {}

    char.loreExt.risu_fullWordMatching = char.loreSettings?.fullWordMatching ?? false

    const card:CharacterCardV2Risu = {
        spec: "chara_card_v2",
        spec_version: "2.0",
        data: {
            name: char.name,
            description: char.desc ?? '',
            personality: char.personality ?? '',
            scenario: char.scenario ?? '',
            first_mes: char.firstMessage ?? '',
            mes_example: char.exampleMessage ?? '',
            creator_notes: char.creatorNotes ?? '',
            system_prompt: char.systemPrompt ?? '',
            post_history_instructions: char.replaceGlobalNote ?? '',
            alternate_greetings: char.alternateGreetings ?? [],
            character_book: {
                scan_depth: char.loreSettings?.scanDepth,
                token_budget: char.loreSettings?.tokenBudget,
                recursive_scanning: char.loreSettings?.recursiveScanning,
                extensions: char.loreExt ?? {},
                entries: charBook
            },
            tags: char.tags ?? [],
            creator: char.additionalData?.creator ?? '',
            character_version: `${char.additionalData?.character_version}` ?? '',
            extensions: {
                risuai: {
                    // emotions: char.emotionImages,
                    bias: char.bias,
                    viewScreen: char.viewScreen,
                    customScripts: char.customscript,
                    utilityBot: char.utilityBot,
                    sdData: char.sdData,
                    // additionalAssets: char.additionalAssets,
                    backgroundHTML: char.backgroundHTML,
                    license: char.license,
                    triggerscript: char.triggerscript,
                    additionalText: char.additionalText,
                    virtualscript: '', //removed dude to security issue
                    largePortrait: char.largePortrait,
                    lorePlus: char.lorePlus,
                    inlayViewScreen: char.inlayViewScreen,
                    newGenData: char.newGenData,
                    vits: {}
                },
                depth_prompt: char.depth_prompt
            }
        }
    }

    if(char.extentions){
        for(const key in char.extentions){
            if(key === 'risuai' || key === 'depth_prompt'){
                continue
            }
            card.data.extensions[key] = char.extentions[key]
        }
    }
    return card
}


export async function exportCharacterCard(char:character, type:'png'|'json'|'charx' = 'png', arg:{
    password?:string
    writer?:LocalWriter|VirtualWriter,
    spec?:'v2'|'v3'
} = {}) {
    let img = await readImage(char.image)
    const spec:'v2'|'v3' = arg.spec ?? 'v2' //backward compatibility
    try{
        char.image = ''
        img = await reencodeImage(img)
        const localWriter = arg.writer ?? (new LocalWriter())
        if(!arg.writer && type !== 'json'){
            const nameExt = {
                'png': ['Image File', 'png'],
                'json': ['JSON File', 'json'],
                'charx': ['CharX File', 'charx']
            }
            const ext = nameExt[type]
            console.log(ext)
            await (localWriter as LocalWriter).init(ext[0], [ext[1]])
        }
        const writer = type === 'charx' ? (new CharXWriter(localWriter)) : type === 'json' ? (new BlankWriter()) : (new PngChunk.streamWriter(img, localWriter))
        await writer.init()
        let assetIndex = 0
        if(spec === 'v2'){
            const card = await createBaseV2(char)
            if(card.data.extensions.risuai.emotions && card.data.extensions.risuai.emotions.length > 0){
                for(let i=0;i<card.data.extensions.risuai.emotions.length;i++){
                    alertStore.set({
                        type: 'wait',
                        msg: `Loading... (Adding Emotions ${i} / ${card.data.extensions.risuai.emotions.length})`
                    })
                    const key = card.data.extensions.risuai.emotions[i][1]
                    const rData = await readImage(key)
                    const b64encoded = Buffer.from(await convertImage(rData)).toString('base64')
                    assetIndex++
                    card.data.extensions.risuai.emotions[i][1] = `__asset:${assetIndex}`
                    await writer.write("chara-ext-asset_" + assetIndex, b64encoded)
                }
            }
    
            
            if(card.data.extensions.risuai.additionalAssets && card.data.extensions.risuai.additionalAssets.length > 0){
                for(let i=0;i<card.data.extensions.risuai.additionalAssets.length;i++){
                    alertStore.set({
                        type: 'wait',
                        msg: `Loading... (Adding Additional Assets ${i} / ${card.data.extensions.risuai.additionalAssets.length})`
                    })
                    const key = card.data.extensions.risuai.additionalAssets[i][1]
                    const rData = await readImage(key)
                    const b64encoded = Buffer.from(await convertImage(rData)).toString('base64')
                    assetIndex++
                    card.data.extensions.risuai.additionalAssets[i][1] = `__asset:${assetIndex}`
                    await writer.write("chara-ext-asset_" + assetIndex, b64encoded)
                }
            }
    
            if(char.vits && char.ttsMode === 'vits'){
                const keys = Object.keys(char.vits.files)
                for(let i=0;i<keys.length;i++){
                    alertStore.set({
                        type: 'wait',
                        msg: `Loading... (Adding VITS ${i} / ${keys.length})`
                    })
                    const key = keys[i]
                    const rData = await loadAsset(char.vits.files[key])
                    const b64encoded = Buffer.from(rData).toString('base64')
                    assetIndex++
                    card.data.extensions.risuai.vits[key] = `__asset:${assetIndex}`
                    await writer.write("chara-ext-asset_" + assetIndex, b64encoded)
                }
            }
            if(type === 'json'){
                await downloadFile(`${char.name.replace(/[<>:"/\\|?*\.\,]/g, "")}_export.json`, Buffer.from(JSON.stringify(card, null, 4), 'utf-8'))
                alertNormal(language.successExport)
                return
            }
    
            await sleep(10)
            alertStore.set({
                type: 'wait',
                msg: 'Loading... (Writing)'
            })
    
            await writer.write("chara", Buffer.from(JSON.stringify(card)).toString('base64'))     
        }
        else if(spec === 'v3'){
            const card = createBaseV3(char)
            if(card.data.assets && card.data.assets.length > 0){
                for(let i=0;i<card.data.assets.length;i++){
                    alertStore.set({
                        type: 'wait',
                        msg: `Loading... (Adding Assets ${i} / ${card.data.assets.length})`
                    })
                    let key = card.data.assets[i].uri
                    let rData:Uint8Array
                    if(key === 'ccdefault:' && type !== 'png'){
                        key = char.image
                        rData = img
                    }
                    else if(isKnownUri(key)){
                        continue
                    }
                    else{
                        rData = await readImage(key)
                    }
                    assetIndex++
                    if(type === 'png'){
                        const b64encoded = Buffer.from(await convertImage(rData)).toString('base64')
                        card.data.assets[i].uri = `__asset:${assetIndex}`
                        await writer.write("chara-ext-asset_" + assetIndex, b64encoded)
                    }
                    else if(type === 'json'){
                        const b64encoded = Buffer.from(await convertImage(rData)).toString('base64')
                        card.data.assets[i].uri = `data:application/octet-stream;base64,${b64encoded}`
                    }
                    else{
                        let type = 'other'
                        let itype = 'other'
                        switch(card.data.assets[i].type){
                            case 'emotion':
                                type = 'emotion'
                                break
                            case 'background':
                                type = 'background'
                                break
                            case 'user_icon':
                                type = 'user_icon'
                                break
                            case 'icon':
                                type = 'icon'
                                break
                        }
                        switch(card.data.assets[i].ext){
                            case 'png':
                            case 'jpg':
                            case 'jpeg':
                            case 'gif':
                            case 'webp':
                            case 'avif':
                                itype = 'image'
                                break
                            case 'mp3':
                            case 'wav':
                            case 'ogg':
                            case 'flac':
                                itype = 'audio'
                                break
                            case 'mp4':
                            case 'webm':
                            case 'mov':
                            case 'avi':
                            case 'mkv':
                                itype = 'video'
                                break
                            case 'mmd':
                            case 'obj':
                                itype = 'model'
                                break
                            case 'safetensors':
                            case 'cpkt':
                            case 'onnx':
                                itype = 'ai'
                                break
                            case 'otf':
                            case 'ttf':
                            case 'woff':
                            case 'woff2':
                                itype = 'fonts'
                                break
                            case 'js':
                            case 'ts':
                            case 'lua':
                                itype = 'code'
                        }

                        let path = ''
                        const name = `${assetIndex}`
                        if(card.data.assets[i].ext === 'unknown'){
                            path = `assets/${type}/image/${name}.png`
                        }
                        else{
                            path = `assets/${type}/${itype}/${name}.${card.data.assets[i].ext}`
                        }
                        card.data.assets[i].uri = 'embeded://' + path
                        await writer.write(path, rData)
                    }
                }
            }
            if(type === 'json'){
                await downloadFile(`${char.name.replace(/[<>:"/\\|?*\.\,]/g, "")}_export.json`, Buffer.from(JSON.stringify(card, null, 4), 'utf-8'))
                alertNormal(language.successExport)
                return
            }

            await sleep(10)
            alertStore.set({
                type: 'wait',
                msg: 'Loading... (Writing)'
            })
    
            if(type === 'charx'){
                await writer.write("card.json", Buffer.from(JSON.stringify(card, null, 4)))
            }
            else{
                await writer.write("ccv3", Buffer.from(JSON.stringify(card)).toString('base64'))
            }
        }
        await writer.end()

        await sleep(10)

        if(!arg.writer){
            alertNormal(language.successExport)
        }

    }
    catch(e){
        console.error(e, e.stack)
        alertError(`${e}`)
    }
}

export function createBaseV3(char:character){
    
    let charBook:LorebookEntry[] = []
    let assets:Array<{
        type: string
        uri: string
        name: string
        ext: string
    }> = structuredClone(char.ccAssets ?? [])

    if(char.additionalAssets){
        for(const asset of char.additionalAssets){
            assets.push({
                type: 'x-risu-asset',
                uri: asset[1],
                name: asset[0],
                ext: asset[2] || 'unknown'
            })
        }
    }

    if(char.emotionImages){
        for(const asset of char.emotionImages){
            assets.push({
                type: 'emotion',
                uri: asset[1],
                name: asset[0],
                ext: 'unknown'
            })
        }
    
        assets.push({
            type: 'icon',
            uri: 'ccdefault:',
            name: 'main',
            ext: 'png'
        })
    }

    for(const lore of char.globalLore){
        let ext:{
            risu_case_sensitive?: boolean;
            risu_activationPercent?: number
            risu_loreCache?: {
                key:string
                data:string[]
            }
        } = structuredClone(lore.extentions ?? {})

        let caseSensitive = ext.risu_case_sensitive ?? false
        ext.risu_activationPercent = lore.activationPercent
        ext.risu_loreCache = lore.loreCache

        charBook.push({
            keys: lore.key.split(',').map(r => r.trim()),
            secondary_keys: lore.selective ? lore.secondkey.split(',').map(r => r.trim()) : undefined,
            content: lore.content,
            extensions: ext,
            enabled: true,
            insertion_order: lore.insertorder,
            constant: lore.alwaysActive,
            selective:lore.selective,
            name: lore.comment,
            comment: lore.comment,
            case_sensitive: caseSensitive,
            use_regex: lore.useRegex ?? false,
        })
    }
    char.loreExt ??= {}

    char.loreExt.risu_fullWordMatching = char.loreSettings?.fullWordMatching ?? false

    const card:CharacterCardV3 = {
        spec: "chara_card_v3",
        spec_version: "3.0",
        data: {
            name: char.name,
            description: char.desc ?? '',
            personality: char.personality ?? '',
            scenario: char.scenario ?? '',
            first_mes: char.firstMessage ?? '',
            mes_example: char.exampleMessage ?? '',
            creator_notes: char.creatorNotes ?? '',
            system_prompt: char.systemPrompt ?? '',
            post_history_instructions: char.replaceGlobalNote ?? '',
            alternate_greetings: char.alternateGreetings ?? [],
            character_book: {
                scan_depth: char.loreSettings?.scanDepth,
                token_budget: char.loreSettings?.tokenBudget,
                recursive_scanning: char.loreSettings?.recursiveScanning,
                extensions: char.loreExt ?? {},
                entries: charBook
            },
            tags: char.tags ?? [],
            creator: char.additionalData?.creator ?? '',
            character_version: `${char.additionalData?.character_version}` ?? '',
            extensions: {
                risuai: {
                    bias: char.bias,
                    viewScreen: char.viewScreen,
                    customScripts: char.customscript,
                    utilityBot: char.utilityBot,
                    sdData: char.sdData,
                    backgroundHTML: char.backgroundHTML,
                    license: char.license,
                    triggerscript: char.triggerscript,
                    additionalText: char.additionalText,
                    virtualscript: '', //removed dude to security issue
                    largePortrait: char.largePortrait,
                    lorePlus: char.lorePlus,
                    inlayViewScreen: char.inlayViewScreen,
                    newGenData: char.newGenData,
                    vits: {},
                    lowLevelAccess: char.lowLevelAccess ?? false
                },
                depth_prompt: char.depth_prompt
            },
            group_only_greetings: char.group_only_greetings ?? [],
            nickname: char.nickname ?? '',
            source: char.source ?? [],
            creation_date: char.creation_date ?? 0,
            modification_date: Math.floor(Date.now() / 1000),
            assets: assets
        }
    }

    if(char.extentions){
        for(const key in char.extentions){
            if(key === 'risuai' || key === 'depth_prompt'){
                continue
            }
            card.data.extensions[key] = char.extentions[key]
        }
    }
    return card
}


export async function shareRisuHub2(char:character, arg:{
    nsfw: boolean,
    tag:string
    license: string
    anon: boolean,
    update: boolean
}) {
    try {
        char = structuredClone(char)
        char.license = arg.license
        let tagList = arg.tag.split(',')
        
        if(arg.nsfw){
            tagList.push("nsfw")
        }
    
        await alertWait("Uploading...")
        
    
        let tags = tagList.filter((v, i) => {
            return (!!v) && (tagList.indexOf(v) === i)
        })
        char.tags = tags
    
    
        const writer = new VirtualWriter()
        await exportCharacterCard(char, 'png', {writer: writer})
        const dat = Buffer.from(writer.buf.buffer).toString('base64') + '&' + 'rt.png'

        openURL(`https://realm.risuai.net/hub/realm/upload#filedata=${encodeURIComponent(dat)}`)

        let testMode = true
        if(testMode){
            return
        }
    
        const fetchPromise = fetch(hubURL + '/hub/realm/upload', {
            method: "POST",
            body: writer.buf.buffer,
            headers: {
                "Content-Type": 'image/png',
                "x-risu-api-version": "4",
                "x-risu-token": get(DataBase)?.account?.token,
                'x-risu-username': arg.anon ? '' : (get(DataBase)?.account?.id),
                'x-risu-debug': 'true',
                'x-risu-update-id': arg.update ? (char.realmId ?? 'null') : 'null'
            }
        })
    
    
        const res = await fetchPromise
    
        if(res.status !== 200){
            alertError(await res.text())
        }
        else{
            const resJSON = await res.json()
            alertMd(resJSON.message)
            const currentChar = get(CurrentCharacter)
            if(currentChar.type === 'group'){
                return
            }
            currentChar.realmId = resJSON.id
            CurrentCharacter.set(currentChar)
        }   
    } catch (error) {
        alertError(`${error}`)
    }

}

export type hubType = {
    name:string
    desc: string
    download: string,
    id: string,
    img: string
    tags: string[],
    viewScreen: "none" | "emotion" | "imggen"
    hasLore:boolean
    hasEmotion:boolean
    hasAsset:boolean
    creator?:string
    creatorName?:string
    hot:number
    license:string
    authorname?:string
    original?:string
    type:string
}

export let hubAdditionalHTML = ''

export async function getRisuHub(arg:{
    search:string,
    page:number,
    nsfw:boolean
    sort:string
}):Promise<hubType[]> {
    try {
        arg.search += ' __shared'
        const stringArg = `search==${arg.search}&&page==${arg.page}&&nsfw==${arg.nsfw}&&sort==${arg.sort}&&web==${(!isNodeServer && !Capacitor.isNativePlatform() && !isTauri) ? 'web' : 'other'}`

        const da = await fetch(hubURL + '/realm/' + encodeURIComponent(stringArg))
        if(da.status !== 200){
            return []
        }
        const jso = await da.json()
        if(Array.isArray(jso)){
            return jso
        }
        hubAdditionalHTML = jso.additionalHTML || hubAdditionalHTML
        return jso.cards
    } catch (error) {
        return[]
    }
}

export async function downloadRisuHub(id:string) {
    try {
        if(!(await alertTOS())){
            return
        }
        alertStore.set({
            type: "wait",
            msg: "Downloading..."
        })
        const res = await fetch("https://realm.risuai.net/api/v1/download/png-v3/" + id + '?cors=true', {
            headers: {
                "x-risu-api-version": "4"
            }
        })
        if(res.status !== 200){
            alertError(await res.text())
            return
        }

        if(res.headers.get('content-type') === 'image/png'){
            await importCharacterProcess({
                name: 'realm.png',
                data: res.body
            })
            checkCharOrder()
            let db = get(DataBase)
            if(db.characters[db.characters.length-1] && db.goCharacterOnImport){
                const index = db.characters.length-1
                characterFormatUpdate(index);
                selectedCharID.set(index);
            }   
            return
        }
    
        const result = await res.json()
        const data:CharacterCardV2Risu = result.card
        const img:string = result.img
    
        await importCharacterCardSpec(data, await getHubResources(img), 'hub')
        checkCharOrder()
        let db = get(DataBase)
        if(db.characters[db.characters.length-1] && db.goCharacterOnImport){
            const index = db.characters.length-1
            characterFormatUpdate(index);
            selectedCharID.set(index);
        }   
    } catch (error) {
        console.error(error)
        alertError("Error while importing")
    }
}

export async function getHubResources(id:string) {
    const res = await fetch(`${hubURL}/resource/${id}`)
    if(res.status !== 200){
        throw (await res.text())
    }
    return Buffer.from(await (res).arrayBuffer())
}

export function isCharacterHasAssets(char:character|groupChat){
    if(char.type === 'group'){
        return false
    }

    if(char.additionalAssets && char.additionalAssets.length > 0){
        return true
    }

    if(char.emotionImages && char.emotionImages.length > 0){
        return true
    }

    if(char.ccAssets && char.ccAssets.length > 0){
        return true
    }

    return false
}


type CharacterCardV2Risu = {
    spec: 'chara_card_v2'
    spec_version: '2.0' // May 8th addition
    data: {
        name: string
        description: string
        personality: string
        scenario: string
        first_mes: string
        mes_example: string
        creator_notes: string
        system_prompt: string
        post_history_instructions: string
        alternate_greetings: string[]
        character_book?: CharacterBook
        tags: string[]
        creator: string
        character_version: string
        extensions: {
            risuai?:{
                emotions?:[string, string][]
                bias?:[string, number][],
                viewScreen?: any,
                customScripts?:customscript[]
                utilityBot?: boolean,
                sdData?:[string,string][],
                additionalAssets?:[string,string,string][],
                backgroundHTML?:string,
                license?:string,
                triggerscript?:triggerscript[]
                private?:boolean
                additionalText?:string
                virtualscript?:string
                largePortrait?:boolean
                lorePlus?:boolean
                inlayViewScreen?:boolean
                newGenData?: {
                    prompt: string,
                    negative: string,
                    instructions: string,
                    emotionInstructions: string,
                },
                vits?: {[key:string]:string}
            }
            depth_prompt?: { depth: number, prompt: string }
        }
    }
}  


interface OldTavernChar{
    avatar: "none"
    chat: string
    create_date: string
    description: string
    first_mes: string
    mes_example: string
    name: string
    personality: string
    scenario: string
    talkativeness: "0.5"
}
type CharacterBook = {
    name?: string
    description?: string
    scan_depth?: number // agnai: "Memory: Chat History Depth"
    token_budget?: number // agnai: "Memory: Context Limit"
    recursive_scanning?: boolean // no agnai equivalent. whether entry content can trigger other entries
    extensions: Record<string, any>
    entries: Array<charBookEntry>
  }

interface charBookEntry{
    keys: Array<string>
    content: string
    extensions: Record<string, any>
    enabled: boolean
    insertion_order: number // if two entries inserted, lower "insertion order" = inserted higher

    // FIELDS WITH NO CURRENT EQUIVALENT IN SILLY
    name?: string // not used in prompt engineering
    priority?: number // if token budget reached, lower priority value = discarded first

    // FIELDS WITH NO CURRENT EQUIVALENT IN AGNAI
    id?: number // not used in prompt engineering
    comment?: string // not used in prompt engineering
    selective?: boolean // if `true`, require a key from both `keys` and `secondary_keys` to trigger the entry
    secondary_keys?: Array<string> // see field `selective`. ignored if selective == false
    constant?: boolean // if true, always inserted in the prompt (within budget limit)
    position?: 'before_char' | 'after_char' // whether the entry is placed before or after the character defs
    case_sensitive?:boolean
}

interface RccCardMetaData{
    usePassword?: boolean
}
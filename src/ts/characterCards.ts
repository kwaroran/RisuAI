import { get, writable, type Writable } from "svelte/store"
import { alertCardExport, alertConfirm, alertError, alertInput, alertMd, alertNormal, alertSelect, alertStore, alertTOS, alertWait } from "./alert"
import { DataBase, defaultSdDataFunc, type character, setDatabase, type customscript, type loreSettings, type loreBook, type triggerscript } from "./storage/database"
import { checkNullish, decryptBuffer, encryptBuffer, selectMultipleFile, sleep } from "./util"
import { language } from "src/lang"
import { v4 as uuidv4 } from 'uuid';
import { characterFormatUpdate } from "./characters"
import { checkCharOrder, downloadFile, loadAsset, LocalWriter, readImage, saveAsset } from "./storage/globalApi"
import { cloneDeep } from "lodash"
import { selectedCharID } from "./stores"
import { convertImage, hasher } from "./parser"

import { reencodeImage } from "./process/files/image"
import { PngChunk } from "./pngChunk"
import type { OnnxModelFiles } from "./process/embedding/transformers"

export const hubURL = "https://sv.risuai.xyz"

export async function importCharacter() {
    try {
        const files = await selectMultipleFile(['png', 'json'])
        if(!files){
            return
        }

        for(const f of files){
            await importCharacterProcess(f)
            checkCharOrder()
        }
    } catch (error) {
        alertError(`${error}`)
        return null
    }
}

async function importCharacterProcess(f:{
    name: string;
    data: Uint8Array;
}) {
    if(f.name.endsWith('json')){
        const da = JSON.parse(Buffer.from(f.data).toString('utf-8'))
        if(await importSpecv2(da)){
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
    alertStore.set({
        type: 'wait',
        msg: 'Loading... (Reading)'
    })
    await sleep(10)
    const img = f.data
    
    // const readed = PngChunk.read(img, ['chara'])?.['chara']
    let readedChara = ''
    const readGenerator = PngChunk.readGenerator(img)
    const assets:{[key:string]:string} = {}
    for await(const chunk of readGenerator){
        if(!chunk){
            break
        }
        if(chunk.key === 'chara'){
            //For memory reason, limit to 2MB
            if(readedChara.length < 2 * 1024 * 1024){
                readedChara = chunk.value.replaceAll('\0', '')
            }
            break
        }
        if(chunk.key.startsWith('chara-ext-asset_')){
            const assetIndex = (chunk.key.replace('chara-ext-asset_', ''))
            alertWait('Loading... (Reading Asset ' + assetIndex + ')' )
            const assetData = Buffer.from(chunk.value, 'base64')
            const assetId = await saveAsset(assetData)
            assets[assetIndex] = assetId
        }
    }
    if(!readedChara){
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
                        const charaData:CharacterCardV2 = JSON.parse(Buffer.from(decrypted).toString('utf-8'))
                        if(await importSpecv2(charaData, img, "normal", assets)){
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
                    const charaData:CharacterCardV2 = JSON.parse(Buffer.from(decrypted).toString('utf-8'))
                    if(await importSpecv2(charaData, img, "normal", assets)){
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
        const charaData:CharacterCardV2 = JSON.parse(Buffer.from(readedChara, 'base64').toString('utf-8'))
        if(await importSpecv2(charaData, img, "normal", assets)){
            let db = get(DataBase)
            return db.characters.length - 1
        }
    }
    const charaData:OldTavernChar = JSON.parse(Buffer.from(readedChara, 'base64').toString('utf-8'))
    const imgp = await saveAsset(await reencodeImage(img))
    let db = get(DataBase)
    db.characters.push(convertOldTavernAndJSON(charaData, imgp))
    DataBase.set(db)
    alertNormal(language.importedCharacter)
    return db.characters.length - 1
}

export const showRealmInfoStore:Writable<null|hubType> = writable(null)

export async function characterURLImport() {
    const realmPath = (new URLSearchParams(location.search)).get('realm')
    try {
        if(realmPath){
            const url = new URL(location.href);
            url.searchParams.delete('realm');
            window.history.pushState(null, '', url.toString());

            const res = await fetch(`${hubURL}/hub/info`,{
                method: "POST",
                body: JSON.stringify({
                    id: realmPath
                })
            })
            if(res.status !== 200){
                alertError(await res.text())
                return
            }
            showRealmInfoStore.set(await res.json())
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

export async function exportChar(charaID:number) {
    const db = get(DataBase)
    let char = cloneDeep(db.characters[charaID])

    if(char.type === 'group'){
        return
    }

    if(!char.image){
        alertError('Image Required')
        return
    }
    const conf = await alertConfirm(language.exportConfirm)
    if(!conf){
        return
    }

    const option = await alertCardExport()
    if(option.type === 'cancel'){
        return
    }
    else if(option.type === 'rcc'){
        char.license = option.license
        exportSpecV2(char, 'rcc', {password:option.password})
    }
    else{
        exportSpecV2(char,'png')
    }
    return
}


async function importSpecv2(card:CharacterCardV2, img?:Uint8Array, mode:'hub'|'normal' = 'normal', assetDict:{[key:string]:string} = {}):Promise<boolean>{
    if(!card ||card.spec !== 'chara_card_v2'){
        return false
    }

    const data = card.data
    const im = img ? await saveAsset(await reencodeImage(img)) : undefined
    let db = get(DataBase)

    const risuext = cloneDeep(data.extensions.risuai)
    let emotions:[string, string][] = []
    let bias:[string, number][] = []
    let viewScreen: "none" | "emotion" | "imggen" = 'none'
    let customScripts:customscript[] = []
    let utilityBot = false
    let sdData = defaultSdDataFunc()
    let extAssets:[string,string,string][] = []
    let vits:null|OnnxModelFiles = null
    if(risuext){
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
        bias = risuext.bias ?? bias
        viewScreen = risuext.viewScreen ?? viewScreen
        customScripts = risuext.customScripts ?? customScripts
        utilityBot = risuext.utilityBot ?? utilityBot
        sdData = risuext.sdData ?? sdData
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
            })
        }

    }

    let ext = cloneDeep(data?.extensions ?? {})

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
        virtualscript: data?.extensions?.risuai?.virtualscript ?? '',
        extentions: ext ?? {},
        largePortrait: data?.extensions?.risuai?.largePortrait ?? (!data?.extensions?.risuai),
        lorePlus: data?.extensions?.risuai?.lorePlus ?? false,
        inlayViewScreen: data?.extensions?.risuai?.inlayViewScreen ?? false,
        newGenData: data?.extensions?.risuai?.newGenData ?? undefined,
        vits: vits,
        ttsMode: vits ? 'vits' : 'normal'
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
        } = cloneDeep(lore.extentions ?? {})

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

    const card:CharacterCardV2 = {
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
                    emotions: char.emotionImages,
                    bias: char.bias,
                    viewScreen: char.viewScreen,
                    customScripts: char.customscript,
                    utilityBot: char.utilityBot,
                    sdData: char.sdData,
                    additionalAssets: char.additionalAssets,
                    backgroundHTML: char.backgroundHTML,
                    license: char.license,
                    triggerscript: char.triggerscript,
                    additionalText: char.additionalText,
                    virtualscript: char.virtualscript,
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


export async function exportSpecV2(char:character, type:'png'|'json'|'rcc' = 'png', rcc:{password?:string} = {}) {
    let img = await readImage(char.image)

    try{
        char.image = ''
        const card = await createBaseV2(char)
        img = await reencodeImage(img)
        const localWriter = new LocalWriter()
        await localWriter.init(`Image file`, ['png'])
        const writer = new PngChunk.streamWriter(img, localWriter)
        await writer.init()
        let assetIndex = 0
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

        if(type === 'rcc'){
            const password = rcc.password || 'RISU_NONE'
            const json = JSON.stringify(card)
            const encrypted = Buffer.from(await encryptBuffer(Buffer.from(json, 'utf-8'), password))
            const hashed = await hasher(encrypted)
            const metaData:RccCardMetaData = {}
            if(password !== 'RISU_NONE'){
                metaData.usePassword = true
            }
            const rccString = 'rcc||rccv1||' + encrypted.toString('base64') + '||' + hashed + '||' + Buffer.from(JSON.stringify(metaData)).toString('base64')
            await writer.write("chara", rccString)
        }
        else{
            await writer.write("chara", Buffer.from(JSON.stringify(card)).toString('base64'))
        }

        await writer.end()

        await sleep(10)

        alertNormal(language.successExport)

    }
    catch(e){
        console.error(e, e.stack)
        alertError(`${e}`)
    }
}

export async function shareRisuHub(char:character, arg:{
    nsfw: boolean,
    tag:string
    license: string
    anon: boolean
}) {
    char = cloneDeep(char)
    char.license = arg.license
    let tagList = arg.tag.split(',')
    
    if(arg.nsfw){
        tagList.push("nsfw")
    }

    

    let tags = tagList.filter((v, i) => {
        return (!!v) && (tagList.indexOf(v) === i)
    })
    char.tags = tags


    let img = await readImage(char.image)

    try{
        const card = await createBaseV2(char)
        let resources:[string,string][] = []
        if(card.data.extensions.risuai.emotions && card.data.extensions.risuai.emotions.length > 0){
            for(let i=0;i<card.data.extensions.risuai.emotions.length;i++){
                alertStore.set({
                    type: 'wait',
                    msg: `Loading... (Adding Emotions ${i} / ${card.data.extensions.risuai.emotions.length})`
                })
                const data = card.data.extensions.risuai.emotions[i][1]
                const rData = await readImage(data)
                resources.push([data, Buffer.from(await convertImage(rData)).toString('base64')])
            }
        }

        

        
        if(card.data.extensions.risuai.additionalAssets && card.data.extensions.risuai.additionalAssets.length > 0){
            for(let i=0;i<card.data.extensions.risuai.additionalAssets.length;i++){
                alertStore.set({
                    type: 'wait',
                    msg: `Loading... (Adding Additional Assets ${i} / ${card.data.extensions.risuai.additionalAssets.length})`
                })
                const data = card.data.extensions.risuai.additionalAssets[i][1]
                const rData = await readImage(data)
                resources.push([data, Buffer.from(await convertImage(rData)).toString('base64')])
            }
        }

        const da = await fetch(hubURL + '/hub/upload', {
            method: "POST",
            body: JSON.stringify({
                card: card,
                img: Buffer.from(img).toString('base64'),
                resources: resources,
                token: get(DataBase)?.account?.token,
                username: arg.anon ? '' : (get(DataBase)?.account?.id),
                apiver: 3
            })
        })

        if(da.status !== 200){
            alertError(await da.text())
        }
        else{
            alertMd(await da.text())
        }
    }
    catch(e){
        alertError(`${e}`)
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
}

export async function getRisuHub(arg:{
    search:string,
    page:number,
    nsfw:boolean
    sort:string
}):Promise<hubType[]> {
    try {
        const stringArg = `search==${arg.search}&&page==${arg.page}&&nsfw==${arg.nsfw}&&sort==${arg.sort}`

        const da = await fetch(hubURL + '/realm/' + encodeURIComponent(stringArg))
        if(da.status !== 200){
            return []
        }
        return da.json()   
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
        const res = await fetch(hubURL + '/hub/get', {
            method: "POST",
            body: JSON.stringify({
                id: id,
                apiver: 3
            })
        })
        if(res.status !== 200){
            alertError(await res.text())
            return
        }
    
        const result = await res.json()
        const data:CharacterCardV2 = result.card
        const img:string = result.img
    
        await importSpecv2(data, await getHubResources(img), 'hub')
        checkCharOrder()
        let db = get(DataBase)
        if(db.characters[db.characters.length-1]){
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



type CharacterCardV2 = {
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
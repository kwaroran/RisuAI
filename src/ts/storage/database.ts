import { get, writable } from 'svelte/store';
import { checkNullish, selectSingleFile } from '../util';
import { changeLanguage, language } from '../../lang';
import type { RisuPlugin } from '../plugins/plugins';
import { downloadFile, saveAsset as saveImageGlobal } from './globalApi';
import { cloneDeep } from 'lodash';
import { defaultAutoSuggestPrompt, defaultJailbreak, defaultMainPrompt } from './defaultPrompts';
import { alertNormal } from '../alert';

export const DataBase = writable({} as any as Database)
export const loadedStore = writable(false)
export let appVer = '1.30.2'
export let webAppSubVer = ''

export function setDatabase(data:Database){
    if(checkNullish(data.characters)){
        data.characters = []
    }
    if(checkNullish(data.apiType)){
        data.apiType = 'gpt35'
    }
    if(checkNullish(data.openAIKey)){
        data.openAIKey = ''
    }
    if(checkNullish(data.mainPrompt)){
        data.mainPrompt = defaultMainPrompt
    }
    if(checkNullish(data.jailbreak)){
        data.jailbreak = defaultJailbreak
    }
    if(checkNullish(data.globalNote)){
        data.globalNote = ``
    }
    if(checkNullish(data.temperature)){
        data.temperature = 80
    }
    if(checkNullish(data.maxContext)){
        data.maxContext = 4000
    }
    if(checkNullish(data.maxResponse)){
        data.maxResponse = 500
    }
    if(checkNullish(data.frequencyPenalty)){
        data.frequencyPenalty = 70
    }
    if(checkNullish(data.PresensePenalty)){
        data.PresensePenalty = 70
    }
    if(checkNullish(data.aiModel)){
        data.aiModel = 'gpt35'
    }
    if(checkNullish(data.jailbreakToggle)){
        data.jailbreakToggle = false
    }
    if(checkNullish(data.formatingOrder)){
        data.formatingOrder = ['main','description', 'chats','lastChat','jailbreak','lorebook', 'globalNote', 'authorNote']
    }
    if(checkNullish(data.loreBookDepth)){
        data.loreBookDepth = 5
    }
    if(checkNullish(data.loreBookToken)){
        data.loreBookToken = 800
    }
    if(checkNullish(data.username)){
        data.username = 'User'
    }
    if(checkNullish(data.userIcon)){
        data.userIcon = ''
    }
    if(checkNullish(data.additionalPrompt)){
        data.additionalPrompt = 'The assistant must act as {{char}}. user is {{user}}.'
    }
    if(checkNullish(data.descriptionPrefix)){
        data.descriptionPrefix = 'description of {{char}}: '
    }
    if(checkNullish(data.forceReplaceUrl)){
        data.forceReplaceUrl = ''
    }
    if(checkNullish(data.forceReplaceUrl2)){
        data.forceReplaceUrl2 = ''
    }
    if(checkNullish(data.language)){
        data.language = 'en'
    }
    if(checkNullish(data.swipe)){
        data.swipe = true
    }
    if(checkNullish(data.translator)){
        data.translator = ''
    }
    if(checkNullish(data.currentPluginProvider)){
        data.currentPluginProvider = ''
    }
    if(checkNullish(data.plugins)){
        data.plugins = []
    }
    if(checkNullish(data.zoomsize)){
        data.zoomsize = 100
    }
    if(checkNullish(data.lastup)){
        data.lastup = ''
    }
    if(checkNullish(data.customBackground)){
        data.customBackground = ''
    }
    if(checkNullish(data.textgenWebUIURL)){
        data.textgenWebUIURL = 'http://127.0.0.1:7860/run/textgen'
    }
    if(checkNullish(data.autoTranslate)){
        data.autoTranslate = false
    }
    if(checkNullish(data.fullScreen)){
        data.fullScreen = false
    }
    if(checkNullish(data.playMessage)){
        data.playMessage = false
    }
    if(checkNullish(data.iconsize)){
        data.iconsize = 100
    }
    if(checkNullish(data.theme)){
        data.theme = ''
    }
    if(checkNullish(data.subModel)){
        data.subModel = 'gpt35'
    }
    if(checkNullish(data.timeOut)){
        data.timeOut = 120
    }
    if(checkNullish(data.waifuWidth)){
        data.waifuWidth = 100
    }
    if(checkNullish(data.waifuWidth2)){
        data.waifuWidth2 = 100
    }
    if(checkNullish(data.emotionPrompt)){
        data.emotionPrompt = ""
    }
    if(checkNullish(data.requester)){
        data.requester = "new"
    }
    if(checkNullish(data.proxyKey)){
        data.proxyKey = ""
    }
    if(checkNullish(data.botPresets)){
        let defaultPreset = presetTemplate
        defaultPreset.name = "Default"
        data.botPresets = [defaultPreset]
    }
    if(checkNullish(data.botPresetsId)){
        data.botPresetsId = 0
    }
    if(checkNullish(data.sdProvider)){
        data.sdProvider = ''
    }
    if(checkNullish(data.runpodKey)){
        data.runpodKey = ''
    }
    if(checkNullish(data.webUiUrl)){
        data.webUiUrl = 'http://127.0.0.1:7860/'
    }
    if(checkNullish(data.sdSteps)){
        data.sdSteps = 30
    }
    if(checkNullish(data.sdCFG)){
        data.sdCFG = 7
    }
    if(checkNullish(data.textTheme)){
        data.textTheme = "standard"
    }
    if(checkNullish(data.emotionPrompt2)){
        data.emotionPrompt2 = ""
    }
    if(checkNullish(data.requestRetrys)){
        data.requestRetrys = 2
    }
    if(checkNullish(data.useSayNothing)){
        data.useSayNothing = true
    }
    if(checkNullish(data.bias)){
        data.bias = []
    }
    if(checkNullish(data.requestmet)){
        data.requestmet = 'normal'
    }
    if(checkNullish(data.requestproxy)){
        data.requestproxy = ''
    }
    if(checkNullish(data.showUnrecommended)){
        data.showUnrecommended = false
    }
    if(checkNullish(data.elevenLabKey)){
        data.elevenLabKey = ''
    }
    if(checkNullish(data.voicevoxUrl)){
        data.voicevoxUrl = ''
    }
    if(checkNullish(data.supaMemoryPrompt)){
        data.supaMemoryPrompt = ''
    }
    if(checkNullish(data.showMemoryLimit)){
        data.showMemoryLimit = false
    }
    if(checkNullish(data.supaMemoryKey)){
        data.supaMemoryKey = ""
    }
    if(checkNullish(data.supaMemoryType)){
        data.supaMemoryType = "none"
    }
    if(checkNullish(data.askRemoval)){
        data.askRemoval = true
    }
    if(checkNullish(data.sdConfig)){
        data.sdConfig = {
            width:512,
            height:512,
            sampler_name:"Euler a",
            script_name:"",
            denoising_strength:0.7,
            enable_hr:false,
            hr_scale:1.25,
            hr_upscaler:"Latent"
        }
    }
    if(checkNullish(data.customTextTheme)){
        data.customTextTheme = {
            FontColorStandard: "#f8f8f2",
            FontColorBold: "#f8f8f2",
            FontColorItalic: "#8C8D93",
            FontColorItalicBold: "#8C8D93"
        }
    }
    if(checkNullish(data.hordeConfig)){
        data.hordeConfig = {
            apiKey: "",
            model: "",
            softPrompt: ""
        }
    }
    if(checkNullish(data.novelai)){
        data.novelai = {
            token: "",
            model: "clio-v1",
        }
    }
    if(checkNullish(data.loreBook)){
        data.loreBookPage = 0
        data.loreBook = [{
            name: "My First LoreBook",
            data: []
        }]
    }
    if(checkNullish(data.loreBookPage) || data.loreBook.length < data.loreBookPage){
        data.loreBookPage = 0
    }
    if(checkNullish(data.globalscript)){
        data.globalscript = []
    }
    if(checkNullish(data.sendWithEnter)){
        data.sendWithEnter = true
    }
    if(checkNullish(data.autoSuggestPrompt)){
        data.autoSuggestPrompt = defaultAutoSuggestPrompt
    }
    if(checkNullish(data.imageCompression)){
        data.imageCompression = true
    }
    if(checkNullish(data.classicMaxWidth)){
        data.classicMaxWidth = false
    }
    changeLanguage(data.language)
    DataBase.set(data)
}


export interface customscript{
    comment: string;
    in:string
    out:string
    type:string
    flag?:string
    ableFlag?:boolean

}

export interface loreBook{
    key:string
    secondkey:string
    insertorder: number
    comment: string
    content: string
    mode: 'multiple'|'constant'|'normal',
    alwaysActive: boolean
    selective:boolean
    extentions?:{
        risu_case_sensitive:boolean
    }
    activationPercent?:number
}

export interface character{
    type?:"character"
    name:string
    image?:string
    firstMessage:string
    desc:string
    notes:string
    chats:Chat[]
    chatPage: number
    viewScreen: 'emotion'|'none'|'imggen',
    bias: [string, number][]
    emotionImages: [string, string][]
    globalLore: loreBook[]
    chaId: string
    sdData: [string, string][]
    customscript: customscript[]
    utilityBot: boolean
    exampleMessage:string
    removedQuotes?:boolean
    creatorNotes:string
    systemPrompt:string
    postHistoryInstructions:string
    alternateGreetings:string[]
    tags:string[]
    creator:string
    characterVersion: string
    personality:string
    scenario:string
    firstMsgIndex:number
    loreSettings?:loreSettings
    loreExt?:any
    additionalData?: {
        tag?:string[]
        creator?:string
        character_version?:string
    }
    ttsMode?:string
    ttsSpeech?:string
    voicevoxConfig?:{
        speaker?: string
        SPEED_SCALE?: number
        PITCH_SCALE?: number
        INTONATION_SCALE?: number
        VOLUME_SCALE?: number
    }
    supaMemory?:boolean
    additionalAssets?:[string, string, string][]
    ttsReadOnlyQuoted?:boolean
    replaceGlobalNote:string
    backgroundHTML?:string
}


export interface loreSettings{
    tokenBudget: number
    scanDepth:number
    recursiveScanning: boolean
}


export interface groupChat{
    type: 'group'
    image?:string
    firstMessage:string
    chats:Chat[]
    chatPage: number
    name:string
    viewScreen: 'single'|'multiple'|'none'|'emp',
    characters:string[]
    characterTalks:number[]
    characterActive:boolean[]
    globalLore: loreBook[]
    autoMode: boolean
    useCharacterLore :boolean
    emotionImages: [string, string][]
    customscript: customscript[],
    chaId: string
    alternateGreetings?: string[]
    creatorNotes?:string,
    removedQuotes?:boolean
    firstMsgIndex?:number,
    loreSettings?:loreSettings
    supaMemory?:boolean
    ttsMode?:string
    suggestMessages?:string[]
    orderByOrder?:boolean
    backgroundHTML?:string
}

export interface botPreset{
    name:string
    apiType: string
    openAIKey: string
    mainPrompt: string
    jailbreak: string
    globalNote:string
    temperature: number
    maxContext: number
    maxResponse: number
    frequencyPenalty: number
    PresensePenalty: number
    formatingOrder: FormatingOrderItem[]
    aiModel: string
    subModel:string
    currentPluginProvider:string
    textgenWebUIURL:string
    forceReplaceUrl:string
    forceReplaceUrl2:string
    promptPreprocess: boolean,
    bias: [string, number][]
    koboldURL?: string
    proxyKey:string
}

export interface Database{
    characters: (character|groupChat)[],
    apiType: string
    forceReplaceUrl2:string
    openAIKey: string
    proxyKey:string
    mainPrompt: string
    jailbreak: string
    globalNote:string
    temperature: number
    askRemoval:boolean
    maxContext: number
    maxResponse: number
    frequencyPenalty: number
    PresensePenalty: number
    formatingOrder: FormatingOrderItem[]
    aiModel: string
    jailbreakToggle:boolean
    loreBookDepth: number
    loreBookToken: number,
    loreBook: {
        name:string
        data:loreBook[]
    }[]
    loreBookPage: number
    supaMemoryPrompt: string
    username: string
    userIcon: string
    additionalPrompt: string
    descriptionPrefix: string
    forceReplaceUrl: string
    language: string
    translator: string
    plugins: RisuPlugin[]
    currentPluginProvider: string
    zoomsize:number
    lastup:string
    customBackground:string
    textgenWebUIURL:string
    autoTranslate: boolean
    fullScreen:boolean
    playMessage:boolean
    iconsize:number
    theme: string
    subModel:string
    timeOut:number
    emotionPrompt: string,
    requester:string
    formatversion:number
    waifuWidth:number
    waifuWidth2:number
    botPresets:botPreset[]
    botPresetsId:number
    sdProvider: string
    webUiUrl:string
    sdSteps:number
    sdCFG:number
    sdConfig:sdConfig
    runpodKey:string
    promptPreprocess:boolean
    bias: [string, number][]
    swipe:boolean
    instantRemove:boolean
    textTheme: string
    customTextTheme: {
        FontColorStandard: string,
        FontColorBold : string,
        FontColorItalic : string,
        FontColorItalicBold : string,
    }
    requestRetrys:number
    emotionPrompt2:string
    useSayNothing:boolean
    didFirstSetup: boolean
    requestmet: string
    requestproxy: string
    showUnrecommended:boolean
    elevenLabKey:string
    voicevoxUrl:string
    useExperimental:boolean
    showMemoryLimit:boolean
    roundIcons:boolean
    useStreaming:boolean
    palmAPI:string,
    supaMemoryKey:string
    supaMemoryType:string
    textScreenColor?:string
    textBorder?:boolean
    textScreenRounded?:boolean
    textScreenBorder?:string
    characterOrder:(string|folder)[]
    hordeConfig:hordeConfig,
    novelai:{
        token:string,
        model:string
    }
    globalscript: customscript[]
    sendWithEnter:boolean
    clickToEdit: boolean
    koboldURL:string
    advancedBotSettings:boolean
    useAutoSuggestions:boolean
    autoSuggestPrompt:string,
    claudeAPIKey:string,
    useChatCopy:boolean,
    novellistAPI:string,
    useAutoTranslateInput:boolean
    imageCompression:boolean
    account?:{
        token:string
        id:string,
        data: {
            refresh_token?:string,
            access_token?:string
            expires_in?: number
        }
        useSync?:boolean
    },
    classicMaxWidth: boolean,
    useChatSticker:boolean,
    useAdditionalAssetsPreview:boolean,
    usePlainFetch:boolean
    hypaMemory:boolean
    proxyRequestModel:string
}

interface hordeConfig{
    apiKey:string
    model:string
    softPrompt:string
}

export interface folder{
    name:string
    data:string[]
    color:string
    id:string
}


interface sdConfig{
    width:number
    height:number
    sampler_name:string
    script_name:string
    denoising_strength:number
    enable_hr:boolean
    hr_scale: number
    hr_upscaler:string
}

export type FormatingOrderItem = 'main'|'jailbreak'|'chats'|'lorebook'|'globalNote'|'authorNote'|'lastChat'|'description'|'postEverything'

export interface Chat{
    message: Message[]
    note:string
    name:string
    localLore: loreBook[]
    sdData?:string
    supaMemoryData?:string
    lastMemory?:string
    suggestMessages?:string[]
    isStreaming?:boolean
}

export interface Message{
    role: 'user'|'char'
    data: string
    saying?: string
    chatId?:string
}


export const saveImage = saveImageGlobal

export const presetTemplate:botPreset = {
    name: "New Preset",
    apiType: "gpt35",
    openAIKey: "",
    mainPrompt: defaultMainPrompt,
    jailbreak: defaultJailbreak,
    globalNote: "",
    temperature: 80,
    maxContext: 4000,
    maxResponse: 300,
    frequencyPenalty: 70,
    PresensePenalty: 70,
    formatingOrder: ['main', 'description', 'chats','lastChat', 'jailbreak', 'lorebook', 'globalNote', 'authorNote'],
    aiModel: "gpt35",
    subModel: "gpt35",
    currentPluginProvider: "",
    textgenWebUIURL: '',
    forceReplaceUrl: '',
    forceReplaceUrl2: '',
    promptPreprocess: false,
    proxyKey: '',
    bias: []
}

const defaultSdData:[string,string][] = [
    ["always", "solo, 1girl"],
    ['negative', ''],
    ["|character\'s appearance", ''],
    ['current situation', ''],
    ['$character\'s pose', ''],
    ['$character\'s emotion', ''],
    ['current location', ''],
]

export const defaultSdDataFunc = () =>{
    return cloneDeep(defaultSdData)
}

export function updateTextTheme(){
    let db = get(DataBase)
    const root = document.querySelector(':root') as HTMLElement;
    if(!root){
        return
    }
    switch(db.textTheme){
        case "standard":{
            root.style.setProperty('--FontColorStandard', '#fafafa');
            root.style.setProperty('--FontColorItalic', '#8C8D93');
            root.style.setProperty('--FontColorBold', '#fafafa');
            root.style.setProperty('--FontColorItalicBold', '#8C8D93');
            break
        }
        case "highcontrast":{
            root.style.setProperty('--FontColorStandard', '#f8f8f2');
            root.style.setProperty('--FontColorItalic', '#F1FA8C');
            root.style.setProperty('--FontColorBold', '#8BE9FD');
            root.style.setProperty('--FontColorItalicBold', '#FFB86C');
            break
        }
        case "custom":{
            root.style.setProperty('--FontColorStandard', db.customTextTheme.FontColorStandard);
            root.style.setProperty('--FontColorItalic', db.customTextTheme.FontColorItalic);
            root.style.setProperty('--FontColorBold', db.customTextTheme.FontColorBold);
            root.style.setProperty('--FontColorItalicBold', db.customTextTheme.FontColorItalicBold);
            break
        }
    }
}

export function saveCurrentPreset(){
    let db = get(DataBase)
    let pres = db.botPresets
    pres[db.botPresetsId] = {
        name: pres[db.botPresetsId].name,
        apiType: db.apiType,
        openAIKey: db.openAIKey,
        mainPrompt:db.mainPrompt,
        jailbreak: db.jailbreak,
        globalNote: db.globalNote,
        temperature: db.temperature,
        maxContext: db.maxContext,
        maxResponse: db.maxResponse,
        frequencyPenalty: db.frequencyPenalty,
        PresensePenalty: db.PresensePenalty,
        formatingOrder: db.formatingOrder,
        aiModel: db.aiModel,
        subModel: db.subModel,
        currentPluginProvider: db.currentPluginProvider,
        textgenWebUIURL: db.textgenWebUIURL,
        forceReplaceUrl: db.forceReplaceUrl,
        forceReplaceUrl2: db.forceReplaceUrl2,
        promptPreprocess: db.promptPreprocess,
        bias: db.bias,
        koboldURL: db.koboldURL,
        proxyKey: db.proxyKey
    }
    db.botPresets = pres
    DataBase.set(db)
}

export function copyPreset(id:number){
    saveCurrentPreset()
    let db = get(DataBase)
    let pres = db.botPresets
    const newPres = cloneDeep(pres[id])
    newPres.name += " Copy"
    db.botPresets.push(newPres)
    DataBase.set(db)
}

export function changeToPreset(id =0, savecurrent = true){
    if(savecurrent){
        saveCurrentPreset()
    }
    let db = get(DataBase)
    let pres = db.botPresets
    const newPres = pres[id]
    db.botPresetsId = id
    db.apiType = newPres.apiType ?? db.apiType
    db.openAIKey = newPres.openAIKey ?? db.openAIKey
    db.mainPrompt = newPres.mainPrompt ?? db.mainPrompt
    db.jailbreak = newPres.jailbreak ?? db.jailbreak
    db.globalNote = newPres.globalNote ?? db.globalNote
    db.temperature = newPres.temperature ?? db.temperature
    db.maxContext = newPres.maxContext ?? db.maxContext
    db.maxResponse = newPres.maxResponse ?? db.maxResponse
    db.frequencyPenalty = newPres.frequencyPenalty ?? db.frequencyPenalty
    db.PresensePenalty = newPres.PresensePenalty ?? db.PresensePenalty
    db.formatingOrder = newPres.formatingOrder ?? db.formatingOrder
    db.aiModel = newPres.aiModel ?? db.aiModel
    db.subModel = newPres.subModel ?? db.subModel
    db.currentPluginProvider = newPres.currentPluginProvider ?? db.currentPluginProvider
    db.textgenWebUIURL = newPres.textgenWebUIURL ?? db.textgenWebUIURL
    db.forceReplaceUrl = newPres.forceReplaceUrl ?? db.forceReplaceUrl
    db.promptPreprocess = newPres.promptPreprocess ?? db.promptPreprocess
    db.forceReplaceUrl2 = newPres.forceReplaceUrl2 ?? db.forceReplaceUrl2
    db.bias = newPres.bias ?? db.bias
    db.koboldURL = newPres.koboldURL ?? db.koboldURL
    db.proxyKey = newPres.proxyKey ?? db.proxyKey
    DataBase.set(db)
}

export function downloadPreset(id:number){
    saveCurrentPreset()
    let db = get(DataBase)
    let pres = cloneDeep(db.botPresets[id])
    pres.openAIKey = ''
    pres.forceReplaceUrl = ''
    pres.forceReplaceUrl2 = ''
    downloadFile(pres.name + "_preset.json", Buffer.from(JSON.stringify(pres, null, 2)))
    alertNormal(language.successExport)
}

export async function importPreset(){
    const f = await selectSingleFile(["json"])
    if(!f){
        return
    }
    let db = get(DataBase)
    const pre = (JSON.parse(Buffer.from(f.data).toString('utf-8')))
    pre.name ??= "Imported"
    db.botPresets.push(pre)
    DataBase.set(db)
}
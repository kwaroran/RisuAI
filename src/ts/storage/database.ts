import { get, writable } from 'svelte/store';
import { checkNullish, decryptBuffer, encryptBuffer, selectSingleFile } from '../util';
import { changeLanguage, language } from '../../lang';
import type { RisuPlugin } from '../plugins/plugins';
import type {triggerscript as triggerscriptMain} from '../process/triggers';
import { downloadFile, saveAsset as saveImageGlobal } from './globalApi';
import { cloneDeep } from 'lodash';
import { defaultAutoSuggestPrompt, defaultJailbreak, defaultMainPrompt } from './defaultPrompts';
import { alertNormal, alertSelect } from '../alert';
import type { NAISettings } from '../process/models/nai';
import { prebuiltNAIpresets, prebuiltPresets } from '../process/templates/templates';
import { defaultColorScheme, type ColorScheme } from '../gui/colorscheme';
import type { Proompt, ProomptSettings } from '../process/proompt';
import type { OobaChatCompletionRequestParams } from '../model/ooba';

export const DataBase = writable({} as any as Database)
export const loadedStore = writable(false)
export let appVer = "1.76.3"
export let webAppSubVer = ''

export function setDatabase(data:Database){
    if(checkNullish(data.characters)){
        data.characters = []
    }
    if(checkNullish(data.apiType)){
        data.apiType = 'gpt35_0301'
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
        data.aiModel = 'gpt35_0301'
    }
    if(checkNullish(data.jailbreakToggle)){
        data.jailbreakToggle = false
    }
    if(checkNullish(data.formatingOrder)){
        data.formatingOrder = ['main','description', 'personaPrompt','chats','lastChat','jailbreak','lorebook', 'globalNote', 'authorNote']
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
    if(checkNullish(data.textgenWebUIStreamURL)){
        data.textgenWebUIStreamURL = 'wss://localhost/api/'
    }
    if(checkNullish(data.textgenWebUIBlockingURL)){
        data.textgenWebUIBlockingURL = 'https://localhost/api/'
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
        data.subModel = 'gpt35_0301'
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
    if(checkNullish(data.NAIImgUrl)){
        data.NAIImgUrl = 'https://api.novelai.net/ai/generate-image'
    }
    if(checkNullish(data.NAIApiKey)){
        data.NAIApiKey = ''
    }
    if(checkNullish(data.NAIImgModel)){
        data.NAIImgModel = 'nai-diffusion-3'
    }
    if(checkNullish(data.NAII2I)){
        data.NAII2I = true
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
    if(checkNullish(data.NAIImgConfig)){
        data.NAIImgConfig = {
            width:512,
            height:768,
            sampler:"k_dpmpp_sde",
            steps:28,
            scale:5,
            sm:true,
            sm_dyn:true,
            noise:0.0,
            strength:0.6,
            image:""
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
    data.globalscript ??= []
    data.sendWithEnter ??= true
    data.autoSuggestPrompt ??= defaultAutoSuggestPrompt
    data.autoSuggestPrefix ??= ""
    data.autoSuggestClean ??= true
    data.imageCompression ??= true
    if(!data.formatingOrder.includes('personaPrompt')){
        data.formatingOrder.splice(data.formatingOrder.indexOf('main'),0,'personaPrompt')
    }
    data.selectedPersona ??= 0
    data.personaPrompt ??= ''
    data.personas ??= [{
        name: data.username,
        personaPrompt: "",
        icon: data.userIcon,
        largePersonaPortrait: false
    }]
    data.classicMaxWidth ??= false
    data.ooba ??= cloneDeep(defaultOoba)
    data.ainconfig ??= cloneDeep(defaultAIN)
    data.openrouterKey ??= ''
    data.openrouterRequestModel ??= 'openai/gpt-3.5-turbo'
    data.toggleConfirmRecommendedPreset ??= true
    data.officialplugins ??= {}
    data.NAIsettings ??= cloneDeep(prebuiltNAIpresets)
    data.assetWidth ??= -1
    data.animationSpeed ??= 0.4
    data.colorScheme ??= cloneDeep(defaultColorScheme)
    data.colorSchemeName ??= 'default'
    data.NAIsettings.starter ??= ""
    data.hypaModel ??= 'MiniLM'
    data.mancerHeader ??= ''
    data.emotionProcesser ??= 'submodel'
    data.translatorType ??= 'google'
    data.deeplOptions ??= {
        key:'',
        freeApi: false
    }
    data.NAIadventure ??= false
    data.NAIappendName ??= true
    data.NAIsettings.cfg_scale ??= 1
    data.NAIsettings.mirostat_tau ??= 0
    data.NAIsettings.mirostat_lr ??= 1
    data.autofillRequestUrl ??= true
    data.customProxyRequestModel ??= ''
    data.generationSeed ??= -1
    data.newOAIHandle ??= true
    data.gptVisionQuality ??= 'low'
    data.huggingfaceKey ??= ''
    data.statistics ??= {}
    data.reverseProxyOobaArgs ??= {
        mode: 'instruct'
    }
    data.top_p ??= 1
    if(typeof(data.top_p) !== 'number'){
        //idk why type changes, but it does so this is a fix
        data.top_p = 1
    }
    //@ts-ignore
    data.google ??= {}
    data.google.accessToken ??= ''
    data.google.projectId ??= ''
    data.genTime ??= 1
    data.proomptSettings ??= {
        assistantPrefill: '',
        postEndInnerFormat: '',
        sendChatAsSystem: false,
        sendName: false,
        utilOverride: false,
        customChainOfThought: false,
        maxThoughtTagDepth: -1
    }
    data.keiServerURL ??= ''
    data.top_k ??= 0
    data.proomptSettings.maxThoughtTagDepth ??= -1
    data.openrouterFallback ??= true
    data.openrouterMiddleOut ??= false
    data.removePunctuationHypa ??= true

    changeLanguage(data.language)
    DataBase.set(data)
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
    cipherChat: boolean,
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
    officialplugins: {
        automark?: boolean
        romanizer?: boolean
        metrica?: boolean
        oaiFix?: boolean
        oaiFixEmdash?: boolean
        oaiFixLetters?: boolean
    }
    currentPluginProvider: string
    zoomsize:number
    lastup:string
    customBackground:string
    textgenWebUIStreamURL:string
    textgenWebUIBlockingURL:string
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
    NAIImgUrl:string
    NAIApiKey:string
    NAIImgModel:string
    NAII2I:boolean
    NAIImgConfig:NAIImgConfig
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
    toggleConfirmRecommendedPreset:boolean,
    novelai:{
        token:string,
        model:string
    }
    globalscript: customscript[],
    sendWithEnter:boolean
    clickToEdit: boolean
    koboldURL:string
    advancedBotSettings:boolean
    useAutoSuggestions:boolean
    autoSuggestPrompt:string
    autoSuggestPrefix:string
    autoSuggestClean:boolean
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
        kei?:boolean
    },
    classicMaxWidth: boolean,
    useChatSticker:boolean,
    useAdditionalAssetsPreview:boolean,
    usePlainFetch:boolean
    hypaMemory:boolean
    proxyRequestModel:string
    ooba:OobaSettings
    ainconfig: AINsettings
    personaPrompt:string
    openrouterRequestModel:string
    openrouterKey:string
    openrouterMiddleOut:boolean
    openrouterFallback:boolean
    selectedPersona:number
    personas:{
        personaPrompt:string
        name:string
        icon:string
        largePersonaPortrait?:boolean
    }[]
    assetWidth:number
    animationSpeed:number
    botSettingAtStart:false
    NAIsettings:NAISettings
    hideRealm:boolean
    colorScheme:ColorScheme
    colorSchemeName:string
    promptTemplate?:Proompt[]
    forceProxyAsOpenAI?:boolean
    hypaModel:'ada'|'MiniLM'
    saveTime?:number
    mancerHeader:string
    emotionProcesser:'submodel'|'embedding',
    showMenuChatList?:boolean,
    translatorType:'google'|'deepl'|'none'|'llm',
    NAIadventure?:boolean,
    NAIappendName?:boolean,
    deeplOptions:{
        key:string,
        freeApi:boolean
    }
    localStopStrings?:string[]
    autofillRequestUrl:boolean
    customProxyRequestModel:string
    generationSeed:number
    newOAIHandle:boolean
    putUserOpen: boolean
    inlayImage:boolean
    gptVisionQuality:string
    reverseProxyOobaMode:boolean
    reverseProxyOobaArgs: OobaChatCompletionRequestParams
    tpo?:boolean
    automark?:boolean
    huggingfaceKey:string
    allowAllExtentionFiles?:boolean
    translatorPrompt:string
    top_p: number,
    google: {
        accessToken: string
        projectId: string
    }
    mistralKey?:string
    chainOfThought?:boolean
    genTime:number
    proomptSettings: ProomptSettings
    keiServerURL:string
    statistics: {
        newYear2024?: {
            messages: number
            chats: number
        }
    },
    top_k:number
    claudeAws:boolean
    lastPatchNoteCheckVersion?:string,
    removePunctuationHypa?:boolean
    largePersonaPortrait?:boolean
}

export interface customscript{
    comment: string;
    in:string
    out:string
    type:string
    flag?:string
    ableFlag?:boolean

}

export type triggerscript = triggerscriptMain

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
    loreCache?:{
        key:string
        data:string[]
    }
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
    viewScreen: 'emotion'|'none'|'imggen'|'vn',
    bias: [string, number][]
    emotionImages: [string, string][]
    globalLore: loreBook[]
    chaId: string
    sdData: [string, string][]
    newGenData?: {
        prompt: string,
        negative: string,
        instructions: string,
        emotionInstructions: string,
    }
    customscript: customscript[]
    triggerscript: triggerscript[]
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
    naittsConfig?:{
        customvoice?: boolean
        voice?: string
        version?: string
    }
    supaMemory?:boolean
    additionalAssets?:[string, string, string][]
    ttsReadOnlyQuoted?:boolean
    replaceGlobalNote:string
    backgroundHTML?:string
    reloadKeys?:number
    backgroundCSS?:string
    license?:string
    private?:boolean
    additionalText:string
    oaiVoice?:string
    virtualscript?:string
    scriptstate?:{[key:string]:string|number|boolean}
    depth_prompt?: { depth: number, prompt: string }
    extentions?:{[key:string]:any}
    largePortrait?:boolean
    lorePlus?:boolean
    inlayViewScreen?:boolean
    hfTTS?: {
        model: string
        language: string
    },
    vits?: OnnxModelFiles
}


export interface loreSettings{
    tokenBudget: number
    scanDepth:number
    recursiveScanning: boolean
    fullWordMatching?: boolean
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
    backgroundHTML?:string,
    reloadKeys?:number
    backgroundCSS?:string
    oneAtTime?:boolean
    virtualscript?:string
    lorePlus?:boolean
}

export interface botPreset{
    name?:string
    apiType?: string
    openAIKey?: string
    mainPrompt: string
    jailbreak: string
    globalNote:string
    temperature: number
    maxContext: number
    maxResponse: number
    frequencyPenalty: number
    PresensePenalty: number
    formatingOrder: FormatingOrderItem[]
    aiModel?: string
    subModel?:string
    currentPluginProvider?:string
    textgenWebUIStreamURL?:string
    textgenWebUIBlockingURL?:string
    forceReplaceUrl?:string
    forceReplaceUrl2?:string
    promptPreprocess: boolean,
    bias: [string, number][]
    proxyRequestModel?:string
    openrouterRequestModel?:string
    proxyKey?:string
    ooba: OobaSettings
    ainconfig: AINsettings
    koboldURL?: string
    NAISettings?: NAISettings
    autoSuggestPrompt?: string
    autoSuggestPrefix?: string
    autoSuggestClean?: boolean
    promptTemplate?:Proompt[]
    NAIadventure?: boolean
    NAIappendName?: boolean
    localStopStrings?: string[]
    customProxyRequestModel?: string
    reverseProxyOobaArgs?: OobaChatCompletionRequestParams
    top_p?: number
    proomptSettings?: ProomptSettings

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

interface NAIImgConfig{
    width:number,
    height:number,
    sampler:string,
    steps:number,
    scale:number,
    sm:boolean,
    sm_dyn:boolean,
    noise:number,
    strength:number,
    image:string
}
export type FormatingOrderItem = 'main'|'jailbreak'|'chats'|'lorebook'|'globalNote'|'authorNote'|'lastChat'|'description'|'postEverything'|'personaPrompt'

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
    scriptstate?:{[key:string]:string|number|boolean}
}

export interface Message{
    role: 'user'|'char'
    data: string
    saying?: string
    chatId?:string
    time?: number
    generationInfo?: MessageGenerationInfo
}

export interface MessageGenerationInfo{
    model?: string
    generationId?: string
}

interface AINsettings{
    top_p: number,
    rep_pen: number,
    top_a: number,
    rep_pen_slope:number,
    rep_pen_range: number,
    typical_p:number
    badwords:string
    stoptokens:string
    top_k:number
}

interface OobaSettings{
    max_new_tokens: number,
    do_sample: boolean,
    temperature: number,
    top_p: number,
    typical_p: number,
    repetition_penalty: number,
    encoder_repetition_penalty: number,
    top_k: number,
    min_length: number,
    no_repeat_ngram_size: number,
    num_beams: number,
    penalty_alpha: number,
    length_penalty: number,
    early_stopping: boolean,
    seed: number,
    add_bos_token: boolean,
    truncation_length: number,
    ban_eos_token: boolean,
    skip_special_tokens: boolean,
    top_a: number,
    tfs: number,
    epsilon_cutoff: number,
    eta_cutoff: number,
    formating:{
        header:string,
        systemPrefix:string,
        userPrefix:string,
        assistantPrefix:string
        seperator:string
        useName:boolean
    }
}


export const saveImage = saveImageGlobal

export const defaultAIN:AINsettings = {
    top_p: 0.7,
    rep_pen: 1.0625,
    top_a: 0.08,
    rep_pen_slope: 1.7,
    rep_pen_range: 1024,
    typical_p: 1.0,
    badwords: '',
    stoptokens: '',
    top_k: 140
}

export const defaultOoba:OobaSettings = {
    max_new_tokens: 180,
    do_sample: true,
    temperature: 0.7,
    top_p: 0.9,
    typical_p: 1,
    repetition_penalty: 1.15,
    encoder_repetition_penalty: 1,
    top_k: 20,
    min_length: 0,
    no_repeat_ngram_size: 0,
    num_beams: 1,
    penalty_alpha: 0,
    length_penalty: 1,
    early_stopping: false,
    seed: -1,
    add_bos_token: true,
    truncation_length: 4096,
    ban_eos_token: false,
    skip_special_tokens: true,
    top_a: 0,
    tfs: 1,
    epsilon_cutoff: 0,
    eta_cutoff: 0,
    formating:{
        header: "Below is an instruction that describes a task. Write a response that appropriately completes the request.",
        systemPrefix: "### Instruction:",
        userPrefix: "### Input:",
        assistantPrefix: "### Response:",
        seperator:"",
        useName:false,
    }
}


export const presetTemplate:botPreset = {
    name: "New Preset",
    apiType: "gpt35_0301",
    openAIKey: "",
    mainPrompt: defaultMainPrompt,
    jailbreak: defaultJailbreak,
    globalNote: "",
    temperature: 80,
    maxContext: 4000,
    maxResponse: 300,
    frequencyPenalty: 70,
    PresensePenalty: 70,
    formatingOrder: ['main', 'description', 'personaPrompt','chats','lastChat', 'jailbreak', 'lorebook', 'globalNote', 'authorNote'],
    aiModel: "gpt35_0301",
    subModel: "gpt35_0301",
    currentPluginProvider: "",
    textgenWebUIStreamURL: '',
    textgenWebUIBlockingURL: '',
    forceReplaceUrl: '',
    forceReplaceUrl2: '',
    promptPreprocess: false,
    proxyKey: '',
    bias: [],
    ooba: cloneDeep(defaultOoba),
    ainconfig: cloneDeep(defaultAIN),
    reverseProxyOobaArgs: {
        mode: 'instruct'
    },
    top_p: 1,

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
        textgenWebUIStreamURL: db.textgenWebUIStreamURL,
        textgenWebUIBlockingURL: db.textgenWebUIBlockingURL,
        forceReplaceUrl: db.forceReplaceUrl,
        forceReplaceUrl2: db.forceReplaceUrl2,
        promptPreprocess: db.promptPreprocess,
        bias: db.bias,
        koboldURL: db.koboldURL,
        proxyKey: db.proxyKey,
        ooba: cloneDeep(db.ooba),
        ainconfig: cloneDeep(db.ainconfig),
        proxyRequestModel: db.proxyRequestModel,
        openrouterRequestModel: db.openrouterRequestModel,
        NAISettings: cloneDeep(db.NAIsettings),
        promptTemplate: db.promptTemplate ?? null,
        NAIadventure: db.NAIadventure ?? false,
        NAIappendName: db.NAIappendName ?? false,
        localStopStrings: db.localStopStrings,
        autoSuggestPrompt: db.autoSuggestPrompt,
        customProxyRequestModel: db.customProxyRequestModel,
        reverseProxyOobaArgs: cloneDeep(db.reverseProxyOobaArgs) ?? null,
        top_p: db.top_p ?? 1,
        proomptSettings: cloneDeep(db.proomptSettings) ?? null
    }
    db.botPresets = pres
    setDatabase(db)
}

export function copyPreset(id:number){
    saveCurrentPreset()
    let db = get(DataBase)
    let pres = db.botPresets
    const newPres = cloneDeep(pres[id])
    newPres.name += " Copy"
    db.botPresets.push(newPres)
    setDatabase(db)
}

export function changeToPreset(id =0, savecurrent = true){
    if(savecurrent){
        saveCurrentPreset()
    }
    let db = get(DataBase)
    let pres = db.botPresets
    const newPres = pres[id]
    db.botPresetsId = id
    db = setPreset(db, newPres)
    setDatabase(db)
}

export function setPreset(db:Database, newPres: botPreset){
    db.apiType = newPres.apiType ?? db.apiType
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
    db.textgenWebUIStreamURL = newPres.textgenWebUIStreamURL ?? db.textgenWebUIStreamURL
    db.textgenWebUIBlockingURL = newPres.textgenWebUIBlockingURL ?? db.textgenWebUIBlockingURL
    db.forceReplaceUrl = newPres.forceReplaceUrl ?? db.forceReplaceUrl
    db.promptPreprocess = newPres.promptPreprocess ?? db.promptPreprocess
    db.forceReplaceUrl2 = newPres.forceReplaceUrl2 ?? db.forceReplaceUrl2
    db.bias = newPres.bias ?? db.bias
    db.koboldURL = newPres.koboldURL ?? db.koboldURL
    db.proxyKey = newPres.proxyKey ?? db.proxyKey
    db.ooba = cloneDeep(newPres.ooba ?? db.ooba)
    db.ainconfig = cloneDeep(newPres.ainconfig ?? db.ainconfig)
    db.openrouterRequestModel = newPres.openrouterRequestModel ?? db.openrouterRequestModel
    db.proxyRequestModel = newPres.proxyRequestModel ?? db.proxyRequestModel
    db.NAIsettings = newPres.NAISettings ?? db.NAIsettings
    db.autoSuggestPrompt = newPres.autoSuggestPrompt ?? db.autoSuggestPrompt
    db.autoSuggestPrefix = newPres.autoSuggestPrefix ?? db.autoSuggestPrefix
    db.autoSuggestClean = newPres.autoSuggestClean ?? db.autoSuggestClean
    db.promptTemplate = newPres.promptTemplate
    db.NAIadventure = newPres.NAIadventure
    db.NAIappendName = newPres.NAIappendName
    db.NAIsettings.cfg_scale ??= 1
    db.NAIsettings.mirostat_tau ??= 0
    db.NAIsettings.mirostat_lr ??= 1
    db.localStopStrings = newPres.localStopStrings
    db.customProxyRequestModel = newPres.customProxyRequestModel ?? ''
    db.reverseProxyOobaArgs = cloneDeep(newPres.reverseProxyOobaArgs) ?? {
        mode: 'instruct'
    }
    db.top_p = newPres.top_p ?? 1
    db.proomptSettings = cloneDeep(newPres.proomptSettings) ?? {
        assistantPrefill: '',
        postEndInnerFormat: '',
        sendChatAsSystem: false,
        sendName: false,
        utilOverride: false
    }
    return db
}

import { encode as encodeMsgpack, decode as decodeMsgpack } from "msgpackr";
import * as fflate from "fflate";
import type { OnnxModelFiles } from '../process/embedding/transformers';

export async function downloadPreset(id:number){
    saveCurrentPreset()
    let db = get(DataBase)
    let pres = cloneDeep(db.botPresets[id])
    console.log(pres)
    pres.openAIKey = ''
    pres.forceReplaceUrl = ''
    pres.forceReplaceUrl2 = ''
    pres.proxyKey = ''
    pres.textgenWebUIStreamURL=  ''
    pres.textgenWebUIBlockingURL=  ''
    const sel = parseInt(await alertSelect(['RISUPRESET (recommended)','JSON']))
    if(sel === 1){
        downloadFile(pres.name + "_preset.json", Buffer.from(JSON.stringify(pres, null, 2)))
    }
    else{
        downloadFile(pres.name + "_preset.risupreset", fflate.compressSync(encodeMsgpack({
            presetVersion: 0,
            type: 'preset',
            pres: await encryptBuffer(
                encodeMsgpack(pres),
                'risupreset'
            )
        })))
    }
    alertNormal(language.successExport)
}


export async function importPreset(){
    const f = await selectSingleFile(["json", "preset", "risupreset"])
    if(!f){
        return
    }
    let pre:any
    if(f.name.endsWith('.risupreset')){
        const decoded = await decodeMsgpack(fflate.decompressSync(f.data))
        console.log(decoded)
        if(decoded.presetVersion === 0 && decoded.type === 'preset'){
            pre = decodeMsgpack(Buffer.from(await decryptBuffer(decoded.pres, 'risupreset')))
        }
    }
    else{
        pre = (JSON.parse(Buffer.from(f.data).toString('utf-8')))
    }
    let db = get(DataBase)
    if(pre.presetVersion && pre.presetVersion >= 3){
        //NAI preset
        const pr = cloneDeep(prebuiltPresets.NAI2)
        pr.temperature = pre.parameters.temperature * 100
        pr.maxResponse = pre.parameters.max_length
        pr.NAISettings.topK = pre.parameters.top_k
        pr.NAISettings.topP = pre.parameters.top_p
        pr.NAISettings.topA = pre.parameters.top_a
        pr.NAISettings.typicalp = pre.parameters.typical_p
        pr.NAISettings.tailFreeSampling = pre.parameters.tail_free_sampling
        pr.NAISettings.repetitionPenalty = pre.parameters.repetition_penalty
        pr.NAISettings.repetitionPenaltyRange = pre.parameters.repetition_penalty_range
        pr.NAISettings.repetitionPenaltySlope = pre.parameters.repetition_penalty_slope
        pr.NAISettings.frequencyPenalty = pre.parameters.repetition_penalty_frequency
        pr.NAISettings.repostitionPenaltyPresence = pre.parameters.repetition_penalty_presence
        pr.PresensePenalty = pre.parameters.repetition_penalty_presence * 100
        pr.NAISettings.cfg_scale = pre.parameters.cfg_scale
        pr.NAISettings.mirostat_lr = pre.parameters.mirostat_lr
        pr.NAISettings.mirostat_tau = pre.parameters.mirostat_tau
        pr.name = pre.name ?? "Imported"
        db.botPresets.push(pr)
        setDatabase(db)
        return
    }
    pre.name ??= "Imported"
    db.botPresets.push(pre)
    setDatabase(db)
}
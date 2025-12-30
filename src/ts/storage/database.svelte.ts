import { get } from 'svelte/store';
import { checkNullish, decryptBuffer, encryptBuffer, selectSingleFile } from '../util';
import { changeLanguage, language } from '../../lang';
import type { RisuPlugin } from '../plugins/plugins';
import type {triggerscript as triggerscriptMain} from '../process/triggers';
import { downloadFile, saveAsset as saveImageGlobal } from '../globalApi.svelte';
import { defaultAutoSuggestPrompt, defaultJailbreak, defaultMainPrompt } from './defaultPrompts';
import { alertNormal } from '../alert';
import type { NAISettings } from '../process/models/nai';
import { prebuiltNAIpresets, prebuiltPresets } from '../process/templates/templates';
import { defaultColorScheme, type ColorScheme } from '../gui/colorscheme';
import type { PromptItem, PromptSettings } from '../process/prompt';
import type { OobaChatCompletionRequestParams } from '../model/ooba';
import { type HypaV3Settings, type HypaV3Preset, createHypaV3Preset } from '../process/memory/hypav3'

//APP_VERSION_POINT is to locate the app version in the database file for version bumping
export let appVer = "166.3.3" //<APP_VERSION_POINT>
export let webAppSubVer = ''


export function setDatabase(data:Database){
    if(checkNullish(data.characters)){
        data.characters = []
    }
    if(checkNullish(data.apiType)){
        data.apiType = 'gemini-3-flash-preview'
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
        data.aiModel = 'gemini-3-flash-preview'
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
    if (checkNullish(data.userNote)){
        data.userNote = ''
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
    if(checkNullish(data.translatorMaxResponse)){
        data.translatorMaxResponse = 1000
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
        data.subModel = 'gemini-3-flash-preview'
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
        data.NAIImgUrl = 'https://image.novelai.net/ai/generate-image'
    }
    if(checkNullish(data.NAIApiKey)){
        data.NAIApiKey = ''
    }
    if(checkNullish(data.NAIImgModel)){
        data.NAIImgModel = 'nai-diffusion-4-5-full'
    }
    if(checkNullish(data.NAII2I)){
        data.NAII2I = false
    }
    if(checkNullish(data.NAIREF)){
        data.NAIREF = false
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
    if(checkNullish(data.showFirstMessagePages)){
        data.showFirstMessagePages = false
    }
    if(checkNullish(data.supaMemoryKey)){
        data.supaMemoryKey = ""
    }
    if(checkNullish(data.hypaMemoryKey)){
        data.hypaMemoryKey = ""
    }
    if(checkNullish(data.supaModelType)){
        data.supaModelType = "none"
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
            width:1024,
            height:1024,
            sampler:"k_euler_ancestral",
            noise_schedule:"karras",
            steps:28,
            scale:5,
            cfg_rescale: 0,
            sm:true,
            sm_dyn:false,
            noise:0.0,
            strength:0.6,
            image:"",
            base64image:"",
            InfoExtracted:1,
            //add 4
            autoSmea:false,
            legacy_uc:false,
            use_coords:false,
            v4_prompt:{
                caption:{
                    base_caption:'',
                    char_captions:[]
                },
                use_coords:false,
                use_order:true
            },
            v4_negative_prompt:{
                caption:{
                    base_caption:'',
                    char_captions:[]
                },
                legacy_uc:false,
            },
            variety_plus: false,
            decrisp: false,
            reference_mode: '',
            character_image: '',
            character_base64image: '',
            style_aware: false,
        }
    }
    //add NAI v4 (사용중인 사람용 추가 DB Init)
    if(checkNullish(data.NAIImgConfig.v4_prompt)){
        data.NAIImgConfig.autoSmea = false;
        data.NAIImgConfig.use_coords = false;
        data.NAIImgConfig.legacy_uc = false;
        data.NAIImgConfig.v4_prompt = {
            caption:{
                base_caption:"",
                char_captions:[]
            },
            use_coords:false,
            use_order:true
        };
        data.NAIImgConfig.v4_negative_prompt = {
            caption:{
                base_caption:"",
                char_captions:[]
            },
            legacy_uc:false,
        };
    }
    if(checkNullish(data.customTextTheme)){
        data.customTextTheme = {
            FontColorStandard: "#f8f8f2",
            FontColorBold: "#f8f8f2",
            FontColorItalic: "#8C8D93",
            FontColorItalicBold: "#8C8D93",
            FontColorQuote1: '#8BE9FD',
            FontColorQuote2: '#FFB86C'
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
    data.OAIPrediction ??= ''
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
        note: data.userNote,
        largePortrait: false
    }]
    data.classicMaxWidth ??= false
    data.ooba ??= safeStructuredClone(defaultOoba)
    data.ainconfig ??= safeStructuredClone(defaultAIN)
    data.openrouterKey ??= ''
    data.openrouterRequestModel ??= 'openai/gpt-3.5-turbo'
    data.toggleConfirmRecommendedPreset ??= true
    data.officialplugins ??= {}
    data.NAIsettings ??= safeStructuredClone(prebuiltNAIpresets)
    data.assetWidth ??= -1
    data.animationSpeed ??= 0.4
    data.colorScheme ??= safeStructuredClone(defaultColorScheme)
    data.colorSchemeName ??= 'default'
    data.NAIsettings.starter ??= ""
    data.hypaModel ??= 'MiniLM'
    data.mancerHeader ??= ''
    data.emotionProcesser ??= 'submodel'
    data.translatorType ??= 'google'
    data.htmlTranslation ??= false
    data.deeplOptions ??= {
        key:'',
        freeApi: false
    }
    data.deeplXOptions ??= {
        url:'',
        token:''
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
    data.fishSpeechKey ??= ''
    data.statistics ??= {}
    data.presetRegex ??= []
    data.reverseProxyOobaArgs ??= {
        mode: 'instruct'
    }
    data.top_p ??= 1
    if(typeof(data.top_p) !== 'number'){
        //idk why type changes, but it does so this is a fix
        data.top_p = 1
    }
    //@ts-expect-error data.google has required fields (accessToken, projectId), but we use empty object as default and populate below
    data.google ??= {}
    data.google.accessToken ??= ''
    data.google.projectId ??= ''
    data.genTime ??= 1
    data.promptSettings ??= {
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
    data.promptSettings.maxThoughtTagDepth ??= -1
    data.openrouterFallback ??= true
    data.openrouterMiddleOut ??= false
    data.removePunctuationHypa ??= true
    data.memoryLimitThickness ??= 1
    data.modules ??= []
    data.enabledModules ??= []
    data.additionalParams ??= []
    data.heightMode ??= 'normal'
    data.antiClaudeOverload ??= false
    data.maxSupaChunkSize ??= 1200
    data.ollamaURL ??= ''
    data.ollamaModel ??= ''
    data.autoContinueChat ??= false
    data.autoContinueMinTokens ??= 0
    data.repetition_penalty ??= 1
    data.min_p ??= 0
    data.top_a ??= 0
    data.customTokenizer ??= 'tik'
    data.instructChatTemplate ??= "chatml"
    // Migration: convert old string type into new provider object
    if (typeof data.openrouterProvider === 'string') {
        const oldProvider = data.openrouterProvider as unknown as string;
        data.openrouterProvider = {
            order: oldProvider ? [oldProvider] : [],
            only: [],
            ignore: []
        }
    }
    if (data.botPresets) {
        for (const preset of data.botPresets) {
            if (typeof preset.openrouterProvider === 'string') {
                const oldProvider = preset.openrouterProvider as unknown as string;
                preset.openrouterProvider = {
                    order: oldProvider ? [oldProvider] : [],
                    only: [],
                    ignore: []
                }
            }
        }
    }
    data.openrouterProvider ??= {
        order: [],
        only: [],
        ignore: []
    }
    data.useInstructPrompt ??= false
    data.hanuraiEnable ??= false
    data.hanuraiSplit ??= false
    data.hanuraiTokens ??= 1000
    data.textAreaSize ??= 0
    data.sideBarSize ??= 0
    data.textAreaTextSize ??= 0
    data.combineTranslation ??= false
    data.customPromptTemplateToggle ??= ''
    data.globalChatVariables ??= {}
    data.templateDefaultVariables ??= ''
    data.hypaAllocatedTokens ??= 3000
    data.hypaChunkSize ??= 3000
    data.dallEQuality ??= 'standard'
    data.customTextTheme.FontColorQuote1 ??= '#8BE9FD'
    data.customTextTheme.FontColorQuote2 ??= '#FFB86C'
    data.font ??= 'default'
    data.customFont ??= ''
    data.lineHeight ??= 1.25
    data.stabilityModel ??= 'sd3-large'
    data.stabllityStyle ??= ''
    data.legacyTranslation ??= false
    data.comfyUiUrl ??= 'http://localhost:8188'
    data.comfyConfig ??= {
        workflow: '',
        posNodeID: '',
        posInputName: 'text',
        negNodeID: '',
        negInputName: 'text',
        timeout: 30
    }
    data.hideApiKey ??= true
    data.unformatQuotes ??= false
    data.ttsAutoSpeech ??= false
    data.translatorInputLanguage ??= 'auto'
    data.falModel ??= 'fal-ai/flux/dev'
    data.falLoraScale ??= 1
    data.customCSS ??= ''
    data.strictJsonSchema ??= true
    data.statics ??= {
        messages: 0,
        imports: 0
    }
    data.customQuotes ??= false
    data.customQuotesData ??= ['“','”','‘','’']
    data.groupOtherBotRole ??= 'user'
    data.customGUI ??= ''
    data.customAPIFormat ??= LLMFormat.OpenAICompatible
    data.systemContentReplacement ??= `system: {{slot}}`
    data.systemRoleReplacement ??= 'user'
    data.vertexAccessToken ??= ''
    data.vertexAccessTokenExpires ??= 0
    data.vertexClientEmail ??= ''
    data.vertexPrivateKey ??= ''
    data.vertexRegion ??= 'global'
    data.seperateParametersEnabled ??= false
    data.seperateParameters ??= {
        memory: {},
        emotion: {},
        translate: {},
        otherAx: {}
    }
    data.customFlags ??= []
    data.enableCustomFlags ??= false
    data.assetMaxDifference ??= 4
    data.showSavingIcon ??= false
    data.banCharacterset ??= []
    data.showPromptComparison ??= false
    data.checkCorruption ??= true
    data.OaiCompAPIKeys ??= {}
    data.reasoningEffort ??= 0
    data.hypaV3Presets ??= [
        createHypaV3Preset("Default", {
            summarizationPrompt: data.supaMemoryPrompt ? data.supaMemoryPrompt : "",
            ...data.hypaV3Settings
        })
    ]
    if (data.hypaV3Presets.length > 0) {
        data.hypaV3Presets = data.hypaV3Presets.map((preset, i) =>
            createHypaV3Preset(
                preset.name || `Preset ${i + 1}`,
                preset.settings || {}
            )
        )
    }
    data.hypaV3PresetId ??= 0
    data.showDeprecatedTriggerV2 ??= false
    data.returnCSSError ??= true
    data.realmDirectOpen ??= false
    data.useExperimentalGoogleTranslator ??= false
    if(data.antiClaudeOverload){ //migration
        data.antiClaudeOverload = false
        data.antiServerOverloads = true
    }
    data.hypaCustomSettings = {
        url: data.hypaCustomSettings?.url ?? "",
        key: data.hypaCustomSettings?.key ?? "",
        model: data.hypaCustomSettings?.model ?? ""     
    }
    data.doNotChangeSeperateModels ??= false
    data.modelTools ??= []
    data.hotkeys ??= safeStructuredClone(defaultHotkeys)
    data.fallbackModels ??= {
        memory: [],
        emotion: [],
        translate: [],
        otherAx: [],
        model: []
    }
    data.fallbackModels = {
        model: data.fallbackModels.model.filter((v) => v !== ''),
        memory: data.fallbackModels.memory.filter((v) => v !== ''),
        emotion: data.fallbackModels.emotion.filter((v) => v !== ''),
        translate: data.fallbackModels.translate.filter((v) => v !== ''),
        otherAx: data.fallbackModels.otherAx.filter((v) => v !== '')
    }
    data.customModels ??= []
    data.authRefreshes ??= []
    data.rememberToolUsage ??= true
    data.simplifiedToolUse ??= false
    data.streamGeminiThoughts ??= false
    data.sourcemapTranslate ??= false
    data.settingsCloseButtonSize ??= 24
    data.ImagenModel ??= 'imagen-4.0-generate-001'
    data.ImagenImageSize ??= '1K'
    data.ImagenAspectRatio ??= '1:1'
    data.ImagenPersonGeneration ??= 'allow_all'
    //@ts-expect-error __TAURI_INTERNALS__ is injected by Tauri runtime, not defined in Window interface
    if(!globalThis.__NODE__ && !window.__TAURI_INTERNALS__){
        //this is intended to forcely reduce the size of the database in web
        data.promptInfoInsideChat = false
    }
    changeLanguage(data.language)
    setDatabaseLite(data)
}

export function setDatabaseLite(data:Database){
    DBState.db = data
}

interface getDatabaseOptions{
    snapshot?:boolean
}

export function getDatabase(options:getDatabaseOptions = {}):Database{
    if(options.snapshot){
        return $state.snapshot(DBState.db) as Database
    }
    return DBState.db as Database
}

export function getCurrentCharacter(options:getDatabaseOptions = {}):character|groupChat{
    const db = getDatabase(options)
    if(!db.characters){
        db.characters = []
    }
    const char = db.characters?.[get(selectedCharID)]
    return char
}

export function setCurrentCharacter(char:character|groupChat){
    if(!DBState.db.characters){
        DBState.db.characters = []
    }
    DBState.db.characters[get(selectedCharID)] = char
}

export function getCharacterByIndex(index:number,options:getDatabaseOptions = {}):character|groupChat{
    const db = getDatabase(options)
    if(!db.characters){
        db.characters = []
    }
    const char = db.characters?.[index]
    return char
}

export function setCharacterByIndex(index:number,char:character|groupChat){
    if(!DBState.db.characters){
        DBState.db.characters = []
    }
    DBState.db.characters[index] = char
}

export function getCurrentChat(){
    const char = getCurrentCharacter()
    return char?.chats[char.chatPage]
}

export function setCurrentChat(chat:Chat){
    const char = getCurrentCharacter()
    char.chats[char.chatPage] = chat
    setCurrentCharacter(char)
}

export interface DynamicOutput {
    autoAdjustSchema: boolean
    dynamicMessages: boolean
    dynamicMemory: boolean
    dynamicResponseTiming: boolean
    dynamicOutputPrompt: boolean
    showTypingEffect: boolean
    dynamicRequest: boolean
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
    userNote: string
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
    NAIREF:boolean
    NAIImgConfig:NAIImgConfig
    ttsAutoSpeech?:boolean
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
        FontColorQuote1 : string,
        FontColorQuote2 : string
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
    hypaMemoryKey:string
    supaModelType:string
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
    fixedChatTextarea:boolean
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
    hypav2:boolean
    memoryAlgorithmType:string // To enable new memory module/algorithms 
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
        largePortrait?:boolean
        id?:string
        note?:string
    }[]
    personaNote:boolean
    assetWidth:number
    animationSpeed:number
    botSettingAtStart:false
    NAIsettings:NAISettings
    hideRealm:boolean
    colorScheme:ColorScheme
    colorSchemeName:string
    promptTemplate?:PromptItem[]
    forceProxyAsOpenAI?:boolean
    hypaModel:HypaModel
    saveTime?:number
    mancerHeader:string
    emotionProcesser:'submodel'|'embedding',
    showMenuChatList?:boolean,
    translatorType:'google'|'deepl'|'none'|'llm'|'deeplX'|'bergamot',
    translatorInputLanguage?:string
    htmlTranslation?:boolean,
    NAIadventure?:boolean,
    NAIappendName?:boolean,
    deeplOptions:{
        key:string,
        freeApi:boolean
    }
    deeplXOptions:{
        url:string,
        token:string    
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
    fishSpeechKey:string
    allowAllExtentionFiles?:boolean
    translatorPrompt:string
    translatorMaxResponse:number
    top_p: number,
    google: {
        accessToken: string
        projectId: string
    }
    mistralKey?:string
    chainOfThought?:boolean
    genTime:number
    promptSettings: PromptSettings
    keiServerURL:string
    statistics: {
        newYear2024?: {
            messages: number
            chats: number
        }
    },
    top_k:number
    repetition_penalty:number
    min_p:number
    top_a:number
    claudeAws:boolean
    lastPatchNoteCheckVersion?:string,
    removePunctuationHypa?:boolean
    memoryLimitThickness?:number
    modules: RisuModule[]
    enabledModules: string[]
    sideMenuRerollButton?:boolean
    requestInfoInsideChat?:boolean
    additionalParams:[string, string][]
    heightMode:string
    useAdvancedEditor:boolean
    noWaitForTranslate:boolean
    antiClaudeOverload:boolean
    maxSupaChunkSize:number
    ollamaURL:string
    ollamaModel:string
    autoContinueChat:boolean
    autoContinueMinTokens:number
    removeIncompleteResponse:boolean
    customTokenizer:string
    instructChatTemplate:string
    JinjaTemplate:string
    openrouterProvider: {
        order: string[]
        only: string[]
        ignore: string[]
    }
    useInstructPrompt:boolean
    hanuraiTokens:number
    hanuraiSplit:boolean
    hanuraiEnable:boolean
    textAreaSize:number
    sideBarSize:number
    textAreaTextSize:number
    combineTranslation:boolean
    dynamicAssets:boolean
    dynamicAssetsEditDisplay:boolean
    customPromptTemplateToggle:string
    globalChatVariables:{[key:string]:string}
    templateDefaultVariables:string
    hypaAllocatedTokens:number
    hypaChunkSize:number
    cohereAPIKey:string
    goCharacterOnImport:boolean
    dallEQuality:string
    font: string
    customFont: string
    lineHeight: number
    stabilityModel: string
    stabilityKey: string
    stabllityStyle: string
    legacyTranslation: boolean
    comfyConfig: ComfyConfig
    comfyUiUrl: string
    useLegacyGUI: boolean
    claudeCachingExperimental: boolean
    hideApiKey: boolean
    unformatQuotes: boolean
    enableDevTools: boolean
    falToken: string
    falModel: string
    falLora: string
    falLoraName: string
    falLoraScale: number
    moduleIntergration: string
    customCSS: string
    betaMobileGUI:boolean
    jsonSchemaEnabled:boolean
    jsonSchema:string
    strictJsonSchema:boolean
    extractJson:string
    ai21Key:string
    statics: {
        messages: number
        imports: number
    }
    customQuotes:boolean
    customQuotesData?:[string, string, string, string]
    groupTemplate?:string
    groupOtherBotRole?:string
    customGUI:string
    guiHTML:string
    logShare:boolean
    OAIPrediction:string
    customAPIFormat:LLMFormat
    systemContentReplacement:string
    systemRoleReplacement:'user'|'assistant'
    vertexPrivateKey: string
    vertexClientEmail: string
    vertexAccessToken: string
    vertexAccessTokenExpires: number
    vertexRegion: string
    seperateParametersEnabled:boolean
    seperateParameters:{
        memory: SeparateParameters,
        emotion: SeparateParameters,
        translate: SeparateParameters,
        otherAx: SeparateParameters
    }
    translateBeforeHTMLFormatting:boolean
    autoTranslateCachedOnly:boolean
    lightningRealmImport:boolean
    notification: boolean
    customFlags: LLMFlags[]
    enableCustomFlags: boolean
    googleClaudeTokenizing: boolean
    presetChain: string
    legacyMediaFindings?:boolean
    geminiStream?:boolean
    assetMaxDifference:number
    menuSideBar:boolean
    pluginV2: RisuPlugin[]
    showSavingIcon:boolean
    presetRegex: customscript[]
    banCharacterset:string[]
    showPromptComparison:boolean
    checkCorruption:boolean
    hypaV3:boolean
    hypaV3Settings: HypaV3Settings // legacy
    hypaV3Presets: HypaV3Preset[]
    hypaV3PresetId: number
    realmDirectOpen:boolean
    OaiCompAPIKeys: {[key:string]:string}
    inlayErrorResponse:boolean
    reasoningEffort:number
    bulkEnabling:boolean
    showTranslationLoading: boolean
    showDeprecatedTriggerV1:boolean
    showDeprecatedTriggerV2:boolean
    returnCSSError:boolean
    useExperimentalGoogleTranslator:boolean
    thinkingTokens: number
    antiServerOverloads: boolean
    hypaCustomSettings: {
        url: string,
        key: string,
        model: string,       
    },
    localActivationInGlobalLorebook: boolean
    showFolderName: boolean
    automaticCachePoint: boolean
    chatCompression: boolean
    claudeRetrivalCaching: boolean
    outputImageModal: boolean
    playMessageOnTranslateEnd:boolean
    seperateModelsForAxModels:boolean
    seperateModels:{
        memory: string
        emotion: string
        translate: string
        otherAx: string
    }
    doNotChangeSeperateModels:boolean
    modelTools: string[]
    hotkeys:Hotkey[]
    fallbackModels: {
        memory: string[],
        emotion: string[],
        translate: string[],
        otherAx: string[]
        model: string[]
    }
    doNotChangeFallbackModels: boolean
    fallbackWhenBlankResponse: boolean
    customModels: {
        id: string
        internalId: string
        url: string
        format: LLMFormat
        tokenizer: LLMTokenizer
        key: string
        name: string
        params: string
        flags: LLMFlags[]
    }[]
    igpPrompt:string
    useTokenizerCaching:boolean
    showMenuHypaMemoryModal:boolean
    authRefreshes:{
        url:string
        tokenUrl:string
        refreshToken:string
        clientId:string
        clientSecret:string
    }[]
    promptInfoInsideChat:boolean
    promptTextInfoInsideChat:boolean
    claudeBatching:boolean
    claude1HourCaching:boolean
    rememberToolUsage:boolean
    simplifiedToolUse:boolean
    requestLocation:string
    newImageHandlingBeta?: boolean
    showFirstMessagePages:boolean
    streamGeminiThoughts:boolean
    verbosity:number
    dynamicOutput?:DynamicOutput
    hubServerType?:string
    pluginCustomStorage:{[key:string]:any}
    ImagenModel:string
    ImagenImageSize:string
    ImagenAspectRatio:string
    ImagenPersonGeneration:string,
    sourcemapTranslate:boolean
    settingsCloseButtonSize:number
    enableBookmark?: boolean
    pluginDevelopMode?: boolean
}

interface SeparateParameters{
    temperature?:number
    top_k?:number
    repetition_penalty?:number
    min_p?:number
    top_a?:number
    top_p?:number
    frequency_penalty?:number
    presence_penalty?:number
    reasoning_effort?:number
    thinking_tokens?:number
    outputImageModal?:boolean
    verbosity?:number
}

type OutputModal = 'image'|'audio'|'video'

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
    mode: 'multiple'|'constant'|'normal'|'child'|'folder',
    alwaysActive: boolean
    selective:boolean
    extentions?:{
        risu_case_sensitive:boolean
    }
    activationPercent?:number
    loreCache?:{
        key:string
        data:string[]
    },
    useRegex?:boolean
    bookVersion?:number
    id?:string
    folder?:string
}

export interface character{
    type?:"character"
    name:string
    image?:string
    firstMessage:string
    desc:string
    notes:string
    chats:Chat[]
    chatFolders: ChatFolder[]
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
    gptSoVitsConfig?:{
        url?:string
        use_auto_path?:boolean
        ref_audio_path?:string
        use_long_audio?:boolean
        ref_audio_data?: {
            fileName:string
            assetId:string
        }
        volume?:number
        text_lang?: "auto" | "auto_yue" | "en" | "zh" | "ja" | "yue" | "ko" | "all_zh" | "all_ja" | "all_yue" | "all_ko"
        text?:string
        use_prompt?:boolean
        prompt?:string | null
        prompt_lang?: "auto" | "auto_yue" | "en" | "zh" | "ja" | "yue" | "ko" | "all_zh" | "all_ja" | "all_yue" | "all_ko"
        top_p?:number
        temperature?:number
        speed?:number
        top_k?:number
        text_split_method?: "cut0" | "cut1" | "cut2" | "cut3" | "cut4" | "cut5"
    }
    fishSpeechConfig?:{
        model?: {
            _id:string
            title:string
            description:string
        },
        chunk_length:number,
        normalize:boolean,

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
    realmId?:string
    imported?:boolean
    trashTime?:number
    nickname?:string
    source?:string[]
    group_only_greetings?:string[]
    creation_date?:number
    modification_date?:number
    ccAssets?: Array<{
        type: string
        uri: string
        name: string
        ext: string
    }>
    defaultVariables?:string
    lowLevelAccess?:boolean
    hideChatIcon?:boolean
    lastInteraction?:number
    translatorNote?:string
    doNotChangeSeperateModels?:boolean
    escapeOutput?:boolean
    prebuiltAssetCommand?:boolean
    prebuiltAssetStyle?:string
    prebuiltAssetExclude?:string[]
    modules?:string[]
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
    chatFolders: ChatFolder[]
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
    trashTime?:number
    nickname?:string
    defaultVariables?:string
    lowLevelAccess?:boolean
    hideChatIcon?:boolean
    lastInteraction?:number

    //lazy hack for typechecking
    voicevoxConfig?:any
    ttsSpeech?:string
    naittsConfig?:any
    oaiVoice?:string
    hfTTS?: any
    vits?: OnnxModelFiles
    gptSoVitsConfig?:any
    fishSpeechConfig?:any
    ttsReadOnlyQuoted?:boolean
    exampleMessage?:string
    systemPrompt?:string
    replaceGlobalNote?:string
    additionalText?:string
    personality?:string
    scenario?:string
    translatorNote?:string
    additionalData?: any
    depth_prompt?: { depth: number, prompt: string }
    additionalAssets?:[string, string, string][]
    utilityBot?:boolean
    license?:string
    realmId:string
    prebuiltAssetCommand?:boolean
    prebuiltAssetStyle?:string
    prebuiltAssetExclude?:string[]
    modules?:string[]
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
    promptTemplate?:PromptItem[]
    NAIadventure?: boolean
    NAIappendName?: boolean
    localStopStrings?: string[]
    customProxyRequestModel?: string
    reverseProxyOobaArgs?: OobaChatCompletionRequestParams
    top_p?: number
    promptSettings?: PromptSettings
    repetition_penalty?:number
    min_p?:number
    top_a?:number
    openrouterProvider?: {
        order: string[]
        only: string[]
        ignore: string[]
    }
    useInstructPrompt?:boolean
    customPromptTemplateToggle?:string
    templateDefaultVariables?:string
    moduleIntergration?:string
    top_k?:number
    instructChatTemplate?:string
    JinjaTemplate?:string
    jsonSchemaEnabled?:boolean
    jsonSchema?:string
    strictJsonSchema?:boolean
    extractJson?:string
    groupTemplate?:string
    groupOtherBotRole?:string
    seperateParametersEnabled?:boolean
    seperateParameters?:{
        memory: SeparateParameters,
        emotion: SeparateParameters,
        translate: SeparateParameters,
        otherAx: SeparateParameters
    }
    customAPIFormat?:LLMFormat
    systemContentReplacement?: string
    systemRoleReplacement?: 'user'|'assistant'
    openAIPrediction?: string
    enableCustomFlags?: boolean
    customFlags?: LLMFlags[]
    image?:string
    regex?:customscript[]
    reasonEffort?:number
    thinkingTokens?:number
    outputImageModal?:boolean
    seperateModelsForAxModels?:boolean
    seperateModels?:{
        memory: string
        emotion: string
        translate: string
        otherAx: string
    }
    modelTools?:string[]
    fallbackModels?: {
        memory: string[],
        emotion: string[],
        translate: string[],
        otherAx: string[]
        model: string[]
    }
    fallbackWhenBlankResponse?: boolean
    verbosity?:number
    dynamicOutput?:DynamicOutput
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
    imgFile?:string
    img?:string
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

export interface NAIImgConfig{
    width:number,
    height:number,
    sampler:string,
    noise_schedule:string,
    steps:number,
    scale:number,
    cfg_rescale:number,
    sm:boolean,
    sm_dyn:boolean,
    noise:number,
    strength:number,
    image:string,
    base64image:string,
    InfoExtracted:number,
    //add 4
    autoSmea:boolean,
    use_coords:boolean,
    legacy_uc: boolean,
    v4_prompt:NAIImgConfigV4Prompt,
    v4_negative_prompt:NAIImgConfigV4NegativePrompt,
    //add vibe
    reference_image_multiple?:string[],
    reference_strength_multiple?:number[],
    vibe_data?:NAIVibeData,
    vibe_model_selection?:string
    //add variety+ and decrisp options
    variety_plus:boolean,
    decrisp:boolean,
    //add character reference
    reference_mode:string,
    character_image:string,
    character_base64image:string,
    style_aware:boolean,
}

//add 4
interface NAIImgConfigV4Prompt{
    caption: NAIImgConfigV4Caption,
    use_coords: boolean,
    use_order: boolean
}
//add 4
interface NAIImgConfigV4NegativePrompt{
    caption: NAIImgConfigV4Caption,
    legacy_uc: boolean
}
//add 4
interface NAIImgConfigV4Caption{
    base_caption: string,
    char_captions: NAIImgConfigV4CharCaption[]
}
//add 4
interface NAIImgConfigV4CharCaption{
    char_caption: string,
    centers:
        {
            x: number,
            y: number
        }[]
}

// NAI Vibe Data interfaces
interface NAIVibeData {
    identifier: string;
    version: number;
    type: string;
    image: string;
    id: string;
    encodings: {
        [key: string]: {
            [key: string]: NAIVibeEncoding;
        }
    };
    name: string;
    thumbnail: string;
    createdAt: number;
    importInfo: {
        model: string;
        information_extracted: number;
        strength: number;
    };
}

interface NAIVibeEncoding {
    encoding: string;
    params: {
        information_extracted: number;
    };
}

interface ComfyConfig{
    workflow:string,
    posNodeID: string,
    posInputName:string,
    negNodeID: string,
    negInputName:string,
    timeout: number
}

export type FormatingOrderItem = 'main'|'jailbreak'|'chats'|'lorebook'|'globalNote'|'authorNote'|'lastChat'|'description'|'postEverything'|'personaPrompt'

export interface Chat{
    message: Message[]
    note:string
    name:string
    localLore: loreBook[]
    sdData?:string
    supaMemoryData?:string
    hypaV2Data?:SerializableHypaV2Data
    lastMemory?:string
    suggestMessages?:string[]
    isStreaming?:boolean
    scriptstate?:{[key:string]:string|number|boolean}
    modules?:string[]
    id?:string
    bindedPersona?:string
    fmIndex?:number
    hypaV3Data?:SerializableHypaV3Data
    folderId?:string
    lastDate?:number
    bookmarks?: string[];
    bookmarkNames?: { [chatId: string]: string };
}

export interface ChatFolder{
    id:string
    name?:string
    color?:string
    folded:boolean
}

export interface Message{
    role: 'user'|'char'
    data: string
    saying?: string
    chatId?:string
    time?: number
    generationInfo?: MessageGenerationInfo
    promptInfo?: MessagePresetInfo
    name?:string
    otherUser?:boolean
    disabled?:false|true|'allBefore'
    isComment?:boolean
}

export interface MessageGenerationInfo{
    model?: string
    generationId?: string
    inputTokens?: number
    outputTokens?: number
    maxContext?: number
    stageTiming?: {
        stage1?: number
        stage2?: number
        stage3?: number
        stage4?: number
    }
}

export interface MessagePresetInfo{
    promptName?: string,
    promptToggles?: {key: string, value: string}[],
    promptText?: OpenAIChat[],
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

export interface OobaSettings{
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
    apiType: "gemini-3-flash-preview",
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
    aiModel: "gemini-3-flash-preview",
    subModel: "gemini-3-flash-preview",
    currentPluginProvider: "",
    textgenWebUIStreamURL: '',
    textgenWebUIBlockingURL: '',
    forceReplaceUrl: '',
    forceReplaceUrl2: '',
    promptPreprocess: false,
    proxyKey: '',
    bias: [],
    ooba: safeStructuredClone(defaultOoba),
    ainconfig: safeStructuredClone(defaultAIN),
    reverseProxyOobaArgs: {
        mode: 'instruct'
    },
    top_p: 1,
    useInstructPrompt: false,
    verbosity: 1
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
    return safeStructuredClone(defaultSdData)
}

export function saveCurrentPreset(){
    let db = getDatabase()
    let pres = db.botPresets
    const savedPreset:botPreset =  {
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
        ooba: safeStructuredClone(db.ooba),
        ainconfig: safeStructuredClone(db.ainconfig),
        proxyRequestModel: db.proxyRequestModel,
        openrouterRequestModel: db.openrouterRequestModel,
        NAISettings: safeStructuredClone(db.NAIsettings),
        promptTemplate: db.promptTemplate ?? null,
        NAIadventure: db.NAIadventure ?? false,
        NAIappendName: db.NAIappendName ?? false,
        localStopStrings: db.localStopStrings,
        autoSuggestPrompt: db.autoSuggestPrompt,
        customProxyRequestModel: db.customProxyRequestModel,
        reverseProxyOobaArgs: safeStructuredClone(db.reverseProxyOobaArgs) ?? null,
        top_p: db.top_p ?? 1,
        promptSettings: safeStructuredClone(db.promptSettings) ?? null,
        repetition_penalty: db.repetition_penalty,
        min_p: db.min_p,
        top_a: db.top_a,
        openrouterProvider: db.openrouterProvider,
        useInstructPrompt: db.useInstructPrompt,
        customPromptTemplateToggle: db.customPromptTemplateToggle ?? "",
        templateDefaultVariables: db.templateDefaultVariables ?? "",
        moduleIntergration: db.moduleIntergration ?? "",
        top_k: db.top_k,
        instructChatTemplate: db.instructChatTemplate,
        JinjaTemplate: db.JinjaTemplate ?? '',
        jsonSchemaEnabled:db.jsonSchemaEnabled??false,
        jsonSchema:db.jsonSchema ?? '',
        strictJsonSchema:db.strictJsonSchema ?? true,
        extractJson:db.extractJson ?? '',
        groupOtherBotRole: db.groupOtherBotRole ?? 'user',
        groupTemplate: db.groupTemplate ?? '',
        seperateParametersEnabled: db.seperateParametersEnabled ?? false,
        seperateParameters: safeStructuredClone(db.seperateParameters),
        openAIPrediction: db.OAIPrediction,
        customAPIFormat: safeStructuredClone(db.customAPIFormat),
        systemContentReplacement: db.systemContentReplacement,
        systemRoleReplacement: db.systemRoleReplacement,
        customFlags: safeStructuredClone(db.customFlags),
        enableCustomFlags: db.enableCustomFlags,
        regex: db.presetRegex,
        image: pres?.[db.botPresetsId]?.image ?? '',
        reasonEffort: db.reasoningEffort ?? 0,
        thinkingTokens: db.thinkingTokens ?? null,
        outputImageModal: db.outputImageModal ?? false,
        seperateModelsForAxModels: db.doNotChangeSeperateModels ? false : db.seperateModelsForAxModels ?? false,
        seperateModels: db.doNotChangeSeperateModels ? null : safeStructuredClone(db.seperateModels),
        modelTools: safeStructuredClone(db.modelTools),
        fallbackModels: safeStructuredClone(db.fallbackModels),
        fallbackWhenBlankResponse: db.fallbackWhenBlankResponse ?? false,
        verbosity: db.verbosity ?? 1,
        dynamicOutput: db.dynamicOutput ?? null
    }
    
    if(!Array.isArray(pres)){
        pres = []
    }
    //if out of bounds, create a new preset
    if(db.botPresetsId >= pres.length){
        pres.push(savedPreset)
    }
    else{
        pres[db.botPresetsId] = savedPreset
    }
    db.botPresets = pres
    setDatabase(db)
}

export function copyPreset(id:number){
    saveCurrentPreset()
    let db = getDatabase()
    let pres = db.botPresets
    const newPres = safeStructuredClone(pres[id])
    newPres.name += " Copy"
    db.botPresets.push(newPres)
    setDatabase(db)
}

export function changeToPreset(id =0, savecurrent = true){
    if(savecurrent){
        saveCurrentPreset()
    }
    let db = getDatabase()
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
    db.ooba = safeStructuredClone(newPres.ooba ?? db.ooba)
    db.ainconfig = safeStructuredClone(newPres.ainconfig ?? db.ainconfig)
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
    db.reverseProxyOobaArgs = safeStructuredClone(newPres.reverseProxyOobaArgs) ?? {
        mode: 'instruct'
    }
    db.top_p = newPres.top_p ?? 1
    db.promptSettings = safeStructuredClone(newPres.promptSettings) ?? {
        assistantPrefill: '',
        postEndInnerFormat: '',
        sendChatAsSystem: false,
        sendName: false,
        utilOverride: false,
    }
    db.promptSettings.maxThoughtTagDepth ??= -1
    db.repetition_penalty = newPres.repetition_penalty
    db.min_p = newPres.min_p
    db.top_a = newPres.top_a
    db.openrouterProvider = newPres.openrouterProvider
    db.useInstructPrompt = newPres.useInstructPrompt ?? false
    db.customPromptTemplateToggle = newPres.customPromptTemplateToggle ?? ''
    db.templateDefaultVariables = newPres.templateDefaultVariables ?? ''
    db.moduleIntergration = newPres.moduleIntergration ?? ''
    db.top_k = newPres.top_k ?? db.top_k
    db.instructChatTemplate = newPres.instructChatTemplate ?? db.instructChatTemplate
    db.JinjaTemplate = newPres.JinjaTemplate ?? db.JinjaTemplate
    db.jsonSchemaEnabled = newPres.jsonSchemaEnabled ?? false
    db.jsonSchema = newPres.jsonSchema ?? ''
    db.strictJsonSchema = newPres.strictJsonSchema ?? true
    db.extractJson = newPres.extractJson ?? ''
    db.groupOtherBotRole = newPres.groupOtherBotRole ?? 'user'
    db.groupTemplate = newPres.groupTemplate ?? ''
    db.seperateParametersEnabled = newPres.seperateParametersEnabled ?? false
    db.seperateParameters = newPres.seperateParameters ? safeStructuredClone(newPres.seperateParameters) : {
        memory: {},
        emotion: {},
        translate: {},
        otherAx: {}
    }
    db.OAIPrediction = newPres.openAIPrediction ?? ''
    db.customAPIFormat = safeStructuredClone(newPres.customAPIFormat) ?? LLMFormat.OpenAICompatible
    db.systemContentReplacement = newPres.systemContentReplacement ?? ''
    db.systemRoleReplacement = newPres.systemRoleReplacement ?? 'user'
    db.customFlags = safeStructuredClone(newPres.customFlags) ?? []
    db.enableCustomFlags = newPres.enableCustomFlags ?? false
    db.presetRegex = newPres.regex ?? []
    db.reasoningEffort = newPres.reasonEffort ?? 0
    db.thinkingTokens = newPres.thinkingTokens ?? null
    db.outputImageModal = newPres.outputImageModal ?? false
    if(!db.doNotChangeSeperateModels){
        db.seperateModelsForAxModels = newPres.seperateModelsForAxModels ?? false
        db.seperateModels = safeStructuredClone(newPres.seperateModels) ?? {
            memory: '',
            emotion: '',
            translate: '',
            otherAx: ''
        }
    }
    if(!db.doNotChangeFallbackModels){
        db.fallbackModels = safeStructuredClone(newPres.fallbackModels) ?? {
            memory: [],
            emotion: [],
            translate: [],
            otherAx: [],
            model: []
        }
        db.fallbackWhenBlankResponse = newPres.fallbackWhenBlankResponse ?? false
    }
    db.modelTools = safeStructuredClone(newPres.modelTools ?? [])
    db.verbosity = newPres.verbosity ?? 1
    db.dynamicOutput = newPres.dynamicOutput

    return db
}

import { encode as encodeMsgpack, decode as decodeMsgpack } from "msgpackr/index-no-eval";
import * as fflate from "fflate";
import type { OnnxModelFiles } from '../process/transformers';
import type { RisuModule } from '../process/modules';
import type { SerializableHypaV2Data } from '../process/memory/hypav2';
import { decodeRPack, encodeRPack } from '../rpack/rpack_bg';
import { DBState, selectedCharID } from '../stores.svelte';
import { LLMFlags, LLMFormat, LLMTokenizer } from '../model/modellist';
import type { HypaModel } from '../process/memory/hypamemory';
import type { SerializableHypaV3Data } from '../process/memory/hypav3';
import { defaultHotkeys, type Hotkey } from '../defaulthotkeys';
import type { OpenAIChat } from '../process/index.svelte';

export async function downloadPreset(id:number, type:'json'|'risupreset'|'return' = 'json'){
    saveCurrentPreset()
    let db = getDatabase()
    let pres = safeStructuredClone(db.botPresets[id])
    console.log(pres)
    pres.openAIKey = ''
    pres.forceReplaceUrl = ''
    pres.forceReplaceUrl2 = ''
    pres.proxyKey = ''
    pres.textgenWebUIStreamURL=  ''
    pres.textgenWebUIBlockingURL=  ''

    if(type === 'json'){
        downloadFile(pres.name + "_preset.json", Buffer.from(JSON.stringify(pres, null, 2)))
    }
    else if(type === 'risupreset' || type === 'return'){
        const buf = fflate.compressSync(encodeMsgpack({
            presetVersion: 2,
            type: 'preset',
            preset: await encryptBuffer(
                encodeMsgpack(pres),
                'risupreset'
            )
        }))

        const buf2 = await encodeRPack(buf)

        if(type === 'risupreset'){
            downloadFile(pres.name + "_preset.risup", buf2)
        }
        else{
            return {
                data: pres,
                buf: buf2
            }
        }

    }

    alertNormal(language.successExport)


    return {
        data: pres,
        buf: null
    }
}


export async function importPreset(f:{
    name:string
    data:Uint8Array
}|null = null){
    if(!f){
        f = await selectSingleFile(["json", "preset", "risupreset", "risup"])
    }
    if(!f){
        return
    }
    let pre:any
    if(f.name.endsWith('.risupreset') || f.name.endsWith('.risup')){
        let data = f.data
        if(f.name.endsWith('.risup')){
            data = await decodeRPack(data)
        }
        const decoded = await decodeMsgpack(fflate.decompressSync(data))
        console.log(decoded)
        if((decoded.presetVersion === 0 || decoded.presetVersion === 2) && decoded.type === 'preset'){
            pre = {...presetTemplate,...decodeMsgpack(Buffer.from(await decryptBuffer(decoded.preset ?? decoded.pres, 'risupreset')))}
        }
    }
    else{
        pre = {...presetTemplate,...(JSON.parse(Buffer.from(f.data).toString('utf-8')))}
        console.log(pre)
    }
    let db = getDatabase()
    if(pre.presetVersion && pre.presetVersion >= 3){
        //NAI preset
        const pr = safeStructuredClone(prebuiltPresets.NAI2)
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

    if(Array.isArray(pre?.prompt_order?.[0]?.order) && Array.isArray(pre?.prompts)){
        //ST preset
        const pr = safeStructuredClone(presetTemplate)
        pr.promptTemplate = []

        function findPrompt(identifier:number){
            return pre.prompts.find((p:any) => p.identifier === identifier)
        }
        pr.temperature = (pre.temperature ?? 0.8) * 100
        pr.frequencyPenalty = (pre.frequency_penalty ?? 0.7) * 100
        pr.PresensePenalty = (pre.presence_penalty * 0.7) * 100
        pr.top_p = pre.top_p ?? 1

        for(const prompt of pre?.prompt_order?.[0]?.order){
            if(!prompt?.enabled){
                continue
            }
            const p = findPrompt(prompt?.identifier ?? '')
            if(p){
                switch(p.identifier){
                    case 'main':{
                        pr.promptTemplate.push({
                            type: 'plain',
                            type2: 'main',
                            text: p.content ?? "",
                            role: p.role ?? "system"
                        })
                        break
                    }
                    case 'jailbreak':
                    case 'nsfw':{
                        pr.promptTemplate.push({
                            type: 'jailbreak',
                            type2: 'normal',
                            text: p.content ?? "",
                            role: p.role ?? "system"
                        })
                        break
                    }
                    case 'dialogueExamples':
                    case 'charPersonality':
                    case 'scenario':{
                        break //ignore
                    }
                    case 'chatHistory':{
                        pr.promptTemplate.push({
                            type: 'chat',
                            rangeEnd: 'end',
                            rangeStart: 0
                        })
                        break
                    }
                    case 'worldInfoBefore':{
                        pr.promptTemplate.push({
                            type: 'lorebook'
                        })
                        break
                    }
                    case 'worldInfoAfter':{
                        break
                    }
                    case 'charDescription':{
                        pr.promptTemplate.push({
                            type: 'description'
                        })
                        break
                    }
                    case 'personaDescription':{
                        pr.promptTemplate.push({
                            type: 'persona'
                        })
                        break
                    }
                    default:{
                        console.log(p)
                        pr.promptTemplate.push({
                            type: 'plain',
                            type2: 'normal',
                            text: p.content ?? "",
                            role: p.role ?? "system"
                        })
                    }
                }
            }
            else{
                console.log("Prompt not found", prompt)

            }
        }
        if(pre?.assistant_prefill){
            pr.promptTemplate.push({
                type: 'postEverything'
            })
            pr.promptTemplate.push({
                type: 'plain',
                type2: 'main',
                text: `{{#if {{prefill_supported}}}}${pre?.assistant_prefill}{{/if}}`,
                role: 'bot'
            })
        }
        pr.name = "Imported ST Preset"
        db.botPresets.push(pr)
        setDatabase(db)
        return
    }
    pre.name ??= "Imported"
    if(!Array.isArray(db.botPresets)){
        db.botPresets = []
    }
    db.botPresets.push(pre)
    setDatabase(db)
}

import { get, writable } from "svelte/store";
import { language } from "../../lang";
import { alertError, alertMd } from "../alert";
import { getCurrentCharacter, getDatabase, setDatabaseLite } from "../storage/database.svelte";
import { checkNullish, selectSingleFile, sleep } from "../util";
import type { OpenAIChat } from "../process/index.svelte";
import { fetchNative, globalFetch } from "../globalApi.svelte";
import { selectedCharID } from "../stores.svelte";
import type { ScriptMode } from "../process/scripts";

export const customProviderStore = writable([] as string[])


interface ProviderPlugin{
    name:string
    displayName?:string
    script:string
    arguments:{[key:string]:'int'|'string'|string[]}
    realArg:{[key:string]:number|string}
    version?:1|2
}

export type RisuPlugin = ProviderPlugin

export async function importPlugin(){
    try {
        let db = getDatabase()
        const f = await selectSingleFile(['js'])
        if(!f){
            return
        }
        const jsFile = Buffer.from(f.data).toString('utf-8').replace(/^\uFEFF/gm, "");
        const splitedJs = jsFile.split('\n')
        let name = ''
        let displayName:string = undefined
        let arg:{[key:string]:'int'|'string'|string[]} = {}
        let realArg:{[key:string]:number|string} = {}
        for(const line of splitedJs){
            if(line.startsWith('//@risu-name')){
                alertMd('V1 plugin is not supported anymore, please use V2 plugin instead. for more information, please check the documentation. `https://github.com/kwaroran/RisuAI/blob/main/plugins.md`')
                return
            }
            if(line.startsWith('//@risu-display-name')){
                alertMd('V1 plugin is not supported anymore, please use V2 plugin instead. for more information, please check the documentation. `https://github.com/kwaroran/RisuAI/blob/main/plugins.md`')
                return
            }
            if(line.startsWith('//@name')){
                const provied = line.slice(7)
                if(provied === ''){
                    alertError('plugin name must be longer than 0, did you put it correctly?')
                    return
                }
                name = provied.trim()
            }
            if(line.startsWith('//@display-name')){
                const provied = line.slice('//@display-name'.length + 1)
                if(provied === ''){
                    alertError('plugin display name must be longer than 0, did you put it correctly?')
                    return
                }
                displayName = provied.trim()
            }
            if(line.startsWith('//@risu-arg') || line.startsWith('//@arg')){
                const provied = line.trim().split(' ')
                if(provied.length < 3){
                    alertError('plugin argument is incorrect, did you put space in argument name?')
                    return
                }
                const provKey = provied[1]

                if(provied[2] !== 'int' && provied[2] !== 'string'){
                    alertError(`plugin argument type is "${provied[2]}", which is an unknown type.`)
                    return
                }
                if(provied[2] === 'int'){
                    arg[provKey] = 'int'
                    realArg[provKey] = 0
                }
                else if(provied[2] === 'string'){
                    arg[provKey] = 'string'
                    realArg[provKey] = ''
                }
            }
        }

        if(name.length === 0){
            alertError('plugin name not found, did you put it correctly?')
            return
        }

        let pluginData:RisuPlugin = {
            name: name,
            script: jsFile,
            realArg: realArg,
            arguments: arg,
            displayName: displayName,
            version: 2
        }

        db.plugins ??= []
        db.plugins.push(pluginData)

        setDatabaseLite(db)
        loadPlugins()
    } catch (error) {
        console.error(error)
        alertError(language.errors.noData)
    }
}

let pluginTranslator = false

export async function loadPlugins() {
    let db = getDatabase()
        

    const pluginV2 = safeStructuredClone(db.plugins).filter((a:RisuPlugin) => a.version === 2)

    await loadV2Plugin(pluginV2)
}

type PluginV2ProviderArgument = {
    prompt_chat: OpenAIChat[],
    frequency_penalty: number
    min_p: number
    presence_penalty: number
    repetition_penalty: number
    top_k: number
    top_p: number
    temperature: number
    mode: string
}

type EditFunction = (content:string) => string|null|undefined|Promise<string|null|undefined>
type ReplacerFunction = (content:OpenAIChat[], type:string) => OpenAIChat[]|Promise<OpenAIChat[]>

export const pluginV2 = {
    providers: new Map<string, (arg:PluginV2ProviderArgument) => Promise<{success:boolean,content:string|ReadableStream<string>}> >(),
    editdisplay: new Set<EditFunction>(),
    editoutput: new Set<EditFunction>(),
    editprocess: new Set<EditFunction>(),
    editinput: new Set<EditFunction>(),
    replacerbeforeRequest: new Set<ReplacerFunction>(),
    replacerafterRequest: new Set<(content:string, type:string) => string|Promise<string>>(),
    unload: new Set<() => void|Promise<void>>(),
    loaded: false
}

export async function loadV2Plugin(plugins:RisuPlugin[]){

    if(pluginV2.loaded){
        for(const unload of pluginV2.unload){
            await unload()
        }

        pluginV2.providers.clear()
        pluginV2.editdisplay.clear()
        pluginV2.editoutput.clear()
        pluginV2.editprocess.clear()
        pluginV2.editinput.clear()
    }

    pluginV2.loaded = true

    globalThis.__pluginApis__ = {
        risuFetch: globalFetch,
        nativeFetch: fetchNative,
        getArg: (arg:string) => {
            const db = getDatabase()
            const [name, realArg] = arg.split('::')
            for(const plug of db.plugins){
                if(plug.name === name){
                    return plug.realArg[realArg]
                }
            }
        },
        getChar: () => {
            return getCurrentCharacter()
        },
        setChar: (char:any) => {
            const db = getDatabase()
            const charid = get(selectedCharID)
            db.characters[charid] = char
            setDatabaseLite(db)
        },
        addProvider: (name:string, func:(arg:PluginV2ProviderArgument) => Promise<{success:boolean,content:string}>) => {
            let provs = get(customProviderStore)
            provs.push(name)
            pluginV2.providers.set(name, func)
            customProviderStore.set(provs)
        },
        addRisuScriptHandler: (name:ScriptMode, func:EditFunction) => {
            if(pluginV2['edit' + name]){
                pluginV2['edit' + name].add(func)
            }
            else{
                throw (`script handler named ${name} not found`)
            }
        },
        removeRisuScriptHandler: (name:ScriptMode, func:EditFunction) => {
            if(pluginV2['edit' + name]){
                pluginV2['edit' + name].delete(func)
            }
            else{
                throw (`script handler named ${name} not found`)
            }
        },
        addRisuReplacer: (name:string, func:ReplacerFunction) => {
            if(pluginV2['replacer' + name]){
                pluginV2['replacer' + name].add(func)
            }
            else{
                throw (`replacer handler named ${name} not found`)
            }
        },
        removeRisuReplacer: (name:string, func:ReplacerFunction) => {
            if(pluginV2['replacer' + name]){
                pluginV2['replacer' + name].delete(func)
            }
            else{
                throw (`replacer handler named ${name} not found`)
            }
        },
        onUnload: (func:() => void|Promise<void>) => {
            pluginV2.unload.add(func)
        }
    }

    for(const plugin of plugins){
        const data = plugin.script

        const realScript = `(async () => {
            const risuFetch = globalThis.__pluginApis__.risuFetch
            const nativeFetch = globalThis.__pluginApis__.nativeFetch
            const getArg = globalThis.__pluginApis__.getArg
            const printLog = globalThis.__pluginApis__.printLog
            const getChar = globalThis.__pluginApis__.getChar
            const setChar = globalThis.__pluginApis__.setChar
            const addProvider = globalThis.__pluginApis__.addProvider
            const addRisuEventHandler = globalThis.__pluginApis__.addRisuEventHandler
            const onUnload = globalThis.__pluginApis__.onUnload

            ${data}
        })();`

        try {
            eval(realScript)
        } catch (error) {
            console.error(error)
        }

        console.log('Loaded V2 Plugin', plugin.name)
        
    }
}

export async function translatorPlugin(text:string, from:string, to:string) {
    return false
}

export async function pluginProcess(arg:{
    prompt_chat: OpenAIChat,
    temperature: number,
    max_tokens: number,
    presence_penalty: number
    frequency_penalty: number
    bias: {[key:string]:string}
}|{}){
    return {
        success: false,
        content: "Plugin V1 is not supported anymore, please use V2 plugin instead."
    }   
}



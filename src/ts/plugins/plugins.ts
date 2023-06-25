import { get, writable } from "svelte/store";
import { language } from "../../lang";
import { alertError } from "../alert";
import { DataBase } from "../storage/database";
import { checkNullish, selectSingleFile, sleep } from "../util";
import type { OpenAIChat } from "../process";
import { globalFetch } from "../storage/globalApi";
import { selectedCharID } from "../stores";

export const customProviderStore = writable([] as string[])

interface PluginRequest{
    url: string
    header?:{[key:string]:string}
    body: any,
    res: string
}

interface ProviderPlugin{
    name:string
    displayName?:string
    script:string
    arguments:{[key:string]:'int'|'string'|string[]}
    realArg:{[key:string]:number|string}
}

export type RisuPlugin = ProviderPlugin

export async function importPlugin(){
    try {
        let db = get(DataBase)
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
                const provied = line.slice(13)
                if(provied === ''){
                    alertError('plugin name must be longer than "", did you put it correctly?')
                    return
                }
                name = provied.trim()
            }
            if(line.startsWith('//@risu-display-name')){
                const provied = line.slice('//@risu-display-name'.length + 1)
                if(provied === ''){
                    alertError('plugin display name must be longer than "", did you put it correctly?')
                    return
                }
                name = provied.trim()
            }
            if(line.startsWith('//@risu-arg')){
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
            displayName: displayName
        }

        db.plugins.push(pluginData)

        DataBase.set(db)
        loadPlugins()
    } catch (error) {
        console.error(error)
        alertError(language.errors.noData)
    }
}

export function getCurrentPluginMax(prov:string){
    return 12000
}

let pluginWorker:Worker = null
let providerRes:{success:boolean, content:string} = null
let translatorRes:{success:boolean, content:string} = null

function postMsgPluginWorker(type:string, body:any){
    const bod = {
        type: type,
        body: body
    }
    pluginWorker.postMessage(bod)
}

let pluginTranslator = false

export async function loadPlugins() {
    let db = get(DataBase)
    if(pluginWorker){
        pluginWorker.terminate()
        pluginWorker = null
    }
    if(db.plugins.length > 0){

        const da = await fetch("/pluginApi.js")
        const pluginApiString = await da.text()
        let pluginjs = `${pluginApiString}\n`
        let pluginLoadedJs = ''

        for(const plug of db.plugins){
            pluginLoadedJs += `\n(() => {${plug.script}})();\n`
        }
        pluginjs = pluginjs.replace('//{{placeholder}}',pluginLoadedJs)

        const blob = new Blob([pluginjs], {type: 'application/javascript'});
        pluginWorker = new Worker(URL.createObjectURL(blob));

        pluginWorker.addEventListener('message', async (msg) => {
            const data:{type:string,body:any} = msg.data
            switch(data.type){
                case "addProvider":{
                    let provs = get(customProviderStore)
                    provs.push(data.body)
                    customProviderStore.set(provs)
                    console.log(provs)
                    break
                }
                case "resProvider":{
                    const provres:{success:boolean, content:string} = data.body
                    if(checkNullish(provres.success) || checkNullish(provres.content)){
                        providerRes = {
                            success: false,
                            content :"provider didn't respond 'success' or 'content' in response object"
                        }
                    }
                    else if(typeof(provres.content) !== 'string'){
                        providerRes = {
                            success: false,
                            content :"provider didn't respond 'content' in response object in string"
                        }
                    }
                    else{
                        providerRes = {
                            success: !!provres.success,
                            content: provres.content
                        }
                    }
                    break
                }
                case "resTrans":{
                    const provres:{success:boolean, content:string} = data.body
                    if(checkNullish(provres.success) || checkNullish(provres.content)){
                        translatorRes = {
                            success: false,
                            content :"plugin didn't respond 'success' or 'content' in response object"
                        }
                    }
                    else if(typeof(provres.content) !== 'string'){
                        translatorRes = {
                            success: false,
                            content :"plugin didn't respond 'content' in response object in string"
                        }
                    }
                    else{
                        translatorRes = {
                            success: !!provres.success,
                            content: provres.content
                        }
                    }
                    break
                }
                case "useTranslator": {
                    pluginTranslator = true
                    break
                }
                case "fetch": {
                    postMsgPluginWorker('fetchData',{
                        id: data.body.id,
                        data: await globalFetch(data.body.url, data.body.arg)
                    })
                    break
                }
                case "getArg":{
                    try {
                        const db = get(DataBase)
                        const arg:string[] = data.body.arg.split('::')
                        for(const plug of db.plugins){
                            if(arg[0] === plug.name){
                                postMsgPluginWorker('fetchData',{
                                    id: data.body.id,
                                    data: plug.realArg[arg[1]]
                                })
                                return
                            }
                        }
                        postMsgPluginWorker('fetchData',{
                            id: data.body.id,
                            data: null
                        })
                    } catch (error) {
                        postMsgPluginWorker('fetchData',{
                            id: data.body.id,
                            data: null
                        })
                    }
                    break
                }
                case "getChar":{
                    const db = get(DataBase)
                    const charid = get(selectedCharID)
                    const char = db.characters[charid]
                    postMsgPluginWorker('fetchData',{
                        id: data.body.id,
                        data: char
                    })
                    break
                }
                case "setChar":{
                    const db = get(DataBase)
                    const charid = get(selectedCharID)
                    db.characters[charid] = data.body
                    break
                }
                case "log":{
                    console.log(data.body)
                    break
                }
            }
        })
    }
}

export async function translatorPlugin(text:string, from:string, to:string) {
    if(!pluginTranslator){
        return false
    }
    else{
        try {
            translatorRes = null
            postMsgPluginWorker("requestTrans", {text, from, to})
            while(true){
                await sleep(50)
                if(providerRes){
                    break
                }
            }
            return {
                success: translatorRes.success,
                content: translatorRes.content
            }
        } catch (error) {
            return {
                success: false,
                content: "unknownError"
            }   
        }
    }
}

export async function pluginProcess(arg:{
    prompt_chat: OpenAIChat,
    temperature: number,
    max_tokens: number,
    presence_penalty: number
    frequency_penalty: number
    bias: {[key:string]:string}
}|{}){
    try {
        let db = get(DataBase)
        if(!pluginWorker){
            return {
                success: false,
                content: "plugin worker not found error"
            }
        }
        postMsgPluginWorker("requestProvider", {
            key: db.currentPluginProvider,
            arg: arg
        })
        providerRes = null
        while(true){
            await sleep(50)
            if(providerRes){
                break
            }
        }
        return {
            success: providerRes.success,
            content: providerRes.content
        }
    } catch (error) {
        return {
            success: false,
            content: "unknownError"
        }   
    }
}



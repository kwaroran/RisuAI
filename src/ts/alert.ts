import { get, writable } from "svelte/store"
import { sleep } from "./util"
import { language } from "../lang"
import { isNodeServer, isTauri } from "./globalApi.svelte"
import { Capacitor } from "@capacitor/core"
import { getDatabase, type MessageGenerationInfo } from "./storage/database.svelte"
import { alertStore as alertStoreImported } from "./stores.svelte"

export interface alertData{
    type: 'error'|'normal'|'none'|'ask'|'wait'|'selectChar'
            |'input'|'toast'|'wait2'|'markdown'|'select'|'login'
            |'tos'|'cardexport'|'requestdata'|'addchar'|'hypaV2'|'selectModule'
            |'chatOptions'|'pukmakkurit'|'branches'|'progress'|'pluginconfirm'|'requestlogs',
    msg: string,
    submsg?: string
    datalist?: [string, string][],
    stackTrace?: string;
}

type AlertGenerationInfoStoreData = {
    genInfo: MessageGenerationInfo,
    idx: number
}
export const alertGenerationInfoStore = writable<AlertGenerationInfoStoreData>(null)
export const alertStore = {
    set: (d:alertData) => {
        alertStoreImported.set(d)
    }
}

export function alertError(msg: string | Error) {
    console.error(msg)
    const db = getDatabase()

    let stackTrace: string | undefined = undefined; 

    if (typeof(msg) !== 'string') {
        try{
            if (msg instanceof Error) {
                stackTrace = msg.stack
                msg = msg.message
            } else {
                msg = JSON.stringify(msg)
            }
        } catch {
            msg = `${msg}`
        }
    }

    msg = msg.trim()

    const ignoredErrors = [
        '{}'
    ]

    if(ignoredErrors.includes(msg)){
        return
    }

    let submsg = ''

    //check if it's a known error
    if(msg.includes('Failed to fetch') || msg.includes("NetworkError when attempting to fetch resource.")){
        submsg =    db.usePlainFetch ? language.errors.networkFetchPlain :
                    (!isTauri && !isNodeServer && !Capacitor.isNativePlatform()) ? language.errors.networkFetchWeb : language.errors.networkFetch
    }

    alertStoreImported.set({
        'type': 'error',
        'msg': msg,
        'submsg': submsg,
        'stackTrace': stackTrace
    })
}

export async function waitAlert(){
    while(true){
        if (get(alertStoreImported).type === 'none'){
            break
        }
        await sleep(10)
    }
}

export function alertNormal(msg:string){
    alertStoreImported.set({
        'type': 'normal',
        'msg': msg
    })
}

export async function alertNormalWait(msg:string){
    alertStoreImported.set({
        'type': 'normal',
        'msg': msg
    })
    await waitAlert()
}

export async function alertAddCharacter() {
    alertStoreImported.set({
        'type': 'addchar',
        'msg': language.addCharacter
    })
    await waitAlert()

    return get(alertStoreImported).msg
}

export async function alertChatOptions() {
    alertStoreImported.set({
        'type': 'chatOptions',
        'msg': language.chatOptions
    })
    await waitAlert()

    return parseInt(get(alertStoreImported).msg)
}

export async function alertLogin(){
    alertStoreImported.set({
        'type': 'login',
        'msg': 'login'
    })
    await waitAlert()

    return get(alertStoreImported).msg
}

export async function alertSelect(msg:string[], display?:string){
    const message = display !== undefined ? `__DISPLAY__${display}||${msg.join('||')}` : msg.join('||')
    alertStoreImported.set({
        'type': 'select',
        'msg': message
    })

    await waitAlert()

    return get(alertStoreImported).msg
}

export async function alertErrorWait(msg:string){
    alertStoreImported.set({
        'type': 'wait2',
        'msg': msg
    })
    await waitAlert()
}

export function alertMd(msg:string){
    alertStoreImported.set({
        'type': 'markdown',
        'msg': msg
    })
}

export function doingAlert(){
    return get(alertStoreImported).type !== 'none' && get(alertStoreImported).type !== 'toast' && get(alertStoreImported).type !== 'wait'
}

export function alertToast(msg:string){
    alertStoreImported.set({
        'type': 'toast',
        'msg': msg
    })
}

export function alertWait(msg:string){
    alertStoreImported.set({
        'type': 'wait',
        'msg': msg
    })

}


export function alertClear(){
    alertStoreImported.set({
        'type': 'none',
        'msg': ''
    })
}

export async function alertSelectChar(){
    alertStoreImported.set({
        'type': 'selectChar',
        'msg': ''
    })

    await waitAlert()

    return get(alertStoreImported).msg
}

export async function alertConfirm(msg:string){

    alertStoreImported.set({
        'type': 'ask',
        'msg': msg
    })

    await waitAlert()

    return get(alertStoreImported).msg === 'yes'
}

export async function alertPluginConfirm(msg:string){

    alertStoreImported.set({
        'type': 'pluginconfirm',
        'msg': msg
    })

    await waitAlert()

    return get(alertStoreImported).msg === 'yes'
}

export async function alertCardExport(type:string = ''){

    alertStoreImported.set({
        'type': 'cardexport',
        'msg': '',
        'submsg': type
    })

    await waitAlert()

    return JSON.parse(get(alertStoreImported).msg) as {
        type: string,
        type2: string,
    }
}

export async function alertTOS(){

    if(localStorage.getItem('tos2') === 'true'){
        return true
    }

    alertStoreImported.set({
        'type': 'tos',
        'msg': 'tos'
    })

    await waitAlert()

    if(get(alertStoreImported).msg === 'yes'){
        localStorage.setItem('tos2', 'true')
        return true
    }

    return false
}

export async function alertInput(msg:string, datalist?:[string, string][]) {

    alertStoreImported.set({
        'type': 'input',
        'msg': msg,
        'datalist': datalist ?? []
    })

    await waitAlert()

    return get(alertStoreImported).msg
}

export async function alertModuleSelect(){

    alertStoreImported.set({
        'type': 'selectModule',
        'msg': ''
    })

    while(true){
        if (get(alertStoreImported).type === 'none'){
            break
        }
        await sleep(20)
    }

    return get(alertStoreImported).msg
}

export function alertRequestData(info:AlertGenerationInfoStoreData){
    alertGenerationInfoStore.set(info)
    alertStoreImported.set({
        'type': 'requestdata',
        'msg': info.genInfo.generationId ?? 'none'
    })
}

export function showHypaV2Alert(){
    alertStoreImported.set({
        'type': 'hypaV2',
        'msg': ""
    })
}

export function alertRequestLogs(){
    alertStoreImported.set({
        'type': 'requestlogs',
        'msg': ''
    })
}

import { get, writable } from "svelte/store"
import { sleep } from "./util"
import { language } from "../lang"
import { isNodeServer, isTauri } from "./storage/globalApi"
import { Capacitor } from "@capacitor/core"
import { DataBase, type MessageGenerationInfo } from "./storage/database"

interface alertData{
    type: 'error'| 'normal'|'none'|'ask'|'wait'|'selectChar'|'input'|'toast'|'wait2'|'markdown'|'select'|'login'|'tos'|'cardexport'|'requestdata'|'addchar'|'hypaV2'|'selectModule',
    msg: string,
    submsg?: string
}


export const alertStore = writable({
    type: 'none',
    msg: 'n',
} as alertData)
type AlertGenerationInfoStoreData = {
    genInfo: MessageGenerationInfo,
    idx: number
}
export const alertGenerationInfoStore = writable<AlertGenerationInfoStoreData>(null)

export function alertError(msg:string){
    console.error(msg)
    const db = get(DataBase)

    if(typeof(msg) !== 'string'){
        try{
            msg = JSON.stringify(msg)
        }catch(e){
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

    alertStore.set({
        'type': 'error',
        'msg': msg,
        'submsg': submsg
    })
}

export function alertNormal(msg:string){
    alertStore.set({
        'type': 'normal',
        'msg': msg
    })
}

export async function alertNormalWait(msg:string){
    alertStore.set({
        'type': 'normal',
        'msg': msg
    })
    while(true){
        if (get(alertStore).type === 'none'){
            break
        }
        await sleep(10)
    }
}

export async function alertAddCharacter() {
    alertStore.set({
        'type': 'addchar',
        'msg': language.addCharacter
    })
    while(true){
        if (get(alertStore).type === 'none'){
            break
        }
        await sleep(10)
    }

    return get(alertStore).msg
}

export async function alertLogin(){
    alertStore.set({
        'type': 'login',
        'msg': 'login'
    })
    while(true){
        if (get(alertStore).type === 'none'){
            break
        }
        await sleep(10)
    }

    return get(alertStore).msg
}

export async function alertSelect(msg:string[]){
    alertStore.set({
        'type': 'select',
        'msg': msg.join('||')
    })

    while(true){
        if (get(alertStore).type === 'none'){
            break
        }
        await sleep(10)
    }

    return get(alertStore).msg
}

export async function alertErrorWait(msg:string){
    alertStore.set({
        'type': 'wait2',
        'msg': msg
    })
    while(true){
        if (get(alertStore).type === 'none'){
            break
        }
        await sleep(10)
    }
}

export function alertMd(msg:string){
    alertStore.set({
        'type': 'markdown',
        'msg': msg
    })
}

export function doingAlert(){
    return get(alertStore).type !== 'none' && get(alertStore).type !== 'toast'
}

export function alertToast(msg:string, submsg:string = ''){
    if(!doingAlert()){
        alertStore.set({
            'type': 'toast',
            'msg': msg,
            'submsg': submsg
        })
    }
}

export function alertWait(msg:string){
    alertStore.set({
        'type': 'wait',
        'msg': msg
    })

}


export function alertClear(){
    alertStore.set({
        'type': 'none',
        'msg': ''
    })
}

export async function alertSelectChar(){
    alertStore.set({
        'type': 'selectChar',
        'msg': ''
    })

    while(true){
        if (get(alertStore).type === 'none'){
            break
        }
        await sleep(10)
    }

    return get(alertStore).msg
}

export async function alertConfirm(msg:string){

    alertStore.set({
        'type': 'ask',
        'msg': msg
    })

    while(true){
        if (get(alertStore).type === 'none'){
            break
        }
        await sleep(10)
    }

    return get(alertStore).msg === 'yes'
}

export async function alertCardExport(type:string = ''){

    alertStore.set({
        'type': 'cardexport',
        'msg': '',
        'submsg': type
    })

    while(true){
        if (get(alertStore).type === 'none'){
            break
        }
        await sleep(10)
    }

    return JSON.parse(get(alertStore).msg) as {
        type: string,
        type2: string,
    }
}

export async function alertTOS(){

    // if(localStorage.getItem('tos') === 'true'){
    //     return true
    // }

    alertStore.set({
        'type': 'tos',
        'msg': 'tos'
    })

    while(true){
        if (get(alertStore).type === 'none'){
            break
        }
        await sleep(10)
    }

    if(get(alertStore).msg === 'yes'){
        localStorage.setItem('tos', 'true')
        return true
    }

    return false
}

export async function alertInput(msg:string){

    alertStore.set({
        'type': 'input',
        'msg': msg
    })

    while(true){
        if (get(alertStore).type === 'none'){
            break
        }
        await sleep(10)
    }

    return get(alertStore).msg
}

export async function alertModuleSelect(){

    alertStore.set({
        'type': 'selectModule',
        'msg': ''
    })

    while(true){
        if (get(alertStore).type === 'none'){
            break
        }
        await sleep(10)
    }

    return get(alertStore).msg
}

export function alertRequestData(info:AlertGenerationInfoStoreData){
    alertGenerationInfoStore.set(info)
    alertStore.set({
        'type': 'requestdata',
        'msg': info.genInfo.generationId ?? 'none'
    })
}

export function showHypaV2Alert(){
    alertStore.set({
        'type': 'hypaV2',
        'msg': ""
    })
}
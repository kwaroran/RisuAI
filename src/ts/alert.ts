import { get, writable } from "svelte/store"
import { sleep } from "./util"
import { language } from "../lang"

interface alertData{
    type: 'error'| 'normal'|'none'|'ask'|'wait'|'selectChar'|'input'|'toast'|'wait2'|'markdown'|'select'|'login'|'tos'
    msg: string
}


export const alertStore = writable({
    type: 'none',
    msg: 'n'
} as alertData)

export function alertError(msg:string){
    console.error(msg)

    alertStore.set({
        'type': 'error',
        'msg': msg
    })
}

export function alertNormal(msg:string){
    alertStore.set({
        'type': 'normal',
        'msg': msg
    })
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

export function alertMd(msg:string){
    alertStore.set({
        'type': 'markdown',
        'msg': msg
    })
}

export function doingAlert(){
    return get(alertStore).type !== 'none' && get(alertStore).type !== 'toast'
}

export function alertToast(msg:string){
    alertStore.set({
        'type': 'toast',
        'msg': msg
    })
}

export function alertWait(msg:string){

    alertStore.set({
        'type': 'wait',
        'msg': msg
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
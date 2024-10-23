import { get, writable } from "svelte/store";
import { DataBase } from "../storage/database.svelte";

export let textAreaSize = writable(0)
export let sideBarSize = writable(0)
export let textAreaTextSize = writable(0)

export function updateGuisize(){
    let db = get(DataBase)
    const root = document.querySelector(':root') as HTMLElement;
    if(!root){
        return
    }
    textAreaSize.set(db.textAreaSize)
    sideBarSize.set(db.sideBarSize)
    textAreaTextSize.set(db.textAreaTextSize)
    root.style.setProperty('--sidebar-size', (24 + (4 * db.sideBarSize)) + 'rem')
}

export function guiSizeText(num:number){
    switch(num){
        case 0:
            return 'Default'
        case 1:
            return 'Big'
        case 2:
            return 'Bigger'
        case 3:
            return 'Huge'
        case 4:
            return 'Huger'
        case 5:
            return 'Hugest'
        case -1:
            return 'Small'
        case -2:
            return 'Smaller'
        case -3:
            return 'Tiny'
        case -4:
            return 'Tinier'
        case -5:
            return 'Tiniest'
        default:
            return 'Default'
    }
}
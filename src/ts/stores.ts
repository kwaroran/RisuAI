import { get, writable, type Writable } from "svelte/store";
import { DataBase, getCurrentCharacter, type Chat, type character, type groupChat } from "./storage/database";
import { isEqual } from "lodash";
import type { simpleCharacterArgument } from "./parser";
import { getUserIcon, getUserIconProtrait, getUserName, sleep } from "./util";
import { getModules } from "./process/modules";

function updateSize(){
    SizeStore.set({
        w: window.innerWidth,
        h: window.innerHeight
    })
    DynamicGUI.set(window.innerWidth <= 1024)
}

export const SizeStore = writable({
    w: 0,
    h: 0
})
export const DynamicGUI = writable(false)
export const sideBarClosing = writable(false)
export const sideBarStore = writable(window.innerWidth > 1024)
export const selectedCharID = writable(-1)
export const CharEmotion = writable({} as {[key:string]: [string, string, number][]})
export const ViewBoxsize = writable({ width: 12 * 16, height: 12 * 16 }); // Default width and height in pixels
export const settingsOpen = writable(false)
export const botMakerMode = writable(false)
export const moduleBackgroundEmbedding = writable('')
export const openPresetList = writable(false)
export const openPersonaList = writable(false)
export const MobileGUI = writable(false)
export const MobileGUIStack = writable(0)
export const MobileSideBar = writable(0)
//optimization
export const CurrentShowMemoryLimit = writable(false) as Writable<boolean>

export const ShowVN = writable(false)
export const SettingsMenuIndex = writable(-1)
export const ReloadGUIPointer = writable(0)
export const OpenRealmStore = writable(false)
export const ShowRealmFrameStore = writable('')
export const PlaygroundStore = writable(0)
export const HideIconStore = writable(false)
export const UserIconProtrait = writable(false)
export const CustomCSSStore = writable('')
export const SafeModeStore = writable(false)
export const MobileSearch = writable('')
export const CharConfigSubMenu = writable(0)
export const CustomGUISettingMenuStore = writable(false)

let lastGlobalEnabledModules: string[] = []
let lastChatEnabledModules: string[] = []
let moduleHideIcon = false
let characterHideIcon = false


CustomCSSStore.subscribe((css) => {
    console.log(css)
    const q = document.querySelector('#customcss')
    if(q){
        q.innerHTML = css
    }
    else{
        const s = document.createElement('style')
        s.id = 'customcss'
        s.innerHTML = css
        document.body.appendChild(s)
    }
})

export function createSimpleCharacter(char:character|groupChat){
    if((!char) || char.type === 'group'){
        return null
    }

    const simpleChar:simpleCharacterArgument = {
        type: "simple",
        customscript: structuredClone(char.customscript),
        chaId: char.chaId,
        additionalAssets: char.additionalAssets,
        virtualscript: char.virtualscript,
        emotionImages: char.emotionImages,
        triggerscript: char.triggerscript,
    }

    return simpleChar

}

function trySync(){
    try {
        let db = get(DataBase)
        CurrentShowMemoryLimit.set(db.showMemoryLimit)
    } catch (error) {}
}

trySync()

async function preInit(){
    await sleep(1)
}

function onModuleUpdate(){
    if(!Array.isArray(lastGlobalEnabledModules)){
        lastGlobalEnabledModules = []
    }
    if(!Array.isArray(lastChatEnabledModules)){
        lastChatEnabledModules = []
    }

    const m = getModules()
    
    let moduleHideIcon = false
    let backgroundEmbedding = ''
    m.forEach((module) => {
        if(!module){
            return
        }

        if(module.hideIcon){
            moduleHideIcon = true
        }
        if(module.backgroundEmbedding){
            backgroundEmbedding += '\n' + module.backgroundEmbedding + '\n'
        }
    })

    if(backgroundEmbedding){
        moduleBackgroundEmbedding.set(backgroundEmbedding)
    }
    HideIconStore.set(characterHideIcon || moduleHideIcon)
}

updateSize()
window.addEventListener("resize", updateSize);
preInit()
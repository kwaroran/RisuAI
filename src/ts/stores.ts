import { get, writable, type Writable } from "svelte/store";
import { DataBase, type Chat, type character, type groupChat } from "./storage/database";
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
export const CurrentCharacter = writable(null) as Writable<character | groupChat>
export const CurrentSimpleCharacter = writable(null) as Writable<simpleCharacterArgument>
export const CurrentChat = writable(null) as Writable<Chat>
export const CurrentUsername = writable('') as Writable<string>
export const CurrentUserIcon = writable('') as Writable<string>
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

function createSimpleCharacter(char:character|groupChat){
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
        let currentChar = get(selectedCharID)
        let currentCharacter = db.characters ? (db.characters[currentChar]) : null
        let currentChat = currentCharacter ? (currentCharacter.chats[currentCharacter.chatPage]) : null
        CurrentCharacter.set(structuredClone(currentCharacter))
        CurrentSimpleCharacter.set(createSimpleCharacter(currentCharacter))
        CurrentChat.set(structuredClone(currentChat))
        CurrentUsername.set(getUserName())
        CurrentUserIcon.set(getUserIcon())
        CurrentShowMemoryLimit.set(db.showMemoryLimit)
    } catch (error) {}
}

trySync()

async function preInit(){
    await sleep(1)
    trySync()
    function updateCurrentCharacter(){
        
        const db = get(DataBase)
        if(!db.characters){
            CurrentCharacter.set(null)
            updateCurrentChat()
            return
        }

        const currentCharId = get(selectedCharID)
        const currentChar = db.characters[currentCharId]
        const gotCharacter = get(CurrentCharacter)
        if(isEqual(gotCharacter, currentChar)){
            return
        }
        if((currentChar?.viewScreen === 'vn') !== get(ShowVN)){
            ShowVN.set(currentChar?.viewScreen === 'vn')   
        }

        CurrentCharacter.set(structuredClone(currentChar))
        const simp = createSimpleCharacter(currentChar)
        
        if(!isEqual(get(CurrentSimpleCharacter), simp)){
            CurrentSimpleCharacter.set(simp)
        }

        updateCurrentChat()
    }

    function updateCurrentChat(){
        const currentChar = get(CurrentCharacter)
        if(!currentChar){
            CurrentChat.set(null)
            return
        }
        const chat = (currentChar.chats[currentChar.chatPage])
        const gotChat = get(CurrentChat)
        if(isEqual(gotChat, chat)){
            return
        }
        CurrentChat.set(structuredClone(chat))
    }

    DataBase.subscribe((data) => {
        updateCurrentCharacter()
        if(getUserName() !== get(CurrentUsername)){
            CurrentUsername.set(getUserName())
        }
        if(getUserIcon() !== get(CurrentUserIcon)){
            CurrentUserIcon.set(getUserIcon())
        }
        if(getUserIconProtrait() !== get(UserIconProtrait)){
            UserIconProtrait.set(getUserIconProtrait())
        }
        if(data.showMemoryLimit !== get(CurrentShowMemoryLimit)){
            CurrentShowMemoryLimit.set(data.showMemoryLimit)
        }
        if(!isEqual(data.enabledModules, lastGlobalEnabledModules)){
            lastGlobalEnabledModules = data.enabledModules || []
            onModuleUpdate()
            return
        }
    })

    selectedCharID.subscribe((id) => {

        updateCurrentCharacter()
    })

    CurrentCharacter.subscribe((char) => {
        updateCurrentChat()
        let db = get(DataBase)
        let charId = get(selectedCharID)
        if(char?.hideChatIcon !== characterHideIcon){
            characterHideIcon = char?.hideChatIcon
            HideIconStore.set(characterHideIcon || moduleHideIcon)
        }
        if(getUserName() !== get(CurrentUsername)){
            CurrentUsername.set(getUserName())
        }
        if(getUserIcon() !== get(CurrentUserIcon)){
            CurrentUserIcon.set(getUserIcon())
        }
        if(getUserIconProtrait() !== get(UserIconProtrait)){
            UserIconProtrait.set(getUserIconProtrait())
        }
        if(charId === -1 || charId > db.characters.length){
            return
        }
        let cha = db.characters[charId]
        if(isEqual(cha, char)){
            return
        }
        db.characters[charId] = structuredClone(char)
        DataBase.set(db)
    })

    CurrentChat.subscribe((chat) => {
        let currentChar = get(CurrentCharacter)

        if(currentChar){
            if(!isEqual(currentChar.chats[currentChar.chatPage], chat)){
                currentChar.chats[currentChar.chatPage] = structuredClone(chat)
                CurrentCharacter.set(currentChar)
            }
        }

        if(!isEqual(lastChatEnabledModules, chat?.modules)){
            lastChatEnabledModules = chat?.modules || []
            onModuleUpdate()
            return
        }

        if(getUserName() !== get(CurrentUsername)){
            CurrentUsername.set(getUserName())
        }

        if(getUserIcon() !== get(CurrentUserIcon)){
            CurrentUserIcon.set(getUserIcon())
        }
    })
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
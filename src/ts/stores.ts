import { get, writable } from "svelte/store";
import { DataBase } from "./storage/database";
import { cloneDeep, isEqual } from "lodash";

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

//optimization

let db = get(DataBase)
let currentChar = get(selectedCharID)
let currentCharacter = db.characters ? (db.characters[currentChar]) : null
let currentChat = currentCharacter ? (currentCharacter.chats[currentCharacter.chatPage]) : null
export const CurrentCharacter = writable(cloneDeep(currentCharacter))
export const CurrentChat = writable(cloneDeep(currentChat))

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
    console.log("Character updated")
    CurrentCharacter.set(cloneDeep(currentChar))
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
    CurrentChat.set(cloneDeep(chat))
}

DataBase.subscribe((data) => {
    updateCurrentCharacter()
})

selectedCharID.subscribe((id) => {  
    updateCurrentCharacter()
})

CurrentCharacter.subscribe((char) => {
    updateCurrentChat()
    let db = get(DataBase)
    let charId = get(selectedCharID)
    if(charId === -1 || charId > db.characters.length){
        return
    }
    let cha = db.characters[charId]
    if(isEqual(cha, char)){
        return
    }
    db.characters[charId] = cloneDeep(char)
    DataBase.set(db)
})

CurrentChat.subscribe((chat) => {
    let currentChar = get(CurrentCharacter)
    if(currentChar){
        if(isEqual(currentChar.chats[currentChar.chatPage], chat)){
            return
        }
        currentChar.chats[currentChar.chatPage] = cloneDeep(chat)
        CurrentCharacter.set(currentChar)
    }
})


updateSize()
window.addEventListener("resize", updateSize);
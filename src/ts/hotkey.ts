import { get } from "svelte/store"
import { alertMd, alertSelect, alertToast, alertWait, doingAlert, alertRequestLogs } from "./alert"
import { changeToPreset as changeToPreset2, getDatabase  } from "./storage/database.svelte"
import { alertStore, DBState, loadoutModalStore, MobileGUIStack, MobileSideBar, openPersonaList, openPresetList, OpenRealmStore, PlaygroundStore, QuickSettings, SafeModeStore, selectedCharID, settingsOpen } from "./stores.svelte"
import { language } from "src/lang"
import { updateTextThemeAndCSS } from "./gui/colorscheme"
import { defaultHotkeys } from "./defaulthotkeys"
import { doingChat, previewBody, sendChat } from "./process/index.svelte"
import { RISU_SIDEBAR_DRAG_TYPE } from "./dragTypes"
import { hasAnyHotkeyModifier, hotkeyModifiersMatch, isPrimaryHotkeyModifierPressed, type HotkeyModifierOptions } from "./hotkeyModifiers"

export function initHotkey(){
    document.addEventListener('keydown', async (ev) => {
        const database = getDatabase()
        const hotkeyModifierOptions: HotkeyModifierOptions = {
            useLegacyMacOSCtrlHotkeys: database?.useLegacyMacOSCtrlHotkeys ?? false
        }

        if(
            !hasAnyHotkeyModifier(ev, hotkeyModifierOptions) &&
            (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) ||
            document.activeElement.getAttribute('contenteditable'))
        ){
            return
        }


        const hotKeys = database?.hotkeys ?? defaultHotkeys

        let hotkeyRan = false
        for(const hotkey of hotKeys){
            let hotKeyRanThisTime = true

            if(!hotkeyMatches(hotkey, ev, hotkeyModifierOptions)){
                continue
            }
            switch(hotkey.action){
                case 'reroll':{
                    clickQuery('.button-icon-reroll')
                    break
                }
                case 'unreroll':{
                    clickQuery('.button-icon-unreroll')
                    break
                }
                case 'translate':{
                    clickQuery('.button-icon-translate')
                    break
                }
                case 'remove':{
                    clickQuery('.button-icon-remove')
                    break
                }
                case 'edit':{
                    clickQuery('.button-icon-edit')
                    setTimeout(() => {
                        focusQuery('.message-edit-area')
                    }, 100)
                    break
                }
                case 'copy':{
                    clickQuery('.button-icon-copy')
                    break
                }
                case 'focusInput':{
                    focusQuery('.text-input-area')
                    break
                }
                case 'send':{
                    clickQuery('.button-icon-send')
                    break
                }
                case 'settings':{
                    settingsOpen.set(!get(settingsOpen))
                    break
                }
                case 'home':{
                    selectedCharID.set(-1)
                    break
                }
                case 'presets':{
                    openPresetList.set(!get(openPresetList))
                    break
                }
                case 'persona':{
                    openPersonaList.set(!get(openPersonaList))
                    break
                }
                case 'toggleCSS':{
                    SafeModeStore.set(!get(SafeModeStore))
                    updateTextThemeAndCSS()
                    break
                }
                case 'prevChar':{
                    const sorted = database.characters.map((v, i) => {
                        return {name: v.name, i}
                    }).sort((a, b) => a.name.localeCompare(b.name))
                    const currentIndex = sorted.findIndex(v => v.i === get(selectedCharID))
                    if(currentIndex === 0){
                        return
                    }
                    if(currentIndex >= sorted.length - 1){
                        return
                    }
                    selectedCharID.set(sorted[currentIndex - 1].i)
                    PlaygroundStore.set(0)
                    OpenRealmStore.set(false)
                    break
                }
                case 'nextChar':{
                    const sorted = database.characters.map((v, i) => {
                        return {name: v.name, i}
                    }).sort((a, b) => a.name.localeCompare(b.name))
                    const currentIndex = sorted.findIndex(v => v.i === get(selectedCharID))
                    if(currentIndex === 0){
                        return
                    }
                    if(currentIndex >= sorted.length - 1){
                        return
                    }
                    selectedCharID.set(sorted[currentIndex + 1].i)
                    PlaygroundStore.set(0)
                    OpenRealmStore.set(false)
                    break
                }
                case 'quickMenu':{
                    quickMenu()
                    break
                }
                case 'previewRequest':{
                    if(get(doingChat) && get(selectedCharID) !== -1){
                        return false
                    }
                    alertWait("Loading...")
                    ev.preventDefault()
                    ev.stopPropagation()
                    await sendChat(-1, {
                        previewPrompt: true
                    })

                    let md = ''
                    md += '### Prompt\n'
                    md += '```json\n' + JSON.stringify(JSON.parse(previewBody), null, 2).replaceAll('```', '\\`\\`\\`') + '\n```\n'
                    doingChat.set(false)
                    alertMd(md)
                    return
                }
                case 'toggleLog':{
                    alertRequestLogs()
                    break
                }
                case 'quickSettings':{
                    QuickSettings.open = !QuickSettings.open
                    QuickSettings.index = 0
                    break
                }
                case 'scrollToActiveChar':{
                    if(database.enableScrollToActiveChar !== false){
                        window.dispatchEvent(new CustomEvent('scrollToActiveCharacter'))
                    }
                    break
                }
                case 'loadout':{
                    loadoutModalStore.open = !loadoutModalStore.open
                    break
                }
                default:{
                    hotKeyRanThisTime = false
                }
            }

            if(hotKeyRanThisTime){
                hotkeyRan = true
                break
            }
        }

        if(hotkeyRan){
            ev.preventDefault()
            ev.stopPropagation()
            return
        }


        if(isPrimaryHotkeyModifierPressed(ev, hotkeyModifierOptions)){
            switch (ev.key){
                case "1":{
                    changeToPreset(0)
                    ev.preventDefault()
                    ev.stopPropagation()
                    break
                }
                case "2":{
                    changeToPreset(1)
                    ev.preventDefault()
                    ev.stopPropagation()
                    break
                }
                case "3":{
                    changeToPreset(2)
                    ev.preventDefault()
                    ev.stopPropagation()
                    break
                }
                case "4":{
                    changeToPreset(3)
                    ev.preventDefault()
                    ev.stopPropagation()
                    break
                }
                case "5":{
                    changeToPreset(4)
                    ev.preventDefault()
                    ev.stopPropagation()
                    break
                }
                case "6":{
                    changeToPreset(5)
                    ev.preventDefault()
                    ev.stopPropagation()
                    break
                }
                case "7":{
                    changeToPreset(6)
                    ev.preventDefault()
                    ev.stopPropagation()
                    break
                }
                case "8":{
                    changeToPreset(7)
                    ev.preventDefault()
                    ev.stopPropagation()
                    break
                }
                case "9":{
                    changeToPreset(8)
                    ev.preventDefault()
                    ev.stopPropagation()
                    break
                }
            }
        }
        if(ev.key === 'Escape'){
            if(doingAlert()){
                alertToast('Alert Closed')
            }
            if(get(settingsOpen)){
                settingsOpen.set(false)
            }
            ev.preventDefault()
        }
        if(ev.key === 'Enter'){
            const alertType = get(alertStore).type 
            if(alertType === 'ask' || alertType === 'normal' || alertType === 'error'){
                alertStore.set({
                    type: 'none',
                    msg: 'yes'
                })
            }
        }
    })


    let touchs = 0
    let touchStartTime = 0
    //check for triple touch
    document.addEventListener('touchstart', (ev) => {
        touchs++
        if(touchs > 2){
            if(Date.now() - touchStartTime > 300){
                return
            }
            touchs = 0
            if(doingAlert()){
                return
            }
            quickMenu()
        }
        if(touchs === 1){
            touchStartTime = Date.now()
        }
    })
    document.addEventListener('touchend', (ev) => {
        touchs = 0
    })
    
    let lastScrollTime = 0
    const SCROLL_COOLDOWN = 500
    
    document.addEventListener('dragover', (ev) => {
        const db = getDatabase()
        const hotkeyModifierOptions: HotkeyModifierOptions = {
            useLegacyMacOSCtrlHotkeys: db?.useLegacyMacOSCtrlHotkeys ?? false
        }

        if (hotkeyModifiersMatch({ ctrl: true, shift: false, alt: false }, ev, hotkeyModifierOptions)) {
            const types = ev.dataTransfer?.types || []
            const isCharacterDrag = types.includes(RISU_SIDEBAR_DRAG_TYPE)
            
            if (isCharacterDrag) {
                if(db?.enableScrollToActiveChar !== false){
                    const now = Date.now()
                    if (now - lastScrollTime > SCROLL_COOLDOWN) {
                        lastScrollTime = now
                        window.dispatchEvent(new CustomEvent('scrollToActiveCharacter'))
                    }
                }
            }
        }
    }, true)
}

async function quickMenu(){
    const selStr = await alertSelect([
        language.presets,
        language.persona,
        language.hotkeyDesc.loadout,
        language.cancel
    ])
    const sel = parseInt(selStr)
    if(sel === 0){
        openPresetList.set(!get(openPresetList))
    }
    if(sel === 1){
        openPersonaList.set(!get(openPersonaList))
    }
    if(sel === 2){
        loadoutModalStore.open = !(loadoutModalStore.open)
    }
}

export function hotkeyMatches(hotkey: typeof DBState.db.hotkeys[number], ev: KeyboardEvent, modifierOptions: HotkeyModifierOptions = {}): boolean {
    if(!hotkey){
        return false
    }
    
    hotkey.ctrl = hotkey.ctrl ?? false
    hotkey.alt = hotkey.alt ?? false
    hotkey.shift = hotkey.shift ?? false

    if(!hotkeyModifiersMatch(hotkey, ev, modifierOptions)) return false
    if(hotkey.key.toLowerCase() !== ev.key.toLowerCase()) return false
    if(!hotkey.ctrl && !hotkey.alt && !hotkey.shift){
        if(['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return false
    }
    return true
}

function clickQuery(query:string){
    let ele = document.querySelector(query) as HTMLElement
    console.log(ele)
    if(ele){
        ele.click()
    }
}

function focusQuery(query:string){
    let ele = document.querySelector(query) as HTMLElement
    if(ele){
        ele.focus()
    }
}



export function initMobileGesture(){
    let pressingPointers = new Map<number, {x:number, y:number}>()

    document.addEventListener('touchstart', (ev) => {
        for(const touch of ev.changedTouches){
            const ele = touch.target as HTMLElement
            if(ele.tagName === 'BUTTON' || ele.tagName === 'INPUT' || ele.tagName === 'SELECT' || ele.tagName === 'TEXTAREA'){
                return
            }
            pressingPointers.set(touch.identifier, {x: touch.clientX, y: touch.clientY})
        }
    }, {
        passive: true
    })
    document.addEventListener('touchend', (ev) => {
        for(const touch of ev.changedTouches){
            const d = pressingPointers.get(touch.identifier)
            const moveX = touch.clientX - d.x
            const moveY = touch.clientY - d.y
            pressingPointers.delete(touch.identifier)

            if(moveX > 50 && Math.abs(moveY) < Math.abs(moveX)){
                if(get(selectedCharID) === -1){
                    if(get(MobileGUIStack) > 0){
                        MobileGUIStack.update(v => v - 1)
                    }
                }
                else{
                    if(get(MobileSideBar) > 0){
                        MobileSideBar.update(v => v - 1)
                    }
                }
            }
            else if(moveX < -50 && Math.abs(moveY) < Math.abs(moveX)){
                if(get(selectedCharID) === -1){
                    if(get(MobileGUIStack) < 2){
                        MobileGUIStack.update(v => v + 1)
                    }
                }
                else{
                    if(get(MobileSideBar) < 3){
                        MobileSideBar.update(v => v + 1)
                    }
                }
            }
        }
    }, {
        passive: true
    })
}

function changeToPreset(num:number){
    if(!doingAlert()){
        let db = getDatabase()
        let pres = db.botPresets
        if(pres.length > num){
            alertToast(`Changed to Preset: ${pres[num].name}`)
            changeToPreset2(num)
        }
    }
}

import { get } from "svelte/store"
import { alertSelect, alertToast, doingAlert } from "./alert"
import { changeToPreset as changeToPreset2, getDatabase  } from "./storage/database.svelte"
import { alertStore, MobileGUIStack, MobileSideBar, openPersonaList, openPresetList, SafeModeStore, selectedCharID, settingsOpen } from "./stores.svelte"
import { language } from "src/lang"
import { updateTextThemeAndCSS } from "./gui/colorscheme"

export function initHotkey(){
    document.addEventListener('keydown', (ev) => {
        if(ev.ctrlKey){

            if(ev.altKey){
                switch(ev.key){
                    case "r":{
                        ev.preventDefault()
                        clickQuery('.button-icon-reroll')
                        return
                    }
                    case "f":{
                        ev.preventDefault()
                        clickQuery('.button-icon-unreroll')
                        return
                    }
                    case "t":{
                        ev.preventDefault()
                        clickQuery('.button-icon-translate')
                        return
                    }
                    case "r":{
                        ev.preventDefault()
                        clickQuery('.button-icon-remove')
                        return
                    }
                    case 'e':{
                        ev.preventDefault()
                        clickQuery('.button-icon-edit')
                        setTimeout(() => {
                            focusQuery('.message-edit-area')
                        }, 100)
                        return
                    }
                    case 'c':{
                        ev.preventDefault()
                        clickQuery('.button-icon-copy')
                        return
                    }
                    case 'i':{
                        ev.preventDefault()
                        focusQuery('.text-input-area')
                        return
                    }
                    case 'Enter':{
                        ev.preventDefault()
                        clickQuery('.button-icon-send')
                        return
                    }
                }
            }

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
                case 's':{
                    settingsOpen.set(!get(settingsOpen))
                    ev.preventDefault()
                    ev.stopPropagation()
                    break
                }
                case 'h':{
                    selectedCharID.set(-1)
                    ev.preventDefault()
                    ev.stopPropagation()
                    break
                }
                case 'p':{
                    openPresetList.set(!get(openPresetList))
                    ev.preventDefault()
                    ev.stopPropagation()
                    break
                }
                case 'e':{
                    openPersonaList.set(!get(openPersonaList))
                    ev.preventDefault()
                    ev.stopPropagation()
                    break
                }
                case '.':{
                    SafeModeStore.set(!get(SafeModeStore))
                    updateTextThemeAndCSS()
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
    document.addEventListener('touchstart', async (ev) => {
        touchs++
        if(touchs > 2){
            if(Date.now() - touchStartTime > 300){
                return
            }
            touchs = 0
            if(doingAlert()){
                return
            }
            const selStr = await alertSelect([
                language.presets,
                language.persona,
                language.cancel
            ])
            const sel = parseInt(selStr)
            if(sel === 0){
                openPresetList.set(!get(openPresetList))
            }
            if(sel === 1){
                openPersonaList.set(!get(openPersonaList))
            }
        }
        if(touchs === 1){
            touchStartTime = Date.now()
        }
    })
    document.addEventListener('touchend', (ev) => {
        touchs = 0
    })
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
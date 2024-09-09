import { get } from "svelte/store"
import { alertSelect, alertToast, doingAlert } from "./alert"
import { DataBase, changeToPreset as changeToPreset2  } from "./storage/database"
import { openPersonaList, openPresetList, SafeModeStore, selectedCharID, settingsOpen } from "./stores"
import { language } from "src/lang"
import { updateTextThemeAndCSS } from "./gui/colorscheme"

export function initHotkey(){
    document.addEventListener('keydown', (ev) => {
        if(ev.ctrlKey){
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

function changeToPreset(num:number){
    if(!doingAlert()){
        let db = get(DataBase)
        let pres = db.botPresets
        if(pres.length > num){
            alertToast(`Changed to Preset: ${pres[num].name}`)
            changeToPreset2(num)
        }
    }
}
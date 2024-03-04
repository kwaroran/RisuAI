import { get } from "svelte/store"
import { alertToast, doingAlert } from "./alert"
import { DataBase, changeToPreset as changeToPreset2  } from "./storage/database"
import { selectedCharID, settingsOpen } from "./stores"

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
            }
        }
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
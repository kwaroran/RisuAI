import { alertConfirm, alertWait } from "./alert";
import { language } from "../lang";
import { Capacitor } from "@capacitor/core";
import {
    checkUpdate,
    installUpdate,
} from '@tauri-apps/api/updater'
import { relaunch } from '@tauri-apps/api/process'

export async function checkRisuUpdate(){

    if(Capacitor.isNativePlatform()){
        return
    }

    try {
        const checked = await checkUpdate()     
        if(checked.shouldUpdate){
            const conf = await alertConfirm(language.newVersion)
            if(conf){
                alertWait(`Updating to ${checked.manifest.version}...`)
                await installUpdate()
                await relaunch()
            }
        }
    } catch (error) {
        
    }
}

function versionStringToNumber(versionString:string):number {
    return Number(
      versionString
        .split(".")
        .map((component) => component.padStart(4, "0"))
        .join("")
    );
}
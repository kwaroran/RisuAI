import { alertConfirm, alertWait } from "./alert";
import { language } from "../lang";
import { Capacitor } from "@capacitor/core";
import {
    check,
} from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export async function checkRisuUpdate(){

    if(Capacitor.isNativePlatform()){
        return
    }

    try {
        const checked = await check()     
        if(checked){
            const conf = await alertConfirm(language.newVersion)
            if(conf){
                alertWait(`Updating to ${checked.version}...`)
                await checked.downloadAndInstall()
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
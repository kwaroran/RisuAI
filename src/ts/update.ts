import { alertConfirm, alertWait } from "./alert";
import { language } from "../lang";
import {
    check,
} from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { isCapacitor } from "./platform";

export async function checkRisuUpdate(){

    if(isCapacitor){
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
        console.error(error)
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
import { fetch } from "@tauri-apps/api/http";
import { DataBase, appVer, setDatabase } from "./storage/database";
import { alertConfirm, alertError, alertMd } from "./alert";
import { language } from "../lang";
import { get } from "svelte/store";
import {open} from '@tauri-apps/api/shell'

export async function checkUpdate(){
    try {
         let db = get(DataBase)
        const da = await fetch('https://raw.githubusercontent.com/kwaroran/RisuAI-release/main/version.json')
        //@ts-ignore
        const v:string = da.data.version
        if(!v){
            return
        }
        if(v === db.lastup){
            return
        }
        const nextVer = versionStringToNumber(v)
        if(isNaN(nextVer) || (!nextVer)){
            return
        }
        const appVerNum = versionStringToNumber(appVer)

        if(appVerNum < nextVer){
            const conf = await alertConfirm(language.newVersion)
            if(conf){
                open("https://github.com/kwaroran/RisuAI-release/releases/latest")
            }
            else{
                db = get(DataBase)
                db.lastup = v
                setDatabase(db)
            }
        }
        
    } catch (error) {
        alertError(error)
        return
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
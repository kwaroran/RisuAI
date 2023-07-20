import { fetch } from "@tauri-apps/api/http";
import { DataBase, appVer, setDatabase } from "./storage/database";
import { alertConfirm, alertError, alertMd } from "./alert";
import { language } from "../lang";
import { get } from "svelte/store";
import {open} from '@tauri-apps/api/shell'

const isOldDomain = location.hostname.includes('pages.dev')

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

export function checkOldDomain(){
    let db = get(DataBase)
    if(isOldDomain){
        if(!db.didFirstSetup){
            location.href = 'https://risuai.xyz'
            alertMd("Redirecting...")
            return
        }
        if(db.language === 'ko'){
            alertMd("# 웹 버전 RisuAI의 도메인이 **risuai.xyz**로 변경되었습니다"
                + "\n\nRisuAI의 현재 도메인 risu.pages.dev는 클라우드플레어의 기본 도메인으로, 뭔가를 하기 힘든 구조입니다. 그래서 도메인을 옮기기로 했습니다."
                + "\n\n현재 도메인인 risu.pages.dev은 언젠가 셧다운됩니다."
                + "\n\n**브라우저는 교차 도메인 저장소를 허용하지 않으므로 설정에서 Google 드라이브에 백업/로드해서 데이터를 옮기거나 새 도메인으로 수동으로 옮겨야합니다. 그렇지 않은 경우 이 도메인이 셧다운 될 때, 데이터는 영원히 사라집니다.**"
                + "\n\n[새로운 도메인 링크](https://risuai.xyz/)."
            )
        }
        else{
            alertMd("# Web version RisuAI's domain has transfered to **risuai.xyz**"
                + "\n\nRisuAI's domain risu.pages.dev is cloudflare's default domain name, which we can't do something freely. so we decided to move to another domain."
                + "\n\nThe current domain risu.pages.dev will be shut downed eventually."
                + "\n\n**Browsers doesn't allow cross-domain storage so you should migrate datas by backuping/loading to google drive in settings or migrate manually to new domain. if not, when this domain shuts down: YOUR DATA WILL BE GONE FOREVER.**"
                + "\n\n[Link to new domain](https://risuai.xyz/)."
            )
        }
        return
    }
}
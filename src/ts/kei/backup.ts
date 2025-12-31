import { alertNormal, alertSelect } from "../alert"
import { keiServerURL } from "./kei"
import { getDatabase, setDatabase } from "../storage/database.svelte"
import { requiresFullEncoderReload } from "../globalApi.svelte"

export async function autoServerBackup(){
    const db = getDatabase()
    const res = await fetch(keiServerURL() + '/autobackup/list', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            token: db.account.token
        })
    })
    if(res.status === 200){
        const json = await res.json()
        if(json.activated){
            alertNormal("Auto backup is now activated in your account. Now it would backup automaticly, and you can now restore your data from the backup server.")
            db.account.kei = true
            return
        }
        const backups:[string,string][] = json.backups
        let pointer = 0
        while(true){
            const slices = backups.slice(pointer, pointer + 5)
            const menu = slices.map((backup) => backup[0])
            menu.push("Next")
            menu.push("Previous")
            menu.push("Cancel")
            const selectIndex = parseInt(await alertSelect(menu))
            const selected = menu[selectIndex]
            if(selected === "Cancel"){
                break
            }
            else if(selected === "Next"){
                pointer += 5
                if(pointer >= backups.length){
                    pointer = 0
                }
            }
            else if(selected === "Previous"){
                pointer -= 5
                if(pointer < 0){
                    pointer = Math.floor(backups.length / 5) * 5
                }
            }
            else{
                const backup = backups.find((backup) => backup[0] === selected)
                if(backup){
                    const res = await fetch(keiServerURL() + '/autobackup/restore', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            token: db.account.token,
                            backup: backup[1]
                        })
                    })
                    if(res.status === 200){
                        setDatabase(await res.json())
                        requiresFullEncoderReload.state = true
                        alertNormal("Successfully restored!")
                    }
                    else{
                        alertNormal("Error: " + res.text())
                    }
                }
            }
        }
    }
    else if(res.status === 401){
        alertNormal("You need to activate Risu-Kei in your account, or host your Risu-Kei server from github to use this feature.")
    }
    else{
        alertNormal("Error: " + res.text())
    }
}

let lastKeiSave = 0
export function saveDbKei() {
    try{
        let db = getDatabase()
        if(db.account.kei){
            if(Date.now() - lastKeiSave < 60000 * 5){
                return
            }
            lastKeiSave = Date.now()
            fetch(keiServerURL() + '/autobackup/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: db.account.token,
                    database: db
                })
            })
        }   
    }
    catch(e){}
}
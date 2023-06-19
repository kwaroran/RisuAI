import { get } from "svelte/store"
import { hubURL } from "../characterCards"
import { DataBase } from "../storage/database"
import { alertError } from "../alert"

export async function risuLogin() {
    const win = window.open(hubURL + '/hub/login')
    window.addEventListener("message", (ev) => {
        console.log(ev)
        const data = JSON.parse(ev.data)
        console.log(data)
        win.close()
    })
}

export async function saveRisuAccountData() {
    const db = get(DataBase)
    if(!db.account){
        alertError("Not logged in error")
        return
    }
    const s = await fetch(hubURL + '/hub/account/save', {
        method: "POST",
        body: JSON.stringify({
            token: db.account.token,
            save: db.account.data
        })
    })
    if(s.status !== 200){
        alertError(await s.text())
        return
    }
}

export async function loadRisuAccountData() {
    const db = get(DataBase)
    if(!db.account){
        alertError("Not logged in error")
        return
    }
    const s = await fetch(hubURL + '/hub/account/load', {
        method: "POST",
        body: JSON.stringify({
            token: db.account.token
        })
    })
    if(s.status !== 200){
        alertError(await s.text())
        return
    }
    db.account.data = await s.json()
}
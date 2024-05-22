import { get } from "svelte/store";
import { exportSpecV2 } from "./characterCards";
import { VirtualWriter } from "./storage/globalApi";
import { sleep } from "./util";
import { CurrentCharacter } from "./stores";
import { DataBase, type character } from "./storage/database";
import { alertStore } from "./alert";

let pong = false;

window.addEventListener("message", (event) => {
    if (event.origin === "https://realm.risuai.net") {
        if (event.data === "pong") {
            pong = true;
        }
    }
});

export async function shareRealmCard() {
    const char = structuredClone(get(CurrentCharacter)) as character
    const writer = new VirtualWriter()
    await exportSpecV2(char, 'png', {writer: writer})
    openRealm(char.name, writer.buf.buffer)
}

export async function openRealm(name:string,data:ArrayBuffer) {
    const tk = get(DataBase)?.account?.token;
    const id = get(DataBase)?.account?.id
    const win = window.open(`https://realm.risuai.net/upload?token=${tk}&token_id=${id}`, "_blank");
    pong = false;
    while(true){
        if(pong){
            break;
        }
        win.postMessage("ping", "https://realm.risuai.net")
        await sleep(500);
    }
    alertStore.set({
        type: 'none',
        msg: ''
    })

    const nameBuf = new TextEncoder().encode(name);

    win.postMessage("filedata", "https://realm.risuai.net", [nameBuf,data]);
}
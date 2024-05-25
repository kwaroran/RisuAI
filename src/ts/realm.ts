import { get } from "svelte/store";
import { exportCharacterCard } from "./characterCards";
import { VirtualWriter, isTauri, openURL } from "./storage/globalApi";
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

export async function shareRealmCardData():Promise<{ name: ArrayBuffer; data: ArrayBuffer; }> {
    const char = structuredClone(get(CurrentCharacter)) as character
    const trimedName = char.name.replace(/[^a-zA-Z0-9]/g, '') || 'character';
    const writer = new VirtualWriter()
    const namebuf = new TextEncoder().encode(trimedName + '.png')
    await exportCharacterCard(char, 'png', {writer: writer})
    alertStore.set({
        type: 'none',
        msg: ''
    })
    return {
        name: namebuf.buffer,
        data: writer.buf.buffer.buffer
    }
}

export async function openRealm(name:string,data:ArrayBuffer) {
    const tk = get(DataBase)?.account?.token;
    const id = get(DataBase)?.account?.id
    const trimedName = name.replace(/[^a-zA-Z0-9]/g, '') || 'character';
    const filedata = encodeURIComponent(Buffer.from(data).toString('base64')) + `&${trimedName}.png`;
    const url = `https://realm.risuai.net/upload?token=${tk}&token_id=${id}#filedata=${filedata}`
}
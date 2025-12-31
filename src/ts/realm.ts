import { exportCharacterCard } from "./characterCards";
import { VirtualWriter } from "./globalApi.svelte";
import { getCurrentCharacter, getDatabase, type character } from "./storage/database.svelte";
import { alertStore } from "./alert";
import { asBuffer } from "./util";

let pong = false;

window.addEventListener("message", (event) => {
    if (event.origin === "https://realm.risuai.net") {
        if (event.data === "pong") {
            pong = true;
        }
    }
});

export async function shareRealmCardData():Promise<{ name: ArrayBuffer; data: ArrayBuffer; }> {
    const char = safeStructuredClone(getCurrentCharacter({snapshot:true})) as character
    const trimedName = char.name.replace(/[^a-zA-Z0-9]/g, '') || 'character';
    const writer = new VirtualWriter()
    const namebuf = new TextEncoder().encode(trimedName + '.png')
    await exportCharacterCard(char, 'png', {writer: writer, spec: 'v3'})
    alertStore.set({
        type: 'none',
        msg: ''
    })
    return {
        name: asBuffer(namebuf.buffer),
        data: asBuffer(writer.buf.buffer.buffer)
    }
}

export function openRealm(name:string,data:ArrayBuffer) {
    const tk = getDatabase()?.account?.token;
    const id = getDatabase()?.account?.id
    const trimedName = name.replace(/[^a-zA-Z0-9]/g, '') || 'character';
    const filedata = encodeURIComponent(Buffer.from(data).toString('base64')) + `&${trimedName}.png`;
    const url = `https://realm.risuai.net/upload?token=${tk}&token_id=${id}#filedata=${filedata}`
}
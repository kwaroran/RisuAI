import { get } from "svelte/store";
import { CharEmotion, selectedCharID } from "../stores";
import { DataBase, setDatabase, type character, type customscript, type groupChat } from "../storage/database";
import { downloadFile } from "../storage/globalApi";
import { alertError, alertNormal } from "../alert";
import { language } from "src/lang";
import { findCharacterbyId, selectSingleFile } from "../util";
import { calcString } from "./infunctions";

const dreg = /{{data}}/g
const randomness = /\|\|\|/g

type ScriptMode = 'editinput'|'editoutput'|'editprocess'|'editdisplay'

export function processScript(char:character|groupChat, data:string, mode:ScriptMode){
    return processScriptFull(char, data, mode).data
}

export function exportRegex(){
    let db = get(DataBase)
    const script = db.globalscript
    const data = Buffer.from(JSON.stringify({
        type: 'regex',
        data: script
    }), 'utf-8')
    downloadFile(`regexscript_export.json`,data)
    alertNormal(language.successExport)
}

export async function importRegex(){
    const filedata = (await selectSingleFile(['json'])).data
    if(!filedata){
        return
    }
    let db = get(DataBase)
    try {
        const imported= JSON.parse(Buffer.from(filedata).toString('utf-8'))
        if(imported.type === 'regex' && imported.data){
            const datas:customscript[] = imported.data
            const script = db.globalscript
            for(const data of datas){
                script.push(data)
            }
            db.globalscript = script
            setDatabase(db)
        }
        else{
            alertError("File invaid or corrupted")
        }

    } catch (error) {
        alertError(`${error}`)
    }
}

export function processScriptFull(char:character|groupChat, data:string, mode:ScriptMode, chatID = -1){
    let db = get(DataBase)
    let emoChanged = false
    const scripts = (db.globalscript ?? []).concat(char.customscript)
    for (const script of scripts){
        if(script.type === mode){
            const reg = new RegExp(script.in, script.ableFlag ? script.flag : 'g')
            let outScript = script.out.replaceAll("$n", "\n")
            if(outScript.startsWith('@@')){
                if(reg.test(data)){
                    if(outScript.startsWith('@@emo ')){
                        const emoName = script.out.substring(6).trim()
                        let charemotions = get(CharEmotion)
                        let tempEmotion = charemotions[char.chaId]
                        if(!tempEmotion){
                            tempEmotion = []
                        }
                        if(tempEmotion.length > 4){
                            tempEmotion.splice(0, 1)
                        }
                        for(const emo of char.emotionImages){
                            if(emo[0] === emoName){
                                const emos:[string, string,number] = [emo[0], emo[1], Date.now()]
                                tempEmotion.push(emos)
                                charemotions[char.chaId] = tempEmotion
                                CharEmotion.set(charemotions)
                                emoChanged = true
                                break
                            }
                        }
                    }
                    if(outScript.startsWith('@@inject') && chatID !== -1){
                        const selchar = db.characters[get(selectedCharID)]
                        selchar.chats[selchar.chatPage].message[chatID].data = data
                        data = data.replace(reg, "")
                    }
                }
                else{
                    if(outScript.startsWith('@@repeat_back')  && chatID !== -1){
                        const v = outScript.split(' ', 2)[1]
                        const selchar = db.characters[get(selectedCharID)]
                        const chat = selchar.chats[selchar.chatPage]
                        let lastChat = selchar.firstMsgIndex === -1 ? selchar.firstMessage : selchar.alternateGreetings[selchar.firstMsgIndex]
                        let pointer = chatID - 1
                        while(pointer >= 0){
                            if(chat.message[pointer].role === chat.message[chatID].role){
                                lastChat = chat.message[pointer].data
                                break
                            }
                            pointer--
                        }

                        const r = lastChat.match(reg)
                        if(!v){
                            data = data + r[0]
                        }
                        else if(r[0]){
                            switch(v){
                                case 'end':
                                    data = data + r[0]
                                    break
                                case 'start':
                                    data = r[0] + data
                                    break
                                case 'end_nl':
                                    data = data + "\n" + r[0]
                                    break
                                case 'start_nl':
                                    data = r[0] + "\n" + data
                                    break
                            }

                        }                        
                    }
                }
            }
            else{

                function skr(da:string){
                    return da.replace(/{{(.+?)}}/g, (v, p1:string) => {
                        if(p1 === 'previous_char_chat'){
                            if(chatID !== -1){
                                const selchar = db.characters[get(selectedCharID)]
                                const chat = selchar.chats[selchar.chatPage]
                                let pointer = chatID - 1
                                while(pointer >= 0){
                                    if(chat.message[pointer].role === 'char'){
                                        return chat.message[pointer].data
                                    }
                                    pointer--
                                }
                                return selchar.firstMsgIndex === -1 ? selchar.firstMessage : selchar.alternateGreetings[selchar.firstMsgIndex]
                            }
                            return
                        }
                        if(p1 === 'previous_user_chat'){
                            if(chatID !== -1){
                                const selchar = db.characters[get(selectedCharID)]
                                const chat = selchar.chats[selchar.chatPage]
                                let pointer = chatID - 1
                                while(pointer >= 0){
                                    if(chat.message[pointer].role === 'user'){
                                        return chat.message[pointer].data
                                    }
                                    pointer--
                                }
                                return selchar.firstMsgIndex === -1 ? selchar.firstMessage : selchar.alternateGreetings[selchar.firstMsgIndex]
                            }
                        }
                        if(p1.startsWith('getvar')){
                            const v = p1.split("::")[1]
                            if(chatID !== -1){
                                const d =getVarChat(chatID)
                                console.log(d)
                                return d[v] ?? "[Null]"
                            }
                        }
                        if(p1.startsWith('calc')){
                            const v = p1.split("::")[1]
                            return calcString(v).toString()
                        }
                        return v
                    })
                }
                let mOut = skr(outScript.replace(dreg, "$&"))
                if(randomness.test(data)){
                    const list = data.split('|||')
                    data = list[Math.floor(Math.random()*list.length)];
                }
                data = skr(data.replace(reg, mOut))
            }
        }
    }
    return {data, emoChanged}
}


export function getVarChat(targetIndex = -1){
    const db = get(DataBase)
    const selchar = db.characters[get(selectedCharID)]
    const chat = selchar.chats[selchar.chatPage]
    let i =0;
    if(targetIndex === -1 || targetIndex >= chat.message.length){
        targetIndex = chat.message.length - 1
    }
    let vars:{[key:string]:string} = {}
    const fm = selchar.firstMsgIndex === -1 ? selchar.firstMessage : selchar.alternateGreetings[selchar.firstMsgIndex]
    const rg = /(\{\{setvar::(.+?)::(.+?)\}\})/gu
    const rg2 = /(\{\{addvar::(.+?)::(.+?)\}\})/gu
    const m = fm.matchAll(rg)
    function process(text:string){
        const m = text.matchAll(rg)
        for(const a of m){
            if(a.length === 4){
                vars[a[2]] = a[3]
            }
        }
        const m2 = text.matchAll(rg2)
        for(const a of m2){
            if(a.length === 4){
                vars[a[2]] = (parseInt(vars[a[2]]) + parseInt(a[3])).toString()
            }
        }
    }
    process(fm)
    while( i <= targetIndex ){
        process(chat.message[i].data)
        i += 1
    }
    return vars
}
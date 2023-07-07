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
                        data = data + r[0]
                        
                    }
                }
            }
            else{
                let mOut = outScript.replace(dreg, "$&")
                if(chatID !== -1){
                    const selchar = db.characters[get(selectedCharID)]
                    const chat = selchar.chats[selchar.chatPage]
                    outScript = outScript.replace(/{{(.+?)}}/g, (v, p1:string) => {
                        if(p1 === 'previous_char_chat'){
                            let pointer = chatID - 1
                            while(pointer >= 0){
                                if(chat.message[pointer].role === 'char'){
                                    return chat.message[pointer].data
                                }
                                pointer--
                            }
                            return selchar.firstMsgIndex === -1 ? selchar.firstMessage : selchar.alternateGreetings[selchar.firstMsgIndex]
                        }
                        if(p1 === 'previous_user_chat'){
                            let pointer = chatID - 1
                            while(pointer >= 0){
                                if(chat.message[pointer].role === 'user'){
                                    return chat.message[pointer].data
                                }
                                pointer--
                            }
                            return selchar.firstMsgIndex === -1 ? selchar.firstMessage : selchar.alternateGreetings[selchar.firstMsgIndex]
                        }
                        if(p1.startsWith('calc')){
                            const v = p1.split("::")[1]
                            return calcString(v).toString()
                        }
                        return v
                    })
                }
                if(randomness.test(data)){
                    const list = data.split('|||')
                    data = list[Math.floor(Math.random()*list.length)];
                }
                data = data.replace(reg, mOut)
            }
        }
    }
    return {data, emoChanged}
}
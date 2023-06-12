import { get } from "svelte/store";
import { CharEmotion, selectedCharID } from "../stores";
import { DataBase, setDatabase, type character, type customscript, type groupChat } from "../storage/database";
import { downloadFile } from "../storage/globalApi";
import { alertError, alertNormal } from "../alert";
import { language } from "src/lang";
import { selectSingleFile } from "../util";

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

export function processScriptFull(char:character|groupChat, data:string, mode:ScriptMode){
    let db = get(DataBase)
    let emoChanged = false
    const scripts = (db.globalscript ?? []).concat(char.customscript)
    for (const script of scripts){
        if(script.type === mode){
            const reg = new RegExp(script.in, script.ableFlag ? script.flag : 'g')
            const outScript = script.out
            if(outScript.startsWith('@@') && reg.test(data)){
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
            }
            else{
                if(randomness.test(data)){
                    const list = data.split('|||')
                    data = list[Math.floor(Math.random()*list.length)];
                }
                data = data.replace(reg, outScript.replace(dreg, "$&"))
            }
        }
    }
    return {data, emoChanged}
}
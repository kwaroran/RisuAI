import { get } from "svelte/store";
import { CharEmotion, selectedCharID } from "../stores";
import { DataBase, type character } from "../database";

const dreg = /{{data}}/g

type ScriptMode = 'editinput'|'editoutput'|'editprocess'|'editdisplay'

export function processScript(char:character, data:string, mode:ScriptMode){
    return processScriptFull(char, data, mode).data
}

export function processScriptFull(char:character, data:string, mode:ScriptMode){
    let db = get(DataBase)
    let emoChanged = false
    const scripts = char.customscript.concat(db.globalscript ?? [])
    for (const script of char.customscript){
        if(script.type === mode){
            const reg = new RegExp(script.in,'g')
            data = data.replace(reg, (v) => {
                const outScript = script.out.replace(dreg, v)
                if(outScript.startsWith('@@emo ')){
                    if(char.viewScreen !== 'emotion'){
                        return v
                    }
                    if(emoChanged){
                        return v
                    }
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
                    return v
                }
                return outScript
            })
        }
    }
    return {data, emoChanged}
}
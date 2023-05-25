import { get } from "svelte/store";
import { CharEmotion, selectedCharID } from "../stores";
import { DataBase, type character } from "../database";

const dreg = /{{data}}/g
const randomness = /\|\|\|/g

type ScriptMode = 'editinput'|'editoutput'|'editprocess'|'editdisplay'

export function processScript(char:character, data:string, mode:ScriptMode){
    return processScriptFull(char, data, mode).data
}

export function processScriptFull(char:character, data:string, mode:ScriptMode){
    let db = get(DataBase)
    let emoChanged = false
    const scripts = char.customscript.concat(db.globalscript ?? [])
    for (const script of scripts){
        if(script.type === mode){
            const reg = new RegExp(script.in,'g')
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
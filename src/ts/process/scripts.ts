import { get } from "svelte/store";
import { CharEmotion, selectedCharID } from "../stores";
import { DataBase, setDatabase, type character, type customscript, type groupChat, type Database } from "../storage/database";
import { downloadFile } from "../storage/globalApi";
import { alertError, alertNormal } from "../alert";
import { language } from "src/lang";
import { selectSingleFile } from "../util";
import { assetRegex, risuChatParser as risuChatParserOrg, type simpleCharacterArgument } from "../parser";
import { runCharacterJS } from "../plugins/embedscript";
import { metricaPlugin } from "../plugins/metrica";
import { OaiFixKorean } from "../plugins/fixer";
import { getModuleRegexScripts } from "./modules";
import { HypaProcesser } from "./memory/hypamemory";

const dreg = /{{data}}/g
const randomness = /\|\|\|/g

export type ScriptMode = 'editinput'|'editoutput'|'editprocess'|'editdisplay'

export async function processScript(char:character|groupChat, data:string, mode:ScriptMode){
    return (await processScriptFull(char, data, mode)).data
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

export async function processScriptFull(char:character|groupChat|simpleCharacterArgument, data:string, mode:ScriptMode, chatID = -1){
    let db = get(DataBase)
    let emoChanged = false
    const scripts = (db.globalscript ?? []).concat(char.customscript).concat(getModuleRegexScripts())
    if(db.officialplugins.metrica && mode === 'editdisplay'){
        data = metricaPlugin(data, 'metrics')
    }
    if(db.officialplugins.metrica && (mode === 'editinput' || mode === 'editoutput' || mode === 'editprocess')){
        data = metricaPlugin(data, 'imperial')
    }
    if(db.officialplugins.oaiFixLetters && db.officialplugins.oaiFix && (mode === 'editoutput' || mode === 'editdisplay')){
        data = OaiFixKorean(data)
    }
    data = await runCharacterJS({
        code: char.virtualscript ?? null,
        mode,
        data,
    })
    if(scripts.length === 0){
        return {data, emoChanged}
    }
    for (const script of scripts){
        if(script.type === mode){

            let outScript2 = script.out.replaceAll("$n", "\n")
            let outScript = outScript2.replace(dreg, "$&")
            let flag = 'g'
            if(script.ableFlag){
                flag = script.flag || 'g'
            }
            if(outScript.startsWith('@@move_top') || outScript.startsWith('@@move_bottom')){
                flag = flag.replace('g', '') //temperary fix
            }
            //remove unsupported flag
            flag = flag.replace(/[^gimuy]/g, '')

            if(flag.length === 0){
                flag = 'u'
            }

            const reg = new RegExp(script.in, flag)
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
                        if(char.type !== 'simple'){
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
                    if(outScript.startsWith('@@inject') && chatID !== -1){
                        const selchar = db.characters[get(selectedCharID)]
                        selchar.chats[selchar.chatPage].message[chatID].data = data
                        data = data.replace(reg, "")
                    }
                    if(outScript.startsWith('@@move_top') || outScript.startsWith('@@move_bottom')){
                        const isGlobal = flag.includes('g')
                        const matchAll = isGlobal ? data.matchAll(reg) : [data.match(reg)]
                        data = data.replace(reg, "")
                        for(const matched of matchAll){
                            console.log(matched)
                            if(matched){
                                const inData = matched[0]
                                let out = outScript.replace('@@move_top ', '').replace('@@move_bottom ', '')
                                    .replace(/(?<!\$)\$[0-9]+/g, (v)=>{
                                        const index = parseInt(v.substring(1))
                                        if(index < matched.length){
                                            return matched[index]
                                        }
                                        return v
                                    })
                                    .replace(/\$\&/g, inData)
                                    .replace(/(?<!\$)\$<([^>]+)>/g, (v) => {
                                        const groupName = parseInt(v.substring(2, v.length - 1))
                                        if(matched.groups && matched.groups[groupName]){
                                            return matched.groups[groupName]
                                        }
                                        return v
                                    })
                                console.log(out)
                                if(outScript.startsWith('@@move_top')){
                                    data = out + '\n' +data
                                }
                                else{
                                    data = data + '\n' + out
                                }
                            }
                        }
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
                data = risuChatParser(data.replace(reg, outScript))
            }
        }
    }

    if(db.dynamicAssets && (char.type === 'simple' || char.type === 'character') && char.additionalAssets && char.additionalAssets.length > 0){
        if(!db.dynamicAssetsEditDisplay && mode === 'editdisplay'){
            return {data, emoChanged}
        }
        const assetNames = char.additionalAssets.map((v) => v[0])
        const processer = new HypaProcesser('MiniLM')
        await processer.addText(assetNames)
        const matches = data.matchAll(assetRegex)

        for(const match of matches){
            const type = match[1]
            const assetName = match[2]
            if(!assetNames.includes(assetName)){
                const searched = await processer.similaritySearch(assetName)
                const bestMatch = searched[0]
                if(bestMatch){
                    data = data.replaceAll(match[0], `{{${type}::${bestMatch}}}`)
                }
            }
        }
    }

    return {data, emoChanged}
}


const rgx = /(?:{{|<)(.+?)(?:}}|>)/gm
export const risuChatParser = risuChatParserOrg
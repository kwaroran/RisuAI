import { get } from "svelte/store";
import { CharEmotion, selectedCharID } from "../stores.svelte";
import { type character, type customscript, type groupChat, type Database, getDatabase } from "../storage/database.svelte";
import { downloadFile } from "../globalApi.svelte";
import { alertError, alertNormal } from "../alert";
import { language } from "src/lang";
import { selectSingleFile } from "../util";
import { assetRegex, type CbsConditions, risuChatParser as risuChatParserOrg, type simpleCharacterArgument } from "../parser.svelte";
import { getModuleAssets, getModuleRegexScripts } from "./modules";
import { HypaProcesser } from "./memory/hypamemory";
import { runLuaEditTrigger } from "./lua";
import { pluginV2 } from "../plugins/plugins";

const dreg = /{{data}}/g
const randomness = /\|\|\|/g

export type ScriptMode = 'editinput'|'editoutput'|'editprocess'|'editdisplay'

type pScript = {
    script: customscript,
    order: number
    actions: string[]
}

export async function processScript(char:character|groupChat, data:string, mode:ScriptMode, cbsConditions:CbsConditions = {}){
    return (await processScriptFull(char, data, mode, -1, cbsConditions)).data
}

export function exportRegex(s?:customscript[]){
    let db = getDatabase()
    const script = s ?? db.globalscript
    const data = Buffer.from(JSON.stringify({
        type: 'regex',
        data: script
    }), 'utf-8')
    downloadFile(`regexscript_export.json`,data)
    alertNormal(language.successExport)
}

export async function importRegex(o?:customscript[]):Promise<customscript[]>{
    o = o ?? []
    const filedata = (await selectSingleFile(['json'])).data
    if(!filedata){
        return o
    }
    let db = getDatabase()
    try {
        const imported= JSON.parse(Buffer.from(filedata).toString('utf-8'))
        if(imported.type === 'regex' && imported.data){
            const datas:customscript[] = imported.data
            const script = o
            for(const data of datas){
                script.push(data)
            }
            return o
        }
        else{
            alertError("File invaid or corrupted")
        }

    } catch (error) {
        alertError(`${error}`)
    }
    return o
}

let bestMatchCache = new Map<string, string>()
let processScriptCache = new Map<string, string>()

function cacheScript(scripts:customscript[], data:string, result:string, mode:ScriptMode){
    let hash = data + '|||' + mode + '|||'
    for(const script of scripts){
        hash += `${script.in}|||${script.out}|||${script.flag}|||${script.ableFlag}|||${script.type}`
    }

    processScriptCache.set(hash, result)

    if(processScriptCache.size > 500){
        processScriptCache.delete(processScriptCache.keys().next().value)
    }

}

function getScriptCache(scripts:customscript[], data:string, mode:ScriptMode){
    let hash = data + '|||' + mode + '|||'
    for(const script of scripts){
        hash += `${script.in}|||${script.out}|||${script.flag}|||${script.ableFlag}|||${script.type}`
    }

    return processScriptCache.get(hash)
}

export function resetScriptCache(){
    processScriptCache = new Map()
}

export async function processScriptFull(char:character|groupChat|simpleCharacterArgument, data:string, mode:ScriptMode, chatID = -1, cbsConditions:CbsConditions = {}){
    let db = getDatabase()
    const originalData = data
    const cached = getScriptCache((db.presetRegex ?? []).concat(char.customscript), originalData, mode)
    if(cached){
        return {data: cached, emoChanged: false}
    }
    let emoChanged = false
    const scripts = (db.presetRegex ?? []).concat(char.customscript).concat(getModuleRegexScripts())
    data = await runLuaEditTrigger(char, mode, data)
    if(pluginV2[mode].size > 0){
        for(const plugin of pluginV2[mode]){
            const res = await plugin(data)
            if(res !== null && res !== undefined){
                data = res
            }
        }
    }
    
    if(scripts.length === 0){
        cacheScript(scripts, originalData, data, mode)
        return {data, emoChanged}
    }
    function executeScript(pscript:pScript){
        const script = pscript.script
        
        if(script.type === mode){

            let outScript2 = script.out.replaceAll("$n", "\n")
            let outScript = outScript2.replace(dreg, "$&")
            let flag = 'g'
            if(script.ableFlag){
                flag = script.flag || 'g'
            }
            if(outScript.startsWith('@@move_top') || outScript.startsWith('@@move_bottom') || pscript.actions.includes('move_top') || pscript.actions.includes('move_bottom')){
                flag = flag.replace('g', '') //temperary fix
            }
            if(outScript.endsWith('>') && !pscript.actions.includes('no_end_nl')){
                outScript += '\n'
            }
            //remove unsupported flag
            flag = flag.trim().replace(/[^dgimsuvy]/g, '')

            //remove repeated flags
            flag = flag.split('').filter((v, i, a) => a.indexOf(v) === i).join('')
            
            if(flag.length === 0){
                flag = 'u'
            }

            let input = script.in
            if(pscript.actions.includes('cbs')){
                input = risuChatParser(input, { chatID: chatID, cbsConditions })
            }

            const reg = new RegExp(input, flag)
            if(outScript.startsWith('@@') || pscript.actions.length > 0){
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
                    else if((outScript.startsWith('@@inject') || pscript.actions.includes('inject')) && chatID !== -1){
                        const selchar = db.characters[get(selectedCharID)]
                        selchar.chats[selchar.chatPage].message[chatID].data = data
                        data = data.replace(reg, "")
                    }
                    else if(
                        outScript.startsWith('@@move_top') || outScript.startsWith('@@move_bottom') ||
                        pscript.actions.includes('move_top') || pscript.actions.includes('move_bottom')
                    ){
                        const isGlobal = flag.includes('g')
                        const matchAll = isGlobal ? data.matchAll(reg) : [data.match(reg)]
                        data = data.replace(reg, "")
                        for(const matched of matchAll){
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
                                if(outScript.startsWith('@@move_top') || pscript.actions.includes('move_top')){
                                    data = out + '\n' +data
                                }
                                else{
                                    data = data + '\n' + out
                                }
                            }
                        }
                    }
                    else{
                        data = risuChatParser(data.replace(reg, outScript), { chatID: chatID, cbsConditions })
                    }
                }
                else{
                    if((outScript.startsWith('@@repeat_back') || pscript.actions.includes('repeat_back'))  && chatID !== -1){
                        const v = outScript.split(' ', 2)[1]
                        const selchar = db.characters[get(selectedCharID)]
                        const chat = selchar.chats[selchar.chatPage]
                        let lastChat = chat.fmIndex === -1 ? selchar.firstMessage : selchar.alternateGreetings[chat.fmIndex]
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
                data = risuChatParser(data.replace(reg, outScript), { chatID: chatID, cbsConditions })
            }
        }
    }

    let parsedScripts:pScript[] = []
    let orderChanged = false
    for (const script of scripts){
        if(script.ableFlag && script.flag?.includes('<')){
            const rregex = /<(.+?)>/g
            const scriptData = safeStructuredClone(script)
            let order = 0
            const actions:string[] = []
            scriptData.flag = scriptData.flag?.replace(rregex, (v:string, p1:string) => {
                const meta = p1.split(',').map((v) => v.trim())
                for(const m of meta){
                    if(m.startsWith('order ')){
                        order = parseInt(m.substring(6))
                    }
                    else{
                        actions.push(m)
                    }
                }

                return ''
            })
            parsedScripts.push({
                script: scriptData,
                order,
                actions
            })
            continue
        }
        parsedScripts.push({
            script,
            order: 0,
            actions: []
        })
    }

    if(orderChanged){
        parsedScripts.sort((a, b) => b.order - a.order) //sort by order
    }
    for (const script of parsedScripts){
        try {
            executeScript(script)            
        } catch (error) {
            console.error(error)
        }
    }

    

    if(db.dynamicAssets && (char.type === 'simple' || char.type === 'character') && char.additionalAssets && char.additionalAssets.length > 0){
        if(!db.dynamicAssetsEditDisplay && mode === 'editdisplay'){
            return {data, emoChanged}
        }
        const assetNames = char.additionalAssets.map((v) => v[0])

        const moduleAssets = getModuleAssets()
        if(moduleAssets.length > 0){
            for(const asset of moduleAssets){
                assetNames.push(asset[0])
            }
        }

        const processer = new HypaProcesser()
        await processer.addText(assetNames)
        const matches = data.matchAll(assetRegex)

        for(const match of matches){
            const type = match[1]
            const assetName = match[2]
            const cacheKey = char.chaId + '::' + assetName
            if(type !== 'emotion' && type !== 'source'){
                if(bestMatchCache.has(cacheKey)){
                    data = data.replaceAll(match[0], `{{${type}::${bestMatchCache.get(cacheKey)}}}`)
                }
                else if(!assetNames.includes(assetName)){
                    const searched = await processer.similaritySearch(assetName)
                    const bestMatch = searched[0]
                    if(bestMatch){
                        data = data.replaceAll(match[0], `{{${type}::${bestMatch}}}`)
                        bestMatchCache.set(cacheKey, bestMatch)
                    }
                }
            }
        }
    }

    cacheScript(scripts, originalData, data, mode)

    return {data, emoChanged}
}


const rgx = /(?:{{|<)(.+?)(?:}}|>)/gm
export const risuChatParser = risuChatParserOrg
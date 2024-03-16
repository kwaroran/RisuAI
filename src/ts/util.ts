import { get, writable, type Writable } from "svelte/store"
import type { Database, Message } from "./storage/database"
import { DataBase } from "./storage/database"
import { selectedCharID } from "./stores"
import {open} from '@tauri-apps/api/dialog'
import { readBinaryFile } from "@tauri-apps/api/fs"
import { basename } from "@tauri-apps/api/path"
import { createBlankChar, getCharImage } from "./characters"
import { appWindow } from '@tauri-apps/api/window';
import { isTauri } from "./storage/globalApi"

export interface Messagec extends Message{
    index: number
}

export function messageForm(arg:Message[], loadPages:number){
    let db = get(DataBase)
    let selectedChar = get(selectedCharID)
    function reformatContent(data:string){
        return data.trim()
    }

    let a:Messagec[] = []
    for(let i=0;i<arg.length;i++){
        const m = arg[i]
        a.unshift({
            role: m.role,
            data: reformatContent(m.data),
            index: i,
            saying: m.saying,
            chatId: m.chatId ?? 'none'
        })
    }
    return a.slice(0, loadPages)
}

export function sleep(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

export function checkNullish(data:any){
    return data === undefined || data === null
}

const domSelect = true
export async function selectSingleFile(ext:string[]){
    if(domSelect){
        const v = await selectFileByDom(ext, 'single')
        const file = v[0]
        return {name: file.name,data:await readFileAsUint8Array(file)}
    }

    const selected = await open({
        filters: [{
            name: ext.join(', '),
            extensions: ext
        }]
    });
    if (Array.isArray(selected)) {
        return null
    } else if (selected === null) {
        return null
    } else {
        return {name: await basename(selected),data:await readBinaryFile(selected)}
    }
}

export async function selectMultipleFile(ext:string[]){
    if(!isTauri){
        const v = await selectFileByDom(ext, 'multiple')
        let arr:{name:string, data:Uint8Array}[] = []
        for(const file of v){
            arr.push({name: file.name,data:await readFileAsUint8Array(file)})
        }
        return arr
    }

    const selected = await open({
        filters: [{
            name: ext.join(', '),
            extensions: ext,
        }],
        multiple: true
    });
    if (Array.isArray(selected)) {
        let arr:{name:string, data:Uint8Array}[] = []
        for(const file of selected){
            arr.push({name: await basename(file),data:await readBinaryFile(file)})
        }
        return arr
    } else if (selected === null) {
        return null
    } else {
        return [{name: await basename(selected),data:await readBinaryFile(selected)}]
    }
}

export const replacePlaceholders = (msg:string, name:string) => {
    let db = get(DataBase)
    let selectedChar = get(selectedCharID)
    let currentChar = db.characters[selectedChar]
    return msg  .replace(/({{char}})|({{Char}})|(<Char>)|(<char>)/gi, currentChar.name)
                .replace(/({{user}})|({{User}})|(<User>)|(<user>)/gi, db.username)
                .replace(/(\{\{((set)|(get))var::.+?\}\})/gu,'')
}

export function checkIsIos(){
    return /(iPad|iPhone|iPod)/g.test(navigator.userAgent)
}
function selectFileByDom(allowedExtensions:string[], multiple:'multiple'|'single' = 'single') {
    return new Promise<null|File[]>((resolve) => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = multiple === 'multiple';
    
        if(!(get(DataBase).allowAllExtentionFiles || checkIsIos())){
            if (allowedExtensions && allowedExtensions.length) {
                fileInput.accept = allowedExtensions.map(ext => `.${ext}`).join(',');
            }
        }

    
        fileInput.addEventListener('change', (event) => {
            if (fileInput.files.length === 0) {
                resolve([]);
                return;
            }
    
            const files = Array.from(fileInput.files).filter(file => {
                const fileExtension = file.name.split('.').pop().toLowerCase();
                return !allowedExtensions || allowedExtensions.includes(fileExtension);
            });
    
            fileInput.remove()
            resolve(files);
        });
    
        document.body.appendChild(fileInput);
        fileInput.click();
        fileInput.style.display = 'none'; // Hide the file input element
    });
}

function readFileAsUint8Array(file) {
    return new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
  
      reader.onload = (event) => {
        const buffer = event.target.result;
        const uint8Array = new Uint8Array(buffer as ArrayBuffer);
        resolve(uint8Array);
      };
  
      reader.onerror = (error) => {
        reject(error);
      };
  
      reader.readAsArrayBuffer(file);
    });
}

export async function changeFullscreen(){
    const db = get(DataBase)
    const isFull = await appWindow.isFullscreen()
    if(db.fullScreen && (!isFull)){
        await appWindow.setFullscreen(true)
    }
    if((!db.fullScreen) && (isFull)){
        await appWindow.setFullscreen(false)
    }
}

export async function getCustomBackground(db:string){
    if(db.length < 2){
        return ''
    }
    else{
        const filesrc = await getCharImage(db, 'plain')
        return `background: url("${filesrc}"); background-size: cover;`
    }
}

export function findCharacterbyId(id:string) {
    const db = get(DataBase)
    for(const char of db.characters){
        if(char.type !== 'group'){
            if(char.chaId === id){
                return char
            }
        }
    }
    let unknown =createBlankChar()
    unknown.name = 'Unknown Character'
    return unknown
}

export function findCharacterIndexbyId(id:string) {
    const db = get(DataBase)
    let i=0;
    for(const char of db.characters){
        if(char.chaId === id){
            return i
        }
        i += 1
    }
    return -1
}

export function getCharacterIndexObject() {
    const db = get(DataBase)
    let i=0;
    let result:{[key:string]:number} = {}
    for(const char of db.characters){
        result[char.chaId] = i
        i += 1
    }
    return result
}

export function defaultEmotion(em:[string,string][]){
    if(!em){
        return ''
    }
    for(const v of em){
        if(v[0] === 'neutral'){
            return v[1]
        }
    }
    return ''
}

export async function getEmotion(db:Database,chaEmotion:{[key:string]: [string, string, number][]}, type:'contain'|'plain'|'css'){
    const selectedChar = get(selectedCharID)
    const currentDat = db.characters[selectedChar]
    if(!currentDat){
        return []
    }
    let charIdList:string[] = []

    if(currentDat.type === 'group'){
        if(currentDat.characters.length === 0){
            return []
        }
        switch(currentDat.viewScreen){
            case "multiple":
                charIdList = currentDat.characters
                break
            case "single":{
                let newist:[string,string,number] = ['', '', 0]
                let newistChar = currentDat.characters[0]
                for(const currentChar of currentDat.characters){
                    const cha = chaEmotion[currentChar]
                    if(cha){
                        const latestEmotion = cha[cha.length - 1]
                        if(latestEmotion && latestEmotion[2] > newist[2]){
                            newist = latestEmotion
                            newistChar = currentChar
                        }
                    }
                }
                charIdList = [newistChar]
                break
            }
            case "emp":{
                charIdList = currentDat.characters
                break
            }
        }
    }
    else{
        charIdList = [currentDat.chaId]
    }

    let datas: string[] = [currentDat.viewScreen === 'emp' ? 'emp' : 'normal' as const]
    for(const chaid of charIdList){
        const currentChar = findCharacterbyId(chaid)
        if(currentChar.viewScreen === 'emotion'){
            const currEmotion = chaEmotion[currentChar.chaId]
            let im = ''
            if(!currEmotion || currEmotion.length === 0){
                im = (await getCharImage(defaultEmotion(currentChar?.emotionImages),type))
            }
            else{
                im = (await getCharImage(currEmotion[currEmotion.length - 1][1], type))
            }
            if(im && im.length > 2){
                datas.push(im)
            }
        }
        else if(currentChar.viewScreen === 'imggen'){
            const currEmotion = chaEmotion[currentChar.chaId]
            if(!currEmotion || currEmotion.length === 0){
                datas.push(await getCharImage(currentChar.image ?? '', 'plain'))
            }
            else{
                datas.push(currEmotion[currEmotion.length - 1][1])
            }
        }
    }
    return datas
}

export function getAuthorNoteDefaultText(){
    const db = get(DataBase)
    const template = db.promptTemplate
    if(!template){
        return ''
    }

    for(const v of template){
        if(v.type === 'authornote'){
            return v.defaultText ?? ''
        }
    }
    return ''

}

export async function encryptBuffer(data:Uint8Array, keys:string){
    // hash the key to get a fixed length key value
    const keyArray = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(keys))

    const key = await window.crypto.subtle.importKey(
        "raw",
        keyArray,
        "AES-GCM",
        false,
        ["encrypt", "decrypt"]
    )

    // use web crypto api to encrypt the data
    const result = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: new Uint8Array(12),
        },
        key,
        data
    )

    return result
}

export async function decryptBuffer(data:Uint8Array, keys:string){
    // hash the key to get a fixed length key value
    const keyArray = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(keys))

    const key = await window.crypto.subtle.importKey(
        "raw",
        keyArray,
        "AES-GCM",
        false,
        ["encrypt", "decrypt"]
    )

    // use web crypto api to encrypt the data
    const result = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: new Uint8Array(12),
        },
        key,
        data
    )

    return result
}

export function getCurrentCharacter(){
    const db = get(DataBase)
    const selectedChar = get(selectedCharID)
    return db.characters[selectedChar]
}

export function toState<T>(t:T):Writable<T>{
    return writable(t)
}

export function BufferToText(data:Uint8Array){
    if(!TextDecoder){
        return Buffer.from(data).toString('utf-8')
    }
    return new TextDecoder().decode(data)
}

export function encodeMultilangString(data:{[code:string]:string}){
    let result = ''
    if(data.xx){
        result = data.xx
    }
    for(const key in data){
        result = `${result}\n# \`${key}\`\n${data[key]}`
    }
    return result.trim()
}

export function parseMultilangString(data:string){
    let result:{[code:string]:string} = {}
    const regex = /# `(.+?)`\n([\s\S]+?)(?=\n# `|$)/g
    let m:RegExpExecArray
    while ((m = regex.exec(data)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        result[m[1]] = m[2]
    }
    result.xx = data.replace(regex, '')
    return result
}

export const toLangName = (code:string) => {
    switch(code){
        case 'xx':{ //Special case for unknown language
            return 'Unknown Language'
        }
        default:{
            return new Intl.DisplayNames([code, 'en'], {type: 'language'}).of(code)
        }
    }
}

export const languageCodes = ["af","ak","am","an","ar","as","ay","az","be","bg","bh","bm","bn","br","bs","ca","co","cs","cy","da","de","dv","ee","el","en","eo","es","et","eu","fa","fi","fo","fr","fy","ga","gd","gl","gn","gu","ha","he","hi","hr","ht","hu","hy","ia","id","ig","is","it","iu","ja","jv","ka","kk","km","kn","ko","ku","ky","la","lb","lg","ln","lo","lt","lv","mg","mi","mk","ml","mn","mr","ms","mt","my","nb","ne","nl","nn","no","ny","oc","om","or","pa","pl","ps","pt","qu","rm","ro","ru","rw","sa","sd","si","sk","sl","sm","sn","so","sq","sr","st","su","sv","sw","ta","te","tg","th","ti","tk","tl","tn","to","tr","ts","tt","tw","ug","uk","ur","uz","vi","wa","wo","xh","yi","yo","zh","zu"]
import { get, writable, type Writable } from "svelte/store"
import type { Database, Message } from "./storage/database.svelte"
import { getDatabase } from "./storage/database.svelte"
import { selectedCharID } from "./stores.svelte"
import {open} from '@tauri-apps/plugin-dialog'
import { readFile } from "@tauri-apps/plugin-fs"
import { basename } from "@tauri-apps/api/path"
import { createBlankChar, getCharImage } from "./characters"
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { isTauri } from "./globalApi.svelte"
import type { Attachment } from "svelte/attachments"
import { mount, unmount, type Snippet } from "svelte"
import PopupList from "src/lib/UI/PopupList.svelte"
const appWindow = isTauri ? getCurrentWebviewWindow() : null

export const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1

export interface Messagec extends Message{
    index: number
}

export function messageForm(arg:Message[], loadPages:number){
    function reformatContent(data:string){
        return data?.trim()
    }

    let a:Messagec[] = []
    for(let i=0;i<arg.length;i++){
        const m = arg[i]
        a.unshift({
            role: m.role,
            data: reformatContent(m.data),
            index: i,
            saying: m.saying,
            chatId: m.chatId ?? 'none',
            generationInfo: m.generationInfo,
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
        return {name: await basename(selected),data:await readFile(selected)}
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
            arr.push({name: await basename(file),data:await readFile(file)})
        }
        return arr
    } else if (selected === null) {
        return null
    } else {
        return [{name: await basename(selected),data:await readFile(selected)}]
    }
}

export const replacePlaceholders = (msg:string, name:string) => {
    let db = getDatabase()
    let selectedChar = get(selectedCharID)
    let currentChar = db.characters[selectedChar]
    return msg  .replace(/({{char}})|({{Char}})|(<Char>)|(<char>)/gi, currentChar.name)
                .replace(/({{user}})|({{User}})|(<User>)|(<user>)/gi, getUserName())
                .replace(/(\{\{((set)|(get))var::.+?\}\})/gu,'')
}

function checkPersonaBinded(){
    try {
        let db = getDatabase()
        const selectedChar = get(selectedCharID)
        const character = db.characters[selectedChar]
        const chat = character.chats[character.chatPage]
        if(!chat.bindedPersona){
            return null
        }
        const persona = db.personas.find(v => v.id === chat.bindedPersona)
        return persona 
    } catch (error) {
        return null
    }
}

export function getUserName(){
    const bindedPersona = checkPersonaBinded()
    if(bindedPersona){
        return bindedPersona.name
    }
    const db = getDatabase()
    return db.username ?? 'User'
}

export function getUserIcon(){
    const bindedPersona = checkPersonaBinded()
    if(bindedPersona){
        return bindedPersona.icon
    }
    const db = getDatabase()
    return db.userIcon ?? ''
}

export function getPersonaPrompt(){
    const bindedPersona = checkPersonaBinded()
    if(bindedPersona){
        return bindedPersona.personaPrompt
    }
    const db = getDatabase()
    return db.personaPrompt ?? ''
}

export function getUserIconProtrait(){
    try {
        const bindedPersona = checkPersonaBinded()
        if(bindedPersona){
            return bindedPersona.largePortrait
        }
        const db = getDatabase()
        return db.personas[db.selectedPersona].largePortrait       
    } catch (error) {
        return false
    }
}

export function checkIsIos(){
    return /(iPad|iPhone|iPod)/g.test(navigator.userAgent)
}
export function selectFileByDom(allowedExtensions:string[], multiple:'multiple'|'single' = 'single') {
    return new Promise<null|File[]>((resolve) => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = multiple === 'multiple';
        const acceptAll = (getDatabase().allowAllExtentionFiles || checkIsIos() || allowedExtensions[0] === '*')
        if(!acceptAll){
            if (allowedExtensions && allowedExtensions.length) {
                fileInput.accept = allowedExtensions.map(ext => `.${ext}`).join(',');
            }
        }
        else{
            fileInput.accept = '*'
        }

    
        fileInput.addEventListener('change', (event) => {
            if (fileInput.files.length === 0) {
                resolve([]);
                return;
            }
    
            const files = acceptAll ? Array.from(fileInput.files) :(Array.from(fileInput.files).filter(file => {
                const fileExtension = file.name.split('.').pop().toLowerCase();
                return !allowedExtensions || allowedExtensions.includes(fileExtension);
            })) 
    
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
  
      reader.onerror = () => {
        reject(reader.error ?? new Error('Failed to read file'));
      };
  
      reader.readAsArrayBuffer(file);
    });
}

export async function changeFullscreen(){
    const db = getDatabase()
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
    const db = getDatabase()
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
    const db = getDatabase()
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
    const db = getDatabase()
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
    const db = getDatabase()
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
        asBuffer(data)
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
        asBuffer(data)
    )

    return result
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
    return result
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
    try {
        switch(code){
            case 'xx':{ //Special case for unknown language
                return 'Unknown Language'
            }
            default:{
                return new Intl.DisplayNames([code, 'en'], {type: 'language'}).of(code)
            }
        }   
    } catch (error) {
        return code
    }
}

export const capitalize = (s:string) => {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

export function blobToUint8Array(data:Blob){
    return new Promise<Uint8Array>((resolve,reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            if(reader.result instanceof ArrayBuffer){
                resolve(new Uint8Array(reader.result))
            }
            else{
                reject(new Error('reader.result is not ArrayBuffer'))
            }
        }
        reader.onerror = () => {
            reject(reader.error)
        }
        reader.readAsArrayBuffer(data)
    })
}

export const languageCodes = ["af","ak","am","an","ar","as","ay","az","be","bg","bh","bm","bn","br","bs","ca","co","cs","cy","da","de","dv","ee","el","en","eo","es","et","eu","fa","fi","fo","fr","fy","ga","gd","gl","gn","gu","ha","he","hi","hr","ht","hu","hy","ia","id","ig","is","it","iu","ja","jv","ka","kk","km","kn","ko","ku","ky","la","lb","lg","ln","lo","lt","lv","mg","mi","mk","ml","mn","mr","ms","mt","my","nb","ne","nl","nn","no","ny","oc","om","or","pa","pl","ps","pt","qu","rm","ro","ru","rw","sa","sd","si","sk","sl","sm","sn","so","sq","sr","st","su","sv","sw","ta","te","tg","th","ti","tk","tl","tn","to","tr","ts","tt","tw","ug","uk","ur","uz","vi","wa","wo","xh","yi","yo","zh","zu"]

export function sfc32(a:number, b:number, c:number, d:number) {
    return function() {
      a |= 0; b |= 0; c |= 0; d |= 0;
      let t = (a + b | 0) + d | 0;
      d = d + 1 | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}

export function uuidtoNumber(uuid:string){
    let result = 0
    for(let i=0;i<uuid.length;i++){
        result += uuid.charCodeAt(i)
    }
    return result
}

export function isLastCharPunctuation(s:string){
    const lastChar = s.trim().at(-1)
    const punctuation = [
        '.', '!', '?', '。', '！', '？', '…', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '=', '{', '}', '[', ']', '|', '\\', ':', ';', '<', '>', ',', '.', '/', '~', '`', ' ',
        '¡', '¿', '‽', '⁉', "'", '"'
    ]
    if(lastChar && !(punctuation.indexOf(lastChar) !== -1
        //spacing modifier letters
        || (lastChar.charCodeAt(0) >= 0x02B0 && lastChar.charCodeAt(0) <= 0x02FF)
        //combining diacritical marks
        || (lastChar.charCodeAt(0) >= 0x0300 && lastChar.charCodeAt(0) <= 0x036F)
        //hebrew punctuation
        || (lastChar.charCodeAt(0) >= 0x0590 && lastChar.charCodeAt(0) <= 0x05CF)
        //CJK symbols and punctuation
        || (lastChar.charCodeAt(0) >= 0x3000 && lastChar.charCodeAt(0) <= 0x303F)
    )){
        return false
    }
    return true
}

export function trimUntilPunctuation(s:string){
    let result = s
    while(result.length > 0 && !isLastCharPunctuation(result)){
        result = result.slice(0, -1)
    }
    return result
}

/**
 * Appends the given last path to the provided URL.
 *
 * @param {string} url - The base URL to which the last path will be appended.
 * @param {string} lastPath - The path to be appended to the URL.
 * @returns {string} The modified URL with the last path appended.
 * 
 * @example
 * appendLastPath("https://github.com/kwaroran/Risuai","/commits/main")
 * return 'https://github.com/kwaroran/Risuai/commits/main'
 * 
 * @example
 * appendLastPath("https://github.com/kwaroran/Risuai/","/commits/main")
 * return 'https://github.com/kwaroran/Risuai/commits/main
 * 
 * @example
 * appendLastPath("http://127.0.0.1:7997","embeddings")
 * return 'http://127.0.0.1:7997/embeddings'
 */
export function appendLastPath(url, lastPath) {
    // Remove trailing slash from url if exists
    url = url.replace(/\/$/, '');
    
    // Remove leading slash from lastPath if exists
    lastPath = lastPath.replace(/^\//, '');

    // Concat the url and lastPath
    return url + '/' + lastPath;
}

/**
 * Converts the text content of a given Node object, including HTML elements, into a plain text sentence.
 *
 * @param {Node} node - The Node object from which the text content will be extracted.
 * @returns {string} The plain text sentence representing the content of the Node object.
 *
 * @example
 * const div = document.createElement('div');
 * div.innerHTML = 'Hello<br>World<del>Deleted</del>';
 * const sentence = getNodetextToSentence(div);
 * console.log(sentence); // Output: "Hello\nWorld~Deleted~"
 */
export function getNodetextToSentence(node: Node): string {
    let result = '';
    for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
            result += child.textContent;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
            if (child.nodeName === 'BR') {
                result += '\n';
                continue;
            }
            
            // If a child has a style it's not for a markdown formatting
            const childStyle = (child as HTMLElement)?.style;
            if (childStyle?.cssText!== '') {
                result += getNodetextToSentence(child);
                continue;
            }
            
            // convert HTML elements to markdown format
            if (child.nodeName === 'DEL') {
                result += '~' + getNodetextToSentence(child) + '~';
            } else if (child.nodeName === 'STRONG' || child.nodeName === 'B') {
                result += '**' + getNodetextToSentence(child) + '**';
            } else if (child.nodeName === 'EM' || child.nodeName === 'I') {
                result += '*' + getNodetextToSentence(child) + '*';
            } 
            else {
                result += getNodetextToSentence(child);
            }
        }
    }
    return result;
}


export const TagList = [
    {
        value: 'female',
        alias: [
            'feminine', 'girl'
        ]
    },
    {
        value: 'male',
        alias: [
            'masculine', 'boy'
        ]
    },
    {
        value: 'OC',
        alias: [
            'original-character', 'original-characters',
        ]
    },
    {
        value: 'game-character',
        alias: [
            'video_game', 'video-game', 'game', 'video-game-character'
        ]
    },
    {
        value: 'anime',
        alias: [
            'animation', 'anime-character'
        ]
    },
    {
        value: 'v-tuber',
        alias: [
            'virtual-tuber', 'virtual-youtuber', 'virtual-youtube'
        ]
    },
    {
        value: 'fantasy',
        alias: [
            'mystical'
        ]
    },
    {
        value: 'religious',
        alias: [
            'spiritual', 'faith', 'religion', 'religious-character'
        ]
    },
    {
        value: 'comedy',
        alias: [
            'funny', 'humor', 'humorous'
        ]
    },
    {
        value: 'mystery',
        alias: [
            'mysterious', 'enigma'
        ]
    },
    {
        value: 'romance',
        alias: [
            'love', 'lovers', 'couple'
        ]
    },
    {
        value: 'dominance',
        alias: [
            'dominant', 'dom', 'submissive', 'sub', 'bdsm'
        ]
    },
    {
        value: 'yandere',
        alias: [
            'yan', 'yandere-character'
        ]
    },
    {
        value: 'non-character',
        alias: [
            'not-a-character', 'noncharacter', 'non-characters'
        ]
    },
    {
        value: 'simulator',
        alias: [
            'simulation', 'sim'
        ]
    },
    {
        value: 'minor',
        alias: [
            'underage', 'young'
        ]
    },
    {
        value: 'giant',
        alias: [
            'giantess', 'giant-character'
        ]
    },
    {
        value: 'tiny',
        alias: [
            'tiny-character', 'tiny-characters'
        ]
    },
    {
        value: 'realistic',
        alias: [
            'real', 'real-life'
        ]
    },
    {
        value: 'cartoon',
        alias: [
            'toon', 'animated'
        ]
    },
    {
        value: 'furry',
        alias: [
            'anthropomorphic'
        ]
    },
    {
        value: 'kenomimi',
        alias: [
            'animal-ears',
        ]
    },
    {
        value: 'mecha',
        alias: [
            'robot', 'mech'
        ]
    },
    {
        value: 'monster',
        alias: [
            'creature', 'beast', 'monstrous'
        ]
    },
    {
        value: 'alien',
        alias: [
            'extraterrestrial', 'alien-character'
        ]
    },
    {
        value: 'demon',
        alias: [
            'devil', 'demonic', 'demon-character'
        ]
    },
    {
        value: 'angel',
        alias: [
            'heavenly', 'angelic', 'angel-character'
        ]
    },
    {
        value: 'elf',
        alias: [
            'elven', 'elf-character'
        ]
    },
    {
        value: 'mermaid',
        alias: [
            'merfolk', 'mermaid-character'
        ]
    },
    {
        value: 'vampire',
        alias: [
            'vampiric', 'vampire-character'
        ]
    },
    {
        value: 'werewolf',
        alias: [
            'lycan', 'lycanthrope', 'werewolf-character'
        ]
    },
    {
        value: 'zombie',
        alias: [
            'undead', 'zombie-character'
        ]
    },
    {
        value: 'ghost',
        alias: [
            'spirit', 'apparition', 'ghost-character'
        ]
    },
    {
        value: 'witch',
        alias: [
            'sorceress', 'witch-character'
        ]
    },
    {
        value: 'wizard',
        alias: [
            'sorcerer', 'wizard-character'
        ]
    },
    {
        value: 'ninja',
        alias: [
            'shinobi', 'ninja-character'
        ]
    },
    {
        value: 'pirate',
        alias: [
            'buccaneer', 'pirate-character'
        ]
    },
    {
        value: 'knight',
        alias: [
            'paladin', 'knight-character'
        ]
    },
    {
        value: 'samurai',
        alias: [
            'bushi', 'samurai-character'
        ]
    },
    {
        value: 'cowboy',
        alias: [
            'cowgirl', 'cowboy-character'
        ]
    },
    {
        value: 'noble',
        alias: [
            'royal', 'nobility', 'noble-character'
        ]
    },
    {
        value: 'thief',
        alias: [
            'rogue', 'thief-character'
        ]
    },
    {
        value: 'spy',
        alias: [
            'secret-agent', 'spy-character'
        ]
    },
    {
        value: 'soldier',
        alias: [
            'military', 'soldier-character'
        ]
    },
    {
        value: 'villain',
        alias: [
            'antagonist', 'villain-character'
        ]
    },
    {
        value: 'hero',
        alias: [
            'protagonist', 'hero-character'
        ]
    },
    {
        value: 'superhero',
        alias: [
            'super-hero', 'super-heroine', 'superhero-character'
        ]
    },
    {
        value: 'mage',
        alias: [
            'magician', 'mage-character', 'magical'
        ]
    },
    {
        value: 'animal',
        alias: [
            'pet', 'pet-character'
        ]
    },
    {
        value: 'cute',
        alias: [
            'adorable', 'cute-character'
        ]
    },
    {
        value: 'nonbinary',
        alias: [
            'genderqueer', 'genderfluid'
        ]
    },
    {
        value: 'multiple-characters',
        alias: [
            'group', 'multiple'
        ]
    },
    {
        value: 'rpg',
        alias: [
            'roleplaying', 'role-playing'
        ]
    },
    {
        value: 'non-human',
        alias: [
            'inhuman', 'nonhuman', 'non-human-character', 'not-human'
        ]
    }
]

export const searchTagList = (query:string) => {
    const splited = query.split(',').map(v => v.trim())
    if(splited.length > 10){
        return []
    }
    const realQuery = splited.at(-1).trim().toLowerCase()

    let result = []

    for(const tag of TagList){
        if(tag.value.startsWith(realQuery)){
            result.push(tag.value)
            continue
        }
        for(const alias of tag.alias){
            if(alias.startsWith(realQuery)){
                result.push(tag.value)
                break
            }
        }
    }

    return result.filter(v => splited.indexOf(v) === -1)
}

export const isKnownUri = (uri:string) => {
    return uri.startsWith('http://')
            || uri.startsWith('https://')
            || uri.startsWith('ccdefault:')
            || uri.startsWith('embeded://')
}

export function parseKeyValue(template:string){
    try {
        if(!template){
            return []
        }
    
        const keyValue:[string, string][] = []
    
        for(const line of template.split('\n')){
            const [key, value] = line.split('=')
            if(key && value){
                keyValue.push([key, value])
            }
        }
    
        return keyValue   
    } catch (error) {
        return []
    }
}

export type sidebarToggleGroup = {
    key?:string,
    value?:string,
    type:'group',
    children:sidebarToggle[]
}

export type sidebarToggleGroupEnd = {
    key?:string,
    value?:string,
    type:'groupEnd',
}

export type sidebarToggle =
    | sidebarToggleGroup
    | sidebarToggleGroupEnd
    | {
        key?:string,
        value?:string,
        type:'divider',
    } 
    | {
        key:string,
        value:string,
        type:'select',
        options:string[]
    }
    | {
        key:string,
        value:string,
        type:'text'|undefined,
        options?:string[]
    }

export function parseToggleSyntax(template:string){
    try {
        if(!template){
            return []
        }
    
        const keyValue:sidebarToggle[] = []
    
        const splited = template.split('\n')

        for(const line of splited){
            const [key, value, type, option] = line.split('=')
            if(type === 'group' || type === 'groupEnd' || type === 'divider'){
                keyValue.push({
                    key,
                    value,
                    type,
                    children: []
                })
            } else if((key && value)){
                keyValue.push({
                    key,
                    value,
                    type: type === 'select' || type === 'text' ? type : undefined,
                    options: option?.split(',') ?? []
                })
            }
        }

        return keyValue   
    } catch (error) {
        console.error(error)
        return []
    }
}

export const sortableOptions = {
	delay: 300, // time in milliseconds to define when the sorting should start
	delayOnTouchOnly: true,
    filter: '.no-sort',
    onMove: (event) => {
        return event.related.className.indexOf('no-sort') === -1
    }
} as const


export function pickHashRand(cid:number,word:string) {
    let hashAddress = 5515
    const rand = (word:string) => {
        for (let counter = 0; counter<word.length; counter++){
            hashAddress = ((hashAddress << 5) + hashAddress) + word.charCodeAt(counter)
        }
        return hashAddress
    }
    const randF = sfc32(rand(word), rand(word), rand(word), rand(word))
    const v = cid % 1000
    for (let i = 0; i < v; i++){
        randF()
    }
    return randF()
}

export async function replaceAsync(string:string, regexp:RegExp, replacerFunction:Function) {
    const replacements = await Promise.all(
        Array.from(string.matchAll(regexp),
            match => replacerFunction(...match as any)))
    let i = 0;
    return string.replace(regexp, () => replacements[i++])
}

export function simplifySchema(schema:any, args:{
    upperType?:boolean,
} = {}){
    if(!schema || typeof schema !== 'object'){
        console.error('Schema is not an object', schema)
        return schema
    }


    if(Array.isArray(schema.type)){
        if(schema.type.includes('null')){
            schema.nullable = true
        }
        schema.type = (schema.type as string[]).filter(v => v !== 'null')[0]
    }
    
    console.log('schema',schema)
    const result:any = {
    }

    if(schema.type){
        result.type = (schema.type as string)?.toLowerCase()
    }
    if(schema.type === 'object'){
        result.properties = {}
        for(const key in schema.properties){
            result.properties[key] = simplifySchema(schema.properties[key], args)
        }
        if(schema.required && schema.required.length > 0){
            result.required = schema.required
        }
    }
    if(schema.type === 'array'){
        result.items = simplifySchema(schema.items, args)
    }

    if(schema.type === 'string' && schema.enum && schema.enum.length > 0){
        result.enum = schema.enum
    }

    if(schema.type === 'string' && schema.format){
        result.format = schema.format
    }

    if(schema.nullable){
        result.nullable = true
    }

    if(schema.maxLength !== undefined && schema.maxLength !== null){
        result.maxLength = schema.maxLength
    }

    if(schema.minLength !== undefined && schema.minLength !== null){
        result.minLength = schema.minLength
    }

    if(schema.minProperties !== undefined && schema.minProperties !== null){
        result.minProperties = schema.minProperties
    }

    if(schema.maxProperties !== undefined && schema.maxProperties !== null){
        result.maxProperties = schema.maxProperties
    }

    if(schema.description){
        result.description = schema.description
    }

    if(schema.anyOf && schema.anyOf.length > 0){
        console.log('anyOf', schema.anyOf)
        result.anyOf = schema.anyOf.map((v:any) => simplifySchema(v, args))
    }

    return result

}

export const prebuiltAssetCommand = `
<Image Tag Instruction>Insert HTML image tags between paragraphs based on context.
Set src as keywords from the list below that matches current character, outfit, situation sentiment and etc.
print as many different images as possible. Use only available keywords.
if there are no matching keywords, try to put clostest matching image src.
try to put at least 1 image per output.
<keywords>{{join::{{chardisplayasset}}::,}}</keywords>
Example: <img src="{{ele::{{chardisplayasset}}::0}}">
<Image Tag Instruction>
`

export const jsonOutputTrimmer = (data:string) => {
    
    data = data.replace(/<Thoughts>(.+?)<\/Thoughts>/gms, '').trim()
    if(data.startsWith('```json') && data.endsWith('```')){
        data = data.slice(7, -3).trim()
    }
    return data.trim()
}

export function asBuffer(arr: Uint8Array<ArrayBufferLike>): Uint8Array<ArrayBuffer>;
export function asBuffer(arr: ArrayBufferLike): ArrayBuffer;

export function asBuffer(arr: Uint8Array<ArrayBufferLike> | ArrayBufferLike): Uint8Array<ArrayBuffer> | ArrayBuffer {
    if (arr instanceof Uint8Array) {
        return arr as unknown as Uint8Array<ArrayBuffer>;
    }
    else {
        return arr as unknown as ArrayBuffer
    }
}
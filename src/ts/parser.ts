import DOMPurify from 'isomorphic-dompurify';
import showdown from 'showdown';
import { Marked } from 'marked';

import { DataBase, setDatabase, type Database, type Message, type character, type customscript, type groupChat } from './storage/database';
import { getFileSrc } from './storage/globalApi';
import { processScriptFull } from './process/scripts';
import { get } from 'svelte/store';
import css from '@adobe/css-tools'
import { selectedCharID } from './stores';
import { calcString } from './process/infunctions';
import { findCharacterbyId, sfc32, uuidtoNumber } from './util';
import { getInlayImage } from './process/files/image';
import { autoMarkNew } from './plugins/automark';
import { getModuleLorebooks } from './process/modules';

const mconverted = new Marked({
    gfm: true,
    breaks: true,
    silent: true,
    tokenizer: {

    }
})

mconverted.use({
    tokenizer: {
        del(src) {
            const cap = /^~~+(?=\S)([\s\S]*?\S)~~+/.exec(src);
            if (cap) {
                return {
                    type: 'del',
                    raw: cap[0],
                    text: cap[2],
                    tokens: []
                };
            }
            return false;
        }
    }
});



DOMPurify.addHook("uponSanitizeElement", (node: HTMLElement, data) => {
    if (data.tagName === "iframe") {
       const src = node.getAttribute("src") || "";
       if (!src.startsWith("https://www.youtube.com/embed/")) {
          return node.parentNode.removeChild(node);
       }
    }
});

DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    switch(data.attrName){
        case 'style':{
            data.attrValue = data.attrValue.replace(/(absolute)|(z-index)|(fixed)/g, '')
            break
        }
        case 'class':{
            if(data.attrValue){
                data.attrValue = data.attrValue.split(' ').map((v) => {
                    return "x-risu-" + v
                }).join(' ')
            }
            break
        }
        case 'href':{
            if(data.attrValue.startsWith('http://') || data.attrValue.startsWith('https://')){
                node.setAttribute('target', '_blank')
                break
            }
            data.attrValue = ''
            break
        }
    }
})


const assetRegex = /{{(raw|img|video|audio|bg|emotion|asset|video-img)::(.+?)}}/g

async function parseAdditionalAssets(data:string, char:simpleCharacterArgument|character, mode:'normal'|'back', mode2:'unset'|'pre'|'post' = 'unset'){
    const db = get(DataBase)
    const assetWidthString = (db.assetWidth && db.assetWidth !== -1 || db.assetWidth === 0) ? `max-width:${db.assetWidth}rem;` : ''

    if(char.additionalAssets || char.emotionImages){

        let assetPaths:{[key:string]:{
            path:string
            ext?:string
        }} = {}
        let emoPaths:{[key:string]:{
            path:string
        }} = {}

        if(char.additionalAssets){
            for(const asset of char.additionalAssets){
                const assetPath = await getFileSrc(asset[1])
                assetPaths[asset[0].toLocaleLowerCase()] = {
                    path: assetPath,
                    ext: asset[2]
                }
            }
        }
        if(char.emotionImages){
            for(const emo of char.emotionImages){
                const emoPath = await getFileSrc(emo[1])
                emoPaths[emo[0].toLocaleLowerCase()] = {
                    path: emoPath,
                }
            }
        }
        const videoExtention = ['mp4', 'webm', 'avi', 'm4p', 'm4v']
        data = data.replaceAll(assetRegex, (full:string, type:string, name:string) => {
            name = name.toLocaleLowerCase()
            if(type === 'emotion'){
                const path = emoPaths[name]?.path
                if(!path){
                    return ''
                }
                return `<img src="${path}" alt="${path}" style="${assetWidthString} "/>`
            }
            const path = assetPaths[name]
            if(!path){
                return ''
            }
            switch(type){
                case 'raw':
                    return path.path
                case 'img':
                    return `<img src="${path.path}" alt="${path.path}" style="${assetWidthString} "/>`
                case 'video':
                    return `<video controls autoplay loop><source src="${path.path}" type="video/mp4"></video>`
                case 'video-img':
                    return `<video autoplay muted loop><source src="${path.path}" type="video/mp4"></video>`
                case 'audio':
                    return `<audio controls autoplay loop><source src="${path.path}" type="audio/mpeg"></audio>`
                case 'bg':
                    if(mode === 'back'){
                        return `<div style="width:100%;height:100%;background: linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)),url(${path.path}); background-size: cover;"></div>`
                    }
                    break
                case 'asset':{
                    if(path.ext && videoExtention.includes(path.ext)){
                        return `<video autoplay muted loop><source src="${path.path}" type="video/mp4"></video>`
                    }
                    return `<img src="${path.path}" alt="${path.path}" style="${assetWidthString} "/>`
                }
            }
            return ''
        })
    }
    return data
}

async function parseInlayImages(data:string){
    const inlayMatch = data.match(/{{inlay::(.+?)}}/g)
    if(inlayMatch){
        for(const inlay of inlayMatch){
            const id = inlay.substring(9, inlay.length - 2)
            const img = await getInlayImage(id)
            if(img){
                data = data.replace(inlay, `<img src="${img.data}"/>`)
            }
        }
    }
    return data
}

export interface simpleCharacterArgument{
    type: 'simple'
    additionalAssets?: [string, string, string][]
    customscript: customscript[]
    chaId: string,
    virtualscript?: string
    emotionImages?: [string, string][]
}


export async function ParseMarkdown(data:string, charArg:(character|simpleCharacterArgument | groupChat | string) = null, mode:'normal'|'back' = 'normal', chatID=-1) {
    let firstParsed = ''
    const orgDat = data
    const db = get(DataBase)
    let char = (typeof(charArg) === 'string') ? (findCharacterbyId(charArg)) : (charArg)
    if(char && char.type !== 'group'){
        data = await parseAdditionalAssets(data, char, mode, 'pre')
        firstParsed = data
    }
    if(char){
        data = (await processScriptFull(char, data, 'editdisplay', chatID)).data
    }
    if(firstParsed !== data && char && char.type !== 'group'){
        data = await parseAdditionalAssets(data, char, mode, 'post')
    }
    data = await parseInlayImages(data)
    if(db.automark){
        return (DOMPurify.sanitize(autoMarkNew(data), {
            ADD_TAGS: ["iframe", "style", "risu-style", "x-em"],
            ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "risu-btn"],
        }))
    }
    else{
        data = encodeStyle(data)
        data = mconverted.parse(data)
        return decodeStyle(DOMPurify.sanitize(data, {
            ADD_TAGS: ["iframe", "style", "risu-style", "x-em"],
            ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "risu-btn"],
        }))
    }
}

export function parseMarkdownSafe(data:string) {
    return DOMPurify.sanitize(mconverted.parse(data), {
        FORBID_TAGS: ["a", "style"],
        FORBID_ATTR: ["style", "href", "class"]
    })
}


const styleRegex = /\<style\>(.+?)\<\/style\>/gms
function encodeStyle(txt:string){
    return txt.replaceAll(styleRegex, (f, c1) => {
        return "<risu-style>" + Buffer.from(c1).toString('hex') + "</risu-style>"
    })
}
const styleDecodeRegex = /\<risu-style\>(.+?)\<\/risu-style\>/gms

function decodeStyle(text:string){

    return text.replaceAll(styleDecodeRegex, (full, txt:string) => {
        try {
            const ast = css.parse(Buffer.from(txt, 'hex').toString('utf-8'))
            const rules = ast?.stylesheet?.rules
            if(rules){
                for(const rule of rules){

                    if(rule.type === 'rule'){
                        if(rule.selectors){
                            for(let i=0;i<rule.selectors.length;i++){
                                let slt:string = rule.selectors[i]
                                if(slt){
                                    let selectors = (slt.split(' ') ?? []).map((v) => {
                                        if(v.startsWith('.')){
                                            return ".x-risu-" + v.substring(1)
                                        }
                                        return v
                                    }).join(' ')
        
                                    rule.selectors[i] = ".chattext " + selectors
                                }
                            }
                        }
                    }
                }
            }
            return `<style>${css.stringify(ast)}</style>`

        } catch (error) {
            return `CSS ERROR: ${error}`;
        }
    })
}

export async function hasher(data:Uint8Array){
    return Buffer.from(await crypto.subtle.digest("SHA-256", data)).toString('hex');
}

export async function convertImage(data:Uint8Array) {
    if(!get(DataBase).imageCompression){
        return data
    }
    const type = checkImageType(data)
    if(type !== 'Unknown' && type !== 'WEBP' && type !== 'AVIF'){
        return await resizeAndConvert(data)
    }
    return data
}

async function resizeAndConvert(imageData: Uint8Array): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const base64Image = 'data:image/png;base64,' + Buffer.from(imageData).toString('base64');
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(base64Image);

            // Create a canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) {
                throw new Error('Unable to get 2D context');
            }

            // Compute the new dimensions while maintaining aspect ratio
            let { width, height } = image;
            if (width > 3000 || height > 3000) {
                const aspectRatio = width / height;
                if (width > height) {
                    width = 3000;
                    height = Math.round(width / aspectRatio);
                } else {
                    height = 3000;
                    width = Math.round(height * aspectRatio);
                }
            }

            // Resize and draw the image to the canvas
            canvas.width = width;
            canvas.height = height;
            context.drawImage(image, 0, 0, width, height);

            // Try to convert to WebP
            let base64 = canvas.toDataURL('image/webp', 75);

            // If WebP is not supported, convert to JPEG
            if (base64.indexOf('data:image/webp') != 0) {
                base64 = canvas.toDataURL('image/jpeg', 75);
            }

            // Convert it to Uint8Array
            const array = Buffer.from(base64.split(',')[1], 'base64');
            resolve(array);
        };
        image.src = base64Image;
    });
}

type ImageType = 'JPEG' | 'PNG' | 'GIF' | 'BMP' | 'AVIF' | 'WEBP' | 'Unknown';

export function checkImageType(arr:Uint8Array):ImageType {
    const isJPEG = arr[0] === 0xFF && arr[1] === 0xD8 && arr[arr.length-2] === 0xFF && arr[arr.length-1] === 0xD9;
    const isPNG = arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47 && arr[4] === 0x0D && arr[5] === 0x0A && arr[6] === 0x1A && arr[7] === 0x0A;
    const isGIF = arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x38 && (arr[4] === 0x37 || arr[4] === 0x39) && arr[5] === 0x61;
    const isBMP = arr[0] === 0x42 && arr[1] === 0x4D;
    const isAVIF = arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70 && arr[8] === 0x61 && arr[9] === 0x76 && arr[10] === 0x69 && arr[11] === 0x66;
    const isWEBP = arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 && arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50;

    if (isJPEG) return "JPEG";
    if (isPNG) return "PNG";
    if (isGIF) return "GIF";
    if (isBMP) return "BMP";
    if (isAVIF) return "AVIF";
    if (isWEBP) return "WEBP";
    return "Unknown";
}

function wppParser(data:string){
    const lines = data.split('\n');
    let characterDetails:{[key:string]:string[]} = {};

    lines.forEach(line => {

        // Check for "{" and "}" indicator of object start and end
        if(line.includes('{')) return;
        if(line.includes('}')) return;

        // Extract key and value within brackets
        let keyBracketStartIndex = line.indexOf('(');
        let keyBracketEndIndex = line.indexOf(')');
    
       if(keyBracketStartIndex === -1 || keyBracketEndIndex === -1) 
            throw new Error(`Invalid syntax ${line}`);
        
       let key = line.substring(0, keyBracketStartIndex).trim();

         // Validate Key    
         if(!key) throw new Error(`Missing Key in ${line}`);

      const valueArray=line.substring(keyBracketStartIndex + 1, keyBracketEndIndex)
          .split(',')
          .map(str => str.trim());
      
      // Validate Values
      for(let i=0;i<valueArray.length ;i++){
           if(!valueArray[i])
               throw new Error(`Empty Value in ${line}`);
              
     }
      characterDetails[key] = valueArray;
   });

   return characterDetails;
}


const rgx = /(?:{{|<)(.+?)(?:}}|>)/gm
type matcherArg = {
    chatID:number,
    db:Database,
    chara:character|string,
    rmVar:boolean,
    var?:{[key:string]:string}
    tokenizeAccurate?:boolean
    consistantChar?:boolean
    displaying?:boolean
    role?:string
    runVar?:boolean
}
const matcher = (p1:string,matcherArg:matcherArg) => {
    try {
        if(p1.length > 100000){
            return ''
        }
        const lowerCased = p1.toLocaleLowerCase()
        const chatID = matcherArg.chatID
        const db = matcherArg.db
        const chara = matcherArg.chara
        switch(lowerCased){
            case 'previous_char_chat':
            case 'lastcharmessage':{
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
                return ''
            }
            case 'previous_user_chat':
            case 'lastusermessage':{
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
                return ''
            }
            case 'char':
            case 'bot':{
                if(matcherArg.consistantChar){
                    return 'botname'
                }
                let selectedChar = get(selectedCharID)
                let currentChar = db.characters[selectedChar]
                if(currentChar && currentChar.type !== 'group'){
                    return currentChar.name
                }
                if(chara){
                    if(typeof(chara) === 'string'){
                        return chara
                    }
                    else{
                        return chara.name
                    }
                }
                return currentChar.name
            }
            case 'user':{
                if(matcherArg.consistantChar){
                    return 'username'
                }
                return db.username
            }
            case 'personality':
            case 'char_persona':{
                const argChara = chara
                const achara = (argChara && typeof(argChara) !== 'string') ? argChara : (db.characters[get(selectedCharID)])
                if(achara.type === 'group'){
                    return ""
                }
                return achara.personality
            }
            case 'description':
            case 'char_desc':{
                const argChara = chara
                const achara = (argChara && typeof(argChara) !== 'string') ? argChara : (db.characters[get(selectedCharID)])
                if(achara.type === 'group'){
                    return ""
                }
                return achara.desc
            }
            case 'scenario':{
                const argChara = chara
                const achara = (argChara && typeof(argChara) !== 'string') ? argChara : (db.characters[get(selectedCharID)])
                if(achara.type === 'group'){
                    return ""
                }
                return achara.scenario
            }
            case 'example_dialogue':
            case 'example_message':{
                const argChara = chara
                const achara = (argChara && typeof(argChara) !== 'string') ? argChara : (db.characters[get(selectedCharID)])
                if(achara.type === 'group'){
                    return ""
                }
                return achara.exampleMessage
            }
            case 'persona':
            case 'user_persona':{
                return db.personaPrompt
            }
            case 'main_prompt':
            case 'system_prompt':{
                return db.mainPrompt
            }
            case 'lorebook':
            case 'world_info':{
                const argChara = chara
                const achara = (argChara && typeof(argChara) !== 'string') ? argChara : (db.characters[get(selectedCharID)])
                const selchar = db.characters[get(selectedCharID)]
                const chat = selchar.chats[selchar.chatPage]
                const characterLore = (achara.type === 'group') ? [] : (achara.globalLore ?? [])
                const chatLore = chat.localLore ?? []
                const fullLore = characterLore.concat(chatLore.concat(getModuleLorebooks()))
                return fullLore.map((f) => {
                    return JSON.stringify(f)
                }).join("§\n")
            }
            case 'history':
            case 'messages':{
                const selchar = db.characters[get(selectedCharID)]
                const chat = selchar.chats[selchar.chatPage]
                return chat.message.map((f) => {
                    return JSON.stringify(f)
                }).join("§\n")
            }
            case 'ujb':
            case 'global_note':
            case 'system_note':{
                return db.globalNote
            }
            case 'chat_index':{
                return chatID.toString() 
            }
            case 'blank':
            case 'none':{
                return ''
            }
            case 'message_time':{
                if(matcherArg.tokenizeAccurate){
                    return `00:00:00`
                }
                if(chatID === -1){
                    return "[Cannot get time]"
                }
    
                const selchar = db.characters[get(selectedCharID)]
                const chat = selchar.chats[selchar.chatPage]
                const message = chat.message[chatID]
                if(!message.time){
                    return "[Cannot get time, message was sent in older version]"
                }
                const date = new Date(message.time)
                //output time in format like 10:30 AM
                return date.toLocaleTimeString()
            }
            case 'message_date':{
                if(matcherArg.tokenizeAccurate){
                    return `00:00:00`
                }
                if(chatID === -1){
                    return "[Cannot get time]"
                }
                const selchar = db.characters[get(selectedCharID)]
                const chat = selchar.chats[selchar.chatPage]
                const message = chat.message[chatID]
                if(!message.time){
                    return "[Cannot get time, message was sent in older version]"
                }
                const date = new Date(message.time)
                //output date in format like Aug 23, 2021
                return date.toLocaleDateString()
            }
            case 'time':{
                const now = new Date()
                return `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
            }
            case 'date':{
                const now = new Date()
                return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
            }
            case 'isotime':{
                const now = new Date()
                return `${now.getUTCHours()}:${now.getUTCMinutes()}:${now.getUTCSeconds()}`
            }
            case 'isodate':{
                const now = new Date()
                return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`
            }
            case 'idle_duration':{
                if(matcherArg.tokenizeAccurate){
                    return `00:00:00`
                }
                if(chatID === -1){
                    return "[Cannot get time]"
                }
                const selchar = db.characters[get(selectedCharID)]
                const chat = selchar.chats[selchar.chatPage]
                
                //get latest user message
                let pointer = chatID
                let pointerMode: 'findLast'|'findSecondLast' = 'findLast'
                let message:Message
                let previous_message:Message
                while(pointer >= 0){
                    if(chat.message[pointer].role === 'user'){
                        if(pointerMode === 'findLast'){
                            message = chat.message[pointer]
                            pointerMode = 'findSecondLast'
                        }
                        else{
                            previous_message = chat.message[pointer]
                            break
                        }
                    }
                    pointer--
                }
    
                if(!message){
                    return '[No user message found]'
                }
    
                if(!previous_message){
                    return '[No previous user message found]'
                }
                if(!message.time){
                    return "[Cannot get time, message was sent in older version]"
                }
                if(!previous_message.time){
                    return "[Cannot get time, previous message was sent in older version]"
                }
    
                let duration = message.time - previous_message.time
                //output time in format like 10:30:00
                let seconds = Math.floor(duration / 1000)
                let minutes = Math.floor(seconds / 60)
                let hours = Math.floor(minutes / 60)
                seconds = seconds % 60
                minutes = minutes % 60
                //output, like 1:30:00
                return hours.toString() + ':' + minutes.toString().padStart(2,'0') + ':' + seconds.toString().padStart(2,'0')
            }
            case 'br':
            case 'newline':{
                return '\n'
            }
            case 'model':{
                return db.aiModel
            }
            case 'axmodel':{
                return db.subModel
            }
            case 'role': {
                return matcherArg.role ?? 'role'
            }
            case 'jbtoggled':{
                return db.jailbreakToggle ? '1' : '0'
            }
            case 'random':{
                return Math.random().toString()
            }
            case 'maxcontext':{
                return db.maxContext.toString()
            }
            case 'lastmessage':{
                const selchar = db.characters[get(selectedCharID)]
                if(!selchar){
                    return ''
                }
                const chat = selchar.chats[selchar.chatPage]
                return chat.message[chat.message.length - 1].data
            }
            case 'lastmessageid':
            case 'lastmessageindex':{
                const selchar = db.characters[get(selectedCharID)]
                if(!selchar){
                    return ''
                }
                const chat = selchar.chats[selchar.chatPage]
                return chat.message.length - 1
            }
        }
        const arra = p1.split("::")
        if(arra.length > 1){
            const v = arra[1]
            switch(arra[0]){
                case 'getvar':{
                    return getChatVar(v)
                }
                case 'calc':{
                    return calcString(v).toString()
                }
                case 'addvar':{
                    if(matcherArg.rmVar){
                        return ''
                    }
                    if(matcherArg.runVar){
                        setChatVar(v, (Number(getChatVar(v)) + Number(arra[2])).toString())
                        return ''
                    }
                    return null
                }
                case 'setvar':{
                    if(matcherArg.rmVar){
                        return ''
                    }
                    if(matcherArg.runVar){
                        setChatVar(v, arra[2])
                        return ''
                    }
                    return null
                }
                case 'button':{
                    return `<button style="padding" x-risu-prompt="${arra[2]}">${arra[1]}</button>`
                }
                case 'risu':{
                    return `<img src="/logo2.png" style="height:${v || 45}px;width:${v || 45}px" />`
                }
                case 'equal':{
                    return (arra[1] === arra[2]) ? '1' : '0'
                }
                case 'not_equal':
                case 'notequal':{
                    return (arra[1] !== arra[2]) ? '1' : '0'
                }
                case 'greater':{
                    return (Number(arra[1]) > Number(arra[2])) ? '1' : '0'
                }
                case 'less':{
                    return (Number(arra[1]) < Number(arra[2])) ? '1' : '0'
                }
                case 'greater_equal':
                case 'greaterequal':{
                    return (Number(arra[1]) >= Number(arra[2])) ? '1' : '0'
                }
                case 'less_equal':
                case 'lessequal':{
                    return (Number(arra[1]) <= Number(arra[2])) ? '1' : '0'
                }
                case 'and':{
                    return (Number(arra[1]) && Number(arra[2])) ? '1' : '0'
                }
                case 'or':{
                    return (Number(arra[1]) || Number(arra[2])) ? '1' : '0'
                }
                case 'not':{
                    return (Number(arra[1]) === 0) ? '1' : '0'
                }
                case 'file':{
                    if(matcherArg.displaying){
                        return `<br><div class="risu-file">${arra[1]}</div><br>`
                    }
                    return Buffer.from(arra[2], 'base64').toString('utf-8') 
                }
                case 'startswith':{
                    return arra[1].startsWith(arra[2]) ? '1' : '0'
                }
                case 'endswith':{
                    return arra[1].endsWith(arra[2]) ? '1' : '0'
                }
                case 'contains':{
                    return arra[1].includes(arra[2]) ? '1' : '0'
                }
                case 'replace':{
                    return arra[1].replaceAll(arra[2], arra[3])
                }
                case 'split':{
                    return arra[1].split(arra[2]).join('§')
                }
                case 'join':{
                    return arra[1].split('§').join(arra[2])
                }
                case 'spread':{
                    return arra[1].split('§').join('::')
                }
                case 'trim':{
                    return arra[1].trim()
                }
                case 'length':{
                    return arra[1].length.toString()
                }
                case 'arraylength':
                case 'array_length':{
                    return arra[1].split('§').length.toString()
                }
                case 'lower':{
                    return arra[1].toLocaleLowerCase()
                }
                case 'upper':{
                    return arra[1].toLocaleUpperCase()
                }
                case 'capitalize':{
                    return arra[1].charAt(0).toUpperCase() + arra[1].slice(1)
                }
                case 'round':{
                    return Math.round(Number(arra[1])).toString()
                }
                case 'floor':{
                    return Math.floor(Number(arra[1])).toString()
                }
                case 'ceil':{
                    return Math.ceil(Number(arra[1])).toString()
                }
                case 'abs':{
                    return Math.abs(Number(arra[1])).toString()
                }
                case 'previous_chat_log':{
                    const selchar = db.characters[get(selectedCharID)]
                    const chat = selchar?.chats?.[selchar.chatPage]
                    return chat?.message[chatID - 1]?.data ?? 'Out of range'
    
                }
                case 'tonumber':{
                    return arra[1].split('').filter((v) => {
                        return !isNaN(Number(v)) || v === '.'
                    }).join('')
                }
                case 'pow':{
                    return Math.pow(Number(arra[1]), Number(arra[2])).toString()
                }
                case 'arrayelement':
                case 'array_element':{
                    return arra[1].split('§')[Number(arra[2])]
                }
                case 'arrayshift':
                case 'array_shift':{
                    const arr = arra[1].split('§')
                    arr.shift()
                    return arr.join('§')
                }
                case 'arraypop':
                case 'array_pop':{
                    const arr = arra[1].split('§')
                    arr.pop()
                    return arr.join('§')
                }
                case 'arraypush':
                case 'array_push':{
                    return arra[1] + '§' + arra[2]
                }
                case 'arraysplice':
                case 'array_splice':{
                    const arr = arra[1].split('§')
                    arr.splice(Number(arra[2]), Number(arra[3]), arra[4])
                    return arr.join('§')
                }
                case 'makearray':
                case 'array':
                case 'a':
                case 'make_array':{
                    return arra.slice(1).join('§')
                }
            }
        }
        if(p1.startsWith('random')){
            if(p1.startsWith('random::')){
                const randomIndex = Math.floor(Math.random() * (arra.length - 1)) + 1
                if(matcherArg.tokenizeAccurate){
                    return arra[0]
                }
                return arra[randomIndex]
            }
            else{
                const arr = p1.split(/\:|\,/g)
                const randomIndex = Math.floor(Math.random() * (arr.length - 1)) + 1
                if(matcherArg.tokenizeAccurate){
                    return arra[0]
                }
                return arr[randomIndex]
            }
        }
        if(p1.startsWith('pick')){
            const selchar = db.characters[get(selectedCharID)]
            const rand = sfc32(uuidtoNumber(selchar.chaId), chatID, uuidtoNumber(selchar.chaId), chatID)
            if(p1.startsWith('pick::')){
                const randomIndex = Math.floor(rand() * (arra.length - 1)) + 1
                if(matcherArg.tokenizeAccurate){
                    return arra[0]
                }
                return arra[randomIndex]
            }
            else{
                const arr = p1.split(/\:|\,/g)
                const randomIndex = Math.floor(rand() * (arr.length - 1)) + 1
                if(matcherArg.tokenizeAccurate){
                    return arra[0]
                }
                return arr[randomIndex]
            }
        }
        if(p1.startsWith('roll')){
            const arr = p1.split(/\:|\ /g)
            let ina = arr.at(-1)
    
            if(ina.startsWith('d')){
                ina = ina.substring(1)
            }
    
            const maxRoll = parseInt(ina)
            if(isNaN(maxRoll)){
                return 'NaN'
            }
            return (Math.floor(Math.random() * maxRoll) + 1).toString()
        }
        return null        
    } catch (error) {
        return null   
    }
}

const smMatcher = (p1:string,matcherArg:matcherArg) => {
    if(!p1){
        return null
    }
    const lowerCased = p1.toLocaleLowerCase()
    const db = matcherArg.db
    const chara = matcherArg.chara
    switch(lowerCased){
        case 'char':
        case 'bot':{
            if(matcherArg.consistantChar){
                return 'botname'
            }
            let selectedChar = get(selectedCharID)
            let currentChar = db.characters[selectedChar]
            if(currentChar && currentChar.type !== 'group'){
                return currentChar.name
            }
            if(chara){
                if(typeof(chara) === 'string'){
                    return chara
                }
                else{
                    return chara.name
                }
            }
            return currentChar.name
        }
        case 'user':{
            if(matcherArg.consistantChar){
                return 'username'
            }
            return db.username
        }
    }
}

const legacyBlockMatcher = (p1:string,matcherArg:matcherArg) => {
    const bn = p1.indexOf('\n')

    if(bn === -1){
        return null
    }

    const logic = p1.substring(0, bn)
    const content = p1.substring(bn + 1)
    const statement = logic.split(" ", 2)

    switch(statement[0]){
        case 'if':{
            if(["","0","-1"].includes(statement[1])){
                return ''
            }
        
            return content.trim()
        }
    }

    return null
}

type blockMatch = 'ignore'|'parse'|'nothing'|'parse-pure'


function blockStartMatcher(p1:string,matcherArg:matcherArg):blockMatch{
    if(p1.startsWith('#if') || p1.startsWith('#if_pure ')){
        const statement = p1.split(' ', 2)
        const state = statement[1]
        if(state === 'true' || state === '1'){
            return p1.startsWith('#if_pure') ? 'parse-pure' : 'parse'
        }
        return 'ignore'
    }
    return 'nothing'
}

function blockEndMatcher(p1:string,type:blockMatch,matcherArg:matcherArg):string{
    switch(type){
        case 'ignore':{
            return ''
        }
        case 'parse':{
            const trimedLines = p1.split('\n').map((v) => {
                return v.trim()
            }).join('\n').trim()
            return trimedLines
        }
        case 'parse-pure':{
            return p1
        }
        default:{
            return ''
        }
    }
}

export function risuChatParser(da:string, arg:{
    chatID?:number
    db?:Database
    chara?:string|character|groupChat
    rmVar?:boolean,
    var?:{[key:string]:string}
    tokenizeAccurate?:boolean
    consistantChar?:boolean
    visualize?:boolean,
    role?:string
    runVar?:boolean
} = {}):string{
    const chatID = arg.chatID ?? -1
    const db = arg.db ?? get(DataBase)
    const aChara = arg.chara
    const visualize = arg.visualize ?? false
    let chara:character|string = null

    if(aChara){
        if(typeof(aChara) !== 'string' && aChara.type === 'group'){
            const gc = findCharacterbyId(aChara.chats[aChara.chatPage].message.at(-1).saying ?? '')
            if(gc.name !== 'Unknown Character'){
                chara = gc
            }
        }
        else{
            chara = aChara
        }
    }
    if(arg.tokenizeAccurate){
        const db = arg.db ?? get(DataBase)
        const selchar = chara ?? db.characters[get(selectedCharID)]
        if(!selchar){
            chara = 'bot'
        }
    }

    
    let pointer = 0;
    let nested:string[] = [""]
    let stackType = new Uint8Array(512)
    let pureMode = false
    let pureModeType:''|'pureSyntax'|'block' = ''
    let blockType:blockMatch = 'nothing'
    let commentMode = false
    let commentLatest:string[] = [""]
    let commentV = new Uint8Array(512)
    let thinkingMode = false
    const matcherObj = {
        chatID: chatID,
        chara: chara,
        rmVar: arg.rmVar ?? false,
        db: db,
        var: arg.var ?? null,
        tokenizeAccurate: arg.tokenizeAccurate ?? false,
        displaying: arg.visualize ?? false,
        role: arg.role,
        runVar: arg.runVar ?? false,
    }
    let pef = performance.now()
    while(pointer < da.length){
        switch(da[pointer]){
            case '{':{
                if(da[pointer + 1] !== '{' && da[pointer + 1] !== '#'){
                    nested[0] += da[pointer]
                    break
                }
                pointer++
                nested.unshift('')
                stackType[nested.length] = 1
                break
            }
            case '<':{
                nested.unshift('')
                stackType[nested.length] = 2
                break
            }
            case '#':{
                //legacy if statement, deprecated
                if(da[pointer + 1] !== '}' || nested.length === 1 || stackType[nested.length] !== 1){
                    nested[0] += da[pointer]
                    break
                }
                pointer++
                const dat = nested.shift()
                const mc = legacyBlockMatcher(dat, matcherObj)
                nested[0] += mc ?? `{#${dat}#}`
                break
            }
            case '}':{
                if(da[pointer + 1] !== '}' || nested.length === 1 || stackType[nested.length] !== 1){
                    nested[0] += da[pointer]
                    break
                }
                pointer++
                const dat = nested.shift()
                if(dat.startsWith('#')){
                    if(pureMode){
                        nested[0] += `{{${dat}}}`
                    }
                    const matchResult = blockStartMatcher(dat, matcherObj)
                    if(matchResult === 'nothing'){
                        nested[0] += `{{${dat}}}`
                        break
                    }
                    else{
                        if(matchResult !== 'parse'){
                            pureMode = true
                            pureModeType = 'block'
                        }
                        blockType = matchResult
                        nested.unshift('')
                        stackType[nested.length] = 5
                        break
                    }
                }
                if(dat.startsWith('/')){
                    if(stackType[nested.length] === 5){
                        const dat2 = nested.shift()
                        if(pureMode && pureModeType === 'block'){
                            pureMode = false
                            pureModeType = ''
                        }
                        const matchResult = blockEndMatcher(dat2.trim(), blockType, matcherObj)
                        if(matchResult === ''){
                            break
                        }
                        nested[0] += matchResult
                        blockType = 'nothing'
                        break
                    }
                }
                const mc = (pureMode) ? null :matcher(dat, matcherObj)
                nested[0] += mc ?? `{{${dat}}}`
                break
            }
            case '>':{
                if(nested.length === 1 || stackType[nested.length] !== 2){
                    break
                }
                const dat = nested.shift()
                if(pureMode && pureModeType !== 'pureSyntax' && pureModeType !== ''){
                    nested[0] += `<${dat}>`
                    break
                }
                switch(dat){
                    case 'Pure':{
                        pureMode = true
                        pureModeType = 'pureSyntax'
                        break
                    }
                    case '/Pure':{
                        if(pureModeType === 'pureSyntax'){
                            pureMode = false
                            pureModeType = ''
                        }
                        else{
                            nested[0] += `<${dat}>`
                            break
                        }
                    }
                    case 'Comment':{
                        if(arg.runVar){
                            break
                        }
                        if(!commentMode){
                            thinkingMode = false
                            commentMode = true
                            commentLatest = nested.map((f) => f)
                            if(commentLatest[0].endsWith('\n')){
                                commentLatest[0] = commentLatest[0].substring(0, commentLatest[0].length - 1)
                            }
                            commentV = new Uint8Array(stackType)
                        }
                        break
                    }
                    case '/Comment':{
                        if(commentMode){
                            nested = commentLatest
                            stackType = commentV
                            commentMode = false
                        }
                        break
                    }
                    case 'Thoughts':{
                        if(!visualize){
                            nested[0] += `<${dat}>`
                            break
                        }
                        if(!commentMode){
                            thinkingMode = true
                            commentMode = true
                            commentLatest = nested.map((f) => f)
                            if(commentLatest[0].endsWith('\n')){
                                commentLatest[0] = commentLatest[0].substring(0, commentLatest[0].length - 1)
                            }
                            commentV = new Uint8Array(stackType)
                        }
                        break
                    }
                    case '/Thoughts':{
                        if(!visualize){
                            nested[0] += `<${dat}>`
                            break
                        }
                        if(commentMode){
                            nested = commentLatest
                            stackType = commentV
                            commentMode = false
                        }
                        break
                    }
                    default:{
                        const mc = (pureMode) ? null : smMatcher(dat, matcherObj)
                        nested[0] += mc ?? `<${dat}>`
                        break
                    }
                }
                break
            }
            default:{
                nested[0] += da[pointer]
                break
            }
        }
        pointer++
    }
    if(commentMode){
        nested = commentLatest
        stackType = commentV
        if(thinkingMode){
            nested[0] += `<div>Thinking...</div>`
        }
        commentMode = false
    }
    if(nested.length === 1){
        return nested[0]
    }
    let result = ''
    while(nested.length > 1){
        let dat = (stackType[nested.length] === 1) ? '{{' : "<"
        dat += nested.shift()
        result = dat + result
    }
    return nested[0] + result
}


export function getChatVar(key:string){
    const db = get(DataBase)
    const selectedChar = get(selectedCharID)
    const char = db.characters[selectedChar]
    const chat = char.chats[char.chatPage]
    chat.scriptstate = chat.scriptstate ?? {}
    return (chat.scriptstate['$' + key])?.toString() ?? 'null'
}

export function setChatVar(key:string, value:string){
    const db = get(DataBase)
    const selectedChar = get(selectedCharID)
    const char = db.characters[selectedChar]
    const chat = char.chats[char.chatPage]
    chat.scriptstate = chat.scriptstate ?? {}
    chat.scriptstate['$' + key] = value
    char.chats[char.chatPage] = chat
    db.characters[selectedChar] = char
    setDatabase(db)
}


async function editDisplay(text){
    let rt = ""
    if(!text.includes("<obs>")){
        return text
    }

    for(let i=0;i<text.length;i++){
        const obfiEffect = "!@#$%^&*"
        if(Math.random() < 0.4){
            rt += obfiEffect[Math.floor(Math.random() * obfiEffect.length)]
        }
        rt += text[i]
    }
    return rt
}

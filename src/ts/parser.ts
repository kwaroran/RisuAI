import DOMPurify from 'isomorphic-dompurify';
import { Marked } from 'marked';

import { DataBase, setDatabase, type Database, type Message, type character, type customscript, type groupChat } from './storage/database';
import { getFileSrc } from './storage/globalApi';
import { processScriptFull } from './process/scripts';
import { get } from 'svelte/store';
import css from '@adobe/css-tools'
import { SizeStore, selectedCharID } from './stores';
import { calcString } from './process/infunctions';
import { findCharacterbyId, parseKeyValue, sfc32, uuidtoNumber } from './util';
import { getInlayImage } from './process/files/image';
import { risuFormater } from './plugins/automark';
import { getModuleLorebooks } from './process/modules';

const mconverted = new Marked({
    gfm: true,
    breaks: true,
    silent: true,
    tokenizer: {
        del(src) {
          const cap = /^~~~(?=\S)([\s\S]*?\S)~~~/.exec(src);
          if (cap) {
            return {
              type: 'del',
              raw: cap[0],
              text: cap[1],
              tokens: this.lexer.inlineTokens(cap[1])
            };
          }
        }
    }
})



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


export const assetRegex = /{{(raw|img|video|audio|bg|emotion|asset|video-img)::(.+?)}}/g

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

    data = encodeStyle(data)
    if(mode !== 'back'){
        data = risuFormater(data)
        data = mconverted.parse(data)
    }
    return decodeStyle(DOMPurify.sanitize(data, {
        ADD_TAGS: ["iframe", "style", "risu-style", "x-em"],
        ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "risu-btn", 'risu-trigger', 'risu-mark'],
    }))
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
                    return currentChar.nickname || currentChar.name
                }
                if(chara){
                    if(typeof(chara) === 'string'){
                        return chara
                    }
                    else{
                        return chara.name
                    }
                }
                return currentChar.nickname || currentChar.name
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
                    return f.role + ': ' + f.data
                }).join("§\n")
            }

            case 'user_history':
            case 'user_messages':{
                const selchar = db.characters[get(selectedCharID)]
                const chat = selchar.chats[selchar.chatPage]
                return chat.message.map((f) => {
                    if(f.role === 'user'){
                        return f.data
                    }
                    return ''
                }).filter((f) => {
                    return f !== ''
                }).join("§\n")
            }
            case 'char_history':
            case 'char_messages':{
                const selchar = db.characters[get(selectedCharID)]
                const chat = selchar.chats[selchar.chatPage]
                return chat.message.map((f) => {
                    if(f.role === 'char'){
                        return f.data
                    }
                    return ''
                }).filter((f) => {
                    return f !== ''
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
            case 'first_msg_index':{
                const selchar = db.characters[get(selectedCharID)]
                return selchar.firstMsgIndex
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
            case 'message_unixtime_array':{
                const selchar = db.characters[get(selectedCharID)]
                const chat = selchar.chats[selchar.chatPage]
                return chat.message.map((f) => {
                    return f.time ?? 0
                }).join('§')
            }
            case 'unixtime':{
                const now = new Date()
                return (now.getTime() / 1000).toFixed(0)
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
            case 'message_idle_duration':{
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
            case 'idle_duration':{
                if(matcherArg.tokenizeAccurate){
                    return `00:00:00`
                }
                const selchar = db.characters[get(selectedCharID)]
                const chat = selchar.chats[selchar.chatPage]
                const messages = chat.message
                if(messages.length === 0){
                    return `00:00:00`
                }

                const lastMessage = messages[messages.length - 1]

                if(!lastMessage.time){
                    return "[Cannot get time, message was sent in older version]"
                }

                const now = new Date()

                let duration = now.getTime() - lastMessage.time

                let seconds = Math.floor(duration / 1000)
                let minutes = Math.floor(seconds / 60)
                let hours = Math.floor(minutes / 60)

                seconds = seconds % 60
                minutes = minutes % 60
                
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
            case 'emotionlist':{
                const selchar = db.characters[get(selectedCharID)]
                if(!selchar){
                    return ''
                }
                return selchar.emotionImages?.map((f) => {
                    return f[0]
                })?.join('§') ?? ''
            }
            case 'assetlist':{
                const selchar = db.characters[get(selectedCharID)]
                if(!selchar || selchar.type === 'group'){
                    return ''
                }
                return selchar.additionalAssets?.map((f) => {
                    return f[0]
                })?.join('§') ?? ''
            }
            case 'prefill_supported':{
                return db.aiModel.startsWith('claude') ? '1' : '0'
            }
            case 'screen_width':{
                return get(SizeStore).w.toString()
            }
            case 'screen_height':{
                return get(SizeStore).h.toString()
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
                case 'setdefaultvar':{
                    if(matcherArg.rmVar){
                        return ''
                    }
                    if(matcherArg.runVar){
                        if(!getChatVar(v)){
                            setChatVar(v, arra[2])
                        }
                        return ''
                    }
                    return null
                }
                case 'getglobalvar':{
                    return getGlobalChatVar(v)
                }
                case 'button':{
                    return `<button class="button-default" risu-trigger="${arra[2]}">${arra[1]}</button>`
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
                    return arra[1] === '1' && arra[2] === '1' ? '1' : '0'
                }
                case 'or':{
                    return arra[1] === '1' || arra[2] === '1' ? '1' : '0'
                }
                case 'not':{
                    return arra[1] === '1' ? '0' : '1'
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
                case 'remaind':{
                    return (Number(arra[1]) % Number(arra[2])).toString()
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
                    return arra[1].split('§').at(Number(arra[2])) ?? 'null'
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
                case 'history':
                case 'messages':{
                    const selchar = db.characters[get(selectedCharID)]
                    const chat = selchar.chats[selchar.chatPage]
                    return chat.message.map((f) => {
                        let data = ''
                        if(arra.includes('role')){
                            data += f.role + ': '
                        }
                        data += f.data
                        return data
                    }).join("§\n")
                }
                case 'range':{
                    const arr = arra[1].split('§')
                    const start = arr.length > 1 ? Number(arr[0]) : 0
                    const end = arr.length > 1 ? Number(arr[1]) : Number(arr[0])
                    const step = arr.length > 2 ? Number(arr[2]) : 1
                    let out = ''
                    for(let i=start;i<end;i+=step){
                        out += i.toString()
                        if(i + step < end){
                            out += '§'
                        }
                    }
                    return out
                }
                case 'date':
                case 'time':
                case 'datetimeformat':
                case 'date_time_format':{
                    const secondParam = arra[2]
                    let t = 0
                    if(secondParam){
                        t = (Number(secondParam) / 1000)
                        if(isNaN(t)){
                            t = 0
                        }
                    }
                    return dateTimeFormat(arra[1],t)
                }
                case 'module_enabled':{
                    const selchar = db.characters[get(selectedCharID)]
                    let enabledChatModules:string[] = []
                    if(!selchar){
                        enabledChatModules = selchar.chats[selchar.chatPage].modules ?? []

                    }
                    const moduleId = db.modules.find((f) => {
                        return f.name === arra[1]
                    }).id
                    return (db.enabledModules.includes(moduleId) || enabledChatModules.includes(moduleId)) ? '1' : '0'
                }
                case 'filter':{
                    const array = arra[1].split('§')
                    const filterTypes = [
                        'all',
                        'nonempty',
                        'unique',
                    ]
                    let filterType = filterTypes.indexOf(arra[2])
                    if(filterType === -1){
                        filterType = 0
                    }
                    return array.filter((f, i) => {
                        switch(filterType){
                            case 0:
                                return f !== '' && i === array.indexOf(f)
                            case 1:
                                return f !== ''
                            case 2:
                                return i === array.indexOf(f)               
                        }
                    }).join('§')
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
                const arr = p1.replace(/\\,/g, '§X').split(/\:|\,/g)
                const randomIndex = Math.floor(Math.random() * (arr.length - 1)) + 1
                if(matcherArg.tokenizeAccurate){
                    return arra[0]
                }
                return arr[randomIndex]?.replace(/§X/g, ',') ?? ''
            }
        }
        if(p1.startsWith('pick')){
            const selchar = db.characters[get(selectedCharID)]
            const selChat = selchar.chats[selchar.chatPage]
            const cid = (chatID < 0) ? selChat.message.length : chatID
            if(p1.startsWith('pick::')){
                const randomIndex = Math.floor(pickHashRand(cid, selchar.chaId) * (arra.length - 1)) + 1
                if(matcherArg.tokenizeAccurate){
                    return arra[0]
                }
                return arra[randomIndex]
            }
            else{
                const arr = p1.replace(/\\,/g, '§X').split(/\:|\,/g)
                const randomIndex = Math.floor(pickHashRand(cid, selchar.chaId) * (arr.length - 1)) + 1
                if(matcherArg.tokenizeAccurate){
                    return arra[0]
                }
                return arr[randomIndex]?.replace(/§X/g, ',') ?? ''
            }
        }
        if(p1.startsWith('roll:') || p1.startsWith('rollp:')){
            const p = p1.startsWith('rollp:')
            const arr = p1.split(/\:|\ /g)
            let ina = arr.at(-1)
    
            if(ina.startsWith('d')){
                ina = ina.substring(1)
            }
    
            const maxRoll = parseInt(ina)
            if(isNaN(maxRoll)){
                return 'NaN'
            }
            if(p){
                const selchar = db.characters[get(selectedCharID)]
                const selChat = selchar.chats[selchar.chatPage]
                const cid = (chatID < 0) ? selChat.message.length : chatID
                return (Math.floor(pickHashRand(cid, selchar.chaId) * maxRoll) + 1).toString()
            }
            return (Math.floor(Math.random() * maxRoll) + 1).toString()
        }
        if(p1.startsWith('datetimeformat')){
            let main = p1.substring("datetimeformat".length + 1)
            return dateTimeFormat(main)
        }
        if(p1.startsWith('? ')){
            const substring = p1.substring(2)

            return calcString(substring).toString()
        }
        if(p1.startsWith('//')){
            return ''
        }
        if(p1.startsWith('hidden_key:')){
            return ''
        }
        if(p1.startsWith('reverse:')){
            return p1.substring(
                p1[8] === ':' ? 9 : 8
            ).split('').reverse().join('')
        }
        if(p1.startsWith('comment:')){
            if(!matcherArg.displaying){
                return ''
            }
            return `<div class="risu-comment">${p1.substring(p1[8] === ':' ? 9 : 8)}</div>`
        }
        return null        
    } catch (error) {
        return null   
    }
}

function pickHashRand(cid:number,word:string) {
    let hashAddress = cid * 23515
    const rand = (word:string) => {
        for (let counter = 0; counter<word.length; counter++){
            hashAddress = ((hashAddress << 5) + hashAddress) + word.charCodeAt(counter)
        }
        return hashAddress
    }
    const randF = sfc32(rand(word), rand(word), rand(word), rand(word))
    return randF()
}

const dateTimeFormat = (main:string, time = 0) => {
    const date = time === 0 ? (new Date()) : (new Date(time))
    if(!main){
        return ''
    }
    if(main.startsWith(':')){
        main = main.substring(1)
    }
    if(main.length > 300){
        return ''
    }
    return main
        .replace(/YYYY/g, date.getFullYear().toString())
        .replace(/YY/g, date.getFullYear().toString().substring(2))
        .replace(/MM?/g, (date.getMonth() + 1).toString().padStart(2, '0'))
        .replace(/DD?/g, date.getDate().toString().padStart(2, '0'))
        .replace(/DDDD?/g, (date.getDay() + (date.getMonth() * 30)).toString())
        .replace(/HH?/g, date.getHours().toString().padStart(2, '0'))
        .replace(/hh?/g, (date.getHours() % 12).toString().padStart(2, '0'))
        .replace(/mm?/g, date.getMinutes().toString().padStart(2, '0'))
        .replace(/ss?/g, date.getSeconds().toString().padStart(2, '0'))
        .replace(/X?/g, (Date.now() / 1000).toFixed(2))
        .replace(/x?/g, Date.now().toFixed())
        .replace(/A/g, date.getHours() >= 12 ? 'PM' : 'AM')
        .replace(/MMMM?/g, Intl.DateTimeFormat('en', { month: 'long' }).format(date))

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
                return currentChar.nickname || currentChar.name
            }
            if(chara){
                if(typeof(chara) === 'string'){
                    return chara
                }
                else{
                    return chara.name
                }
            }
            return currentChar.nickname || currentChar.name
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

type blockMatch = 'ignore'|'parse'|'nothing'|'parse-pure'|'pure'|'each'


function blockStartMatcher(p1:string,matcherArg:matcherArg):{type:blockMatch,type2?:string}{
    if(p1.startsWith('#if') || p1.startsWith('#if_pure ')){
        const statement = p1.split(' ', 2)
        const state = statement[1]
        if(state === 'true' || state === '1'){
            return {type:p1.startsWith('#if_pure') ? 'parse-pure' : 'parse'}
        }
        return {type:'ignore'}
    }
    if(p1 === '#pure'){
        return {type:'pure'}
    }
    if(p1.startsWith('#each')){
        return {type:'each',type2:p1.substring(5).trim()}
    }
    return {type:'nothing'}
}

function trimLines(p1:string){
    return p1.split('\n').map((v) => {
        return v.trimStart()
    }).join('\n').trim()
}

function blockEndMatcher(p1:string,type:{type:blockMatch,type2?:string},matcherArg:matcherArg):string{
    switch(type.type){
        case 'pure':
        case 'parse-pure':{
            return p1
        }
        case 'parse':
        case 'each':{
            return trimLines(p1)
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
    let pureModeNest:Map<number,boolean> = new Map()
    let pureModeNestType:Map<number,string> = new Map()
    let blockNestType:Map<number,{type:blockMatch,type2?:string}> = new Map()
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
        consistantChar: arg.consistantChar ?? false
    }


    const isPureMode = () => {
        return pureModeNest.size > 0
    }
    const pureModeType = () => {
        if(pureModeNest.size === 0){
            return ''
        }
        return pureModeNestType.get(nested.length) ?? [...pureModeNestType.values()].at(-1) ?? ''
    }
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
                if(stackType[nested.length] === 1){
                    nested[0] += da[pointer]
                    break
                }
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
                    if(isPureMode()){
                        nested[0] += `{{${dat}}}`
                        nested.unshift('')
                        stackType[nested.length] = 6
                        break
                    }
                    const matchResult = blockStartMatcher(dat, matcherObj)
                    if(matchResult.type === 'nothing'){
                        nested[0] += `{{${dat}}}`
                        break
                    }
                    else{
                        nested.unshift('')
                        stackType[nested.length] = 5
                        blockNestType.set(nested.length, matchResult)
                        if(matchResult.type === 'ignore' || matchResult.type === 'pure' || matchResult.type === 'each'){
                            pureModeNest.set(nested.length, true)
                            pureModeNestType.set(nested.length, "block")
                        }
                        break
                    }
                }
                if(dat.startsWith('/')){
                    if(stackType[nested.length] === 5){
                        const blockType = blockNestType.get(nested.length)
                        if(blockType.type === 'ignore' || blockType.type === 'pure' || blockType.type === 'each'){
                            pureModeNest.delete(nested.length)
                            pureModeNestType.delete(nested.length)
                        }
                        blockNestType.delete(nested.length)
                        const dat2 = nested.shift()
                        const matchResult = blockEndMatcher(dat2.trim(), blockType, matcherObj)
                        if(blockType.type === 'each'){
                            const subind = blockType.type2.lastIndexOf(' ')
                            const sub = blockType.type2.substring(subind + 1)
                            const array = blockType.type2.substring(0, subind).split('§')
                            let added = ''
                            for(let i = 0;i < array.length;i++){
                                const res = matchResult.replaceAll(`{{slot::${sub}}}`, array[i])
                                added += res
                            }
                            da = da.substring(0, pointer + 1) + added.trim() + da.substring(pointer + 1)
                            break
                        }
                        if(matchResult === ''){
                            break
                        }
                        nested[0] += matchResult
                        break
                    }
                    if(stackType[nested.length] === 6){
                        console.log(dat)
                        const sft = nested.shift()
                        nested[0] += sft + `{{${dat}}}`
                        break
                    }
                }
                const mc = isPureMode() ? null :matcher(dat, matcherObj)
                nested[0] += mc ?? `{{${dat}}}`
                break
            }
            case '>':{
                if(stackType[nested.length] === 1){
                    nested[0] += da[pointer]
                    break
                }
                if(nested.length === 1 || stackType[nested.length] !== 2){
                    break
                }
                const dat = nested.shift()
                if(isPureMode() && pureModeType() !== 'pureSyntax' && pureModeType() !== ''){
                    nested[0] += `<${dat}>`
                    break
                }
                switch(dat){
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
                        const mc = isPureMode() ? null : smMatcher(dat, matcherObj)
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
    if(!char){
        return 'null'
    }
    const chat = char.chats[char.chatPage]
    chat.scriptstate = chat.scriptstate ?? {}
    const state = (chat.scriptstate['$' + key])
    if(state === undefined || state === null){
        const defaultVariables = parseKeyValue(char.defaultVariables).concat(parseKeyValue(db.templateDefaultVariables))
        const findResult = defaultVariables.find((f) => {
            return f[0] === key
        })
        if(findResult){
            return findResult[1]
        }
        return 'null'
    }
    return state.toString()
}

export function getGlobalChatVar(key:string){
    const db = get(DataBase)
    return db.globalChatVariables[key] ?? 'null'
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

export type PromptParsed ={[key:string]:string|PromptParsed}

export async function promptTypeParser(prompt:string):Promise<string | PromptParsed>{
    //XML type
    try {
        const parser = new DOMParser()
        const dom = `<root>${prompt}</root>`
        const xmlDoc = parser.parseFromString(dom, "text/xml")
        const root = xmlDoc.documentElement

        const errorNode = root.getElementsByTagName('parsererror')

        if(errorNode.length > 0){
            throw new Error('XML Parse Error') //fallback to other parser
        }

        const parseNode = (node:Element):string|PromptParsed => {
            if(node.children.length === 0){
                return node.textContent
            }

            const data:{[key:string]:string|PromptParsed} = {}

            for(let i=0;i<node.children.length;i++){
                const child = node.children[i]
                data[child.tagName] = parseNode(child)
            }

            return data
        }

        const pnresult = parseNode(root)

        if(typeof(pnresult) === 'string'){
            throw new Error('XML Parse Error') //fallback to other parser
        }

        return pnresult

    } catch (error) {
        
    }

    return prompt
}
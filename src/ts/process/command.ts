import { get } from "svelte/store";
import { DataBase, setDatabase } from "../storage/database";
import { selectedCharID } from "../stores";
import { alertInput, alertMd, alertSelect, alertToast } from "../alert";
import { sayTTS } from "./tts";
import { risuChatParser } from "../parser";
import { sendChat } from ".";

export async function processMultiCommand(command:string) {
    let pipe = ''
    const splited:string[] = []
    let lastIndex = 0
    let quoteDepth = false
    for(let i = 0; i<command.length; i++){
        const char = command[i]
        if(char === '"'){
            quoteDepth = !quoteDepth
        }
        else if(char === '|' && quoteDepth === false){
            splited.push(command.slice(lastIndex, i))
            lastIndex = i+1
        }
    }
    splited.push(command.slice(lastIndex))
    for(let i = 0; i<splited.length; i++){
        const result = await processCommand(splited[i].trim(), pipe)
        if(result === false){
            return false
        }
        else{
            pipe = result
        }
    }
    return pipe
}


async function processCommand(command:string, pipe:string):Promise<false | string>{
    const db = get(DataBase)
    const currentChar = db.characters[get(selectedCharID)]
    const currentChat = currentChar.chats[currentChar.chatPage]
    let {commandName, arg, namedArg} = commandParser(command, pipe)

    arg = risuChatParser(arg, {
        chara: currentChar.type === 'character' ? currentChar : null
    })

    const namedArgKeys = Object.keys(namedArg)
    for(const key of namedArgKeys){
        namedArg[key] = risuChatParser(namedArg[key], {
            chara: currentChar.type === 'character' ? currentChar : null
        })
    }

    switch(commandName){
        //STScript compatibility commands
        case 'input':{
            pipe = await alertInput(arg)
            return pipe
        }
        case 'echo':{
            alertToast(arg)
            return pipe
        }
        case 'popup':{
            alertMd(arg)
            return pipe
        }
        case 'pass':{
            pipe = arg
            return pipe
        }
        case 'buttons': {
            if(namedArg.labels){
                try {
                    const JSONLabels = JSON.parse(namedArg.labels)
                    if(Array.isArray(JSONLabels)){
                        pipe = await alertSelect(JSONLabels)
                    }
                } catch (error) {}
            }
            return pipe
        }
        case 'setinput': {
            //NOT IMPLEMENTED
            return false
        }
        case 'speak': {
            if(currentChar.type === 'character'){
                await sayTTS(currentChar, arg)
                return pipe
            }
            if(currentChar.type === 'group'){
                //NOT IMPLEMENTED
                return pipe
            }
        }
        case 'send': {
            currentChat.message.push({
                role: "user",
                data: arg
            })
            setDatabase(db)
            return pipe
        }
        case 'sendas': {
            //name not implemented
            currentChat.message.push({
                role: "char",
                data: arg
            })
            setDatabase(db)
            return pipe
        }
        case 'comment': {
            //works differently, but its close enough
            const addition = `<Comment>\n${arg}\n</Comment>`
            currentChat.message[currentChat.message.length-1].data += addition
            setDatabase(db)
            return pipe
        }
        case 'cut':{
            if(arg.includes('-')){
                const [start, end] = arg.split('-')
                currentChat.message = currentChat.message.slice(parseInt(start), parseInt(end))
                setDatabase(db)
            }
            else if(!isNaN(parseInt(arg))){
                const index = parseInt(arg)
                currentChat.message = currentChat.message.splice(index, 1)
                setDatabase(db)
            }
            else{ //For risu, doesn'ts work for STScript
                const id = arg
                currentChat.message = currentChat.message.filter((e)=>e.chatId !== id)
                setDatabase(db)
            }
            return pipe
        }
        case 'del': {
            const size = parseInt(arg)
            if(!isNaN(size)){
                currentChat.message = currentChat.message.slice(currentChat.message.length-size)
                setDatabase(db)
            }
            return pipe
        }
        case 'len':{
            try {
                const parsed = JSON.parse(arg)
                if(Array.isArray(parsed)){
                    pipe = parsed.length.toString()
                }
            } catch (error) {}
            return pipe
        }
        case 'multisend':{
            const splited = arg.split('|||')
            let clearMode = false
            if(splited[0] && splited[0].trim() === 'clear'){
                clearMode = true
                splited.shift()
            }
            for(const e of splited){
                if(clearMode){
                    currentChat.message = []
                }
                currentChat.message.push({
                    role: 'user',
                    data: e
                })
                await sendChat(-1)
            }
            return ''
        }
        case 'setvar':{
            console.log(namedArg, arg)
            const db = get(DataBase)
            const selectedChar = get(selectedCharID)
            const char = db.characters[selectedChar]
            const chat = char.chats[char.chatPage]
            chat.scriptstate = chat.scriptstate ?? {}
            chat.scriptstate['$' + namedArg['key']] = arg
            console.log(chat.scriptstate)

            char.chats[char.chatPage] = chat
            db.characters[selectedChar] = char
            setDatabase(db)
            return ''
        }
        case 'addvar':{
            const db = get(DataBase)
            const selectedChar = get(selectedCharID)
            const char = db.characters[selectedChar]
            const chat = char.chats[char.chatPage]
            chat.scriptstate = chat.scriptstate ?? {}
            chat.scriptstate['$' + namedArg['key']] = (Number(chat.scriptstate['$' + namedArg['key']]) + Number(arg)).toString()

            char.chats[char.chatPage] = chat
            db.characters[selectedChar] = char
            setDatabase(db)
            return ''
        }
        case 'getvar':{
            const db = get(DataBase)
            const selectedChar = get(selectedCharID)
            const char = db.characters[selectedChar]
            const chat = char.chats[char.chatPage]
            chat.scriptstate = chat.scriptstate ?? {}
            pipe = (chat.scriptstate['$' + namedArg['key']]).toString() ?? 'null'
            return pipe
        }


    }
    return false
}


function commandParser(command:string, pipe:string){
    if(command.startsWith('/')){
        command = command.slice(1)
    }
    const sliced = command.split(' ').filter((e)=>e!='')
    const commandName = sliced[0]
    let argArray:string[] = []
    let namedArg:{[key:string]:string} = {}
    for(let i = 1; i<sliced.length; i++){
        if(sliced[i].includes('=')){
            const [key, value] = sliced[i].split('=')
            namedArg[key] = value
        }
        else{
            argArray.push(sliced[i])
        }
    }
    const arg = argArray.join(' ')
        .replace('{{pipe}}', pipe) //STScript compatibility
        .replace('{{slot}}', pipe) //Risu default
    return {commandName, arg, namedArg}

}
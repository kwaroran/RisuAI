import { get } from "svelte/store";
import { getCurrentCharacter, getCurrentChat, getDatabase, setCurrentChat, setDatabase } from "../storage/database.svelte";
import { selectedCharID } from "../stores.svelte";
import { alertInput, alertMd, alertNormal, alertSelect } from "../alert";
import { sayTTS } from "./tts";
import { risuChatParser } from "../parser.svelte";
import { sendChat } from "./index.svelte";
import { loadLoreBookV3Prompt } from "./lorebook.svelte";
import { runTrigger } from "./triggers";

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
    console.log(splited)
    for(let i = 0; i<splited.length; i++){
        const result = await processCommand(splited[i].trim(), pipe)
        console.log(pipe)
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
    const db = getDatabase()
    const currentChar = db.characters[get(selectedCharID)]
    const currentChat = currentChar.chats[currentChar.chatPage]
    let {commandName, arg, namedArg} = commandParser(command, pipe)

    if(!arg){
        arg = pipe
    }

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
        case 'echo':
        case 'popup':{
            alertNormal(arg)
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
            return pipe
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
            const db = getDatabase()
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
            const db = getDatabase()
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
            const db = getDatabase()
            const selectedChar = get(selectedCharID)
            const char = db.characters[selectedChar]
            const chat = char.chats[char.chatPage]
            chat.scriptstate = chat.scriptstate ?? {}
            pipe = (chat.scriptstate['$' + namedArg['key']]).toString() ?? 'null'
            return pipe
        }
        case 'test_lorebook':{
            const p = await loadLoreBookV3Prompt()
            console.log(p)
            alertNormal(p.actives.map((e)=>e.prompt).join('§'))
            return JSON.stringify(p)
        }
        case 'trigger':{
            const currentChar = getCurrentCharacter()
            if(currentChar.type === 'group'){
                return;
            }
            const triggerResult = await runTrigger(currentChar, 'manual', {
                chat: getCurrentChat(),
                manualName: arg
            });

            if(triggerResult){
               setCurrentChat(triggerResult.chat);
            }
            return
        }
        case '?':{
            alertMd(`
            # /input [text]
            - Show input dialog
            - Return input text
            - Example: /input Hello World
            # /echo [text]
            - Show alert dialog
            - Return input text
            - Example: /echo Hello World
            # /popup [text]
            - Show alert dialog
            - Return input text
            - Example: /popup Hello World
            # /pass [text]
            - Return input text
            - Example: /pass Hello World
            # /buttons [labels]
            - Show select dialog
            - Return selected label
            - Example: /buttons Yes§No
            # /speak [text]
            - Speak text
            - Example: /speak Hello World
            # /send [text]
            - Send text to chat
            - Example: /send Hello World
            # /sendas [text]
            - Send text to chat as character
            - Example: /sendas Hello World
            # /comment [text]
            - Add comment to chat
            - Example: /comment Hello World
            # /cut [index]
            - Cut chat message
            - Example: /cut 1
            # /del [size]
            - Delete chat message
            - Example: /del 1
            # /len [array]
            - Return length of array
            - Example: /len Hello§World
            # /setvar key=[key] [value]
            - Set variable
            - Example: /setvar key=hello world
            # /addvar key=[key] [value]
            - Add value to variable
            - Example: /addvar key=damage 10
            # /getvar key=[key]
            - Get variable
            - Example: /getvar key=damage
            # /trigger [name]
            - Run trigger
            # /?
            - Show help
            `)
            return 'help'
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
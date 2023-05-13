import { get, writable } from "svelte/store";
import { DataBase, setDatabase, type character } from "../database";
import { CharEmotion, selectedCharID } from "../stores";
import { tokenize, tokenizeNum } from "../tokenizer";
import { language } from "../../lang";
import { alertError } from "../alert";
import { loadLoreBookPrompt } from "./lorebook";
import { findCharacterbyId, replacePlaceholders } from "../util";
import { requestChatData } from "./request";
import { stableDiff } from "./stableDiff";
import { processScript, processScriptFull } from "./scripts";
import { exampleMessage } from "./exampleMessages";

export interface OpenAIChat{
    role: 'system'|'user'|'assistant'
    content: string
}

export const doingChat = writable(false)

export async function sendChat(chatProcessIndex = -1):Promise<boolean> {

    let findCharCache:{[key:string]:character} = {}
    function findCharacterbyIdwithCache(id:string){
        const d = findCharCache[id]
        if(!!d){
            return d
        }
        else{
            const r = findCharacterbyId(id)
            findCharCache[id] = r
            return r
        }
    }

    function reformatContent(data:string){
        return data.trim().replace(`${currentChar.name}:`, '').trim()
    }

    let isDoing = get(doingChat)

    if(isDoing){
        if(chatProcessIndex === -1){
            return false
        }
    }
    doingChat.set(true)

    let db = get(DataBase)
    let selectedChar = get(selectedCharID)
    const nowChatroom = db.characters[selectedChar]
    let currentChar:character

    if(nowChatroom.type === 'group'){
        if(chatProcessIndex === -1){
            for(let i=0;i<nowChatroom.characters.length;i++){
                const r = await sendChat(i)
                if(!r){
                    return false
                }
            }
            return true
        }
        else{
            currentChar = findCharacterbyIdwithCache(nowChatroom.characters[chatProcessIndex])
            if(!currentChar){
                alertError(`cannot find character: ${nowChatroom.characters[chatProcessIndex]}`)
                return false
            }
        }
    }
    else{
        currentChar = nowChatroom
    }
    
    let selectedChat = nowChatroom.chatPage
    let currentChat = nowChatroom.chats[selectedChat]
    let maxContextTokens = db.maxContext

    if(db.aiModel === 'gpt35'){
        if(maxContextTokens > 4000){
            maxContextTokens = 4000
        }
    }
    if(db.aiModel === 'gpt4'){
        if(maxContextTokens > 8000){
            maxContextTokens = 8000
        }
    }

    let unformated = {
        'main':([] as OpenAIChat[]),
        'jailbreak':([] as OpenAIChat[]),
        'chats':([] as OpenAIChat[]),
        'lorebook':([] as OpenAIChat[]),
        'globalNote':([] as OpenAIChat[]),
        'authorNote':([] as OpenAIChat[]),
        'lastChat':([] as OpenAIChat[]),
        'description':([] as OpenAIChat[]),
    }

    if(!currentChar.utilityBot){
        const mainp = currentChar.systemPrompt.length > 3 ? currentChar.systemPrompt : db.mainPrompt

        unformated.main.push({
            role: 'system',
            content: replacePlaceholders(mainp + ((db.additionalPrompt === '' || (!db.promptPreprocess)) ? '' : `\n${db.additionalPrompt}`), currentChar.name)
        })
    
        if(db.jailbreakToggle){
            unformated.jailbreak.push({
                role: 'system',
                content: replacePlaceholders(db.jailbreak, currentChar.name)
            })
        }
    
        unformated.globalNote.push({
            role: 'system',
            content: replacePlaceholders(db.globalNote, currentChar.name)
        })
    }

    if(currentChat.note !== ''){
        unformated.authorNote.push({
            role: 'system',
            content: replacePlaceholders(currentChar.postHistoryInstructions, currentChat.note)
        })
    }

    if(currentChar.postHistoryInstructions !== ''){
        unformated.authorNote.push({
            role: 'system',
            content: replacePlaceholders(currentChar.postHistoryInstructions, currentChar.name)
        })
    }

    {
        let description = replacePlaceholders((db.promptPreprocess ? db.descriptionPrefix: '') + currentChar.desc, currentChar.name)

        if(currentChar.personality){
            description += replacePlaceholders("\n\nDescription of {{char}}: " + currentChar.personality,currentChar.name)
        }

        if(currentChar.scenario){
            description += replacePlaceholders("\n\nCircumstances and context of the dialogue: " + currentChar.scenario,currentChar.name)
        }

        unformated.description.push({
            role: 'system',
            content: description
        })

    }

    unformated.lorebook.push({
        role: 'system',
        content: replacePlaceholders(await loadLoreBookPrompt(), currentChar.name)
    })

    //await tokenize currernt
    let currentTokens = (await tokenize(Object.keys(unformated).map((key) => {
        return (unformated[key] as OpenAIChat[]).map((d) => {
            return d.content
        }).join('\n\n')
    }).join('\n\n')) + db.maxResponse) + 150

    let chats:OpenAIChat[] = exampleMessage(currentChar)
    
    chats.push({
        role: 'system',
        content: '[Start a new chat]'
    })

    if(nowChatroom.type !== 'group'){
        const firstMsg = nowChatroom.firstMsgIndex === -1 ? nowChatroom.firstMessage : nowChatroom.alternateGreetings[nowChatroom.firstMsgIndex]

        chats.push({
            role: 'assistant',
            content: processScript(currentChar,
                replacePlaceholders(firstMsg, currentChar.name),
            'editprocess')
        })
        currentTokens += await tokenize(processScript(currentChar,
            replacePlaceholders(firstMsg, currentChar.name),
        'editprocess'))
    }

    const ms = currentChat.message
    for(const msg of ms){
        let formedChat = processScript(currentChar,replacePlaceholders(msg.data, currentChar.name), 'editprocess')
        if(nowChatroom.type === 'group'){
            if(msg.saying && msg.role === 'char'){
                formedChat = `${findCharacterbyIdwithCache(msg.saying).name}: ${formedChat}`

            }
            else if(msg.role === 'user'){
                formedChat = `${db.username}: ${formedChat}`
            }
        }

        chats.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: formedChat
        })
        currentTokens += (await tokenize(formedChat) + 1)
    }

    if(nowChatroom.type === 'group'){
        const systemMsg = `[Write the next reply only as ${currentChar.name}]`
        chats.push({
            role: 'system',
            content: systemMsg
        })
        currentTokens += (await tokenize(systemMsg) + 1)
    }

    console.log(currentTokens)
    console.log(maxContextTokens)

    while(currentTokens > maxContextTokens){
        if(chats.length <= 1){
            alertError(language.errors.toomuchtoken)
            
            return false
        }

        currentTokens -= (await tokenize(chats[0].content) + 1)
        chats.splice(0, 1)
    }

    console.log(currentTokens)

    let bias:{[key:number]:number} = {}

    for(let i=0;i<currentChar.bias.length;i++){
        const bia = currentChar.bias[i]
        const tokens = await tokenizeNum(bia[0])

        for(const token of tokens){
            bias[token] = bia[1]
        }
    }

    for(let i=0;i<db.bias.length;i++){
        const bia = db.bias[i]
        const tokens = await tokenizeNum(bia[0])

        for(const token of tokens){
            bias[token] = bia[1]
        }
    }


    unformated.lastChat.push(chats[chats.length - 1])
    chats.splice(chats.length - 1, 1)

    unformated.chats = chats

    //make into one

    let formated:OpenAIChat[] = []
    const formatOrder = db.formatingOrder
    let sysPrompts:string[] = []
    for(let i=0;i<formatOrder.length;i++){
        const cha = unformated[formatOrder[i]]
        if(cha.length === 1 && cha[0].role === 'system'){
            sysPrompts.push(cha[0].content)
        }
        else if(sysPrompts.length > 0){
            const prompt = sysPrompts.join('\n')

            if(prompt.replace(/\n/g,'').length > 3){
                formated.push({
                    role: 'system',
                    content: prompt
                })
            }
            sysPrompts = []
            formated = formated.concat(cha)
        }
        else{
            formated = formated.concat(cha)
        }
    }

    if(sysPrompts.length > 0){
        const prompt = sysPrompts.join('\n')

        if(prompt.replace(/\n/g,'').length > 3){
            formated.push({
                role: 'system',
                content: prompt
            })
        }
        sysPrompts = []
    }


    const req = await requestChatData({
        formated: formated,
        bias: bias,
        currentChar: currentChar
    }, 'model')

    let result = ''
    let emoChanged = false

    if(req.type === 'fail'){
        alertError(req.result)
        return false
    }
    else{
        const result2 = processScriptFull(currentChar, reformatContent(req.result), 'editoutput')
        result = result2.data
        emoChanged = result2.emoChanged
        db.characters[selectedChar].chats[selectedChat].message.push({
            role: 'char',
            data: result,
            saying: currentChar.chaId
        })
        setDatabase(db)
    }


    if(currentChar.viewScreen === 'emotion' && (!emoChanged)){

        let currentEmotion = currentChar.emotionImages

        function shuffleArray(array:string[]) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array
        }

        let emotionList = currentEmotion.map((a) => {
            return a[0]
        })

        let charemotions = get(CharEmotion)

        let tempEmotion = charemotions[currentChar.chaId]
        if(!tempEmotion){
            tempEmotion = []
        }
        if(tempEmotion.length > 4){
            tempEmotion.splice(0, 1)
        }

        let emobias:{[key:number]:number} = {}

        for(const emo of emotionList){
            const tokens = await tokenizeNum(emo)
            for(const token of tokens){
                emobias[token] = 10
            }
        }

        for(let i =0;i<tempEmotion.length;i++){
            const emo = tempEmotion[i]

            const tokens = await tokenizeNum(emo[0])
            const modifier = 20 - ((tempEmotion.length - (i + 1)) * (20/4))

            for(const token of tokens){
                emobias[token] -= modifier
                if(emobias[token] < -100){
                    emobias[token] = -100
                }
            }
        }        

        const promptbody:OpenAIChat[] = [
            {
                role:'system',
                content: `${db.emotionPrompt2 || "From the list below, choose a word that best represents a character's outfit description, action, or emotion in their dialogue. Prioritize selecting words related to outfit first, then action, and lastly emotion. Print out the chosen word."}\n\n list: ${shuffleArray(emotionList).join(', ')} \noutput only one word.`
            },
            {
                role: 'user',
                content: `"Good morning, Master! Is there anything I can do for you today?"`
            },
            {
                role: 'assistant',
                content: 'happy'
            },
            {
                role: 'user',
                content: result
            },
        ]

        console.log('requesting chat')
        const rq = await requestChatData({
            formated: promptbody,
            bias: emobias,
            currentChar: currentChar,
            temperature: 0.4,
            maxTokens: 30,
        }, 'submodel')

        if(rq.type === 'fail'){
            alertError(rq.result)
            return true
        }
        else{
            emotionList = currentEmotion.map((a) => {
                return a[0]
            })
            try {
                const emotion:string = rq.result.replace(/ |\n/g,'').trim().toLocaleLowerCase()
                let emotionSelected = false
                for(const emo of currentEmotion){
                    if(emo[0] === emotion){
                        const emos:[string, string,number] = [emo[0], emo[1], Date.now()]
                        tempEmotion.push(emos)
                        charemotions[currentChar.chaId] = tempEmotion
                        CharEmotion.set(charemotions)
                        emotionSelected = true
                        break
                    }
                }
                if(!emotionSelected){
                    for(const emo of currentEmotion){
                        if(emotion.includes(emo[0])){
                            const emos:[string, string,number] = [emo[0], emo[1], Date.now()]
                            tempEmotion.push(emos)
                            charemotions[currentChar.chaId] = tempEmotion
                            CharEmotion.set(charemotions)
                            emotionSelected = true
                            break
                        }
                    }
                }
                if(!emotionSelected && emotionList.includes('neutral')){
                    const emo = currentEmotion[emotionList.indexOf('neutral')]
                    const emos:[string, string,number] = [emo[0], emo[1], Date.now()]
                    tempEmotion.push(emos)
                    charemotions[currentChar.chaId] = tempEmotion
                    CharEmotion.set(charemotions)
                    emotionSelected = true
                }
            } catch (error) {
                alertError(language.errors.httpError + `${error}`)
                return true
            }
        }
        
        return true


    }
    else if(currentChar.viewScreen === 'imggen'){
        if(chatProcessIndex !== -1){
            alertError("Stable diffusion in group chat is not supported")
        }

        const msgs = db.characters[selectedChar].chats[selectedChat].message
        let msgStr = ''
        for(let i = (msgs.length - 1);i>=0;i--){
            console.log(i,msgs.length,msgs[i])
            if(msgs[i].role === 'char'){
                msgStr = `character: ${msgs[i].data.replace(/\n/, ' ')} \n` + msgStr
            }
            else{
                msgStr = `user: ${msgs[i].data.replace(/\n/, ' ')} \n` + msgStr
                break
            }
        }


        const ch = await stableDiff(currentChar, msgStr)
        if(ch){
            db.characters[selectedChar].chats[selectedChat].sdData = ch
            setDatabase(db)
        }
    }
    return true
}
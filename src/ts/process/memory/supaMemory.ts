import { get } from "svelte/store";
import type { OpenAIChat } from "..";
import { DataBase, type Chat, type character, type groupChat } from "../../storage/database";
import { tokenize, type ChatTokenizer } from "../../tokenizer";
import { requestChatData } from "../request";
import { cloneDeep } from "lodash";
import { HypaProcesser } from "./hypamemory";
import { stringlizeChat } from "../stringlize";
import { globalFetch } from "src/ts/storage/globalApi";

export async function supaMemory(
        chats:OpenAIChat[],
        currentTokens:number,
        maxContextTokens:number,
        room:Chat,
        char:character|groupChat,
        tokenizer:ChatTokenizer,
        arg:{asHyper?:boolean} = {}
    ): Promise<{ currentTokens: number; chats: OpenAIChat[]; error?:string; memory?:string;lastId?:string}>{
    const db = get(DataBase)

    currentTokens += 10

    if(currentTokens > maxContextTokens){
        let coIndex = -1
        for(let i=0;i<chats.length;i++){
            if(chats[i].memo === 'NewChat'){
                coIndex = i
                break
            }
        }
        if(coIndex !== -1){
            for(let i=0;i<coIndex;i++){
                currentTokens -= await tokenizer.tokenizeChat(chats[0])
                chats.splice(0, 1)
            }
        }

        let supaMemory = ''
        let hypaChunks:string[] = []
        let lastId = ''
        let HypaData:HypaData[] = []

        if(room.supaMemoryData && room.supaMemoryData.length > 4){
            const splited = room.supaMemoryData.split('\n')
            let id = splited.splice(0,1)[0]
            const data = splited.join('\n')

            if(arg.asHyper && (!id.startsWith("hypa:"))){
                supaMemory = ""

            }
            else{
                if(id.startsWith("hypa:")){
                
                    if((!arg.asHyper)){
                        return {
                            currentTokens: currentTokens,
                            chats: chats,
                            error: "SupaMemory: Data saved in hypaMemory, loaded as SupaMemory."
                        }
                    }
                    HypaData = JSON.parse(data.trim())
                    if(!Array.isArray(HypaData)){
                        return {
                            currentTokens: currentTokens,
                            chats: chats,
                            error: "hypaMemory: hypaMemory isn't Array"
                        }
                    }

                    let indexSelected = -1
                    for(let j=0;j<HypaData.length;j++){
                        let i =0;
                        let countTokens  = currentTokens
                        let countChats = cloneDeep(chats)
                        while(true){
                            if(countChats.length === 0){
                                break
                            }
                            if(countChats[0].memo === HypaData[j].id){
                                lastId = HypaData[j].id
                                currentTokens = countTokens
                                chats = countChats
                                indexSelected = j
                                break
                            }
                            countTokens -= await tokenizer.tokenizeChat(countChats[0])
                            countChats.splice(0, 1)
                            i += 1
                        }
                        if(indexSelected !== -1){
                            break
                        }
                    }
                    if(indexSelected === -1){
                        return {
                            currentTokens: currentTokens,
                            chats: chats,
                            error: "hypaMemory: chat ID not found"
                        }
                    }

                    supaMemory = HypaData[indexSelected].supa
                    hypaChunks = HypaData[indexSelected].hypa

                }
                else{
                    let i =0;
                    while(true){
                        if(chats.length === 0){
                            return {
                                currentTokens: currentTokens,
                                chats: chats,
                                error: "SupaMemory: chat ID not found"
                            }
                        }
                        if(chats[0].memo === id){
                            lastId = id
                            break
                        }
                        currentTokens -= await tokenizer.tokenizeChat(chats[0])
                        chats.splice(0, 1)
                        i += 1
                    }
        
                    supaMemory = data
                    currentTokens += await tokenize(supaMemory)
                }
            }
        }


        if(currentTokens < maxContextTokens){
            chats.unshift({
                role: "system",
                content: supaMemory
            })
            return {
                currentTokens: currentTokens,
                chats: chats
            }
        }


        async function summarize(stringlizedChat:string){

            const supaPrompt = db.supaMemoryPrompt === '' ?
            "[Summarize the ongoing role story, It must also remove redundancy and unnecessary text and content from the output to reduce tokens for gpt3 and other sublanguage models]\n"
            : db.supaMemoryPrompt
    
            let result = ''

            if(db.supaMemoryType !== 'subModel'){
                const promptbody = stringlizedChat + '\n\n' + supaPrompt + "\n\nOutput:"

                const da = await globalFetch("https://api.openai.com/v1/completions",{
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + db.supaMemoryKey
                    },
                    method: "POST",
                    body: {
                        "model": db.supaMemoryType === 'curie' ? "text-curie-001" : "text-davinci-003",
                        "prompt": promptbody,
                        "max_tokens": 600,
                        "temperature": 0
                    }
                })

                console.log(da)
    
                result = (await da.data).choices[0].text.trim()
            }
            else {
                const promptbody:OpenAIChat[] = [
                    {
                        role: "user",
                        content: stringlizedChat
                    },
                    {
                        role: "system",
                        content: supaPrompt
                    }
                ]
                const da = await requestChatData({
                    formated: promptbody,
                    bias: {}
                }, 'submodel')
                if(da.type === 'fail' || da.type === 'streaming' || da.type === 'multiline'){
                    return {
                        currentTokens: currentTokens,
                        chats: chats,
                        error: "SupaMemory: HTTP: " + da.result
                    }
                }
                result = da.result
            }
            return result
        }

        let hypaResult = ""

        if(arg.asHyper){
            const hypa = new HypaProcesser(db.hypaModel)
            hypa.oaikey = db.supaMemoryKey
            hypa.vectors = []
            hypaChunks = hypaChunks.filter((value) => value.length > 1)
            await hypa.addText(hypaChunks.filter((value, index, self) => {
                return self.indexOf(value) === index;
            }))
            const filteredChat = chats.filter((r) => r.role !== 'system' && r.role !== 'function')
            const s = await hypa.similaritySearch(stringlizeChat(filteredChat.slice(0, 4)))
            hypaResult = "past events: " + s.slice(0,3).join("\n")
            currentTokens += await tokenizer.tokenizeChat({
                role: "assistant",
                content: hypaResult,
                memo: "hypaMemory"
            })
            currentTokens += 10
        }

        while(currentTokens > maxContextTokens){
            const beforeToken = currentTokens
            let maxChunkSize = maxContextTokens > 3500 ? 1200 : Math.floor(maxContextTokens / 3)
            let summarized = false
            let chunkSize = 0
            let stringlizedChat = ''
            let spiceLen = 0
            while(true){
                const cont = chats[spiceLen]
                if(!cont){
                    currentTokens = beforeToken
                    stringlizedChat = ''
                    chunkSize = 0
                    spiceLen = 0
                    if(summarized){
                        if(maxChunkSize < 500){
                            return {
                                currentTokens: currentTokens,
                                chats: chats,
                                error: "Not Enough Tokens"
                            }
                        }
                        maxChunkSize = maxChunkSize * 0.7
                    }
                    else{
                        const result = await summarize(supaMemory)
                        if(typeof(result) !== 'string'){
                            return result
                        }

                        console.log(currentTokens)
                        currentTokens -= await tokenize(supaMemory)
                        currentTokens += await tokenize(result + '\n\n')
                        console.log(currentTokens)

                        supaMemory = result + '\n\n'
                        summarized = true
                        if(currentTokens <= maxContextTokens){
                            break
                        }
                    }
                    continue
                }
                const tokens = await tokenizer.tokenizeChat(cont)
                if((chunkSize + tokens) > maxChunkSize){
                    if(stringlizedChat === ''){
                        if(cont.role !== 'function' && cont.role !== 'system'){
                            stringlizedChat += `${cont.role === 'assistant' ? char.type === 'group' ? '' : char.name : db.username}: ${cont.content}\n\n`
                            spiceLen += 1
                            currentTokens -= tokens
                            chunkSize += tokens
                        }
                    }
                    lastId = cont.memo
                    break
                }
                stringlizedChat += `${cont.role === 'assistant' ? char.type === 'group' ? '' : char.name : db.username}: ${cont.content}\n\n`
                spiceLen += 1
                currentTokens -= tokens
                chunkSize += tokens
            }
            chats.splice(0, spiceLen)

            if(stringlizedChat !== ''){
                const result = await summarize(stringlizedChat)

                if(typeof(result) !== 'string'){
                    return result
                }
    
                const tokenz = await tokenize(result + '\n\n')
                hypaChunks.push(result.replace(/\n+/g,'\n'))

                let SupaMemoryList = supaMemory.split('\n\n').filter((value) => value.length > 1)
                if(SupaMemoryList.length >= (arg.asHyper ? 3 : 4)){
                    const oldSupaMemory = supaMemory
                    const result = await summarize(supaMemory)
                    if(typeof(result) !== 'string'){
                        return result
                    }
                    supaMemory = result
                    currentTokens -= await tokenize(oldSupaMemory)
                    currentTokens += await tokenize(supaMemory)
                }
                SupaMemoryList = supaMemory.split('\n\n').filter((value) => value.length > 1)
                SupaMemoryList.push(result.replace(/\n+/g,'\n'))
                currentTokens += tokenz
                supaMemory = SupaMemoryList.join('\n\n')
            }
        }

        chats.unshift({
            role: "system",
            content: supaMemory,
            memo: "supaMemory"
        })

        

        if(arg.asHyper){
            if(hypaResult !== ''){
                chats.unshift({
                    role: "assistant",
                    content: hypaResult
                })
            }
            
            if(HypaData[0] && HypaData[0].id === lastId){
                HypaData[0].hypa = hypaChunks
                HypaData[0].supa = supaMemory
            }
            else{
                HypaData.unshift({
                    id: lastId,
                    hypa: hypaChunks,
                    supa: supaMemory
                })
            }

            return {
                currentTokens: currentTokens,
                chats: chats,
                memory: "hypa:\n" + JSON.stringify(HypaData, null, 2),
                lastId: lastId
            }

        }

        return {
            currentTokens: currentTokens,
            chats: chats,
            memory: lastId + '\n' + supaMemory,
            lastId: lastId
        }

    }
    return {
        currentTokens: currentTokens,
        chats: chats
    }
}

type HypaData = {id:string,supa:string,hypa:string[]}


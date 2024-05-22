import { DataBase, type Chat, type character, type groupChat } from "src/ts/storage/database";
import type { OpenAIChat } from "..";
import type { ChatTokenizer } from "src/ts/tokenizer";
import { get } from "svelte/store";
import { requestChatData } from "../request";
import { HypaProcesser } from "./hypamemory";

export interface HypaV2Data{
    chunks: {
        text:string
        targetId:string
    }[]
    mainChunks: {
        text:string
        targetId:string
    }[]
}


async function summary(stringlizedChat:string):Promise<{
    success:boolean
    data:string
}>{
    const promptbody:OpenAIChat[] = [
        {
            role: "user",
            content: stringlizedChat
        },
        {
            role: "system",
            content: "Summarize this roleplay scene in a coherent narrative format for future reference. Summarize what happened, focusing on events and interactions between them. If someone or something is new or changed, include a brief characterization of them."
        }
    ]
    const da = await requestChatData({
        formated: promptbody,
        bias: {},
        useStreaming: false,
    }, 'model')
    if(da.type === 'fail' || da.type === 'streaming' || da.type === 'multiline'){
        return {
            data: "Hypamemory HTTP: " + da.result,
            success: false
        }
    }
    return {
        data: da.result,
        success: true
    }
}

export async function hypaMemoryV2(
    chats:OpenAIChat[],
    currentTokens:number,
    maxContextTokens:number,
    room:Chat,
    char:character|groupChat,
    tokenizer:ChatTokenizer,
    arg:{asHyper?:boolean} = {}
): Promise<{ currentTokens: number; chats: OpenAIChat[]; error?:string; memory?:HypaV2Data;}>{

    const db = get(DataBase)

    const data:HypaV2Data = room.hypaV2Data ?? {
        chunks:[],
        mainChunks:[]
    }
    
    //this is for the prompt

    let allocatedTokens = 3000
    currentTokens += allocatedTokens
    currentTokens += 50 //this is for the template prompt
    let mainPrompt = ""

    while(data.mainChunks.length > 0){
        const chunk = data.mainChunks[0]
        const ind = chats.findIndex(e => e.memo === chunk.targetId)
        if(ind === -1){
            data.mainChunks.shift()
            continue
        }

        const removedChats = chats.splice(0, ind)
        for(const chat of removedChats){
            currentTokens -= await tokenizer.tokenizeChat(chat)
        }
        chats = chats.slice(ind)
        mainPrompt = chunk.text
        const mpToken = await tokenizer.tokenizeChat({role:'system', content:mainPrompt})
        allocatedTokens -= mpToken
        break
    }

    while(currentTokens >= maxContextTokens){
    
        const idx = (Math.floor(chats.length/2))
        const targetId = chats[idx].memo
        const halfData = chats.slice(idx)

        let halfDataTokens = 0
        for(const chat of halfData){
            halfDataTokens += await tokenizer.tokenizeChat(chat)
        }

        const stringlizedChat = halfData.map(e => `${e.role}: ${e.content}`).join('\n')

        const summaryData = await summary(stringlizedChat)

        if(!summaryData.success){
            return {
                currentTokens: currentTokens,
                chats: chats,
                error: summaryData.data
            }
        }

        const summaryDataToken = await tokenizer.tokenizeChat({role:'system', content:summaryData.data})
        mainPrompt += `\n\n${summaryData.data}`
        currentTokens -= halfDataTokens
        allocatedTokens -= summaryDataToken

        data.mainChunks.unshift({
            text: mainPrompt,
            targetId: targetId
        })

        if(allocatedTokens < 1500){
            const summarizedMp = await summary(mainPrompt)
            const mpToken = await tokenizer.tokenizeChat({role:'system', content:mainPrompt})
            const summaryToken = await tokenizer.tokenizeChat({role:'system', content:summarizedMp.data})

            allocatedTokens -= summaryToken
            allocatedTokens += mpToken

            const splited = mainPrompt.split('\n\n').map(e => e.trim()).filter(e => e.length > 0)

            data.chunks.push(...splited.map(e => ({
                text: e,
                targetId: targetId
            })))

            data.mainChunks[0].text = mainPrompt
        }
    }
    
    const processer = new HypaProcesser("nomic")

    await processer.addText(data.chunks.filter(v => {
        return v.text.trim().length > 0
    }).map((v) => {
        return "search_document: " + v.text.trim()
    }))

    let scoredResults:{[key:string]:number} = {}
    for(let i=0;i<3;i++){
        const pop = chats[chats.length - i - 1]
        if(!pop){
            break
        }
        const searched = await processer.similaritySearchScored(`search_query: ${pop.content}`)
        for(const result of searched){
            const score = result[1]/(i+1)
            if(scoredResults[result[0]]){
                scoredResults[result[0]] += score
            }else{
                scoredResults[result[0]] = score
            }
        }
    }

    const scoredArray = Object.entries(scoredResults).sort((a,b) => b[1] - a[1])

    let chunkResultPrompts = ""
    while(allocatedTokens > 0){
        const target = scoredArray.shift()
        if(!target){
            break
        }
        const tokenized = await tokenizer.tokenizeChat({
            role: 'system',
            content: target[0].substring(14)
        })
        if(tokenized > allocatedTokens){
            break
        }
        chunkResultPrompts += target[0].substring(14) + '\n\n'
        allocatedTokens -= tokenized
    }


    const fullResult = `<Past Events Summary>${mainPrompt}</Past Events Summary>\n<Past Events Details>${chunkResultPrompts}</Past Events Details>`

    chats.unshift({
        role: "system",
        content: fullResult,
        memo: "supaMemory"
    })
    return {
        currentTokens: currentTokens,
        chats: chats,
        memory: data
    }
}
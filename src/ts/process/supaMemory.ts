import { get } from "svelte/store";
import type { OpenAIChat } from ".";
import { DataBase, type Chat, type character, type groupChat } from "../database";
import { tokenize } from "../tokenizer";
import { findCharacterbyId } from "../util";
import { requestChatData } from "./request";

export async function supaMemory(chats:OpenAIChat[],currentTokens:number,maxContextTokens:number,room:Chat,char:character|groupChat): Promise<{ currentTokens: number; chats: OpenAIChat[]; error?:string; memory?:string}>{
    const db = get(DataBase)
    console.log("Memory: " + currentTokens)

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
                currentTokens -= (await tokenize(chats[0].content) + 1)
                chats.splice(0, 1)
            }
        }

        let supaMemory = ''

        if(room.supaMemoryData && room.supaMemoryData.length > 4){
            const splited = room.supaMemoryData.split('\n')
            const id = splited.splice(0,1)[0]
            const data = splited.join('\n')

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
                    break
                }
                currentTokens -= (await tokenize(chats[0].content) + 1)
                chats.splice(0, 1)
                i += 1
            }

            supaMemory = data
            currentTokens += await tokenize(supaMemory) + 1
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

        let lastId = ''

        while(currentTokens > maxContextTokens){
            const maxChunkSize = maxContextTokens > 3000 ? 1200 : Math.floor(maxContextTokens / 2.5)
            let chunkSize = 0
            let stringlizedChat = ''
            
            while(true){
                const cont = chats[0]
                if(!cont){
                    return {
                        currentTokens: currentTokens,
                        chats: chats,
                        error: "Not Enough Chunks"
                    }
                }
                const tokens = await tokenize(cont.content) + 1
                if((chunkSize + tokens) > maxChunkSize){
                    lastId = cont.memo
                    break
                }
                stringlizedChat += `${cont.role === 'assistant' ? char.type === 'group' ? '' : char.name : db.username}: ${cont.content}\n\n`
                chats.splice(0, 1)
                currentTokens -= tokens
                chunkSize += tokens
            }
    
            const supaPrompt = db.supaMemoryPrompt === '' ?
            "[Summarize the ongoing role story. It must also remove redundancy and unnecessary content from the prompt so that gpt3 and other sublanguage models]\n"
            : db.supaMemoryPrompt
    
            const promptbody = stringlizedChat + '\n\n' + supaPrompt + "\n\nOutput:"

            const da = await fetch("https://api.openai.com/v1/completions",{
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + db.openAIKey
                },
                method: "POST",
                body: JSON.stringify({
                    "model": "text-davinci-003",
                    "prompt": promptbody,
                    "max_tokens": 500,
                    "temperature": 0
                })
            })

            // const promptbody:OpenAIChat[] = [
            //     {
            //         role: "user",
            //         content: stringlizedChat
            //     },
            //     {
            //         role: "system",
            //         content: supaPrompt
            //     }
            // ]
            // const da = await requestChatData({
            //     formated: promptbody,
            //     bias: {}
            // }, 'submodel')

            const result = (await da.json()).choices[0].text.trim()
            if(da.status < 200 || da.status >= 300){
                return {
                    currentTokens: currentTokens,
                    chats: chats,
                    error: "SupaMemory: HTTP: " + await da.text()
                }
            }

            const tokenz = await tokenize(result + '\n\n') + 5
            currentTokens += tokenz
            supaMemory += result + '\n\n'
        }

        chats.unshift({
            role: "system",
            content: supaMemory
        })
        return {
            currentTokens: currentTokens,
            chats: chats,
            memory: lastId + '\n' + supaMemory
        }

    }
    return {
        currentTokens: currentTokens,
        chats: chats
    }
}
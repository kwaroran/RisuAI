import { alertError } from "src/ts/alert";
import type { OpenAIChat } from "..";
import { HypaProcesser } from "./hypamemory";
import { language } from "src/lang";
import type { ChatTokenizer } from "src/ts/tokenizer";
import { get } from "svelte/store";
import { DataBase } from "src/ts/storage/database";

export async function hanuraiMemory(chats:OpenAIChat[],arg:{
    currentTokens:number,
    maxContextTokens:number,
    tokenizer:ChatTokenizer
}){
    const db = get(DataBase)
    const tokenizer = arg.tokenizer
    const processer = new HypaProcesser('nomic')
    let addTexts:string[] = []
    chats.map((chat) => {
        if(!chat?.content?.trim()){
            return
        }
        if(db.hanuraiSplit){
            const splited = chat.content.split('\n\n')
            for(const split of splited){
                if(!split.trim()){
                    continue
                }
                addTexts.push(`search_document: ${split.trim()}`)
            }
        }
        addTexts.push(`search_document: ${chat.content?.trim()}`)
    })
    processer.addText(addTexts)

    let scoredResults:{[key:string]:number} = {}
    for(let i=1;i<5;i++){
        const chat = chats[chats.length-i]
        if(!chat?.content){
            continue
        }
        const scoredArray = (await processer.similaritySearchScored('search_query: ' + chat.content)).map((result) => {
            return [result[0],result[1]/i] as [string,number]
        })
        for(const scored of scoredArray){
            if(scoredResults[scored[0]]){
                scoredResults[scored[0]] += scored[1]
            }else{
                scoredResults[scored[0]] = scored[1]
            }
        }
    }
    const vectorResult = Object.entries(scoredResults).sort((a,b)=>a[1]-b[1])


    let tokens = arg.currentTokens + db.hanuraiTokens

    while(tokens < arg.maxContextTokens){
        const poped = chats.pop()
        if(!poped){
            alertError(language.errors.toomuchtoken + "\n\nRequired Tokens: " + tokens)
            return false
        }
        tokens -= await tokenizer.tokenizeChat(chats[0])
    }

    tokens -= db.hanuraiTokens

    let resultTexts:string[] = []
    for(const vector of vectorResult){
        const chat = chats.find((chat) => chat.content === vector[0].substring(14))
        if(chat){
            continue
        }
        const tokenized = await tokenizer.tokenizeChat(chat) + 2
        tokens += tokenized
        if(tokens >= arg.maxContextTokens){
            tokens -= tokenized
            break
        }
        resultTexts.push(vector[0].substring(14))
    }
    console.log(resultTexts)
    chats.unshift({
        role: "system",
        memo: "supaMemory",
        content: resultTexts.join('\n\n'),
    })
    return {
        tokens,
        chats
    }


}
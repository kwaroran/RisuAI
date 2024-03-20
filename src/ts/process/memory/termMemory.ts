import type { OpenAIChat } from "..";
import { HypaProcesser } from "./hypamemory";

export async function termMemory(chats:OpenAIChat[]){
    const processer = new HypaProcesser('MiniLM')
    processer.addText(chats.map(chat=>chat.content))

    let scoredResults:{[key:string]:number}
    for(let i=1;i<5;i++){
        const chat = chats[chats.length-i]
        if(!chat?.content){
            continue
        }
        const scoredArray = (await processer.similaritySearchScored(chat.content)).map((result) => {
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
    const result = Object.entries(scoredResults).sort((a,b)=>a[1]-b[1])
    return result.map(([content,score])=>(content)).join('\n\n')

}
import type { OpenAIChat } from ".";
import type { character } from "../storage/database";
import { risuChatParser } from "./scripts";

export function exampleMessage(char:character, userName:string):OpenAIChat[]{
    if(char.exampleMessage === ''){
        return []
    }

    const messages = char.exampleMessage.split('\n')
    let result:OpenAIChat[] = []
    let currentMessage:OpenAIChat

    function add(){
        if(currentMessage){
            result.push(currentMessage)
        }
    }

    for(const mes of messages){
        const trimed = mes.trim()
        const lowered = trimed.toLocaleLowerCase()


        if(lowered === '<start>'){
            add()
            result.push({
                role: "system",
                content: '[Start a new chat]',
                memo: "NewChatExample"
            })
            currentMessage = null
        }
        else if(lowered.startsWith('{{char}}:')  || lowered.startsWith('<bot>:') || lowered.startsWith(`${char.name}:`)){
            add()
            currentMessage = {
                role: "assistant",
                content: trimed.split(':', 2)[1].trimStart(),
                name: 'example_assistant' 
            }
        }
        else if(lowered.startsWith('{{user}}:') || lowered.startsWith('<user>:')){
            add()
            currentMessage = {
                role: "user",
                content: trimed.split(':', 2)[1].trimStart(),
                name: 'example_user'
            }
        }
        else{
            if(currentMessage){
                currentMessage.content += "\n" + trimed
            }
        }
    }
    add()
    
    result = result.map((r) => {
        return {
            role: r.role,
            content: risuChatParser(r.content, {chara: char})
        }
    })

    return result
}
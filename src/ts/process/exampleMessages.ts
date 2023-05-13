import type { OpenAIChat } from ".";
import type { character } from "../database";
import { replacePlaceholders } from "../util";

export function exampleMessage(char:character):OpenAIChat[]{
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
                content: '[Start a new chat]'
            })
            currentMessage = null
        }
        else if(lowered.startsWith('{{char}}:')  || lowered.startsWith('<bot>:') || lowered.startsWith(`${char.name}:`)){
            add()
            currentMessage = {
                role: "assistant",
                content: trimed.split(':', 2)[1]
            }
        }
        else if(lowered.startsWith('{{user}}:') || lowered.startsWith('<user>:')){
            add()
            currentMessage = {
                role: "user",
                content: trimed.split(':', 2)[1]
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
            content: replacePlaceholders(r.content, char.name)
        }
    })

    return result
}
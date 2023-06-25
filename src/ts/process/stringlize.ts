import type { OpenAIChat } from ".";
import { tokenize } from "../tokenizer";

export function multiChatReplacer(){

}

export function stringlizeChat(formated:OpenAIChat[], char:string = ''){
    let resultString:string[] = []
    for(const form of formated){
        if(form.role === 'system'){
            resultString.push("system: " + form.content)
        }
        else if(form.name){
            resultString.push(form.name + ": " + form.content)
        }
        else{
            resultString.push(form.content)
        }
    }
    return resultString.join('\n\n') + `\n\n${char}:`
}

export function unstringlizeChat(text:string, formated:OpenAIChat[], char:string = ''){
    console.log(text)
    let minIndex = -1
    let chunks:string[] = ["system note:", "system:","system note：", "system："]
    if(char){
        chunks.push(`${char}:`)
    }

    for(const form of formated){
        if(form.name){
            chunks.push(`${form.name}:`)
            chunks.push(`${form.name}：`)
            
        }
    }

    for(const chunk of chunks){
        const ind = text.indexOf(chunk)
        if(ind === -1){
            continue
        }
        if(minIndex === -1 || minIndex > ind){
            minIndex = ind
        }
    }

    if(minIndex !== -1){
        text = text.substring(0, minIndex).trim()
    }

    return text
}

export function stringlizeAINChat(formated:OpenAIChat[], char:string = ''){
    let resultString:string[] = []
    for(const form of formated){
        if(form.memo && form.memo.startsWith("newChat")){
            resultString.push("[新しいチャットの始まり]")
            continue
        }
        if(form.role === 'system'){
            resultString.push(form.content)
        }
        else if(form.name){
            resultString.push(form.name + "： " + form.content)
        }
        else{
            resultString.push(form.content)
        }
    }
    return resultString.join('\n\n') + `\n\n${char}:`
}
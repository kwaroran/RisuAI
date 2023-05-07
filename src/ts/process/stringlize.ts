import type { OpenAIChat } from ".";

export function multiChatReplacer(){

}

export function stringlizeChat(formated:OpenAIChat[], char:string = ''){
    let resultString:string[] = []
    for(const form of formated){
        if(form.role === 'system'){
            resultString.push("'System Note: " + form.content)
        }
        else if(form.role === 'user'){
            resultString.push("User: " + form.content)
        }
        else if(form.role === 'assistant'){
            resultString.push("Assistant: " + form.content)
        }
    }
    return resultString.join('\n\n') + `\n\n${char}:`
}
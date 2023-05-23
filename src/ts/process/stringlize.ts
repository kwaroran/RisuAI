import type { OpenAIChat } from ".";

export function multiChatReplacer(){

}

export function stringlizeChat(formated:OpenAIChat[], char:string = ''){
    let resultString:string[] = []
    for(const form of formated){
        if(form.role === 'system'){
            resultString.push("system note: " + form.content)
        }
        else{
            resultString.push(form.name + ": " + form.content)
        }
    }
    return resultString.join('\n\n') + `\n\n${char}:`
}
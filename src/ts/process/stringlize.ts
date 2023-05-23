import type { OpenAIChat } from ".";

export function multiChatReplacer(){

}

export function stringlizeChat(formated:OpenAIChat[], char:string = ''){
    let resultString:string[] = []
    for(const form of formated){
        if(form.role === 'system'){
            resultString.push("system note: " + form.content)
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
    let minIndex = -1
    let chunks:string[] = ["system note:"]
    if(char){
        chunks.push(`${char}:`)
    }

    for(const form of formated){
        if(form.name){
            const chunk = `${form.name}:`
            if(!chunks.includes(chunk)){
                chunks.push(chunk)
            }
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
        text.substring(0, minIndex)
    }

    return text
}
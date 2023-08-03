import { get } from "svelte/store";
import type { OpenAIChat } from ".";
import { tokenize } from "../tokenizer";
import { DataBase } from "../storage/database";

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

function appendWhitespace(prefix:string, seperator:string=" ") {
    if(prefix && !"> \n".includes(prefix[prefix.length-1])){
        prefix += seperator.includes("\n\n") ? "\n" : " "
    }
    return prefix
}
export function stringlizeChatOba(formated:OpenAIChat[], characterName:string='', suggesting:boolean=false){
    const db = get(DataBase)
    let resultString:string[] = []
    let { header, systemPrefix, userPrefix, assistantPrefix, seperator } = db.ooba.formating;
    if(!seperator){
        seperator = "\n\n"
    }

    if(header) {
        resultString.push(header)
    }
    for(const form of formated){
        if(form.content === "[Start a new chat]"){
            continue
        }
        let prefix = ""
        let name = ""
        if(form.role === 'user'){
            prefix = appendWhitespace(suggesting ? assistantPrefix : userPrefix, seperator)
            name = `${db.username}: `
        }
        else if(form.role === 'assistant'){
            prefix = appendWhitespace(suggesting ? userPrefix : assistantPrefix, seperator)
            name = `${characterName}: `
        }
        else if(form.role === 'system'){
            prefix = appendWhitespace(systemPrefix, seperator)
        }
        resultString.push(prefix + name + form.content)
    }
    if (suggesting){
        resultString.push(appendWhitespace(assistantPrefix, seperator) + `${db.username}:\n` + db.autoSuggestPrefix)
    } else {
        resultString.push(assistantPrefix + `${characterName}:`)
    }
    return resultString.join(seperator)
}

const userStrings = ["user", "human", "input", "inst", "instruction"]
function toTitleCase(s:string){
    return s[0].toUpperCase() + s.slice(1).toLowerCase()
}
export function getStopStrings(suggesting:boolean=false){
    const db = get(DataBase)
    let { userPrefix, seperator } = db.ooba.formating;
    if(!seperator){
        seperator = "\n"
    }
    const { username } = db
    const stopStrings = [
        "GPT4 User",
        "</s>",
        "<|end",
        "<|im_end",
        userPrefix,
        "\nYou ",
        `*${username}'`,
        `*${username} `,
        `\n${username} `,
        `${username}:`,
    ]
    if(seperator !== " "){
        stopStrings.push(seperator + username)
    }
    if(suggesting){
        stopStrings.push("\n\n")
    }
    if(!suggesting){
        stopStrings.push("*You ")
        stopStrings.push(" You ")
    }
    for (const user of userStrings){
        for (const u of [
            user.toLowerCase(),
            user.toUpperCase(),
            user.replace(/\w\S*/g, toTitleCase),
        ]){
            stopStrings.push(`${u}:`)
            stopStrings.push(`<<${u}>>`)
            stopStrings.push(`### ${u}`)
        }
    }
    return [...new Set(stopStrings)]
}

export function unstringlizeChat(text:string, formated:OpenAIChat[], char:string = ''){
    let minIndex = -1

    const chunks = getUnstringlizerChunks(formated, char).chunks


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

export function getUnstringlizerChunks(formated:OpenAIChat[], char:string, mode:'ain'|'normal' = 'normal'){
    let chunks:string[] = ["system note:", "system:","system note：", "system："]
    let charNames:string[] = []
    const db = get(DataBase)
    if(char){
        charNames.push(char)
        if(mode === 'ain'){
            chunks.push(`${char} `)
            chunks.push(`${char}　`)
        }
        else{
            chunks.push(`${char}:`)
            chunks.push(`${char}：`)
            chunks.push(`${char}: `)
            chunks.push(`${char}： `) 
        }
    }
    if(db.username){
        charNames.push(db.username)
        if(mode === 'ain'){
            chunks.push(`${db.username} `)
            chunks.push(`${db.username}　`)
        }
        else{
            chunks.push(`${db.username}:`)
            chunks.push(`${db.username}：`)
            chunks.push(`${db.username}: `)
            chunks.push(`${db.username}： `) 
        }
    }

    for(const form of formated){
        if(form.name){
            charNames.push(form.name)
            if(mode === 'ain'){
                if(!chunks.includes(`${form.name} `)){
                    chunks.push(`${form.name} `)
                    chunks.push(`${form.name}　`)
                }
            }
            else{
                if(!chunks.includes(`${form.name}:`)){
                    chunks.push(`${form.name}:`)
                    chunks.push(`${form.name}：`)
                    chunks.push(`${form.name}: `)
                    chunks.push(`${form.name}： `) 
                }
            }
        }
    }
    return {chunks,extChunk:charNames.concat(chunks)}
}

export function stringlizeAINChat(formated:OpenAIChat[], char:string = ''){
    let resultString:string[] = []
    const db = get(DataBase)

    for(const form of formated){
        console.log(form)
        if(form.memo && form.memo.startsWith("newChat") || form.content === "[Start a new chat]"){
            resultString.push("[新しいチャットの始まり]")
            continue
        }
        if(form.role === 'system'){
            resultString.push(form.content)
        }
        else if(form.role === 'user'){
            resultString.push(...formatToAIN(db.username, form.content))
        }
        else if(form.name || form.role === 'assistant'){
            resultString.push(...formatToAIN(form.name ?? char, form.content))
        }
        else{
            resultString.push(form.content)
        }
    }
    return resultString.join('\n\n') + `\n\n${char} 「`
}

function extractAINOutputStrings(inputString:string, characters:string[]) {
    let results:{
        content:string
        character:string
    }[] = [];
    
    let remainingString = inputString;
    
    while (remainingString.length > 0) {
        let characterIndex = -1;
        let character = null;
        for (let i = 0; i < characters.length; i++) {
        const index = remainingString.indexOf(characters[i] + '「');
        if (index >= 0 && (characterIndex == -1 || index < characterIndex)) {
            character = characters[i];
            characterIndex = index;
        }
        }
    
        if (characterIndex > 0) {
        results.push({content: remainingString.substring(0, characterIndex).trim(), character: '[narrator]'});
        }
    
        if (characterIndex == -1) {
            results.push({content: remainingString.trim(),  character: '[narrator]'});
            break;
        } else {
            let endQuoteIndex = remainingString.indexOf('」', characterIndex + character.length);
            if (endQuoteIndex == -1) {
                results.push({
                character, 
                content: remainingString.substring(characterIndex + character.length + 1).trim() // plus 1 to exclude 「
                });
                break;
            } else {
                results.push({
                character, 
                content: remainingString.substring(characterIndex + character.length + 1, endQuoteIndex).trim() // plus 1 to exclude 「
                });
                remainingString = remainingString.substring(endQuoteIndex + 1);
            }
        }
    }

    return results;
}

export function unstringlizeAIN(data:string,formated:OpenAIChat[], char:string = ''){

    const db = get(DataBase)
    const chunksResult = getUnstringlizerChunks(formated, char ,'ain')
    const chunks = chunksResult.chunks
    let result:['char'|'user',string][] = []
    data = `${char} 「` + data

    for(const n of chunksResult.extChunk){
        if(data.endsWith(n)){
            data = data.substring(0, data.length - n.length)
            console.log('trimed')
        }
    }

    const contents = extractAINOutputStrings(data, chunks)
    for(const cont of contents){
        if(cont.character === '[narrator]'){
            if(result.length === 0){
                result[0] = ['char', cont.content]
            }
            else{
                result[result.length - 1][1] += "\n" + cont.content
            }
        }
        else{
            const role = (cont.character.trim() ===  db.username ? 'user' : 'char')
            result.push([
                role,
                `「${cont.content}」`
            ])
        }
    }

    return result
}


function formatToAIN(name:string, content:string){
    function extractContent(str:string) {
        let result:{
            type: "outside"|"inside"
           content:string
        }[] = [];
        let lastEndIndex = 0;
        let regex = /「(.*?)」/g;
        let match:RegExpExecArray | null = null;

        
    
        while ((match = regex.exec(str)) !== null) {
            let start = match.index;
            let end = start + match[0].length;
            let inside = match[1];
            
            if (start != lastEndIndex) {
                let outside = str.slice(lastEndIndex, start);
                result.push({
                    type: "outside",
                    content: outside
                });
            }
    
            result.push({
                type: "inside",
                content: inside
            });
            
            lastEndIndex = end;
        }
    
        if (lastEndIndex < str.length) {
            let outside = str.slice(lastEndIndex);
            result.push({
                type: "outside",
                content: outside
            });
        }
        
        return result;
    }

    let quoteCounter = 0;
    content = content.replace(/"/g, () => {
        quoteCounter++;
        if (quoteCounter % 2 !== 0) {
            return '「';
        } else {
            return '」';
        }
    });

    const conts = extractContent(content)
    let strs:string[] = []
    for(const cont of conts){
        if(cont.type === 'inside'){
            strs.push(`${name} 「${cont.content}」`)
        }
        else{
            strs.push(cont.content)
        }
    }
    return strs
}
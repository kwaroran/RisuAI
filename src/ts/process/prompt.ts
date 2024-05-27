import { get } from "svelte/store";
import { tokenizeAccurate } from "../tokenizer";
import type { Database } from "../storage/database";

export type PromptItem = PromptItemPlain|PromptItemTyped|PromptItemChat|PromptItemAuthorNote;
export type PromptType = PromptItem['type'];
export type PromptSettings = {
    assistantPrefill: string
    postEndInnerFormat: string
    sendChatAsSystem: boolean
    sendName: boolean
    utilOverride: boolean
    customChainOfThought?: boolean
    maxThoughtTagDepth?: number
}

export interface PromptItemPlain {
    type: 'plain'|'jailbreak'|'cot';
    type2: 'normal'|'globalNote'|'main'
    text: string;
    role: 'user'|'bot'|'system';
}

export interface PromptItemTyped {
    type: 'persona'|'description'|'lorebook'|'postEverything'|'memory'
    innerFormat?: string
}

export interface PromptItemAuthorNote {
    type : 'authornote'
    innerFormat?: string
    defaultText?: string
}


export interface PromptItemChat {
    type: 'chat';
    rangeStart: number;
    rangeEnd: number|'end';
    chatAsOriginalOnSystem?: boolean;
}

export async function tokenizePreset(prompts:PromptItem[], consti:boolean = false){
    let total = 0
    for(const prompt of prompts){
        switch(prompt.type){
            case 'plain':
            case 'jailbreak':{
                total += await tokenizeAccurate(prompt.text, consti)
                break
            }
            case 'persona':
            case 'description':
            case 'lorebook':
            case 'postEverything':
            case 'authornote':
            case 'memory':{
                if(prompt.innerFormat){
                    total += await tokenizeAccurate(prompt.innerFormat, consti)
                }
                break
            }
        }
    }
    return total
}

export function getCustomToggles(template:string){
    if(!template){
        return []
    }

    const keyValue:[string, string][] = []

    for(const line of template.split('\n')){
        const [key, value] = line.split('=')
        if(key && value){
            keyValue.push([key, value])
        }
    }

    return keyValue
}
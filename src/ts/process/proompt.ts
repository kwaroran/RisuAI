import { tokenizeAccurate } from "../tokenizer";

export type Proompt = ProomptPlain|ProomptTyped|ProomptChat|ProomptAuthorNote;

export interface ProomptPlain {
    type: 'plain'|'jailbreak';
    type2: 'normal'|'globalNote'|'main'
    text: string;
    role: 'user'|'bot'|'system';
}

export interface ProomptTyped {
    type: 'persona'|'description'|'lorebook'|'postEverything'|'memory'
    innerFormat?: string
}

export interface ProomptAuthorNote {
    type : 'authornote'
    innerFormat?: string
    defaultText?: string
}


export interface ProomptChat {
    type: 'chat';
    rangeStart: number;
    rangeEnd: number|'end';
}

export async function tokenizePreset(proompts:Proompt[]){
    let total = 0
    for(const proompt of proompts){
        switch(proompt.type){
            case 'plain':
            case 'jailbreak':{
                total += await tokenizeAccurate(proompt.text)
                break
            }
            case 'persona':
            case 'description':
            case 'lorebook':
            case 'postEverything':
            case 'authornote':
            case 'memory':{
                if(proompt.innerFormat){
                    total += await tokenizeAccurate(proompt.innerFormat)
                }
                break
            }
        }
    }
    return total
}
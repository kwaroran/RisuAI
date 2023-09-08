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
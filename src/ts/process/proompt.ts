export type Proompt = ProomptPlain|ProomptTyped|ProomptChat;

export interface ProomptPlain {
    type: 'plain'|'jailbreak';
    type2: 'normal'|'globalNote'|'main'
    text: string;
    role: 'user'|'bot'|'system';
}

export interface ProomptTyped {
    type: 'persona'|'description'|'authornote'|'lorebook'|'postEverything'
    innerFormat?: string
}


export interface ProomptChat {
    type: 'chat';
    rangeStart: number;
    rangeEnd: number|'end';
}
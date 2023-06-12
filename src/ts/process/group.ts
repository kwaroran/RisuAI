import { shuffle } from "lodash";
import { findCharacterbyId } from "../util";
import { alertConfirm, alertError, alertSelectChar } from "../alert";
import { language } from "src/lang";
import { get } from "svelte/store";
import { DataBase, setDatabase } from "../storage/database";
import { selectedCharID } from "../stores";

export async function addGroupChar(){
    let db = get(DataBase)
    let selectedId = get(selectedCharID)
    let group = db.characters[selectedId]
    if(group.type === 'group'){
        const res = await alertSelectChar()
        if(res){
            if(group.characters.includes(res)){
                alertError(language.errors.alreadyCharInGroup)
            }
            else{
                if(await alertConfirm(language.askLoadFirstMsg)){
                    group.chats[group.chatPage].message.push({
                        role:'char',
                        data: findCharacterbyId(res).firstMessage,
                        saying: res,
                    })
                }

                group.characters.push(res)
                group.characterTalks.push(1 / 6 * 4)
                group.characterActive.push(true)
            }
        }
        setDatabase(db)
    }
}


export function rmCharFromGroup(index:number){
    let db = get(DataBase)
    let selectedId = get(selectedCharID)
    let group = db.characters[selectedId]
    if(group.type === 'group'){
        group.characters.splice(index, 1)
        group.characterTalks.splice(index, 1)
        group.characterActive.splice(index, 1)

        setDatabase(db)
    }
}

export type GroupOrder = {
    id: string,
    talkness: number,
    index: number
}

export function groupOrder(chars:GroupOrder[], input:string):GroupOrder[] {
    let order:GroupOrder[] = [];
    let ids:string[] = []
    if (input) {
        const words = getWords(input)

        for (const word of words) {
            for (let char of chars) {
                const charNameChunks = getWords(findCharacterbyId(char.id).name)

                if (charNameChunks.includes(word)) {
                    order.push(char);
                    ids.push(char.id)
                    break;
                }
            }
        }
    }

    const shuffled = shuffle(chars)
    for (const char of shuffled) {
        if(ids.includes(char.id)){
            continue
        }

        const chance = char.talkness ?? 0.5

        if (chance >= Math.random()) {
            order.push(char);
            ids.push(char.id)
        }
    }

    while (order.length === 0) {
        order.push(chars[Math.floor(Math.random() * chars.length)]);
    }

    return order;
}

function getWords(data:string){
    const matches =  data.split(/\n| /g)
    let words:string[] = []
    if(!matches){
        return [data]
    }
    for(const match of matches){
        words.push(match.toLocaleLowerCase())
    }
    return words
}
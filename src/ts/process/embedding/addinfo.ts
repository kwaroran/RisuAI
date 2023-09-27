import { DataBase, type Chat, type character } from "src/ts/storage/database";
import { HypaProcesser } from '../memory/hypamemory'
import type { OpenAIChat } from "..";
import { stringlizeChat } from "../stringlize";
import { get } from "svelte/store";

export async function additionalInformations(char: character,chats:Chat,){
    const processer = new HypaProcesser('MiniLM')
    const db = get(DataBase)

    const info = char.additionalText
    if(info){
        const infos = info.split('\n\n')

        await processer.addText(infos)
        const filteredChat = chats.message.slice(0, 4).map((chat) => {
            let name = chat.saying ?? ''

            if(!name){
                if(chat.role === 'user'){
                    name = db.username
                }
                else{
                    name = char.name
                }
            }

            return `${name}: ${chat.data}`
        }).join("\n\n")
        const searched = await processer.similaritySearch(filteredChat)
        const result = searched.slice(0,3).join("\n\n")
        return result
    }

    return ''

}
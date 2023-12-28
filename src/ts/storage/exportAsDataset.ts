import { get } from "svelte/store";
import { DataBase } from "./database";
import { downloadFile } from "./globalApi";
import { alertNormal } from "../alert";
import { language } from "src/lang";

export async function exportAsDataset(){
    const db = get(DataBase)

    let dataset = []
    for(const char of db.characters){
        if(char.type === 'group'){
            continue
        }
        for(const chat of char.chats){
            
            dataset.push({
                character: char.name,
                description: char.desc,
                chats: chat.message,
            })
        }
    }

    await downloadFile('dataset.json',Buffer.from(JSON.stringify(dataset, null,4), 'utf-8'))

    alertNormal(language.successExport)
    
}
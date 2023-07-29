import { DataBase, setPreset, type botPreset, setDatabase } from "src/ts/storage/database";
import { get } from "svelte/store";
import { prebuiltNAIpresets, prebuiltPresets } from "./templates";
import { alertConfirm, alertSelect } from "src/ts/alert";
import { language } from "src/lang";

export async function setRecommended(model: string, ask:'ask'|'force') {
    const db = get(DataBase)
    if(!(recommendedPresetExist(model))){
        return
    }
    if(ask === 'ask' && db.toggleConfirmRecommendedPreset){
        const conf = await alertConfirm(language.confirmRecommendedPreset)
        if(!conf){
            return
        }
    }
    db.aiModel = model
    if(db.aiModel.startsWith('gpt') || db.aiModel === 'openrouter' || db.aiModel === 'reverse_proxy'){
        const pr:botPreset = prebuiltPresets.OAI
        setDatabase(setPreset(db, pr))
    }
    else if(db.aiModel.startsWith('novelai')){
        const pr:botPreset = prebuiltPresets.OAI
        pr.NAISettings = prebuiltNAIpresets
        pr.formatingOrder = [
            "main",
            "personaPrompt",
            "description",
            "jailbreak",
            "chats",
            "globalNote",
            "authorNote",
            "lorebook",
            "lastChat"
        ]
        pr.temperature = 105
        pr.maxContext = 8000
        pr.maxResponse = 300
        pr.mainPrompt = ""
        pr.jailbreak = ''
        pr.globalNote = '***\n[ Style: chat; Tags: conversation; Genre: online roleplay]'
        setDatabase(setPreset(db, pr))
    }
    else if(db.aiModel === 'textgen_webui'){
        const sel = parseInt(await alertSelect(["Llama, Alpaca", "Koala", "Vicuna", "WizardLM", "Others"]))
        let pr = prebuiltPresets.ooba
        switch(sel){
            case 0:{ //Llama
                pr.mainPrompt = "Below is an instruction that describes a task. Write a response that appropriately completes the request.\n\nWrite {{char}}'s next reply in a fictional roleplay chat between {{user}} and {{char}}."
                pr.ooba.formating.userPrefix = "### Instruction: "
                pr.ooba.formating.assistantPrefix = "### Response: "
                break
            }
            case 1:{ //Koala
                pr.mainPrompt = "BEGINNING OF CONVERSATION: Write {{char}}'s next reply in a fictional roleplay chat between {{user}} and {{char}}."
                pr.ooba.formating.userPrefix = "USER: "
                pr.ooba.formating.assistantPrefix = "GPT: "
                break
            }
            case 2:{ //Vicuna
                pr.mainPrompt = "BEGINNING OF CONVERSATION: A chat between a curious user and an artificial intelligence assistant. The assistant gives helpful, detailed, and polite answers to the user's questions.\n\nWrite {{char}}'s next reply in a fictional roleplay chat between {{user}} and {{char}}."
                pr.ooba.formating.userPrefix = "USER: "
                pr.ooba.formating.assistantPrefix = "ASSISTANT: "
                pr.ooba.formating.seperator = '</s>'
                break
            }
            case 3:{ //WizardLM
                pr.mainPrompt = "A chat between a curious user and an artificial intelligence assistant. The assistant gives helpful, detailed, and polite answers to the user's questions.\n\nWrite {{char}}'s next detailed reply in a fictional roleplay chat between {{user}} and {{char}}."
                pr.ooba.formating.userPrefix = "USER: "
                pr.ooba.formating.assistantPrefix = "ASSISTANT: "
                break
            }
            default:{
                pr.mainPrompt = "Write {{char}}'s next reply in a fictional roleplay chat between {{user}} and {{char}}."
                break
            }
        }
        setDatabase(setPreset(db, pr))
    }

}

export function recommendedPresetExist(model:string){
    return model.startsWith('gpt') || model === 'openrouter' || model === 'reverse_proxy' || model === 'textgen_webui' || model.startsWith('novelai')
}
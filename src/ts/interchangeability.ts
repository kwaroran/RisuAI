import { v4 } from 'uuid';
import type { RisuModule} from './process/modules.ts'
import type { character, RisuPersona } from './storage/database.svelte.js';
import { createBlankChar } from "src/ts/characters";

export function convertModuleToCharacter(m: RisuModule): character {
    const char = createBlankChar()

    if(m.mcp){
        throw new Error("MCP modules are not supported for character conversion.")
    }

    char.name = m.name
    char.creatorNotes = m.description
    char.globalLore = safeStructuredClone(m.lorebook || [])
    char.customscript = m.regex || []
    char.triggerscript = m.trigger || []
    char.lowLevelAccess = m.lowLevelAccess || false
    char.hideChatIcon = m.hideIcon || false
    char.backgroundHTML = m.backgroundEmbedding || ""
    char.additionalAssets = m.assets || []
    char.moduleNamespace = m.namespace
    char.customModuleToggle = m.customModuleToggle || ""
    char.image = m.icon || ""

    for(let i = 0; i < char.globalLore.length; i++){
        const lore = safeStructuredClone(char.globalLore[i])
        if(lore.content.startsWith('@@indicator replace_global_note') || lore.content.startsWith('@@indicator phi')){
            // Backward compat: pre-rename modules stored global notes under the '@@indicator phi' marker
            char.replaceGlobalNote = lore.content.replace(/^@@indicator\s+(?:replace_global_note|phi)/, '').trim()
            char.globalLore.splice(i, 1)
            i--
        }
        if(lore.content.startsWith('@@indicator character_desc')){
            char.desc = lore.content.replace('@@indicator character_desc', '').trim()
            char.globalLore.splice(i, 1)
            i--
        }
        if(lore.content.startsWith('@@indicator character_first_message')){
            const firstMsgContent = lore.content.replace('@@indicator character_first_message', '').trim()
            const fmMatch = firstMsgContent.match(/<FM>([\s\S]*?)<\/FM>/)
            if(fmMatch){
                char.firstMessage = fmMatch[1].trim()
            }
            const altFmMatches = [...firstMsgContent.matchAll(/<FM_alt>([\s\S]*?)<\/FM_alt>/g)]
            char.alternateGreetings = altFmMatches.map(m => m[1].trim())
            char.globalLore.splice(i, 1)
            i--
        }
    }

    return safeStructuredClone(char)
}

export function convertCharacterToModule(c: character): RisuModule {
    const mod: RisuModule = {
        name: c.name,
        description: c.creatorNotes,
        lorebook: c.globalLore,
        regex: c.customscript,
        trigger: c.triggerscript,
        lowLevelAccess: c.lowLevelAccess,
        hideIcon: c.hideChatIcon,
        backgroundEmbedding: c.backgroundHTML,
        assets: c.additionalAssets,
        namespace: c.moduleNamespace,
        customModuleToggle: c.customModuleToggle,
        id: v4(),
        icon: c.image
    }
    mod.lorebook = safeStructuredClone(mod.lorebook || [])


    if(c.desc){
        mod.lorebook.push({
            key: "",
            secondkey: "",
            insertorder: 0,
            comment: "From Character Description",
            content: `@@indicator character_desc\n\n${c.desc}`,
            mode: 'constant',
            alwaysActive: true,
            selective: false
        })
    }

    if(c.firstMessage || (c.alternateGreetings && c.alternateGreetings.length > 0)){
        let firstMessages = `<FM>\n${c.firstMessage}\n</FM>`
        c.alternateGreetings ??= []
        for(let i = 0; i < c.alternateGreetings.length; i++){
            firstMessages += `\n<FM_alt>\n${c.alternateGreetings[i]}\n</FM_alt>`
        }
        
        mod.lorebook.push({
            key: "",
            secondkey: "",
            insertorder: 0,
            comment: "From First Messages",
            content: `@@indicator character_first_message\n\n${firstMessages}`,
            mode: 'constant',
            alwaysActive: false,
            selective: false
        })
    }

    if(c.replaceGlobalNote){
        mod.lorebook.push({
            key: "",
            secondkey: "",
            insertorder: 0,
            comment: "From Global Note Replacement",
            content: `@@indicator replace_global_note\n\n${c.replaceGlobalNote}`,
            mode: 'constant',
            alwaysActive: true,
            selective: false
        })
    }

    return safeStructuredClone(mod)
}

export function convertPersonaToCharacter(p: RisuPersona): character {
    let char = createBlankChar()

    if(p.embeddedModule){
        char = convertModuleToCharacter(p.embeddedModule)
    }
    char.name = p.name
    char.image = p.icon
    char.largePortrait = p.largePortrait || false
    char.creatorNotes = p.note || ""
    char.desc = p.personaPrompt
    return safeStructuredClone(char)
}

export function convertCharacterToPersona(c: character): RisuPersona {
    const p: RisuPersona = {
        name: c.name,
        icon: c.image,
        personaPrompt: c.desc,
        note: c.creatorNotes,
        embeddedModule: convertCharacterToModule(c)
    }
    return safeStructuredClone(p)
}

export function convertPersonaToModule(p: RisuPersona): RisuModule {
    let baseModule: RisuModule = {
        name: "",
        description: "",
        id: v4()
    }
    
    if(p.embeddedModule){
        baseModule = safeStructuredClone(p.embeddedModule)
    }

    baseModule.name = p.name
    baseModule.description = p.note || ""
    baseModule.lorebook = [{
        key:"",
        secondkey:"",
        insertorder: 0,
        comment: "From Persona Prompt",
        content: `@@indicator persona\n\n${p.personaPrompt}`,
        mode: 'constant',
        alwaysActive: true,
        selective: false
    }]

    return baseModule
}

export function convertModuleToPersona(m: RisuModule): RisuPersona {
    let basePersona: RisuPersona = {
        name: "",
        icon: "",
        personaPrompt: "",
        embeddedModule: safeStructuredClone(m)
    }

    basePersona.name = m.name
    basePersona.embeddedModule.lorebook ??= []
    basePersona.embeddedModule.lorebook = basePersona?.embeddedModule?.lorebook?.filter((a) => {
        if(a.content.startsWith('@@indicator persona')){
            basePersona.personaPrompt = a.content.replace('@@indicator persona', '').trim()
            return false
        }
        return true
    })
    basePersona.embeddedModule.id = '$embedded'
    return safeStructuredClone(basePersona)
}

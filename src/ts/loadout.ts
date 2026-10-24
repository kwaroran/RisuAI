import { changeUserPersona } from "./persona"
import { changeToPreset, getCurrentCharacter } from "./storage/database.svelte"
import { DBState } from "./stores.svelte"

export type Loadout = {
    name: string
    id: string
    lastUsed: number
    favorite: boolean
    characterIds: string[]
    modules: string[]
    globalVariables: {[key:string]:string}
    presetName: string
    personaId: string
    icons?:string[]
    hypaV3PresetName: string
}

export function makeLoadout(options:{
    name: string
}): Loadout {
    const character = getCurrentCharacter()
    const id = crypto.randomUUID()
    const preset = DBState.db.botPresets[DBState.db.botPresetsId]
    const icons = []

    if(character?.image){
        icons.push(character.image)
    }

    return safeStructuredClone({
        name: options.name,
        id: id,
        lastUsed: Date.now(),
        favorite: false,
        characterIds: character ? [character.chaId] : [],
        modules: DBState.db.enabledModules,
        globalVariables: DBState.db.globalChatVariables,
        presetName: preset.name ?? '',
        personaId: DBState.db.personas[DBState.db.selectedPersona]?.id,
        icons: icons,
        hypaV3PresetName: DBState.db.hypaV3 ? DBState.db.hypaV3Presets?.[DBState.db.hypaV3PresetId]?.name ?? '' : ''
    });
}

type LoadoutApplyOption = 'modules' | 'globalVariables' | 'preset' | 'persona' | 'hypaV3Preset'

export function applyLoadout(loadout: Loadout, apply:LoadoutApplyOption[] = [
    'modules',
    'globalVariables',
    'preset',
    'persona',
    'hypaV3Preset'
]) {
    loadout.lastUsed = Date.now()
    loadout.characterIds.push(getCurrentCharacter()?.chaId)
    if(apply.includes('persona')) {
        let personaIndex = DBState.db.personas?.findIndex(p => p.id === loadout.personaId)
        if(personaIndex !== -1){
            changeUserPersona(personaIndex)
        }
    }
    if(apply.includes('preset')) {
        let presetIndex = DBState.db.botPresets?.findIndex(p => p.name === loadout.presetName)
        if(presetIndex !== -1){
            changeToPreset(presetIndex)
        }
    }
    if(apply.includes('modules')) {
        DBState.db.enabledModules = loadout.modules
    }
    if(apply.includes('globalVariables')) {
        DBState.db.globalChatVariables = loadout.globalVariables
    }
    if(DBState.db.hypaV3 && apply.includes('hypaV3Preset')) {
        let presetIndex = DBState.db.hypaV3Presets?.findIndex(p => p.name === loadout.hypaV3PresetName)
        if(presetIndex >= 0){
            DBState.db.hypaV3PresetId = presetIndex
        }
    }
    DBState.db.lastLoadedLoadoutName = loadout.name
}

export function saveCurrentLoadout(name: string) {
    const loadout = makeLoadout({name})
    DBState.db.loadouts.push(loadout)
    return loadout
}

export function exportLoadout(loadout: Loadout) {
    //TODO
}

export function importLoadout() {
    //TODO
}

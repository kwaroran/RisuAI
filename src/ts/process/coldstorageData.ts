import { safeStructuredClone } from "../polyfill"
import type { Database, character, groupChat } from "../storage/database.svelte"

export const coldStorageHeader = '\uEF01COLDSTORAGE\uEF01'

export function getColdStorageBackupKey(name: string): string | null {
    const match = name.match(/^(?:coldstorage[/_])?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\.json$/)
    return match?.[1] ?? null
}

export function getColdStorageBackupName(key: string): string {
    return `coldstorage_${key}.json`
}

export function isColdStorageBackupData(data: unknown): boolean {
    if (Array.isArray(data)) {
        return true
    }

    return !!data
        && typeof data === 'object'
        && ('character' in data || 'message' in data)
}

function replaceData(data: string | undefined, replacer: { [key: string]: string }) {
    if (!data) {
        return data
    }
    return replacer[data] ?? data
}

function replaceCharacterResources(cha: character | groupChat, replacer: { [key: string]: string }) {
    cha.image = replaceData(cha.image, replacer)

    if (cha.emotionImages) {
        for (let i = 0; i < cha.emotionImages.length; i++) {
            cha.emotionImages[i][1] = replaceData(cha.emotionImages[i][1], replacer)
        }
    }

    if (cha.type !== 'group' && cha.additionalAssets) {
        for (let i = 0; i < cha.additionalAssets.length; i++) {
            cha.additionalAssets[i][1] = replaceData(cha.additionalAssets[i][1], replacer)
        }
    }
}

export function replaceColdStoragePayloadResources(data: unknown, replacer: { [key: string]: string }): unknown {
    if (
        !data
        || typeof data !== 'object'
        || !('character' in data)
        || !data.character
        || typeof data.character !== 'object'
    ) {
        return data
    }

    const cloned = safeStructuredClone(data) as { character: character | groupChat }
    replaceCharacterResources(cloned.character, replacer)
    return cloned
}

function listColdDataKeysFromCharacter(character: character | groupChat): string[] {
    const keys: string[] = []
    if (character.coldstorage) {
        keys.push(character.coldstorage)
        keys.push(...(character.coldStoragedChats ?? []))
    }
    for (const chat of character.chats ?? []) {
        const firstMessage = chat.message?.[0]
        if (firstMessage?.data?.startsWith(coldStorageHeader)) {
            keys.push(firstMessage.data.slice(coldStorageHeader.length))
        }
    }
    return keys
}

export function listColdDataKeysFromDb(db: Pick<Database, 'characters'|'pluginCustomStorage'> | null | undefined): string[] {
    const keys = new Set<string>()
    for (const character of db?.characters ?? []) {
        if (!character) {
            continue
        }
        for (const key of listColdDataKeysFromCharacter(character)) {
            keys.add(key)
        }
    }

    const coldPluginStorageKeys = (Object.values((db?.pluginCustomStorage?._coldplugin as {[key:string]:string}) ?? {}))

    for(const key of coldPluginStorageKeys){
        keys.add(key)
    }

    return Array.from(keys)
}

export function getColdStorageAffectedCharacters(
    db: Pick<Database, 'characters'> | null | undefined,
    unavailableKeys: Iterable<string>,
): {
    characterNames: string[]
    unresolvedKeys: string[]
} {
    const targetKeys = new Set(unavailableKeys)
    const resolvedKeys = new Set<string>()
    const characterNames: string[] = []

    for (const character of db?.characters ?? []) {
        if (!character) {
            continue
        }

        let isAffected = false
        for (const key of listColdDataKeysFromCharacter(character)) {
            if (targetKeys.has(key)) {
                resolvedKeys.add(key)
                isAffected = true
            }
        }

        if (isAffected) {
            characterNames.push(character.name?.trim() || character.chaId || 'Unknown character')
        }
    }

    return {
        characterNames,
        unresolvedKeys: Array.from(targetKeys).filter((key) => !resolvedKeys.has(key)),
    }
}

import { describe, expect, it } from 'vitest'
import {
    coldStorageHeader,
    getColdStorageAffectedCharacters,
    getColdStorageBackupKey,
    getColdStorageBackupName,
    isColdStorageBackupData,
    isValidColdStorageItem,
    listColdDataKeysFromDb,
    listPluginStorageColdKeys,
    replaceColdStoragePayloadResources,
} from './coldstorageData'

describe('coldstorageData', () => {
    it('collects unique character and chat cold storage keys from a database snapshot', () => {
        const characterKey = '11111111-1111-1111-1111-111111111111'
        const chatKey = '22222222-2222-2222-2222-222222222222'
        const nestedChatKey = '33333333-3333-3333-3333-333333333333'

        const keys = listColdDataKeysFromDb({
            characters: [
                {
                    coldstorage: characterKey,
                    coldStoragedChats: [chatKey, chatKey],
                    chats: [
                        {
                            message: [{
                                data: coldStorageHeader + nestedChatKey,
                            }],
                        },
                    ],
                },
                {
                    chats: [
                        {
                            message: [{
                                data: coldStorageHeader + chatKey,
                            }],
                        },
                    ],
                },
            ],
        } as any)

        expect(keys).toEqual([characterKey, chatKey, nestedChatKey])
    })

    it('maps unavailable cold storage keys to affected character names', () => {
        const characterKey = '11111111-1111-1111-1111-111111111111'
        const storedChatKey = '22222222-2222-2222-2222-222222222222'
        const activeChatKey = '33333333-3333-3333-3333-333333333333'
        const unknownKey = '44444444-4444-4444-4444-444444444444'

        const affected = getColdStorageAffectedCharacters({
            characters: [
                {
                    name: 'Stored Bot',
                    chaId: 'stored-bot',
                    coldstorage: characterKey,
                    coldStoragedChats: [storedChatKey],
                    chats: [],
                },
                {
                    name: 'Active Bot',
                    chaId: 'active-bot',
                    chats: [{
                        message: [{
                            data: coldStorageHeader + activeChatKey,
                        }],
                    }],
                },
                {
                    name: 'Healthy Bot',
                    chaId: 'healthy-bot',
                    chats: [],
                },
            ],
        } as any, [characterKey, storedChatKey, activeChatKey, unknownKey])

        expect(affected).toEqual({
            characterNames: ['Stored Bot', 'Active Bot'],
            unresolvedKeys: [unknownKey],
        })
    })

    it('uses the character id when an affected skeleton has no name', () => {
        const characterKey = '11111111-1111-1111-1111-111111111111'

        const affected = getColdStorageAffectedCharacters({
            characters: [{
                name: ' ',
                chaId: 'fallback-character-id',
                coldstorage: characterKey,
                chats: [],
            }],
        } as any, [characterKey])

        expect(affected.characterNames).toEqual(['fallback-character-id'])
        expect(affected.unresolvedKeys).toEqual([])
    })

    it('recognizes supported cold storage backup names', () => {
        const key = '11111111-1111-1111-1111-111111111111'

        expect(getColdStorageBackupName(key)).toBe(`coldstorage_${key}.json`)
        expect(getColdStorageBackupKey(`coldstorage_${key}.json`)).toBe(key)
        expect(getColdStorageBackupKey(`coldstorage/${key}.json`)).toBe(key)
        expect(getColdStorageBackupKey(`${key}.json`)).toBe(key)
        expect(getColdStorageBackupKey('assets/profile.png')).toBeNull()
    })

    it('accepts character, message, and legacy array cold storage payloads', () => {
        expect(isColdStorageBackupData({ character: {} })).toBe(true)
        expect(isColdStorageBackupData({ message: [] })).toBe(true)
        expect(isColdStorageBackupData([])).toBe(true)
        expect(isColdStorageBackupData({ nope: true })).toBe(false)
        expect(isColdStorageBackupData(null)).toBe(false)
    })

    it('accepts any JSON value for pluginStorage items but keeps character validation otherwise', () => {
        for (const value of [0, '', false, null, 'text', 42, { theme: 'dark' }, [1, 2]]) {
            expect(isValidColdStorageItem(value, true)).toBe(true)
        }
        expect(isValidColdStorageItem(undefined, true)).toBe(false)
        expect(isValidColdStorageItem('text', false)).toBe(false)
        expect(isValidColdStorageItem({ character: {} }, false)).toBe(true)
    })

    it('lists pluginStorage cold keys and includes them in database cold keys', () => {
        const pluginKey = '44444444-4444-4444-4444-444444444444'
        const db = {
            characters: [],
            pluginCustomStorage: {
                legacyInline: 'value',
                _coldplugin: { prefs: pluginKey, broken: 123 },
            },
        } as any

        expect(listPluginStorageColdKeys(db)).toEqual([pluginKey])
        expect(listColdDataKeysFromDb(db)).toEqual([pluginKey])
        expect(listPluginStorageColdKeys({ pluginCustomStorage: { _coldplugin: 'corrupt' } } as any)).toEqual([])
        expect(listPluginStorageColdKeys(null)).toEqual([])
    })

    it('rewrites character cold storage asset references without mutating the original payload', () => {
        const payload = {
            character: {
                type: 'character',
                image: 'assets/local-main.png',
                emotionImages: [
                    ['neutral', 'assets/local-neutral.png'],
                    ['happy', 'assets/local-happy.png'],
                ],
                additionalAssets: [
                    ['prop', 'assets/local-prop.png'],
                ],
            },
        }

        const rewritten = replaceColdStoragePayloadResources(payload, {
            'assets/local-main.png': 'assets/account-main.png',
            'assets/local-neutral.png': 'assets/account-neutral.png',
            'assets/local-prop.png': 'assets/account-prop.png',
        }) as typeof payload

        expect(rewritten.character.image).toBe('assets/account-main.png')
        expect(rewritten.character.emotionImages[0][1]).toBe('assets/account-neutral.png')
        expect(rewritten.character.emotionImages[1][1]).toBe('assets/local-happy.png')
        expect(rewritten.character.additionalAssets[0][1]).toBe('assets/account-prop.png')
        expect(payload.character.image).toBe('assets/local-main.png')
        expect(payload.character.emotionImages[0][1]).toBe('assets/local-neutral.png')
        expect(payload.character.additionalAssets[0][1]).toBe('assets/local-prop.png')
    })

    it('leaves non-character cold storage payloads unchanged', () => {
        const payload = { message: [{ data: 'assets/local.png' }] }

        expect(replaceColdStoragePayloadResources(payload, {
            'assets/local.png': 'assets/account.png',
        })).toBe(payload)
    })
})

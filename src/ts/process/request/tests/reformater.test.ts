import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    db: {
        systemContentReplacement: '',
        systemRoleReplacement: '',
    },
}))

vi.mock('src/ts/storage/database.svelte', () => ({
    getCurrentCharacter: vi.fn(),
    getCurrentChat: vi.fn(),
    getDatabase: () => mocks.db,
}))

vi.mock('src/ts/model/modellist', async () => {
    const { LLMFlags, LLMFormat } = await import('src/ts/model/types')
    return {
        getModelInfo: vi.fn(),
        LLMFlags,
        LLMFormat,
    }
})

vi.mock('src/ts/plugins/plugins.svelte', () => ({
    pluginProcess: vi.fn(),
    pluginV2: {
        providers: new Map(),
        replacerbeforeRequest: new Set(),
    },
}))

vi.mock('src/ts/parser/parser.svelte', () => ({
    risuChatParser: vi.fn(),
    risuEscape: (value: string) => value,
    risuUnescape: (value: string) => value,
}))

vi.mock('src/ts/globalApi.svelte', () => ({
    fetchNative: vi.fn(),
    globalFetch: vi.fn(),
}))

import { LLMFlags } from 'src/ts/model/types'
import { reformater } from '../request'

describe('reformater cache points', () => {
    it('does not merge a later message past a cache point', () => {
        const messages = [
            { role: 'user' as const, content: 'stable prefix', cachePoint: true },
            { role: 'user' as const, content: 'changing suffix' },
        ]

        expect(reformater(messages, [LLMFlags.requiresAlternateRole])).toEqual([
            { role: 'user', content: 'stable prefix', cachePoint: true },
            { role: 'user', content: 'changing suffix' },
        ])
    })

    it('keeps a cache point after the marked message when merging same-role messages', () => {
        const messages = [
            { role: 'user' as const, content: 'stable prefix part 1' },
            { role: 'user' as const, content: 'stable prefix part 2', cachePoint: true },
            { role: 'user' as const, content: 'changing suffix' },
        ]

        expect(reformater(messages, [LLMFlags.requiresAlternateRole])).toEqual([
            {
                role: 'user',
                content: 'stable prefix part 1\nstable prefix part 2',
                cachePoint: true,
            },
            { role: 'user', content: 'changing suffix' },
        ])
    })

    it('does not merge a later system message past a cache point', () => {
        const messages = [
            { role: 'system' as const, content: 'stable system prompt', cachePoint: true },
            { role: 'system' as const, content: 'changing system prompt' },
            { role: 'user' as const, content: 'chat message' },
        ]

        expect(reformater(messages, [LLMFlags.hasFirstSystemPrompt])).toEqual([
            { role: 'system', content: 'stable system prompt', cachePoint: true },
            { role: 'user', content: 'system: changing system prompt' },
            { role: 'user', content: 'chat message' },
        ])
    })

    it('preserves a cache point while collecting leading system messages', () => {
        const messages = [
            { role: 'system' as const, content: 'stable system prompt part 1' },
            { role: 'system' as const, content: 'stable system prompt part 2', cachePoint: true },
            { role: 'system' as const, content: 'changing system prompt' },
            { role: 'user' as const, content: 'chat message' },
        ]

        expect(reformater(messages, [LLMFlags.hasFirstSystemPrompt])).toEqual([
            {
                role: 'system',
                content: 'stable system prompt part 1\n\nstable system prompt part 2',
                cachePoint: true,
            },
            { role: 'user', content: 'system: changing system prompt' },
            { role: 'user', content: 'chat message' },
        ])
    })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LLMFlags, LLMFormat, LLMProvider, LLMTokenizer } from 'src/ts/model/types'

const mocks = vi.hoisted(() => ({
    db: {
        aiModel: 'pluginmodel:::TestProvider',
        subModel: 'pluginmodel:::TestProvider',
        fallbackModels: {},
        requestRetrys: 2,
        maxResponse: 300,
        temperature: 80,
        useStreaming: false,
        genTime: 1,
    },
    provider: vi.fn(),
}))

vi.mock('src/ts/storage/database.svelte', () => ({
    getDatabase: () => mocks.db,
    // a group chat skips the request trigger, keeping the test on the retry loop
    getCurrentCharacter: () => ({ type: 'group' }),
    getCurrentChat: () => ({}),
}))

vi.mock('src/ts/plugins/plugins.svelte', () => ({
    pluginProcess: vi.fn(),
    pluginV2: {
        providers: new Map([['TestProvider', mocks.provider]]),
        replacerbeforeRequest: new Set(),
        replacerafterRequest: new Set(),
    },
}))

vi.mock('src/ts/model/modellist', async () => ({
    ...(await import('src/ts/model/types')),
    getModelInfo: (id: string) => ({
        id,
        name: 'TestProvider',
        internalID: id,
        provider: LLMProvider.AsIs,
        format: LLMFormat.Plugin,
        flags: [LLMFlags.hasFullSystemPrompt],
        parameters: [],
        tokenizer: LLMTokenizer.Unknown,
    }),
}))

vi.mock('src/ts/process/request/shared', () => ({
    applyParameters: (data: unknown) => data,
    applyAdditionalParameters: vi.fn(),
    getAdditionalParameters: vi.fn(),
}))

vi.mock('src/ts/process/triggers', () => ({ runTrigger: vi.fn() }))

vi.mock('src/ts/parser/parser.svelte', () => ({
    risuChatParser: (text: string) => text,
    risuEscape: (text: string) => text,
    risuUnescape: (text: string) => text,
}))

import { requestChatData } from '../request'

function request() {
    return requestChatData({
        formated: [{ role: 'user', content: 'hello' }],
        bias: {},
        tools: [],
    }, 'model')
}

describe('plugin provider failures', () => {
    beforeEach(() => {
        mocks.provider.mockReset()
    })

    it('is called once when a failed result sets noRetry', async () => {
        mocks.provider.mockResolvedValue({ success: false, content: 'invalid request', noRetry: true })

        const res = await request()

        expect(mocks.provider).toHaveBeenCalledTimes(1)
        expect(res).toMatchObject({ type: 'fail', result: 'invalid request' })
    })

    it('is retried up to requestRetrys when a failed result does not set noRetry', async () => {
        mocks.provider.mockResolvedValue({ success: false, content: 'temporary error' })

        const res = await request()

        expect(mocks.provider).toHaveBeenCalledTimes(mocks.db.requestRetrys + 1)
        expect(res).toMatchObject({ type: 'fail', result: 'temporary error' })
    })
})

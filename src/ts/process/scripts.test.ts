import { describe, it, expect, vi, beforeEach } from 'vitest'

//#region module mocks — processScriptFull pulls in browser-heavy modules

vi.mock(import('../parser/parser.svelte'), () => ({
    assetRegex: /{{(raw|img|image|video|audio|bg|emotion|asset|video-img|source|inlay|inlayed|inlayeddata)::(.+?)}}/g,
    risuChatParser: vi.fn((v: string) => v.replaceAll('{{marker}}', 'PARSED')),
}) as unknown as typeof import('../parser/parser.svelte'))

vi.mock(import('../storage/database.svelte'), () => ({
    getDatabase: () => ({ presetRegex: [], characters: [], dynamicAssets: false }),
    getCurrentCharacter: () => ({ type: 'character', chats: [{ message: [] }], chatPage: 0 }),
    getCurrentChat: () => ({ message: [] }),
}) as unknown as typeof import('../storage/database.svelte'))

vi.mock(import('../stores.svelte'), async () => {
    const { writable } = await import('svelte/store')
    return {
        CharEmotion: writable({}),
        selectedCharID: writable(0),
    } as unknown as typeof import('../stores.svelte')
})

vi.mock(import('../globalApi.svelte'), () => ({
    downloadFile: async () => {},
}) as unknown as typeof import('../globalApi.svelte'))

vi.mock(import('../alert'), () => ({
    alertError: () => {},
    alertNormal: () => {},
}) as unknown as typeof import('../alert'))

vi.mock(import('src/lang'), () => ({
    language: { successExport: '' },
}) as unknown as typeof import('src/lang'))

vi.mock(import('../util'), () => ({
    selectSingleFile: async () => ({ data: null }),
}) as unknown as typeof import('../util'))

vi.mock(import('./modules'), () => ({
    getModuleAssets: () => [],
    getModuleRegexScripts: () => [],
}) as unknown as typeof import('./modules'))

vi.mock(import('./memory/hypamemory'), () => ({
    HypaProcesser: class {
        async addText() {}
        async similaritySearch() { return [] }
    },
}) as unknown as typeof import('./memory/hypamemory'))

vi.mock(import('./scriptings'), () => ({
    runLuaEditTrigger: async (_char: unknown, _mode: unknown, data: unknown) => data,
}) as unknown as typeof import('./scriptings'))

vi.mock(import('../plugins/plugins.svelte'), () => ({
    pluginV2: {
        editinput: new Set(),
        editoutput: new Set(),
        editprocess: new Set(),
        editdisplay: new Set(),
    },
}) as unknown as typeof import('../plugins/plugins.svelte'))

vi.mock(import('./triggers'), () => ({
    runTrigger: async () => null,
}) as unknown as typeof import('./triggers'))

//#endregion

import { risuChatParser } from '../parser/parser.svelte'
import { processScriptFull, resetScriptCache } from './scripts'

const parserMock = vi.mocked(risuChatParser)

type Script = {
    comment: string
    in: string
    out: string
    type: string
    flag?: string
    ableFlag?: boolean
}

const makeChar = (scripts: Script[]) => ({
    type: 'simple',
    chaId: 'test-char',
    customscript: scripts,
}) as any

describe('processScriptFull CBS reparse gating', () => {
    beforeEach(() => {
        resetScriptCache()
        parserMock.mockClear()
    })

    it('parses input once when no script matches', async () => {
        const scripts: Script[] = Array.from({ length: 5 }, (_, i) => ({
            comment: `s${i}`,
            in: `never-matches-${i}`,
            out: 'x',
            type: 'editinput',
        }))

        const r = await processScriptFull(makeChar(scripts), 'hello {{marker}} world', 'editinput', -1)

        expect(r.data).toBe('hello PARSED world')
        //only the initial parse; none of the 5 non-matching scripts re-parse
        expect(parserMock).toHaveBeenCalledTimes(1)
    })

    it('re-parses when a script changes the text, and parses CBS the script introduced', async () => {
        const scripts: Script[] = [
            { comment: 's', in: 'foo', out: '{{marker}}', type: 'editinput' },
        ]

        const r = await processScriptFull(makeChar(scripts), 'foo bar', 'editinput', -1)

        expect(r.data).toBe('PARSED bar')
        expect(parserMock).toHaveBeenCalledTimes(2)
    })

    it('skips the re-parse when a match replaces text with identical text', async () => {
        const scripts: Script[] = [
            { comment: 's', in: 'foo', out: 'foo', type: 'editinput' },
        ]

        const r = await processScriptFull(makeChar(scripts), 'foo bar', 'editinput', -1)

        expect(r.data).toBe('foo bar')
        expect(parserMock).toHaveBeenCalledTimes(1)
    })

    it('gates the action-script branch the same way', async () => {
        const scripts: Script[] = [
            //flag actions route through the @@/actions branch of executeScript
            { comment: 'hit', in: 'foo', out: 'baz', type: 'editinput', flag: 'g<myaction>', ableFlag: true },
            { comment: 'miss', in: 'never-matches', out: 'x', type: 'editinput', flag: 'g<myaction>', ableFlag: true },
        ]

        const r = await processScriptFull(makeChar(scripts), 'foo bar', 'editinput', -1)

        expect(r.data).toBe('baz bar')
        //initial parse + one re-parse for the matching script only
        expect(parserMock).toHaveBeenCalledTimes(2)
    })

    it('applies sequential scripts cumulatively', async () => {
        const scripts: Script[] = [
            { comment: 'a', in: 'aaa', out: 'bbb', type: 'editinput' },
            { comment: 'nomatch', in: 'zzz', out: 'x', type: 'editinput' },
            { comment: 'b', in: 'bbb', out: 'ccc', type: 'editinput' },
        ]

        const r = await processScriptFull(makeChar(scripts), 'aaa', 'editinput', -1)

        expect(r.data).toBe('ccc')
        //initial + 2 matching scripts
        expect(parserMock).toHaveBeenCalledTimes(3)
    })
})

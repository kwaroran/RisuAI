// @vitest-environment node
// wasmoon's emscripten glue mis-resolves its wasm path under happy-dom's fake location
import { describe, it, expect, vi, beforeAll } from 'vitest'

//#region module mocks — scriptings.ts pulls in browser-heavy modules; stub everything but the Lua engine itself

vi.mock(import('../parser/parser.svelte'), () => ({
    hasher: async () => 'mockhash',
    risuChatParser: (v: string) => v,
}) as unknown as typeof import('../parser/parser.svelte'))

vi.mock(import('../parser/chatVar.svelte'), () => ({
    getChatVar: () => 'null',
    setChatVar: () => {},
    getGlobalChatVar: () => 'null',
}) as unknown as typeof import('../parser/chatVar.svelte'))

vi.mock(import('../storage/database.svelte'), () => ({
    getCurrentCharacter: () => ({ type: 'character', chats: [{ message: [] }], chatPage: 0, triggerscript: [] }),
    getCurrentChat: () => ({ message: [] }),
    getDatabase: () => ({ characters: [] }),
    setDatabase: () => {},
}) as unknown as typeof import('../storage/database.svelte'))

vi.mock(import('../stores.svelte'), async () => {
    const { writable } = await import('svelte/store')
    return {
        DBState: { db: { characters: [] } },
        ReloadChatPointer: writable({}),
        ReloadGUIPointer: writable(0),
        selectedCharID: writable(0),
    } as unknown as typeof import('../stores.svelte')
})

vi.mock(import('../alert'), () => ({
    alertSelect: async () => '0',
    alertError: () => {},
    alertInput: async () => '',
    alertNormal: () => {},
    alertConfirm: async () => false,
}) as unknown as typeof import('../alert'))

vi.mock(import('./memory/hypamemory'), () => ({
    HypaProcesser: class {
        async addText() {}
        async similaritySearch() { return [] }
    },
}) as unknown as typeof import('./memory/hypamemory'))

vi.mock(import('./stableDiff'), () => ({
    generateAIImage: async () => '',
}) as unknown as typeof import('./stableDiff'))

vi.mock(import('./files/inlays'), () => ({
    writeInlayImage: async () => '',
    getInlayAsset: async () => null,
}) as unknown as typeof import('./files/inlays'))

vi.mock(import('./request/request'), () => ({
    requestChatData: async () => ({ type: 'fail', result: 'mocked' }),
}) as unknown as typeof import('./request/request'))

vi.mock(import('./modules'), () => ({
    getModuleTriggers: () => [],
    getModuleLorebooks: () => [],
}) as unknown as typeof import('./modules'))

vi.mock(import('../tokenizer'), () => ({
    tokenize: async () => 0,
}) as unknown as typeof import('../tokenizer'))

vi.mock(import('../globalApi.svelte'), () => ({
    fetchNative: async () => ({ status: 200, text: async () => '' }),
    readImage: async () => new Uint8Array(),
}) as unknown as typeof import('../globalApi.svelte'))

vi.mock(import('./lorebook.svelte'), () => ({
    loadLoreBookV3Prompt: async () => ({ actives: [] }),
}) as unknown as typeof import('./lorebook.svelte'))

vi.mock(import('../util'), () => ({
    asBuffer: (v: unknown) => v,
    getPersonaPrompt: () => '',
    getUserName: () => 'user',
    getUserIcon: () => '',
    selectSingleFile: async () => ({ data: null }),
}) as unknown as typeof import('../util'))

//#endregion

import fs from 'node:fs'
import path from 'node:path'
import { LuaFactory } from 'wasmoon'
import { Mutex } from '../mutex'
import { runScripted } from './scriptings'

//the factory fetches /lua/json.lua at runtime; serve the real file from disk
const jsonLua = fs.readFileSync(
    path.resolve(process.cwd(), 'public/lua/json.lua'),
    'utf-8'
)

const createEngineSpy = vi.spyOn(LuaFactory.prototype, 'createEngine')
const runExclusiveSpy = vi.spyOn(Mutex.prototype, 'runExclusive')

beforeAll(() => {
    vi.stubGlobal('fetch', async () => ({ status: 200, text: async () => jsonLua }))
    vi.spyOn(console, 'log').mockImplementation(() => {})
})

const baseArg = (mode: string, data: string) => ({
    char: { type: 'simple', customscript: [], chaId: 'test-char' } as any,
    chat: { message: [] } as any,
    mode,
    data,
    setVar: () => {},
    getVar: () => 'null',
})

describe('runScripted engine cache', () => {
    it('creates one engine per script code and reuses it across calls and modes', async () => {
        const code = `
listenEdit('editDisplay', function(id, data) return data .. '!' end)
function onOutput() return false end
`
        const before = createEngineSpy.mock.calls.length

        const r1 = await runScripted(code, baseArg('editDisplay', 'hello'))
        expect(r1.res).toBe('hello!')
        expect(createEngineSpy.mock.calls.length).toBe(before + 1)

        const r2 = await runScripted(code, baseArg('editDisplay', 'world'))
        expect(r2.res).toBe('world!')

        //different mode reuses the same engine, and its lua globals are shared
        const r3 = await runScripted(code, baseArg('output', ''))
        expect(r3.stopSending).toBe(true)

        expect(createEngineSpy.mock.calls.length).toBe(before + 1)
    })

    it('does not recreate engines when two scripts alternate (old thrashing case)', async () => {
        const codeA = `listenEdit('editDisplay', function(id, data) return data .. 'A' end)`
        const codeB = `listenEdit('editDisplay', function(id, data) return data .. 'B' end)`
        const before = createEngineSpy.mock.calls.length

        for (let i = 0; i < 3; i++) {
            const rA = await runScripted(codeA, baseArg('editDisplay', 'm'))
            expect(rA.res).toBe('mA')
            const rB = await runScripted(codeB, baseArg('editDisplay', 'm'))
            expect(rB.res).toBe('mB')
        }

        expect(createEngineSpy.mock.calls.length).toBe(before + 2)
    })

    it('evicts the least recently used engine past the cache limit and rebuilds it on next use', async () => {
        const codes = Array.from({ length: 17 }, (_, i) =>
            `function onOutput() return false end --script ${i}`)
        const before = createEngineSpy.mock.calls.length

        for (const code of codes) {
            await runScripted(code, baseArg('output', ''))
        }
        expect(createEngineSpy.mock.calls.length).toBe(before + 17)

        //most recent one is still cached
        await runScripted(codes[16], baseArg('output', ''))
        expect(createEngineSpy.mock.calls.length).toBe(before + 17)

        //oldest one was evicted, so it gets rebuilt
        await runScripted(codes[0], baseArg('output', ''))
        expect(createEngineSpy.mock.calls.length).toBe(before + 18)
    })
})

describe('runScripted listener skip', () => {
    it('skips engine invocation for edit modes with no registered listener', async () => {
        const code = `function onOutput() return false end --skip test`

        //first call must run to discover the listener flags; with no listener the data passes through
        const r1 = await runScripted(code, baseArg('editDisplay', 'hello'))
        expect(r1.res).toBe('hello')

        const engines = createEngineSpy.mock.calls.length
        const runs = runExclusiveSpy.mock.calls.length

        //subsequent edit-mode calls return without touching the engine or the mutex
        const chat = { message: [] } as any
        const r2 = await runScripted(code, { ...baseArg('editDisplay', 'hello'), chat })
        expect(r2.res).toBe(undefined)
        expect(r2.stopSending).toBe(false)
        expect(r2.chat).toBe(chat)
        await runScripted(code, baseArg('editInput', 'hello'))
        await runScripted(code, baseArg('editOutput', 'hello'))
        await runScripted(code, baseArg('editRequest', 'hello'))

        expect(runExclusiveSpy.mock.calls.length).toBe(runs)
        expect(createEngineSpy.mock.calls.length).toBe(engines)

        //non-edit modes still run normally
        const r3 = await runScripted(code, baseArg('output', ''))
        expect(r3.stopSending).toBe(true)
    })

    it('does not skip when a listener is registered', async () => {
        const code = `listenEdit('editInput', function(id, data) return data .. '?' end)`

        await runScripted(code, baseArg('editInput', 'a'))
        const runs = runExclusiveSpy.mock.calls.length

        const r = await runScripted(code, baseArg('editInput', 'b'))
        expect(r.res).toBe('b?')
        expect(runExclusiveSpy.mock.calls.length).toBe(runs + 1)
    })

    it('picks up listeners registered late inside a handler', async () => {
        const code = `
function onStart()
    listenEdit('editDisplay', function(id, data) return data .. '#' end)
end
`
        //no listener yet: first call runs (data passes through), then flags mark editDisplay as empty
        const r1 = await runScripted(code, baseArg('editDisplay', 'hi'))
        expect(r1.res).toBe('hi')
        //second call is skipped (res undefined, callers fall back to their own data)
        const r2 = await runScripted(code, baseArg('editDisplay', 'hi'))
        expect(r2.res).toBe(undefined)

        //onStart registers the listener; flags refresh after the run
        await runScripted(code, baseArg('start', ''))

        const r3 = await runScripted(code, baseArg('editDisplay', 'hi'))
        expect(r3.res).toBe('hi#')
    })
})

describe('setStateChanged stop signal', () => {
    it('does not stop generation when setStateChanged is a no-op', async () => {
        const result = await runScripted(
            `
function onStart(id)
    return setStateChanged(id, "unchanged", "value")
end
`,
            {
                char: {} as never,
                chat: { message: [] } as never,
                setVar: () => false,
                getVar: () => 'null',
                mode: 'start',
            }
        )

        expect(result.stopSending).toBe(false)
        expect(result.res).toBeNull()
    })

    it('keeps explicit false as the generation stop signal', async () => {
        const result = await runScripted('function onStart() return false end', {
            char: {} as never,
            chat: { message: [] } as never,
            mode: 'start',
        })

        expect(result.res).toBe(false)
        expect(result.stopSending).toBe(true)
    })
})

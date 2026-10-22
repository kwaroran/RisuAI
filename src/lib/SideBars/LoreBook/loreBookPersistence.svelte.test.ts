import { afterEach, expect, it, vi } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import localforage from 'localforage'
import { saveDb, forageStorage } from 'src/ts/globalApi.svelte'
import { decodeRisuSave } from 'src/ts/storage/risuSave'
import { selectedCharID } from 'src/ts/stores.svelte'
import type { loreBook } from 'src/ts/storage/database.svelte'
import { DBState } from 'src/ts/stores.svelte'
import LoreBookList from './LoreBookList.svelte'
import { alertConfirm } from 'src/ts/alert'

// Keep the real reactive DBState; isolate unrelated application services.
vi.mock('src/ts/alert', () => ({
    alertConfirm: vi.fn(async () => true),
    alertError: vi.fn(),
    alertMd: vi.fn(),
}))
vi.mock('src/ts/tokenizer', () => ({ tokenizeAccurate: vi.fn(async () => 0) }))
vi.mock('src/ts/util', () => ({
    sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
    sortableOptions: {},
}))
vi.mock('sortablejs/modular/sortable.core.esm.js', () => ({
    default: class {
        static create() {
            return new this()
        }
        destroy() {}
    },
}))
vi.mock('../../Others/Help.svelte', () => ({ default: () => {} }))
vi.mock('../../UI/GUI/TextAreaInput.svelte', () => ({ default: () => {} }))
vi.mock('@lucide/svelte', () => ({
    XIcon: () => {},
    LinkIcon: () => {},
    SunIcon: () => {},
    BookCopyIcon: () => {},
    FolderIcon: () => {},
    FolderOpen: () => {},
    PlusIcon: () => {},
}))

let mounted: ReturnType<typeof mount>

afterEach(async () => {
    if (mounted) await unmount(mounted)
    document.body.replaceChildren()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.mocked(alertConfirm).mockReset().mockResolvedValue(true)
})

function entry(comment: string, extra: Partial<loreBook> = {}): loreBook {
    return {
        key: comment,
        comment,
        content: comment,
        mode: 'normal',
        insertorder: 100,
        alwaysActive: false,
        secondkey: '',
        selective: false,
        ...extra,
    }
}

function setup(lore: loreBook[]) {
    const character = $state({
        chaId: 'test-character',
        globalLore: lore,
        chatPage: 0,
        chats: [{ id: 'test-chat', localLore: [] as loreBook[] }],
    })
    DBState.db = {
        characters: [character],
        botPresets: [{}],
        botPresetsId: 0,
        modules: [],
        loadouts: [],
        plugins: [],
        pluginCustomStorage: {},
    } as never
    selectedCharID.set(0)
    const target = document.createElement('div')
    document.body.append(target)
    mounted = mount(LoreBookList, { target, props: { submenu: 0 } })
    return { target, character }
}

function row(target: Element, name: string) {
    const label = [...target.querySelectorAll('button span')].find(
        (el) => el.textContent === name,
    )
    expect(label, `row ${name}`).toBeDefined()
    return label!.closest('[data-risu-idx]')!
}

async function remove(target: Element, name: string) {
    const buttons = row(target, name).querySelectorAll('button')
    ;(buttons[2] as HTMLButtonElement).click()
    await tick()
    await tick()
}

vi.mock('src/ts/update', () => ({}))
vi.mock('src/ts/plugins/plugins.svelte', () => ({}))
vi.mock('src/ts/parser/parser.svelte', () => ({}))
vi.mock('src/ts/characterCards', () => ({}))
vi.mock('src/ts/drive/accounter', () => ({}))
vi.mock('src/ts/gui/animation', () => ({}))
vi.mock('src/ts/gui/colorscheme', () => ({}))
vi.mock('src/ts/observer.svelte', () => ({}))
vi.mock('src/ts/gui/guisize', () => ({}))
vi.mock('src/ts/characters', () => ({}))
vi.mock('src/ts/hotkey', () => ({}))
vi.mock('src/ts/process/coldstorage.svelte', () => ({}))
vi.mock('src/ts/storage/nodeStorage', () => ({}))
vi.mock('src/ts/storage/accountStorage', () => ({}))
vi.mock('src/ts/storage/opfsStorage', () => ({}))
vi.mock('src/ts/process/modules', () => ({ moduleUpdate: () => {} }))
vi.mock('src/ts/process/scripts', () => ({ resetScriptCache: () => {} }))
vi.mock('src/ts/drive/drive', () => ({ syncDrive: () => {} }))
vi.mock('src/ts/kei/backup', () => ({ saveDbKei: async () => {} }))
vi.mock('src/ts/platform', () => ({ isTauri: false, isNodeServer: false }))

// The production loop intentionally lives for the application lifetime. One test
// owns one loop; fake timers are discarded at teardown. No encoder/tracker mocks.
it('autosaves nested character and chat folder deletions and reloads database bytes', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('BroadcastChannel', undefined)
    await localforage.setDriver(localforage.LOCALSTORAGE)
    const storage = localforage.createInstance({
        name: 'lorebook-autosave-test',
        driver: localforage.LOCALSTORAGE,
    })
    await storage.clear()
    forageStorage.realStorage = storage
    const lore = [
        entry('outer', { mode: 'folder' }),
        entry('inner', { mode: 'folder', folder: 'outer' }),
        entry('deep', { mode: 'folder', folder: 'inner' }),
        entry('child', { folder: 'deep' }),
        entry('keep'),
    ]
    const { target, character } = setup(lore)
    character.chats[0].localLore = structuredClone(lore)
    const originalWrite = forageStorage.setItem.bind(forageStorage)
    const writes = vi.spyOn(forageStorage, 'setItem')
    const errors = vi.spyOn(console, 'error')
    void saveDb()
    await tick()
    await vi.advanceTimersByTimeAsync(2000)
    const read = async () => {
        // A new adapter reads persisted bytes, not the live DB or encoder cache.
        const reopened = localforage.createInstance({
            name: 'lorebook-autosave-test',
            driver: localforage.LOCALSTORAGE,
        })
        const bytes = await reopened.getItem<Uint8Array>(
            'database/database.bin',
        )
        expect(bytes).toBeTruthy()
        return (await decodeRisuSave(bytes!)).database
    }
    expect((await read()).characters[0].globalLore).toHaveLength(5)
    writes.mockClear()
    ;(row(target, 'outer').querySelector('button') as HTMLButtonElement).click()
    await tick()
    await remove(target, 'inner')
    // The debounce means an immediate refresh can still read the previous save.
    expect((await read()).characters[0].globalLore).toHaveLength(5)
    await vi.advanceTimersByTimeAsync(1500)
    expect(
        writes.mock.calls.some(([key]) => key === 'database/database.bin'),
    ).toBe(true)
    expect(
        (await read()).characters[0].globalLore.map((e) => e.comment),
    ).toEqual(['outer', 'keep'])

    await unmount(mounted)
    target.replaceChildren()
    mounted = mount(LoreBookList, { target, props: { submenu: 1 } })
    await tick()
    await remove(target, 'outer')
    await vi.advanceTimersByTimeAsync(1500)
    const reloaded = await read()
    expect(
        reloaded.characters[0].chats[0].localLore.map((e) => e.comment),
    ).toEqual(['keep'])
    expect(reloaded.characters[0].globalLore.map((e) => e.comment)).toEqual([
        'outer',
        'keep',
    ])
    await unmount(mounted)
    target.replaceChildren()
    DBState.db = reloaded
    mounted = mount(LoreBookList, { target, props: { submenu: 1 } })
    await tick()
    expect(target.textContent).toContain('keep')
    expect(target.textContent).not.toContain('outer')
    expect(target.textContent).not.toContain('child')
    expect(errors).not.toHaveBeenCalled()
    // Characterize the existing failure path separately from successful saving.
    DBState.db.characters[0].chats[0].localLore = [
        entry('retry-folder', { mode: 'folder' }),
        entry('retry-child', { folder: 'retry-folder' }),
        entry('keep'),
    ]
    await tick()
    await vi.advanceTimersByTimeAsync(1500)
    expect((await read()).characters[0].chats[0].localLore).toHaveLength(3)
    let failed = false
    writes.mockImplementation(async (key, value) => {
        if (key === 'database/database.bin' && !failed) {
            failed = true
            throw new Error('simulated transient database write failure')
        }
        return originalWrite(key, value)
    })
    await remove(target, 'retry-folder')
    await vi.advanceTimersByTimeAsync(1500)
    expect(failed).toBe(true)
    expect(DBState.db.characters[0].chats[0].localLore).toHaveLength(1)
    expect((await read()).characters[0].chats[0].localLore).toHaveLength(3)
    writes.mockClear()
    await vi.advanceTimersByTimeAsync(5000)
    expect(writes).not.toHaveBeenCalled()
    expect((await read()).characters[0].chats[0].localLore).toHaveLength(3)
    // A subsequent tracked edit wakes saving and persists the deletion.
    DBState.db.characters[0].chats[0].localLore[0].content = 'wake autosave'
    await tick()
    await vi.advanceTimersByTimeAsync(1500)
    expect((await read()).characters[0].chats[0].localLore).toHaveLength(1)
    expect(errors).toHaveBeenCalledTimes(1)
    await storage.clear()
})

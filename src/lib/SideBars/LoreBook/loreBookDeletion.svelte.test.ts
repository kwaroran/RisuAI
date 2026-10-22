import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import { writable } from 'svelte/store'
import type { loreBook } from 'src/ts/storage/database.svelte'
import { DBState } from 'src/ts/stores.svelte'
import LoreBookList from './LoreBookList.svelte'
import { alertConfirm } from 'src/ts/alert'
import Sortable from 'sortablejs/modular/sortable.core.esm.js'

vi.mock('src/ts/stores.svelte', () => ({
    DBState: { db: { characters: [] } },
    selectedCharID: writable(0),
}))
vi.mock('src/ts/storage/database.svelte', () => ({
    getCurrentCharacter: () => DBState.db.characters[0],
    getCurrentChat: () => DBState.db.characters[0].chats[0],
}))
vi.mock('src/ts/alert', () => ({
    alertConfirm: vi.fn(async () => true),
    alertError: vi.fn(),
    alertMd: vi.fn(),
}))
vi.mock('src/ts/tokenizer', () => ({ tokenizeAccurate: vi.fn(async () => 0) }))
vi.mock('src/ts/util', () => ({
    sleep: vi.fn(async () => {}),
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

function setup(
    lore: loreBook[],
    mode: 'character' | 'chat' | 'external' = 'character',
) {
    const character = $state({
        globalLore:
            mode === 'chat' ? [entry('unrelated character lore')] : lore,
        chatPage: 0,
        chats: [{ localLore: mode === 'chat' ? lore : [] }],
    })
    DBState.db.characters = [character] as never
    const target = document.createElement('div')
    document.body.append(target)
    const owner =
        mode === 'chat' ? character.chats[0].localLore : character.globalLore
    const props =
        mode === 'external'
            ? { externalLoreBooks: owner }
            : { submenu: mode === 'chat' ? 1 : 0 }
    mounted = mount(LoreBookList, { target, props })
    return {
        target,
        character,
        getLore: () =>
            mode === 'external'
                ? owner
                : mode === 'chat'
                  ? character.chats[0].localLore
                  : character.globalLore,
    }
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

describe('lorebook deletion persists in the owning array', () => {
    it.each(['character', 'chat', 'external'] as const)(
        'deletes a closed %s folder and all 40 children',
        async (mode) => {
            const lore = [
                entry('keep'),
                entry('folder', { mode: 'folder' }),
                ...Array.from({ length: 40 }, (_, i) =>
                    entry(`child ${i}`, { folder: 'folder' }),
                ),
                entry('last'),
            ]
            const { target, getLore } = setup(lore, mode)
            await tick()
            await remove(target, 'folder')
            expect(getLore().map((e) => e.comment)).toEqual(['keep', 'last'])
        },
    )

    it('deletes a nested folder through the recursively rendered external list', async () => {
        const lore = [
            entry('outer', { mode: 'folder' }),
            entry('inner', { mode: 'folder', folder: 'outer' }),
            entry('child', { folder: 'inner' }),
            entry('keep'),
        ]
        const { target, character } = setup(lore)
        await tick()
        ;(
            row(target, 'outer').querySelector('button') as HTMLButtonElement
        ).click()
        await tick()
        await remove(target, 'inner')
        expect(character.globalLore.map((e) => e.comment)).toEqual([
            'outer',
            'keep',
        ])
    })

    it('deletes all descendants of a root folder, including unopened nested folders', async () => {
        const { target, getLore } = setup([
            entry('outer', { mode: 'folder' }),
            entry('inner', { mode: 'folder', folder: 'outer' }),
            entry('deep', { mode: 'folder', folder: 'inner' }),
            entry('child', { folder: 'deep' }),
            entry('keep'),
        ])
        await tick()
        await remove(target, 'outer')
        expect(getLore().map((e) => e.comment)).toEqual(['keep'])
    })

    it('keeps a folder intact when either confirmation is cancelled', async () => {
        const { target, getLore } = setup([
            entry('folder', { mode: 'folder' }),
            entry('child', { folder: 'folder' }),
        ])
        await tick()
        vi.mocked(alertConfirm).mockResolvedValueOnce(false)
        await remove(target, 'folder')
        expect(getLore()).toHaveLength(2)
        vi.mocked(alertConfirm)
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false)
        await remove(target, 'folder')
        expect(getLore()).toHaveLength(2)
    })

    it('deletes an individual entry inside an open folder without removing its siblings', async () => {
        const { target, getLore } = setup([
            entry('folder', { mode: 'folder' }),
            entry('child', { folder: 'folder' }),
            entry('sibling', { folder: 'folder' }),
        ])
        await tick()
        ;(
            row(target, 'folder').querySelector('button') as HTMLButtonElement
        ).click()
        await tick()
        await remove(target, 'child')
        expect(getLore().map((e) => e.comment)).toEqual(['folder', 'sibling'])
    })

    it('restores dragging after deleting a closed entry and opening and closing another entry', async () => {
        const create = vi.spyOn(Sortable, 'create')
        const { target } = setup([entry('remove'), entry('keep')])
        await tick()
        await remove(target, 'remove')
        ;(
            row(target, 'keep').querySelector('button') as HTMLButtonElement
        ).click()
        await tick()
        ;(
            row(target, 'keep').querySelector('button') as HTMLButtonElement
        ).click()
        await tick()
        expect(create).toHaveBeenCalledTimes(2)
    })
})

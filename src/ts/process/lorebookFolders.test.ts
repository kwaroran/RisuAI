import { describe, expect, it } from 'vitest'
import type { loreBook } from '../storage/database.svelte'
import { getLoreBookSubtree } from './lorebookFolders'

function book(key: string, mode: loreBook['mode'], folder?: string): loreBook {
    return {
        key,
        mode,
        folder,
        comment: key,
        content: '',
        insertorder: 100,
        alwaysActive: false,
        secondkey: '',
        selective: false,
    }
}

describe('lorebook folder subtrees', () => {
    it('finds descendants regardless of array order and preserves unrelated folders', () => {
        const root = book('root', 'folder')
        const nested = book('nested', 'folder', 'root')
        const leaf = book('leaf', 'normal', 'nested')
        const other = book('other', 'folder')
        expect(getLoreBookSubtree([leaf, other, nested, root], root)).toEqual(
            new Set([root, nested, leaf]),
        )
    })

    it('terminates for cyclic folder references', () => {
        const a = book('a', 'folder', 'b')
        const b = book('b', 'folder', 'a')
        const leaf = book('leaf', 'normal', 'b')
        expect(getLoreBookSubtree([a, b, leaf], a)).toEqual(
            new Set([a, b, leaf]),
        )
    })

    it('does not treat a normal entry activation key as a folder id', () => {
        const normal = book('same key', 'normal')
        const unrelated = book('unrelated', 'normal', 'same key')
        expect(getLoreBookSubtree([normal, unrelated], normal)).toEqual(
            new Set([normal]),
        )
    })
})

import type { loreBook } from '../storage/database.svelte'

export function getLoreBookSubtree(
    lore: loreBook[],
    book: loreBook,
): Set<loreBook> {
    const removed = new Set([book])
    const folders = book.mode === 'folder' ? [book.key] : []
    const visited = new Set<string>()

    while (folders.length > 0) {
        const key = folders.pop()!
        if (visited.has(key)) continue
        visited.add(key)

        for (const item of lore) {
            if (item.folder !== key) continue
            removed.add(item)
            if (item.mode === 'folder') folders.push(item.key)
        }
    }

    return removed
}

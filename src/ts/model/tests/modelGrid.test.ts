import { afterEach, describe, expect, test, vi } from 'vitest'
import { buildPriceRows, formatPrice1M, getCachedModelGridItems, hasModelGridCache, loadModelGridItems, type ModelGridItem } from '../modelGrid'

const item = (id: string): ModelGridItem => ({
    id,
    displayName: id,
    providerName: 'Test',
    description: '',
    context_length: 0,
    sortPrice: 0,
    prices: [],
})

let cacheSeq = 0
const nextCacheId = () => `test-${cacheSeq++}`

describe('formatPrice1M', () => {
    test('formats known prices', () => {
        expect(formatPrice1M(undefined)).toBeNull()
        expect(formatPrice1M(0)).toBe('Free')
        expect(formatPrice1M(1.5)).toBe('$1.50')
    })
})

describe('buildPriceRows', () => {
    test('skips unavailable prices and keeps order', () => {
        expect(buildPriceRows([['In', 3], ['Out', undefined], ['Cache In', 0]])).toEqual([
            { label: 'In', value: '$3.00' },
            { label: 'Cache In', value: 'Free' },
        ])
    })
})

describe('loadModelGridItems', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    test('shares in-flight and cached requests', async () => {
        const id = nextCacheId()
        const fetcher = vi.fn(async () => [item('a')])

        const [first, second] = await Promise.all([
            loadModelGridItems(id, fetcher),
            loadModelGridItems(id, fetcher),
        ])
        const third = await loadModelGridItems(id, fetcher)

        expect(fetcher).toHaveBeenCalledTimes(1)
        expect(first).toEqual([item('a')])
        expect(second).toBe(first)
        expect(third).toBe(first)
        expect(hasModelGridCache(id)).toBe(true)
    })

    test('does not keep empty results', async () => {
        const id = nextCacheId()
        const fetcher = vi.fn(async () => [] as ModelGridItem[])

        await loadModelGridItems(id, fetcher)
        expect(hasModelGridCache(id)).toBe(false)

        await loadModelGridItems(id, fetcher)
        expect(fetcher).toHaveBeenCalledTimes(2)
    })

    test('does not keep rejected results', async () => {
        const id = nextCacheId()
        const fetcher = vi.fn()
            .mockRejectedValueOnce(new Error('network'))
            .mockResolvedValueOnce([item('b')])

        await expect(loadModelGridItems(id, fetcher)).rejects.toThrow('network')
        expect(hasModelGridCache(id)).toBe(false)

        await expect(loadModelGridItems(id, fetcher)).resolves.toEqual([item('b')])
        expect(fetcher).toHaveBeenCalledTimes(2)
    })

    test('exposes a finished list synchronously, not an in-flight one', async () => {
        const id = nextCacheId()
        let resolve: (items: ModelGridItem[]) => void
        const pending = loadModelGridItems(id, () => new Promise((r) => { resolve = r }))

        expect(hasModelGridCache(id)).toBe(true)
        expect(getCachedModelGridItems(id)).toBeUndefined()

        resolve!([item('d')])
        await pending
        expect(getCachedModelGridItems(id)).toEqual([item('d')])
    })

    test('keeps at most eight lists, dropping the oldest first', async () => {
        const oldest = nextCacheId()
        await loadModelGridItems(oldest, async () => [item('old')])
        const newer = Array.from({ length: 8 }, nextCacheId)
        for (const id of newer) {
            await loadModelGridItems(id, async () => [item(id)])
        }

        expect(hasModelGridCache(oldest)).toBe(false)
        expect(newer.every(hasModelGridCache)).toBe(true)
    })

    test('expires after the TTL', async () => {
        vi.useFakeTimers()
        const id = nextCacheId()
        const fetcher = vi.fn(async () => [item('c')])

        await loadModelGridItems(id, fetcher)
        vi.advanceTimersByTime(10 * 60 * 1000 - 1)
        expect(hasModelGridCache(id)).toBe(true)

        vi.advanceTimersByTime(1)
        expect(hasModelGridCache(id)).toBe(false)
        expect(getCachedModelGridItems(id)).toBeUndefined()

        await loadModelGridItems(id, fetcher)
        expect(fetcher).toHaveBeenCalledTimes(2)
    })
})

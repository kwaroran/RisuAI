import type { Database } from "../storage/database.svelte"

/** Normalized model item for the generic ModelGrid component */
export type ModelGridItem = {
    id: string
    displayName: string
    providerName: string
    description: string
    context_length: number
    /** Used for price-sort; use Infinity when price is unknown */
    sortPrice: number
    /** Price rows to display on the card, e.g. [{label:'In', value:'$1.00'}] */
    prices: { label: string; value: string }[]
}

/** Pinned/special entries shown above the main list, unaffected by search/sort */
export type ModelGridPinnedItem = {
    id: string
    displayName: string
    providerName: string
}

export type ModelGridInputMode = 'list' | 'manual'

/** Database keys whose type is exactly V, so writes through a union of keys stay typed as V */
type DBKeyOf<V> = { [K in keyof Database]: [Database[K]] extends [V] ? ([V] extends [Database[K]] ? K : never) : never }[keyof Database]

/** Describes a provider whose models are picked from a fetched list (OpenRouter-like) */
export type ModelGridSource = {
    /** Provider name shown in the picker header, e.g. 'OpenRouter' */
    label: string
    /** Every value that changes the fetched list (API key, endpoint flags...). Read reactively. */
    cacheKey: () => string
    fetchItems: () => Promise<ModelGridItem[]>
    /** Database field holding the request model id */
    modelKey: DBKeyOf<string>
    /** Database field holding the display name of the selected model ('' when typed manually) */
    nameKey: DBKeyOf<string>
    inputModeKey: DBKeyOf<ModelGridInputMode>
    pinnedItems?: ModelGridPinnedItem[]
    showSubBadge?: () => boolean
    /** Called after the model is changed by either the grid or the manual input */
    onModelChange?: () => void
}

/** Formats a per-1M-token USD price. undefined means the price is not available. */
export function formatPrice1M(price: number | undefined): string | null {
    if (price === undefined) return null
    if (price === 0) return 'Free'
    return `$${price.toFixed(2)}`
}

export function buildPriceRows(pairs: [label: string, price: number | undefined][]): ModelGridItem['prices'] {
    const rows: ModelGridItem['prices'] = []
    for (const [label, price] of pairs) {
        const value = formatPrice1M(price)
        if (value !== null) rows.push({ label, value })
    }
    return rows
}

const MODEL_GRID_CACHE_TTL = 10 * 60 * 1000
const MODEL_GRID_CACHE_LIMIT = 8

type ModelGridCacheEntry = {
    at: number
    promise: Promise<ModelGridItem[]>
    /** Set once the request resolves with a non-empty list */
    items?: ModelGridItem[]
}

const modelGridCache = new Map<string, ModelGridCacheEntry>()

function getFreshEntry(cacheId: string): ModelGridCacheEntry | undefined {
    const entry = modelGridCache.get(cacheId)
    if (entry && Date.now() - entry.at >= MODEL_GRID_CACHE_TTL) {
        modelGridCache.delete(cacheId)
        return undefined
    }
    return entry
}

/** True while a fresh request for cacheId is cached, finished or still in flight */
export function hasModelGridCache(cacheId: string): boolean {
    return getFreshEntry(cacheId) !== undefined
}

/** The cached list for cacheId, available synchronously once its request has finished */
export function getCachedModelGridItems(cacheId: string): ModelGridItem[] | undefined {
    return getFreshEntry(cacheId)?.items
}

/**
 * Loads model items through a shared cache. In-flight requests are shared;
 * empty or failed results are evicted so a corrected API key can retry.
 * Keeps at most MODEL_GRID_CACHE_LIMIT lists, and releases each one after
 * the TTL so replaced API keys are not held for the page's lifetime.
 */
export function loadModelGridItems(cacheId: string, fetcher: () => Promise<ModelGridItem[]>): Promise<ModelGridItem[]> {
    const cached = getFreshEntry(cacheId)
    if (cached) return cached.promise

    const entry = { at: Date.now() } as ModelGridCacheEntry
    entry.promise = fetcher().then((items) => {
        if (items.length === 0) evict(cacheId, entry)
        else entry.items = items
        return items
    }, (error) => {
        evict(cacheId, entry)
        throw error
    })
    modelGridCache.set(cacheId, entry)

    for (const oldId of modelGridCache.keys()) {
        if (modelGridCache.size <= MODEL_GRID_CACHE_LIMIT) break
        modelGridCache.delete(oldId)
    }
    setTimeout(() => evict(cacheId, entry), MODEL_GRID_CACHE_TTL)
    return entry.promise
}

function evict(cacheId: string, entry: ModelGridCacheEntry) {
    if (modelGridCache.get(cacheId) === entry) {
        modelGridCache.delete(cacheId)
    }
}

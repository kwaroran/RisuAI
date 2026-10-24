/*
    Plugin storage (Risuai.pluginStorage) backed by cold storage.

    Layout:
    - Small values live in one "index" cold storage item, kept in memory as JSON strings.
    - Large values each get their own cold storage item; the index only references them.
    - The database only keeps a pointer: db.pluginCustomStorage._coldpluginIndex = <index cold id>

    Consistency rules:
    - Cold items are never modified in place. Every flush writes a new index item, and the database
      pointer is only moved after that write succeeded, so the saved database always points to a
      complete index (at worst an older one, if the app shuts down before the database is saved).
    - Items that are no longer referenced are moved to a trash list stored inside the index, and only
      deleted on a later load once a grace period passed. They are never deleted while a saved
      database could still reference them.
    - Legacy layouts (values inline in pluginCustomStorage, and the per-key `_coldplugin` map) are
      read through and migrated; the legacy copies are only removed when the migrated index is
      committed, in the same step as the pointer move.
*/

export const PLUGIN_STORAGE_INDEX_KEY = '_coldpluginIndex'
export const PLUGIN_STORAGE_LEGACY_MAP_KEY = '_coldplugin'
const RESERVED_KEYS = new Set([PLUGIN_STORAGE_INDEX_KEY, PLUGIN_STORAGE_LEGACY_MAP_KEY])
const INDEX_TYPE = 'risu-plugin-storage-index'

export type PluginStorageBackend = {
    get(id: string): Promise<unknown>
    set(id: string, value: unknown): Promise<boolean>
    remove(ids: string[]): Promise<void>
    newId(): string
    now(): number
}

export type PluginStorageOptions = {
    /** values whose JSON is longer than this get their own cold storage item */
    largeThreshold: number
    /** soft cap for the total size of small values kept in the index */
    indexBudget: number
    /** values at or below this size always stay in the index */
    alwaysSmallSize: number
    /** minimum delay before writing changes; grows with the index size (see maxFlushDelay) */
    flushDelay: number
    maxFlushDelay: number
    /** unreferenced large items are deleted only after this long (other devices may still read them) */
    trashGrace: number
    /** old index items are only needed until the database pointing past them is saved */
    indexTrashGrace: number
    onProgress?: (message: string | null) => void
    onLegacyMigrated?: () => void
}

export const defaultPluginStorageOptions: PluginStorageOptions = {
    largeThreshold: 256 * 1024,
    indexBudget: 8 * 1024 * 1024,
    alwaysSmallSize: 4 * 1024,
    flushDelay: 1000,
    maxFlushDelay: 15000,
    trashGrace: 24 * 60 * 60 * 1000,
    indexTrashGrace: 60 * 60 * 1000,
}

type Entry = { json: string } | { large: string }
type TrashItem = { id: string, at: number, index?: boolean }
type IndexEntry = { k: string, s?: string, l?: string }

export type PluginStorageIndex = {
    type: typeof INDEX_TYPE
    version: 1
    entries: IndexEntry[]
    trash: TrashItem[]
}

type StorageObject = { [key: string]: any }

export function isPluginStorageIndex(data: unknown): data is PluginStorageIndex {
    return !!data
        && typeof data === 'object'
        && (data as PluginStorageIndex).type === INDEX_TYPE
        && Array.isArray((data as PluginStorageIndex).entries)
        && Array.isArray((data as PluginStorageIndex).trash)
}

const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key)

/**
 * Whether the database holds an inline (legacy) value for the key.
 * Svelte $state proxies keep reporting a deleted property as an own property with value undefined,
 * so undefined counts as absent (a JSON save cannot hold undefined anyway).
 */
const hasInline = (storage: StorageObject | undefined, key: string) =>
    !!storage && !RESERVED_KEYS.has(key) && hasOwn(storage, key) && storage[key] !== undefined

export class PluginStorageStore {
    private entries = new Map<string, Entry>()
    /** large writes in flight: readable from memory until committed */
    private pendingLarge = new Map<string, { json: string, id: string, token: number }>()
    /** keys whose legacy copies (inline / _coldplugin) are superseded and removed on the next commit */
    private shadowed = new Set<string>()
    private trash: TrashItem[] = []
    private smallBytes = 0
    private pointer: string | null = null
    private loaded = false
    private loading: Promise<void> | null = null
    private dirty = false
    private flushTimer: ReturnType<typeof setTimeout> | null = null
    private flushing: Promise<void> | null = null
    private tokenSeq = 0
    private options: PluginStorageOptions
    /** progress handler of a running migrate() call, used instead of options.onProgress */
    private progressOverride: ((message: string | null) => void) | null = null

    constructor(
        private backend: PluginStorageBackend,
        private getStorage: () => StorageObject | undefined,
        private ensureStorage: () => StorageObject,
        options: Partial<PluginStorageOptions> = {},
    ) {
        this.options = { ...defaultPluginStorageOptions, ...options }
    }

    // ------------------------------------------------------------------ loading

    /** Loads the index (and migrates legacy layouts). Safe to call repeatedly. */
    async load(): Promise<void> {
        const storage = this.getStorage()
        const currentPointer = typeof storage?.[PLUGIN_STORAGE_INDEX_KEY] === 'string' ? storage[PLUGIN_STORAGE_INDEX_KEY] : null
        if (this.loaded && !this.loading && currentPointer !== this.pointer) {
            //the database was replaced from outside (restore, sync); the stored state wins
            console.warn('Plugin storage index changed outside the store (restore/sync?); reloading', {
                store: this.pointer,
                database: currentPointer,
                discardedUnsavedChanges: this.dirty,
            })
            this.loaded = false
        }
        //while a load is running every caller awaits the same promise, so operations keep their call order
        if (this.loaded && !this.loading) {
            return
        }
        this.loading ??= this.doLoad().finally(() => {
            this.loading = null
        })
        await this.loading
    }

    /** Whether the database still holds legacy values (inline / `_coldplugin`) that the next load migrates. */
    needsMigration(): boolean {
        const storage = this.getStorage()
        if (!storage) {
            return false
        }
        if (Object.keys(storage).some((key) => hasInline(storage, key))) {
            return true
        }
        const legacyMap = storage[PLUGIN_STORAGE_LEGACY_MAP_KEY]
        return !!legacyMap && typeof legacyMap === 'object' && Object.values(legacyMap).some((id) => typeof id === 'string')
    }

    /** Loads the store now, reporting migration progress to the given handler instead of options.onProgress. */
    async migrate(onProgress: (message: string | null) => void): Promise<void> {
        this.progressOverride = onProgress
        try {
            await this.load()
        } finally {
            this.progressOverride = null
        }
    }

    private async doLoad() {
        const storage = this.getStorage() ?? {}
        const pointer = typeof storage[PLUGIN_STORAGE_INDEX_KEY] === 'string' ? storage[PLUGIN_STORAGE_INDEX_KEY] as string : null
        const entries = new Map<string, Entry>()
        let trash: TrashItem[] = []

        if (pointer) {
            const data = await this.backend.get(pointer)
            if (!isPluginStorageIndex(data)) {
                //never fall back to an empty index: the next flush would overwrite the real data
                throw new Error('Failed to load plugin storage index')
            }
            for (const entry of data.entries) {
                if (typeof entry?.k !== 'string') {
                    continue
                }
                if (typeof entry.l === 'string') {
                    entries.set(entry.k, { large: entry.l })
                }
                else if (typeof entry.s === 'string') {
                    entries.set(entry.k, { json: entry.s })
                }
            }
            trash = data.trash
                .filter((item) => typeof item?.id === 'string' && typeof item.at === 'number')
                .map((item) => (item.index ? { id: item.id, at: item.at, index: true } : { id: item.id, at: item.at }))
        }

        this.entries = entries
        this.trash = trash
        this.pointer = pointer
        this.pendingLarge.clear()
        this.shadowed.clear()
        this.smallBytes = 0
        for (const entry of entries.values()) {
            if ('json' in entry) {
                this.smallBytes += entry.json.length
            }
        }
        this.dirty = false
        this.loaded = true

        this.collectTrash()

        if (await this.migrateLegacy(storage)) {
            this.dirty = true
            try {
                await this.flush()
            } catch (error) {
                //migrated values are usable from memory; the commit is retried by the scheduled flush
                console.error('Failed to save migrated plugin storage', error)
            }
        }
    }

    /** Moves inline values and the per-key `_coldplugin` map into the index (committed by the next flush). */
    private async migrateLegacy(storage: StorageObject): Promise<boolean> {
        const inlineKeys = Object.keys(storage).filter((key) => hasInline(storage, key))
        const legacyMap = storage[PLUGIN_STORAGE_LEGACY_MAP_KEY]
        const legacyEntries: [string, string][] = legacyMap && typeof legacyMap === 'object'
            ? Object.entries(legacyMap).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
            : []
        if (inlineKeys.length === 0 && legacyEntries.length === 0) {
            return false
        }

        let changed = false
        const total = inlineKeys.length + legacyEntries.length
        let done = 0
        const report = this.progressOverride ?? this.options.onProgress
        const progress = () => {
            done++
            report?.(`Migrating plugin storage... ${total - done} items left`)
        }

        try {
            //read legacy per-key items in parallel; a failed read (throws) is kept for retry,
            //a null read is migrated as null (the per-key layout returned null for it as well)
            const legacyValues = new Map<string, { value: unknown } | null>()
            const pendingLegacy = legacyEntries.filter(([key]) => {
                //the per-key layout predates the index: a leftover legacy entry is older than an index entry
                //(and older than an inline value written by an older build), so it is dropped, never read
                if (hasInline(storage, key) || this.entries.has(key)) {
                    this.shadowed.add(key)
                    changed = true
                    progress()
                    return false
                }
                return true
            })
            for (let i = 0; i < pendingLegacy.length; i += 8) {
                await Promise.all(pendingLegacy.slice(i, i + 8).map(async ([key, id]) => {
                    try {
                        legacyValues.set(key, { value: (await this.backend.get(id)) ?? null })
                    } catch (error) {
                        console.error(`Failed to read legacy plugin storage item ${key}, retrying on next load`, error)
                        legacyValues.set(key, null)
                    }
                    progress()
                }))
            }
            for (const [key, id] of pendingLegacy) {
                const read = legacyValues.get(key)
                if (!read) {
                    continue
                }
                const json = JSON.stringify(read.value) ?? 'null'
                if (read.value !== null && this.isLarge(json.length)) {
                    //legacy items are never modified from now on, so they can be referenced directly
                    this.setEntry(key, { large: id })
                }
                else {
                    this.setEntry(key, { json })
                    this.trash.push({ id, at: this.backend.now() })
                }
                this.shadowed.add(key)
                changed = true
            }

            for (const key of inlineKeys) {
                progress()

                let json: string
                try {
                    json = JSON.stringify(storage[key]) ?? 'null'
                } catch (error) {
                    console.error(`Plugin storage key ${key} is not serializable, leaving it inline`, error)
                    continue
                }
                if (this.isLarge(json.length)) {
                    const id = this.backend.newId()
                    if (!await this.backend.set(id, JSON.parse(json))) {
                        console.error(`Cold storage write failed for plugin storage key ${key}, keeping it inline`)
                        continue
                    }
                    this.setEntry(key, { large: id })
                }
                else {
                    this.setEntry(key, { json })
                }
                this.shadowed.add(key)
                changed = true
            }
        } finally {
            report?.(null)
        }

        return changed
    }

    /** Deletes trashed items whose grace period passed. Only called right after loading the saved index. */
    private collectTrash() {
        const now = this.backend.now()
        const referenced = this.referencedInMemory()
        const due: string[] = []
        const keep: TrashItem[] = []
        for (const item of this.trash) {
            if (referenced.has(item.id)) {
                continue
            }
            if (now - item.at >= (item.index ? this.options.indexTrashGrace : this.options.trashGrace)) {
                due.push(item.id)
            }
            else {
                keep.push(item)
            }
        }
        this.trash = keep
        if (due.length > 0) {
            //the remaining trash is persisted with the next flush; deleting again later is harmless
            this.backend.remove(due).catch((error) => {
                console.error('Failed to delete unused plugin storage items', error)
            })
        }
    }

    // ------------------------------------------------------------------- API

    async getItem(key: string): Promise<any> {
        await this.load()
        const pending = this.pendingLarge.get(key)
        if (pending) {
            return JSON.parse(pending.json)
        }
        const storage = this.getStorage()
        if (!this.shadowed.has(key) && hasInline(storage, key)) {
            //inline value written after load (older build, v2 plugin, setDatabaseLite); migrated on next load
            return JSON.parse(JSON.stringify(storage[key]) ?? 'null')
        }
        const entry = this.entries.get(key)
        if (entry) {
            if ('json' in entry) {
                return JSON.parse(entry.json)
            }
            return (await this.backend.get(entry.large)) ?? null
        }
        const legacyId = this.legacyMapId(key)
        if (legacyId) {
            return (await this.backend.get(legacyId)) ?? null
        }
        return null
    }

    async setItem(key: string, value: any): Promise<void> {
        await this.load()
        //persisted as JSON: undefined/functions become null, BigInt etc. throw here
        const json = JSON.stringify(value) ?? 'null'
        this.shadowed.add(key)

        if (!this.isLarge(json.length, key)) {
            this.pendingLarge.delete(key)
            this.setEntry(key, { json })
            this.markDirty()
            return
        }

        const token = ++this.tokenSeq
        const id = this.backend.newId()
        this.pendingLarge.set(key, { json, id, token })
        const ok = await this.backend.set(id, json === 'null' ? null : value)
        if (this.pendingLarge.get(key)?.token !== token) {
            //superseded by a later setItem/removeItem/clear on the same key
            this.trash.push({ id, at: this.backend.now() })
            this.markDirty()
            return
        }
        this.pendingLarge.delete(key)
        if (!ok) {
            this.trash.push({ id, at: this.backend.now() })
            throw new Error(`Failed to write plugin storage item "${key}"`)
        }
        this.setEntry(key, { large: id })
        this.markDirty()
    }

    async removeItem(key: string): Promise<void> {
        await this.load()
        this.shadowed.add(key)
        this.cancelPending(key)
        this.setEntry(key, null)
        this.markDirty()
    }

    async clear(): Promise<void> {
        await this.load()
        for (const key of this.listKeys()) {
            this.shadowed.add(key)
        }
        for (const key of [...this.pendingLarge.keys()]) {
            this.cancelPending(key)
        }
        for (const key of [...this.entries.keys()]) {
            this.setEntry(key, null)
        }
        this.markDirty()
    }

    async keys(): Promise<string[]> {
        await this.load()
        return this.listKeys()
    }

    // ----------------------------------------------------------- persistence

    /** Writes pending changes now. Resolves once the database pointer points to an index containing them. */
    async flush(): Promise<void> {
        if (!this.loaded) {
            return
        }
        while (this.flushing || this.dirty) {
            if (this.flushing) {
                await this.flushing.catch(() => {})
                continue
            }
            this.flushing = this.doFlush().finally(() => {
                this.flushing = null
            })
            await this.flushing
        }
    }

    private async doFlush() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer)
            this.flushTimer = null
        }
        this.dirty = false
        const shadowSnapshot = [...this.shadowed]
        const oldPointer = this.pointer
        const now = this.backend.now()
        const trash = oldPointer ? [...this.trash, { id: oldPointer, at: now, index: true }] : [...this.trash]
        const index: PluginStorageIndex = {
            type: INDEX_TYPE,
            version: 1,
            entries: [...this.entries].map(([k, entry]) => ('large' in entry ? { k, l: entry.large } : { k, s: entry.json })),
            trash,
        }
        const id = this.backend.newId()
        if (!await this.backend.set(id, index)) {
            this.dirty = true
            this.trash.push({ id, at: now, index: true })
            this.scheduleFlush(this.options.maxFlushDelay)
            throw new Error('Failed to write plugin storage index')
        }

        //commit: move the pointer and drop superseded legacy copies in one synchronous step
        const storage = this.ensureStorage()
        storage[PLUGIN_STORAGE_INDEX_KEY] = id
        let removedLegacy = false
        const legacyMap = storage[PLUGIN_STORAGE_LEGACY_MAP_KEY]
        for (const key of shadowSnapshot) {
            if (!RESERVED_KEYS.has(key) && hasOwn(storage, key)) {
                delete storage[key]
                removedLegacy = true
            }
            if (legacyMap && typeof legacyMap === 'object' && hasOwn(legacyMap, key)) {
                delete legacyMap[key]
                removedLegacy = true
            }
            this.shadowed.delete(key)
        }
        if (legacyMap && typeof legacyMap === 'object' && Object.keys(legacyMap).every((key) => typeof legacyMap[key] !== 'string')) {
            delete storage[PLUGIN_STORAGE_LEGACY_MAP_KEY]
        }
        if (oldPointer) {
            this.trash.push({ id: oldPointer, at: now, index: true })
        }
        this.pointer = id
        if (removedLegacy) {
            this.options.onLegacyMigrated?.()
        }
    }

    private markDirty() {
        this.dirty = true
        //the whole index is rewritten on every flush, so batch longer when it is big (+1s per 512KB)
        const delay = Math.min(this.options.maxFlushDelay, this.options.flushDelay + Math.floor(this.smallBytes / (512 * 1024)) * 1000)
        this.scheduleFlush(delay)
    }

    private scheduleFlush(delay: number) {
        if (this.flushTimer) {
            return
        }
        this.flushTimer = setTimeout(() => {
            this.flushTimer = null
            this.flush().catch((error) => {
                console.error('Failed to save plugin storage', error)
            })
        }, delay)
    }

    // ------------------------------------------------------- referenced ids

    /**
     * Cold storage ids the given pluginCustomStorage refers to (index pointer + large values),
     * read from that index. Used for backups and restores.
     */
    async referencedIds(storage: StorageObject | undefined | null): Promise<string[]> {
        const pointer = typeof storage?.[PLUGIN_STORAGE_INDEX_KEY] === 'string' ? storage[PLUGIN_STORAGE_INDEX_KEY] as string : null
        if (!pointer) {
            return []
        }
        if (this.loaded && pointer === this.pointer && !this.dirty && this.pendingLarge.size === 0) {
            return [pointer, ...this.largeIds()]
        }
        const data = await this.backend.get(pointer)
        if (!isPluginStorageIndex(data)) {
            return [pointer]
        }
        return [pointer, ...data.entries.filter((entry) => typeof entry?.l === 'string').map((entry) => entry.l!)]
    }

    /** Every id that must not be deleted by a manual cold storage cleanup right now. */
    protectedIds(): string[] {
        return [...this.referencedInMemory(), ...this.trash.map((item) => item.id)]
    }

    // ---------------------------------------------------------------- helpers

    private referencedInMemory(): Set<string> {
        const ids = new Set<string>(this.largeIds())
        if (this.pointer) {
            ids.add(this.pointer)
        }
        for (const pending of this.pendingLarge.values()) {
            ids.add(pending.id)
        }
        return ids
    }

    private largeIds(): string[] {
        const ids: string[] = []
        for (const entry of this.entries.values()) {
            if ('large' in entry) {
                ids.push(entry.large)
            }
        }
        return ids
    }

    private isLarge(size: number, replacingKey?: string): boolean {
        if (size > this.options.largeThreshold) {
            return true
        }
        if (size <= this.options.alwaysSmallSize) {
            return false
        }
        const current = replacingKey ? this.entries.get(replacingKey) : undefined
        const freed = current && 'json' in current ? current.json.length : 0
        return this.smallBytes - freed + size > this.options.indexBudget
    }

    /** Sets or deletes an entry, trashing a replaced large item and keeping the small-size total. */
    private setEntry(key: string, entry: Entry | null) {
        const previous = this.entries.get(key)
        if (previous) {
            if ('json' in previous) {
                this.smallBytes -= previous.json.length
            }
            else if (!entry || !('large' in entry) || entry.large !== previous.large) {
                this.trash.push({ id: previous.large, at: this.backend.now() })
            }
        }
        if (entry) {
            //Map.set keeps the position of an existing key, like overwriting an object property
            this.entries.set(key, entry)
            if ('json' in entry) {
                this.smallBytes += entry.json.length
            }
        }
        else {
            this.entries.delete(key)
        }
    }

    private cancelPending(key: string) {
        const pending = this.pendingLarge.get(key)
        if (pending) {
            //the in-flight write resolves later and trashes its own id
            this.pendingLarge.delete(key)
        }
    }

    private legacyMapId(key: string): string | null {
        if (this.shadowed.has(key)) {
            return null
        }
        const legacyMap = this.getStorage()?.[PLUGIN_STORAGE_LEGACY_MAP_KEY]
        if (legacyMap && typeof legacyMap === 'object' && typeof legacyMap[key] === 'string') {
            return legacyMap[key]
        }
        return null
    }

    private listKeys(): string[] {
        const keys = new Set<string>(this.entries.keys())
        for (const key of this.pendingLarge.keys()) {
            keys.add(key)
        }
        const storage = this.getStorage()
        if (storage) {
            for (const key of Object.keys(storage)) {
                if (!hasInline(storage, key)) {
                    continue
                }
                if (!RESERVED_KEYS.has(key) && !this.shadowed.has(key)) {
                    keys.add(key)
                }
            }
            const legacyMap = storage[PLUGIN_STORAGE_LEGACY_MAP_KEY]
            if (legacyMap && typeof legacyMap === 'object') {
                for (const key of Object.keys(legacyMap)) {
                    if (typeof legacyMap[key] === 'string' && !this.shadowed.has(key)) {
                        keys.add(key)
                    }
                }
            }
        }
        return [...keys]
    }
}

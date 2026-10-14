/*
    SaveKV: non-reactive key-value storage persisted inside the save file (RisuSave).

    - Values are JSON. They live in plain Maps, never in DBState, so they cost nothing reactive,
      and every operation is synchronous.
    - Each namespace is one RisuSave block (`kv:<namespace>`), re-encoded only when that namespace changed.
    - Everything is stored in the block itself. Large data does not belong here; that is cold storage's job.
    - Values are held as JSON strings and embedded into the block as raw JSON (not as escaped strings),
      so building a block is mostly string concatenation and values are not escaped twice.
*/

export type SaveKVEntry = { k: string, v: unknown }
/** content of one `kv:<namespace>` block */
export type SaveKVNamespaceData = { version: 1, entries: SaveKVEntry[] }
/** namespace -> block content, as decoded from a save file */
export type SaveKVData = Record<string, SaveKVNamespaceData>

/** What the RisuSave encoder needs to write KV blocks */
export interface SaveKVSource {
    namespaces(): string[]
    /** JSON content of the namespace block, or null when the block should not exist */
    encodeNamespace(ns: string): string | null
}

function parseNamespace(data: unknown): Map<string, string> {
    const entries = new Map<string, string>()
    const ns = data as Partial<SaveKVNamespaceData> | null
    for (const entry of Array.isArray(ns?.entries) ? ns.entries : []) {
        if (entry && typeof entry.k === 'string' && 'v' in entry) {
            entries.set(entry.k, JSON.stringify(entry.v) ?? 'null')
        }
    }
    return entries
}

function encodeNamespaceContent(entries: Map<string, string> | undefined): string | null {
    if (!entries || entries.size === 0) {
        return null
    }
    //stored values are already valid JSON, so they are embedded as-is.
    //an array keeps insertion order (object keys like "0" would be reordered)
    const parts: string[] = []
    for (const [k, json] of entries) {
        parts.push(`{"k":${JSON.stringify(k)},"v":${json}}`)
    }
    return `{"version":1,"entries":[${parts.join(',')}]}`
}

export class SaveKVStore implements SaveKVSource {
    /** namespace -> key -> value as JSON */
    private spaces = new Map<string, Map<string, string>>()
    private dirty = new Set<string>()
    private loadedOnce = false

    /** Replaces the whole state with KV data decoded from the save file that just became the live database. */
    load(data: SaveKVData | null | undefined) {
        //replacing data during a session (backup restore): the running save encoder still holds the old
        //blocks, so every old and new namespace must be re-encoded (an emptied one is removed)
        const replacing = this.loadedOnce
        const previousNamespaces = this.namespaces()
        this.loadedOnce = true
        this.spaces.clear()
        this.dirty.clear()
        for (const [ns, nsData] of Object.entries(data ?? {})) {
            this.spaces.set(ns, parseNamespace(nsData))
        }
        if (replacing) {
            this.markDirty([...previousNamespaces, ...this.namespaces()])
        }
    }

    get<T = any>(ns: string, key: string): T | null {
        const json = this.spaces.get(ns)?.get(key)
        return json === undefined ? null : JSON.parse(json)
    }

    has(ns: string, key: string): boolean {
        return this.spaces.get(ns)?.has(key) ?? false
    }

    /** Stores a JSON value. Throws for values JSON cannot represent (BigInt, cycles). */
    set(ns: string, key: string, value: unknown) {
        //undefined and functions become null, like a JSON round-trip
        const json = JSON.stringify(value) ?? 'null'
        let entries = this.spaces.get(ns)
        if (!entries) {
            entries = new Map()
            this.spaces.set(ns, entries)
        }
        entries.set(key, json)
        this.dirty.add(ns)
    }

    delete(ns: string, key: string) {
        if (this.spaces.get(ns)?.delete(key)) {
            this.dirty.add(ns)
        }
    }

    keys(ns: string): string[] {
        return [...(this.spaces.get(ns)?.keys() ?? [])]
    }

    clear(ns: string) {
        const entries = this.spaces.get(ns)
        if (entries && entries.size > 0) {
            entries.clear()
            this.dirty.add(ns)
        }
    }

    // ------------------------------------------------------ save integration

    namespaces(): string[] {
        return [...this.spaces.keys()]
    }

    hasDirty() {
        return this.dirty.size > 0
    }

    /** namespaces changed since the last call; give them back with markDirty if the save failed */
    takeDirty(): string[] {
        const dirty = [...this.dirty]
        this.dirty.clear()
        return dirty
    }

    markDirty(namespaces: string[]) {
        for (const ns of namespaces) {
            this.dirty.add(ns)
        }
    }

    encodeNamespace(ns: string): string | null {
        return encodeNamespaceContent(this.spaces.get(ns))
    }
}

/** SaveKVSource for KV data decoded from a save file that is not the live database (e.g. re-encoding a restored backup) */
export function saveKVSourceFromData(data: SaveKVData | null | undefined): SaveKVSource {
    const parsed = new Map(Object.entries(data ?? {}).map(([ns, nsData]) => [ns, parseNamespace(nsData)]))
    return {
        namespaces: () => [...parsed.keys()],
        encodeNamespace: (ns) => encodeNamespaceContent(parsed.get(ns)),
    }
}

/** the live store, backing the KV blocks of the current save file */
export const saveKV = new SaveKVStore()

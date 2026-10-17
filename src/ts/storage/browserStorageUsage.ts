export type BrowserStorageCategory =
    | 'assetCache'
    | 'assets'
    | 'autoBackup'
    | 'mainDatabase'
    | 'saveCache'
    | 'coldStorage'
    | 'inlay'
    | 'localModel'
    | 'hypaVector'
    | 'plugin'
    | 'translationCache'
    | 'other'

export type BrowserStorageUsageEntry = {
    bytes: number
    category: BrowserStorageCategory
}

const indexedDBCategories: Record<string, BrowserStorageCategory> = {
    'firefox-translations-models': 'translationCache',
    'hypaVector': 'hypaVector',
    'inlay': 'inlay',
    'LLMTranslateCache': 'translationCache',
    'localforage': 'other',
    'plugin': 'plugin',
    'plugin_permissions': 'plugin',
    'risuai': 'mainDatabase',
    'risuaiAccountCached': 'mainDatabase',
    'risuSaveCache': 'saveCache',
}

const cacheStorageCategories: Record<string, BrowserStorageCategory> = {
    'risuCache': 'assetCache',
    'tfCache': 'localModel',
}

const mainStorageKeyCategories: [prefix: string, category: BrowserStorageCategory][] = [
    ['assets/', 'assets'],
    ['database/dbbackup-', 'autoBackup'],
]

const textEncoder = new TextEncoder()

const mainStorageIndexedDBNames = new Set(['localforage', 'risuai'])
// OPFS file names are hex-encoded keys of the main storage
const mainStorageOPFSNameCategories = mainStorageKeyCategories.map(([prefix, category]): [string, BrowserStorageCategory] => [
    Array.from(textEncoder.encode(prefix), (byte) => byte.toString(16).padStart(2, '0')).join(''),
    category,
])

export async function getBrowserStorageEstimate(): Promise<StorageEstimate | null> {
    if (!navigator.storage?.estimate) {
        return null
    }
    try {
        return await navigator.storage.estimate()
    } catch {
        return null
    }
}

/**
 * Approximates the stored size of a structured-cloneable value. Strings count as UTF-8.
 */
export function estimateValueSize(value: unknown, seen: WeakSet<object> = new WeakSet()): number {
    if (value === null || value === undefined) {
        return 0
    }
    switch (typeof value) {
        case 'string':
            return textEncoder.encode(value).byteLength
        case 'number':
        case 'bigint':
            return 8
        case 'boolean':
            return 1
        case 'object':
            break
        default:
            return 0
    }

    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
        return value.byteLength
    }
    if (value instanceof Blob) {
        return value.size
    }
    if (seen.has(value)) {
        return 0
    }
    seen.add(value)

    let size = 0
    if (value instanceof Map) {
        for (const [key, item] of value) {
            size += estimateValueSize(key, seen) + estimateValueSize(item, seen)
        }
        return size
    }
    if (value instanceof Set || Array.isArray(value)) {
        for (const item of value) {
            size += estimateValueSize(item, seen)
        }
        return size
    }
    for (const [key, item] of Object.entries(value)) {
        size += textEncoder.encode(key).byteLength + estimateValueSize(item, seen)
    }
    return size
}

function categorizeIndexedDB(name: string): BrowserStorageCategory {
    if (name.startsWith('safe_plugin_')) {
        return 'plugin'
    }
    return indexedDBCategories[name] ?? 'other'
}

function categorizeIndexedDBEntry(name: string, category: BrowserStorageCategory, key: IDBValidKey): BrowserStorageCategory {
    if (!mainStorageIndexedDBNames.has(name) || typeof key !== 'string') {
        return category
    }
    return mainStorageKeyCategories.find(([prefix]) => key.startsWith(prefix))?.[1] ?? category
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(request.result)
        }
        request.onerror = () => {
            reject(request.error)
        }
    })
}

function openExistingIndexedDB(name: string): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
        const request = indexedDB.open(name)
        request.onupgradeneeded = () => {
            request.transaction?.abort()
        }
        request.onsuccess = () => {
            const db = request.result
            db.onversionchange = () => {
                db.close()
            }
            resolve(db)
        }
        request.onerror = () => {
            resolve(null)
        }
    })
}

async function measureIndexedDB(name: string, add: (category: BrowserStorageCategory, bytes: number) => void) {
    const db = await openExistingIndexedDB(name)
    if (!db) {
        return
    }

    const category = categorizeIndexedDB(name)
    try {
        for (const storeName of Array.from(db.objectStoreNames)) {
            const keys = await requestToPromise(
                db.transaction(storeName, 'readonly').objectStore(storeName).getAllKeys()
            )
            // One transaction per value, so app writes to this store do not wait for the whole measurement
            for (const key of keys) {
                const value = await requestToPromise(
                    db.transaction(storeName, 'readonly').objectStore(storeName).get(key)
                )
                add(categorizeIndexedDBEntry(name, category, key), estimateValueSize(key) + estimateValueSize(value))
            }
        }
    } catch (error) {
        console.error(`Failed to measure IndexedDB ${name}`, error)
    } finally {
        db.close()
    }
}

async function listIndexedDBNames(): Promise<string[]> {
    if (typeof indexedDB.databases === 'function') {
        try {
            const databases = await indexedDB.databases()
            return databases.map((db) => db.name).filter((name): name is string => !!name)
        } catch (error) {
            console.error('Failed to list IndexedDB databases', error)
        }
    }
    return Object.keys(indexedDBCategories)
}

async function measureOPFSDirectory(directory: FileSystemDirectoryHandle): Promise<number> {
    let size = 0
    for await (const entry of directory.values()) {
        if (entry.kind === 'file') {
            size += (await (entry as FileSystemFileHandle).getFile()).size
        } else {
            size += await measureOPFSDirectory(entry as FileSystemDirectoryHandle)
        }
    }
    return size
}

function categorizeOPFSFile(name: string): BrowserStorageCategory {
    if (name.startsWith('coldstorage_')) {
        return 'coldStorage'
    }
    return mainStorageOPFSNameCategories.find(([prefix]) => name.startsWith(prefix))?.[1] ?? 'mainDatabase'
}

async function measureOPFS(add: (category: BrowserStorageCategory, bytes: number) => void) {
    if (!navigator.storage?.getDirectory) {
        return
    }
    try {
        const root = await navigator.storage.getDirectory()
        for await (const entry of root.values()) {
            if (entry.kind === 'file') {
                const { size } = await (entry as FileSystemFileHandle).getFile()
                add(categorizeOPFSFile(entry.name), size)
            } else {
                add('other', await measureOPFSDirectory(entry as FileSystemDirectoryHandle))
            }
        }
    } catch (error) {
        console.error('Failed to measure OPFS', error)
    }
}

async function measureCacheStorage(add: (category: BrowserStorageCategory, bytes: number) => void) {
    if (typeof caches === 'undefined') {
        return
    }
    try {
        for (const name of await caches.keys()) {
            const cache = await caches.open(name)
            const category = cacheStorageCategories[name] ?? 'other'
            for (const request of await cache.keys()) {
                const response = await cache.match(request)
                if (response) {
                    add(category, (await response.blob()).size)
                }
            }
        }
    } catch (error) {
        console.error('Failed to measure Cache Storage', error)
    }
}

/**
 * Measures IndexedDB, OPFS and Cache Storage of this origin by reading every stored value, sorted by size in descending order.
 */
export async function measureBrowserStorage(): Promise<BrowserStorageUsageEntry[]> {
    const usage = new Map<BrowserStorageCategory, number>()
    const add = (category: BrowserStorageCategory, bytes: number) => {
        usage.set(category, (usage.get(category) ?? 0) + bytes)
    }

    if (typeof indexedDB !== 'undefined') {
        for (const name of await listIndexedDBNames()) {
            await measureIndexedDB(name, add)
        }
    }
    await measureOPFS(add)
    await measureCacheStorage(add)

    return Array.from(usage, ([category, bytes]) => ({ bytes, category }))
        .filter((entry) => entry.bytes > 0)
        .sort((a, b) => b.bytes - a.bytes)
}

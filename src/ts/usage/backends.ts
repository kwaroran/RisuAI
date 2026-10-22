import { BaseDirectory, exists, mkdir, readDir, readFile, remove, rename, writeFile } from '@tauri-apps/plugin-fs'
import localforage from 'localforage'
import { isNodeServer, isTauri } from '../platform'
import { NodeStorage } from '../storage/nodeStorage'
import type { UsageBackend } from './store'

const folder = 'usage'

function encode(value: unknown): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(value))
}

function decode(data: Uint8Array): unknown {
    return JSON.parse(new TextDecoder().decode(data))
}

/** JSON files in the app data folder. Written to a temporary file first, so a crash cannot leave half a file. */
async function tauriBackend(): Promise<UsageBackend> {
    const baseDir = BaseDirectory.AppData
    if(!await exists(folder, { baseDir })){
        await mkdir(folder, { baseDir, recursive: true })
    }
    const path = (name: string) => `${folder}/${name}.json`

    return {
        async read(name) {
            if(!await exists(path(name), { baseDir })){
                return null
            }
            return decode(await readFile(path(name), { baseDir }))
        },
        async write(name, value) {
            await writeFile(path(name) + '.tmp', encode(value), { baseDir })
            await rename(path(name) + '.tmp', path(name), { oldPathBaseDir: baseDir, newPathBaseDir: baseDir })
        },
        async list() {
            const entries = await readDir(folder, { baseDir })
            return entries
                .filter((entry) => entry.isFile && entry.name.endsWith('.json'))
                .map((entry) => entry.name.slice(0, -'.json'.length))
        },
        async remove(name) {
            await remove(path(name), { baseDir })
        },
    }
}

/** Files on the self-hosted server, next to the rest of the user's data. */
function nodeBackend(): UsageBackend {
    const storage = new NodeStorage()
    const prefix = `${folder}/`
    const key = (name: string) => `${prefix}${name}.json`

    return {
        async read(name) {
            const data = await storage.getItem(key(name))
            return data ? decode(data) : null
        },
        async write(name, value) {
            await storage.setItem(key(name), encode(value))
        },
        async list() {
            return (await storage.keys())
                .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
                .map((name) => name.slice(prefix.length, -'.json'.length))
        },
        async remove(name) {
            await storage.removeItem(key(name))
        },
    }
}

/** A separate IndexedDB database, so it never touches the main save. */
function browserBackend(): UsageBackend {
    const store = localforage.createInstance({ name: 'risuai-usage' })
    return {
        read: (name) => store.getItem(name),
        write: async (name, value) => {
            await store.setItem(name, value)
        },
        list: () => store.keys(),
        remove: (name) => store.removeItem(name),
    }
}

export async function platformBackend(): Promise<UsageBackend> {
    if(isTauri){
        return await tauriBackend()
    }
    if(isNodeServer){
        return nodeBackend()
    }
    return browserBackend()
}

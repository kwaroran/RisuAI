import {
    addToDays,
    bucketKey,
    mergeDays,
    monthOfDay,
    toDayKey,
    type UsageBucket,
    type UsageCounters,
    type UsageDays,
    type UsageMonth,
} from './types'

/**
 * Where usage documents are kept. Documents are small JSON values: one per month of usage.
 * Usage is kept out of the main database on purpose, because saving that database rewrites all of it.
 */
export interface UsageBackend {
    /** Resolves to null when the document does not exist. */
    read(name: string): Promise<unknown>
    write(name: string, value: unknown): Promise<void>
    list(): Promise<string[]>
    remove(name: string): Promise<void>
}

const isMonthDocument = (name: string) => /^\d{4}-\d{2}$/.test(name)

function readMonth(value: unknown): UsageMonth {
    const days = (value as UsageMonth)?.days
    return { version: 1, days: days && typeof days === 'object' ? days : {} }
}

/**
 * Records usage in memory first and writes it out a few seconds later, so a burst of requests
 * (chat, memory, translation...) costs one small write instead of one per request.
 */
export class UsageStore {
    /** Recorded but not written yet. */
    private pending: UsageDays = {}
    private flushTimer: ReturnType<typeof setTimeout> | undefined
    private writing: Promise<void> = Promise.resolve()
    private listeners = new Set<(added: UsageDays) => void>()
    private backend: Promise<UsageBackend> | undefined
    private savesOnExit = false

    constructor(private openBackend: () => Promise<UsageBackend>, private flushDelay = 3000) {}

    private getBackend(): Promise<UsageBackend> {
        this.backend ??= this.openBackend().catch((error) => {
            this.backend = undefined
            throw error
        })
        return this.backend
    }

    record(bucket: UsageBucket, counters: UsageCounters, date = new Date()) {
        const added: UsageDays = {}
        addToDays(added, toDayKey(date), bucketKey(bucket), counters)
        mergeDays(this.pending, added)
        for(const listener of this.listeners){
            try {
                listener(added)
            } catch (error) {
                console.error(error)
            }
        }

        this.flushTimer ??= setTimeout(() => this.flush(), this.flushDelay)
        this.saveOnExit()
    }

    /** Calls `listener` with the usage of each new request. Returns a function that stops it. */
    onRecord(listener: (added: UsageDays) => void): () => void {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    /** Writes pending usage now. */
    flush(): Promise<void> {
        clearTimeout(this.flushTimer)
        this.flushTimer = undefined
        return this.queue(() => this.writePending())
    }

    /** Runs `task` after the writes queued before it, and holds back the writes queued after it. */
    private queue<T>(task: () => Promise<T>): Promise<T> {
        const result = this.writing.then(task)
        this.writing = result.then(() => undefined, () => undefined)
        return result
    }

    private async writePending() {
        const batch = this.pending
        this.pending = {}
        const months = new Map<string, UsageDays>()
        for(const [day, buckets] of Object.entries(batch)){
            const month = monthOfDay(day)
            if(!months.has(month)){
                months.set(month, {})
            }
            months.get(month)[day] = buckets
        }

        try {
            const backend = await this.getBackend()
            await withLock(async () => {
                for(const [month, days] of months){
                    // Read again under the lock: another tab may have written this month since.
                    const stored = readMonth(await backend.read(month))
                    mergeDays(stored.days, days)
                    await backend.write(month, stored)
                    months.delete(month)
                }
            })
        } catch (error) {
            console.error('[usage] Could not save usage, will retry', error)
            for(const days of months.values()){
                mergeDays(this.pending, days)
            }
            this.flushTimer ??= setTimeout(() => this.flush(), this.flushDelay * 10)
        }
    }

    /** Every recorded day, including usage that is not written yet. */
    loadHistory(): Promise<UsageDays> {
        // Queued with the writes, so a request is either in a stored month or still pending, never both.
        return this.queue(async () => {
            const backend = await this.getBackend()
            const days: UsageDays = {}
            const names = (await backend.list()).filter(isMonthDocument).sort()
            for(const name of names){
                try {
                    mergeDays(days, readMonth(await backend.read(name)).days)
                } catch (error) {
                    console.error(`[usage] Could not read usage of ${name}`, error)
                }
            }
            return mergeDays(days, this.pending)
        })
    }

    clearHistory(): Promise<void> {
        clearTimeout(this.flushTimer)
        this.flushTimer = undefined
        this.pending = {}
        return this.queue(async () => {
            const backend = await this.getBackend()
            await withLock(async () => {
                for(const name of await backend.list()){
                    if(isMonthDocument(name)){
                        await backend.remove(name)
                    }
                }
            })
        })
    }

    /** Best effort: writes pending usage when the page is hidden or closed. */
    private saveOnExit() {
        if(this.savesOnExit || typeof window === 'undefined'){
            return
        }
        this.savesOnExit = true
        window.addEventListener('pagehide', () => this.flush())
        document.addEventListener('visibilitychange', () => {
            if(document.visibilityState === 'hidden'){
                this.flush()
            }
        })
    }
}

/** Keeps two tabs from writing the same month at once, where Web Locks exist. */
async function withLock(task: () => Promise<void>) {
    const locks = globalThis.navigator?.locks
    if(locks){
        await locks.request('risu-usage', task)
    }
    else{
        await task()
    }
}

export const usageStore = new UsageStore(() => import('./backends').then((module) => module.platformBackend()))

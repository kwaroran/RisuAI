import { afterEach, describe, expect, it, vi } from 'vitest'

import { UsageStore, type UsageBackend } from '../store'
import { bucketKey, emptyCounters, type UsageMonth } from '../types'

function memoryBackend() {
    const documents = new Map<string, unknown>()
    const backend: UsageBackend = {
        read: async (name) => structuredClone(documents.get(name) ?? null),
        write: vi.fn(async (name: string, value: unknown) => {
            documents.set(name, structuredClone(value))
        }),
        list: async () => [...documents.keys()],
        remove: async (name) => {
            documents.delete(name)
        },
    }
    return { backend, documents }
}

const bucket = { provider: 'openai', model: 'gpt-5', purpose: 'model' as const }
const key = bucketKey(bucket)
const usage = (input: number) => ({ ...emptyCounters(), requests: 1, input, output: 10 })

afterEach(() => {
    vi.useRealTimers()
})

describe('UsageStore', () => {
    it('writes a burst of requests at once, into the month document', async () => {
        vi.useFakeTimers()
        const { backend, documents } = memoryBackend()
        const store = new UsageStore(async () => backend, 1000)

        store.record(bucket, usage(100), new Date(2026, 9, 3))
        store.record(bucket, usage(200), new Date(2026, 9, 3))
        expect(backend.write).not.toHaveBeenCalled()

        await vi.advanceTimersByTimeAsync(1000)
        expect(backend.write).toHaveBeenCalledTimes(1)
        const month = documents.get('2026-10') as UsageMonth
        expect(month.days['2026-10-03'][key]).toMatchObject({ requests: 2, input: 300, output: 20 })
    })

    it('adds to what is already stored, such as usage written by another tab', async () => {
        const { backend, documents } = memoryBackend()
        documents.set('2026-10', { version: 1, days: { '2026-10-03': { [key]: usage(1000) } } })
        const store = new UsageStore(async () => backend)

        store.record(bucket, usage(5), new Date(2026, 9, 3))
        store.record(bucket, usage(7), new Date(2026, 8, 30))
        await store.flush()

        expect((documents.get('2026-10') as UsageMonth).days['2026-10-03'][key].input).toBe(1005)
        expect((documents.get('2026-09') as UsageMonth).days['2026-09-30'][key].input).toBe(7)
    })

    it('includes unwritten usage in the history', async () => {
        const { backend, documents } = memoryBackend()
        documents.set('2026-09', { version: 1, days: { '2026-09-01': { [key]: usage(1) } } })
        documents.set('prices', {})
        const store = new UsageStore(async () => backend, 60_000)

        store.record(bucket, usage(2), new Date(2026, 9, 3))
        const history = await store.loadHistory()

        expect(Object.keys(history).sort()).toEqual(['2026-09-01', '2026-10-03'])
        expect(history['2026-10-03'][key].input).toBe(2)
    })

    it('does not lose usage that is written while the history loads', async () => {
        const { backend, documents } = memoryBackend()
        documents.set('2026-09', { version: 1, days: { '2026-09-01': { [key]: usage(1) } } })
        const read = backend.read
        let openGate: () => void
        const gate = new Promise<void>((resolve) => {
            openGate = resolve
        })
        backend.read = vi.fn(async (name: string) => {
            await gate
            return read(name)
        })
        const store = new UsageStore(async () => backend, 60_000)

        store.record(bucket, usage(5), new Date(2026, 9, 3))
        const loading = store.loadHistory()
        const flushing = store.flush()
        await vi.waitFor(() => expect(backend.read).toHaveBeenCalled())
        openGate()
        await flushing

        const history = await loading
        expect(history['2026-10-03'][key].input).toBe(5)
        expect(history['2026-09-01'][key].input).toBe(1)
    })

    it('tells listeners about each new request', () => {
        const { backend } = memoryBackend()
        const store = new UsageStore(async () => backend, 60_000)
        const listener = vi.fn()
        const stop = store.onRecord(listener)

        store.record(bucket, usage(3), new Date(2026, 9, 3))
        stop()
        store.record(bucket, usage(4), new Date(2026, 9, 3))

        expect(listener).toHaveBeenCalledTimes(1)
        expect(listener.mock.calls[0][0]['2026-10-03'][key].input).toBe(3)
    })

    it('keeps usage that failed to save and tries again', async () => {
        const { backend, documents } = memoryBackend()
        const write = backend.write
        backend.write = vi.fn().mockRejectedValueOnce(new Error('disk full')).mockImplementation(write)
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const store = new UsageStore(async () => backend, 60_000)

        store.record(bucket, usage(9), new Date(2026, 9, 3))
        await store.flush()
        expect(documents.has('2026-10')).toBe(false)

        await store.flush()
        expect((documents.get('2026-10') as UsageMonth).days['2026-10-03'][key].input).toBe(9)
    })

    it('clears usage but keeps other documents', async () => {
        const { backend, documents } = memoryBackend()
        documents.set('prices', {})
        const store = new UsageStore(async () => backend, 60_000)
        store.record(bucket, usage(1), new Date(2026, 9, 3))
        await store.flush()

        await store.clearHistory()

        expect([...documents.keys()]).toEqual(['prices'])
        expect(await store.loadHistory()).toEqual({})
    })
})

import { describe, expect, it, vi } from 'vitest'

import type { StreamResponseChunk } from '../../process/request/request'
import { sumUsage, UsageMeter, watchStream } from '../meter'
import type { UsageCounters } from '../types'

function createMeter() {
    const recorded: UsageCounters[] = []
    const models: (string | undefined)[] = []
    const meter = new UsageMeter({
        countPrompt: async () => 1000,
        countText: async (text) => text.length,
        record: (counters, model) => {
            recorded.push(counters)
            models.push(model)
        },
    })
    return { meter, recorded, models }
}

function streamOf(chunks: StreamResponseChunk[]) {
    return new ReadableStream<StreamResponseChunk>({
        start(controller) {
            for(const chunk of chunks){
                controller.enqueue(chunk)
            }
            controller.close()
        },
    })
}

async function readAll(stream: ReadableStream<StreamResponseChunk>) {
    const reader = stream.getReader()
    const chunks: StreamResponseChunk[] = []
    while(true){
        const { done, value } = await reader.read()
        if(done){
            break
        }
        chunks.push(value)
    }
    await reader.cancel()
    return chunks
}

describe('sumUsage', () => {
    it('adds fields that were reported and leaves out the rest', () => {
        expect(sumUsage([{ input: 10, output: 5 }, { input: 20 }])).toEqual({ input: 30, output: 5 })
    })
})

describe('UsageMeter', () => {
    it('records reported usage of a plain result', async () => {
        const { meter, recorded } = createMeter()
        meter.add({ input: 100, cacheRead: 50, cacheWrite: 0, output: 20 })
        meter.track({ type: 'success', result: 'hello' })

        await vi.waitFor(() => expect(recorded).toHaveLength(1))
        expect(recorded[0]).toMatchObject({ requests: 1, input: 100, cacheRead: 50, output: 20, estimated: 0 })
    })

    it('adds up the API calls of one request', async () => {
        const { meter, recorded } = createMeter()
        meter.add({ input: 100, output: 10 })
        meter.add({ input: 130, output: 30 })
        meter.track({ type: 'success', result: 'done' })

        await vi.waitFor(() => expect(recorded).toHaveLength(1))
        expect(recorded[0]).toMatchObject({ requests: 1, input: 230, output: 40 })
    })

    it('lets later stream updates replace earlier ones', async () => {
        const { meter, recorded } = createMeter()
        const response = meter.newResponse()
        response.update({ input: 300, cacheRead: 0, cacheWrite: 0 })
        response.update({ output: 5 })
        response.update({ output: 42 })
        meter.track({ type: 'success', result: 'x' })

        await vi.waitFor(() => expect(recorded).toHaveLength(1))
        expect(recorded[0]).toMatchObject({ input: 300, output: 42, estimated: 0 })
    })

    it('estimates with the tokenizer when the provider reports nothing', async () => {
        const { meter, recorded } = createMeter()
        meter.track({ type: 'multiline', result: [['char', 'abc'], ['user', 'de']] })

        await vi.waitFor(() => expect(recorded).toHaveLength(1))
        expect(recorded[0]).toMatchObject({ input: 1000, output: 'abc\nde'.length, estimated: 1 })
    })

    it('only estimates what is missing', async () => {
        const { meter, recorded } = createMeter()
        meter.add({ input: 10, cacheRead: 0, cacheWrite: 0 })
        meter.track({ type: 'success', result: 'four' })

        await vi.waitFor(() => expect(recorded).toHaveLength(1))
        expect(recorded[0]).toMatchObject({ input: 10, output: 4, estimated: 1 })
    })

    it('skips failed requests that used nothing', async () => {
        const { meter, recorded } = createMeter()
        meter.track({ type: 'fail', result: 'error' })
        await new Promise((resolve) => setTimeout(resolve, 10))
        expect(recorded).toHaveLength(0)
    })

    it('keeps the usage of a failed request whose earlier calls went through', async () => {
        const { meter, recorded } = createMeter()
        meter.add({ input: 50, output: 5 })
        meter.track({ type: 'fail', result: 'error' })

        await vi.waitFor(() => expect(recorded).toHaveLength(1))
        expect(recorded[0]).toMatchObject({ input: 50, output: 5, estimated: 0 })
    })

    it('records a stream when it ends, with usage that arrived during the stream', async () => {
        const { meter, recorded } = createMeter()
        const response = meter.newResponse()
        const source = new ReadableStream<StreamResponseChunk>({
            start(controller) {
                controller.enqueue({ '0': 'Hel' })
                controller.enqueue({ '0': 'Hello' })
                response.update({ input: 70, cacheRead: 0, cacheWrite: 0, output: 2 })
                controller.close()
            },
        })

        const tracked = meter.track({ type: 'streaming', result: source })
        expect(recorded).toHaveLength(0)
        if(tracked.type !== 'streaming'){
            throw new Error('expected a stream')
        }
        expect(await readAll(tracked.result)).toEqual([{ '0': 'Hel' }, { '0': 'Hello' }])

        await vi.waitFor(() => expect(recorded).toHaveLength(1))
        expect(recorded[0]).toMatchObject({ input: 70, output: 2, estimated: 0 })
    })

    it('estimates the output of a stream that was stopped early', async () => {
        const { meter, recorded } = createMeter()
        meter.newResponse().update({ input: 70, cacheRead: 0, cacheWrite: 0 })
        const source = new ReadableStream<StreamResponseChunk>({
            start(controller) {
                controller.enqueue({ '0': 'partial' })
            },
        })

        const tracked = meter.track({ type: 'streaming', result: source })
        if(tracked.type !== 'streaming'){
            throw new Error('expected a stream')
        }
        const reader = tracked.result.getReader()
        await reader.read()
        await reader.cancel()

        await vi.waitFor(() => expect(recorded).toHaveLength(1))
        expect(recorded[0]).toMatchObject({ input: 70, output: 'partial'.length, estimated: 1 })
    })

    it('estimates the output of every generation and skips metadata keys', async () => {
        const { meter, recorded } = createMeter()
        meter.newResponse().update({ input: 70, cacheRead: 0, cacheWrite: 0 })
        const tracked = meter.track({
            type: 'streaming',
            result: streamOf([{ '0': 'first', '1': 'second', '__tool_calls': '{"0":{"id":"call_1"}}' }]),
        })
        if(tracked.type !== 'streaming'){
            throw new Error('expected a stream')
        }
        await readAll(tracked.result)

        await vi.waitFor(() => expect(recorded).toHaveLength(1))
        expect(recorded[0].output).toBe('first\nsecond'.length)
    })

    it('records an empty stream that ended normally as a successful empty response', async () => {
        const { meter, recorded } = createMeter()
        const tracked = meter.track({ type: 'streaming', result: streamOf([]) })
        if(tracked.type !== 'streaming'){
            throw new Error('expected a stream')
        }
        await readAll(tracked.result)

        await vi.waitFor(() => expect(recorded).toHaveLength(1))
        expect(recorded[0]).toMatchObject({ requests: 1, input: 1000, output: 0, estimated: 1 })
    })

    it('records nothing for a stream that failed before its first chunk', async () => {
        const { meter, recorded } = createMeter()
        const failing = new ReadableStream<StreamResponseChunk>({
            pull(controller) {
                controller.error(new Error('network'))
            },
        })
        const tracked = meter.track({ type: 'streaming', result: failing })
        if(tracked.type !== 'streaming'){
            throw new Error('expected a stream')
        }
        await expect(tracked.result.getReader().read()).rejects.toThrow('network')

        await new Promise((resolve) => setTimeout(resolve, 10))
        expect(recorded).toHaveLength(0)
    })

    it('records nothing for a stream cancelled before its first chunk', async () => {
        const { meter, recorded } = createMeter()
        const source = new ReadableStream<StreamResponseChunk>({ pull() {} })
        const tracked = meter.track({ type: 'streaming', result: source })
        if(tracked.type !== 'streaming'){
            throw new Error('expected a stream')
        }
        await tracked.result.cancel()

        await new Promise((resolve) => setTimeout(resolve, 10))
        expect(recorded).toHaveLength(0)
    })

    it('hands the model set by the provider to the recorder', async () => {
        const { meter, recorded, models } = createMeter()
        meter.setModel('vendor/free-model')
        meter.track({ type: 'success', result: 'hi' })

        await vi.waitFor(() => expect(recorded).toHaveLength(1))
        expect(models).toEqual(['vendor/free-model'])
    })
})

describe('watchStream', () => {
    it('reports the end once even when the reader cancels after finishing', async () => {
        const onEnd = vi.fn()
        const stream = watchStream(streamOf([{ '0': 'a' }, { '0': 'ab' }]), onEnd)
        await readAll(stream)
        expect(onEnd).toHaveBeenCalledTimes(1)
        expect(onEnd).toHaveBeenCalledWith({ '0': 'ab' }, true)
    })

    it('passes errors on', async () => {
        const onEnd = vi.fn()
        const failing = new ReadableStream<StreamResponseChunk>({
            pull(controller) {
                controller.error(new Error('network'))
            },
        })
        const reader = watchStream(failing, onEnd).getReader()
        await expect(reader.read()).rejects.toThrow('network')
        expect(onEnd).toHaveBeenCalledWith(undefined, false)
    })
})

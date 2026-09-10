import { describe, expect, it, vi } from 'vitest'

import { pipeStreamWithTextLog } from './streamFetchLog'

describe('pipeStreamWithTextLog', () => {
    it('forwards the complete stream and records its text', async () => {
        const encoder = new TextEncoder()
        const onFinalize = vi.fn()
        const source = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(encoder.encode('hel'))
                controller.enqueue(encoder.encode('lo'))
                controller.close()
            },
        })

        const response = new Response(pipeStreamWithTextLog(source, onFinalize))

        await expect(response.text()).resolves.toBe('hello')
        expect(onFinalize).toHaveBeenCalledOnce()
        expect(onFinalize).toHaveBeenCalledWith('hello')
    })

    it('propagates cancellation and records only consumed data', async () => {
        const encoder = new TextEncoder()
        const onCancel = vi.fn()
        const onFinalize = vi.fn()
        const source = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(encoder.encode('first'))
            },
            cancel: onCancel,
        })
        const reader = pipeStreamWithTextLog(source, onFinalize).getReader()

        await expect(reader.read()).resolves.toMatchObject({ done: false })
        await reader.cancel('stopped')

        expect(onCancel).toHaveBeenCalledWith('stopped')
        expect(onFinalize).toHaveBeenCalledOnce()
        expect(onFinalize).toHaveBeenCalledWith('first')
    })
})

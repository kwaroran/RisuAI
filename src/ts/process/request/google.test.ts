import { describe, expect, it, vi, beforeEach } from 'vitest'

import { __testGoogleRequestsAPI } from './google'

const mocks = vi.hoisted(() => ({
    db: {},
    fetchNative: vi.fn(),
    saveInlayedSignature: vi.fn(),
    setInlayAsset: vi.fn(),
    writeInlayImage: vi.fn(),
    v4: vi.fn(),
}))

vi.mock('src/ts/globalApi.svelte', () => ({
    addFetchLog: vi.fn(),
    fetchNative: mocks.fetchNative,
    textifyReadableStream: vi.fn(),
}))

vi.mock('src/ts/model/modellist', () => ({
    LLMFlags: {
        hasAudioInput: 2,
        hasImageInput: 1,
        hasVideoInput: 3,
    },
    LLMFormat: {
        GoogleCloud: 5,
        VertexAIGemini: 6,
    },
}))

vi.mock('src/ts/storage/database.svelte', () => ({
    getDatabase: () => mocks.db,
    setDatabase: vi.fn(),
}))

vi.mock('src/ts/util', () => ({
    base64url: (data: string) => data,
    simplifySchema: (schema: unknown) => schema,
}))

vi.mock('../files/inlays', () => ({
    saveInlayedSignature: mocks.saveInlayedSignature,
    setInlayAsset: mocks.setInlayAsset,
    writeInlayImage: mocks.writeInlayImage,
}))

vi.mock('../templates/jsonSchema', () => ({
    extractJSON: (data: string) => data,
    getGeneralJSONSchema: () => ({}),
}))

vi.mock('../mcp/mcp', () => ({
    callTool: vi.fn(),
    decodeToolCall: vi.fn(),
    encodeToolCall: vi.fn(),
}))

vi.mock('src/ts/alert', () => ({
    alertError: vi.fn(),
}))

vi.mock('src/ts/stores.svelte', () => ({
    bodyIntercepterStore: [],
}))

vi.mock('uuid', () => ({
    v4: mocks.v4,
}))

const modelInfo = {
    format: 5,
    id: 'gemini-test',
    internalID: 'gemini-test',
} as any

async function collectStream(stream: ReadableStream<Record<string, string>>) {
    const reader = stream.getReader()
    const chunks: Record<string, string>[] = []
    while(true){
        const { done, value } = await reader.read()
        if(done){
            return chunks
        }
        chunks.push(value)
    }
}

describe('Google/Gemini stream parser', () => {
    beforeEach(() => {
        mocks.fetchNative.mockReset()
        mocks.saveInlayedSignature.mockReset()
        mocks.setInlayAsset.mockReset()
        mocks.writeInlayImage.mockReset()
        mocks.v4.mockReset()
    })

    it('keeps only unfinished event text buffered and parses each completed SSE event once', async () => {
        const stream = __testGoogleRequestsAPI.getTranStream({
            modelInfo,
            saveSignature: false,
        })
        const chunksPromise = collectStream(stream.readable)
        const writer = stream.writable.getWriter()
        const encoder = new TextEncoder()
        const parseSpy = vi.spyOn(JSON, 'parse')

        try{
            await writer.write(encoder.encode('data: {"candidates":[{"content":{"parts":[{"text":"Hel"}]}}]}\n\n'))
            await writer.write(encoder.encode('data: {"candidates":[{"content":{"parts":[{"text":"lo"}]}}]}\n\n'))
            await writer.write(encoder.encode('data: {"candidates":[{"content":{"parts":[{"text":"!"}]}}]}\n\n'))
            await writer.write(encoder.encode('data: [DONE]\n\n'))
            await writer.close()

            const chunks = await chunksPromise
            expect(chunks.at(-1)?.['0']).toBe('Hello!')
            expect(parseSpy).toHaveBeenCalledTimes(3)
        }
        finally{
            parseSpy.mockRestore()
        }
    })

    it('preserves split UTF-8 text across chunk boundaries', async () => {
        const stream = __testGoogleRequestsAPI.getTranStream({
            modelInfo,
            saveSignature: false,
        })
        const chunksPromise = collectStream(stream.readable)
        const writer = stream.writable.getWriter()
        const encoder = new TextEncoder()
        const bytes = encoder.encode('data: {"candidates":[{"content":{"parts":[{"text":"Hi 😀"}]}}]}\n\n')
        const emojiStart = bytes.findIndex((byte, index) => byte === 0xf0 && bytes[index + 1] === 0x9f)

        await writer.write(bytes.slice(0, emojiStart + 2))
        await writer.write(bytes.slice(emojiStart + 2))
        await writer.close()

        const chunks = await chunksPromise
        expect(chunks.at(-1)?.['0']).toBe('Hi 😀')
    })

    it('joins multiple data lines in one SSE event', async () => {
        const stream = __testGoogleRequestsAPI.getTranStream({
            modelInfo,
            saveSignature: false,
        })
        const chunksPromise = collectStream(stream.readable)
        const writer = stream.writable.getWriter()
        const encoder = new TextEncoder()

        await writer.write(encoder.encode('data: {"candidates":\ndata: [{"content":{"parts":[{"text":"Hi"}]}}]}\n\n'))
        await writer.close()

        const chunks = await chunksPromise
        expect(chunks.at(-1)?.['0']).toBe('Hi')
    })

    it('parses split lines and runs signature side effects only once per new event', async () => {
        mocks.v4.mockReturnValueOnce('sig-text-id').mockReturnValueOnce('sig-fn-id')

        const stream = __testGoogleRequestsAPI.getTranStream({
            modelInfo,
            saveSignature: true,
        })
        const chunksPromise = collectStream(stream.readable)
        const writer = stream.writable.getWriter()
        const encoder = new TextEncoder()
        const signedCallEvent = 'data: {"candidates":[{"content":{"parts":[{"text":"Thinking","thought":true,"thoughtSignature":"sig-text"},{"functionCall":{"name":"lookup","args":{"q":"x"}},"thoughtSignature":"sig-fn"}]}}]}\n\n'

        await writer.write(encoder.encode(signedCallEvent.slice(0, 72)))
        await writer.write(encoder.encode(signedCallEvent.slice(72)))
        await writer.write(encoder.encode('data: {"candidates":[{"content":{"parts":[{"text":"Answer"}]}}],"usageMetadata":{"totalTokenCount":9},"modelStatus":{"status":"ok"}}\n\n'))
        await writer.close()

        const chunks = await chunksPromise
        const lastChunk = chunks.at(-1) ?? {}

        expect(lastChunk['0']).toBe('{{inlayeddata::sig-text-id}}{{inlayeddata::sig-fn-id}}Answer')
        expect(lastChunk['__thoughts']).toBe('Thinking')
        expect(lastChunk['__last_thought']).toBe('')
        expect(lastChunk['__sign_text']).toBe('sig-text')
        expect(lastChunk['__sign_function']).toBe('sig-fn')
        expect(lastChunk['__tool_calls']).toBe(JSON.stringify([
            {
                name: 'lookup',
                args: {
                    q: 'x',
                },
            },
        ]))
        expect(lastChunk['__usageMetadata']).toBe(JSON.stringify({ totalTokenCount: 9 }))
        expect(lastChunk['__modelStatus']).toBe(JSON.stringify({ status: 'ok' }))
        expect(mocks.saveInlayedSignature).toHaveBeenCalledTimes(2)
    })
})

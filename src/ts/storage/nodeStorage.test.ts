import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/lang', () => ({
    language: {}
}))

vi.mock('../alert', () => ({
    alertError: vi.fn(),
    alertInput: vi.fn(),
    waitAlert: vi.fn()
}))

vi.mock('../util', () => ({
    base64url: vi.fn(),
    getKeypairStore: vi.fn(),
    saveKeypairStore: vi.fn()
}))

import { NodeStorage } from './nodeStorage'

describe('NodeStorage.setItem', () => {
    const fetchMock = vi.fn()
    let storage:NodeStorage

    beforeEach(() => {
        fetchMock.mockReset()
        vi.stubGlobal('fetch', fetchMock)
        storage = new NodeStorage()
        vi.spyOn(storage as any, 'checkAuth').mockResolvedValue(undefined)
        vi.spyOn(storage, 'createAuth').mockResolvedValue('test-auth')
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('includes storage context and JSON server details for HTTP errors', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({
            error: 'Failed to write storage item',
            code: 'ENOSPC',
            message: "ENOSPC: no space left on device, open './save/64617461626173652f64617461626173652e62696e'"
        }), {
            status: 507,
            statusText: 'Insufficient Storage',
            headers: {
                'content-type': 'application/json'
            }
        }))

        await expect(storage.setItem('database/database.bin', new Uint8Array(2048))).rejects.toThrow(
            'Node storage setItem failed.\n' +
            'Key: database/database.bin\n' +
            'Size: 2048 bytes (2.00 KiB)\n' +
            'HTTP: 507 Insufficient Storage\n' +
            'Server: Failed to write storage item | ENOSPC | ' +
            "ENOSPC: no space left on device, open './save/64617461626173652f64617461626173652e62696e'"
        )
    })

    it('includes structured server details for payload limit errors', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({
            error: 'Storage payload is too large',
            code: 'PAYLOAD_TOO_LARGE',
            message: 'Storage writes are limited to 100 MiB.'
        }), {
            status: 413,
            statusText: 'Payload Too Large',
            headers: {
                'content-type': 'application/json'
            }
        }))

        await expect(storage.setItem('assets/example', new Uint8Array(3))).rejects.toThrow(
            'HTTP: 413 Payload Too Large\n' +
            'Server: Storage payload is too large | PAYLOAD_TOO_LARGE | Storage writes are limited to 100 MiB.'
        )
    })

    it('extracts useful text from an HTML error response', async () => {
        fetchMock.mockResolvedValue(new Response(
            '<!DOCTYPE html><html><body><pre>PayloadTooLargeError: request entity too large<br>at parser</pre></body></html>',
            {
                status: 413,
                statusText: 'Payload Too Large',
                headers: {
                    'content-type': 'text/html'
                }
            }
        ))

        await expect(storage.setItem('assets/example', new Uint8Array(3))).rejects.toThrow(
            'HTTP: 413 Payload Too Large\nServer: PayloadTooLargeError: request entity too large\nat parser'
        )
    })

    it('distinguishes network failures from HTTP failures', async () => {
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

        await expect(storage.setItem('database/database.bin', new Uint8Array(3))).rejects.toThrow(
            'Node storage setItem request failed.\n' +
            'Key: database/database.bin\n' +
            'Size: 3 bytes\n' +
            'Cause: Failed to fetch'
        )
    })
})

// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    accountGetItem: vi.fn(),
    alertSelect: vi.fn(),
    getDatabase: vi.fn(),
}))

vi.mock('localforage', () => ({
    default: {
        clear: vi.fn(),
        createInstance: vi.fn(),
    },
}))

vi.mock('../globalApi.svelte', () => ({
    replaceDbResources: vi.fn((db) => db),
}))

vi.mock('src/ts/platform', () => ({
    isNodeServer: false,
}))

vi.mock('./nodeStorage', () => ({
    NodeStorage: class {},
}))

vi.mock('./opfsStorage', () => ({
    OpfsStorage: class {},
}))

vi.mock('../alert', () => ({
    alertError: vi.fn(),
    alertInput: vi.fn(),
    alertSelect: mocks.alertSelect,
    alertStore: { set: vi.fn() },
}))

vi.mock('./database.svelte', () => ({
    getDatabase: mocks.getDatabase,
}))

vi.mock('./accountStorage', () => ({
    AccountStorage: class {
        getItem = mocks.accountGetItem
        setItem = vi.fn()
    },
}))

vi.mock('./risuSave', () => ({
    decodeRisuSave: vi.fn(),
    encodeRisuSaveLegacy: vi.fn(),
}))

vi.mock('src/lang', () => ({
    language: {
        loadDataFromAccount: 'Load from account',
        saveCurrentDataToAccount: 'Save current data to account',
    },
}))

import { AutoStorage } from './autoStorage'

function makeStorage() {
    const storage = new AutoStorage()
    storage.realStorage = {
        keys: vi.fn().mockResolvedValue([]),
    } as any
    return storage
}

beforeEach(() => {
    localStorage.clear()
    mocks.accountGetItem.mockReset()
    mocks.alertSelect.mockReset()
    mocks.getDatabase.mockReset()
})

describe('AutoStorage.checkAccountSync', () => {
    it('does not read or snapshot the database when sync is explicitly avoided', async () => {
        localStorage.setItem('dosync', 'avoid')
        const storage = makeStorage()

        await expect(storage.checkAccountSync()).resolves.toBe(false)

        expect(mocks.getDatabase).not.toHaveBeenCalled()
    })

    it('restores account storage without reading the database when account sync is already active', async () => {
        localStorage.setItem('accountst', 'able')
        const storage = makeStorage()

        await expect(storage.checkAccountSync()).resolves.toBe(false)

        expect(storage.isAccount).toBe(true)
        expect(mocks.getDatabase).not.toHaveBeenCalled()
    })

    it('checks the live account flag without snapshotting when sync is disabled', async () => {
        mocks.getDatabase.mockReturnValue({ account: { useSync: false } })
        const storage = makeStorage()

        await expect(storage.checkAccountSync()).resolves.toBe(false)

        expect(mocks.getDatabase).toHaveBeenCalledTimes(1)
        expect(mocks.getDatabase).toHaveBeenCalledWith()
        expect(mocks.getDatabase).not.toHaveBeenCalledWith({ snapshot: true })
    })

    it('creates a snapshot only after account sync is selected', async () => {
        const liveDb = { account: { useSync: true } }
        const snapshotDb = { account: { useSync: true, token: 'snapshot' } }
        mocks.getDatabase.mockImplementation((options) => options?.snapshot ? snapshotDb : liveDb)
        mocks.accountGetItem.mockResolvedValue(new Uint8Array([1]))
        mocks.alertSelect.mockResolvedValue('0')
        const storage = makeStorage()

        await expect(storage.checkAccountSync()).resolves.toBe(true)

        expect(mocks.getDatabase.mock.calls).toEqual([
            [],
            [{ snapshot: true }],
        ])
    })
})

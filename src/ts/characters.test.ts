import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    saveImage: vi.fn(),
    readImage: vi.fn(),
    assetExists: vi.fn(),
    getFileSrc: vi.fn(),
    hasher: vi.fn(),
    findCharacterbyId: vi.fn(),
    alertStoreSet: vi.fn(),
    alertError: vi.fn(),
    selectSingleFile: vi.fn(),
    selectedCharIDValue: -1,
    dbState: {
        db: {
            hideAllImages: false,
            characters: [],
        } as any,
    },
}))

vi.mock('./storage/database.svelte', () => ({
    saveImage: (...args: any[]) => mocks.saveImage(...args),
    defaultSdDataFunc: vi.fn(),
    getDatabase: vi.fn(() => mocks.dbState.db),
    getCharacterByIndex: vi.fn(),
    setCharacterByIndex: vi.fn(),
}))

vi.mock('./stores.svelte', () => ({
    DBState: mocks.dbState,
    MobileGUIStack: { set: vi.fn() },
    OpenRealmStore: { set: vi.fn() },
    selectedCharID: {
        set: vi.fn((value: number) => {
            mocks.selectedCharIDValue = value
        }),
        subscribe: vi.fn((run: (value: number) => void) => {
            run(mocks.selectedCharIDValue)
            return () => {}
        }),
    },
}))

vi.mock('./globalApi.svelte', () => ({
    AppendableBuffer: class AppendableBuffer {},
    changeChatTo: vi.fn(),
    checkCharOrder: vi.fn(),
    downloadFile: vi.fn(),
    assetExists: (...args: any[]) => mocks.assetExists(...args),
    getFileSrc: (...args: any[]) => mocks.getFileSrc(...args),
    readImage: (...args: any[]) => mocks.readImage(...args),
    requiresFullEncoderReload: { state: false },
}))

vi.mock('./util', () => ({
    asBuffer: (arr: Uint8Array) => arr,
    checkNullish: (data: any) => data === undefined || data === null,
    findCharacterbyId: (...args: any[]) => mocks.findCharacterbyId(...args),
    getUserName: vi.fn(),
    selectMultipleFile: vi.fn(),
    selectSingleFile: (...args: any[]) => mocks.selectSingleFile(...args),
}))

vi.mock('./parser/parser.svelte', () => ({
    hasher: (...args: any[]) => mocks.hasher(...args),
    parseMarkdownSafe: (value: string) => value,
}))

vi.mock('./alert', () => ({
    alertAddCharacter: vi.fn(),
    alertConfirm: vi.fn(),
    alertError: (...args: any[]) => mocks.alertError(...args),
    alertNormal: vi.fn(),
    alertSelect: vi.fn(),
    alertStore: { set: (...args: any[]) => mocks.alertStoreSet(...args) },
    alertWait: vi.fn(),
}))

vi.mock('../lang', () => ({ language: {} }))
vi.mock('./media', () => ({ getImageType: vi.fn(() => 'PNG') }))
vi.mock('./process/inlayScreen', () => ({ updateInlayScreen: vi.fn() }))
vi.mock('./translator/translator', () => ({ translateHTML: vi.fn() }))
vi.mock('./process/index.svelte', () => ({ doingChat: { state: false } }))
vi.mock('./characterCards', () => ({ importCharacter: vi.fn() }))
vi.mock('./pngChunk', () => ({
    PngChunk: {
        readGenerator: vi.fn(() => ({
            async *[Symbol.asyncIterator]() {},
        })),
    },
}))
vi.mock('./process/coldstorage.svelte', () => ({ getColdStorageItem: vi.fn() }))

import { clearCharacterImageThumbnail, ensureCharacterSidebarImageThumbnail, getCharacterSidebarImage, markCharacterImageThumbnailFailed, makeGroupImage, selectCharImg } from './characters'
import { DBState } from './stores.svelte'

const originalCreateElement = document.createElement.bind(document)
let mockCanvas: any

function createDeferred<T>() {
    let resolve: (value: T) => void = () => {}
    const promise = new Promise<T>((resolvePromise) => {
        resolve = resolvePromise
    })
    return { promise, resolve }
}

function installImageAndCanvasMocks(blob: Blob | null = new Blob([new Uint8Array([9, 8, 7])], { type: 'image/webp' })) {
    vi.stubGlobal(
        'Image',
        class {
            width = 320
            height = 180
            onload: (() => void) | null = null
            onerror: (() => void) | null = null

            set src(_value: string) {
                queueMicrotask(() => this.onload?.())
            }
        },
    )

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName !== 'canvas') {
            return originalCreateElement(tagName)
        }

        mockCanvas = {
            width: 0,
            height: 0,
            getContext: vi.fn(() => ({
                drawImage: vi.fn(),
            })),
            toBlob: vi.fn((callback: (blob: Blob | null) => void) => {
                callback(blob)
            }),
            toDataURL: vi.fn(() => 'data:image/png;base64,AQID'),
            remove: vi.fn(),
        }
        return mockCanvas
    })
}

beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    mocks.dbState.db = {
        hideAllImages: false,
        characters: [],
    }
    mocks.getFileSrc.mockImplementation(async (loc: string) => `resolved:${loc}`)
    mocks.assetExists.mockResolvedValue(true)
    mocks.hasher.mockResolvedValue('thumbhash')
    mocks.saveImage.mockImplementation(async (_data: Uint8Array, customId = '', fileName = '') => {
        if(!customId){
            return 'assets/generated-group.png'
        }
        const ext = fileName.split('.').pop() ?? 'png'
        return `assets/${customId}.${ext}`
    })
    mocks.findCharacterbyId.mockImplementation((id: string) => ({ image: `assets/${id}.png` }))
    mocks.alertStoreSet.mockClear()
    mocks.selectedCharIDValue = -1
    mockCanvas = undefined
})

describe('getCharacterSidebarImage', () => {
    test('uses an existing thumbnail before the original icon', async () => {
        ;(DBState.db as any).characters = [{
            chaId: 'char-1',
            image: 'assets/full.png',
            imageThumbnail: 'assets/existing.webp',
            imageThumbnailVersion: 2,
            imageThumbnailSource: 'assets/full.png',
        }]

        await expect(getCharacterSidebarImage(0)).resolves.toBe('resolved:assets/existing.webp')

        expect(mocks.getFileSrc).toHaveBeenCalledWith('assets/existing.webp')
        expect(mocks.assetExists).toHaveBeenCalledWith('assets/existing.webp')
        expect(mocks.readImage).not.toHaveBeenCalled()
        expect(mocks.saveImage).not.toHaveBeenCalled()
    })

    test('falls back to the original icon without mutating a missing cached thumbnail', async () => {
        mocks.assetExists.mockResolvedValueOnce(false)
        ;(DBState.db as any).characters = [{
            chaId: 'char-1',
            image: 'assets/full.png',
            imageThumbnail: 'assets/missing.webp',
            imageThumbnailVersion: 2,
            imageThumbnailSource: 'assets/full.png',
        }]

        await expect(getCharacterSidebarImage(0)).resolves.toBe('resolved:assets/full.png')

        expect(mocks.assetExists).toHaveBeenCalledWith('assets/missing.webp')
        expect(mocks.getFileSrc).not.toHaveBeenCalledWith('assets/missing.webp')
        expect(mocks.readImage).not.toHaveBeenCalled()
        expect(mocks.saveImage).not.toHaveBeenCalled()
        expect(DBState.db.characters[0].imageThumbnail).toBe('assets/missing.webp')
        expect(DBState.db.characters[0].imageThumbnailVersion).toBe(2)
    })

    test('falls back to the original icon without mutating a stale thumbnail', async () => {
        ;(DBState.db as any).characters = [{
            chaId: 'char-1',
            image: 'assets/full.png',
            imageThumbnail: 'assets/old.webp',
        }]

        await expect(getCharacterSidebarImage(0)).resolves.toBe('resolved:assets/full.png')

        expect(mocks.assetExists).not.toHaveBeenCalled()
        expect(mocks.getFileSrc).not.toHaveBeenCalledWith('assets/old.webp')
        expect(mocks.readImage).not.toHaveBeenCalled()
        expect(mocks.saveImage).not.toHaveBeenCalled()
        expect(DBState.db.characters[0].imageThumbnail).toBe('assets/old.webp')
        expect(DBState.db.characters[0].imageThumbnailVersion).toBeUndefined()
    })

    test('does not use a thumbnail created for a different source image', async () => {
        ;(DBState.db as any).characters = [{
            chaId: 'char-1',
            image: 'assets/new.png',
            imageThumbnail: 'assets/old.webp',
            imageThumbnailVersion: 2,
            imageThumbnailSource: 'assets/old.png',
        }]

        await expect(getCharacterSidebarImage(0)).resolves.toBe('resolved:assets/new.png')

        expect(mocks.assetExists).not.toHaveBeenCalled()
        expect(mocks.getFileSrc).not.toHaveBeenCalledWith('assets/old.webp')
    })

    test('falls back to the original icon when no thumbnail is cached', async () => {
        ;(DBState.db as any).characters = [{
            chaId: 'char-1',
            image: 'assets/full.png',
        }]

        await expect(getCharacterSidebarImage(0)).resolves.toBe('resolved:assets/full.png')

        expect(mocks.readImage).not.toHaveBeenCalled()
        expect(mocks.saveImage).not.toHaveBeenCalled()
        expect(DBState.db.characters[0].imageThumbnail).toBeUndefined()
    })

    test('does not create thumbnails while all images are hidden', async () => {
        ;(DBState.db as any).hideAllImages = true
        ;(DBState.db as any).characters = [{
            chaId: 'char-1',
            image: 'assets/full.png',
        }]

        await expect(getCharacterSidebarImage(0)).resolves.toBe('/none.webp')

        expect(mocks.readImage).not.toHaveBeenCalled()
        expect(mocks.saveImage).not.toHaveBeenCalled()
        expect(DBState.db.characters[0].imageThumbnail).toBeUndefined()
    })
})

describe('ensureCharacterSidebarImageThumbnail', () => {
    test('creates a low-res thumbnail under assets when missing', async () => {
        installImageAndCanvasMocks()
        mocks.readImage.mockResolvedValue(new Uint8Array([1, 2, 3]))
        ;(DBState.db as any).characters = [{
            chaId: 'char-1',
            image: 'assets/full.png',
        }]

        await expect(ensureCharacterSidebarImageThumbnail(0)).resolves.toBe('assets/thumbhash.png')

        expect(mocks.readImage).toHaveBeenCalledWith('assets/full.png')
        expect(mockCanvas.width).toBe(192)
        expect(mockCanvas.height).toBe(108)
        expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.8)
        expect(mocks.saveImage).toHaveBeenCalledWith(expect.any(Uint8Array), 'thumbhash', 'thumbnail.png')
        expect(DBState.db.characters[0].imageThumbnail).toBe('assets/thumbhash.png')
        expect(DBState.db.characters[0].imageThumbnailVersion).toBe(2)
        expect(DBState.db.characters[0].imageThumbnailSource).toBe('assets/full.png')
    })

    test('regenerates a missing cached thumbnail from the original icon', async () => {
        installImageAndCanvasMocks()
        mocks.assetExists.mockResolvedValueOnce(false)
        mocks.readImage.mockResolvedValue(new Uint8Array([1, 2, 3]))
        ;(DBState.db as any).characters = [{
            chaId: 'char-1',
            image: 'assets/full.png',
            imageThumbnail: 'assets/missing.webp',
            imageThumbnailVersion: 2,
            imageThumbnailSource: 'assets/full.png',
        }]

        await expect(ensureCharacterSidebarImageThumbnail(0)).resolves.toBe('assets/thumbhash.png')

        expect(mocks.assetExists).toHaveBeenCalledWith('assets/missing.webp')
        expect(mocks.readImage).toHaveBeenCalledWith('assets/full.png')
        expect(DBState.db.characters[0].imageThumbnail).toBe('assets/thumbhash.png')
        expect(DBState.db.characters[0].imageThumbnailVersion).toBe(2)
        expect(DBState.db.characters[0].imageThumbnailSource).toBe('assets/full.png')
    })

    test('regenerates stale thumbnails from an older thumbnail version', async () => {
        installImageAndCanvasMocks()
        mocks.readImage.mockResolvedValue(new Uint8Array([1, 2, 3]))
        ;(DBState.db as any).characters = [{
            chaId: 'char-1',
            image: 'assets/full.png',
            imageThumbnail: 'assets/old.webp',
        }]

        await expect(ensureCharacterSidebarImageThumbnail(0)).resolves.toBe('assets/thumbhash.png')

        expect(mocks.getFileSrc).not.toHaveBeenCalledWith('assets/old.webp')
        expect(mocks.readImage).toHaveBeenCalledWith('assets/full.png')
        expect(DBState.db.characters[0].imageThumbnail).toBe('assets/thumbhash.png')
        expect(DBState.db.characters[0].imageThumbnailVersion).toBe(2)
        expect(DBState.db.characters[0].imageThumbnailSource).toBe('assets/full.png')
    })

    test('regenerates a thumbnail whose recorded source no longer matches', async () => {
        installImageAndCanvasMocks()
        mocks.readImage.mockResolvedValue(new Uint8Array([1, 2, 3]))
        ;(DBState.db as any).characters = [{
            chaId: 'char-1',
            image: 'assets/new.png',
            imageThumbnail: 'assets/old.webp',
            imageThumbnailVersion: 2,
            imageThumbnailSource: 'assets/old.png',
        }]

        await expect(ensureCharacterSidebarImageThumbnail(0)).resolves.toBe('assets/thumbhash.png')

        expect(mocks.assetExists).not.toHaveBeenCalledWith('assets/old.webp')
        expect(mocks.readImage).toHaveBeenCalledWith('assets/new.png')
        expect(DBState.db.characters[0].imageThumbnailSource).toBe('assets/new.png')
    })

    test('does not attach an in-flight thumbnail after the source image changes', async () => {
        installImageAndCanvasMocks()
        const thumbnailSave = createDeferred<string>()
        mocks.readImage.mockResolvedValue(new Uint8Array([1, 2, 3]))
        mocks.saveImage.mockReturnValue(thumbnailSave.promise)
        ;(DBState.db as any).characters = [{
            chaId: 'char-1',
            image: 'assets/old.png',
        }]

        const pending = ensureCharacterSidebarImageThumbnail(0)
        await vi.waitFor(() => expect(mocks.saveImage).toHaveBeenCalled())
        DBState.db.characters[0].image = 'assets/new.png'
        thumbnailSave.resolve('assets/old.webp')

        await expect(pending).resolves.toBe('')
        expect(DBState.db.characters[0].imageThumbnail).toBeUndefined()
        expect(DBState.db.characters[0].imageThumbnailSource).toBeUndefined()
    })

    test('does not create thumbnails while all images are hidden', async () => {
        ;(DBState.db as any).hideAllImages = true
        ;(DBState.db as any).characters = [{
            chaId: 'char-1',
            image: 'assets/full.png',
        }]

        await expect(ensureCharacterSidebarImageThumbnail(0)).resolves.toBe('')

        expect(mocks.readImage).not.toHaveBeenCalled()
        expect(mocks.saveImage).not.toHaveBeenCalled()
        expect(DBState.db.characters[0].imageThumbnail).toBeUndefined()
    })

    test('leaves the thumbnail empty if generation fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        mocks.readImage.mockRejectedValue(new Error('missing image'))
        ;(DBState.db as any).characters = [{
            chaId: 'char-1',
            image: 'assets/full.png',
        }]

        await expect(ensureCharacterSidebarImageThumbnail(0)).resolves.toBe('')

        expect(mocks.saveImage).not.toHaveBeenCalled()
        expect(DBState.db.characters[0].imageThumbnail).toBeUndefined()
    })
})

describe('selectCharImg', () => {
    test('preserves the current icon if saving the replacement fails', async () => {
        mocks.selectSingleFile.mockResolvedValue({
            data: new Uint8Array([1, 2, 3]),
            name: 'new.png',
        })
        mocks.saveImage.mockRejectedValueOnce(new Error('storage full'))
        ;(DBState.db as any).characters = [{
            type: 'character',
            chaId: 'char-1',
            image: 'assets/old.png',
            imageThumbnail: 'assets/old.webp',
            imageThumbnailVersion: 2,
            imageThumbnailSource: 'assets/old.png',
            ccAssets: [],
        }]

        await expect(selectCharImg(0)).rejects.toThrow('storage full')

        expect(DBState.db.characters[0].image).toBe('assets/old.png')
        expect(DBState.db.characters[0].imageThumbnail).toBe('assets/old.webp')
        expect((DBState.db.characters[0] as any).ccAssets).toEqual([])
    })

    test('keeps the replacement icon when thumbnail persistence fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        mocks.selectSingleFile.mockResolvedValue({
            data: new Uint8Array([1, 2, 3]),
            name: 'new.png',
        })
        mocks.saveImage
            .mockResolvedValueOnce('assets/new.png')
            .mockRejectedValueOnce(new Error('thumbnail write failed'))
        installImageAndCanvasMocks()
        ;(DBState.db as any).characters = [{
            type: 'character',
            chaId: 'char-1',
            image: 'assets/old.png',
            imageThumbnail: 'assets/old.webp',
            imageThumbnailVersion: 2,
            imageThumbnailSource: 'assets/old.png',
            ccAssets: [],
        }]

        await expect(selectCharImg(0)).resolves.toBeUndefined()

        expect(DBState.db.characters[0].image).toBe('assets/new.png')
        expect(DBState.db.characters[0].imageThumbnail).toBe('')
        expect(DBState.db.characters[0].imageThumbnailSource).toBeUndefined()
        expect((DBState.db.characters[0] as any).ccAssets[0].uri).toBe('assets/old.png')
    })
})

describe('clearCharacterImageThumbnail', () => {
    test('clears a cached thumbnail when an icon is removed without replacement', () => {
        ;(DBState.db as any).characters = [{
            chaId: 'char-1',
            image: '',
            imageThumbnail: 'assets/old.webp',
            imageThumbnailVersion: 2,
            imageThumbnailSource: 'assets/old.png',
        }]

        clearCharacterImageThumbnail(0)

        expect(DBState.db.characters[0].imageThumbnail).toBe('')
        expect(DBState.db.characters[0].imageThumbnailVersion).toBeUndefined()
        expect(DBState.db.characters[0].imageThumbnailSource).toBeUndefined()
    })
})

describe('markCharacterImageThumbnailFailed', () => {
    test('clears the cached thumbnail and blocks regeneration for that source', async () => {
        mocks.readImage.mockResolvedValue(new Uint8Array([1, 2, 3]))
        ;(DBState.db as any).characters = [{
            chaId: 'char-1',
            image: 'assets/failed-source.png',
            imageThumbnail: 'assets/broken.webp',
            imageThumbnailVersion: 2,
            imageThumbnailSource: 'assets/failed-source.png',
        }]

        markCharacterImageThumbnailFailed(0)

        expect(DBState.db.characters[0].imageThumbnail).toBe('')
        await expect(ensureCharacterSidebarImageThumbnail(0)).resolves.toBe('')
        expect(mocks.readImage).not.toHaveBeenCalled()
        expect(mocks.saveImage).not.toHaveBeenCalled()
    })

    test('still generates a thumbnail for a different source image', async () => {
        installImageAndCanvasMocks()
        mocks.readImage.mockResolvedValue(new Uint8Array([1, 2, 3]))
        ;(DBState.db as any).characters = [{
            chaId: 'char-1',
            image: 'assets/another-source.png',
        }]

        await expect(ensureCharacterSidebarImageThumbnail(0)).resolves.toBe('assets/thumbhash.png')

        expect(mocks.readImage).toHaveBeenCalledWith('assets/another-source.png')
        expect(DBState.db.characters[0].imageThumbnail).toBe('assets/thumbhash.png')
        expect(DBState.db.characters[0].imageThumbnailSource).toBe('assets/another-source.png')
    })
})

describe('makeGroupImage', () => {
    test('refreshes the group thumbnail cache when generating a group icon', async () => {
        installImageAndCanvasMocks()
        mocks.selectedCharIDValue = 0
        ;(DBState.db as any).characters = [{
            type: 'group',
            chaId: 'group-1',
            image: 'assets/group-old.png',
            imageThumbnail: 'assets/group-old.webp',
            imageThumbnailVersion: 2,
            imageThumbnailSource: 'assets/group-old.png',
            characters: ['member-1', 'member-2'],
        }]

        await makeGroupImage()

        expect(mocks.getFileSrc).toHaveBeenCalledWith('assets/member-1.png')
        expect(mocks.getFileSrc).toHaveBeenCalledWith('assets/member-2.png')
        expect(DBState.db.characters[0].image).toBe('assets/generated-group.png')
        expect(DBState.db.characters[0].imageThumbnail).toBe('assets/thumbhash.png')
        expect(DBState.db.characters[0].imageThumbnailVersion).toBe(2)
        expect(DBState.db.characters[0].imageThumbnailSource).toBe('assets/generated-group.png')
        expect(mocks.saveImage).toHaveBeenCalledWith(expect.any(Uint8Array))
        expect(mocks.saveImage).toHaveBeenCalledWith(expect.any(Uint8Array), 'thumbhash', 'thumbnail.png')
    })

    test('keeps the generated group icon when thumbnail persistence fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        installImageAndCanvasMocks()
        mocks.saveImage
            .mockResolvedValueOnce('assets/generated-group.png')
            .mockRejectedValueOnce(new Error('thumbnail write failed'))
        mocks.selectedCharIDValue = 0
        ;(DBState.db as any).characters = [{
            type: 'group',
            chaId: 'group-1',
            image: 'assets/group-old.png',
            imageThumbnail: 'assets/group-old.webp',
            imageThumbnailVersion: 2,
            imageThumbnailSource: 'assets/group-old.png',
            characters: ['member-1'],
        }]

        await makeGroupImage()

        expect(DBState.db.characters[0].image).toBe('assets/generated-group.png')
        expect(DBState.db.characters[0].imageThumbnail).toBe('')
        expect(DBState.db.characters[0].imageThumbnailSource).toBeUndefined()
        expect(mocks.alertError).not.toHaveBeenCalled()
        expect(mocks.alertStoreSet).toHaveBeenLastCalledWith({ type: 'none', msg: '' })
    })
})

import { describe, expect, test, vi } from 'vitest'
import { applyImageOrientation, toNAICharCaptions, validateNAICharacters } from './stableDiff'

vi.mock('../alert', () => ({ alertError: vi.fn() }))
vi.mock('../globalApi.svelte', () => ({ globalFetch: vi.fn(), readImage: vi.fn() }))
vi.mock('../kei/kei', () => ({ keiServerURL: '' }))
vi.mock('../storage/database.svelte', () => ({ getDatabase: vi.fn() }))
vi.mock('../stores.svelte', () => ({ CharEmotion: { set: vi.fn() } }))
vi.mock('./processzip', () => ({ processZip: vi.fn() }))
vi.mock('./request/request', () => ({ requestChatData: vi.fn() }))

describe('applyImageOrientation', () => {
  test('keeps configured dimensions without an orientation', () => {
    expect(applyImageOrientation(1024, 640)).toEqual({ height: 640, width: 1024 })
  })

  test('places the longer edge on the width for landscape', () => {
    expect(applyImageOrientation(640, 1024, 'landscape')).toEqual({ height: 640, width: 1024 })
  })

  test('places the longer edge on the height for portrait', () => {
    expect(applyImageOrientation(1024, 640, 'portrait')).toEqual({ height: 1024, width: 640 })
  })
})

describe('validateNAICharacters', () => {
  test('passes missing or empty characters on any provider', () => {
    expect(validateNAICharacters(undefined, 'webui', '')).toBeUndefined()
    expect(validateNAICharacters([], 'webui', '')).toBeUndefined()
  })

  test('rejects providers other than NovelAI', () => {
    expect(validateNAICharacters([{ positive: 'girl' }], 'webui', '')).toBeDefined()
  })

  test('rejects NovelAI models before V4', () => {
    expect(validateNAICharacters([{ positive: 'girl' }], 'novelai', 'nai-diffusion-3')).toBeDefined()
    expect(validateNAICharacters([{ positive: 'girl' }], 'novelai', 'nai-diffusion-furry-3')).toBeDefined()
  })

  test('rejects positions without numeric x and y', () => {
    expect(validateNAICharacters([{ position: { x: 0.5 }, positive: 'girl' }], 'novelai', 'nai-diffusion-5')).toBeDefined()
    expect(validateNAICharacters([{ position: { x: NaN, y: 0.5 }, positive: 'girl' }], 'novelai', 'nai-diffusion-5')).toBeDefined()
    expect(validateNAICharacters([{ position: { x: 1.2, y: -1 }, positive: 'girl' }], 'novelai', 'nai-diffusion-5')).toBeUndefined()
  })

  test('accepts NovelAI V4 and later', () => {
    expect(validateNAICharacters([{ positive: 'girl' }], 'novelai', 'nai-diffusion-4-5-full')).toBeUndefined()
    expect(validateNAICharacters([{ positive: 'girl' }], 'novelai', 'nai-diffusion-5')).toBeUndefined()
  })
})

describe('toNAICharCaptions', () => {
  test('keeps coordinates off and centers characters without positions', () => {
    const captions = toNAICharCaptions('nai-diffusion-5', [{ positive: 'girl' }])
    expect(captions.useCoords).toBe(false)
    expect(captions.positive[0].centers).toEqual([{ x: 0.5, y: 0.5 }])
  })

  test('passes positions through on models after V4.5', () => {
    const captions = toNAICharCaptions('nai-diffusion-5', [{ position: { x: 0.25, y: 0.8 }, positive: 'girl' }, { positive: 'boy' }])
    expect(captions.useCoords).toBe(true)
    expect(captions.positive.map((caption) => caption.centers)).toEqual([[{ x: 0.25, y: 0.8 }], [{ x: 0.5, y: 0.5 }]])
    expect(captions.negative.map((caption) => caption.centers)).toEqual([[{ x: 0.25, y: 0.8 }], [{ x: 0.5, y: 0.5 }]])
  })

  test('clamps positions to 0 to 1', () => {
    const captions = toNAICharCaptions('nai-diffusion-5', [{ position: { x: -0.2, y: 1.5 }, positive: 'girl' }])
    expect(captions.positive[0].centers).toEqual([{ x: 0, y: 1 }])
  })

  test('snaps positions to the nearest grid value on V4 and V4.5', () => {
    const captions = toNAICharCaptions('nai-diffusion-4-5-full', [{ position: { x: 0, y: 0.65 }, positive: 'girl' }, { position: { x: 1, y: 0.35 }, positive: 'boy' }])
    expect(captions.positive.map((caption) => caption.centers)).toEqual([[{ x: 0.1, y: 0.7 }], [{ x: 0.9, y: 0.3 }]])
  })
})

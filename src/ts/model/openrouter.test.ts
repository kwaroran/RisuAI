import { afterEach, expect, it, vi } from 'vitest'
import { getOpenRouterModels } from './openrouter'

vi.mock('../storage/database.svelte', () => ({ getDatabase: () => ({ openrouterKey: 'fixture-key' }) }))
afterEach(() => vi.unstubAllGlobals())

it('filters retired MiniMax text choices while preserving gateway metadata and nontext models', async () => {
    const model = (id: string, outputs = ['text']) => ({
        id, name: id, architecture: { output_modalities: outputs }, context_length: 123456,
        pricing: { prompt: '0.000001', completion: '0.000002', input_cache_read: '0.0000001' },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ data: [
        model('minimax/minimax-m2.7'), model('minimax/minimax-m3'),
        { ...model('minimax/minimax-m3.1-flash:free'), pricing: { prompt: '0', completion: '0' } },
        model('minimax/image-fixture', ['image']), model('other/text-fixture'),
    ] }) }))
    const models = await getOpenRouterModels()
    expect(models.map(model => model.id)).toEqual([
        'minimax/minimax-m3.1-flash:free', 'minimax/minimax-m3', 'minimax/image-fixture', 'other/text-fixture',
    ])
    expect(models[0]).toMatchObject({ context_length: 123456, promptPrice1M: 0, completionPrice1M: 0 })
    expect(models[1]).toMatchObject({ context_length: 123456, promptPrice1M: 1, completionPrice1M: 2 })
    expect(models[1].cacheReadPrice1M).toBeCloseTo(0.1)
})

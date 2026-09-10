import { afterEach, describe, expect, it, vi } from 'vitest'

import { getVercelModelEndpointsURL } from './providers/vercel'
import { getVercelGatewayModels, getVercelGatewayProviders, toVercelModelGridItem } from './vercel'

describe('Vercel AI Gateway model discovery', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('keeps model namespace segments in the endpoints URL', () => {
        expect(getVercelModelEndpointsURL('openai/gpt-5 mini')).toBe(
            'https://ai-gateway.vercel.sh/v1/models/openai/gpt-5%20mini/endpoints'
        )
    })

    it('returns language models only', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                data: [
                    { id: 'openai/gpt-5', name: 'GPT-5', type: 'language' },
                    { id: 'openai/embedding', name: 'Embedding', type: 'embedding' },
                ],
            }),
        }))

        const models = await getVercelGatewayModels()
        expect(models.map((model) => model.id)).toEqual(['openai/gpt-5'])
    })

    it('maps model prices and context for ModelGrid', () => {
        expect(toVercelModelGridItem({
            id: 'openai/gpt-5',
            name: 'GPT-5',
            owned_by: 'openai',
            description: 'Model description',
            type: 'language',
            context_window: 128000,
            max_tokens: 32000,
            pricing: { input: '0.000002', output: '0.000008' },
        })).toEqual({
            id: 'openai/gpt-5',
            displayName: 'GPT-5',
            providerName: 'openai',
            description: 'Model description',
            context_length: 128000,
            sortPrice: 2,
            prices: [
                { label: 'In', value: '$2.00' },
                { label: 'Out', value: '$8.00' },
            ],
        })
    })

    it('returns unique active providers for the selected model', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                data: {
                    endpoints: [
                        { provider_name: 'openai', status: 0 },
                        { provider_name: 'azure', status: 0 },
                        { provider_name: 'openai', status: 0 },
                        { provider_name: 'bedrock', status: 1 },
                    ],
                },
            }),
        }))

        await expect(getVercelGatewayProviders('openai/gpt-5')).resolves.toEqual([
            { name: 'azure', slug: 'azure' },
            { name: 'openai', slug: 'openai' },
        ])
    })

    it('caches provider catalogs for repeated requests', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                data: {
                    endpoints: [{ provider_name: 'openai', status: 0 }],
                },
            }),
        })
        vi.stubGlobal('fetch', fetchMock)

        await getVercelGatewayProviders('cached/model')
        await getVercelGatewayProviders('cached/model')

        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('fails closed to an empty catalog', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
        await expect(getVercelGatewayModels()).resolves.toEqual([])
        await expect(getVercelGatewayProviders('offline/model')).resolves.toEqual([])
    })
})

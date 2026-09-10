import { beforeEach, describe, expect, it, vi } from 'vitest'

import { applyVercelGatewayOptions } from './vercel'

const getVercelGatewayProviders = vi.hoisted(() => vi.fn())

const db = vi.hoisted(() => ({
    vercelGateway: {
        order: [] as string[],
        excluded: [] as string[],
        only: [] as string[],
        sort: 'auto' as 'auto' | 'cost' | 'ttft' | 'tps',
        serviceTier: 'default' as 'default' | 'priority' | 'flex',
        zeroDataRetention: false,
        disallowPromptTraining: false,
        automaticCaching: false,
    },
}))

vi.mock('src/ts/storage/database.svelte', () => ({
    getDatabase: () => db,
}))

vi.mock('src/ts/model/vercel', () => ({
    getVercelGatewayProviders,
}))

describe('Vercel AI Gateway request options', () => {
    beforeEach(() => {
        getVercelGatewayProviders.mockReset()
        getVercelGatewayProviders.mockResolvedValue([
            { name: 'anthropic', slug: 'anthropic' },
            { name: 'azure', slug: 'azure' },
            { name: 'openai', slug: 'openai' },
        ])
        db.vercelGateway = {
            order: [],
            excluded: [],
            only: [],
            sort: 'auto',
            serviceTier: 'default',
            zeroDataRetention: false,
            disallowPromptTraining: false,
            automaticCaching: false,
        }
    })

    it('omits providerOptions when all settings use defaults', async () => {
        await expect(applyVercelGatewayOptions({ model: 'openai/gpt-5' }, 'vercel')).resolves.toEqual({ model: 'openai/gpt-5' })
        expect(getVercelGatewayProviders).not.toHaveBeenCalled()
    })

    it('turns excluded providers into the supported Vercel only list', async () => {
        db.vercelGateway = {
            order: [' azure ', '', 'openai', 'azure'],
            excluded: [' azure ', '', 'azure'],
            only: [],
            sort: 'cost',
            serviceTier: 'priority',
            zeroDataRetention: true,
            disallowPromptTraining: true,
            automaticCaching: true,
        }

        await expect(applyVercelGatewayOptions({ model: 'openai/gpt-5' }, 'vercel')).resolves.toEqual({
            model: 'openai/gpt-5',
            providerOptions: {
                gateway: {
                    order: ['openai'],
                    only: ['anthropic', 'openai'],
                    sort: 'cost',
                    serviceTier: 'priority',
                    zeroDataRetention: true,
                    disallowPromptTraining: true,
                    caching: 'auto',
                },
            },
        })
        expect(getVercelGatewayProviders).toHaveBeenCalledWith('openai/gpt-5')
    })

    it('drops provider order entries that are unavailable for the selected model', async () => {
        db.vercelGateway.order = ['azure', 'stale-provider', 'openai']

        await expect(applyVercelGatewayOptions({ model: 'openai/gpt-5' }, 'vercel')).resolves.toEqual({
            model: 'openai/gpt-5',
            providerOptions: {
                gateway: {
                    order: ['azure', 'openai'],
                },
            },
        })
        expect(getVercelGatewayProviders).toHaveBeenCalledWith('openai/gpt-5')
    })

    it('omits provider order when every saved entry is unavailable for the selected model', async () => {
        db.vercelGateway.order = ['stale-provider']

        await expect(applyVercelGatewayOptions({ model: 'openai/gpt-5' }, 'vercel')).resolves.toEqual({
            model: 'openai/gpt-5',
        })
    })

    it('keeps legacy only lists for existing saved settings', async () => {
        db.vercelGateway.only = ['openai', ' azure ', 'openai']

        await expect(applyVercelGatewayOptions({ model: 'openai/gpt-5' }, 'vercel')).resolves.toEqual({
            model: 'openai/gpt-5',
            providerOptions: {
                gateway: {
                    only: ['openai', 'azure'],
                },
            },
        })
    })

    it('rejects excluding every provider available for the model', async () => {
        db.vercelGateway.excluded = ['anthropic', 'azure', 'openai']

        await expect(applyVercelGatewayOptions({ model: 'openai/gpt-5' }, 'vercel'))
            .rejects.toThrow('At least one Vercel AI Gateway provider must remain enabled.')
    })

    it('does not alter other providers', async () => {
        db.vercelGateway.zeroDataRetention = true
        const body = { model: 'gpt-5' }
        expect(await applyVercelGatewayOptions(body, 'gpt-5')).toBe(body)
        expect(body).toEqual({ model: 'gpt-5' })
    })
})

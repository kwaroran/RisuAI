import type { ModelGridItem } from './modelGrid'
import { getVercelModelEndpointsURL, VERCEL_AI_GATEWAY_MODELS_ENDPOINT } from './providers/vercel'

export type VercelGatewayModel = {
    id: string
    name: string
    owned_by: string
    description: string
    type: string
    context_window: number
    max_tokens: number
    pricing?: {
        input?: string
        output?: string
    }
}

type VercelGatewayEndpoint = {
    provider_name: string
    status: number
}

export type VercelGatewayProvider = { name: string, slug: string }

const VERCEL_PROVIDER_CACHE_TTL = 5 * 60 * 1000
const vercelProviderCache = new Map<string, { providers: VercelGatewayProvider[], expiresAt: number }>()

function toPricePerMillion(raw?: string): number | undefined {
    if(raw === undefined || raw === null || raw === '') return undefined
    const price = Number(raw)
    return Number.isFinite(price) ? price * 1_000_000 : undefined
}

export async function getVercelGatewayModels(): Promise<VercelGatewayModel[]> {
    try{
        const response = await fetch(VERCEL_AI_GATEWAY_MODELS_ENDPOINT)
        if(!response.ok) return []
        const data = await response.json()
        return (data?.data ?? []).filter((model: VercelGatewayModel) => model.type === 'language')
    }
    catch{
        return []
    }
}

export async function getVercelGatewayProviders(modelId: string): Promise<VercelGatewayProvider[]> {
    if(!modelId) return []

    const cached = vercelProviderCache.get(modelId)
    if(cached && cached.expiresAt > Date.now()) return cached.providers

    try{
        const response = await fetch(getVercelModelEndpointsURL(modelId))
        if(!response.ok) return cached?.providers ?? []
        const data = await response.json()
        const providers = (data?.data?.endpoints ?? []) as VercelGatewayEndpoint[]
        const result = providers
            .filter((endpoint) => endpoint.status === 0 && endpoint.provider_name)
            .map((endpoint) => ({ name: endpoint.provider_name, slug: endpoint.provider_name }))
            .filter((provider, index, all) => all.findIndex((item) => item.slug === provider.slug) === index)
            .sort((a, b) => a.name.localeCompare(b.name))
        vercelProviderCache.set(modelId, { providers: result, expiresAt: Date.now() + VERCEL_PROVIDER_CACHE_TTL })
        return result
    }
    catch{
        return cached?.providers ?? []
    }
}

export function toVercelModelGridItem(model: VercelGatewayModel): ModelGridItem {
    const inputPrice = toPricePerMillion(model.pricing?.input)
    const outputPrice = toPricePerMillion(model.pricing?.output)
    const prices: { label: string, value: string }[] = []

    if(inputPrice !== undefined) prices.push({ label: 'In', value: inputPrice === 0 ? 'Free' : `$${inputPrice.toFixed(2)}` })
    if(outputPrice !== undefined) prices.push({ label: 'Out', value: outputPrice === 0 ? 'Free' : `$${outputPrice.toFixed(2)}` })

    return {
        id: model.id,
        displayName: model.name || model.id,
        providerName: model.owned_by || model.id.split('/')[0],
        description: model.description ?? '',
        context_length: model.context_window ?? 0,
        sortPrice: inputPrice ?? Number.POSITIVE_INFINITY,
        prices,
    }
}

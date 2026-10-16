import { getDatabase } from "../storage/database.svelte"
import { buildPriceRows, type ModelGridItem, type ModelGridSource } from "./modelGrid"

/** Per-1M-token price entry. undefined means the field is not available for this model. */
export type PriceEntry = number | undefined

export type OpenRouterModelInfo = {
    id: string
    /** Original name with price appended, kept for backward compatibility */
    name: string
    /** Clean model name without price info */
    cleanName: string
    /** Provider display name extracted from model name (e.g. "OpenAI", "Anthropic") */
    provider: string
    /** Weighted average price used for sorting (prompt*3 + completion) / 4 */
    price: number
    /** Human-readable weighted-average price string, e.g. "$0.01500/1k" or "Free" */
    priceDisplay: string
    context_length: number
    description: string
    /** Input (prompt) price per 1M tokens in USD */
    promptPrice1M: PriceEntry
    /** Output (completion) price per 1M tokens in USD */
    completionPrice1M: PriceEntry
    /** Cache-read price per 1M tokens in USD (optional) */
    cacheReadPrice1M: PriceEntry
    /** Cache-write price per 1M tokens in USD (optional) */
    cacheWritePrice1M: PriceEntry
    /** Internal reasoning token price per 1M tokens in USD (optional) */
    internalReasoningPrice1M: PriceEntry
}

export async function getOpenRouterProviders(): Promise<{ name: string, slug: string }[]> {
    try {
        const db = getDatabase()
        const headers = {
            "Authorization": "Bearer " + db.openrouterKey,
            "Content-Type": "application/json"
        }

        const providers: { data: { name: string, slug: string }[] } = await fetch("https://openrouter.ai/api/v1/providers", {
            headers,
        }).then((res) => res.json())

        return providers.data.map(({ name, slug }) => ( { name, slug })).sort((a, b) => a.name.localeCompare(b.name))
    } catch (error) {
        return []
    }
}

export async function getOpenRouterModels(): Promise<OpenRouterModelInfo[]> {
    try {
        const db = getDatabase()
        const headers = {
            "Authorization": "Bearer " + db.openrouterKey,
            "Content-Type": "application/json"
        }

        const aim = await fetch("https://openrouter.ai/api/v1/models", {
            headers,
        }).then((res) => res.json())

        return aim.data.map((model: any) => {
            const price = ((Number(model.pricing.prompt) * 3) + Number(model.pricing.completion)) / 4
            const priceDisplay = price > 0 ? `$${(price * 1000).toFixed(5)}/1k` : 'Free'
            const legacyName = price > 0
                ? `${model.name} - $${(price * 1000).toFixed(5)}/1k`
                : `${model.name} - Free`

            const colonIdx = model.name.indexOf(':')
            const provider = colonIdx !== -1
                ? model.name.slice(0, colonIdx).trim()
                : model.id.split('/')[0]
            const cleanName = colonIdx !== -1
                ? model.name.slice(colonIdx + 1).trim()
                : model.name

            const toPrice1M = (raw: any): PriceEntry => {
                const n = Number(raw)
                return (raw !== undefined && raw !== null && raw !== '' && !isNaN(n)) ? n * 1_000_000 : undefined
            }

            return {
                id: model.id,
                name: legacyName,
                cleanName,
                provider,
                price,
                priceDisplay,
                context_length: model.context_length,
                description: model.description ?? '',
                promptPrice1M: toPrice1M(model.pricing?.prompt),
                completionPrice1M: toPrice1M(model.pricing?.completion),
                cacheReadPrice1M: toPrice1M(model.pricing?.input_cache_read),
                cacheWritePrice1M: toPrice1M(model.pricing?.input_cache_write),
                internalReasoningPrice1M: toPrice1M(model.pricing?.internal_reasoning),
            }
        }).filter((model: OpenRouterModelInfo) => {
            return model.price >= 0
        }).sort((a: OpenRouterModelInfo, b: OpenRouterModelInfo) => {
            return a.price - b.price
        })
    } catch (error) {
        return []
    }
}

export function toModelGridItem(m: OpenRouterModelInfo): ModelGridItem {
    return {
        id: m.id,
        displayName: m.cleanName,
        providerName: m.provider,
        description: m.description,
        context_length: m.context_length,
        sortPrice: m.price,
        prices: buildPriceRows([
            ['In',        m.promptPrice1M],
            ['Out',       m.completionPrice1M],
            ['Cache In',  m.cacheReadPrice1M],
            ['Cache Out', m.cacheWritePrice1M],
            ['Reasoning', m.internalReasoningPrice1M],
        ]),
    }
}

export const openRouterModelSource: ModelGridSource = {
    label: 'OpenRouter',
    cacheKey: () => getDatabase().openrouterKey,
    fetchItems: async () => (await getOpenRouterModels()).map(toModelGridItem),
    modelKey: 'openrouterRequestModel',
    nameKey: 'openrouterRequestModelName',
    inputModeKey: 'openrouterInputMode',
    pinnedItems: [
        { id: 'risu/free',       displayName: 'Free Auto',       providerName: 'Risu'       },
        { id: 'openrouter/auto', displayName: 'OpenRouter Auto', providerName: 'OpenRouter' },
    ],
}

export async function getFreeOpenRouterModels(){
    const models = await getOpenRouterModels()
    return models.filter((model: any) => {
        return model.name.endsWith("Free")
    }).sort((a: any, b: any) => {
        return b.context_length - a.context_length
    })[0].id ?? ''
}

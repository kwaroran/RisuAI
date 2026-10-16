import { getDatabase } from "../storage/database.svelte"
import {
    NANOGPT_PERSONALIZED_MODELS_ENDPOINT,
    NANOGPT_MODELS_ENDPOINT,
    NANOGPT_BALANCE_ENDPOINT,
    NANOGPT_SUBSCRIPTION_ENDPOINT,
    NANOGPT_SUBSCRIPTION_MODELS_ENDPOINT,
    NANOGPT_MODEL_PROVIDERS_ENDPOINT,
} from "./providers/nanogpt"
import { buildPriceRows, type ModelGridItem, type ModelGridSource } from "./modelGrid"

export type NanoGPTModelInfo = {
    id: string
    name: string
    owned_by: string
    context_length: number
    max_output_tokens: number
    description: string
    capabilities: {
        vision?: boolean
        reasoning?: boolean
        tool_calling?: boolean
        [key: string]: boolean | undefined
    }
    /** Input (prompt) price per 1M tokens in USD */
    promptPrice1M: number | undefined
    /** Output (completion) price per 1M tokens in USD */
    completionPrice1M: number | undefined
}

export type NanoGPTBalance = {
    usd_balance: string
    nano_balance: string
    nanoDepositAddress: string
}

type UsageBucket = {
    used: number
    remaining: number
    percentUsed: number
    resetAt: number
}

export type NanoGPTSubscriptionUsage = {
    active: boolean
    state: 'active' | 'grace' | 'inactive'
    graceUntil: string | null
    cancelAtPeriodEnd: boolean
    limits: {
        weeklyInputTokens: number | null
        dailyInputTokens: number | null
        dailyImages: number | null
    }
    weeklyInputTokens: UsageBucket | null
    dailyInputTokens: UsageBucket | null
    dailyImages: UsageBucket | null
    period: { currentPeriodEnd: string }
}

export async function getNanoGPTBalance(key: string): Promise<NanoGPTBalance | null> {
    try {
        const res = await fetch(NANOGPT_BALANCE_ENDPOINT, {
            method: 'POST',
            headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
        })
        if (!res.ok) return null
        return await res.json()
    } catch {
        return null
    }
}

export async function getNanoGPTSubscription(key: string): Promise<NanoGPTSubscriptionUsage | null> {
    try {
        const res = await fetch(NANOGPT_SUBSCRIPTION_ENDPOINT, {
            headers: { 'Authorization': 'Bearer ' + key },
        })
        if (!res.ok) return null
        return await res.json()
    } catch {
        return null
    }
}

type NanoGPTPriceComparison = {
    platformVsOfficial: {
        inputDiscountPct: number
        outputDiscountPct: number
        inputDirection: 'less' | 'more'
        outputDirection: 'less' | 'more'
    }
    hasUserDiscount: boolean
}

export type NanoGPTModelProvider = {
    provider: string
    pricing: {
        inputPer1kTokens: number
        outputPer1kTokens: number
        cacheReadInputPer1kTokens?: number
    }
    available: boolean
    supportsPromptCaching?: boolean
    quantization?: string
    comparison?: NanoGPTPriceComparison
}

export type NanoGPTModelProviders = {
    canonicalId: string
    displayName: string
    supportsProviderSelection: boolean
    defaultPrice: { inputPer1kTokens: number; outputPer1kTokens: number }
    providers: NanoGPTModelProvider[]
    autoTps?: number
    autoTtftMs?: number
    autoComparison?: NanoGPTPriceComparison
    officialBaseline?: {
        provider: string
        label: string
        officialModelId: string
        pricing: { inputPer1kTokens: number; outputPer1kTokens: number }
    }
}

export async function getNanoGPTModelProviders(key: string, modelId: string): Promise<NanoGPTModelProviders | null> {
    try {
        const res = await fetch(`${NANOGPT_MODEL_PROVIDERS_ENDPOINT}/${encodeURIComponent(modelId)}/providers`, {
            headers: { 'Authorization': 'Bearer ' + key },
        })
        if (!res.ok) return null
        return await res.json()
    } catch {
        return null
    }
}

export async function getNanoGPTSubscriptionModels(key: string): Promise<NanoGPTModelInfo[]> {
    if (!key) return []
    try {
        const res = await fetch(NANOGPT_SUBSCRIPTION_MODELS_ENDPOINT + '?detailed=true', {
            headers: { 'Authorization': 'Bearer ' + key },
        })
        if (!res.ok) return []
        const json = await res.json()
        const models: any[] = json?.data ?? []
        return models.map((m) => ({
            id: m.id,
            name: m.name || m.id,
            owned_by: m.owned_by ?? '',
            context_length: m.context_length ?? 0,
            max_output_tokens: m.max_output_tokens ?? 0,
            description: m.description ?? '',
            capabilities: m.capabilities ?? {},
            promptPrice1M: parsePrice(m.pricing?.prompt),
            completionPrice1M: parsePrice(m.pricing?.completion),
        }))
    } catch {
        return []
    }
}

export async function getNanoGPTModels(): Promise<NanoGPTModelInfo[]> {
    try {
        const db = getDatabase()
        const key = db.nanogptKey

        const endpoint = (key ? NANOGPT_PERSONALIZED_MODELS_ENDPOINT : NANOGPT_MODELS_ENDPOINT) + '?detailed=true'
        const headers: Record<string, string> = { "Content-Type": "application/json" }
        if (key) {
            headers["Authorization"] = "Bearer " + key
        }

        const res = await fetch(endpoint, { headers })
        const json = await res.json()

        const models: any[] = json?.data ?? []

        return models.map((m) => ({
            id: m.id,
            name: m.name || m.id,
            owned_by: m.owned_by ?? '',
            context_length: m.context_length ?? 0,
            max_output_tokens: m.max_output_tokens ?? 0,
            description: m.description ?? '',
            capabilities: m.capabilities ?? {},
            promptPrice1M: parsePrice(m.pricing?.prompt),
            completionPrice1M: parsePrice(m.pricing?.completion),
        }))
    } catch (e) {
        return []
    }
}

export function toModelGridItem(m: NanoGPTModelInfo): ModelGridItem {
    return {
        id: m.id,
        displayName: m.name,
        providerName: m.owned_by,
        description: m.description,
        context_length: m.context_length,
        sortPrice: m.promptPrice1M ?? Infinity,
        prices: buildPriceRows([
            ['In',  m.promptPrice1M],
            ['Out', m.completionPrice1M],
        ]),
    }
}

export const nanoGPTModelSource: ModelGridSource = {
    label: 'NanoGPT',
    cacheKey: () => {
        const db = getDatabase()
        return `${db.nanogptKey}|${db.nanogptUseSubscriptionEndpoint}`
    },
    fetchItems: async () => {
        const db = getDatabase()
        const models = db.nanogptUseSubscriptionEndpoint
            ? await getNanoGPTSubscriptionModels(db.nanogptKey)
            : await getNanoGPTModels()
        return models.map(toModelGridItem)
    },
    modelKey: 'nanogptRequestModel',
    nameKey: 'nanogptRequestModelName',
    inputModeKey: 'nanogptInputMode',
    showSubBadge: () => getDatabase().nanogptUseSubscriptionEndpoint,
}

function parsePrice(raw: any): number | undefined {
    const n = Number(raw)
    return raw != null && raw !== '' && !isNaN(n) ? n : undefined
}

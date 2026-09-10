import { getDatabase } from "../storage/database.svelte"
import type { ModelGridItem } from "./modelGrid"

/** A model entry returned by OrcaRouter's OpenAI-compatible /v1/models endpoint. */
export type OrcaRouterModelInfo = {
    id: string
    owned_by: string
    context_length: number
}

const ORCAROUTER_MODELS_ENDPOINT = 'https://api.orcarouter.ai/v1/models'

export async function getOrcaRouterModels(): Promise<OrcaRouterModelInfo[]> {
    try {
        const db = getDatabase()
        const headers = {
            "Authorization": "Bearer " + db.orcarouterKey,
            "Content-Type": "application/json"
        }

        const res = await fetch(ORCAROUTER_MODELS_ENDPOINT, { headers })
        if (!res.ok) {
            return []
        }

        const json = await res.json()
        const models = json?.data ?? []
        if (!Array.isArray(models)) {
            return []
        }

        return models.map((model: any) => ({
            id: model.id,
            owned_by: model.owned_by ?? 'orcarouter',
            context_length: model.context_length ?? 0,
        })).sort((a: OrcaRouterModelInfo, b: OrcaRouterModelInfo) => a.id.localeCompare(b.id))
    } catch (error) {
        return []
    }
}

export function toModelGridItem(m: OrcaRouterModelInfo): ModelGridItem {
    return {
        id: m.id,
        displayName: m.id,
        providerName: m.owned_by,
        description: '',
        context_length: m.context_length,
        sortPrice: Infinity,
        prices: [],
    }
}

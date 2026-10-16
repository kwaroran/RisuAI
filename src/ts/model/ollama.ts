import { globalFetch } from '../globalApi.svelte'
import { getDatabase } from '../storage/database.svelte'
import type { ModelGridItem, ModelGridSource } from './modelGrid'

export type OllamaModelSource = 'local' | 'cloud'

type OllamaTagModel = {
    name?: string
    model?: string
    remote_model?: string
    remote_host?: string
    modified_at?: string | Date
    size?: number
    digest?: string
    details?: {
        format?: string
        family?: string
        families?: string[] | null
        parameter_size?: string
        quantization_level?: string
    }
}

export async function getOllamaModels(host: string, source: OllamaModelSource, apiKey = ''): Promise<ModelGridItem[]> {
    try {
        const baseUrl = source === 'cloud' ? 'https://ollama.com' : host.replace(/\/$/, '')
        const headers: Record<string, string> = {}

        if (source === 'cloud' && apiKey) {
            headers.Authorization = `Bearer ${apiKey}`
        }

        const response = await globalFetch(`${baseUrl}/api/tags`, {
            method: 'GET',
            headers,
            interceptor: 'ollama_models',
        })

        if (!response.ok) return []
        const models: OllamaTagModel[] = response.data?.models ?? []

        return models.map((model) => toModelGridItem(model, source))
    } catch {
        return []
    }
}

export function toModelGridItem(model: OllamaTagModel, source: OllamaModelSource): ModelGridItem {
    const id = model.model || model.name || ''
    const details = model.details
    const descriptionParts = [
        model.remote_model ? `Remote: ${model.remote_model}` : null,
        model.remote_host ? `Host: ${model.remote_host}` : null,
        details?.parameter_size,
        details?.quantization_level,
        details?.format,
        details?.family,
    ].filter(Boolean)

    return {
        id,
        displayName: model.name || id,
        providerName: source === 'cloud' ? 'Cloud' : 'Local',
        description: descriptionParts.join(' / '),
        context_length: 0,
        sortPrice: source === 'cloud' ? 1 : 0,
        prices: [],
    }
}

export const ollamaCloudModelSource: ModelGridSource = {
    label: 'Ollama Cloud',
    cacheKey: () => getDatabase().ollamaApiKey,
    fetchItems: () => getOllamaModels('', 'cloud', getDatabase().ollamaApiKey),
    modelKey: 'ollamaCloudModel',
    nameKey: 'ollamaCloudModelName',
    inputModeKey: 'ollamaInputMode',
    onModelChange: () => {
        getDatabase().ollamaModelSource = 'cloud'
    },
}

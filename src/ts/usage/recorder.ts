import { LLMFormat, LLMProvider } from '../model/modellist'
import type { RequestDataArgumentExtended } from '../process/request/request'
import { getDatabase } from '../storage/database.svelte'
import { ChatTokenizer, tokenize } from '../tokenizer'
import { UsageMeter } from './meter'
import { usageStore } from './store'

const providerIds: Record<LLMProvider, string> = {
    [LLMProvider.OpenAI]: 'openai',
    [LLMProvider.Anthropic]: 'anthropic',
    [LLMProvider.GoogleCloud]: 'google',
    [LLMProvider.VertexAI]: 'vertex',
    [LLMProvider.AsIs]: 'custom',
    [LLMProvider.Mistral]: 'mistral',
    [LLMProvider.NovelList]: 'novellist',
    [LLMProvider.Cohere]: 'cohere',
    [LLMProvider.NovelAI]: 'novelai',
    [LLMProvider.WebLLM]: 'webllm',
    [LLMProvider.Horde]: 'horde',
    [LLMProvider.AWS]: 'aws',
    [LLMProvider.DeepSeek]: 'deepseek',
    [LLMProvider.DeepInfra]: 'deepinfra',
    [LLMProvider.Echo]: 'echo',
    [LLMProvider.NanoGPT]: 'nanogpt',
    [LLMProvider.Ollama]: 'ollama',
}

function hostOf(url: string | undefined): string | undefined {
    try {
        return new URL(url).hostname || undefined
    } catch {
        return undefined
    }
}

/**
 * Which provider and model a request is billed to. The provider is one of RisuAI's own (like "openai"),
 * or the host name of a custom endpoint, so the same model reached two ways is counted apart.
 */
export function usageSource(arg: RequestDataArgumentExtended): { provider: string, model: string } {
    const source = findSource(arg)
    return { provider: source.provider, model: source.model || arg.aiModel }
}

function findSource(arg: RequestDataArgumentExtended): { provider: string, model: string | undefined } {
    const db = getDatabase()
    const id = arg.aiModel
    const info = arg.modelInfo

    switch(id){
        case 'openrouter':
            return { provider: 'openrouter', model: db.openrouterRequestModel }
        case 'nanogpt':
            return { provider: 'nanogpt', model: db.nanogptRequestModel || info.internalID }
        case 'reverse_proxy':
            return { provider: hostOf(db.forceReplaceUrl) ?? 'custom', model: db.customProxyRequestModel }
        case 'ollama-hosted':
            return { provider: 'ollama', model: db.ollamaModel }
        case 'ollama-cloud':
            return { provider: 'ollama-cloud', model: db.ollamaCloudModel }
        case 'custom':
            return { provider: 'plugin', model: db.currentPluginProvider }
    }
    if(id.startsWith('xcustom:::')){
        const custom = db.customModels.find((model) => model.id === id)
        return { provider: hostOf(custom?.url) ?? 'custom', model: custom?.internalId || info.name }
    }
    if(id.startsWith('pluginmodel:::')){
        return { provider: 'plugin', model: id.slice('pluginmodel:::'.length) }
    }
    return {
        provider: providerIds[info.provider] ?? 'custom',
        model: (info.internalID || id).replace(/^models\//, ''),
    }
}

/** Starts metering a chat request. Requests that are never sent (previews, the echo model) are not metered. */
export function meterRequest(arg: RequestDataArgumentExtended): UsageMeter | undefined {
    if(arg.previewBody || arg.modelInfo.format === LLMFormat.Echo){
        return undefined
    }
    const bucket = { ...usageSource(arg), purpose: arg.mode ?? 'model' }
    // Providers may change the message list while sending it.
    const prompt = [...arg.formated]

    return new UsageMeter({
        countPrompt: () => new ChatTokenizer(0, 'name').tokenizeChats(prompt),
        countText: tokenize,
        record: (counters, model) => usageStore.record(model ? { ...bucket, model } : bucket, counters),
    })
}

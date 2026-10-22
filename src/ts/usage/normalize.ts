import type { TokenUsage } from './types'

// Each provider reports usage in its own shape. These turn them into TokenUsage,
// leaving out whatever the provider did not report so it can be estimated instead.

function count(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}

function sumCounts(...values: unknown[]): number | undefined {
    const counts = values.map(count).filter((value) => value !== undefined)
    return counts.length > 0 ? counts.reduce((a, b) => a + b, 0) : undefined
}

/** Splits a prompt count that already includes cached tokens. */
function splitPrompt(prompt: number | undefined, cacheRead: number | undefined, cacheWrite: number | undefined): TokenUsage {
    if(prompt === undefined){
        return {}
    }
    return {
        input: Math.max(0, prompt - (cacheRead ?? 0) - (cacheWrite ?? 0)),
        cacheRead: cacheRead ?? 0,
        cacheWrite: cacheWrite ?? 0,
    }
}

/** OpenAI Chat Completions `usage`. Also used by DeepSeek, OpenRouter and most compatible servers. */
export function fromOpenAIUsage(usage: any): TokenUsage | undefined {
    if(!usage || typeof usage !== 'object'){
        return undefined
    }
    return {
        ...splitPrompt(
            count(usage.prompt_tokens) ?? count(usage.input_tokens),
            count(usage.prompt_tokens_details?.cached_tokens) ?? count(usage.prompt_cache_hit_tokens),
            count(usage.prompt_tokens_details?.cache_write_tokens),
        ),
        output: count(usage.completion_tokens) ?? count(usage.output_tokens),
        reasoning: count(usage.completion_tokens_details?.reasoning_tokens),
    }
}

/** OpenAI Responses API `usage`. */
export function fromResponsesUsage(usage: any): TokenUsage | undefined {
    if(!usage || typeof usage !== 'object'){
        return undefined
    }
    return {
        ...splitPrompt(count(usage.input_tokens), count(usage.input_tokens_details?.cached_tokens), undefined),
        output: count(usage.output_tokens),
        reasoning: count(usage.output_tokens_details?.reasoning_tokens),
    }
}

/** Anthropic Messages `usage`. Its `input_tokens` already leaves out cached tokens. */
export function fromAnthropicUsage(usage: any): TokenUsage | undefined {
    if(!usage || typeof usage !== 'object'){
        return undefined
    }
    return {
        input: count(usage.input_tokens),
        cacheRead: count(usage.cache_read_input_tokens),
        cacheWrite: count(usage.cache_creation_input_tokens),
        output: count(usage.output_tokens),
    }
}

/** Gemini `usageMetadata`. Thinking tokens are reported apart from the answer but billed as output. */
export function fromGeminiUsage(metadata: any): TokenUsage | undefined {
    if(!metadata || typeof metadata !== 'object'){
        return undefined
    }
    return {
        ...splitPrompt(
            sumCounts(metadata.promptTokenCount, metadata.toolUsePromptTokenCount),
            count(metadata.cachedContentTokenCount),
            undefined,
        ),
        output: sumCounts(metadata.candidatesTokenCount, metadata.thoughtsTokenCount),
        reasoning: count(metadata.thoughtsTokenCount),
    }
}

/** The final message of an Ollama `/api/chat` response. */
export function fromOllamaResponse(response: any): TokenUsage | undefined {
    if(!response || typeof response !== 'object'){
        return undefined
    }
    return {
        input: count(response.prompt_eval_count),
        output: count(response.eval_count),
    }
}

/** Cohere v1 chat `meta`. */
export function fromCohereMeta(meta: any): TokenUsage | undefined {
    const billed = meta?.billed_units
    if(!billed || typeof billed !== 'object'){
        return undefined
    }
    return {
        input: count(billed.input_tokens),
        output: count(billed.output_tokens),
    }
}

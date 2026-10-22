import { describe, expect, it } from 'vitest'

import {
    fromAnthropicUsage,
    fromCohereMeta,
    fromGeminiUsage,
    fromOllamaResponse,
    fromOpenAIUsage,
    fromResponsesUsage,
} from '../normalize'

describe('fromOpenAIUsage', () => {
    it('takes cached tokens out of the prompt count', () => {
        expect(fromOpenAIUsage({
            prompt_tokens: 1000,
            completion_tokens: 200,
            prompt_tokens_details: { cached_tokens: 600 },
            completion_tokens_details: { reasoning_tokens: 50 },
        })).toEqual({ input: 400, cacheRead: 600, cacheWrite: 0, output: 200, reasoning: 50 })
    })

    it('reads DeepSeek cache hits', () => {
        expect(fromOpenAIUsage({ prompt_tokens: 100, prompt_cache_hit_tokens: 40, completion_tokens: 5 }))
            .toMatchObject({ input: 60, cacheRead: 40, output: 5 })
    })

    it('ignores the null usage of intermediate stream chunks', () => {
        expect(fromOpenAIUsage(null)).toBeUndefined()
    })

    it('leaves out counts the server did not send', () => {
        const usage = fromOpenAIUsage({ completion_tokens: 7 })
        expect(usage.input).toBeUndefined()
        expect(usage.output).toBe(7)
    })
})

describe('fromResponsesUsage', () => {
    it('splits cached input', () => {
        expect(fromResponsesUsage({
            input_tokens: 500,
            input_tokens_details: { cached_tokens: 100 },
            output_tokens: 80,
            output_tokens_details: { reasoning_tokens: 30 },
        })).toEqual({ input: 400, cacheRead: 100, cacheWrite: 0, output: 80, reasoning: 30 })
    })
})

describe('fromAnthropicUsage', () => {
    it('keeps the input count as is, since it already leaves out the cache', () => {
        expect(fromAnthropicUsage({
            input_tokens: 10,
            cache_read_input_tokens: 2000,
            cache_creation_input_tokens: 300,
            output_tokens: 50,
        })).toEqual({ input: 10, cacheRead: 2000, cacheWrite: 300, output: 50 })
    })

    it('reads a message_delta that only has output tokens', () => {
        expect(fromAnthropicUsage({ output_tokens: 120 })).toEqual({
            input: undefined,
            cacheRead: undefined,
            cacheWrite: undefined,
            output: 120,
        })
    })
})

describe('fromGeminiUsage', () => {
    it('bills thinking as output and splits cached content', () => {
        expect(fromGeminiUsage({
            promptTokenCount: 1000,
            cachedContentTokenCount: 250,
            candidatesTokenCount: 100,
            thoughtsTokenCount: 400,
        })).toEqual({ input: 750, cacheRead: 250, cacheWrite: 0, output: 500, reasoning: 400 })
    })

    it('counts tool use prompts as input', () => {
        expect(fromGeminiUsage({ promptTokenCount: 10, toolUsePromptTokenCount: 5, candidatesTokenCount: 1 }))
            .toMatchObject({ input: 15, output: 1 })
    })
})

describe('other providers', () => {
    it('reads the last Ollama message', () => {
        expect(fromOllamaResponse({ done: true, prompt_eval_count: 30, eval_count: 12 })).toEqual({ input: 30, output: 12 })
    })

    it('reads Cohere billed units', () => {
        expect(fromCohereMeta({ billed_units: { input_tokens: 8, output_tokens: 3 } })).toEqual({ input: 8, output: 3 })
        expect(fromCohereMeta({})).toBeUndefined()
    })
})

import { describe, expect, it } from 'vitest'

import { LLMFlags, LLMFormat, LLMProvider, LLMTokenizer, OpenAIParameters, ProviderNames, type LLMModel } from 'src/ts/model/types'

describe('UnoRouter provider', () => {
    it('is registered as an LLMProvider with a display name', () => {
        expect(typeof LLMProvider.UnoRouter).toBe('number')
        expect(ProviderNames.get(LLMProvider.UnoRouter)).toBe('UnoRouter')
    })

    it('describes the free DeepSeek V4 Flash model as an OpenAI-compatible endpoint', () => {
        const model: LLMModel = {
            id: 'deepseek-v4-flash:free',
            name: 'DeepSeek V4 Flash (free)',
            provider: LLMProvider.UnoRouter,
            format: LLMFormat.OpenAICompatible,
            flags: [LLMFlags.hasFullSystemPrompt, LLMFlags.hasStreaming],
            parameters: OpenAIParameters,
            tokenizer: LLMTokenizer.Unknown,
            endpoint: 'https://api.unorouter.com/v1/chat/completions',
            keyIdentifier: 'unorouter',
        }

        expect(model.format).toBe(LLMFormat.OpenAICompatible)
        expect(model.endpoint).toBe('https://api.unorouter.com/v1/chat/completions')
        expect(model.keyIdentifier).toBe('unorouter')
        expect(model.flags).toContain(LLMFlags.hasStreaming)
    })
})

import { LLMFlags, LLMFormat, LLMProvider, LLMTokenizer, ClaudeParameters, type LLMModel } from '../types'

export const AnthropicModels: LLMModel[] = [
    // Claude 4.5 (2025-11-01)
    {
        name: "Claude 4.5 Opus (20251101)",
        id: 'claude-opus-4-5-20251101',
        shortName: "4.5 Opus",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.hasStreaming,
            LLMFlags.claudeThinking
        ],
        recommended: true,
        parameters: [...ClaudeParameters, 'thinking_tokens'],
        tokenizer: LLMTokenizer.Claude
    },

    // Claude 4.5 (2025-09-29)
    {
        name: "Claude 4.5 Sonnet (20250929)",
        id: 'claude-sonnet-4-5-20250929',
        shortName: "4.5 Sonnet",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.hasStreaming,
            LLMFlags.claudeThinking
        ],
        recommended: true,
        parameters: [...ClaudeParameters, 'thinking_tokens'],
        tokenizer: LLMTokenizer.Claude
    },

    // Claude 4.5 Haiku (2025-10-01)
    {
        name: "Claude 4.5 Haiku (20251001)",
        id: 'claude-haiku-4-5-20251001',
        shortName: "4.5 Haiku",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.hasStreaming,
            LLMFlags.claudeThinking
        ],
        recommended: true,
        parameters: [...ClaudeParameters, 'thinking_tokens'],
        tokenizer: LLMTokenizer.Claude
    },
    // Claude 4.1 (2025-08)
    {
        name: "Claude 4.1 Opus (20250805)",
        id: 'claude-opus-4-1-20250805',
        shortName: "4.1 Opus",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.hasStreaming,
            LLMFlags.claudeThinking
        ],
        parameters: [...ClaudeParameters, 'thinking_tokens'],
        tokenizer: LLMTokenizer.Claude
    },
    // Claude 4 (2025-05-14)
    {
        name: "Claude 4 Sonnet (20250514)",
        id: 'claude-sonnet-4-20250514',
        shortName: "4 Sonnet",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.hasStreaming,
            LLMFlags.claudeThinking
        ],
        parameters: [...ClaudeParameters, 'thinking_tokens'],
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: "Claude 4 Opus (20250514)",
        id: 'claude-opus-4-20250514',
        shortName: "4 Opus",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.hasStreaming,
            LLMFlags.claudeThinking
        ],
        recommended: false,
        parameters: [...ClaudeParameters, 'thinking_tokens'],
        tokenizer: LLMTokenizer.Claude
    },
    // Claude 3.7 (2025-02-19)
    {
        name: "Claude 3.7 Sonnet",
        id: 'claude-3-7-sonnet-latest',
        shortName: "3.7 Sonnet",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.hasStreaming,
            LLMFlags.claudeThinking
        ],
        parameters: [...ClaudeParameters, 'thinking_tokens'],
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: "Claude 3.7 Sonnet (20250219)",
        id: 'claude-3-7-sonnet-20250219',
        shortName: "3.7 Sonnet 0219",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.hasStreaming,
            LLMFlags.claudeThinking
        ],
        parameters: [...ClaudeParameters, 'thinking_tokens'],
        tokenizer: LLMTokenizer.Claude
    },
    // Claude 3.5 (2024-10-22)
    {
        name: "Claude 3.5 Sonnet",
        id: 'claude-3-5-sonnet-latest',
        shortName: "3.5 Sonnet",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: "Claude 3.5 Haiku",
        id: 'claude-3-5-haiku-latest',
        shortName: "3.5 Haiku",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude 3.5 Sonnet (20241022)',
        id: 'claude-3-5-sonnet-20241022',
        shortName: "3.5 Sonnet 1022",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: "Claude 3.5 Haiku (20241022)",
        id: 'claude-3-5-haiku-20241022',
        shortName: "3.5 Haiku 1022",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    // Claude 3.5 (2024-06-20)
    {
        name: 'Claude 3.5 Sonnet (20240620)',
        id: 'claude-3-5-sonnet-20240620',
        shortName: "3.5 Sonnet 0620",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    // Claude 3 (2024-03-07)
    {
        name: 'Claude 3 Haiku (20240307)',
        id: 'claude-3-haiku-20240307',
        shortName: "3 Haiku 0307",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    // Claude 3 (2024-02-29)
    {
        name: 'Claude 3 Opus (20240229)',
        id: 'claude-3-opus-20240229',
        shortName: "3 Opus 0229",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude 3 Sonnet (20240229)',
        id: 'claude-3-sonnet-20240229',
        shortName: "3 Sonnet 0229",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    // Claude 2.x (2023)
    {
        name: 'Claude 2.1',
        id: 'claude-2.1',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [
            LLMFlags.hasPrefill,
        ],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude 2',
        id: 'claude-2',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude 2 100k',
        id: 'claude-2-100k',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    // Claude 1.x (Legacy)
    {
        name: 'Claude v1.2',
        id: 'claude-1.2',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude v1.0',
        id: 'claude-1.0',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude v1',
        id: 'claude-v1',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude v1 100k',
        id: 'claude-v1-100k',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude Instant v1',
        id: 'claude-instant-v1',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude Instant v1 100k',
        id: 'claude-instant-v1-100k',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude Instant 1.2',
        id: 'claude-instant-1.2',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
]

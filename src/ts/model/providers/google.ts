import { LLMFlags, LLMFormat, LLMProvider, LLMTokenizer, type LLMModel } from '../types'

export const GoogleModels: LLMModel[] = [


    // === Gemini Latest ===
    {
        name: "Gemini Flash Latest",
        id: 'gemini-flash-latest',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking, LLMFlags.geminiThinkingNoMinimal, LLMFlags.hasFirstSystemPrompt],
        parameters: ['reasoning_effort'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: true
    },
    {
        name: "Gemini Flash Lite Latest",
        id: 'gemini-flash-lite-latest',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking, LLMFlags.geminiThinkingNoMinimal, LLMFlags.hasFirstSystemPrompt],
        parameters: ['reasoning_effort'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: true
    },

    // ===== Gemini 4 Series =====
    {
        name: "Gemini 4 Argon",
        id: 'gemini-4-argon',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking, LLMFlags.geminiThinkingNoMinimal, LLMFlags.hasFirstSystemPrompt],
        parameters: ['reasoning_effort'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: true
    },

    // ===== Gemini 3.5/3.6/3.7/3.8 Series (2026) =====
    {
        name: "Gemini Flash 3.8",
        id: 'gemini-3.8-flash',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking, LLMFlags.geminiThinkingNoMinimal, LLMFlags.hasFirstSystemPrompt],
        parameters: ['reasoning_effort'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: false
    },
    {
        name: "Gemini Flash 3.7",
        id: 'gemini-3.7-flash',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking, LLMFlags.geminiThinkingNoMinimal, LLMFlags.hasFirstSystemPrompt],
        parameters: ['reasoning_effort'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: false
    },
    {
        name: "Gemini Flash 3.6",
        id: 'gemini-3.6-flash',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking, LLMFlags.hasFirstSystemPrompt],
        parameters: ['reasoning_effort', 'temperature', 'top_k', 'top_p'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: false
    },
    {
        name: "Gemini Flash 3.5",
        id: 'gemini-3.5-flash',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking, LLMFlags.hasFirstSystemPrompt],
        parameters: ['reasoning_effort', 'temperature', 'top_k', 'top_p'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: false
    },
    {
        name: "Gemini Flash Lite 3.5",
        id: 'gemini-3.5-flash-lite',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking, LLMFlags.hasFirstSystemPrompt],
        parameters: ['reasoning_effort', 'temperature', 'top_k', 'top_p'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: false
    },

    // ===== Gemini 3.1 Series (2026) =====
    {
        name: "Gemini Pro 3.1 Preview",
        id: 'gemini-3.1-pro-preview',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking, LLMFlags.geminiThinkingNoMinimal, LLMFlags.hasFirstSystemPrompt],
        parameters: ['reasoning_effort', 'temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: false
    },
    // ===== Gemini 3 Series (2025) =====
    {
        name: "Gemini Flash 3 Preview",
        id: 'gemini-3-flash-preview',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking, LLMFlags.hasFirstSystemPrompt],
        parameters: ['reasoning_effort', 'temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: false
    },
    {
        name: "Gemini Pro 3 Image",
        id: 'gemini-3-pro-image',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.hasImageOutput, LLMFlags.poolSupported, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.hasFirstSystemPrompt],
        parameters: ['temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: false
    },

    // ===== Gemini 2.5 Series (2025) =====
    {
        name: "Gemini Pro 2.5",
        id: 'gemini-2.5-pro',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking, LLMFlags.hasFirstSystemPrompt],
        parameters: ['thinking_tokens', 'temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
    },
    {
        name: "Gemini Flash 2.5",
        id: 'gemini-2.5-flash',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking, LLMFlags.hasFirstSystemPrompt],
        parameters: ['thinking_tokens', 'temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
    },
    {
        name: "Gemini Flash 2.5 Image",
        id: 'gemini-2.5-flash-image',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.hasImageOutput, LLMFlags.poolSupported, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.hasFirstSystemPrompt],
        parameters: ['temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
    },
    {
        name: "Gemini Flash Lite 2.5",
        id: 'gemini-2.5-flash-lite',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.geminiBlockOff, LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking, LLMFlags.hasFirstSystemPrompt],
        parameters: ['thinking_tokens', 'temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
    },
]

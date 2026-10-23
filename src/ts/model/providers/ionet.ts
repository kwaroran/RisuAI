import { LLMFlags, LLMFormat, LLMProvider, LLMTokenizer, type LLMModel } from '../types'

// IO Intelligence (io.net) — OpenAI-compatible Chat Completions gateway.
// Endpoint: https://api.intelligence.io.solutions/api/v1/chat/completions
// Model ids are org/name style (e.g. meta-llama/Llama-3.3-70B-Instruct), so
// internalID carries the wire id and id stays a friendly unique key.
// API keys: https://cloud.io.net

export const IonetModels: LLMModel[] = [
    {
        id: 'ionet/glm-5.3',
        internalID: 'zai-org/GLM-5.3',
        name: 'GLM 5.3 (IO Intelligence)',
        provider: LLMProvider.Ionet,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasStreaming, LLMFlags.hasFullSystemPrompt],
        parameters: ['frequency_penalty', 'presence_penalty', 'temperature', 'top_p'],
        tokenizer: LLMTokenizer.GLM5,
        endpoint: 'https://api.intelligence.io.solutions/api/v1/chat/completions',
        keyIdentifier: 'ionet',
        recommended: true
    },
    {
        id: 'ionet/deepseek-v4.1-flash',
        internalID: 'deepseek-ai/DeepSeek-V4.1-Flash',
        name: 'DeepSeek V4.1 Flash (IO Intelligence)',
        provider: LLMProvider.Ionet,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasStreaming, LLMFlags.hasFullSystemPrompt],
        parameters: ['frequency_penalty', 'presence_penalty', 'temperature', 'top_p'],
        tokenizer: LLMTokenizer.DeepSeekV4,
        endpoint: 'https://api.intelligence.io.solutions/api/v1/chat/completions',
        keyIdentifier: 'ionet',
        recommended: true
    },
    {
        id: 'ionet/kimi-k3',
        internalID: 'moonshotai/Kimi-K3',
        name: 'Kimi K3 (IO Intelligence)',
        provider: LLMProvider.Ionet,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasStreaming, LLMFlags.hasFullSystemPrompt, LLMFlags.hasImageInput],
        parameters: ['frequency_penalty', 'presence_penalty', 'temperature', 'top_p'],
        tokenizer: LLMTokenizer.Unknown,
        endpoint: 'https://api.intelligence.io.solutions/api/v1/chat/completions',
        keyIdentifier: 'ionet'
    },
    {
        id: 'ionet/qwen3.8-27b',
        internalID: 'Qwen/Qwen3.8-27B',
        name: 'Qwen3.8 27B (IO Intelligence)',
        provider: LLMProvider.Ionet,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasStreaming, LLMFlags.hasFullSystemPrompt, LLMFlags.hasImageInput],
        parameters: ['frequency_penalty', 'presence_penalty', 'temperature', 'top_p'],
        tokenizer: LLMTokenizer.Unknown,
        endpoint: 'https://api.intelligence.io.solutions/api/v1/chat/completions',
        keyIdentifier: 'ionet'
    },
    {
        id: 'ionet/deepseek-r1-0528',
        internalID: 'deepseek-ai/DeepSeek-R1-0528',
        name: 'DeepSeek R1 0528 (IO Intelligence)',
        provider: LLMProvider.Ionet,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasStreaming, LLMFlags.hasFullSystemPrompt],
        parameters: ['frequency_penalty', 'presence_penalty', 'temperature', 'top_p'],
        tokenizer: LLMTokenizer.DeepSeek,
        endpoint: 'https://api.intelligence.io.solutions/api/v1/chat/completions',
        keyIdentifier: 'ionet'
    },
    {
        id: 'ionet/llama-3.3-70b',
        internalID: 'meta-llama/Llama-3.3-70B-Instruct',
        name: 'Llama 3.3 70B (IO Intelligence)',
        provider: LLMProvider.Ionet,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasStreaming, LLMFlags.hasFullSystemPrompt],
        parameters: ['frequency_penalty', 'presence_penalty', 'temperature', 'top_p'],
        tokenizer: LLMTokenizer.Llama3,
        endpoint: 'https://api.intelligence.io.solutions/api/v1/chat/completions',
        keyIdentifier: 'ionet'
    }
]

import { getDatabase } from "../storage/database.svelte"
import {
    LLMFlags,
    LLMProvider,
    LLMFormat,
    LLMTokenizer,
    ProviderNames,
    OpenAIParameters,
    ClaudeParameters,
    type LLMModel,
    GPT5XHighParameters
} from './types'
import { OpenAIModels } from './providers/openai'
import { AnthropicModels } from './providers/anthropic'
import { GoogleModels } from './providers/google'
import { fetchNative } from "../globalApi.svelte"
import { DBState } from "../stores.svelte"
import { customProviderStore, pluginV2 } from "../plugins/plugins.svelte"
import { get } from "svelte/store"
import { customV3ProviderMetaStore } from "../plugins/apiV3/v3.svelte"

// Re-export types for backwards compatibility
export { LLMFlags, LLMProvider, LLMFormat, LLMTokenizer, ProviderNames, OpenAIParameters, ClaudeParameters }
export type { LLMModel }

function makeDeepInfraModels(id:string[]):LLMModel[]{
    return id.map((id) => {
        return {
            id: 'deepinfra_' + id,
            name: id,
            internalID: id,
            provider: LLMProvider.DeepInfra,
            format: LLMFormat.OpenAICompatible,
            parameters: ['frequency_penalty', 'presence_penalty', 'temperature', 'top_p'],
            flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.requiresAlternateRole, LLMFlags.mustStartWithUserInput, LLMFlags.hasPrefill, LLMFlags.deepSeekThinkingOutput, LLMFlags.hasStreaming],
            tokenizer: LLMTokenizer.DeepSeek,
            endpoint: 'https://api.deepinfra.com/v1/openai/chat/completions',
            keyIdentifier: 'deepinfra',
            recommended: true
        } as LLMModel
    })
}

export const LLMModels: LLMModel[] = [
    ...OpenAIModels,
    ...AnthropicModels,
    // AWS Bedrock Claude models
    {
        name: "Claude 4.6 Opus v1",
        id: 'anthropic.claude-opus-4-6-v1',
        provider: LLMProvider.AWS,
        format: LLMFormat.AWSBedrockClaude,
        flags: [
            LLMFlags.hasPrefill, // actually it doesn't, but leaving it for compatibility
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.claudeThinking
        ],
        parameters: [...ClaudeParameters, 'thinking_tokens'],
        tokenizer: LLMTokenizer.Claude,
    },
    {
        name: "Claude 4.5 Opus (20251101) v1",
        id: 'anthropic.claude-opus-4-5-20251101-v1:0',
        provider: LLMProvider.AWS,
        format: LLMFormat.AWSBedrockClaude,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.claudeThinking
        ],
        parameters: [...ClaudeParameters, 'thinking_tokens'],
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude 4.5 Sonnet (20250929) v1',
        id: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
        provider: LLMProvider.AWS,
        format: LLMFormat.AWSBedrockClaude,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.claudeThinking
        ],
        parameters: [...ClaudeParameters, 'thinking_tokens'],
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude 4.1 Opus (20250805) v1',
        id: 'anthropic.claude-opus-4-1-20250805-v1:0',
        provider: LLMProvider.AWS,
        format: LLMFormat.AWSBedrockClaude,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.claudeThinking
        ],
        parameters: [...ClaudeParameters, 'thinking_tokens'],
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude 4 Opus (20250514) v1',
        id: 'anthropic.claude-opus-4-20250514-v1:0',
        provider: LLMProvider.AWS,
        format: LLMFormat.AWSBedrockClaude,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.claudeThinking
        ],
        parameters: [...ClaudeParameters, 'thinking_tokens'],
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude 4 Sonnet (20250514) v1',
        id: 'anthropic.claude-sonnet-4-20250514-v1:0',
        provider: LLMProvider.AWS,
        format: LLMFormat.AWSBedrockClaude,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.claudeThinking
        ],
        parameters: [...ClaudeParameters, 'thinking_tokens'],
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude 3.7 Sonnet (20250219) v1',
        id: 'anthropic.claude-3-7-sonnet-20250219-v1:0',
        provider: LLMProvider.AWS,
        format: LLMFormat.AWSBedrockClaude,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt,
            LLMFlags.claudeThinking
        ],
        parameters: [...ClaudeParameters, 'thinking_tokens'],
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude 3.5 Sonnet (20241022) v2',
        id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        provider: LLMProvider.AWS,
        format: LLMFormat.AWSBedrockClaude,
        flags: [LLMFlags.hasPrefill, LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude 3.5 Sonnet (20240620) v1',
        id: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
        provider: LLMProvider.AWS,
        format: LLMFormat.AWSBedrockClaude,
        flags: [LLMFlags.hasPrefill, LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude 3 Opus (20240229) v1',
        id: 'anthropic.claude-3-opus-20240229-v1:0',
        provider: LLMProvider.AWS,
        format: LLMFormat.AWSBedrockClaude,
        flags: [LLMFlags.hasPrefill, LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude 3 Sonnet (20240229) v1',
        id: 'anthropic.claude-3-sonnet-20240229-v1:0',
        provider: LLMProvider.AWS,
        format: LLMFormat.AWSBedrockClaude,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasImageInput,
            LLMFlags.hasFirstSystemPrompt
        ],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    // Other providers
    {
        name: 'Ooba',
        id: 'ooba',
        provider: LLMProvider.AsIs,
        format: LLMFormat.Ooba,
        flags: [LLMFlags.hasFirstSystemPrompt],
        recommended: true,
        parameters: [],
        tokenizer: LLMTokenizer.Llama
    },
    {
        name: 'Mancer',
        id: 'mancer',
        provider: LLMProvider.AsIs,
        format: LLMFormat.OobaLegacy,
        flags: [LLMFlags.hasFirstSystemPrompt],
        parameters: [],
        tokenizer: LLMTokenizer.Llama
    },
    {
        name: 'OpenRouter',
        id: 'openrouter',
        provider: LLMProvider.AsIs,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasFullSystemPrompt, LLMFlags.hasImageInput, LLMFlags.hasStreaming],
        parameters: ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty', 'repetition_penalty', 'min_p', 'top_a', 'top_k'],
        recommended: true,
        tokenizer: LLMTokenizer.Unknown
    },
    {
        name: 'OrcaRouter',
        id: 'orcarouter',
        provider: LLMProvider.AsIs,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasFullSystemPrompt, LLMFlags.hasImageInput, LLMFlags.hasStreaming],
        parameters: ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty', 'repetition_penalty', 'min_p', 'top_a', 'top_k'],
        recommended: true,
        tokenizer: LLMTokenizer.Unknown
    },
    // Mistral models
    {
        name: 'Mistral Small Latest',
        id: 'mistral-small-latest',
        shortName: 'Mistral S',
        provider: LLMProvider.Mistral,
        format: LLMFormat.Mistral,
        flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.mustStartWithUserInput, LLMFlags.requiresAlternateRole],
        recommended: true,
        parameters: ['temperature', 'presence_penalty', 'frequency_penalty', 'top_p'],
        tokenizer: LLMTokenizer.Mistral
    },
    {
        name: 'Mistral Medium Latest',
        id: 'mistral-medium-latest',
        shortName: 'Mistral M',
        provider: LLMProvider.Mistral,
        format: LLMFormat.Mistral,
        flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.mustStartWithUserInput, LLMFlags.requiresAlternateRole],
        recommended: true,
        parameters: ['temperature', 'presence_penalty', 'frequency_penalty', 'top_p'],
        tokenizer: LLMTokenizer.Mistral
    },
    {
        name: 'Mistral Large 2411',
        id: 'mistral-large-2411',
        shortName: 'Mistral L 2411',
        provider: LLMProvider.Mistral,
        format: LLMFormat.Mistral,
        flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.mustStartWithUserInput, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'presence_penalty', 'frequency_penalty', 'top_p'],
        tokenizer: LLMTokenizer.Mistral
    },
    {
        name: 'Mistral Nemo',
        id: 'open-mistral-nemo',
        shortName: 'Mistral Nemo',
        provider: LLMProvider.Mistral,
        format: LLMFormat.Mistral,
        flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.mustStartWithUserInput, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'presence_penalty', 'frequency_penalty', 'top_p'],
        tokenizer: LLMTokenizer.Mistral
    },
    {
        name: 'Mistral Large Latest',
        id: 'mistral-large-latest',
        shortName: 'Mistral L',
        provider: LLMProvider.Mistral,
        format: LLMFormat.Mistral,
        flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.mustStartWithUserInput, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'presence_penalty', 'frequency_penalty', 'top_p'],
        recommended: true,
        tokenizer: LLMTokenizer.Mistral
    },
    // Google models
    ...GoogleModels,
    // Kobold
    {
        name: 'Kobold',
        id: 'kobold',
        provider: LLMProvider.AsIs,
        format: LLMFormat.Kobold,
        flags: [LLMFlags.hasFirstSystemPrompt],
        recommended: true,
        parameters: [
            'temperature',
            'top_p',
            'repetition_penalty',
            'top_k',
            'top_a'
        ],
        tokenizer: LLMTokenizer.Unknown
    },
    // NovelList
    {
        name: "SuperTrin",
        id: 'novellist',
        provider: LLMProvider.NovelList,
        format: LLMFormat.NovelList,
        flags: [],
        parameters: [],
        tokenizer: LLMTokenizer.NovelList
    },
    {
        name: "Damsel",
        id: 'novellist_damsel',
        provider: LLMProvider.NovelList,
        format: LLMFormat.NovelList,
        flags: [],
        parameters: [],
        tokenizer: LLMTokenizer.NovelList
    },
    // Cohere
    {
        name: "Command R",
        id: 'cohere-command-r',
        internalID: 'command-r',
        provider: LLMProvider.Cohere,
        format: LLMFormat.Cohere,
        flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.requiresAlternateRole, LLMFlags.mustStartWithUserInput],
        recommended: true,
        parameters: [
            'temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'
        ],
        tokenizer: LLMTokenizer.Cohere
    },
    {
        name: "Command R Plus",
        id: 'cohere-command-r-plus',
        internalID: 'command-r-plus',
        provider: LLMProvider.Cohere,
        format: LLMFormat.Cohere,
        flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.requiresAlternateRole, LLMFlags.mustStartWithUserInput],
        recommended: true,
        parameters: [
            'temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'
        ],
        tokenizer: LLMTokenizer.Cohere
    },
    {
        name: "Command R 08-2024",
        id: 'cohere-command-r-08-2024',
        internalID: 'command-r-08-2024',
        provider: LLMProvider.Cohere,
        format: LLMFormat.Cohere,
        flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.requiresAlternateRole, LLMFlags.mustStartWithUserInput],
        parameters: [
            'temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'
        ],
        tokenizer: LLMTokenizer.Cohere
    },
    {
        name: "Command R 03-2024",
        id: 'cohere-command-r-03-2024',
        internalID: 'command-r-03-2024',
        provider: LLMProvider.Cohere,
        format: LLMFormat.Cohere,
        flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.requiresAlternateRole, LLMFlags.mustStartWithUserInput],
        parameters: [
            'temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'
        ],
        tokenizer: LLMTokenizer.Cohere
    },
    {
        name: "Command R Plus 08-2024",
        id: 'cohere-command-r-plus-08-2024',
        internalID: 'command-r-plus-08-2024',
        provider: LLMProvider.Cohere,
        format: LLMFormat.Cohere,
        flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.requiresAlternateRole, LLMFlags.mustStartWithUserInput],
        parameters: [
            'temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'
        ],
        tokenizer: LLMTokenizer.Cohere
    },
    {
        name: "Command R Plus 04-2024",
        id: 'cohere-command-r-plus-04-2024',
        internalID: 'command-r-plus-04-2024',
        provider: LLMProvider.Cohere,
        format: LLMFormat.Cohere,
        flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.requiresAlternateRole, LLMFlags.mustStartWithUserInput],
        parameters: [
            'temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'
        ],
        tokenizer: LLMTokenizer.Cohere
    },
    // NovelAI
    {
        name: "Clio",
        id: 'novelai',
        provider: LLMProvider.NovelAI,
        format: LLMFormat.NovelAI,
        flags: [LLMFlags.hasFullSystemPrompt],
        recommended: true,
        parameters: [
            'temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'
        ],
        tokenizer: LLMTokenizer.NovelAI
    },
    {
        name: "Kayra",
        id: 'novelai_kayra',
        provider: LLMProvider.NovelAI,
        format: LLMFormat.NovelAI,
        flags: [LLMFlags.hasFullSystemPrompt],
        recommended: true,
        parameters: [
            'temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'
        ],
        tokenizer: LLMTokenizer.NovelAI
    },
    // Ollama
    {
        id: 'ollama-hosted',
        name: 'Local',
        fullName: 'Ollama Local',
        provider: LLMProvider.Ollama,
        format: LLMFormat.Ollama,
        flags: [LLMFlags.hasFullSystemPrompt, LLMFlags.hasStreaming],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.Unknown,
        recommended: true
    },
    {
        id: 'ollama-cloud',
        name: 'Cloud',
        fullName: 'Ollama Cloud',
        provider: LLMProvider.Ollama,
        format: LLMFormat.Ollama,
        flags: [LLMFlags.hasFullSystemPrompt, LLMFlags.hasStreaming],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.Unknown,
        recommended: true
    },
    // WebLLM
    {
        id: 'hf:::Xenova/opt-350m',
        name: 'opt-350m',
        provider: LLMProvider.WebLLM,
        format: LLMFormat.WebLLM,
        flags: [LLMFlags.hasFullSystemPrompt],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.Local
    },
    {
        id: 'hf:::Xenova/tiny-random-mistral',
        name: 'tiny-random-mistral',
        provider: LLMProvider.WebLLM,
        format: LLMFormat.WebLLM,
        flags: [LLMFlags.hasFullSystemPrompt],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.Local
    },
    {
        id: 'hf:::Xenova/gpt2-large-conversational',
        name: 'gpt2-large-conversational',
        provider: LLMProvider.WebLLM,
        format: LLMFormat.WebLLM,
        flags: [LLMFlags.hasFullSystemPrompt],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.Local
    },
    // DeepSeek
    {
        id: 'deepseek-v4-pro',
        name: 'DeepSeek V4 Pro',
        provider: LLMProvider.DeepSeek,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.requiresAlternateRole, LLMFlags.mustStartWithUserInput, LLMFlags.hasPrefill, LLMFlags.deepSeekPrefix, LLMFlags.deepSeekThinkingInput, LLMFlags.deepSeekThinkingOutput, LLMFlags.deepSeekThinkingToggle, LLMFlags.hasStreaming],
        parameters: ['frequency_penalty', 'presence_penalty', 'temperature', 'top_p'],
        tokenizer: LLMTokenizer.DeepSeekV4,
        endpoint: 'https://api.deepseek.com/beta/chat/completions',
        keyIdentifier: 'deepseek',
        recommended: true
    },
    {
        id: 'deepseek-v4-flash',
        name: 'DeepSeek V4 Flash',
        provider: LLMProvider.DeepSeek,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.requiresAlternateRole, LLMFlags.mustStartWithUserInput, LLMFlags.hasPrefill, LLMFlags.deepSeekPrefix, LLMFlags.deepSeekThinkingInput, LLMFlags.deepSeekThinkingOutput, LLMFlags.deepSeekThinkingToggle, LLMFlags.hasStreaming],
        parameters: ['frequency_penalty', 'presence_penalty', 'temperature', 'top_p'],
        tokenizer: LLMTokenizer.DeepSeekV4,
        endpoint: 'https://api.deepseek.com/beta/chat/completions',
        keyIdentifier: 'deepseek',
        recommended: true
    },
    {
        id: 'deepseek-reasoner',
        name: 'Deepseek Reasoner',
        provider: LLMProvider.DeepSeek,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.requiresAlternateRole, LLMFlags.mustStartWithUserInput, LLMFlags.hasPrefill, LLMFlags.deepSeekPrefix, LLMFlags.deepSeekThinkingInput, LLMFlags.deepSeekThinkingOutput, LLMFlags.hasStreaming],
        parameters: [],
        tokenizer: LLMTokenizer.DeepSeek,
        endpoint: 'https://api.deepseek.com/beta/chat/completions',
        keyIdentifier: 'deepseek'
    },
    {
        id: 'deepseek-chat',
        name: 'Deepseek Chat',
        provider: LLMProvider.DeepSeek,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.requiresAlternateRole, LLMFlags.mustStartWithUserInput, LLMFlags.hasPrefill, LLMFlags.deepSeekPrefix, LLMFlags.hasStreaming],
        parameters: ['frequency_penalty', 'presence_penalty', 'temperature', 'top_p'],
        tokenizer: LLMTokenizer.DeepSeek,
        endpoint: 'https://api.deepseek.com/beta/chat/completions',
        keyIdentifier: 'deepseek'
    },
    // DeepInfra
    ...makeDeepInfraModels([
        'deepseek-ai/DeepSeek-R1',
        'deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
        'deepseek-ai/DeepSeek-V3',
        'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        'meta-llama/Llama-3.3-70B-Instruct',
        'microsoft/phi-4',
        'meta-llama/Meta-Llama-3.1-70B-Instruct',
        'meta-llama/Meta-Llama-3.1-8B-Instruct',
        'meta-llama/Meta-Llama-3.1-405B-Instruct',
        'Qwen/QwQ-32B-Preview',
        'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        'Qwen/Qwen2.5-Coder-32B-Instruct',
        'nvidia/Llama-3.1-Nemotron-70B-Instruct',
        'Qwen/Qwen2.5-72B-Instruct',
        'meta-llama/Llama-3.2-90B-Vision-Instruct',
        'meta-llama/Llama-3.2-11B-Vision-Instruct',
        'microsoft/WizardLM-2-8x22B',
        '01-ai/Yi-34B-Chat',
        'Austism/chronos-hermes-13b-v2',
        'Gryphe/MythoMax-L2-13b',
        'Gryphe/MythoMax-L2-13b-turbo',
        'Sao10K/L3.3-70B-Euryale-v2.3',
        'Sao10K/L3.1-70B-Euryale-v2.2',
        'Sao10K/L3-70B-Euryale-v2.1',
        'google/gemma-2-27b-it',
        'google/gemma-2-9b-it'
    ]),
    // NanoGPT — single provider entry; model list fetched on demand via getNanoGPTModels()
    {
        id: 'nanogpt',
        name: 'NanoGPT',
        fullName: 'NanoGPT',
        provider: LLMProvider.NanoGPT,
        format: LLMFormat.NanoGPT,
        flags: [LLMFlags.hasFullSystemPrompt, LLMFlags.hasImageInput, LLMFlags.hasStreaming, LLMFlags.OAICompletionTokens],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.Unknown,
        recommended: true,
    },
    // Plugin and Custom API
    {
        id: 'custom',
        name: "Plugin Legacy",
        provider: LLMProvider.AsIs,
        format: LLMFormat.Plugin,
        flags: [LLMFlags.hasFullSystemPrompt],
        parameters: ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty', 'repetition_penalty', 'min_p', 'top_a', 'top_k', 'thinking_tokens'],
        tokenizer: LLMTokenizer.Unknown
    },
    {
        id: 'reverse_proxy',
        name: "Custom API",
        provider: LLMProvider.AsIs,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasFullSystemPrompt, LLMFlags.hasStreaming],
        recommended: true,
        parameters: ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty', 'repetition_penalty', 'min_p', 'top_a', 'top_k', 'thinking_tokens'],
        tokenizer: LLMTokenizer.Unknown
    },
    {
        id: 'echo_model',
        name: "Echo",
        provider: LLMProvider.Echo,
        format: LLMFormat.Echo,
        flags: [LLMFlags.hasFullSystemPrompt],
        recommended: false,
        parameters: [],
        tokenizer: LLMTokenizer.Unknown
    },
]

for(let model of LLMModels){
    model.shortName ??= model.name
    model.internalID ??= model.id
    model.fullName ??= model.provider !== LLMProvider.AsIs ? `${ProviderNames.get(model.provider) ?? ''} ${model.name}`.trim() : model.name
}

for(let i=0; i<LLMModels.length; i++){
    if(LLMModels[i].provider === LLMProvider.OpenAI && LLMModels[i].format === LLMFormat.OpenAICompatible){
        LLMModels.push({
            ...LLMModels[i],
            format: LLMFormat.OpenAIResponseAPI,
            flags: [...LLMModels[i].flags, LLMFlags.hasPrefill],
            id: `${LLMModels[i].id}-response-api`,
            name: `${LLMModels[i].name} (Response API)`,
            fullName: `${LLMModels[i].fullName ?? LLMModels[i].name} (Response API)`,
            recommended: false

        })
    }
    if(LLMModels[i].provider === LLMProvider.GoogleCloud){
        LLMModels.push({
            ...LLMModels[i],
            id: `${LLMModels[i].id}-vertex`,
            name: `${LLMModels[i].name} Vertex`,
            fullName: `${LLMModels[i].fullName ?? LLMModels[i].name} Vertex`,
            flags: [...LLMModels[i].flags],
            recommended: !!LLMModels[i].recommended,
            provider: LLMProvider.VertexAI,
            format: LLMFormat.VertexAIGemini
        })
    }
}

export async function registerModelDynamic(){

    if(!DBState.db.dynamicModelRegistry){
        return
    }
    //google
    try {
        if(DBState.db.google.accessToken){
            const res = await fetchNative(`https://generativelanguage.googleapis.com/v1beta/models?key=${DBState.db.google.accessToken}`, {
                method: 'GET',
            })
            const json = await res.json()
            console.log('Google models response', json)
            const models = json?.models || []
            for(let model of models){
                if(
                    !model.supportedGenerationMethods ||
                    !model.supportedGenerationMethods.includes('generateContent')
                ){
                    continue
                }

                const id = model.name.startsWith('models/') ? model.name.replace('models/', '') : model.name
                const exists = LLMModels.find(m => m.id === id || m.internalID === id)

                if(!exists){
                    LLMModels.push({
                        id: 'dynamic_google_' + id,
                        name: model.displayName || id,
                        shortName: model.displayName || id,
                        fullName: model.displayName || id,
                        internalID: model.name,
                        provider: LLMProvider.GoogleCloud,
                        format: LLMFormat.GoogleCloud,
                        flags: [LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking],
                        parameters: ['thinking_tokens', 'temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
                        tokenizer: LLMTokenizer.GoogleCloud
                    })
                }

            }
        }
    } catch (error) {
        console.error('Error fetching Google models', error)
    }

    //Anthropic
    try {
        if(DBState.db.claudeAPIKey){
            const res = await fetchNative('https://api.anthropic.com/v1/models', {
                method: 'GET',
                headers: {
                    'anthropic-version': '2023-06-01',
                    "x-api-key": DBState.db.claudeAPIKey,
                }
            })

            const json = await res.json()
            console.log('Anthropic models response', json)
            const models:{
                id: string,
                display_name: string,
            }[] = json?.data || []

            for(let model of models){
                const exists = LLMModels.find(m => m.id === model.id || m.internalID === model.id)
                if(!exists){
                    LLMModels.push({
                        name: model.display_name || model.id,
                        id: `dynamic_anthropic_${model.id}`,
                        shortName: model.display_name || model.id,
                        fullName: model.display_name || model.id,
                        internalID: model.id,
                        provider: LLMProvider.Anthropic,
                        format: LLMFormat.Anthropic,
                        flags: [
                            LLMFlags.hasImageInput,
                            LLMFlags.hasFirstSystemPrompt,
                            LLMFlags.hasStreaming,
                            LLMFlags.claudeThinking,
                            LLMFlags.claudeAdaptiveThinking
                        ],
                        parameters: [...ClaudeParameters, 'thinking_tokens'],
                        tokenizer: LLMTokenizer.Claude,
                        recommended: true
                    })
                }
            }
        }
    } catch (error) {
        console.error('Error fetching Anthropic models', error)
    }


    try {
        if(DBState.db.openAIKey){
            const res = await fetchNative(`https://api.openai.com/v1/models`, {
                method: 'GET',
                headers: {
                    "Authorization": 'Bearer ' + DBState.db.openAIKey
                }
            })
            const json = await res.json()
            console.log(json)
            if(!json.data){
                throw "Invaild Openai Model Response"
            }
            let i = 0;
            for(const model of json.data){
                const exists = LLMModels.find(m => m.id === model.id || m.internalID === model.id)

                if(exists){
                    continue
                }

                if(!model.id.startsWith('gpt-')){
                    continue
                }
                i++;

                const a:LLMModel = {
                    id: model.id,
                    internalID: model.id,
                    name: model.id,
                    shortName: model.id,
                    fullName: model.id,
                    provider: LLMProvider.OpenAI,
                    format: LLMFormat.OpenAICompatible,
                    flags: [
                        LLMFlags.hasStreaming,
                        LLMFlags.OAICompletionTokens,
                        LLMFlags.hasFullSystemPrompt,
                        LLMFlags.hasImageInput,
                        LLMFlags.DeveloperRole
                    ],
                    parameters: GPT5XHighParameters,
                    tokenizer: LLMTokenizer.tiktokenO200Base,
                    recommended: i<8
                }

                LLMModels.push(a,{
                    ...a,
                    format: LLMFormat.OpenAIResponseAPI,
                    flags: [...a.flags, LLMFlags.hasPrefill],
                    id: `${a.id}-response-api`,
                    name: `${a.name} (Response API)`,
                    fullName: `${a.fullName ?? a.name} (Response API)`,
                    recommended: false
                })

                
            }
        }
    } catch (error){

    }

}

//testing purpose only, not used in production
globalThis.registerModelDynamic = registerModelDynamic

export function getModelInfo(id?: string | null): LLMModel{

    const db = getDatabase()
    if(!id){
        return {
            id: '',
            name: 'Unknown',
            shortName: 'Unknown',
            fullName: 'Unknown',
            internalID: '',
            provider: LLMProvider.AsIs,
            format: LLMFormat.OpenAICompatible,
            flags: [],
            parameters: OpenAIParameters,
            tokenizer: LLMTokenizer.Unknown
        }
    }
    const found:LLMModel = safeStructuredClone(LLMModels.find(model => model.id === id))
    
    if(found){
        if(db.enableCustomFlags){
            found.flags = db.customFlags
        }

        return found
    }

    if(id.startsWith('hf:::')){
        const withoutPrefix = id.replace('hf:::', '')
        return {
            id,
            name: withoutPrefix,
            shortName: withoutPrefix,
            fullName: withoutPrefix,
            internalID: withoutPrefix,
            provider: LLMProvider.WebLLM,
            format: LLMFormat.WebLLM,
            flags: [],
            parameters: OpenAIParameters,
            tokenizer: LLMTokenizer.Local
        }
    }
    if(id.startsWith('horde:::')){
        const withoutPrefix = id.replace('horde:::', '')
        return {
            id,
            name: withoutPrefix,
            shortName: withoutPrefix,
            fullName: withoutPrefix,
            internalID: withoutPrefix,
            provider: LLMProvider.Horde,
            format: LLMFormat.Horde,
            flags: [],
            parameters: OpenAIParameters,
            tokenizer: LLMTokenizer.Unknown
        }
    }
    if(id.startsWith('xcustom:::')){
        const customModels = db?.customModels || []
        const found = customModels.find((model) => model.id === id)
        if(found){
            return {
                id: found.id,
                name: found.name,
                shortName: found.name,
                fullName: found.name,
                internalID: found.internalId,
                provider: LLMProvider.AsIs,
                format: found.format,
                flags: found.flags,
                parameters: ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty', 'repetition_penalty', 'min_p', 'top_a', 'top_k', 'thinking_tokens'],
                tokenizer: found.tokenizer
            }
        }
    }

    if(id.startsWith('pluginmodel:::')){
        const pluginModel = customV3ProviderMetaStore.find(model => model.id === id)
        if(pluginModel){
            return pluginModel
        }
    }

    return {
        id,
        name: id,
        shortName: id,
        fullName: id,
        internalID: id,
        provider: LLMProvider.AsIs,
        format: LLMFormat.OpenAICompatible,
        flags: [],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.Unknown
    }
}

interface GetModelListGroup {
    providerName: string
    models: LLMModel[]
}

export function getModelList<T extends boolean>(arg:{
    recommendedOnly?:boolean,
    groupedByProvider?:T
} = {}): T extends true ? GetModelListGroup[] : LLMModel[]{
    let models = LLMModels
    if(arg.recommendedOnly){
         models = models.filter(model => model.recommended)
    }
    const pluginGroup: GetModelListGroup = {
        providerName: 'Plugins',
        models: customV3ProviderMetaStore
    }

    if(arg.groupedByProvider){
        let group: GetModelListGroup[] = []
        for(let model of models){
            if(model.provider === LLMProvider.AsIs || model.provider === LLMProvider.NanoGPT){
                group.push({
                    providerName: '@as-is',
                    models: [model]
                })
                continue
            }

            let providerName = ProviderNames.get(model.provider) || 'Unknown'
            let groupIndex = group.findIndex(g => g.providerName === providerName)
            if(groupIndex === -1){
                group.push({
                    providerName,
                    models: [model]
                })
            }else{
                group[groupIndex].models.push(model)
            }
        }

        if(pluginGroup.models.length > 0){
            group.push(pluginGroup)
        }
        return group as any
    }
    else{
        for(const model of pluginGroup.models){
            models.push(model)
        }
    }

    return models as any
}

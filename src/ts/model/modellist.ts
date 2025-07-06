import type { Parameter } from "../process/request/request"
import { getDatabase } from "../storage/database.svelte"

export enum LLMFlags{
    hasImageInput,
    hasImageOutput,
    hasAudioInput,
    hasAudioOutput,
    hasPrefill,
    hasCache,
    hasFullSystemPrompt,
    hasFirstSystemPrompt,
    hasStreaming,
    requiresAlternateRole,
    mustStartWithUserInput,
    poolSupported,
    hasVideoInput,
    OAICompletionTokens,
    DeveloperRole,
    geminiThinking,
    geminiBlockOff,
    deepSeekPrefix,
    deepSeekThinkingInput,
    deepSeekThinkingOutput,
    noCivilIntegrity,
    claudeThinking,
}

export enum LLMProvider{
    OpenAI,
    Anthropic,
    GoogleCloud,
    VertexAI,
    AsIs,
    Mistral,
    NovelList,
    Cohere,
    NovelAI,
    WebLLM,
    Horde,
    AWS,
    AI21,
    DeepSeek,
    DeepInfra
}

export enum LLMFormat{
    OpenAICompatible,
    OpenAILegacyInstruct,
    Anthropic,
    AnthropicLegacy,
    Mistral,
    GoogleCloud,
    VertexAIGemini,
    NovelList,
    Cohere,
    NovelAI,
    WebLLM,
    OobaLegacy,
    Plugin,
    Ooba,
    Kobold,
    Ollama,
    Horde,
    AWSBedrockClaude,
    OpenAIResponseAPI
}

export enum LLMTokenizer{
    Unknown,
    tiktokenCl100kBase,
    tiktokenO200Base,
    Mistral,
    Llama,
    NovelAI,
    Claude,
    NovelList,
    Llama3,
    Gemma,
    GoogleCloud,
    Cohere,
    Local,
    DeepSeek
}

export interface LLMModel{
    id: string
    name: string
    shortName?: string
    fullName?: string
    internalID?: string
    provider: LLMProvider
    flags: LLMFlags[]
    format: LLMFormat
    parameters: Parameter[],
    tokenizer: LLMTokenizer
    recommended?: boolean
    keyIdentifier?: string
    endpoint?: string
}

const ProviderNames = new Map<LLMProvider, string>([
    [LLMProvider.OpenAI, 'OpenAI'],
    [LLMProvider.Anthropic, 'Anthropic'],
    [LLMProvider.GoogleCloud, 'Google Cloud'],
    [LLMProvider.VertexAI, 'Vertex AI'],
    [LLMProvider.AsIs, 'As Is'],
    [LLMProvider.Mistral, 'MistralAI'],
    [LLMProvider.NovelList, 'NovelList'],
    [LLMProvider.Cohere, 'Cohere'],
    [LLMProvider.NovelAI, 'NovelAI'],
    [LLMProvider.WebLLM, 'WebLLM'],
    [LLMProvider.Horde, 'Horde'],
    [LLMProvider.AWS, 'AWS'],
    [LLMProvider.DeepSeek, 'DeepSeek'],
    [LLMProvider.DeepInfra, 'DeepInfra']
])

const OpenAIParameters:Parameter[] = ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty']
const ClaudeParameters:Parameter[] = ['temperature', 'top_k', 'top_p']

function makeDeepInfraModels(id:string[]):LLMModel[]{
    return id.map((id) => {
        return {
            id: 'deepinfra_' + id,
            name: id,
            internalID: id,
            provider: LLMProvider.DeepInfra,
            format: LLMFormat.OpenAICompatible,
            parameters: ['frequency_penalty', 'presence_penalty','temperature', 'top_p'],
            flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.requiresAlternateRole, LLMFlags.mustStartWithUserInput, LLMFlags.hasPrefill, LLMFlags.deepSeekThinkingOutput, LLMFlags.hasStreaming],
            tokenizer: LLMTokenizer.DeepSeek,
            endpoint: 'https://api.deepinfra.com/v1/openai/chat/completions',
            keyIdentifier: 'deepinfra',
            recommended: true
        } as LLMModel
    })
}

export const LLMModels: LLMModel[] = [
    {
        id: 'gpt35',
        internalID: 'gpt-3.5-turbo',
        name: 'GPT-3.5',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasFullSystemPrompt, LLMFlags.hasStreaming],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'instructgpt35',
        internalID: "gpt-3.5-turbo-instruct",
        name: 'InstructGPT-3.5',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAILegacyInstruct,
        flags: [LLMFlags.hasFullSystemPrompt, LLMFlags.hasStreaming],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'gpt4_turbo',
        internalID: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasFullSystemPrompt, LLMFlags.hasStreaming],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'gpt4o',
        internalID: 'gpt-4o',
        name: 'GPT-4o',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasImageInput,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        recommended: true,
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    {
        id: 'gpt-4.5-preview-2025-02-27',
        internalID: 'gpt-4.5-preview-2025-02-27',
        name: 'GPT-4.5 (20250227)',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasImageInput,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens
        ],
        recommended: true,
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    {
        id: 'gpt-4.5-preview',
        internalID: 'gpt-4.5-preview',
        name: 'GPT-4.5 (preview)',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasImageInput,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens
        ],
        recommended: false,
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    {
        id: 'gpt4om',
        internalID: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasImageInput,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        recommended: true,
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    {
        id: 'gpt4',
        internalID: 'gpt-4',
        name: 'GPT-4',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'gpt4_32k',
        internalID: 'gpt-4-32k',
        name: 'GPT-4 32k',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'gpt35_16k',
        internalID: 'gpt-3.5-turbo-16k',
        name: 'GPT-3.5 Turbo 16k',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'gpt4_0314',
        internalID: 'gpt-4-0314',
        name: 'GPT-4 0314',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'gpt4_0613',
        internalID: 'gpt-4-0613',
        name: 'GPT-4 0613',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'gpt4_32k_0613',
        internalID: 'gpt-4-32k-0613',
        name: 'GPT-4 32k 0613',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'gpt4_1106',
        internalID: 'gpt-4-1106-preview',
        name: 'GPT-4 1106',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'gpt35_0125',
        internalID: 'gpt-3.5-turbo-0125',
        name: 'GPT-3.5 Turbo 0125',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'gpt35_1106',
        internalID: 'gpt-3.5-turbo-1106',
        name: 'GPT-3.5 Turbo 1106',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'gpt35_0613',
        internalID: 'gpt-3.5-turbo-0613',
        name: 'GPT-3.5 Turbo 0613',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'gpt35_16k_0613',
        internalID: 'gpt-3.5-turbo-16k-0613',
        name: 'GPT-3.5 Turbo 16k',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'gpt35_0301',
        internalID: 'gpt-3.5-turbo-0301',
        name: 'GPT-3.5 Turbo 0301',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'gpt4_0125',
        internalID: 'gpt-4-0125-preview',
        name: 'GPT-4 0125',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'gptvi4_1106',
        internalID: 'gpt-4-vision-preview',
        name: 'GPT-4 Vision 1106',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasImageInput,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'gpt4_turbo_20240409',
        internalID: 'gpt-4-turbo-2024-04-09',
        name: 'GPT-4 Turbo 2024-04-09',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenCl100kBase
    },
    {
        id: 'gpt4o-2024-05-13',
        internalID: 'gpt-4o-2024-05-13',
        name: 'GPT-4o 2024-05-13',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasImageInput,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    {
        id: 'gpt4o-2024-08-06',
        internalID: 'gpt-4o-2024-08-06',
        name: 'GPT-4o 2024-08-06',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasImageInput,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    {
        id: 'gpt4o-2024-11-20',
        internalID: 'gpt-4o-2024-11-20',
        name: 'GPT-4o 2024-11-20',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasImageInput,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    {
        id: 'gpt4o-chatgpt',
        internalID: 'chatgpt-4o-latest',
        name: 'GPT-4o ChatGPT',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasImageInput,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming,
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    {
        id: 'gpt4o1-preview',
        internalID: 'o1-preview',
        name: 'o1 Preview',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    {
        id: 'gpt4o1-mini',
        internalID: 'o1-mini',
        name: 'o1 Mini',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    {
        id: 'gpt41',
        internalID: 'gpt-4.1',
        name: 'GPT 4.1',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasImageInput,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasStreaming,
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    {
        id: 'o1',
        internalID: 'o1',
        name: 'o1',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasImageInput,
            LLMFlags.DeveloperRole
        ],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    {
        id: 'o3-mini',
        internalID: 'o3-mini',
        name: 'o3-mini',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasImageInput,
            LLMFlags.DeveloperRole
        ],
        parameters: ['reasoning_effort'],
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
        {
        id: 'o3',
        internalID: 'o3',
        name: 'o3',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasImageInput,
            LLMFlags.DeveloperRole
        ],
        parameters: ['reasoning_effort'],
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    {
        id: 'o4-mini',
        internalID: 'o4-mini',
        name: 'o4-mini',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasImageInput,
            LLMFlags.DeveloperRole
        ],
        parameters: ['reasoning_effort'],
        tokenizer: LLMTokenizer.tiktokenO200Base
    },

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
        recommended: true,
        parameters: [...ClaudeParameters, 'thinking_tokens'],
        tokenizer: LLMTokenizer.Claude
    },
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
        recommended: true,
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
        recommended: true,
        parameters: [...ClaudeParameters, 'thinking_tokens'],
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
        recommended: true,
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
    {
        name: "Claude 3.7 Sonnet (20250219)",
        id: 'claude-3-7-sonnet-20250219',
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
    {
        name: 'Claude 2.1',
        id: 'anthropic.claude-v2:1',
        provider: LLMProvider.AWS,
        format: LLMFormat.AWSBedrockClaude,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasFirstSystemPrompt
        ],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
    {
        name: 'Claude 2',
        id: 'anthropic.claude-v2',
        provider: LLMProvider.AWS,
        format: LLMFormat.AWSBedrockClaude,
        flags: [
            LLMFlags.hasPrefill,
            LLMFlags.hasFirstSystemPrompt
        ],
        parameters: ClaudeParameters,
        tokenizer: LLMTokenizer.Claude
    },
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
    {
        name: "Gemini Pro 1.5 0827",
        id: 'gemini-1.5-pro-exp-0827',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt, LLMFlags.requiresAlternateRole],
        parameters:  ['temperature', 'top_k', 'top_p'],
        tokenizer: LLMTokenizer.GoogleCloud
    },
    {
        name: "Gemini Exp 1121",
        id: 'gemini-exp-1121',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt, LLMFlags.poolSupported, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'top_k', 'top_p'],
        tokenizer: LLMTokenizer.GoogleCloud,
    },
    {
        name: "Gemini Exp 1206",
        id: 'gemini-exp-1206',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt, LLMFlags.poolSupported, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'top_k', 'top_p'],
        tokenizer: LLMTokenizer.GoogleCloud
    },
    {
        name: "Gemini Flash 2.0 Exp",
        id: 'gemini-2.0-flash-exp',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.geminiBlockOff,LLMFlags.hasImageInput, LLMFlags.hasImageOutput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput,  LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
    },
    {
        name: "Gemini Pro 2.5 Exp",
        id: 'gemini-2.5-pro-exp',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.geminiBlockOff,LLMFlags.hasImageInput, LLMFlags.hasImageOutput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput,  LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
    },
    {
        name: "Gemini Pro 2.5 Exp (03/25)",
        id: 'gemini-2.5-pro-exp-03-25',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.geminiBlockOff,LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput,  LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking],
        parameters: ['temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
    },
    {
        name: "Gemini Pro 2.5 Preview (05/06)",
        id: 'gemini-2.5-pro-preview-05-06',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.geminiBlockOff,LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput,  LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking],
        parameters: ['temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: true
    },
        {
        name: "Gemini Pro 2.5 Preview (06/05)",
        id: 'gemini-2.5-pro-preview-06-05',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput,  LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking],
        parameters: ['temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: true
    },
    {
        name: "Gemini Pro 2.5",
        id: 'gemini-2.5-pro',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput,  LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking],
        parameters: ['temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: true
    },
    {
        name: "Gemini Flash 2.5 Preview (04/17)",
        id: 'gemini-2.5-flash-preview-04-17',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.geminiBlockOff,LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput,  LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking],
        parameters: ['temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
    },
    {
        name: "Gemini Flash 2.5 Preview (05/20)",
        id: 'gemini-2.5-flash-preview-05-20',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.geminiBlockOff,LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput,  LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking],
        parameters: ['temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: true
    },
    //     {
    //     name: "Gemini Flash 2.5 PRO TTS",
    //     id: 'gemini-2.5-pro-tts',
    //     provider: LLMProvider.GoogleCloud,
    //     format: LLMFormat.GoogleCloud,
    //     flags: [LLMFlags.geminiBlockOff,LLMFlags.hasImageInput, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput,  LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.geminiThinking, LLMFlags.hasAudioOutput],
    //     parameters: ['temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
    //     tokenizer: LLMTokenizer.GoogleCloud,
    //     recommended: true
    // },
    {
        name: "Gemini Flash 2.0 Thinking 1219",
        id: 'gemini-2.0-flash-thinking-exp-1219',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput,  LLMFlags.hasStreaming, LLMFlags.geminiThinking, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
    },
    {
        name: "Gemini Flash 2.0",
        id: 'gemini-2.0-flash',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.geminiBlockOff,LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput,  LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: true
    },
    {
        name: "Gemini Flash Lite Preview 2.0 0205",
        id: 'gemini-2.0-flash-lite-preview-02-05',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.geminiBlockOff,LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput,  LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.noCivilIntegrity],
        parameters: ['temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: true
    },
    {
        name: "Gemini Pro 2.0 Exp 0128",
        id: 'gemini-2.0-pro-exp-01-28',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.geminiBlockOff,LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput,  LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
    },
    {
        name: "Gemini Pro 2.0 Exp",
        id: 'gemini-2.0-pro-exp',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.geminiBlockOff,LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput,  LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole, LLMFlags.noCivilIntegrity],
        parameters: ['temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: true
    },
    {
        name: "Gemini Flash 2.0 Thinking 0121",
        id: 'gemini-2.0-flash-thinking-exp-01-21',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt, LLMFlags.poolSupported, LLMFlags.hasAudioInput, LLMFlags.hasVideoInput,  LLMFlags.hasStreaming, LLMFlags.geminiThinking, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'top_k', 'top_p', 'presence_penalty', 'frequency_penalty'],
        tokenizer: LLMTokenizer.GoogleCloud,
        recommended: true
    },
    {
        name: "Gemini Pro 1.5",
        id: 'gemini-1.5-pro-latest',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt,  LLMFlags.hasStreaming, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'top_k', 'top_p'],
        tokenizer: LLMTokenizer.GoogleCloud
    },
    {
        name: "Gemini Flash 1.5",
        id: 'gemini-1.5-flash',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'top_k', 'top_p'],
        tokenizer: LLMTokenizer.GoogleCloud
    },
    {
        name: "Gemini Exp 1114",
        id: 'gemini-exp-1114',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'top_k', 'top_p'],
        tokenizer: LLMTokenizer.GoogleCloud
    },
    {
        name: "Gemini Pro 1.5 002",
        id: 'gemini-1.5-pro-002',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'top_k', 'top_p'],
        tokenizer: LLMTokenizer.GoogleCloud
    },
    {
        name: "Gemini Flash 1.5 002",
        id: 'gemini-1.5-flash-002',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'top_k', 'top_p'],
        tokenizer: LLMTokenizer.GoogleCloud
    },
    {
        name: "Gemini Pro",
        id: 'gemini-pro',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'top_k', 'top_p'],
        tokenizer: LLMTokenizer.GoogleCloud
    },
    {
        name: "Gemini Pro Vision",
        id: 'gemini-pro-vision',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'top_k', 'top_p'],
        tokenizer: LLMTokenizer.GoogleCloud
    },
    {
        name: "Gemini Ultra",
        id: 'gemini-ultra',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'top_k', 'top_p'],
        tokenizer: LLMTokenizer.GoogleCloud
    },
    {
        name: "Gemini Ultra Vision",
        id: 'gemini-ultra-vision',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput, LLMFlags.hasFirstSystemPrompt, LLMFlags.hasStreaming, LLMFlags.requiresAlternateRole],
        parameters: ['temperature', 'top_k', 'top_p'],
        tokenizer: LLMTokenizer.GoogleCloud
    },
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
    {
        id: 'ollama-hosted',
        name: 'Ollama',
        provider: LLMProvider.AsIs,
        format: LLMFormat.Ollama,
        flags: [LLMFlags.hasFullSystemPrompt],
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.Unknown
    },
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
    {
        id: 'deepseek-chat',
        name: 'Deepseek Chat',
        provider: LLMProvider.DeepSeek,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.requiresAlternateRole, LLMFlags.mustStartWithUserInput, LLMFlags.hasPrefill, LLMFlags.deepSeekPrefix, LLMFlags.hasStreaming],
        parameters: ['frequency_penalty', 'presence_penalty','temperature', 'top_p'],
        tokenizer: LLMTokenizer.DeepSeek,
        endpoint: 'https://api.deepseek.com/beta/chat/completions',
        keyIdentifier: 'deepseek',
        recommended: true
    },
    {
        id: 'deepseek-reasoner',
        name: 'Deepseek Reasoner',
        provider: LLMProvider.DeepSeek,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasFirstSystemPrompt, LLMFlags.requiresAlternateRole, LLMFlags.mustStartWithUserInput, LLMFlags.hasPrefill, LLMFlags.deepSeekPrefix, LLMFlags.deepSeekThinkingInput, LLMFlags.hasStreaming],
        parameters: [],
        tokenizer: LLMTokenizer.DeepSeek,
        endpoint: 'https://api.deepseek.com/beta/chat/completions',
        keyIdentifier: 'deepseek',
        recommended: true
    },
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
    {
        id: 'custom',
        name: "Plugin",
        provider: LLMProvider.AsIs,
        format: LLMFormat.Plugin,
        flags: [LLMFlags.hasFullSystemPrompt],
        recommended: true,
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
            recommended: false,
            provider: LLMProvider.VertexAI,
            format: LLMFormat.VertexAIGemini
        })
    }
}

export function getModelInfo(id: string): LLMModel{

    const db = getDatabase()
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
    if(arg.groupedByProvider){
        let group: GetModelListGroup[] = []
        for(let model of models){
            if(model.provider === LLMProvider.AsIs){
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
        return group as any
    }
    return models as any
}

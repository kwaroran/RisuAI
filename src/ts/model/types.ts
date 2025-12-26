import type { Parameter } from "../process/request/request"

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

export const ProviderNames = new Map<LLMProvider, string>([
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

export const OpenAIParameters:Parameter[] = ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty']
export const GPT5Parameters:Parameter[] = ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty', 'reasoning_effort','verbosity']
export const ClaudeParameters:Parameter[] = ['temperature', 'top_k', 'top_p']

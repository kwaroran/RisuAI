export enum LLMFlags{
    hasImageInput,
    hasImageOutput,
    hasAudioInput,
    hasAudioOutput,
    hasPrefill,
    hasCache,
    hasFullSystemPrompt,
    hasFirstSystemPrompt,
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
    AWSBedrockClaude
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
    recommended?: boolean
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
])

export const LLMModels: LLMModel[] = [
    {
        id: 'gpt35',
        internalID: 'gpt-3.5-turbo',
        name: 'GPT-3.5',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        id: 'instructgpt35',
        internalID: "gpt-3.5-turbo-instruct",
        name: 'InstructGPT-3.5',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAILegacyInstruct,
        flags: [],
    },
    {
        id: 'gpt4_turbo',
        internalID: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        id: 'gpt4o',
        internalID: 'gpt-4o',
        name: 'GPT-4o',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasImageInput
        ],
        recommended: true
    },
    {
        id: 'gpt4om',
        internalID: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasImageInput
        ],
        recommended: true
    },
    {
        id: 'gpt4',
        internalID: 'gpt-4',
        name: 'GPT-4',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        id: 'gpt4_32k',
        internalID: 'gpt-4-32k',
        name: 'GPT-4 32k',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        id: 'gpt35_16k',
        internalID: 'gpt-3.5-turbo-16k',
        name: 'GPT-3.5 Turbo 16k',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        id: 'gpt4_0314',
        internalID: 'gpt-4-0314',
        name: 'GPT-4 0314',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        id: 'gpt4_0613',
        internalID: 'gpt-4-0613',
        name: 'GPT-4 0613',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        id: 'gpt4_32k_0613',
        internalID: 'gpt-4-32k-0613',
        name: 'GPT-4 32k 0613',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        id: 'gpt4_1106',
        internalID: 'gpt-4-1106-preview',
        name: 'GPT-4 1106',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        id: 'gpt35_0125',
        internalID: 'gpt-3.5-turbo-0125',
        name: 'GPT-3.5 Turbo 0125',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        id: 'gpt35_1106',
        internalID: 'gpt-3.5-turbo-1106',
        name: 'GPT-3.5 Turbo 1106',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        id: 'gpt35_0613',
        internalID: 'gpt-3.5-turbo-0613',
        name: 'GPT-3.5 Turbo 0613',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        id: 'gpt35_16k_0613',
        internalID: 'gpt-3.5-turbo-16k-0613',
        name: 'GPT-3.5 Turbo 16k',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        id: 'gpt35_0301',
        internalID: 'gpt-3.5-turbo-0301',
        name: 'GPT-3.5 Turbo 0301',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        id: 'gpt4_0125',
        internalID: 'gpt-4-0125-preview',
        name: 'GPT-4 0125',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        id: 'gptvi4_1106',
        internalID: 'gpt-4-vision-preview',
        name: 'GPT-4 Vision 1106',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [LLMFlags.hasImageInput],
    },
    {
        id: 'gpt4_turbo_20240409',
        internalID: 'gpt-4-turbo-2024-04-09',
        name: 'GPT-4 Turbo 2024-04-09',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        id: 'gpt4o-2024-05-13',
        internalID: 'gpt-4o-2024-05-13',
        name: 'GPT-4o 2024-05-13',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasImageInput
        ],
    },
    {
        id: 'gpt4o-2024-08-06',
        internalID: 'gpt-4o-2024-08-06',
        name: 'GPT-4o 2024-08-06',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasImageInput
        ],
    },
    {
        id: 'gpt4o-2024-11-20',
        internalID: 'gpt-4o-2024-11-20',
        name: 'GPT-4o 2024-11-20',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasImageInput
        ],
    },
    {
        id: 'gpt4o-chatgpt',
        internalID: 'chatgpt-4o-latest',
        name: 'GPT-4o ChatGPT',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasImageInput
        ],
    },
    {
        id: 'gpt4o1-preview',
        internalID: 'o1-preview',
        name: 'o1 Preview',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        id: 'gpt4o1-mini',
        internalID: 'o1-mini',
        name: 'o1 Mini',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    },
    {
        name: "Claude 3.5 Sonnet",
        id: 'claude-3-5-sonnet-latest',
        shortName: "3.5 Sonnet",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [LLMFlags.hasPrefill, LLMFlags.hasImageInput],
        recommended: true
    },
    {
        name: "Claude 3.5 Haiku",
        id: 'claude-3-5-haiku-latest',
        shortName: "3.5 Haiku",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [LLMFlags.hasPrefill, LLMFlags.hasImageInput],
        recommended: true
    },
    {
        name: 'Claude 3.5 Sonnet (20241022)',
        id: 'claude-3-5-sonnet-20241022',
        shortName: "3.5 Sonnet 1022",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [LLMFlags.hasPrefill, LLMFlags.hasImageInput],
    },
    {
        name: "Claude 3.5 Haiku (20241022)",
        id: 'claude-3-5-haiku-20241022',
        shortName: "3.5 Haiku 1022",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [LLMFlags.hasPrefill, LLMFlags.hasImageInput],
    },
    {
        name: 'Claude 3 Haiku (20240307)',
        id: 'claude-3-haiku-20240307',
        shortName: "3 Haiku 0307",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [LLMFlags.hasPrefill, LLMFlags.hasImageInput],
    },
    {
        name: 'Claude 3.5 Sonnet (20240620)',
        id: 'claude-3-5-sonnet-20240620',
        shortName: "3.5 Sonnet 0620",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [LLMFlags.hasPrefill, LLMFlags.hasImageInput],
    },
    {
        name: 'Claude 3 Opus (20240229)',
        id: 'claude-3-opus-20240229',
        shortName: "3 Opus 0229",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [LLMFlags.hasPrefill, LLMFlags.hasImageInput],
    },
    {
        name: 'Claude 3 Sonnet (20240229)',
        id: 'claude-3-sonnet-20240229',
        shortName: "3 Sonnet 0229",
        provider: LLMProvider.Anthropic,
        format: LLMFormat.Anthropic,
        flags: [LLMFlags.hasPrefill, LLMFlags.hasImageInput],
    },
    {
        name: 'Claude 2.1',
        id: 'claude-2.1',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
    },
    {
        name: 'Claude 2',
        id: 'claude-2',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
    },
    {
        name: 'Claude 2 100k',
        id: 'claude-2-100k',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
    },
    {
        name: 'Claude v1',
        id: 'claude-v1',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
    },
    {
        name: 'Claude v1 100k',
        id: 'claude-v1-100k',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
    },
    {
        name: 'Claude Instant v1',
        id: 'claude-instant-v1',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
    },
    {
        name: 'Claude Instant v1 100k',
        id: 'claude-instant-v1-100k',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
    },
    {
        name: 'Claude v1.2',
        id: 'claude-1.2',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
    },
    {
        name: 'Claude v1.0',
        id: 'claude-1.0',
        provider: LLMProvider.Anthropic,
        format: LLMFormat.AnthropicLegacy,
        flags: [LLMFlags.hasPrefill],
    },
    {
        name: 'Claude 3.5 Sonnet (20241022) v2',
        id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        provider: LLMProvider.AWS,
        format: LLMFormat.AWSBedrockClaude,
        flags: [LLMFlags.hasPrefill, LLMFlags.hasImageInput],
    },
    {
        name: 'Claude 3.5 Sonnet (20240620) v1',
        id: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
        provider: LLMProvider.AWS,
        format: LLMFormat.AWSBedrockClaude,
        flags: [LLMFlags.hasPrefill, LLMFlags.hasImageInput],
    },
    {
        name: 'Claude 3 Opus (20240229) v1',
        id: 'anthropic.claude-3-opus-20240229-v1:0',
        provider: LLMProvider.AWS,
        format: LLMFormat.AWSBedrockClaude,
        flags: [LLMFlags.hasPrefill, LLMFlags.hasImageInput],
    },
    {
        name: 'Ooba',
        id: 'ooba',
        provider: LLMProvider.AsIs,
        format: LLMFormat.Ooba,
        flags: [],
        recommended: true
    },
    {
        name: 'Mancer',
        id: 'mancer',
        provider: LLMProvider.AsIs,
        format: LLMFormat.OobaLegacy,
        flags: [],
    },
    {
        name: 'OpenRouter',
        id: 'openrouter',
        provider: LLMProvider.AsIs,
        format: LLMFormat.OpenAICompatible,
        flags: [],
        recommended: true
    },
    {
        name: 'Mistral Small Latest',
        id: 'mistral-small-latest',
        shortName: 'Mistral S',
        provider: LLMProvider.Mistral,
        format: LLMFormat.Mistral,
        flags: [],
        recommended: true
    },
    {
        name: 'Mistral Medium Latest',
        id: 'mistral-medium-latest',
        shortName: 'Mistral M',
        provider: LLMProvider.Mistral,
        format: LLMFormat.Mistral,
        flags: [],
        recommended: true
    },
    {
        name: 'Mistral Large 2411',
        id: 'mistral-large-2411',
        shortName: 'Mistral L 2411',
        provider: LLMProvider.Mistral,
        format: LLMFormat.Mistral,
        flags: [],
    },
    {
        name: 'Mistral Nemo',
        id: 'open-mistral-nemo',
        shortName: 'Mistral Nemo',
        provider: LLMProvider.Mistral,
        format: LLMFormat.Mistral,
        flags: [],
    },
    {
        name: 'Mistral Large Latest',
        id: 'mistral-large-latest',
        shortName: 'Mistral L',
        provider: LLMProvider.Mistral,
        format: LLMFormat.Mistral,
        flags: [],
        recommended: true
    },
    {
        name: "Gemini Pro 1.5 0827",
        id: 'gemini-1.5-pro-exp-0827',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput],
    },
    {
        name: "Gemini Exp 1121",
        id: 'gemini-exp-1121',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput],
        recommended: true
    },
    {
        name: "Gemini Pro 1.5",
        id: 'gemini-1.5-pro-latest',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput],
        recommended: true
    },
    {
        name: "Gemini Flash 1.5",
        id: 'gemini-1.5-flash',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput],
        recommended: true
    },
    {
        name: "Gemini Exp 1121",
        id: 'gemini-exp-1121-vertex',
        internalID: 'gemini-exp-1121',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.VertexAIGemini,
        flags: [LLMFlags.hasImageInput],
    },
    {
        name: "Gemini Pro 1.5",
        id: 'gemini-1.5-pro-latest-vertex',
        internalID: 'gemini-1.5-pro-latest',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.VertexAIGemini,
        flags: [LLMFlags.hasImageInput],
    },
    {
        name: "Gemini Flash 1.5",
        id: 'gemini-1.5-flash-vertex',
        internalID: 'gemini-1.5-flash',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.VertexAIGemini,
        flags: [LLMFlags.hasImageInput],
    },
    {
        name: "Gemini Exp 1114",
        id: 'gemini-exp-1114',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput],
    },
    {
        name: "Gemini Pro 1.5 002",
        id: 'gemini-1.5-pro-002',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput],
    },
    {
        name: "Gemini Flash 1.5 002",
        id: 'gemini-1.5-flash-002',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput],
    },
    {
        name: "Gemini Pro",
        id: 'gemini-pro',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput],
    },
    {
        name: "Gemini Pro Vision",
        id: 'gemini-pro-vision',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput],
    },
    {
        name: "Gemini Ultra",
        id: 'gemini-ultra',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput],
    },
    {
        name: "Gemini Ultra Vision",
        id: 'gemini-ultra-vision',
        provider: LLMProvider.GoogleCloud,
        format: LLMFormat.GoogleCloud,
        flags: [LLMFlags.hasImageInput],
    },
    {
        name: 'Kobold',
        id: 'kobold',
        provider: LLMProvider.AsIs,
        format: LLMFormat.Kobold,
        flags: [],
        recommended: true
    },
    {
        name: "SuperTrin",
        id: 'novellist',
        provider: LLMProvider.NovelList,
        format: LLMFormat.NovelList,
        flags: [],
    },
    {
        name: "Damsel",
        id: 'novellist_damsel',
        provider: LLMProvider.NovelList,
        format: LLMFormat.NovelList,
        flags: [],
    },
    {
        name: "Command R",
        id: 'cohere-command-r',
        internalID: 'command-r',
        provider: LLMProvider.Cohere,
        format: LLMFormat.Cohere,
        flags: [],
        recommended: true
    },
    {
        name: "Command R Plus",
        id: 'cohere-command-r-plus',
        internalID: 'command-r-plus',
        provider: LLMProvider.Cohere,
        format: LLMFormat.Cohere,
        flags: [],
        recommended: true
    },
    {
        name: "Command R 08-2024",
        id: 'cohere-command-r-08-2024',
        internalID: 'command-r-08-2024',
        provider: LLMProvider.Cohere,
        format: LLMFormat.Cohere,
        flags: [],
    },
    {
        name: "Command R 03-2024",
        id: 'cohere-command-r-03-2024',
        internalID: 'command-r-03-2024',
        provider: LLMProvider.Cohere,
        format: LLMFormat.Cohere,
        flags: [],
    },
    {
        name: "Command R Plus 08-2024",
        id: 'cohere-command-r-plus-08-2024',
        internalID: 'command-r-plus-08-2024',
        provider: LLMProvider.Cohere,
        format: LLMFormat.Cohere,
        flags: [],
    },
    {
        name: "Command R Plus 04-2024",
        id: 'cohere-command-r-plus-04-2024',
        internalID: 'command-r-plus-04-2024',
        provider: LLMProvider.Cohere,
        format: LLMFormat.Cohere,
        flags: [],
    },
    {
        name: "Clio",
        id: 'novelai',
        provider: LLMProvider.NovelAI,
        format: LLMFormat.NovelAI,
        flags: [],
        recommended: true
    },
    {
        name: "Kayra",
        id: 'novelai_kayra',
        provider: LLMProvider.NovelAI,
        format: LLMFormat.NovelAI,
        flags: [],
        recommended: true
    },
    {
        id: 'ollama-hosted',
        name: 'Ollama',
        provider: LLMProvider.AsIs,
        format: LLMFormat.Ollama,
        flags: [],
    },
    {
        id: 'hf:::Xenova/opt-350m',
        name: 'opt-350m',
        provider: LLMProvider.WebLLM,
        format: LLMFormat.WebLLM,
        flags: [],
    },
    {
        id: 'hf:::Xenova/tiny-random-mistral',
        name: 'tiny-random-mistral',
        provider: LLMProvider.WebLLM,
        format: LLMFormat.WebLLM,
        flags: [],
    },
    {
        id: 'hf:::Xenova/gpt2-large-conversational',
        name: 'gpt2-large-conversational',
        provider: LLMProvider.WebLLM,
        format: LLMFormat.WebLLM,
        flags: [],
    },
    {
        id: 'custom',
        name: "Plugin",
        provider: LLMProvider.AsIs,
        format: LLMFormat.Plugin,
        flags: [],
        recommended: true
    },
    {
        id: 'reverse_proxy',
        name: "Custom API",
        provider: LLMProvider.AsIs,
        format: LLMFormat.OpenAICompatible,
        flags: [],
        recommended: true
    }
]

for(let model of LLMModels){
    model.shortName ??= model.name
    model.internalID ??= model.id
    model.fullName ??= model.provider !== LLMProvider.AsIs ? `${ProviderNames.get(model.provider) ?? ''} ${model.name}`.trim() : model.name
}

export function getModelInfo(id: string): LLMModel{

    const found = LLMModels.find(model => model.id === id) ?? {
        id,
        name: id,
        provider: LLMProvider.AsIs,
        format: LLMFormat.OpenAICompatible,
        flags: [],
    }

    if(found) return found

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
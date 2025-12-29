import { LLMFlags, LLMFormat, LLMProvider, LLMTokenizer, OpenAIParameters, GPT5Parameters, type LLMModel } from '../types'

export const OpenAIModels: LLMModel[] = [
    // GPT-5.2 (December 2025)
    {
        id: 'gpt-5.2',
        internalID: 'gpt-5.2',
        name: 'GPT 5.2',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasImageInput,
            LLMFlags.DeveloperRole
        ],
        parameters: GPT5Parameters,
        tokenizer: LLMTokenizer.tiktokenO200Base,
        recommended: true
    },
    {
        id: 'gpt-5.2-chat-latest',
        internalID: 'gpt-5.2-chat-latest',
        name: 'GPT 5.2 Chat',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasImageInput,
            LLMFlags.DeveloperRole
        ],
        //Note: this is non-reasoning model
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base,
        recommended: true
    },
    // GPT-5.1 (November 2025)
    {
        id: 'gpt-5.1',
        internalID: 'gpt-5.1',
        name: 'GPT 5.1',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasImageInput,
            LLMFlags.DeveloperRole
        ],
        parameters: GPT5Parameters,
        tokenizer: LLMTokenizer.tiktokenO200Base,
        recommended: true
    },
    {
        id: 'gpt-5.1-chat-latest',
        internalID: 'gpt-5.1-chat-latest',
        name: 'GPT 5.1 Chat',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasImageInput,
            LLMFlags.DeveloperRole
        ],
        //Note: this is non-reasoning model
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base,
        recommended: true
    },
    // GPT-5 Series (August 2025)
    {
        id: 'gpt-5',
        internalID: 'gpt-5',
        name: 'GPT 5',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasImageInput,
            LLMFlags.DeveloperRole
        ],
        parameters: GPT5Parameters,
        tokenizer: LLMTokenizer.tiktokenO200Base,
    },
    {
        id: 'gpt-5',
        internalID: 'gpt-5-2025-08-07',
        name: 'GPT 5 (2025-08-07)',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasImageInput,
            LLMFlags.DeveloperRole
        ],
        parameters: GPT5Parameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    {
        id: 'gpt-5-mini',
        internalID: 'gpt-5-mini',
        name: 'GPT 5 Mini',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasImageInput,
            LLMFlags.DeveloperRole
        ],
        parameters: GPT5Parameters,
        tokenizer: LLMTokenizer.tiktokenO200Base,
    },
    {
        id: 'gpt-5-mini-2025-08-07',
        internalID: 'gpt-5-mini-2025-08-07',
        name: 'GPT 5 Mini (2025-08-07)',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasImageInput,
            LLMFlags.DeveloperRole
        ],
        parameters: GPT5Parameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    {
        id: 'gpt-5-nano',
        internalID: 'gpt-5-nano',
        name: 'GPT 5 Nano',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasImageInput,
            LLMFlags.DeveloperRole
        ],
        parameters: GPT5Parameters,
        tokenizer: LLMTokenizer.tiktokenO200Base,
    },
    {
        id: 'gpt-5-nano-2025-08-07',
        internalID: 'gpt-5-nano-2025-08-07',
        name: 'GPT 5 Nano (2025-08-07)',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasImageInput,
            LLMFlags.DeveloperRole
        ],
        parameters: GPT5Parameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    {
        id: 'gpt-5-chat-latest',
        internalID: 'gpt-5-chat-latest',
        name: 'GPT 5 Chat',
        provider: LLMProvider.OpenAI,
        format: LLMFormat.OpenAICompatible,
        flags: [
            LLMFlags.hasStreaming,
            LLMFlags.OAICompletionTokens,
            LLMFlags.hasFullSystemPrompt,
            LLMFlags.hasImageInput,
            LLMFlags.DeveloperRole
        ],
        //Note: this is special case
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    // o3-pro (June 10, 2025)
    {
        id: 'o3-pro',
        internalID: 'o3-pro',
        name: 'o3-pro',
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
    // o4-mini-deep-research (April 2025)
    {
        id: 'o4-mini-deep-research',
        internalID: 'o4-mini-deep-research',
        name: 'o4-mini Deep Research',
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
    // o3-deep-research (April 2025)
    {
        id: 'o3-deep-research',
        internalID: 'o3-deep-research',
        name: 'o3 Deep Research',
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
    // o4-mini (April 16, 2025)
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
    // o3 (April 16, 2025)
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
    // GPT-4.1 (April 2025)
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
        id: 'gpt41-mini',
        internalID: 'gpt-4.1-mini',
        name: 'GPT 4.1 Mini',
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
        id: 'gpt41-nano',
        internalID: 'gpt-4.1-nano',
        name: 'GPT 4.1 Nano',
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
    // o1-pro (March 2025)
    {
        id: 'o1-pro',
        internalID: 'o1-pro',
        name: 'o1-pro',
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
    // GPT-4.5 Preview (February 27, 2025)
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
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    // o3-mini (January 31, 2025)
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
    // o1 (December 2024)
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
    // GPT-4o 2024-11-20 (November 20, 2024)
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
    // o1-preview, o1-mini (September 2024)
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
    // GPT-4o 2024-08-06 (August 6, 2024)
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
    // GPT-4o Mini (July 18, 2024)
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
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
    },
    // GPT-4o (May 13, 2024)
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
        parameters: OpenAIParameters,
        tokenizer: LLMTokenizer.tiktokenO200Base
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
    // GPT-4 Turbo 2024-04-09 (April 9, 2024)
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
    // GPT-4 Turbo (April 2024)
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
    // GPT-4 0125 (January 25, 2024)
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
    // GPT-3.5 Turbo 0125 (January 25, 2024)
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
    // GPT-4 1106 (November 6, 2023)
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
    // GPT-4 Vision 1106 (November 6, 2023)
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
    // GPT-3.5 Turbo 1106 (November 6, 2023)
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
    // GPT-3.5 Turbo Instruct (September 2023)
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
    // GPT-4 0613 (June 13, 2023)
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
    // GPT-4 32k 0613 (June 13, 2023)
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
    // GPT-3.5 Turbo 0613 (June 13, 2023)
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
    // GPT-3.5 Turbo 16k 0613 (June 13, 2023)
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
    // GPT-4 32k (June 2023)
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
    // GPT-3.5 Turbo 16k (June 2023)
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
    // GPT-4 0314 (March 14, 2023)
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
    // GPT-4 (March 14, 2023)
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
    // GPT-3.5 Turbo 0301 (March 1, 2023)
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
    // GPT-3.5 Turbo (March 1, 2023)
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
]

/**
 * Bot Settings Data (Chat Bot Settings)
 * 
 * Data-driven definition of settings in BotSettings page.
 * This is the most complex settings page with 4 tabs and many provider-specific conditional settings.
 * All items are renderManually due to the complex conditional rendering based on selected model.
 */

import type { SettingItem } from './types';

/**
 * Model Tab (submenu 0) - Model selection and API keys
 */
export const botModelSettingsItems: SettingItem[] = [
    // Model Selection
    {
        id: 'bot.aiModel',
        type: 'select',
        labelKey: 'model',
        helpKey: 'model',
        bindKey: 'aiModel',
        renderManually: true,  // Uses ModelList component
        keywords: ['model', 'ai', 'llm', 'gpt', 'claude', 'gemini']
    },
    {
        id: 'bot.subModel',
        type: 'select',
        labelKey: 'submodel',
        helpKey: 'submodel',
        bindKey: 'subModel',
        renderManually: true,  // Uses ModelList component
        keywords: ['submodel', 'auxiliary', 'model']
    },
    
    // Provider-specific API Keys
    {
        id: 'bot.openAIKey',
        type: 'text',
        labelKey: 'apiKey',
        bindKey: 'openAIKey',
        renderManually: true,  // Conditional on provider
        keywords: ['openai', 'api', 'key', 'gpt']
    },
    {
        id: 'bot.claudeAPIKey',
        type: 'text',
        labelKey: 'apiKey',
        bindKey: 'claudeAPIKey',
        renderManually: true,  // Conditional on provider
        keywords: ['claude', 'anthropic', 'api', 'key']
    },
    {
        id: 'bot.google.accessToken',
        type: 'text',
        fallbackLabel: 'GoogleAI API Key',
        renderManually: true,  // Conditional on provider, nested binding
        keywords: ['google', 'gemini', 'api', 'key']
    },
    {
        id: 'bot.vertexAI',
        type: 'text',
        fallbackLabel: 'Vertex AI Settings',
        renderManually: true,  // Complex multi-field settings
        keywords: ['vertex', 'google', 'cloud', 'project', 'region']
    },
    {
        id: 'bot.mistralKey',
        type: 'text',
        labelKey: 'apiKey',
        bindKey: 'mistralKey',
        renderManually: true,
        keywords: ['mistral', 'api', 'key']
    },
    {
        id: 'bot.novelai.token',
        type: 'text',
        fallbackLabel: 'NovelAI Bearer Token',
        renderManually: true,
        keywords: ['novelai', 'token', 'bearer']
    },
    {
        id: 'bot.cohereAPIKey',
        type: 'text',
        fallbackLabel: 'Cohere API Key',
        bindKey: 'cohereAPIKey',
        renderManually: true,
        keywords: ['cohere', 'api', 'key']
    },
    {
        id: 'bot.ai21Key',
        type: 'text',
        fallbackLabel: 'AI21 API Key',
        bindKey: 'ai21Key',
        renderManually: true,
        keywords: ['ai21', 'api', 'key']
    },
    {
        id: 'bot.novellistAPI',
        type: 'text',
        fallbackLabel: 'NovelList API Key',
        bindKey: 'novellistAPI',
        renderManually: true,
        keywords: ['novellist', 'api', 'key']
    },
    
    // Reverse Proxy Settings
    {
        id: 'bot.reverseProxy',
        type: 'button',
        fallbackLabel: 'Reverse Proxy Settings',
        renderManually: true,  // URL, Key, Model, Format
        keywords: ['reverse', 'proxy', 'custom', 'api', 'url', 'format']
    },
    
    // OpenRouter Settings
    {
        id: 'bot.openrouter',
        type: 'button',
        fallbackLabel: 'OpenRouter Settings',
        renderManually: true,  // Key, Model select with search
        keywords: ['openrouter', 'key', 'model']
    },
    
    // Ollama Settings
    {
        id: 'bot.ollama',
        type: 'button',
        fallbackLabel: 'Ollama Settings',
        renderManually: true,
        keywords: ['ollama', 'local', 'url', 'model']
    },
    
    // Kobold Settings
    {
        id: 'bot.kobold',
        type: 'button',
        fallbackLabel: 'Kobold Settings',
        renderManually: true,
        keywords: ['kobold', 'url']
    },
    
    // TextGen WebUI / Ooba Settings
    {
        id: 'bot.textgenWebUI',
        type: 'button',
        fallbackLabel: 'TextGen WebUI Settings',
        renderManually: true,
        keywords: ['textgen', 'webui', 'ooba', 'oobabooga', 'url', 'stream']
    },
    
    // Horde Settings  
    {
        id: 'bot.horde',
        type: 'button',
        fallbackLabel: 'Horde Settings',
        renderManually: true,
        keywords: ['horde', 'api', 'key']
    },
    
    // Mancer Settings
    {
        id: 'bot.mancer',
        type: 'button',
        fallbackLabel: 'Mancer Settings',
        renderManually: true,
        keywords: ['mancer', 'api', 'key']
    },
    
    // Streaming options
    {
        id: 'bot.useStreaming',
        type: 'check',
        labelKey: 'streaming',
        bindKey: 'useStreaming',
        renderManually: true,  // Conditional on model flags
        keywords: ['streaming', 'response', 'stream']
    },
    {
        id: 'bot.customTokenizer',
        type: 'select',
        labelKey: 'tokenizer',
        bindKey: 'customTokenizer',
        renderManually: true,  // Conditional on model
        keywords: ['tokenizer', 'token', 'count']
    },
];

/**
 * Parameters Tab (submenu 1) - Generation parameters
 */
export const botParameterSettingsItems: SettingItem[] = [
    {
        id: 'bot.maxContext',
        type: 'number',
        labelKey: 'maxContextSize',
        bindKey: 'maxContext',
        renderManually: true,
        keywords: ['context', 'size', 'max', 'token']
    },
    {
        id: 'bot.maxResponse',
        type: 'number',
        labelKey: 'maxResponseSize',
        bindKey: 'maxResponse',
        renderManually: true,
        keywords: ['response', 'size', 'max', 'token']
    },
    {
        id: 'bot.temperature',
        type: 'slider',
        labelKey: 'temperature',
        helpKey: 'tempature',
        bindKey: 'temperature',
        renderManually: true,
        keywords: ['temperature', 'creativity', 'randomness']
    },
    {
        id: 'bot.top_p',
        type: 'slider',
        fallbackLabel: 'Top P',
        bindKey: 'top_p',
        renderManually: true,  // Conditional on model parameters
        keywords: ['top', 'p', 'nucleus', 'sampling']
    },
    {
        id: 'bot.top_k',
        type: 'slider',
        fallbackLabel: 'Top K',
        bindKey: 'top_k',
        renderManually: true,
        keywords: ['top', 'k', 'sampling']
    },
    {
        id: 'bot.min_p',
        type: 'slider',
        fallbackLabel: 'Min P',
        bindKey: 'min_p',
        renderManually: true,
        keywords: ['min', 'p', 'sampling']
    },
    {
        id: 'bot.top_a',
        type: 'slider',
        fallbackLabel: 'Top A',
        bindKey: 'top_a',
        renderManually: true,
        keywords: ['top', 'a', 'sampling']
    },
    {
        id: 'bot.repetition_penalty',
        type: 'slider',
        fallbackLabel: 'Repetition Penalty',
        bindKey: 'repetition_penalty',
        renderManually: true,
        keywords: ['repetition', 'penalty', 'repeat']
    },
    {
        id: 'bot.frequencyPenalty',
        type: 'slider',
        labelKey: 'frequencyPenalty',
        bindKey: 'frequencyPenalty',
        renderManually: true,
        keywords: ['frequency', 'penalty']
    },
    {
        id: 'bot.PresensePenalty',
        type: 'slider',
        labelKey: 'presensePenalty',
        bindKey: 'PresensePenalty',
        renderManually: true,
        keywords: ['presence', 'penalty']
    },
    {
        id: 'bot.thinkingTokens',
        type: 'slider',
        labelKey: 'thinkingTokens',
        bindKey: 'thinkingTokens',
        renderManually: true,  // Conditional on model parameters
        keywords: ['thinking', 'tokens', 'reasoning']
    },
    {
        id: 'bot.reasoningEffort',
        type: 'slider',
        fallbackLabel: 'Reasoning Effort',
        bindKey: 'reasoningEffort',
        renderManually: true,
        keywords: ['reasoning', 'effort']
    },
    {
        id: 'bot.verbosity',
        type: 'slider',
        fallbackLabel: 'Verbosity',
        bindKey: 'verbosity',
        renderManually: true,
        keywords: ['verbosity', 'length']
    },
    {
        id: 'bot.generationSeed',
        type: 'number',
        labelKey: 'seed',
        bindKey: 'generationSeed',
        renderManually: true,  // Conditional on model
        keywords: ['seed', 'random', 'deterministic']
    },
    
    // Provider-specific parameter sections
    {
        id: 'bot.oobaParameters',
        type: 'button',
        fallbackLabel: 'Ooba/TextGen Parameters',
        renderManually: true,  // Complex parameter set
        keywords: ['ooba', 'textgen', 'parameters', 'sample', 'ngram']
    },
    {
        id: 'bot.NAIsettings',
        type: 'button',
        fallbackLabel: 'NovelAI Parameters',
        renderManually: true,  // Complex parameter set
        keywords: ['novelai', 'parameters', 'mirostat', 'tailfree']
    },
    {
        id: 'bot.ainconfig',
        type: 'button',
        fallbackLabel: 'NovelList Parameters',
        renderManually: true,
        keywords: ['novellist', 'parameters']
    },
    {
        id: 'bot.seperateParameters',
        type: 'button',
        labelKey: 'seperateParameters',
        renderManually: true,  // Accordion with per-feature parameters
        keywords: ['separate', 'parameters', 'memory', 'emotion', 'translate']
    },
];

/**
 * Prompt Tab (submenu 2) - Prompts and formatting
 */
export const botPromptSettingsItems: SettingItem[] = [
    {
        id: 'bot.mainPrompt',
        type: 'textarea',
        labelKey: 'mainPrompt',
        helpKey: 'mainprompt',
        bindKey: 'mainPrompt',
        renderManually: true,  // With token count display
        keywords: ['main', 'prompt', 'system']
    },
    {
        id: 'bot.jailbreak',
        type: 'textarea',
        labelKey: 'jailbreakPrompt',
        helpKey: 'jailbreak',
        bindKey: 'jailbreak',
        renderManually: true,  // With token count display
        keywords: ['jailbreak', 'prompt', 'override']
    },
    {
        id: 'bot.globalNote',
        type: 'textarea',
        labelKey: 'globalNote',
        helpKey: 'globalNote',
        bindKey: 'globalNote',
        renderManually: true,  // With token count display
        keywords: ['global', 'note', 'context']
    },
    {
        id: 'bot.formatingOrder',
        type: 'button',
        labelKey: 'formatingOrder',
        helpKey: 'formatOrder',
        renderManually: true,  // Uses DropList component
        keywords: ['format', 'order', 'prompt', 'arrangement']
    },
    {
        id: 'bot.promptPreprocess',
        type: 'check',
        labelKey: 'promptPreprocess',
        bindKey: 'promptPreprocess',
        renderManually: true,
        keywords: ['prompt', 'preprocess', 'processing']
    },
    {
        id: 'bot.promptTemplate',
        type: 'button',
        labelKey: 'promptTemplate',
        renderManually: true,  // Uses PromptSettings component
        keywords: ['prompt', 'template', 'order', 'structure']
    },
];

/**
 * Others Tab (submenu 3) - Misc settings and accordions
 */
export const botOthersSettingsItems: SettingItem[] = [
    {
        id: 'bot.bias',
        type: 'button',
        fallbackLabel: 'Bias',
        helpKey: 'bias',
        renderManually: true,  // Dynamic table with import/export
        keywords: ['bias', 'token', 'weight', 'logit']
    },
    {
        id: 'bot.additionalParams',
        type: 'button',
        labelKey: 'additionalParams',
        helpKey: 'additionalParams',
        renderManually: true,  // Conditional dynamic table
        keywords: ['additional', 'params', 'parameters', 'custom']
    },
    {
        id: 'bot.customFlags',
        type: 'button',
        labelKey: 'customFlags',
        renderManually: true,  // Toggle button group
        keywords: ['custom', 'flags', 'capabilities', 'image', 'audio', 'prefill', 'cache']
    },
    {
        id: 'bot.moduleIntergration',
        type: 'textarea',
        labelKey: 'moduleIntergration',
        helpKey: 'moduleIntergration',
        bindKey: 'moduleIntergration',
        renderManually: true,  // Inside accordion
        keywords: ['module', 'integration', 'namespace']
    },
    {
        id: 'bot.tools',
        type: 'button',
        labelKey: 'tools',
        renderManually: true,  // Toggle checkboxes for tools
        keywords: ['tools', 'search', 'function', 'calling']
    },
    {
        id: 'bot.presetRegex',
        type: 'button',
        labelKey: 'regexScript',
        renderManually: true,  // Uses RegexList component
        keywords: ['regex', 'script', 'replace', 'pattern']
    },
    {
        id: 'bot.presetIcon',
        type: 'button',
        labelKey: 'icon',
        renderManually: true,  // Image upload
        keywords: ['icon', 'preset', 'image']
    },
    {
        id: 'bot.presets',
        type: 'button',
        labelKey: 'presets',
        renderManually: true,  // Opens preset list modal
        keywords: ['preset', 'save', 'load', 'configuration']
    },
];

/**
 * Combined export for all Bot Settings
 */
export const botSettingsItems: SettingItem[] = [
    ...botModelSettingsItems,
    ...botParameterSettingsItems,
    ...botPromptSettingsItems,
    ...botOthersSettingsItems,
];

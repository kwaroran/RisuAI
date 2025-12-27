/**
 * Advanced Settings Data
 * 
 * Data-driven definition of all settings in AdvancedSettings page.
 */

import type { SettingItem } from './types';
import { isNodeServer, isTauri } from '../globalApi.svelte';

export const advancedSettingsItems: SettingItem[] = [
    // Header
    {
        id: 'adv.header',
        type: 'header',
        labelKey: 'advancedSettings',
        options: { level: 'h2' }
    },
    {
        id: 'adv.warning',
        type: 'header',
        labelKey: 'advancedSettingsWarn',
        options: { level: 'warning' }
    },
    
    // Lorebook Settings
    {
        id: 'adv.loreBookDepth',
        type: 'number',
        labelKey: 'loreBookDepth',
        bindKey: 'loreBookDepth',
        options: { min: 0, max: 20 },
        keywords: ['lorebook', 'depth', 'world', 'info']
    },
    {
        id: 'adv.loreBookToken',
        type: 'number',
        labelKey: 'loreBookToken',
        bindKey: 'loreBookToken',
        options: { min: 0, max: 4096 },
        keywords: ['lorebook', 'token', 'limit']
    },
    {
        id: 'adv.autoContinueMinTokens',
        type: 'number',
        labelKey: 'autoContinueMinTokens',
        bindKey: 'autoContinueMinTokens',
        options: { min: 0 },
        keywords: ['auto', 'continue', 'token', 'minimum']
    },
    
    // Text Inputs
    {
        id: 'adv.additionalPrompt',
        type: 'text',
        labelKey: 'additionalPrompt',
        bindKey: 'additionalPrompt',
        options: { inputSize: 'sm' },
        keywords: ['additional', 'prompt', 'extra']
    },
    {
        id: 'adv.descriptionPrefix',
        type: 'text',
        labelKey: 'descriptionPrefix',
        bindKey: 'descriptionPrefix',
        options: { inputSize: 'sm' },
        keywords: ['description', 'prefix']
    },
    {
        id: 'adv.emotionPrompt2',
        type: 'text',
        labelKey: 'emotionPrompt',
        helpKey: 'emotionPrompt',
        bindKey: 'emotionPrompt2',
        options: { placeholder: 'Leave it blank to use default', inputSize: 'sm' },
        keywords: ['emotion', 'prompt', 'expression']
    },
    {
        id: 'adv.keiServerURL',
        type: 'text',
        fallbackLabel: 'Kei Server URL',
        bindKey: 'keiServerURL',
        options: { placeholder: 'Leave it blank to use default', inputSize: 'sm' },
        keywords: ['kei', 'server', 'url']
    },
    {
        id: 'adv.presetChain',
        type: 'text',
        labelKey: 'presetChain',
        helpKey: 'presetChain',
        bindKey: 'presetChain',
        options: { placeholder: 'Leave it blank to not use', inputSize: 'sm' },
        keywords: ['preset', 'chain']
    },
    
    // More Number Inputs
    {
        id: 'adv.requestRetrys',
        type: 'number',
        labelKey: 'requestretrys',
        helpKey: 'requestretrys',
        bindKey: 'requestRetrys',
        options: { min: 0, max: 20 },
        keywords: ['request', 'retry', 'retries']
    },
    {
        id: 'adv.genTime',
        type: 'number',
        labelKey: 'genTimes',
        helpKey: 'genTimes',
        bindKey: 'genTime',
        options: { min: 0, max: 4096 },
        keywords: ['generation', 'time', 'timeout']
    },
    {
        id: 'adv.assetMaxDifference',
        type: 'number',
        labelKey: 'assetMaxDifference',
        bindKey: 'assetMaxDifference',
        keywords: ['asset', 'difference', 'max']
    },
    
    // Select Inputs
    {
        id: 'adv.gptVisionQuality',
        type: 'select',
        fallbackLabel: 'Vision Quality',
        helpKey: 'gptVisionQuality',
        bindKey: 'gptVisionQuality',
        options: {
            selectOptions: [
                { value: 'low', label: 'Low' },
                { value: 'high', label: 'High' }
            ]
        },
        keywords: ['vision', 'quality', 'gpt', 'image']
    },
    {
        id: 'adv.heightMode',
        type: 'select',
        labelKey: 'heightMode',
        bindKey: 'heightMode',
        options: {
            selectOptions: [
                { value: 'normal', label: 'Normal' },
                { value: 'percent', label: 'Percent' },
                { value: 'vh', label: 'VH' },
                { value: 'dvh', label: 'DVH' },
                { value: 'svh', label: 'SVH' },
                { value: 'lvh', label: 'LVH' }
            ]
        },
        keywords: ['height', 'mode', 'viewport']
    },
    {
        id: 'adv.requestLocation',
        type: 'select',
        labelKey: 'requestLocation',
        bindKey: 'requestLocation',
        condition: () => !isNodeServer && !isTauri,
        options: {
            selectOptions: [
                { value: '', label: 'Default' },
                { value: 'eu', label: 'EU (GDPR)' },
                { value: 'fedramp', label: 'US (FedRAMP)' }
            ]
        },
        keywords: ['request', 'location', 'region', 'gdpr']
    },
    
    // Checkboxes - General
    {
        id: 'adv.useSayNothing',
        type: 'check',
        labelKey: 'sayNothing',
        helpKey: 'sayNothing',
        bindKey: 'useSayNothing',
        keywords: ['say', 'nothing', 'silent']
    },
    {
        id: 'adv.showUnrecommended',
        type: 'check',
        labelKey: 'showUnrecommended',
        helpKey: 'showUnrecommended',
        bindKey: 'showUnrecommended',
        keywords: ['show', 'unrecommended', 'advanced']
    },
    {
        id: 'adv.imageCompression',
        type: 'check',
        labelKey: 'imageCompression',
        helpKey: 'imageCompression',
        bindKey: 'imageCompression',
        keywords: ['image', 'compression', 'compress']
    },
    {
        id: 'adv.useExperimental',
        type: 'check',
        labelKey: 'useExperimental',
        helpKey: 'useExperimental',
        bindKey: 'useExperimental',
        keywords: ['experimental', 'beta', 'test']
    },
    {
        id: 'adv.sourcemapTranslate',
        type: 'check',
        labelKey: 'sourcemapTranslate',
        helpKey: 'sourcemapTranslate',
        bindKey: 'sourcemapTranslate',
        keywords: ['sourcemap', 'translate', 'debug']
    },
    {
        id: 'adv.forceProxyAsOpenAI',
        type: 'check',
        labelKey: 'forceProxyAsOpenAI',
        helpKey: 'forceProxyAsOpenAI',
        bindKey: 'forceProxyAsOpenAI',
        keywords: ['proxy', 'openai', 'force']
    },
    {
        id: 'adv.legacyMediaFindings',
        type: 'check',
        labelKey: 'legacyMediaFindings',
        helpKey: 'legacyMediaFindings',
        bindKey: 'legacyMediaFindings',
        keywords: ['legacy', 'media', 'findings']
    },
    {
        id: 'adv.autofillRequestUrl',
        type: 'check',
        labelKey: 'autoFillRequestURL',
        helpKey: 'autoFillRequestURL',
        bindKey: 'autofillRequestUrl',
        keywords: ['autofill', 'request', 'url']
    },
    {
        id: 'adv.autoContinueChat',
        type: 'check',
        labelKey: 'autoContinueChat',
        helpKey: 'autoContinueChat',
        bindKey: 'autoContinueChat',
        keywords: ['auto', 'continue', 'chat']
    },
    {
        id: 'adv.removeIncompleteResponse',
        type: 'check',
        labelKey: 'removeIncompleteResponse',
        bindKey: 'removeIncompleteResponse',
        keywords: ['remove', 'incomplete', 'response']
    },
    {
        id: 'adv.newOAIHandle',
        type: 'check',
        labelKey: 'newOAIHandle',
        bindKey: 'newOAIHandle',
        keywords: ['new', 'openai', 'handle']
    },
    {
        id: 'adv.noWaitForTranslate',
        type: 'check',
        labelKey: 'noWaitForTranslate',
        bindKey: 'noWaitForTranslate',
        keywords: ['no', 'wait', 'translate']
    },
    {
        id: 'adv.newImageHandlingBeta',
        type: 'check',
        labelKey: 'newImageHandlingBeta',
        bindKey: 'newImageHandlingBeta',
        keywords: ['new', 'image', 'handling', 'beta']
    },
    {
        id: 'adv.allowAllExtentionFiles',
        type: 'check',
        fallbackLabel: 'Allow all in file select',
        bindKey: 'allowAllExtentionFiles',
        keywords: ['allow', 'all', 'extension', 'files']
    },
    
    // Experimental Settings (condition: useExperimental)
    {
        id: 'adv.putUserOpen',
        type: 'check',
        labelKey: 'oaiRandomUser',
        helpKey: 'oaiRandomUser',
        bindKey: 'putUserOpen',
        condition: (db) => db.useExperimental,
        keywords: ['openai', 'random', 'user', 'experimental']
    },
    {
        id: 'adv.googleClaudeTokenizing',
        type: 'check',
        labelKey: 'googleCloudTokenization',
        helpKey: 'experimental',
        bindKey: 'googleClaudeTokenizing',
        condition: (db) => db.useExperimental,
        keywords: ['google', 'cloud', 'tokenization', 'experimental']
    },
    {
        id: 'adv.automaticCachePoint',
        type: 'check',
        labelKey: 'automaticCachePoint',
        helpKey: 'automaticCachePoint',
        bindKey: 'automaticCachePoint',
        condition: (db) => db.useExperimental,
        keywords: ['automatic', 'cache', 'point', 'experimental']
    },
    {
        id: 'adv.chatCompression',
        type: 'check',
        labelKey: 'experimentalChatCompression',
        helpKey: 'experimentalChatCompressionDesc',
        bindKey: 'chatCompression',
        condition: (db) => db.useExperimental,
        keywords: ['chat', 'compression', 'experimental']
    },
    
    // Unrecommended Settings (condition: showUnrecommended)
    {
        id: 'adv.chainOfThought',
        type: 'check',
        labelKey: 'cot',
        helpKey: 'customChainOfThought',
        bindKey: 'chainOfThought',
        condition: (db) => db.showUnrecommended,
        options: { helpUnrecommended: true },
        keywords: ['chain', 'of', 'thought', 'cot', 'unrecommended']
    },
    
    // More General Checkboxes
    {
        id: 'adv.removePunctuationHypa',
        type: 'check',
        labelKey: 'removePunctuationHypa',
        helpKey: 'removePunctuationHypa',
        bindKey: 'removePunctuationHypa',
        keywords: ['remove', 'punctuation', 'hypa']
    },
    {
        id: 'adv.enableDevTools',
        type: 'check',
        labelKey: 'enableDevTools',
        bindKey: 'enableDevTools',
        keywords: ['enable', 'dev', 'tools', 'developer']
    },
    
    // Node Server / Tauri Only
    {
        id: 'adv.promptInfoInsideChat',
        type: 'check',
        labelKey: 'promptInfoInsideChat',
        helpKey: 'promptInfoInsideChatDesc',
        bindKey: 'promptInfoInsideChat',
        condition: () => isNodeServer || isTauri,
        keywords: ['prompt', 'info', 'chat', 'node', 'tauri']
    },
    {
        id: 'adv.promptTextInfoInsideChat',
        type: 'check',
        labelKey: 'promptTextInfoInsideChat',
        bindKey: 'promptTextInfoInsideChat',
        condition: (db) => (isNodeServer || isTauri) && db.promptInfoInsideChat,
        keywords: ['prompt', 'text', 'info', 'chat']
    },
    
    // More General Checkboxes
    {
        id: 'adv.dynamicAssets',
        type: 'check',
        labelKey: 'dynamicAssets',
        helpKey: 'dynamicAssets',
        bindKey: 'dynamicAssets',
        keywords: ['dynamic', 'assets']
    },
    {
        id: 'adv.checkCorruption',
        type: 'check',
        labelKey: 'checkCorruption',
        bindKey: 'checkCorruption',
        keywords: ['check', 'corruption', 'data']
    },
    {
        id: 'adv.realmDirectOpen',
        type: 'check',
        labelKey: 'realmDirectOpen',
        helpKey: 'realmDirectOpen',
        bindKey: 'realmDirectOpen',
        keywords: ['realm', 'direct', 'open']
    },
    {
        id: 'adv.returnCSSError',
        type: 'check',
        labelKey: 'returnCSSError',
        bindKey: 'returnCSSError',
        keywords: ['return', 'css', 'error']
    },
    {
        id: 'adv.antiServerOverloads',
        type: 'check',
        labelKey: 'antiServerOverload',
        bindKey: 'antiServerOverloads',
        keywords: ['anti', 'server', 'overload']
    },
    {
        id: 'adv.claude1HourCaching',
        type: 'check',
        labelKey: 'claude1HourCaching',
        bindKey: 'claude1HourCaching',
        keywords: ['claude', 'caching', '1hour']
    },
    {
        id: 'adv.claudeBatching',
        type: 'check',
        labelKey: 'claudeBatching',
        helpKey: 'experimental',
        bindKey: 'claudeBatching',
        keywords: ['claude', 'batching', 'experimental']
    },
    {
        id: 'adv.personaNote',
        type: 'check',
        labelKey: 'personaNote',
        helpKey: 'experimental',
        bindKey: 'personaNote',
        keywords: ['persona', 'note', 'experimental']
    },
    {
        id: 'adv.rememberToolUsage',
        type: 'check',
        labelKey: 'rememberToolUsage',
        bindKey: 'rememberToolUsage',
        keywords: ['remember', 'tool', 'usage']
    },
    {
        id: 'adv.simplifiedToolUse',
        type: 'check',
        labelKey: 'simplifiedToolUse',
        bindKey: 'simplifiedToolUse',
        keywords: ['simplified', 'tool', 'use']
    },
    {
        id: 'adv.useTokenizerCaching',
        type: 'check',
        labelKey: 'useTokenizerCaching',
        bindKey: 'useTokenizerCaching',
        keywords: ['tokenizer', 'caching']
    },
    
    // More Experimental (condition: useExperimental)
    {
        id: 'adv.useExperimentalGoogleTranslator',
        type: 'check',
        fallbackLabel: 'New Google Translate Experimental',
        helpKey: 'unrecommended',
        bindKey: 'useExperimentalGoogleTranslator',
        condition: (db) => db.useExperimental,
        options: { helpUnrecommended: true },
        keywords: ['google', 'translate', 'experimental']
    },
    {
        id: 'adv.claudeRetrivalCaching',
        type: 'check',
        labelKey: 'claudeCachingRetrival',
        helpKey: 'unrecommended',
        bindKey: 'claudeRetrivalCaching',
        condition: (db) => db.useExperimental,
        options: { helpUnrecommended: true },
        keywords: ['claude', 'retrieval', 'caching', 'experimental']
    },
    
    // Sync Account Only
    {
        id: 'adv.lightningRealmImport',
        type: 'check',
        fallbackLabel: 'Lightning Realm Import',
        helpKey: 'experimental',
        bindKey: 'lightningRealmImport',
        condition: (db) => !!db?.account?.useSync,
        keywords: ['lightning', 'realm', 'import', 'sync']
    },
    
    // Dynamic Assets Dependent
    {
        id: 'adv.dynamicAssetsEditDisplay',
        type: 'check',
        labelKey: 'dynamicAssetsEditDisplay',
        helpKey: 'dynamicAssetsEditDisplay',
        bindKey: 'dynamicAssetsEditDisplay',
        condition: (db) => db.dynamicAssets,
        keywords: ['dynamic', 'assets', 'edit', 'display']
    },
    
    // More Unrecommended (condition: showUnrecommended)
    {
        id: 'adv.usePlainFetch',
        type: 'check',
        labelKey: 'forcePlainFetch',
        helpKey: 'forcePlainFetch',
        bindKey: 'usePlainFetch',
        condition: (db) => db.showUnrecommended,
        options: { helpUnrecommended: true },
        keywords: ['plain', 'fetch', 'force', 'unrecommended']
    },
    {
        id: 'adv.showDeprecatedTriggerV1',
        type: 'check',
        labelKey: 'showDeprecatedTriggerV1',
        helpKey: 'unrecommended',
        bindKey: 'showDeprecatedTriggerV1',
        condition: (db) => db.showUnrecommended,
        options: { helpUnrecommended: true },
        keywords: ['deprecated', 'trigger', 'v1', 'unrecommended']
    },
];

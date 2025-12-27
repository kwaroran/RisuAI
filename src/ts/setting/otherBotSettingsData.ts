/**
 * Other Bot Settings Data
 * 
 * Data-driven definition of settings in OtherBotSettings page.
 * Note: Complex sections like Image Generation and Long Term Memory
 * are kept in the Svelte file due to their complexity.
 */

import type { SettingItem } from './types';

/**
 * TTS Settings
 */
export const ttsSettingsItems: SettingItem[] = [
    {
        id: 'other.ttsAutoSpeech',
        type: 'checkBlock',
        fallbackLabel: 'Auto Speech',
        bindKey: 'ttsAutoSpeech',
        keywords: ['tts', 'auto', 'speech']
    },
    {
        id: 'other.elevenLabKey',
        type: 'text',
        fallbackLabel: 'ElevenLabs API key',
        bindKey: 'elevenLabKey',
        options: { inputSize: 'sm' },
        keywords: ['elevenlabs', 'api', 'key', 'tts']
    },
    {
        id: 'other.voicevoxUrl',
        type: 'text',
        fallbackLabel: 'VOICEVOX URL',
        bindKey: 'voicevoxUrl',
        options: { inputSize: 'sm' },
        keywords: ['voicevox', 'url', 'tts']
    },
    {
        id: 'other.openAIKeyTTS',
        type: 'text',
        fallbackLabel: 'OpenAI Key',
        bindKey: 'openAIKey',
        options: { inputSize: 'sm' },
        keywords: ['openai', 'key', 'tts']
    },
    {
        id: 'other.NAIApiKeyTTS',
        type: 'text',
        fallbackLabel: 'NovelAI API key',
        bindKey: 'NAIApiKey',
        options: { inputSize: 'sm', placeholder: 'pst-...' },
        keywords: ['novelai', 'api', 'key', 'tts']
    },
    {
        id: 'other.huggingfaceKey',
        type: 'text',
        fallbackLabel: 'Huggingface Key',
        bindKey: 'huggingfaceKey',
        options: { inputSize: 'sm', placeholder: 'hf_...' },
        keywords: ['huggingface', 'key', 'tts']
    },
    {
        id: 'other.fishSpeechKey',
        type: 'text',
        fallbackLabel: 'fish-speech API Key',
        bindKey: 'fishSpeechKey',
        options: { inputSize: 'sm' },
        keywords: ['fish', 'speech', 'api', 'key', 'tts']
    },
];

/**
 * Emotion Image Settings
 */
export const emotionSettingsItems: SettingItem[] = [
    {
        id: 'other.emotionProcesser',
        type: 'select',
        labelKey: 'emotionMethod',
        bindKey: 'emotionProcesser',
        options: {
            selectOptions: [
                { value: 'submodel', label: 'Ax. Model' },
                { value: 'embedding', label: 'MiniLM-L6-v2' }
            ]
        },
        keywords: ['emotion', 'method', 'image']
    },
];

/**
 * Complex settings rendered manually in Svelte (registered here for future search)
 */
export const otherBotComplexSettingsItems: SettingItem[] = [
    // Long Term Memory (submenu 0)
    {
        id: 'other.memoryType',
        type: 'select',
        labelKey: 'type',
        renderManually: true,  // Complex onchange handler setting multiple DB fields
        keywords: ['memory', 'type', 'hypa', 'supa', 'hanurai']
    },
    {
        id: 'other.hypaV3Presets',
        type: 'button',
        fallbackLabel: 'HypaV3 Presets',
        renderManually: true,  // Complex dynamic preset management UI
        keywords: ['hypa', 'v3', 'preset', 'memory', 'summarization']
    },
    {
        id: 'other.embedding',
        type: 'select',
        labelKey: 'embedding',
        bindKey: 'hypaModel',
        renderManually: true,  // Conditional settings based on model
        keywords: ['embedding', 'model', 'minilm', 'nomic', 'bge', 'openai']
    },
    
    // Image Generation (submenu 3)
    {
        id: 'other.sdProvider',
        type: 'select',
        labelKey: 'provider',
        bindKey: 'sdProvider',
        renderManually: true,  // Each provider has completely different settings
        keywords: ['image', 'generation', 'sd', 'stable', 'diffusion', 'novelai', 'dalle', 'comfyui']
    },
    {
        id: 'other.webui',
        type: 'button',
        fallbackLabel: 'Stable Diffusion WebUI Settings',
        renderManually: true,  // Complex provider-specific settings
        keywords: ['webui', 'stable', 'diffusion', 'steps', 'cfg', 'sampler']
    },
    {
        id: 'other.novelaiImage',
        type: 'button',
        fallbackLabel: 'NovelAI Image Settings',
        renderManually: true,  // Complex provider-specific settings
        keywords: ['novelai', 'image', 'vibe', 'character', 'reference']
    },
    {
        id: 'other.dalle',
        type: 'button',
        fallbackLabel: 'DALL-E Settings',
        renderManually: true,  // Complex provider-specific settings
        keywords: ['dalle', 'openai', 'image']
    },
    {
        id: 'other.stability',
        type: 'button',
        fallbackLabel: 'Stability API Settings',
        renderManually: true,  // Complex provider-specific settings
        keywords: ['stability', 'api', 'image']
    },
    {
        id: 'other.fal',
        type: 'button',
        fallbackLabel: 'Fal.ai Settings',
        renderManually: true,  // Complex provider-specific settings
        keywords: ['fal', 'ai', 'image', 'flux']
    },
    {
        id: 'other.comfyui',
        type: 'button',
        fallbackLabel: 'ComfyUI Settings',
        renderManually: true,  // Complex provider-specific settings
        keywords: ['comfyui', 'workflow', 'image']
    },
    {
        id: 'other.imagen',
        type: 'button',
        fallbackLabel: 'Imagen Settings',
        renderManually: true,  // Complex provider-specific settings
        keywords: ['imagen', 'google', 'image']
    },
];

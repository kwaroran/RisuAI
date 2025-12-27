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

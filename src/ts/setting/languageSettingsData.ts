/**
 * Language Settings Data
 * 
 * Data-driven definition of settings in LanguageSettings page.
 * Note: UI Language select has a complex onChange handler with local state
 * so it's kept in the Svelte file.
 */

import type { SettingItem, SelectOption } from './types';
import { DBState } from '../stores.svelte';

/**
 * Get translator language options based on current translator type
 */
function getTranslatorLanguageOptions(): SelectOption[] {
    const baseOptions: SelectOption[] = [
        { value: '', label: 'Disabled' },
        { value: 'ko', label: 'Korean' },
        { value: 'ru', label: 'Russian' },
        { value: 'zh', label: 'Chinese' },
    ];
    
    // Google-specific options
    if (DBState.db.translatorType === 'google') {
        baseOptions.push(
            { value: 'zh-TW', label: 'Chinese (Traditional)' },
            { value: 'fa', label: 'Persian (Farsi)' }
        );
    }
    
    baseOptions.push(
        { value: 'ja', label: 'Japanese' },
        { value: 'fr', label: 'French' },
        { value: 'es', label: 'Spanish' },
        { value: 'pt', label: 'Portuguese' },
        { value: 'de', label: 'German' },
        { value: 'id', label: 'Indonesian' },
        { value: 'ms', label: 'Malaysian' },
        { value: 'uk', label: 'Ukranian' }
    );
    
    return baseOptions;
}

/**
 * Translator Language Select (dynamic options based on translatorType)
 */
export const translatorLanguageSettingItem: SettingItem = {
    id: 'lang.translator',
    type: 'select',
    labelKey: 'translatorLanguage',
    bindKey: 'translator',
    options: {
        getSelectOptions: getTranslatorLanguageOptions
    },
    keywords: ['translator', 'language', 'translate']
};

/**
 * UI Language setting (rendered manually due to complex onChange handler)
 * Registered here for search functionality
 */
export const uiLanguageSettingItem: SettingItem = {
    id: 'lang.language',
    type: 'select',
    labelKey: 'UiLanguage',
    bindKey: 'language',
    renderManually: true,  // Complex onChange with alert dialogs
    options: {
        selectOptions: [
            { value: 'de', label: 'Deutsch' },
            { value: 'en', label: 'English' },
            { value: 'ko', label: '한국어' },
            { value: 'cn', label: '中文' },
            { value: 'zh-Hant', label: '中文(繁體)' },
            { value: 'vi', label: 'Tiếng Việt' },
            { value: 'translang', label: '[Translate in your own language]' }
        ]
    },
    keywords: ['ui', 'language', 'locale', 'interface']
};

/**
 * UI Language options (exported for use in Svelte)
 */
export const uiLanguageOptions: SelectOption[] = [
    { value: 'de', label: 'Deutsch' },
    { value: 'en', label: 'English' },
    { value: 'ko', label: '한국어' },
    { value: 'cn', label: '中文' },
    { value: 'zh-Hant', label: '中文(繁體)' },
    { value: 'vi', label: 'Tiếng Việt' },
    { value: 'translang', label: '[Translate in your own language]' }
];

/**
 * DeepL-specific settings (shown when translatorType === 'deepl')
 */
export const deeplSettingsItems: SettingItem[] = [
    {
        id: 'lang.deeplKey',
        type: 'text',
        labelKey: 'deeplKey',
        nestedBindKey: 'deeplOptions.key',
        keywords: ['deepl', 'key', 'api']
    },
    {
        id: 'lang.deeplFreeApi',
        type: 'check',
        labelKey: 'deeplFreeKey',
        nestedBindKey: 'deeplOptions.freeApi',
        keywords: ['deepl', 'free', 'api']
    },
];

/**
 * DeepL X-specific settings (shown when translatorType === 'deeplX')
 */
export const deeplXSettingsItems: SettingItem[] = [
    {
        id: 'lang.deeplXUrl',
        type: 'text',
        labelKey: 'deeplXUrl',
        nestedBindKey: 'deeplXOptions.url',
        keywords: ['deepl', 'x', 'url']
    },
    {
        id: 'lang.deeplXToken',
        type: 'text',
        labelKey: 'deeplXToken',
        nestedBindKey: 'deeplXOptions.token',
        keywords: ['deepl', 'x', 'token']
    },
];

/**
 * LLM translator settings (shown when translatorType === 'llm')
 */
export const llmTranslatorSettingsItems: SettingItem[] = [
    {
        id: 'lang.translatorMaxResponse',
        type: 'number',
        labelKey: 'translationResponseSize',
        bindKey: 'translatorMaxResponse',
        options: { min: 0, max: 2048 },
        keywords: ['translation', 'response', 'size', 'max']
    },
    {
        id: 'lang.translatorPrompt',
        type: 'textarea',
        labelKey: 'translatorPrompt',
        helpKey: 'translatorPrompt',
        bindKey: 'translatorPrompt',
        options: { 
            placeholder: 'You are a translator. translate the following html or text into {{slot}}. do not output anything other than the translation.'
        },
        keywords: ['translator', 'prompt']
    },
];

/**
 * Bergamot-specific settings (shown when translatorType === 'bergamot')
 */
export const bergamotSettingsItems: SettingItem[] = [
    {
        id: 'lang.htmlTranslation',
        type: 'check',
        labelKey: 'htmlTranslation',
        bindKey: 'htmlTranslation',
        keywords: ['html', 'translation', 'bergamot', 'firefox']
    },
];

/**
 * Common translator settings (shown when translator is enabled)
 */
export const commonTranslatorSettingsItems: SettingItem[] = [
    {
        id: 'lang.autoTranslate',
        type: 'check',
        labelKey: 'autoTranslation',
        bindKey: 'autoTranslate',
        keywords: ['auto', 'translate', 'automatic']
    },
    {
        id: 'lang.combineTranslation',
        type: 'check',
        labelKey: 'combineTranslation',
        helpKey: 'combineTranslation',
        bindKey: 'combineTranslation',
        keywords: ['combine', 'translation']
    },
    {
        id: 'lang.legacyTranslation',
        type: 'check',
        labelKey: 'legacyTranslation',
        helpKey: 'legacyTranslation',
        bindKey: 'legacyTranslation',
        keywords: ['legacy', 'translation']
    },
];

/**
 * LLM-only translator settings (additional checkboxes for LLM mode)
 */
export const llmOnlySettingsItems: SettingItem[] = [
    {
        id: 'lang.translateBeforeHTMLFormatting',
        type: 'check',
        labelKey: 'translateBeforeHTMLFormatting',
        helpKey: 'translateBeforeHTMLFormatting',
        bindKey: 'translateBeforeHTMLFormatting',
        keywords: ['translate', 'before', 'html', 'formatting']
    },
    {
        id: 'lang.autoTranslateCachedOnly',
        type: 'check',
        labelKey: 'autoTranslateCachedOnly',
        helpKey: 'autoTranslateCachedOnly',
        bindKey: 'autoTranslateCachedOnly',
        keywords: ['auto', 'translate', 'cached', 'only']
    },
];

/**
 * Translator Type Select
 */
export const translatorTypeSettingItem: SettingItem = {
    id: 'lang.translatorType',
    type: 'select',
    labelKey: 'translatorType',
    bindKey: 'translatorType',
    options: {
        selectOptions: [
            { value: 'google', label: 'Google' },
            { value: 'deepl', label: 'DeepL' },
            { value: 'llm', label: 'Ax. Model' },
            { value: 'deeplX', label: 'DeepL X' },
            { value: 'bergamot', label: 'Firefox' }
        ]
    },
    keywords: ['translator', 'type', 'google', 'deepl', 'llm']
};

/**
 * Google Source Language Select
 */
export const googleSourceLanguageSettingItem: SettingItem = {
    id: 'lang.translatorInputLanguage',
    type: 'select',
    labelKey: 'sourceLanguage',
    bindKey: 'translatorInputLanguage',
    options: {
        selectOptions: [
            { value: 'auto', label: 'Auto' },
            { value: 'en', label: 'English' },
            { value: 'zh', label: 'Chinese' },
            { value: 'ja', label: 'Japanese' },
            { value: 'ko', label: 'Korean' },
            { value: 'fr', label: 'French' },
            { value: 'es', label: 'Spanish' },
            { value: 'de', label: 'German' },
            { value: 'ru', label: 'Russian' }
        ]
    },
    keywords: ['source', 'language', 'input', 'google', 'translate']
};


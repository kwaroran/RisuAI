/**
 * Language Settings Data
 * 
 * Data-driven definition of settings in LanguageSettings page.
 * Note: Complex select inputs with dynamic options and onChange handlers
 * are kept in the Svelte file for maintainability.
 */

import type { SettingItem } from './types';
import { isTauri } from '../globalApi.svelte';

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

/**
 * Bot Settings - Parameters Tab Data
 * 
 * Data-driven definition for BotSettings Parameters tab (submenu === 1).
 * Contains standard parameter settings like context size, temperature, etc.
 */

import type { SettingItem } from './types';

/**
 * Basic parameter settings that are always visible
 */
export const basicParameterItems: SettingItem[] = [
    {
        id: 'params.maxContext',
        type: 'number',
        labelKey: 'maxContextSize',
        bindKey: 'maxContext',
        options: { min: 0 },
        keywords: ['context', 'size', 'token', 'limit'],
    },
    {
        id: 'params.maxResponse',
        type: 'number',
        labelKey: 'maxResponseSize',
        bindKey: 'maxResponse',
        options: { min: 0, max: 2048 },
        keywords: ['response', 'size', 'output', 'length'],
    },
];

/**
 * Seed setting - only for certain models
 */
export const seedSetting: SettingItem = {
    id: 'params.seed',
    type: 'number',
    labelKey: 'seed',
    bindKey: 'generationSeed',
    condition: (ctx) => 
        ctx.db.aiModel.startsWith('gpt') || 
        ctx.db.aiModel === 'reverse_proxy' || 
        ctx.db.aiModel === 'openrouter',
    keywords: ['seed', 'random', 'deterministic'],
};

/**
 * Temperature and common sampling parameters
 */
export const samplingParameterItems: SettingItem[] = [
    {
        id: 'params.temperature',
        type: 'slider',
        labelKey: 'temperature',
        helpKey: 'tempature',
        bindKey: 'temperature',
        options: {
            min: 0,
            max: 200,
            multiple: 0.01,
            fixed: 2,
            disableable: true,
        },
        keywords: ['temperature', 'creativity', 'randomness'],
    },
];

/**
 * OpenAI-style penalty parameters
 * These are conditionally shown based on modelInfo.parameters
 */
export const penaltyParameterItems: SettingItem[] = [
    {
        id: 'params.frequencyPenalty',
        type: 'slider',
        labelKey: 'frequencyPenalty',
        bindKey: 'frequencyPenalty',
        condition: (ctx) => ctx.modelInfo.parameters.includes('frequency_penalty'),
        options: {
            min: 0,
            max: 200,
            multiple: 0.01,
            fixed: 2,
            disableable: true,
        },
        keywords: ['frequency', 'penalty', 'repetition'],
    },
    {
        id: 'params.presencePenalty',
        type: 'slider',
        labelKey: 'presensePenalty',
        bindKey: 'PresensePenalty',
        condition: (ctx) => ctx.modelInfo.parameters.includes('presence_penalty'),
        options: {
            min: 0,
            max: 200,
            multiple: 0.01,
            fixed: 2,
            disableable: true,
        },
        keywords: ['presence', 'penalty'],
    },
    {
        id: 'params.topP',
        type: 'slider',
        fallbackLabel: 'Top P',
        bindKey: 'top_p',
        condition: (ctx) => ctx.modelInfo.parameters.includes('top_p'),
        options: {
            min: 0,
            max: 1,
            step: 0.01,
            fixed: 2,
            disableable: true,
        },
        keywords: ['top', 'p', 'nucleus', 'sampling'],
    },
];

/**
 * Model-specific parameters that depend on modelInfo.parameters
 */
export const modelSpecificParameterItems: SettingItem[] = [
    {
        id: 'params.thinkingTokens',
        type: 'slider',
        labelKey: 'thinkingTokens',
        bindKey: 'thinkingTokens',
        condition: (ctx) => ctx.modelInfo.parameters.includes('thinking_tokens'),
        options: {
            min: -1,
            max: 64000,
            step: 200,
            disableable: true,
        },
        keywords: ['thinking', 'tokens', 'reasoning'],
    },
    {
        id: 'params.topK',
        type: 'slider',
        fallbackLabel: 'Top K',
        bindKey: 'top_k',
        condition: (ctx) => ctx.modelInfo.parameters.includes('top_k'),
        options: {
            min: 0,
            max: 100,
            step: 1,
            disableable: true,
        },
        keywords: ['top', 'k', 'sampling'],
    },
    {
        id: 'params.minP',
        type: 'slider',
        fallbackLabel: 'Min P',
        bindKey: 'min_p',
        condition: (ctx) => ctx.modelInfo.parameters.includes('min_p'),
        options: {
            min: 0,
            max: 1,
            step: 0.01,
            fixed: 2,
            disableable: true,
        },
        keywords: ['min', 'p', 'sampling'],
    },
    {
        id: 'params.topA',
        type: 'slider',
        fallbackLabel: 'Top A',
        bindKey: 'top_a',
        condition: (ctx) => ctx.modelInfo.parameters.includes('top_a'),
        options: {
            min: 0,
            max: 1,
            step: 0.01,
            fixed: 2,
            disableable: true,
        },
        keywords: ['top', 'a', 'sampling'],
    },
    {
        id: 'params.repetitionPenalty',
        type: 'slider',
        fallbackLabel: 'Repetition penalty',
        bindKey: 'repetition_penalty',
        condition: (ctx) => ctx.modelInfo.parameters.includes('repetition_penalty'),
        options: {
            min: 0,
            max: 2,
            step: 0.01,
            fixed: 2,
            disableable: true,
        },
        keywords: ['repetition', 'penalty'],
    },
    {
        id: 'params.reasoningEffort',
        type: 'slider',
        fallbackLabel: 'Reasoning Effort',
        bindKey: 'reasoningEffort',
        condition: (ctx) => ctx.modelInfo.parameters.includes('reasoning_effort'),
        options: {
            min: -1,
            max: 2,
            step: 1,
            fixed: 0,
            disableable: true,
        },
        keywords: ['reasoning', 'effort'],
    },
    {
        id: 'params.verbosity',
        type: 'slider',
        fallbackLabel: 'Verbosity',
        bindKey: 'verbosity',
        condition: (ctx) => ctx.modelInfo.parameters.includes('verbosity'),
        options: {
            min: 0,
            max: 2,
            step: 1,
            fixed: 0,
            disableable: true,
        },
        keywords: ['verbosity', 'length'],
    },
];

/**
 * All basic parameter items combined for Parameters tab
 * Order: maxContext, maxResponse, seed, thinkingTokens, temperature, topK, minP, topA, repetitionPenalty, reasoningEffort, verbosity, topP, frequencyPenalty, presencePenalty
 */
export const allBasicParameterItems: SettingItem[] = [
    // Basic settings (always shown)
    ...basicParameterItems,
    seedSetting,
    
    // Model-specific sampling parameters (in user-specified order)
    modelSpecificParameterItems.find(i => i.id === 'params.thinkingTokens')!,
    ...samplingParameterItems, // temperature
    modelSpecificParameterItems.find(i => i.id === 'params.topK')!,
    modelSpecificParameterItems.find(i => i.id === 'params.minP')!,
    modelSpecificParameterItems.find(i => i.id === 'params.topA')!,
    modelSpecificParameterItems.find(i => i.id === 'params.repetitionPenalty')!,
    modelSpecificParameterItems.find(i => i.id === 'params.reasoningEffort')!,
    modelSpecificParameterItems.find(i => i.id === 'params.verbosity')!,
    penaltyParameterItems.find(i => i.id === 'params.topP')!,
    penaltyParameterItems.find(i => i.id === 'params.frequencyPenalty')!,
    penaltyParameterItems.find(i => i.id === 'params.presencePenalty')!,
];

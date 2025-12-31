/**
 * Chat Format Settings Data
 * 
 * Data-driven definition for ChatFormatSettings page.
 */

import type { SettingItem } from './types';

export const chatFormatSettingsItems: SettingItem[] = [
    {
        id: 'chatFormat.template',
        type: 'select',
        labelKey: 'chatFormating',
        bindKey: 'instructChatTemplate',
        options: {
            selectOptions: [
                { value: 'chatml', label: 'ChatML' },
                { value: 'llama3', label: 'Llama3' },
                { value: 'gpt2', label: 'GPT2' },
                { value: 'gemma', label: 'Gemma' },
                { value: 'mistral', label: 'Mistral' },
                { value: 'llama2', label: 'Llama2' },
                { value: 'vicuna', label: 'Vicuna' },
                { value: 'alpaca', label: 'Alpaca' },
                { value: 'jinja', label: 'Custom (Jinja)' },
            ],
        },
        keywords: ['chat', 'format', 'template', 'chatml', 'llama', 'jinja'],
    },
    {
        id: 'chatFormat.jinjaTemplate',
        type: 'textarea',
        fallbackLabel: 'Jinja Template',
        bindKey: 'JinjaTemplate',
        condition: (ctx) => ctx.db.instructChatTemplate === 'jinja',
        keywords: ['jinja', 'template', 'custom'],
    },
];

import type { SettingItem } from './types';

export const personaSettingsItems: SettingItem[] = [
    {
        id: 'persona.list',
        type: 'button',
        labelKey: 'persona',
        renderManually: true,
        keywords: ['persona', 'user', 'character', 'icon', 'profile']
    },
    {
        id: 'persona.name',
        type: 'text',
        labelKey: 'name',
        renderManually: true,
        keywords: ['persona', 'name', 'username']
    },
    {
        id: 'persona.note',
        type: 'text',
        labelKey: 'note',
        renderManually: true,
        keywords: ['persona', 'note', 'memo']
    },
    {
        id: 'persona.personaPrompt',
        type: 'textarea',
        labelKey: 'personaPrompt',
        renderManually: true,
        keywords: ['persona', 'prompt', 'description']
    },
    {
        id: 'persona.largePortrait',
        type: 'check',
        labelKey: 'largePortrait',
        renderManually: true,
        keywords: ['persona', 'portrait', 'large', 'image']
    },
    {
        id: 'persona.customBackground',
        type: 'check',
        fallbackLabel: 'Use Custom Background for Persona',
        renderManually: true,
        keywords: ['persona', 'background', 'custom', 'image']
    },
];


/**
 * Persona Settings Data
 * 
 * Data-driven definition of settings in PersonaSettings page.
 * All items are renderManually as the entire page is a complex dynamic UI.
 */

import type { SettingItem } from './types';

/**
 * Persona settings - all rendered manually due to complex sortable/dynamic UI
 */
export const personaSettingsItems: SettingItem[] = [
    {
        id: 'persona.list',
        type: 'button',
        labelKey: 'persona',
        renderManually: true,  // Complex sortable grid with persona icons
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
        renderManually: true,  // Has Help tooltip
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
        renderManually: true,  // Complex file selector
        keywords: ['persona', 'background', 'custom', 'image']
    },
];

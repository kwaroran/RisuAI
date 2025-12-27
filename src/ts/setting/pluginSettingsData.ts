import type { SettingItem } from './types';

export const pluginSettingsItems: SettingItem[] = [
    {
        id: 'plugin.list',
        type: 'button',
        labelKey: 'plugin',
        renderManually: true,
        keywords: ['plugin', 'list', 'extension', 'addon']
    },
    {
        id: 'plugin.import',
        type: 'button',
        fallbackLabel: 'Import Plugin',
        renderManually: true,
        keywords: ['plugin', 'import', 'upload', 'install']
    },
    {
        id: 'plugin.create',
        type: 'button',
        fallbackLabel: 'Create Blank Plugin',
        renderManually: true,
        keywords: ['plugin', 'create', 'new', 'develop']
    },
    {
        id: 'plugin.update',
        type: 'button',
        fallbackLabel: 'Update Plugin',
        renderManually: true,
        keywords: ['plugin', 'update', 'upgrade']
    },
    {
        id: 'plugin.arguments',
        type: 'button',
        fallbackLabel: 'Plugin Arguments',
        renderManually: true,
        keywords: ['plugin', 'arguments', 'parameters', 'config', 'settings']
    },
];


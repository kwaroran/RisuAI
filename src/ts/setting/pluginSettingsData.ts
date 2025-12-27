/**
 * Plugin Settings Data
 * 
 * Data-driven definition of settings in PluginSettings page.
 * All items are renderManually as the entire page is a complex dynamic UI.
 */

import type { SettingItem } from './types';

/**
 * Plugin settings - all rendered manually due to complex dynamic plugin list
 */
export const pluginSettingsItems: SettingItem[] = [
    {
        id: 'plugin.list',
        type: 'button',
        labelKey: 'plugin',
        renderManually: true,  // Complex plugin list with dynamic arguments
        keywords: ['plugin', 'list', 'extension', 'addon']
    },
    {
        id: 'plugin.import',
        type: 'button',
        fallbackLabel: 'Import Plugin',
        renderManually: true,  // File import handler
        keywords: ['plugin', 'import', 'upload', 'install']
    },
    {
        id: 'plugin.create',
        type: 'button',
        fallbackLabel: 'Create Blank Plugin',
        renderManually: true,  // Plugin creation handler
        keywords: ['plugin', 'create', 'new', 'develop']
    },
    {
        id: 'plugin.update',
        type: 'button',
        fallbackLabel: 'Update Plugin',
        renderManually: true,  // Plugin update from URL
        keywords: ['plugin', 'update', 'upgrade']
    },
    {
        id: 'plugin.arguments',
        type: 'button',
        fallbackLabel: 'Plugin Arguments',
        renderManually: true,  // Dynamic plugin argument configuration
        keywords: ['plugin', 'arguments', 'parameters', 'config', 'settings']
    },
];

import type { SettingItem } from './types';

export const moduleSettingsItems: SettingItem[] = [
    {
        id: 'module.list',
        type: 'button',
        labelKey: 'modules',
        renderManually: true,
        keywords: ['module', 'list', 'enable', 'disable']
    },
    {
        id: 'module.create',
        type: 'button',
        labelKey: 'createModule',
        renderManually: true,
        keywords: ['module', 'create', 'new']
    },
    {
        id: 'module.import',
        type: 'button',
        fallbackLabel: 'Import Module',
        renderManually: true,
        keywords: ['module', 'import', 'upload']
    },
    {
        id: 'module.mcp',
        type: 'button',
        fallbackLabel: 'Import MCP Module',
        renderManually: true,
        keywords: ['module', 'mcp', 'import']
    },
    {
        id: 'module.edit',
        type: 'button',
        labelKey: 'editModule',
        renderManually: true,
        keywords: ['module', 'edit', 'modify']
    },
    {
        id: 'module.lorebook',
        type: 'button',
        fallbackLabel: 'Module Lorebook',
        renderManually: true,
        keywords: ['module', 'lorebook', 'lore', 'world']
    },
    {
        id: 'module.regex',
        type: 'button',
        fallbackLabel: 'Module Regex Scripts',
        renderManually: true,
        keywords: ['module', 'regex', 'script']
    },
    {
        id: 'module.trigger',
        type: 'button',
        fallbackLabel: 'Module Trigger Scripts',
        renderManually: true,
        keywords: ['module', 'trigger', 'script', 'automation']
    },
];


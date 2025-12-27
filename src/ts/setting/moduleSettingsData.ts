/**
 * Module Settings Data
 * 
 * Data-driven definition of settings in ModuleSettings page.
 * All items are renderManually as the entire page is a complex dynamic UI.
 */

import type { SettingItem } from './types';

/**
 * Module settings - all rendered manually due to complex list/edit UI
 */
export const moduleSettingsItems: SettingItem[] = [
    {
        id: 'module.list',
        type: 'button',
        labelKey: 'modules',
        renderManually: true,  // Complex module list with enable/edit/delete buttons
        keywords: ['module', 'list', 'enable', 'disable']
    },
    {
        id: 'module.create',
        type: 'button',
        labelKey: 'createModule',
        renderManually: true,  // Complex module creation form
        keywords: ['module', 'create', 'new']
    },
    {
        id: 'module.import',
        type: 'button',
        fallbackLabel: 'Import Module',
        renderManually: true,  // File import handler
        keywords: ['module', 'import', 'upload']
    },
    {
        id: 'module.mcp',
        type: 'button',
        fallbackLabel: 'Import MCP Module',
        renderManually: true,  // MCP module import
        keywords: ['module', 'mcp', 'import']
    },
    {
        id: 'module.edit',
        type: 'button',
        labelKey: 'editModule',
        renderManually: true,  // Complex module edit form
        keywords: ['module', 'edit', 'modify']
    },
    {
        id: 'module.lorebook',
        type: 'button',
        fallbackLabel: 'Module Lorebook',
        renderManually: true,  // Lorebook editor integration
        keywords: ['module', 'lorebook', 'lore', 'world']
    },
    {
        id: 'module.regex',
        type: 'button',
        fallbackLabel: 'Module Regex Scripts',
        renderManually: true,  // Regex script editor
        keywords: ['module', 'regex', 'script']
    },
    {
        id: 'module.trigger',
        type: 'button',
        fallbackLabel: 'Module Trigger Scripts',
        renderManually: true,  // Trigger script editor
        keywords: ['module', 'trigger', 'script', 'automation']
    },
];

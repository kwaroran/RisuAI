/**
 * Files Settings Data (Account & File)
 * 
 * Data-driven definition of settings in FilesSettings page.
 * All items are renderManually as they involve file operations.
 */

import type { SettingItem } from './types';

/**
 * Files/Account settings - all rendered manually due to complex file handlers
 */
export const filesSettingsItems: SettingItem[] = [
    {
        id: 'files.saveBackup',
        type: 'button',
        labelKey: 'savebackup',
        renderManually: true,  // Complex backup save handler with drive integration
        keywords: ['backup', 'save', 'export', 'file', 'drive']
    },
    {
        id: 'files.loadBackup',
        type: 'button',
        labelKey: 'loadbackup',
        renderManually: true,  // Complex backup load handler with confirmation dialogs
        keywords: ['backup', 'load', 'import', 'restore', 'file', 'drive']
    },
];

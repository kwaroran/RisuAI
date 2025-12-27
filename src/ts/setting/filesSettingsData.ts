import type { SettingItem } from './types';

export const filesSettingsItems: SettingItem[] = [
    {
        id: 'files.saveBackup',
        type: 'button',
        labelKey: 'savebackup',
        renderManually: true,
        keywords: ['backup', 'save', 'export', 'file', 'drive']
    },
    {
        id: 'files.loadBackup',
        type: 'button',
        labelKey: 'loadbackup',
        renderManually: true,
        keywords: ['backup', 'load', 'import', 'restore', 'file', 'drive']
    },
];


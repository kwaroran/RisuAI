import type { SettingItem } from './types';

export const hotkeySettingsItems: SettingItem[] = [
    {
        id: 'hotkey.table',
        type: 'button',
        labelKey: 'hotkey',
        renderManually: true,
        keywords: ['hotkey', 'keyboard', 'shortcut', 'key', 'binding']
    },
    {
        id: 'hotkey.send',
        type: 'button',
        fallbackLabel: 'Send Message Hotkey',
        renderManually: true,
        keywords: ['hotkey', 'send', 'message', 'enter']
    },
    {
        id: 'hotkey.regenerate',
        type: 'button',
        fallbackLabel: 'Regenerate Hotkey',
        renderManually: true,
        keywords: ['hotkey', 'regenerate', 'retry']
    },
    {
        id: 'hotkey.continue',
        type: 'button',
        fallbackLabel: 'Continue Hotkey',
        renderManually: true,
        keywords: ['hotkey', 'continue']
    },
    {
        id: 'hotkey.newChat',
        type: 'button',
        fallbackLabel: 'New Chat Hotkey',
        renderManually: true,
        keywords: ['hotkey', 'new', 'chat']
    },
    {
        id: 'hotkey.stop',
        type: 'button',
        fallbackLabel: 'Stop Generation Hotkey',
        renderManually: true,
        keywords: ['hotkey', 'stop', 'abort', 'cancel']
    },
];


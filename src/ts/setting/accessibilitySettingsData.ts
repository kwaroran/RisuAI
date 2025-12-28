/**
 * Accessibility Settings Data
 * 
 * Data-driven definition of all settings in AccessibilitySettings page.
 */

import type { SettingItem } from './types';

export const accessibilitySettingsItems: SettingItem[] = [
    // Header
    {
        id: 'acc.header',
        type: 'header',
        labelKey: 'accessibility',
        options: { level: 'h2' }
    },
    
    // Checkboxes
    {
        id: 'acc.askRemoval',
        type: 'check',
        labelKey: 'askRemoval',
        bindKey: 'askRemoval',
        keywords: ['ask', 'removal', 'confirm', 'delete']
    },
    {
        id: 'acc.swipe',
        type: 'check',
        labelKey: 'SwipeRegenerate',
        bindKey: 'swipe',
        keywords: ['swipe', 'regenerate', 'gesture']
    },
    {
        id: 'acc.instantRemove',
        type: 'check',
        labelKey: 'instantRemove',
        bindKey: 'instantRemove',
        keywords: ['instant', 'remove', 'delete']
    },
    {
        id: 'acc.sendWithEnter',
        type: 'check',
        labelKey: 'sendWithEnter',
        bindKey: 'sendWithEnter',
        keywords: ['send', 'enter', 'keyboard', 'submit']
    },
    {
        id: 'acc.fixedChatTextarea',
        type: 'check',
        labelKey: 'fixedChatTextarea',
        bindKey: 'fixedChatTextarea',
        keywords: ['fixed', 'chat', 'textarea', 'input']
    },
    {
        id: 'acc.clickToEdit',
        type: 'check',
        labelKey: 'clickToEdit',
        bindKey: 'clickToEdit',
        keywords: ['click', 'edit', 'message']
    },
    {
        id: 'acc.botSettingAtStart',
        type: 'check',
        labelKey: 'botSettingAtStart',
        bindKey: 'botSettingAtStart',
        keywords: ['bot', 'setting', 'start', 'open']
    },
    {
        id: 'acc.toggleConfirmRecommendedPreset',
        type: 'check',
        labelKey: 'toggleConfirmRecommendedPreset',
        bindKey: 'toggleConfirmRecommendedPreset',
        keywords: ['confirm', 'recommended', 'preset']
    },
    {
        id: 'acc.showMenuChatList',
        type: 'check',
        labelKey: 'showMenuChatList',
        bindKey: 'showMenuChatList',
        keywords: ['menu', 'chat', 'list', 'show']
    },
    {
        id: 'acc.showMenuHypaMemoryModal',
        type: 'check',
        labelKey: 'showMenuHypaMemoryModal',
        bindKey: 'showMenuHypaMemoryModal',
        keywords: ['menu', 'hypa', 'memory', 'modal']
    },
    {
        id: 'acc.goCharacterOnImport',
        type: 'check',
        labelKey: 'goCharacterOnImport',
        bindKey: 'goCharacterOnImport',
        keywords: ['character', 'import', 'navigate']
    },
    {
        id: 'acc.sideMenuRerollButton',
        type: 'check',
        labelKey: 'sideMenuRerollButton',
        bindKey: 'sideMenuRerollButton',
        keywords: ['side', 'menu', 'reroll', 'button']
    },
    {
        id: 'acc.localActivationInGlobalLorebook',
        type: 'check',
        labelKey: 'localActivationInGlobalLorebook',
        bindKey: 'localActivationInGlobalLorebook',
        keywords: ['local', 'activation', 'global', 'lorebook']
    },
    {
        id: 'acc.requestInfoInsideChat',
        type: 'check',
        labelKey: 'requestInfoInsideChat',
        bindKey: 'requestInfoInsideChat',
        keywords: ['request', 'info', 'chat']
    },
    {
        id: 'acc.inlayErrorResponse',
        type: 'check',
        labelKey: 'inlayErrorResponse',
        bindKey: 'inlayErrorResponse',
        keywords: ['inlay', 'error', 'response']
    },
    {
        id: 'acc.bulkEnabling',
        type: 'check',
        labelKey: 'bulkEnabling',
        bindKey: 'bulkEnabling',
        keywords: ['bulk', 'enable', 'multiple']
    },
    {
        id: 'acc.showTranslationLoading',
        type: 'check',
        labelKey: 'showTranslationLoading',
        bindKey: 'showTranslationLoading',
        keywords: ['translation', 'loading', 'indicator']
    },
];

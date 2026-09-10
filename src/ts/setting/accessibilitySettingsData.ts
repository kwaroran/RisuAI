/**
 * Accessibility Settings Data
 * 
 * Data-driven definition of all settings in AccessibilitySettings page.
 */

import type { SettingItem } from './types';
import { language } from "src/lang";
import { isMacOS } from '../platform';

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
        id: 'acc.useLegacyMacOSCtrlHotkeys',
        type: 'check',
        labelKey: 'useLegacyMacOSCtrlHotkeys',
        bindKey: 'useLegacyMacOSCtrlHotkeys',
        helpKey: 'useLegacyMacOSCtrlHotkeys',
        condition: () => isMacOS(),
        keywords: ['macos', 'command', 'ctrl', 'control', 'hotkey', 'keyboard']
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
        id: 'acc.enableBlockPartialEdit',
        type: 'check',
        labelKey: 'enableBlockPartialEdit',
        bindKey: 'enableBlockPartialEdit',
        keywords: ['partial', 'edit', 'block', 'hover']
    },
    {
        id: 'acc.longPressToPopupEditor',
        type: 'check',
        labelKey: 'longPressToPopupEditor',
        bindKey: 'longPressToPopupEditor',
        keywords: ['long', 'press', 'popup', 'editor']
    },
    {
        id: 'acc.enableDragPartialEdit',
        type: 'check',
        labelKey: 'enableDragPartialEdit',
        bindKey: 'enableDragPartialEdit',
        keywords: ['partial', 'edit', 'drag', 'selection']
    },
    {
        id: 'acc.botSettingAtStart',
        type: 'check',
        labelKey: 'botSettingAtStart',
        bindKey: 'botSettingAtStart',
        keywords: ['bot', 'setting', 'start', 'open']
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
    {
        id: 'acc.autoScrollToNewMessage',
        type: 'check',
        labelKey: 'autoScrollToNewMessage',
        bindKey: 'autoScrollToNewMessage',
        keywords: ['auto', 'scroll', 'new', 'message']
    },
    {
        id: 'acc.alwaysScrollToNewMessage',
        type: 'check',
        labelKey: 'alwaysScrollToNewMessage',
        bindKey: 'alwaysScrollToNewMessage',
        condition: (ctx) => ctx.db.autoScrollToNewMessage,
        keywords: ['always', 'scroll', 'new', 'message']
    },
    {
        id: 'acc.newMessageButtonStyle',
        type: 'select',
        labelKey: 'newMessageButtonStyle',
        bindKey: 'newMessageButtonStyle',
        condition: (ctx) => ctx.db.autoScrollToNewMessage && !ctx.db.alwaysScrollToNewMessage,
        options: {
            selectOptions: [
                { value: 'bottom-center', label: language.newMessageButtonBottomCenter },
                { value: 'bottom-right', label: language.newMessageButtonBottomRight },
                { value: 'bottom-left', label: language.newMessageButtonBottomLeft },
                { value: 'floating-circle', label: language.newMessageButtonFloatingCircle },
                { value: 'right-center', label: language.newMessageButtonRightCenter },
                { value: 'top-bar', label: language.newMessageButtonTopBar }
            ]
        }
    },
    {
        id: 'acc.createFolderOnBranch',
        type: 'check',
        labelKey: 'createFolderOnBranch',
        bindKey: 'createFolderOnBranch',
        keywords: ['create', 'folder', 'branch'],
    },
    {
        id: 'acc.hamburgerButtonBottom',
        type: 'check',
        labelKey: 'hamburgerButtonBottom',
        bindKey: 'hamburgerButtonBottom',
        keywords: ['hamburger', 'button', 'bottom', 'menu', 'sidebar', 'accessibility'],
    },
    {
        id: 'acc.moveInsteadOfCopyOnCMPConvert',
        type: 'check',
        labelKey: 'moveInsteadOfCopyOnCMPConvert',
        bindKey: 'moveInsteadOfCopyOnCMPConvert',
        keywords: ['move', 'instead', 'of', 'copy', 'on', 'CMP', 'convert'],
    },
    {
        id: 'acc.applyAdditionalParamsToAll',
        type: 'check',
        labelKey: 'applyAdditionalParamsToAll',
        bindKey: 'applyAdditionalParamsToAll',
        keywords: ['apply', 'additional', 'parameters', 'to', 'all', 'models'],
    },
    {
        id: 'acc.enableRisuaiProTools',
        type: 'check',
        labelKey: 'enableRisuaiProTools',
        bindKey: 'enableRisuaiProTools',
        keywords: ['pro', 'tools', 'accessibility'],
    },
    { type: 'custom', id: 'acc.customSidebarConfig', componentId: 'CustomSidebarConfig' },

];

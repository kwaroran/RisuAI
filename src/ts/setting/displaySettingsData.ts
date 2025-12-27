/**
 * Display Settings Data
 * 
 * Data-driven definition of settings in DisplaySettings page.
 * Note: Complex settings with custom handlers are defined here for search
 * but may still be rendered manually in Svelte for special UI needs.
 */

import type { SettingItem } from './types';
import { updateAnimationSpeed } from '../gui/animation';
import { updateGuisize } from '../gui/guisize';
import { changeFullscreen } from '../util';

/**
 * Size and Speed Settings (submenu 1)
 */
export const sizeSpeedSettingsItems: SettingItem[] = [
    {
        id: 'display.zoomsize',
        type: 'slider',
        labelKey: 'UISize',
        bindKey: 'zoomsize',
        options: { min: 50, max: 200 },
        keywords: ['ui', 'size', 'zoom']
    },
    {
        id: 'display.lineHeight',
        type: 'slider',
        labelKey: 'lineHeight',
        bindKey: 'lineHeight',
        options: { min: 0.5, max: 3, step: 0.05, fixed: 2 },
        keywords: ['line', 'height']
    },
    {
        id: 'display.iconsize',
        type: 'slider',
        labelKey: 'iconSize',
        bindKey: 'iconsize',
        options: { min: 50, max: 200 },
        keywords: ['icon', 'size']
    },
    {
        id: 'display.animationSpeed',
        type: 'slider',
        labelKey: 'animationSpeed',
        bindKey: 'animationSpeed',
        options: { min: 0, max: 1, step: 0.05, fixed: 2, onChange: updateAnimationSpeed },
        keywords: ['animation', 'speed']
    },
];

/**
 * Size settings that need custom text display (kept in Svelte)
 * Listed here for search functionality
 */
export const sizeSettingsWithCustomText: SettingItem[] = [
    {
        id: 'display.textAreaSize',
        type: 'slider',
        labelKey: 'textAreaSize',
        bindKey: 'textAreaSize',
        keywords: ['text', 'area', 'size']
    },
    {
        id: 'display.textAreaTextSize',
        type: 'slider',
        labelKey: 'textAreaTextSize',
        bindKey: 'textAreaTextSize',
        keywords: ['text', 'area', 'font', 'size']
    },
    {
        id: 'display.sideBarSize',
        type: 'slider',
        labelKey: 'sideBarSize',
        bindKey: 'sideBarSize',
        keywords: ['sidebar', 'size']
    },
    {
        id: 'display.assetWidth',
        type: 'slider',
        labelKey: 'assetWidth',
        bindKey: 'assetWidth',
        keywords: ['asset', 'width']
    },
    {
        id: 'display.memoryLimitThickness',
        type: 'slider',
        labelKey: 'memoryLimitThickness',
        bindKey: 'memoryLimitThickness',
        keywords: ['memory', 'limit', 'thickness']
    },
];

/**
 * Others Settings - Simple Checkboxes (submenu 2)
 */
export const displayOthersCheckboxItems: SettingItem[] = [
    {
        id: 'display.fullScreen',
        type: 'check',
        labelKey: 'fullscreen',
        bindKey: 'fullScreen',
        options: { onChange: changeFullscreen },
        keywords: ['fullscreen']
    },
    {
        id: 'display.showMemoryLimit',
        type: 'check',
        labelKey: 'showMemoryLimit',
        bindKey: 'showMemoryLimit',
        keywords: ['memory', 'limit', 'show']
    },
    {
        id: 'display.showFirstMessagePages',
        type: 'check',
        labelKey: 'showFirstMessagePages',
        bindKey: 'showFirstMessagePages',
        keywords: ['first', 'message', 'pages']
    },
    {
        id: 'display.hideRealm',
        type: 'check',
        labelKey: 'hideRealm',
        bindKey: 'hideRealm',
        keywords: ['hide', 'realm']
    },
    {
        id: 'display.showFolderName',
        type: 'check',
        labelKey: 'showFolderNameInIcon',
        bindKey: 'showFolderName',
        keywords: ['folder', 'name', 'icon']
    },
    {
        id: 'display.playMessage',
        type: 'check',
        labelKey: 'playMessage',
        helpKey: 'msgSound',
        bindKey: 'playMessage',
        keywords: ['play', 'message', 'sound']
    },
    {
        id: 'display.playMessageOnTranslateEnd',
        type: 'check',
        labelKey: 'playMessageOnTranslateEnd',
        bindKey: 'playMessageOnTranslateEnd',
        keywords: ['play', 'message', 'translate']
    },
    {
        id: 'display.roundIcons',
        type: 'check',
        labelKey: 'roundIcons',
        bindKey: 'roundIcons',
        keywords: ['round', 'icons']
    },
    {
        id: 'display.textBorder',
        type: 'check',
        labelKey: 'textBorder',
        bindKey: 'textBorder',
        keywords: ['text', 'border']
    },
    {
        id: 'display.textScreenRounded',
        type: 'check',
        labelKey: 'textScreenRound',
        bindKey: 'textScreenRounded',
        keywords: ['text', 'screen', 'round']
    },
    {
        id: 'display.showSavingIcon',
        type: 'check',
        labelKey: 'showSavingIcon',
        bindKey: 'showSavingIcon',
        keywords: ['saving', 'icon']
    },
    {
        id: 'display.showPromptComparison',
        type: 'check',
        labelKey: 'showPromptComparison',
        bindKey: 'showPromptComparison',
        keywords: ['prompt', 'comparison']
    },
    {
        id: 'display.useChatCopy',
        type: 'check',
        labelKey: 'useChatCopy',
        bindKey: 'useChatCopy',
        keywords: ['chat', 'copy']
    },
    {
        id: 'display.useAdditionalAssetsPreview',
        type: 'check',
        labelKey: 'useAdditionalAssetsPreview',
        bindKey: 'useAdditionalAssetsPreview',
        keywords: ['additional', 'assets', 'preview']
    },
    {
        id: 'display.useLegacyGUI',
        type: 'check',
        labelKey: 'useLegacyGUI',
        bindKey: 'useLegacyGUI',
        keywords: ['legacy', 'gui']
    },
    {
        id: 'display.hideApiKey',
        type: 'check',
        labelKey: 'hideApiKeys',
        bindKey: 'hideApiKey',
        keywords: ['hide', 'api', 'key']
    },
    {
        id: 'display.unformatQuotes',
        type: 'check',
        labelKey: 'unformatQuotes',
        bindKey: 'unformatQuotes',
        keywords: ['unformat', 'quotes']
    },
    {
        id: 'display.customQuotes',
        type: 'check',
        labelKey: 'customQuotes',
        bindKey: 'customQuotes',
        keywords: ['custom', 'quotes']
    },
    {
        id: 'display.betaMobileGUI',
        type: 'check',
        labelKey: 'betaMobileGUI',
        helpKey: 'betaMobileGUI',
        bindKey: 'betaMobileGUI',
        keywords: ['beta', 'mobile', 'gui']
    },
    {
        id: 'display.menuSideBar',
        type: 'check',
        labelKey: 'menuSideBar',
        bindKey: 'menuSideBar',
        keywords: ['menu', 'sidebar']
    },
    {
        id: 'display.notification',
        type: 'check',
        labelKey: 'notification',
        bindKey: 'notification',
        keywords: ['notification']
    },
];

/**
 * Complex checkboxes that need special handling (kept in Svelte)
 * Listed here for search functionality
 */
export const displayComplexCheckboxItems: SettingItem[] = [
    {
        id: 'display.customBackground',
        type: 'check',
        labelKey: 'useCustomBackground',
        bindKey: 'customBackground',
        keywords: ['custom', 'background']
    },
    {
        id: 'display.textScreenColor',
        type: 'check',
        labelKey: 'textBackgrounds',
        bindKey: 'textScreenColor',
        keywords: ['text', 'background', 'color']
    },
    {
        id: 'display.textScreenBorder',
        type: 'check',
        labelKey: 'textScreenBorder',
        bindKey: 'textScreenBorder',
        keywords: ['text', 'screen', 'border']
    },
];

/**
 * Unrecommended display options (shown only when showUnrecommended is true)
 */
export const displayUnrecommendedItems: SettingItem[] = [
    {
        id: 'display.useChatSticker',
        type: 'check',
        labelKey: 'useChatSticker',
        helpKey: 'unrecommended',
        bindKey: 'useChatSticker',
        options: { helpUnrecommended: true },
        keywords: ['chat', 'sticker']
    },
    {
        id: 'display.useAdvancedEditor',
        type: 'check',
        labelKey: 'useAdvancedEditor',
        helpKey: 'unrecommended',
        bindKey: 'useAdvancedEditor',
        options: { helpUnrecommended: true },
        keywords: ['advanced', 'editor']
    },
];

/**
 * Custom CSS textarea
 */
export const displayCustomCSSItem: SettingItem = {
    id: 'display.customCSS',
    type: 'textarea',
    labelKey: 'customCSS',
    helpKey: 'customCSS',
    bindKey: 'customCSS',
    keywords: ['custom', 'css', 'style']
};

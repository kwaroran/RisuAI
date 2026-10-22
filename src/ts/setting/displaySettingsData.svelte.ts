/**
 * Display Settings Data
 *
 * Data-driven definition for DisplaySettings page.
 */

import type { SettingItem } from './types';
import { changeFullscreen } from '../util';
import { updateAnimationSpeed } from '../gui/animation';
import { guiSizeText, updateGuisize } from '../gui/guisize';
import { updateTextThemeAndCSS } from '../gui/colorscheme';
import { CustomGUISettingMenuStore } from '../stores.svelte';

export const displayThemeSettingsItems: SettingItem[] = [
    {
        id: 'display.theme',
        type: 'select',
        labelKey: 'theme',
        bindKey: 'theme',
        classes: 'mt-4',
        options: {
            selectOptions: [
                { value: '', label: 'Standard Risu' },
                { value: 'waifu', label: 'Waifulike' },
                { value: 'mobilechat', label: 'Mobile Chat' },
                { value: 'cardboard', label: 'CardBoard' },
                { value: 'customHTML', label: 'Custom HTML' },
            ],
        },
        keywords: ['theme', 'gui', 'layout'],
    },
    {
        id: 'display.customGui',
        type: 'button',
        labelKey: 'defineCustomGUI',
        condition: (ctx) => ctx.db.theme === 'custom',
        options: {
            onClick: () => CustomGUISettingMenuStore.set(true),
        },
        keywords: ['custom', 'gui'],
    },
    {
        id: 'display.guiHTML',
        type: 'textarea',
        labelKey: 'chatHTML',
        helpKey: 'chatHTML',
        bindKey: 'guiHTML',
        condition: (ctx) => ctx.db.theme === 'customHTML',
        keywords: ['custom', 'html', 'chat'],
    },
    {
        id: 'display.waifuWidth',
        type: 'slider',
        labelKey: 'waifuWidth',
        bindKey: 'waifuWidth',
        condition: (ctx) => ctx.db.theme === 'waifu',
        options: {
            min: 50,
            max: 200,
            customText: (value) => `${value}%`,
        },
        classes: 'mt-4',
        keywords: ['waifu', 'width'],
    },
    {
        id: 'display.waifuWidth2',
        type: 'slider',
        labelKey: 'waifuWidth2',
        bindKey: 'waifuWidth2',
        condition: (ctx) => ctx.db.theme === 'waifu',
        options: {
            min: 20,
            max: 150,
            customText: (value) => `${value}%`,
        },
        classes: 'mt-4',
        keywords: ['waifu', 'width'],
    },
    {
        id: 'display.colorScheme',
        type: 'custom',
        componentId: 'ColorSchemeSelect',
        keywords: ['color', 'scheme', 'theme'],
    },
    {
        id: 'display.customColorScheme',
        type: 'custom',
        componentId: 'CustomColorSchemeEditor',
        condition: (ctx) => ctx.db.colorSchemeName === 'custom',
        keywords: ['custom', 'color', 'scheme'],
    },
    {
        id: 'display.textTheme',
        type: 'select',
        labelKey: 'textColor',
        bindKey: 'textTheme',
        classes: 'mt-4',
        onChange: () => updateTextThemeAndCSS(),
        options: {
            selectOptions: [
                { value: 'standard', labelKey: 'classicRisu' },
                { value: 'highcontrast', labelKey: 'highcontrast' },
                { value: 'custom', label: 'Custom' },
            ],
        },
        keywords: ['text', 'color', 'theme'],
    },
    {
        id: 'display.customTextTheme',
        type: 'custom',
        componentId: 'CustomTextThemeEditor',
        condition: (ctx) => ctx.db.textTheme === 'custom',
        keywords: ['custom', 'text', 'color', 'theme'],
    },
    {
        id: 'display.font',
        type: 'select',
        labelKey: 'font',
        bindKey: 'font',
        classes: 'mt-4',
        onChange: () => updateTextThemeAndCSS(),
        options: {
            selectOptions: [
                { value: 'default', label: 'Default' },
                { value: 'timesnewroman', label: 'Times New Roman' },
                { value: 'custom', label: 'Custom' },
            ],
        },
        keywords: ['font', 'typeface'],
    },
    {
        id: 'display.customFont',
        type: 'text',
        fallbackLabel: '',
        bindKey: 'customFont',
        condition: (ctx) => ctx.db.font === 'custom',
        onChange: () => updateTextThemeAndCSS(),
        keywords: ['font', 'custom'],
    },
];

export const displaySizeSettingsItems: SettingItem[] = [
    {
        id: 'display.zoomsize',
        type: 'slider',
        labelKey: 'UISize',
        bindKey: 'zoomsize',
        classes: 'mt-4',
        options: { min: 50, max: 200 },
        keywords: ['ui', 'size', 'zoom'],
    },
    {
        id: 'display.lineHeight',
        type: 'slider',
        labelKey: 'lineHeight',
        bindKey: 'lineHeight',
        options: { min: 0.5, max: 3, step: 0.05, fixed: 2 },
        keywords: ['line', 'height', 'spacing'],
    },
    {
        id: 'display.iconsize',
        type: 'slider',
        labelKey: 'iconSize',
        bindKey: 'iconsize',
        options: { min: 50, max: 200 },
        keywords: ['icon', 'size'],
    },
    {
        id: 'display.textAreaSize',
        type: 'slider',
        labelKey: 'textAreaSize',
        bindKey: 'textAreaSize',
        onChange: () => updateGuisize(),
        options: {
            min: -5,
            max: 5,
            customText: (value) => guiSizeText(value),
        },
        keywords: ['textarea', 'input', 'size'],
    },
    {
        id: 'display.textAreaTextSize',
        type: 'slider',
        labelKey: 'textAreaTextSize',
        bindKey: 'textAreaTextSize',
        onChange: () => updateGuisize(),
        options: {
            min: 0,
            max: 3,
            customText: (value) => guiSizeText(value),
        },
        keywords: ['textarea', 'text', 'size'],
    },
    {
        id: 'display.sideBarSize',
        type: 'slider',
        labelKey: 'sideBarSize',
        bindKey: 'sideBarSize',
        onChange: () => updateGuisize(),
        options: {
            min: 0,
            max: 3,
            customText: (value) => guiSizeText(value),
        },
        keywords: ['sidebar', 'size'],
    },
    {
        id: 'display.assetWidth',
        type: 'slider',
        labelKey: 'assetWidth',
        bindKey: 'assetWidth',
        options: {
            min: -1,
            max: 40,
            step: 1,
            customText: (value) =>
                value === -1 ? 'Unlimited' : value === 0 ? 'Hidden' : `${value.toFixed(1)} rem`,
        },
        keywords: ['asset', 'width'],
    },
    {
        id: 'display.animationSpeed',
        type: 'slider',
        labelKey: 'animationSpeed',
        bindKey: 'animationSpeed',
        onChange: () => updateAnimationSpeed(),
        options: { min: 0, max: 1, step: 0.05, fixed: 2 },
        keywords: ['animation', 'speed'],
    },
    {
        id: 'display.memoryLimitThickness',
        type: 'slider',
        labelKey: 'memoryLimitThickness',
        bindKey: 'memoryLimitThickness',
        condition: (ctx) => ctx.db.showMemoryLimit,
        options: { min: 1, max: 500, step: 1 },
        keywords: ['memory', 'limit', 'thickness'],
    },
    {
        id: 'display.settingsCloseButtonSize',
        type: 'slider',
        labelKey: 'settingsCloseButtonSize',
        helpKey: 'settingsCloseButtonSize',
        bindKey: 'settingsCloseButtonSize',
        options: { min: 16, max: 48, step: 1 },
        keywords: ['settings', 'close', 'button', 'size'],
    },
];

export const displayOtherSettingsItems: SettingItem[] = [
    {
        id: 'display.fullScreen',
        type: 'check',
        labelKey: 'fullscreen',
        bindKey: 'fullScreen',
        onChange: () => changeFullscreen(),
        keywords: ['fullscreen'],
    },
    { id: 'display.showMemoryLimit', type: 'check', labelKey: 'showMemoryLimit', bindKey: 'showMemoryLimit', keywords: ['memory', 'limit'] },
    { id: 'display.showFirstMessagePages', type: 'check', labelKey: 'showFirstMessagePages', bindKey: 'showFirstMessagePages', keywords: ['first', 'message', 'pages'] },
    { id: 'display.hideRealm', type: 'check', labelKey: 'hideRealm', bindKey: 'hideRealm', keywords: ['realm', 'hide'] },
    { id: 'display.hideAllImages', type: 'check', labelKey: 'hideAllImages', helpKey: 'hideAllImagesDesc', bindKey: 'hideAllImages', keywords: ['images', 'hide'] },
    { id: 'display.showFolderName', type: 'check', labelKey: 'showFolderNameInIcon', bindKey: 'showFolderName', keywords: ['folder', 'name', 'icon'] },
    { id: 'display.customBackground', type: 'custom', componentId: 'CustomBackgroundToggle', keywords: ['custom', 'background'] },
    { id: 'display.playMessage', type: 'check', labelKey: 'playMessage', helpKey: 'msgSound', bindKey: 'playMessage', keywords: ['message', 'sound'] },
    { id: 'display.playMessageOnTranslateEnd', type: 'check', labelKey: 'playMessageOnTranslateEnd', bindKey: 'playMessageOnTranslateEnd', keywords: ['translate', 'sound'] },
    { id: 'display.roundIcons', type: 'check', labelKey: 'roundIcons', bindKey: 'roundIcons', keywords: ['round', 'icons'] },
    {
        id: 'display.textScreenColor',
        type: 'custom',
        componentId: 'NullableTextColorToggle',
        componentProps: {
            field: 'textScreenColor',
            labelKey: 'textBackgrounds',
            defaultColor: '#121212',
        },
        keywords: ['text', 'background', 'color'],
    },
    { id: 'display.textBorder', type: 'check', labelKey: 'textBorder', bindKey: 'textBorder', keywords: ['text', 'border'] },
    { id: 'display.textScreenRounded', type: 'check', labelKey: 'textScreenRound', bindKey: 'textScreenRounded', keywords: ['text', 'round'] },
    { id: 'display.showSavingIcon', type: 'check', labelKey: 'showSavingIcon', bindKey: 'showSavingIcon', keywords: ['saving', 'icon'] },
    { id: 'display.showPromptComparison', type: 'check', labelKey: 'showPromptComparison', bindKey: 'showPromptComparison', keywords: ['prompt', 'comparison'] },
    {
        id: 'display.textScreenBorder',
        type: 'custom',
        componentId: 'NullableTextColorToggle',
        componentProps: {
            field: 'textScreenBorder',
            labelKey: 'textScreenBorder',
            defaultColor: '#121212',
        },
        keywords: ['text', 'screen', 'border', 'color'],
    },
    { id: 'display.useChatCopy', type: 'check', labelKey: 'useChatCopy', bindKey: 'useChatCopy', keywords: ['chat', 'copy'] },
    { id: 'display.useAdditionalAssetsPreview', type: 'check', labelKey: 'useAdditionalAssetsPreview', bindKey: 'useAdditionalAssetsPreview', keywords: ['additional', 'assets', 'preview'] },
    { id: 'display.useLegacyGUI', type: 'check', labelKey: 'useLegacyGUI', bindKey: 'useLegacyGUI', keywords: ['legacy', 'gui'] },
    { id: 'display.hideApiKey', type: 'check', labelKey: 'hideApiKeys', bindKey: 'hideApiKey', keywords: ['api', 'key', 'hide'] },
    { id: 'display.unformatQuotes', type: 'check', labelKey: 'unformatQuotes', bindKey: 'unformatQuotes', keywords: ['quotes'] },
    { id: 'display.blockquoteStyling', type: 'check', labelKey: 'blockquoteStyling', bindKey: 'blockquoteStyling', keywords: ['blockquote', 'quote'] },
    {
        id: 'display.showCustomColorContrast',
        type: 'check',
        labelKey: 'showCustomColorContrast',
        bindKey: 'showCustomColorContrast',
        keywords: ['custom', 'color', 'contrast', 'wcag', 'readability'],
    },
    { id: 'display.customQuotes', type: 'check', labelKey: 'customQuotes', bindKey: 'customQuotes', keywords: ['custom', 'quotes'] },
    {
        id: 'display.leadingDoubleQuote',
        type: 'text',
        labelKey: 'leadingDoubleQuote',
        condition: (ctx) => ctx.db.customQuotes,
        getValue: (db) => db.customQuotesData?.[0] ?? '',
        setValue: (db, value: string) => {
            db.customQuotesData ??= ['"', '"', "'", "'"];
            db.customQuotesData[0] = value;
        },
        keywords: ['quote', 'double', 'leading'],
    },
    {
        id: 'display.trailingDoubleQuote',
        type: 'text',
        labelKey: 'trailingDoubleQuote',
        condition: (ctx) => ctx.db.customQuotes,
        getValue: (db) => db.customQuotesData?.[1] ?? '',
        setValue: (db, value: string) => {
            db.customQuotesData ??= ['"', '"', "'", "'"];
            db.customQuotesData[1] = value;
        },
        keywords: ['quote', 'double', 'trailing'],
    },
    {
        id: 'display.leadingSingleQuote',
        type: 'text',
        labelKey: 'leadingSingleQuote',
        condition: (ctx) => ctx.db.customQuotes,
        getValue: (db) => db.customQuotesData?.[2] ?? '',
        setValue: (db, value: string) => {
            db.customQuotesData ??= ['"', '"', "'", "'"];
            db.customQuotesData[2] = value;
        },
        keywords: ['quote', 'single', 'leading'],
    },
    {
        id: 'display.trailingSingleQuote',
        type: 'text',
        labelKey: 'trailingSingleQuote',
        condition: (ctx) => ctx.db.customQuotes,
        getValue: (db) => db.customQuotesData?.[3] ?? '',
        setValue: (db, value: string) => {
            db.customQuotesData ??= ['"', '"', "'", "'"];
            db.customQuotesData[3] = value;
        },
        keywords: ['quote', 'single', 'trailing'],
    },
    { id: 'display.betaMobileGUI', type: 'check', labelKey: 'betaMobileGUI', helpKey: 'betaMobileGUI', bindKey: 'betaMobileGUI', keywords: ['beta', 'mobile', 'gui'] },
    { id: 'display.menuSideBar', type: 'check', labelKey: 'menuSideBar', bindKey: 'menuSideBar', keywords: ['menu', 'sidebar'] },
    { id: 'display.notification', type: 'custom', componentId: 'NotificationToggle', keywords: ['notification'] },
    {
        id: 'display.useChatSticker',
        type: 'check',
        labelKey: 'useChatSticker',
        helpKey: 'unrecommended',
        helpUnrecommended: true,
        bindKey: 'useChatSticker',
        condition: (ctx) => ctx.db.showUnrecommended,
        keywords: ['chat', 'sticker'],
    },
    {
        id: 'display.customCSS',
        type: 'textarea',
        labelKey: 'customCSS',
        helpKey: 'customCSS',
        bindKey: 'customCSS',
        classes: 'mt-4',
        onChange: () => updateTextThemeAndCSS(),
        keywords: ['custom', 'css'],
    },
];

export const displaySettingsItems: SettingItem[] = [
    ...displayThemeSettingsItems,
    ...displaySizeSettingsItems,
    ...displayOtherSettingsItems,
];

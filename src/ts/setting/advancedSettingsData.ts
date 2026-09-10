
import type { SettingItem } from './types';
import { isNodeServer, isTauri } from '../platform';

export const advancedSettingsItems: SettingItem[] = [
    { type: 'header', id: 'adv.header', labelKey: 'advancedSettings', options: { level: 'h2' }, classes: '!mb-0' },
    { type: 'header', id: 'adv.warn', labelKey: 'advancedSettingsWarn', options: { level: 'warning' } },

    // LoreBook Settings
    {
        id: 'adv.lbDepth', type: 'number', labelKey: 'loreBookDepth', bindKey: 'loreBookDepth',
        options: { min: 0, max: 20 },
        classes: 'mt-4 mb-2'
    },
    {
        id: 'adv.lbToken', type: 'number', labelKey: 'loreBookToken', bindKey: 'loreBookToken',
        options: { min: 0, max: 4096 }
    },
    {
        id: 'adv.autoContinueMin', type: 'number', labelKey: 'autoContinueMinTokens', bindKey: 'autoContinueMinTokens',
        options: { min: 0 }
    },

    // Prompts
    {
        id: 'adv.addPrompt', type: 'text', labelKey: 'additionalPrompt', bindKey: 'additionalPrompt',
        helpKey: 'additionalPrompt'
    },
    {
        id: 'adv.descPrefix', type: 'text', labelKey: 'descriptionPrefix', bindKey: 'descriptionPrefix'
    },
    {
        id: 'adv.emoPrompt', type: 'text', labelKey: 'emotionPrompt', bindKey: 'emotionPrompt2',
        helpKey: 'emotionPrompt', options: { placeholder: 'Leave it blank to use default' }
    },
    {
        id: 'adv.keiUrl', type: 'text', fallbackLabel: 'Kei Server URL', bindKey: 'keiServerURL',
        options: { placeholder: 'Leave it blank to use default' }
    },
    {
        id: 'adv.presetChain', type: 'text', labelKey: 'presetChain', bindKey: 'presetChain',
        helpKey: 'presetChain', options: { placeholder: 'Leave it blank to not use' }
    },

    // Request Settings
    {
        id: 'adv.retries', type: 'number', labelKey: 'requestretrys', bindKey: 'requestRetrys',
        helpKey: 'requestretrys', options: { min: 0, max: 20 }
    },
    {
        id: 'adv.genTime', type: 'number', labelKey: 'genTimes', bindKey: 'genTime',
        helpKey: 'genTimes', options: { min: 0, max: 4096 }
    },
    {
        id: 'adv.assetAlloc', type: 'number', labelKey: 'assetMaxDifference', bindKey: 'assetMaxDifference'
    },

    // Vision Quality
    {
        id: 'adv.visionQual', type: 'select', fallbackLabel: 'Vision Quality', bindKey: 'gptVisionQuality',
        helpKey: 'gptVisionQuality',
        options: {
            selectOptions: [
                { value: 'low', label: 'Low' },
                { value: 'high', label: 'High' }
            ]
        }
    },

    // Keep Session alive
    {
        id: 'adv.keepSessionAlive', type: 'select', labelKey: 'keepSessionAlive', bindKey: 'keepSessionAlive', helpKey: 'keepSessionAlive',
        options: {
            selectOptions: [
                { value: 'off', label: 'Off' },
                { value: 'sound', label: 'Via Sound' },
            ]
        }
    },
    

    // Height Mode
    {
        id: 'adv.heightMode', type: 'select', labelKey: 'heightMode', bindKey: 'heightMode',
        options: {
            selectOptions: [
                { value: 'normal', label: 'Normal' },
                { value: 'percent', label: 'Percent' },
                { value: 'vh', label: 'VH' },
                { value: 'dvh', label: 'DVH' },
                { value: 'svh', label: 'SVH' },
                { value: 'lvh', label: 'LVH' }
            ]
        }
    },

    // Chat Loading
    {
        id: 'adv.chatLoadInitial', type: 'number', labelKey: 'chatLoadInitialPages', bindKey: 'chatLoadInitialPages',
        helpKey: 'chatLoadInitialPages', classes: 'mt-4', options: { min: 1 }
    },
    {
        id: 'adv.chatLoadAdditional', type: 'number', labelKey: 'chatLoadAdditionalPages', bindKey: 'chatLoadAdditionalPages',
        helpKey: 'chatLoadAdditionalPages', options: { min: 1 }
    },

    // Request Location (Non-Node/Tauri)
    {
        id: 'adv.reqLoc', type: 'segmented', labelKey: 'requestLocation', bindKey: 'requestLocation',
        condition: () => !isNodeServer && !isTauri,
        options: {
            segmentOptions: [
                { value: '', label: 'Default' },
                { value: 'eu', label: 'EU (GDPR)' },
                { value: 'fedramp', label: 'US (FedRAMP)' }
            ]
        }
    },

    // Toggles
    { id: 'adv.sayNothing', type: 'check', labelKey: 'sayNothing', bindKey: 'useSayNothing', helpKey: 'sayNothing', classes: 'mt-4' },
    { id: 'adv.showUnrec', type: 'check', labelKey: 'showUnrecommended', bindKey: 'showUnrecommended', helpKey: 'showUnrecommended', classes: 'mt-4' },
    { id: 'adv.imgComp', type: 'check', labelKey: 'imageCompression', bindKey: 'imageCompression', helpKey: 'imageCompression', classes: 'mt-4' },
    { id: 'adv.useExp', type: 'check', labelKey: 'useExperimental', bindKey: 'useExperimental', helpKey: 'useExperimental', classes: 'mt-4' },
    { id: 'adv.forceProxy', type: 'check', labelKey: 'forceProxyAsOpenAI', bindKey: 'forceProxyAsOpenAI', helpKey: 'forceProxyAsOpenAI', classes: 'mt-4' },
    { id: 'adv.legacyMedia', type: 'check', labelKey: 'legacyMediaFindings', bindKey: 'legacyMediaFindings', helpKey: 'legacyMediaFindings', classes: 'mt-4' },
    { id: 'adv.autoFill', type: 'check', labelKey: 'autoFillRequestURL', bindKey: 'autofillRequestUrl', helpKey: 'autoFillRequestURL', classes: 'mt-4' },
    {
        id: 'adv.localNetworkMode',
        type: 'check',
        fallbackLabel: 'Local Network Mode (Experimental)',
        bindKey: 'localNetworkMode',
        helpKey: 'localNetworkModeDesc',
        classes: 'mt-4'
    },
    {
        id: 'adv.localNetworkTimeout', type: 'number', fallbackLabel: 'Local Network Timeout (sec)', bindKey: 'localNetworkTimeoutSec',
        condition: (ctx) => ctx.db.localNetworkMode,
        classes: 'block mb-1',
        containerClasses: 'pl-7',
        options: { min: 30, max: 3600, inputClassName: 'w-full', marginBottom: false }
    },
    { id: 'adv.autoCont', type: 'check', labelKey: 'autoContinueChat', bindKey: 'autoContinueChat', helpKey: 'autoContinueChat', classes: 'mt-4' },
    { id: 'adv.remIncomp', type: 'check', labelKey: 'removeIncompleteResponse', bindKey: 'removeIncompleteResponse', classes: 'mt-4' },
    {
        id: 'adv.streamingDisplayOpt',
        type: 'segmented',
        labelKey: 'streamingDisplayOptimizationMode',
        bindKey: 'streamingDisplayOptimizationMode',
        helpKey: 'streamingDisplayOptimizationMode',
        condition: (ctx) => ctx.db.useExperimental,
        showExperimental: true,
        classes: 'mt-4',
        options: {
            segmentOptions: [
                { value: 'off', labelKey: 'streamingDisplayOptimizationOff' },
                { value: 'balanced', labelKey: 'streamingDisplayOptimizationBalanced' },
                { value: 'strong', labelKey: 'streamingDisplayOptimizationStrong' }
            ]
        }
    },
    { id: 'adv.newOai', type: 'check', labelKey: 'newOAIHandle', bindKey: 'newOAIHandle', classes: 'mt-4' },
    { id: 'adv.noWaitTrans', type: 'check', labelKey: 'noWaitForTranslate', bindKey: 'noWaitForTranslate', classes: 'mt-4' },
    { id: 'adv.newImgBeta', type: 'check', labelKey: 'newImageHandlingBeta', bindKey: 'newImageHandlingBeta', classes: 'mt-4' },
    { id: 'adv.allowExt', type: 'check', fallbackLabel: 'Allow all in file select', bindKey: 'allowAllExtentionFiles', classes: 'mt-4' },
    { id: 'adv.dynamicModelRegistry', type: 'check', labelKey: 'dynamicModelRegistry', bindKey: 'dynamicModelRegistry', classes: 'mt-4' },
    { id: 'adv.disableSeperateParameterChangeOnPresetChange', type: 'check', labelKey: 'disableSeperateParameterChangeOnPresetChange', bindKey: 'disableSeperateParameterChangeOnPresetChange', classes: 'mt-4' },
    { id: 'adv.coldstorage', type: 'check', labelKey: 'coldStorage', bindKey: 'coldstorage', classes: 'mt-4', helpKey: 'coldstorage' },

    // Experimental Section (visible when useExperimental is true)
    {
        id: 'adv.exp.googleToken', type: 'check', labelKey: 'googleCloudTokenization', bindKey: 'googleClaudeTokenizing',
        condition: (ctx) => ctx.db.useExperimental, showExperimental: true, classes: 'mt-4'
    },
    {
        id: 'adv.exp.cachePoint', type: 'check', labelKey: 'automaticCachePoint', bindKey: 'automaticCachePoint',
        condition: (ctx) => ctx.db.useExperimental, helpKey: 'automaticCachePoint', showExperimental: true, classes: 'mt-4'
    },
    // Unrecommended Section
    {
        id: 'adv.cot', type: 'check', labelKey: 'cot', bindKey: 'chainOfThought',
        condition: (ctx) => ctx.db.showUnrecommended, helpKey: 'customChainOfThought', helpUnrecommended: true, classes: 'mt-4'
    },

    // More Toggles
    { id: 'adv.remPunc', type: 'check', labelKey: 'removePunctuationHypa', bindKey: 'removePunctuationHypa', helpKey: 'removePunctuationHypa', classes: 'mt-4' },
    { id: 'adv.devTools', type: 'check', labelKey: 'enableDevTools', bindKey: 'enableDevTools', classes: 'mt-4' },
    { id: 'adv.scrollToActive', type: 'check', labelKey: 'enableScrollToActiveChar', bindKey: 'enableScrollToActiveChar', helpKey: 'enableScrollToActiveChar', classes: 'mt-4' },

    // Node/Tauri Specific
    {
        id: 'adv.promptInfo', type: 'check', labelKey: 'promptInfoInsideChat', bindKey: 'promptInfoInsideChat',
        condition: () => isNodeServer || isTauri, helpKey: 'promptInfoInsideChatDesc', classes: 'mt-4'
    },
    {
        id: 'adv.promptTextInfo', type: 'check', labelKey: 'promptTextInfoInsideChat', bindKey: 'promptTextInfoInsideChat',
        condition: (ctx) => (isNodeServer || isTauri) && ctx.db.promptInfoInsideChat, classes: 'mt-4'
    },
    {
        id: 'adv.remoteSave', type: 'check', labelKey: 'enableRemoteSaving', bindKey: 'enableRemoteSaving',
        classes: 'mt-4'
    },

    // Dynamic Assets & Others
    { id: 'adv.dynAssets', type: 'check', labelKey: 'dynamicAssets', bindKey: 'dynamicAssets', helpKey: 'dynamicAssets', classes: 'mt-4' },
    { id: 'adv.realmOpen', type: 'check', labelKey: 'realmDirectOpen', bindKey: 'realmDirectOpen', helpKey: 'realmDirectOpen', classes: 'mt-4' },
    { id: 'adv.cssErr', type: 'check', labelKey: 'returnCSSError', bindKey: 'returnCSSError', classes: 'mt-4' },
    { id: 'adv.antiOverload', type: 'check', labelKey: 'antiServerOverload', bindKey: 'antiServerOverloads', classes: 'mt-4' },
    { id: 'adv.openAIFlex', type: 'check', labelKey: 'openAIFlexProcessing', bindKey: 'openAIFlexProcessing', helpKey: 'openAIFlexProcessing', showExperimental: true, classes: 'mt-4' },
    { id: 'adv.claudeCache', type: 'check', labelKey: 'claude1HourCaching', bindKey: 'claude1HourCaching', classes: 'mt-4' },
    { id: 'adv.claudeBatch', type: 'check', labelKey: 'claudeBatching', bindKey: 'claudeBatching', showExperimental: true, classes: 'mt-4' },
    { id: 'adv.personaNote', type: 'check', labelKey: 'personaNote', bindKey: 'personaNote', showExperimental: true, classes: 'mt-4' },
    { id: 'adv.toolUsage', type: 'check', labelKey: 'rememberToolUsage', bindKey: 'rememberToolUsage', classes: 'mt-4' },
    { id: 'adv.bookmark', type: 'check', labelKey: 'bookmark', bindKey: 'enableBookmark', classes: 'mt-4' },
    { id: 'adv.simpleTool', type: 'check', labelKey: 'simplifiedToolUse', bindKey: 'simplifiedToolUse', classes: 'mt-4' },
    { id: 'adv.tokCache', type: 'check', labelKey: 'useTokenizerCaching', bindKey: 'useTokenizerCaching', classes: 'mt-4' },
    { id: 'adv.auxModelUnderModelSettings', type: 'check', labelKey: 'auxModelUnderModelSettings', bindKey: 'auxModelUnderModelSettings', classes: 'mt-4' },
    { id: 'adv.devMode', type: 'check', labelKey: 'pluginDevelopMode', bindKey: 'pluginDevelopMode', classes: 'mt-4' },

    // More Experimental (Condition: useExperimental)
    {
        id: 'adv.exp.googleTrans', type: 'check', fallbackLabel: 'New Google Translate Experimental', bindKey: 'useExperimentalGoogleTranslator',
        condition: (ctx) => ctx.db.useExperimental, helpKey: 'unrecommended', helpUnrecommended: true, classes: 'mt-4'
    },
    {
        id: 'adv.exp.claudeRet', type: 'check', labelKey: 'claudeCachingRetrival', bindKey: 'claudeRetrivalCaching',
        condition: (ctx) => ctx.db.useExperimental, helpKey: 'unrecommended', helpUnrecommended: true, classes: 'mt-4'
    },

    // Sync (Condition: db.account.useSync)
    {
        id: 'adv.sync.realm', type: 'check', fallbackLabel: 'Lightning Realm Import', bindKey: 'lightningRealmImport',
        condition: (ctx) => !!ctx.db.account?.useSync, showExperimental: true, classes: 'mt-4'
    },

    // Dynamic Assets Edit (Condition: dynamicAssets)
    {
        id: 'adv.dynAssetsEdit', type: 'check', labelKey: 'dynamicAssetsEditDisplay', bindKey: 'dynamicAssetsEditDisplay',
        condition: (ctx) => ctx.db.dynamicAssets, helpKey: 'dynamicAssetsEditDisplay', classes: 'mt-4'
    },

    // Unrecommended Extra (Condition: showUnrecommended)
    {
        id: 'adv.plainFetch', type: 'check', labelKey: 'forcePlainFetch', bindKey: 'usePlainFetch',
        condition: (ctx) => ctx.db.showUnrecommended, helpKey: 'forcePlainFetch', helpUnrecommended: true, classes: 'mt-4'
    },
    {
        id: 'adv.depTrig', type: 'check', labelKey: 'showDeprecatedTriggerV1', bindKey: 'showDeprecatedTriggerV1',
        condition: (ctx) => ctx.db.showUnrecommended, helpKey: 'unrecommended', helpUnrecommended: true, classes: 'mt-4'
    },
    {
        id: 'adv.skipSavingAssetsOnWebSync', type: 'check', labelKey: 'skipSavingAssetsOnWebSync', bindKey: 'skipSavingAssetsOnWebSync',
        condition: (ctx) => ctx.db.showUnrecommended, helpKey: 'unrecommended', helpUnrecommended: true, classes: 'mt-4'
    },

    // Custom Components
    { type: 'custom', id: 'adv.banChar', componentId: 'BanCharacterSetSettings' },
    { type: 'custom', id: 'adv.customModels', componentId: 'CustomModelsSettings' },
    { type: 'custom', id: 'adv.export', componentId: 'SettingsExportButtons' },
];

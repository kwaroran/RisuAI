/**
 * Settings Search Index
 */

/**
 * Represents a single searchable setting item
 */
export interface SettingsIndexItem {
    /** Unique identifier for this setting item */
    id: string;
    
    /** Settings category index (matches SettingsMenuIndex) */
    category: number;
    
    /** Category name key for language lookup (e.g., 'chatBot', 'display') */
    categoryKey: string;
    
    /** Subcategory/submenu index within the category (optional) */
    subcategory?: number;
    
    /** Subcategory name key for language lookup (optional) */
    subcategoryKey?: string;
    
    /** Label key for language lookup (the setting's display name) */
    labelKey: string;
    
    /** Fallback label if language key doesn't exist */
    fallbackLabel: string;
    
    /** Search keywords for matching (English, lowercase) */
    keywords: string[];
    
    /** 
     * Path within the category for nested settings
     * e.g., ['arcodion:bias'] for settings inside an accordion
     */
    path?: string[];
    
    /**
     * Type of the setting for UI hints
     */
    type?: 'checkbox' | 'input' | 'select' | 'slider' | 'button' | 'section';
    
    /**
     * Condition for visibility (optional)
     */
    condition?: string;
    
    /**
     * Help key for the setting (if exists)
     */
    helpKey?: string;
}

/**
 * Settings category definition
 */
export interface SettingsCategory {
    index: number;
    nameKey: string;
    icon: string;
    submenus?: { index: number; nameKey: string; }[];
    nonLiteOnly?: boolean;
}

export const settingsCategories: SettingsCategory[] = [
    { index: 1, nameKey: 'chatBot', icon: 'BotIcon', submenus: [
        { index: 0, nameKey: 'model' },
        { index: 1, nameKey: 'parameters' },
        { index: 2, nameKey: 'prompt' },
        { index: 3, nameKey: 'others' }
    ], nonLiteOnly: true },
    { index: 12, nameKey: 'persona', icon: 'ContactIcon', nonLiteOnly: true },
    { index: 2, nameKey: 'otherBots', icon: 'Sailboat', submenus: [
        { index: 0, nameKey: 'longTermMemory' },
        { index: 1, nameKey: 'tts' },
        { index: 2, nameKey: 'emotionImage' },
        { index: 3, nameKey: 'imageGeneration' }
    ], nonLiteOnly: true },
    { index: 3, nameKey: 'display', icon: 'MonitorIcon', submenus: [
        { index: 0, nameKey: 'theme' },
        { index: 1, nameKey: 'sizeAndSpeed' },
        { index: 2, nameKey: 'others' }
    ], nonLiteOnly: true },
    { index: 10, nameKey: 'language', icon: 'LanguagesIcon' },
    { index: 11, nameKey: 'accessibility', icon: 'AccessibilityIcon', nonLiteOnly: true },
    { index: 14, nameKey: 'modules', icon: 'PackageIcon', nonLiteOnly: true },
    { index: 4, nameKey: 'plugin', icon: 'CodeIcon', nonLiteOnly: true },
    { index: 0, nameKey: 'account', icon: 'UserIcon' },
    { index: 15, nameKey: 'hotkey', icon: 'KeyboardIcon' },
    { index: 6, nameKey: 'advancedSettings', icon: 'ActivityIcon', nonLiteOnly: true },
    { index: 77, nameKey: 'supporterThanks', icon: 'BoxIcon', nonLiteOnly: true },
    { index: 13, nameKey: 'promptTemplate', icon: 'ScrollTextIcon', nonLiteOnly: true },
];

/**
 * Settings index data - main settings items (will be expanded after phases)
 */
export const settingsIndex: SettingsIndexItem[] = [
    // === ChatBot (BotSettings) ===
    { id: 'bot.model', category: 1, categoryKey: 'chatBot', subcategory: 0, subcategoryKey: 'model',
      labelKey: 'model', fallbackLabel: 'Model', keywords: ['model', 'ai', 'llm'], type: 'select' },
    { id: 'bot.submodel', category: 1, categoryKey: 'chatBot', subcategory: 0, subcategoryKey: 'model',
      labelKey: 'submodel', fallbackLabel: 'Submodel', keywords: ['submodel', 'secondary'], type: 'select' },
    { id: 'bot.temperature', category: 1, categoryKey: 'chatBot', subcategory: 1, subcategoryKey: 'parameters',
      labelKey: 'temperature', fallbackLabel: 'Temperature', keywords: ['temperature', 'temp'], type: 'slider' },
    { id: 'bot.maxContext', category: 1, categoryKey: 'chatBot', subcategory: 1, subcategoryKey: 'parameters',
      labelKey: 'maxContextSize', fallbackLabel: 'Max Context Size', keywords: ['context', 'size', 'tokens'], type: 'input' },
    
    // === Display (DisplaySettings) ===
    { id: 'display.theme', category: 3, categoryKey: 'display', subcategory: 0, subcategoryKey: 'theme',
      labelKey: 'theme', fallbackLabel: 'Theme', keywords: ['theme', 'layout'], type: 'select' },
    { id: 'display.colorScheme', category: 3, categoryKey: 'display', subcategory: 0, subcategoryKey: 'theme',
      labelKey: 'colorScheme', fallbackLabel: 'Color Scheme', keywords: ['color', 'scheme', 'dark', 'light'], type: 'select' },
    
    // === Language ===
    { id: 'lang.uiLanguage', category: 10, categoryKey: 'language',
      labelKey: 'UiLanguage', fallbackLabel: 'UI Language', keywords: ['language', 'ui'], type: 'select' },
    { id: 'lang.translator', category: 10, categoryKey: 'language',
      labelKey: 'translatorLanguage', fallbackLabel: 'Translator', keywords: ['translator', 'translate'], type: 'select' },
    
    // === Advanced ===
    { id: 'adv.useExperimental', category: 6, categoryKey: 'advancedSettings',
      labelKey: 'useExperimental', fallbackLabel: 'Experimental Features', keywords: ['experimental', 'beta'], type: 'checkbox' },
    { id: 'adv.customModels', category: 6, categoryKey: 'advancedSettings',
      labelKey: 'customModels', fallbackLabel: 'Custom Models', keywords: ['custom', 'models'], type: 'section' },
    
    // (Additional items will be added after phases)
];

/**
 * Search settings by query (will be fully implemented after phases)
 */
export function searchSettings(query: string): SettingsIndexItem[] {
    if (!query || query.trim().length === 0) {
        return [];
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    const searchTerms = normalizedQuery.split(/\s+/);
    
    return settingsIndex.filter(item => {
        const keywordMatch = searchTerms.every(term =>
            item.keywords.some(keyword => keyword.includes(term))
        );
        const labelMatch = searchTerms.every(term =>
            item.fallbackLabel.toLowerCase().includes(term)
        );
        return keywordMatch || labelMatch;
    });
}

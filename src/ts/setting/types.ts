/**
 * Settings Structure Types
 * 
 * This module defines the schema for data-driven settings UI.
 * Settings are defined as data and rendered automatically by SettingRenderer.
 */

import type { Database } from '../storage/database.svelte';
import type { CustomComponentId, CustomComponentProps } from './customComponents';
import type { LLMModel } from '../model/types';

/**
 * Context passed to condition functions for visibility checks
 */
export interface SettingContext {
    db: Database;
    modelInfo: LLMModel;
    subModelInfo: LLMModel;
}

/**
 * Supported setting input types
 */
export type SettingType = 
    | 'check'      // Checkbox (CheckInput)
    | 'text'       // Text input (TextInput)
    | 'number'     // Number input (NumberInput)
    | 'textarea'   // Multiline text (TextAreaInput)
    | 'slider'     // Slider (SliderInput)
    | 'select'     // Dropdown (SelectInput)
    | 'color'      // Color picker (ColorInput)
    | 'header'     // Section header (h2, span, warning)
    | 'button'     // Action button (Button)
    | 'custom';    // Custom component from registry

/**
 * Select option for dropdown
 */
export interface SelectOption {
    value: string;
    label: string;
}

/**
 * Type-specific options for setting items
 */
export interface SettingOptions {
    // number, slider
    min?: number;
    max?: number;
    step?: number;
    fixed?: number;         // Decimal places for slider
    disableable?: boolean;  // Allow -1 to disable
    customText?: string;    // Custom display text for slider
    multiple?: number;      // Multiplier for display value
    
    // select
    selectOptions?: SelectOption[];
    
    // text, textarea
    placeholder?: string;
    hideText?: boolean;     // For password-like inputs
    
    // button
    onClick?: () => void | Promise<void>;
    
    // header
    level?: 'h2' | 'span' | 'warning';
}

/**
 * Single setting item definition
 */
export interface SettingItem {
    /** Unique identifier for this setting */
    id: string;
    
    /** UI component type */
    type: SettingType;
    
    /** Language key for label (language.xxx) */
    labelKey?: string;
    
    /** Fallback label if language key doesn't exist */
    fallbackLabel?: string;
    
    /** Help tooltip key */
    helpKey?: string;
    
    /** 
     * Database key for binding (DBState.db.xxx)
     * Only for input types (check, text, number, textarea, slider, select, color)
     */
    bindKey?: keyof Database;
    
    /**
     * Path for nested object binding (e.g., 'ooba.top_p')
     * Use when binding to nested properties like DBState.db.ooba.top_p
     * Takes precedence over bindKey if both are specified
     */
    bindPath?: string;
    
    /**
     * Condition function for visibility
     * Return true to show, false to hide
     * @param ctx - Contains db, modelInfo, and subModelInfo
     */
    condition?: (ctx: SettingContext) => boolean;
    
    /** Type-specific options */
    options?: SettingOptions;
    
    /** Search keywords for future search feature */
    keywords?: string[];
    
    /**
     * Component ID for custom components (type: 'custom')
     * Must be a key in customComponents registry
     */
    componentId?: CustomComponentId;
    
    /**
     * Props to pass to custom component
     */
    componentProps?: CustomComponentProps;
}

/**
 * Category definition for grouping settings
 */
export interface SettingCategory {
    id: string;
    labelKey: string;
    icon?: string;
    items: SettingItem[];
}

/**
 * Custom Component Registry
 * 
 * Maps component IDs (strings) to actual Svelte components.
 * This enables the data-driven settings structure to reference
 * complex components without circular import issues.
 * 
 * Usage in settings data:
 *   { type: 'custom', componentId: 'ModelSelector' }
 * 
 * The SettingRenderer will look up the component from this registry
 * and render it dynamically.
 */

import type { Component } from 'svelte';

// Import custom components here
import SeparateParametersSection from 'src/lib/Setting/Pages/SeparateParametersSection.svelte';

/**
 * Registry of custom components.
 * Add new components here as needed.
 */
export const customComponents: Record<string, Component<any>> = {
    'SeparateParametersSection': SeparateParametersSection,
    // Add more as we migrate complex settings
} as const;

/**
 * Type-safe component ID type.
 * Will be populated as components are added to the registry.
 */
export type CustomComponentId = keyof typeof customComponents;

/**
 * Props that can be passed to custom components
 */
export interface CustomComponentProps {
    /** Any additional props to pass to the component */
    [key: string]: unknown;
}

/**
 * Risuai Plugin API v3.0 Type Definitions
 *
 * This file provides TypeScript type definitions for the Risuai Plugin API v3.0.
 * All API methods are accessed through the global `risuai` object.
 *
 * @important **ALL METHODS RETURN PROMISES**
 *
 * Due to the iframe-based sandboxing architecture, ALL method calls go through
 * postMessage communication, which makes them asynchronous. Even methods that
 * appear synchronous in the implementation (like log(), showContainer(), etc.)
 * return Promises when called from the plugin iframe.
 * 
 * for DOM, we recommend using iframe-based UI which uses standard document API
 * instead of accessing the main document directly via getRootDocument(),
 * unless absolutely necessary.
 *
 * **ALWAYS use `await` or `.then()` when calling any risuai method or SafeElement method.**
 *
 * ## Plugin Metadata Headers
 *
 * All plugins must include metadata comments at the very top of the script file:
 *
 * ### Required Metadata
 *
 * - **`//@name`** - Internal plugin name (must be unique, avoid changing after publishing)
 *   ```javascript
 *   //@name my_plugin
 *   ```
 *
 * - **`//@api`** - API version (use `3.0` for new plugins)
 *   ```javascript
 *   //@api 3.0
 *   ```
 *
 * ### Optional Metadata
 *
 * - **`//@display-name`** - User-friendly display name (can be changed freely)
 *   ```javascript
 *   //@display-name My Awesome Plugin
 *   ```
 *
 * - **`//@arg`** - Define plugin arguments for user configuration
 *   ```javascript
 *   //@arg setting_name string Description of the setting
 *   //@arg max_items int Maximum number of items
 *   ```
 *   Supported types: `string`, `int`
 *   Syntax: `//@arg <name> <type> <description and optional metadata>`
 *
 * - **`//@link`** - Add custom links that appear in plugin settings UI
 *   ```javascript
 *   //@link https://example.com/docs Documentation
 *   //@link https://example.com/support Get Support
 *   ```
 *
 * - **`//@update-url`** - URL to check for updates (must support CORS and Range requests)
 *   ```javascript
 *   //@update-url https://raw.githubusercontent.com/username/repo/branch/plugin.js
 *   ```
 *   Recommended: Use GitHub raw file URLs for automatic update checks
 *
 * - **`//@version`** - Plugin version (required for update checks, use Semantic Versioning)
 *   ```javascript
 *   //@version 1.0.0
 *   ```
 *   Should be placed near the top, ideally below `//@name` and `//@api`
 *
 * @example
 * ```typescript
 * //@name MyPlugin
 * //@display-name My Awesome Plugin
 * //@api 3.0
 * //@version 1.0.0
 * //@arg api_key string Your API key
 * //@link https://github.com/user/plugin Documentation
 * //@update-url https://raw.githubusercontent.com/user/repo/main/plugin.js
 *
 * (async () => {
 *   // ALL methods require await
 *   await console.log('Plugin initialized');
 *
 *   const character = await risuai.getCharacter();
 *   await console.log(`Current character: ${character.name}`);
 *
 *   const apiKey = await risuai.getArgument('api_key');
 *
 *   await risuai.registerSetting('My Plugin', async () => {
 *     await risuai.showContainer('fullscreen');
 *     // Build UI...
 *   }, '⚙️', 'html');
 *
 * })();
 * ```
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * OpenAI-format chat message
 */
interface OpenAIChat {
    role: 'system' | 'user' | 'assistant' | 'function';
    content: string;
    name?: string;
    function_call?: {
        name: string;
        arguments: string;
    };
}

/**
 * Container display mode
 */
type ContainerMode = 'fullscreen';

/**
 * Icon type for UI elements
 */
type IconType = 'html' | 'img' | 'none';

/**
 * Script handler mode
 */
type ScriptMode = 'display' | 'output' | 'input' | 'process';

/**
 * Replacer type
 */
type ReplacerType = 'beforeRequest' | 'afterRequest';

/**
 * Risuai Plugin definition
 */
interface RisuPlugin {
    /** Plugin name (identifier) */
    name: string;
    /** Display name shown in UI */
    displayName?: string;
    /** Plugin script code */
    script: string;
    /** Argument type definitions */
    arguments: { [key: string]: 'int' | 'string' | string[] };
    /** Actual argument values */
    realArg: { [key: string]: number | string };
    /** API version */
    version?: 1 | 2 | '2.1' | '3.0';
    /** Custom links for plugin UI */
    customLink: {
        link: string;
        hoverText?: string;
    }[];
    /** Argument metadata */
    argMeta: { [key: string]: {[key: string]: string} };
    /** Plugin version string */
    versionOfPlugin?: string;
    /** Update check URL */
    updateURL?: string;
}

/**
 * Risuai Module definition
 */
interface RisuModule {
    /** Module name */
    name: string;
    /** Module description */
    description: string;
    /** Lorebook entries */
    lorebook?: any[];
    /** Regex scripts */
    regex?: any[];
    /** CommonJS code */
    cjs?: string;
    /** Trigger scripts */
    trigger?: any[];
    /** Module ID */
    id: string;
    /** Low level system access */
    lowLevelAccess?: boolean;
    /** Hide icon in UI */
    hideIcon?: boolean;
    /** Background embedding */
    backgroundEmbedding?: string;
    /** Module assets */
    assets?: [string, string, string][];
    /** Module namespace */
    namespace?: string;
    /** Custom module toggle */
    customModuleToggle?: string;
    /** MCP module configuration */
    mcp?: any;
}

/**
 * User persona definition
 */
interface Persona {
    /** Persona prompt/description */
    personaPrompt: string;
    /** Persona name */
    name: string;
    /** Persona icon */
    icon: string;
    /** Use large portrait */
    largePortrait?: boolean;
    /** Persona ID */
    id?: string;
    /** Persona note */
    note?: string;
}

/**
 * Database subset with limited access to allowed keys only.
 * Plugins can only access these specific database properties for security.
 */
interface DatabaseSubset {
    /** Array of characters and group chats */
    characters?: any[];
    /** Risuai modules */
    modules?: RisuModule[];
    /** Enabled module IDs */
    enabledModules?: string[];
    /** Module integration settings */
    moduleIntergration?: string;
    /** Plugin V2 instances */
    pluginV2?: RisuPlugin[];
    /** User personas */
    personas?: Persona[];
    /** Plugin instances */
    plugins?: RisuPlugin[];
    /** Plugin custom storage object */
    pluginCustomStorage?: {[key: string]: any};
    /** AI temperature setting (0-100) */
    temperature?: number;
    /** Ask before removing messages */
    askRemoval?: boolean;
    /** Maximum context tokens */
    maxContext?: number;
    /** Maximum response tokens */
    maxResponse?: number;
    /** Frequency penalty (0-100) */
    frequencyPenalty?: number;
    /** Presence penalty (0-100) */
    PresensePenalty?: number;
    /** UI theme name */
    theme?: string;
    /** Text theme name */
    textTheme?: string;
    /** Line height setting */
    lineHeight?: number;
    /** Use separate models for auxiliary models */
    seperateModelsForAxModels?: boolean;
    /** Separate model configurations */
    seperateModels?: {
        memory: string;
        emotion: string;
        translate: string;
        otherAx: string;
    };
    /** Custom CSS styles */
    customCSS?: string;
    /** Custom GUI HTML */
    guiHTML?: string;
    /** Color scheme name */
    colorSchemeName?: string;
}

// ============================================================================
// SafeElement API
// ============================================================================

/**
 * SafeElement provides secure DOM manipulation with restricted access.
 * All methods are asynchronous.
 *
 * @example
 * ```typescript
 * const doc = risuai.getRootDocument();
 * const element = doc.querySelector('.my-element');
 *
 * // Set text content
 * await element.setTextContent('Hello World');
 *
 * // Add CSS class
 * await element.addClass('active');
 *
 * // Add event listener
 * const id = await element.addEventListener('click', async () => {
 *   console.log('Clicked!');
 * });
 * ```
 */
interface SafeElement {
    // ========== Element Manipulation ==========

    /**
     * Appends a child element
     * @param child - The child element to append
     */
    appendChild(child: SafeElement): Promise<void>;

    /**
     * Removes a child element
     * @param child - The child element to remove
     */
    removeChild(child: SafeElement): Promise<void>;

    /**
     * Replaces a child element with a new element
     * @param newChild - The new child element
     * @param oldChild - The old child element to replace
     */
    replaceChild(newChild: SafeElement, oldChild: SafeElement): Promise<void>;

    /**
     * Replaces this element with another element
     * @param newElement - The element to replace with
     */
    replaceWith(newElement: SafeElement): Promise<void>;

    /**
     * Clones this element
     * @param deep - If true, clones descendants as well
     * @returns A cloned SafeElement
     */
    cloneNode(deep?: boolean): Promise<SafeElement>;

    /**
     * Prepends a child element at the beginning
     * @param child - The child element to prepend
     */
    prepend(child: SafeElement): Promise<void>;

    /**
     * Removes this element from the DOM
     */
    remove(): Promise<void>;

    // ========== Text Content ==========

    /**
     * Gets the inner text of this element
     * @returns The inner text
     */
    innerText(): Promise<string>;

    /**
     * Gets the text content of this element
     * @returns The text content
     */
    textContent(): Promise<string | null>;

    /**
     * Sets the text content of this element
     * @param value - The text content to set
     */
    setTextContent(value: string): Promise<void>;

    /**
     * Sets the inner text of this element
     * @param value - The inner text to set
     */
    setInnerText(value: string): Promise<void>;

    // ========== HTML Content (Auto-Sanitized) ==========

    /**
     * Gets the inner HTML of this element
     * @returns The inner HTML
     */
    getInnerHTML(): Promise<string>;

    /**
     * Gets the outer HTML of this element
     * @returns The outer HTML
     */
    getOuterHTML(): Promise<string>;

    /**
     * Sets the inner HTML of this element (automatically sanitized with DOMPurify)
     * @param value - The HTML content to set (scripts will be removed)
     *
     * @example
     * ```typescript
     * // Safe HTML
     * await element.setInnerHTML('<div>Hello <strong>World</strong></div>');
     *
     * // Scripts are removed for security
     * await element.setInnerHTML('<script>alert("XSS")</script>'); // Results in empty element
     * ```
     */
    setInnerHTML(value: string): Promise<void>;

    /**
     * Sets the outer HTML of this element (automatically sanitized with DOMPurify)
     * @param value - The HTML content to set (scripts will be removed)
     */
    setOuterHTML(value: string): Promise<void>;

    // ========== Attributes (Restricted) ==========

    /**
     * Sets a custom attribute (only 'x-' prefixed attributes allowed)
     * @param name - Attribute name (must start with 'x-')
     * @param value - Attribute value
     * @throws Error if attribute name doesn't start with 'x-'
     *
     * @example
     * ```typescript
     * // ✅ Allowed
     * await element.setAttribute('x-plugin-id', 'my-id');
     *
     * // ❌ Not allowed - will throw error
     * await element.setAttribute('onclick', 'alert()'); // Error!
     * ```
     */
    setAttribute(name: string, value: string): Promise<void>;

    /**
     * Gets a custom attribute (only 'x-' prefixed attributes allowed)
     * @param name - Attribute name (must start with 'x-')
     * @returns The attribute value or null
     * @throws Error if attribute name doesn't start with 'x-'
     */
    getAttribute(name: string): Promise<string | null>;

    // ========== Styling ==========

    /**
     * Sets a style property
     * @param property - CSS property name
     * @param value - CSS property value
     *
     * @example
     * ```typescript
     * await element.setStyle('color', 'red');
     * await element.setStyle('fontSize', '16px');
     * ```
     */
    setStyle(property: string, value: string): Promise<void>;

    /**
     * Gets a style property value
     * @param property - CSS property name
     * @returns The style property value
     */
    getStyle(property: string): Promise<string>;

    /**
     * Gets the style attribute as a string
     * @returns The style attribute value
     */
    getStyleAttribute(): Promise<string>;

    /**
     * Sets the style attribute as a string
     * @param value - CSS style string
     *
     * @example
     * ```typescript
     * await element.setStyleAttribute('color: red; font-size: 16px; margin: 10px;');
     * ```
     */
    setStyleAttribute(value: string): Promise<void>;

    /**
     * Adds a CSS class
     * @param className - Class name to add
     */
    addClass(className: string): Promise<void>;

    /**
     * Removes a CSS class
     * @param className - Class name to remove
     */
    removeClass(className: string): Promise<void>;

    /**
     * Sets the class name(s)
     * @param className - Space-separated class names
     */
    setClassName(className: string): Promise<void>;

    /**
     * Gets the class name(s)
     * @returns Space-separated class names
     */
    getClassName(): Promise<string>;

    /**
     * Checks if element has a specific class
     * @param className - Class name to check
     * @returns True if element has the class
     */
    hasClass(className: string): Promise<boolean>;

    // ========== Focus ==========

    /**
     * Focuses this element
     */
    focus(): Promise<void>;

    // ========== Traversal and Querying ==========

    /**
     * Gets all child elements
     * @returns Array of child SafeElements
     */
    getChildren(): Promise<SafeElement[]>;

    /**
     * Gets the parent element
     * @returns Parent SafeElement or null
     */
    getParent(): Promise<SafeElement | null>;

    /**
     * Queries all descendant elements matching a selector
     * @param selector - CSS selector
     * @returns Array of matching SafeElements
     */
    querySelectorAll(selector: string): Promise<SafeElement[]>;

    /**
     * Queries the first descendant element matching a selector
     * @param selector - CSS selector
     * @returns Matching SafeElement or null
     */
    querySelector(selector: string): Promise<SafeElement | null>;

    /**
     * Gets an element by ID
     * @param id - Element ID
     * @returns SafeElement or null
     */
    getElementById(id: string): Promise<SafeElement | null>;

    /**
     * Gets elements by class name
     * @param className - Class name
     * @returns Array of matching SafeElements
     */
    getElementsByClassName(className: string): Promise<SafeElement[]>;

    /**
     * Checks if element matches a selector
     * @param selector - CSS selector
     * @returns True if element matches
     */
    matches(selector: string): Promise<boolean>;

    // ========== Dimensions and Position ==========

    /**
     * Gets the client height
     * @returns Client height in pixels
     */
    clientHeight(): Promise<number>;

    /**
     * Gets the client width
     * @returns Client width in pixels
     */
    clientWidth(): Promise<number>;

    /**
     * Gets the top border width
     * @returns Top border width in pixels
     */
    clientTop(): Promise<number>;

    /**
     * Gets the left border width
     * @returns Left border width in pixels
     */
    clientLeft(): Promise<number>;

    /**
     * Gets the bounding rectangle
     * @returns DOMRect object
     */
    getBoundingClientRect(): Promise<DOMRect>;

    /**
     * Gets all client rectangles
     * @returns DOMRectList object
     */
    getClientRects(): Promise<DOMRectList>;

    // ========== Node Information ==========

    /**
     * Gets the node name (tag name)
     * @returns Node name (e.g., "DIV")
     */
    nodeName(): Promise<string>;

    /**
     * Gets the node type
     * @returns Node type (1 for ELEMENT_NODE)
     */
    nodeType(): Promise<number>;

    // ========== Event Listeners ==========

    /**
     * Adds an event listener
     * @param type - Event type (limited to allowed events)
     * @param listener - Event handler function
     * @param options - Event listener options
     * @returns Unique listener ID for later removal
     *
     * Allowed events (unlimited):
     * - Mouse: click, dblclick, contextmenu, mousedown, mouseup, mousemove, mouseover, mouseleave
     * - Pointer: pointercancel, pointerdown, pointerenter, pointerleave, pointermove, pointerout, pointerover, pointerup
     * - Scroll: scroll, scrollend
     *
     * Allowed events (with random delay for anti-fingerprinting):
     * - Keyboard: keydown, keyup, keypress
     *
     * @example
     * ```typescript
     * const id = await element.addEventListener('click', async (event) => {
     *   console.log('Element clicked!');
     * });
     *
     * // Later, remove the listener
     * await element.removeEventListener('click', id);
     * ```
     */
    addEventListener(
        type: string,
        listener: (event: any) => void,
        options?: boolean | AddEventListenerOptions
    ): Promise<string>;

    /**
     * Removes an event listener using its ID
     * @param type - Event type
     * @param id - Listener ID returned by addEventListener
     * @param options - Event listener options
     */
    removeEventListener(
        type: string,
        id: string,
        options?: boolean | EventListenerOptions
    ): Promise<void>;

    /**
     * Unwraps a SafeClassArray into a standard array
     * @param safeArray - The SafeClassArray to unwrap
     * @returns Standard array of items
     */
    unwarpSafeArray<T>(safeArray: SafeClassArray<T>): Promise<T[]>;
}

// ============================================================================
// SafeDocument API
// ============================================================================

/**
 * SafeDocument extends SafeElement with document-specific methods.
 * Provides secure access to the main Risuai document.
 *
 * Note that this SHOULD NOT be used unless absolutely necessary.
 * use other risuai APIs whenever possible, especially using iframe UI
 * 
 * Additional restrictions might be added in the future for user safety, including breaking changes.
 * 
 * @example
 * ```typescript
 * const doc = risuai.getRootDocument();
 *
 * // Create elements (whitelist only)
 * const div = doc.createElement('div');
 * const button = doc.createElement('button');
 *
 * // Create anchor with URL validation
 * const link = doc.createAnchorElement('https://example.com');
 * ```
 */
interface SafeDocument extends SafeElement {
    /**
     * Creates an element (limited to whitelisted tags)
     * @param tagName - HTML tag name
     * @returns SafeElement
     *
     * @note Non-whitelisted tags are replaced with 'div'
     *
     * @example
     * ```typescript
     * const div = doc.createElement('div'); // ✅ Allowed
     * const custom = doc.createElement('custom-element'); // Creates <div> instead
     * ```
     */
    createElement(tagName: string): SafeElement;

    /**
     * Creates an anchor element with URL validation
     * @param href - URL for the anchor (only http/https allowed)
     * @returns SafeElement (anchor)
     *
     * @note Invalid URLs or non-http(s) protocols default to '#'
     *
     * @example
     * ```typescript
     * const link = doc.createAnchorElement('https://example.com'); // ✅ Valid
     * const bad = doc.createAnchorElement('javascript:alert()'); // href becomes '#'
     * ```
     */
    createAnchorElement(href: string): SafeElement;
}

// ============================================================================
// SafeClassArray
// ============================================================================

/**
 * SafeClassArray provides array-like access to collections with restricted operations.
 * This class is used for safe transfer of arrays of SafeElements or other classes.
 * All methods are asynchronous unlike standard arrays.
 *
 * @example
 * ```typescript
 * 
 * const safeArray = mySafeArray //provided from some API
 * 
 * // We recommend using helper function unwarpSafeArray and handle it
 * const array = await risuai.unwarpSafeArray(safeArray);
 * for(const item of array){
 *  console.log(item);
 * }
 * 
 * // You can still use the SafeClassArray methods directly though
 * const length = await safeArray.length();
 * for(let i = 0; i < length; i++){
 *   const item = await safeArray.at(i);
 *   console.log(item);
 * }
 * 
 * ```
 */
interface SafeClassArray<T> {
    /**
     * Gets an item at a specific index
     * @param index - Array index (supports negative indexing)
     * @returns Item at index or undefined
     */
    at(index: number): Promise<T | undefined>;

    /**
     * Gets the length of the array
     * @returns Number of items in array
     */
    length(): Promise<number>;

    /**
     * Adds an item to the end of the array
     * @param item - Item to add
     */
    push(item: T): Promise<void>;
}

// ============================================================================
// SafeMutationObserver
// ============================================================================

/**
 * Mutation record from SafeMutationObserver
 */
interface SafeMutationRecord {
    /** Type of mutation */
    getType(): Promise<string>;
    /** Target element of mutation */
    getTarget(): Promise<SafeElement>;
    /** Added nodes in mutation */
    getAddedNodes(): Promise<SafeClassArray<SafeElement>>;
}

/**
 * Callback for SafeMutationObserver
 */
type SafeMutationCallback = (mutations: SafeClassArray<SafeMutationRecord>) => void;

/**
 * SafeMutationObserver watches for DOM changes in the main document
 */
interface SafeMutationObserver {
    /**
     * Starts observing an element for changes
     * @param element - SafeElement to observe
     * @param options - MutationObserver options
     * @returns Promise that resolves when observer is set up
     */
    observe(element: SafeElement, options: MutationObserverInit): Promise<void>;
}

// ============================================================================
// Storage APIs
// ============================================================================

/**
 * Plugin-specific storage that syncs with save files
 *
 * **All methods return Promises** due to iframe message passing.
 *
 * @example
 * ```typescript
 * // Store data (async)
 * await risuai.pluginStorage.setItem('user_preference', 'dark_mode');
 * await risuai.pluginStorage.setItem('score', 42);
 *
 * // Retrieve data (async)
 * const pref = await risuai.pluginStorage.getItem('user_preference');
 *
 * // Get all keys (async)
 * const keys = await risuai.pluginStorage.keys();
 * ```
 */
interface PluginStorage {
    /**
     * Gets an item from storage
     * @param key - Storage key
     * @returns Promise resolving to stored value or null
     */
    getItem(key: string): Promise<any | null>;

    /**
     * Sets an item in storage
     * @param key - Storage key
     * @param value - Value to store (any JSON-serializable value)
     * @returns Promise that resolves when item is stored
     */
    setItem(key: string, value: any): Promise<void>;

    /**
     * Removes an item from storage
     * @param key - Storage key
     * @returns Promise that resolves when item is removed
     */
    removeItem(key: string): Promise<void>;

    /**
     * Clears all items from storage
     * @returns Promise that resolves when storage is cleared
     */
    clear(): Promise<void>;

    /**
     * Gets a key by index
     * @param index - Key index
     * @returns Promise resolving to key name or null
     */
    key(index: number): Promise<any | null>;

    /**
     * Gets all storage keys
     * @returns Promise resolving to array of key names
     */
    keys(): Promise<string[]>;

    /**
     * Gets the number of items in storage
     * @returns Promise resolving to item count
     */
    length(): Promise<number>;
}

/**
 * Device-specific storage shared between plugins
 * Same API as PluginStorage but only supports string values
 *
 * **All methods return Promises** due to iframe message passing.
 *
 * @example
 * ```typescript
 * await risuai.safeLocalStorage.setItem('device_id', 'unique-id');
 * const deviceId = await risuai.safeLocalStorage.getItem('device_id');
 * ```
 */
interface SafeLocalStorage {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    key(index: number): Promise<string | null>;
    length(): Promise<number>;
}

// ============================================================================
// Provider API
// ============================================================================

/**
 * Arguments passed to custom AI providers
 */
interface ProviderArguments {
    /** Chat message history */
    prompt_chat: OpenAIChat[];
    /** Temperature setting */
    temperature: number;
    /** Maximum tokens to generate */
    max_tokens: number;
    /** Frequency penalty */
    frequency_penalty: number;
    /** Minimum probability */
    min_p: number;
    /** Presence penalty */
    presence_penalty: number;
    /** Repetition penalty */
    repetition_penalty: number;
    /** Top-K sampling */
    top_k: number;
    /** Top-P sampling */
    top_p: number;
    /** Generation mode */
    mode: string;
}

/**
 * Provider response
 */
interface ProviderResponse {
    /** Whether the request was successful */
    success: boolean;
    /** Generated content (string or stream) */
    content: string | ReadableStream<string>;
}

/**
 * Provider function type
 */
type ProviderFunction = (
    args: ProviderArguments,
    abortSignal?: AbortSignal
) => Promise<ProviderResponse>;

/**
 * Provider options
 */
interface ProviderOptions {
    /** Tokenizer name (e.g., 'gpt-4') */
    tokenizer?: string;
    /** Custom tokenizer function */
    tokenizerFunc?: (content: string) => number[] | Promise<number[]>;
}

// ============================================================================
// Risuai Global API
// ============================================================================

/**
 * Risuai Plugin API v3.0
 *
 * All methods are accessed through the global `risuai` object.
 *
 * @important All methods are asynchronous unless otherwise noted.
 * Always use `await` or `.then()` when calling API methods.
 */
interface RisuaiPluginAPI {
    // ========== Version Information ==========

    /** API version string */
    apiVersion: string;

    /** Array of compatible API versions */
    apiVersionCompatibleWith: string[];

    // ========== Logging ==========

    /**
     * Logs a message with plugin identification
     * @deprecated Use console.log() instead
     * @param message - Message to log
     * @returns Promise that resolves when log is complete
     *
     * @example
     * ```typescript
     * await console.log('Plugin initialized');
     * // Output: [Risuai Plugin: YourPlugin] Plugin initialized
     * ```
     */
    log(message: string): Promise<void>;

    // ========== Container Management ==========

    /**
     * Shows the plugin's iframe container
     * @param mode - Display mode (currently only 'fullscreen')
     * @returns Promise that resolves when container is shown
     *
     * @example
     * ```typescript
     * await risuai.showContainer('fullscreen');
     *
     * // Build UI in your iframe
     * document.body.innerHTML = '<h1>My Plugin UI</h1>';
     * ```
     */
    showContainer(mode: ContainerMode): Promise<void>;

    /**
     * Hides the plugin's iframe container
     * @returns Promise that resolves when container is hidden
     */
    hideContainer(): Promise<void>;

    // ========== DOM Access ==========

    /**
     * Gets the root document for safe DOM access
     * @returns Promise resolving to SafeDocument for the main Risuai document
     *
     * @example
     * ```typescript
     * const doc = await risuai.getRootDocument();
     * const element = await doc.querySelector('.chat-container');
     * ```
     */
    getRootDocument(): Promise<SafeDocument>;

    /**
     * Creates a mutation observer for monitoring DOM changes
     * @param callback - Callback function for mutations
     * @returns Promise resolving to SafeMutationObserver instance
     */
    createMutationObserver(callback: SafeMutationCallback): Promise<SafeMutationObserver>;

    // ========== Character APIs ==========

    /**
     * Gets the current character
     * @returns Current character object
     *
     * @example
     * ```typescript
     * const char = await risuai.getCharacter();
     * console.log(`Current character: ${char.name}`);
     * ```
     */
    getCharacter(): Promise<any>;

    /**
     * Sets the current character
     * @param character - Character object to set
     *
     * @example
     * ```typescript
     * const char = await risuai.getCharacter();
     * char.name = 'New Name';
     * await risuai.setCharacter(char);
     * ```
     */
    setCharacter(character: any): Promise<void>;

    /**
     * @deprecated Use getCharacter() instead
     */
    getChar(): Promise<any>;

    /**
     * @deprecated Use setCharacter() instead
     */
    setChar(character: any): Promise<void>;

    // ========== Storage APIs ==========

    /** Plugin-specific storage (syncs with save files) */
    pluginStorage: PluginStorage;

    /** Device-specific storage (shared between plugins) */
    safeLocalStorage: SafeLocalStorage;

    /**
     * Gets a plugin argument value
     * @param key - Argument key (defined in plugin metadata)
     * @returns Argument value
     *
     * @example
     * ```typescript
     * // In metadata: //@arg api_key string Your API key
     * const apiKey = await risuai.getArgument('api_key');
     * ```
     */
    getArgument(key: string): Promise<string | number | undefined>;

    /**
     * Sets a plugin argument value
     * @param key - Argument key
     * @param value - Value to set
     */
    setArgument(key: string, value: string | number): Promise<void>;

    /**
     * @deprecated Use getArgument() instead
     */
    getArg(arg: string): any;

    /**
     * @deprecated Use setArgument() instead
     */
    setArg(arg: string, value: string | number): void;

    // ========== Database APIs ==========

    /**
     * Gets the database with limited access
     * @returns DatabaseSubset object (limited to allowed keys)
     *
     * Allowed keys: characters, modules, enabledModules, moduleIntergration,
     * pluginV2, personas, plugins, pluginCustomStorage, temperature, askRemoval,
     * maxContext, maxResponse, frequencyPenalty, PresensePenalty, theme,
     * textTheme, lineHeight, seperateModelsForAxModels, seperateModels,
     * customCSS, guiHTML, colorSchemeName
     *
     * @example
     * ```typescript
     * const db = await risuai.getDatabase();
     * console.log(db.characters);
     * ```
     */
    getDatabase(): Promise<DatabaseSubset>;

    /**
     * Sets the database (lightweight save)
     * @param db - DatabaseSubset object to save
     */
    setDatabaseLite(db: DatabaseSubset): Promise<void>;

    /**
     * Sets the database (full save with sync)
     * @param db - DatabaseSubset object to save
     */
    setDatabase(db: DatabaseSubset): Promise<void>;

    // ========== Network APIs ==========

    /**
     * Makes a native fetch request (bypasses Risuai networking)
     * @param url - Request URL
     * @param options - Fetch options
     * @returns Response promise
     */
    nativeFetch(url: string, options?: RequestInit): Promise<Response>;

    // ========== UI Registration ==========

    /**
     * Registers a settings menu item
     * @param name - Display name
     * @param callback - Callback function when clicked
     * @param icon - Icon content (HTML or image URL)
     * @param iconType - Icon type ('html', 'img', or 'none')
     *
     * @example
     * ```typescript
     * await risuai.registerSetting(
     *   'My Plugin Settings',
     *   async () => {
     *     risuai.showContainer('fullscreen');
     *     // Build settings UI...
     *   },
     *   '⚙️',
     *   'html'
     * );
     * ```
     */
    registerSetting(
        name: string,
        callback: () => void | Promise<void>,
        icon?: string,
        iconType?: IconType
    ): Promise<void>;


    /**
     * Registers a floating action button
     * @param name - Display name
     * @param arg - Button configuration
     * @param arg.icon - Icon content (HTML or image URL)
     * @param arg.iconType - Icon type ('html', 'img', or 'none')
     * @param arg.location - Button location ('action', 'chat', or 'hamburger')
     * @param callback - Callback function when clicked
     *
     * @example
     * ```typescript
     * await risuai.registerButton({
     *   name: 'My Action',
     *   icon: '🔥',
     *   iconType: 'html',
     *   location: 'action'
     * }, async () => {
     *     console.log('Action button clicked!');
     * });
     * ```
     */
    registerButton(arg:  {
        name: string,
        icon: string,
        iconType: 'html'|'img'|'none',
        location?: 'action'|'chat'|'hamburger'
    }, callback: () => void): Promise<void>;

    // ========== Provider APIs ==========

    /**
     * Adds a custom AI provider
     * @param name - Provider name
     * @param func - Provider function
     * @param options - Provider options
     *
     * @example
     * ```typescript
     * await risuai.addProvider(
     *   'MyProvider',
     *   async (args, abortSignal) => {
     *     const response = await risuai.risuFetch('https://api.example.com/chat', {
     *       method: 'POST',
     *       body: JSON.stringify({
     *         messages: args.prompt_chat,
     *         temperature: args.temperature
     *       }),
     *       signal: abortSignal
     *     });
     *     const data = await response.json();
     *     return {
     *       success: true,
     *       content: data.message
     *     };
     *   }
     * );
     * ```
     */
    addProvider(
        name: string,
        func: ProviderFunction,
        options?: ProviderOptions
    ): Promise<void>;

    // ========== Script Handlers ==========

    /**
     * Adds a script handler for text processing
     * @param mode - Handler mode
     * @param func - Handler function
     *
     * Modes:
     * - 'display': Modify text before displaying to user
     * - 'output': Modify text before sending to AI
     * - 'input': Modify user input
     * - 'process': Process text during generation
     *
     * @example
     * ```typescript
     * await risuai.addRisuScriptHandler('display', async (text) => {
     *   return text.toUpperCase();
     * });
     * ```
     */
    addRisuScriptHandler(
        mode: ScriptMode,
        func: (content: string) => string | null | undefined | Promise<string | null | undefined>
    ): Promise<void>;

    /**
     * Removes a script handler
     * @param mode - Handler mode
     * @param func - Handler function to remove
     */
    removeRisuScriptHandler(
        mode: ScriptMode,
        func: (content: string) => string | null | undefined | Promise<string | null | undefined>
    ): Promise<void>;

    // ========== Replacers ==========

    /**
     * Adds a replacer for modifying messages
     * @param type - Replacer type
     * @param func - Replacer function
     *
     * Types:
     * - 'beforeRequest': Modify messages before sending to AI
     * - 'afterRequest': Modify response after receiving from AI
     *
     * @example
     * ```typescript
     * // Modify messages before sending
     * await risuai.addRisuReplacer('beforeRequest', async (messages, type) => {
     *   return messages.map(msg => ({
     *     ...msg,
     *     content: msg.content + ' [Enhanced]'
     *   }));
     * });
     *
     * // Modify response after receiving
     * await risuai.addRisuReplacer('afterRequest', async (content, type) => {
     *   return content.replace(/bad/gi, '***');
     * });
     * ```
     */
    addRisuReplacer(
        type: 'beforeRequest',
        func: (messages: OpenAIChat[], type: string) => OpenAIChat[] | Promise<OpenAIChat[]>
    ): Promise<void>;
    addRisuReplacer(
        type: 'afterRequest',
        func: (content: string, type: string) => string | Promise<string>
    ): Promise<void>;

    /**
     * Removes a replacer
     * @param type - Replacer type
     * @param func - Replacer function to remove
     */
    removeRisuReplacer(
        type: ReplacerType,
        func: Function
    ): Promise<void>;

    // ========== Asset Management ==========

    /**
     * Reads an image asset
     * @param path - Asset path
     * @returns Image data
     */
    readImage(path?: string): Promise<any>;

    /**
     * Saves an asset
     * @param data - Asset data
     * @param path - Asset path
     */
    saveAsset(data: any, path?: string): Promise<void>;

    // ========== Plugin Management ==========

    /**
     * Reloads all plugins
     */
    loadPlugins(): Promise<void>;

    /**
     * Registers an unload function called when plugin is unloaded
     */
    onUnload(func: () => void | Promise<void>): Promise<void>;

    // ========== Internal Methods ==========

    /**
     * @internal Gets old API keys (for debugging/compatibility)
     */
    _getOldKeys(): Promise<string[]>;
}

// ============================================================================
// Global Declaration
// ============================================================================

/**
 * Global Risuai API object available in all plugins
 */
declare const risuai: RisuaiPluginAPI;

/**
 * Global Risuai API object available in all plugins, alias for `risuai`
 */
declare const Risuai: RisuaiPluginAPI;
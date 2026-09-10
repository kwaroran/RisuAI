/**
 * Risuai Plugin API v3.0 Type Definitions
 *
 * This file provides TypeScript type definitions for the Risuai Plugin API v3.0.
 * All API methods are accessed through the global `risuai` object.
 * All API methods that isn't documented here are considered internal or subject to change without deprecation, and should not be used by plugin developers.
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
// MCP Types
// ============================================================================

/**
 * Inlay asset shape returned by `risuai.readInlay`.
 * `data` is a base64 data-URI string (e.g. `"data:image/png;base64,iVBORw0..."`).
 */
interface InlayAssetForPlugin {
    /** Base64 data-URI string (`data:<mime>;base64,...`) */
    data: string;
    /** File extension without leading dot (e.g. `"png"`, `"webp"`, `"mp3"`) */
    ext: string;
    /** Original asset filename */
    name: string;
    /** Asset category */
    type: 'image' | 'video' | 'audio' | 'signature';
    /** Pixel height (for images/videos) */
    height?: number;
    /** Pixel width (for images/videos) */
    width?: number;
}

/**
 * MCP tool definition
 */
interface MCPToolDef {
    /** Tool name */
    name: string;
    /** Tool description */
    description: string;
    /** JSON schema for input validation */
    inputSchema: any;
    /** Annotations for the tool, can be used for documentation or metadata */
    annotations?: any;
}

/**
 * Text content returned from an MCP tool call
 */
interface MCPToolCallTextContent {
    type: 'text';
    text: string;
}

/**
 * Image or audio content returned from an MCP tool call
 */
interface MCPToolCallImageAudioContent {
    type: 'image' | 'audio';
    /** Base64 encoded data */
    data: string;
    /** e.g. 'image/png', 'image/jpeg' */
    mimeType: string;
}

/**
 * Resource content returned from an MCP tool call
 */
interface MCPToolCallResourceContent {
    type: 'resource';
    resource: {
        uri: string;
        mimeType: string;
        text: string;
    };
}

/**
 * Content types that can be returned from an MCP tool call
 */
type MCPToolCallContent = MCPToolCallTextContent | MCPToolCallImageAudioContent | MCPToolCallResourceContent;

// ============================================================================
// TTS Hook Types
// ============================================================================

/**
 * Context passed to a TTS preprocessor hook. Preprocessors receive the text
 * that is about to be spoken and may transform it before synthesis.
 */
interface BeforeTTSContext {
    /** The text that will be sent to the TTS provider. */
    text: string;
    /** The provider the current character is configured to use (e.g. 'openai', 'gptsovits'). */
    ttsMode: string;
    /** The stable character id (character.chaId). Use risuai.getCharacter() if you need the full object. */
    characterId: string;
}

/**
 * Return value of a TTS preprocessor hook. Omit fields to leave them unchanged.
 */
interface BeforeTTSResult {
    /** Replace the text that will be synthesized. */
    text?: string;
    /** If true, abort the entire TTS playback for this message (no subsequent hooks run, no audio is played). */
    skip?: boolean;
}

/**
 * Context passed to a TTS postprocessor hook. Postprocessors receive the raw
 * encoded audio bytes returned by the provider, before they are decoded for
 * playback. To access PCM, call `await new AudioContext().decodeAudioData(ctx.audio)`.
 */
interface AfterTTSContext {
    /** Raw encoded audio as returned by the provider (mp3, wav, etc.). */
    audio: ArrayBuffer;
    /** MIME type of the audio (e.g. 'audio/mpeg', 'audio/wav'). Best-effort. */
    mimeType: string;
    /** The provider that produced this audio. */
    ttsMode: string;
    /** Stable character id. */
    characterId: string;
}

/**
 * Return value of a TTS postprocessor hook. Omit fields to leave them unchanged.
 */
interface AfterTTSResult {
    /** Replace the audio bytes that will be played. If you change the codec, set mimeType too. */
    audio?: ArrayBuffer;
    /** Updated MIME type (if you changed the codec). */
    mimeType?: string;
    /** If true, skip playback entirely (hooks after this one are not called). */
    skip?: boolean;
}

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
 * Returned response for UI part registration
 */

interface UIPartResponse {
    id: string;
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
 * Argument passed to chat lifecycle listeners
 */
type ChatOutputListenerArg = {
    /** Current character */
    char: any;
    /** Current chat */
    chat: any;
    /** Index of the character in the database. Use with `setCharacterToIndex`. */
    characterIndex: number;
    /** Index of the chat within the character. Use with `setChatToIndex`. */
    chatIndex: number;
    /** Current index of the generated message in `chat.message`, or -1 if it is no longer present */
    messageIndex: number;
};

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
// Color Scheme & Text Theme Types
// ============================================================================

/**
 * Color scheme definition for UI theming.
 */
interface ColorScheme {
    bgcolor: string;
    darkbg: string;
    borderc: string;
    selected: string;
    draculared: string;
    textcolor: string;
    textcolor2: string;
    darkBorderc: string;
    darkbutton: string;
    type: 'light' | 'dark';
}

/**
 * Custom text theme definition for chat text colors.
 */
interface CustomTextTheme {
    FontColorStandard: string;
    FontColorBold: string;
    FontColorItalic: string;
    FontColorItalicBold: string;
    FontColorQuote1: string;
    FontColorQuote2: string;
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
     * @returns SafeClassArray of child SafeElements
     */
    getChildren(): Promise<SafeClassArray<SafeElement>>;

    /**
     * Gets the parent element
     * @returns Parent SafeElement or null
     */
    getParent(): Promise<SafeElement | null>;

    /**
     * Queries all descendant elements matching a selector
     * @param selector - CSS selector
     * @returns SafeClassArray of matching SafeElements
     */
    querySelectorAll(selector: string): Promise<SafeClassArray<SafeElement>>;

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
     * @returns SafeClassArray of matching SafeElements
     */
    getElementsByClassName(className: string): Promise<SafeClassArray<SafeElement>>;

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
     * Allowed events (without delay):
     * - Mouse: click, dblclick, contextmenu, mousedown, mouseup, mousemove, mouseover, mouseleave
     * - Pointer: pointercancel, pointerdown, pointerenter, pointerleave, pointermove, pointerout, pointerover, pointerup
     * - Scroll: scroll, scrollend
     *
     * Allowed events (with random delay for anti-fingerprinting):
     * - Keyboard: keydown, keyup, keypress
     *
     * listener function receives trimmed event object with common properties only.
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
     * Scrolls the element into view
     * @param options - Scroll options or boolean for alignment
     */
    scrollIntoView(options?: boolean | ScrollIntoViewOptions): Promise<void>;
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

    /**
     * Stops observing all target elements for changes
     */
    disconnect(): Promise<void>;
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
 * Device-local storage that persists outside of save files.
 * Uses generic types for flexible value storage.
 * Storage is shared between all plugins under a common prefix.
 *
 * **All methods return Promises** due to iframe message passing.
 *
 * @example
 * ```typescript
 * const storage = await risuai.getLocalPluginStorage();
 *
 * // Store any JSON-serializable data
 * await storage.setItem('config', { theme: 'dark', fontSize: 14 });
 *
 * // Retrieve data with type safety
 * const config = await storage.getItem<{ theme: string; fontSize: number }>('config');
 *
 * // List all keys
 * const keys = await storage.keys();
 *
 * // Clear all plugin data
 * await storage.clear();
 * ```
 */
interface SafeLocalPluginStorage {
    /**
     * Gets an item from storage
     * @param key - Storage key
     * @returns Promise resolving to stored value or null
     */
    getItem<T>(key: string): Promise<T | null>;

    /**
     * Sets an item in storage
     * @param key - Storage key
     * @param value - Value to store (any JSON-serializable value)
     * @returns Promise that resolves when item is stored
     */
    setItem<T>(key: string, value: T): Promise<void>;

    /**
     * Removes an item from storage
     * @param key - Storage key
     * @returns Promise that resolves when item is removed
     */
    removeItem(key: string): Promise<void>;

    /**
     * Gets all storage keys
     * @returns Promise resolving to array of key names
     */
    keys(): Promise<string[]>;

    /**
     * Clears all items from storage
     * @returns Promise that resolves when storage is cleared
     */
    clear(): Promise<void>;
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

        /**
     * Gets a character by index
     * @param index - Character index
     * @returns Character object or null if not found
     */
    getCharacterFromIndex(index: number): Promise<any|null>;

    /**
     * Saves a character at a specific index
     * @param index - Character index
     * @param character - Character object to save
     */
    setCharacterToIndex(index: number, character: any): Promise<void>;

    /**
     * Gets a chat by index
     * @param characterIndex - Character index
     * @param chatIndex - Chat index
     * @returns Chat object or null if not found
     */
    getChatFromIndex(characterIndex: number, chatIndex: number): Promise<any|null>;

    /**
     * Parses Risu CBS macros using the currently selected character and active chat.
     * Set processRegex to also run the editprocess script pipeline after CBS parsing.
     * The editprocess pipeline can invoke plugin script handlers and action scripts,
     * which may modify the active chat.
     * @param text - Text containing CBS macros
     * @param options - Parser context options
     * @returns Parsed text
     *
     * @example
     * ```typescript
     * const text = await risuai.parseRisuChat('Hello, {{user}}', {
     *   role: 'user',
     *   processRegex: true,
     * });
     * ```
     */
    parseRisuChat(text: string, options?: {
        /** Existing message index used by chat-aware CBS macros. Defaults to -1. */
        messageIndex?: number;
        /** Message role used by role-aware CBS macros. */
        role?: string;
        /**
         * Run the editprocess script pipeline after CBS parsing.
         * This can invoke plugin handlers and action scripts that modify the active chat.
         */
        processRegex?: boolean;
        /** Enable chat variable writes from CBS macros. */
        runVar?: boolean;
        /** Remove unresolved variable macros. */
        rmVar?: boolean;
        /** Use tokenizer-accurate parsing behavior where supported. */
        tokenizeAccurate?: boolean;
        /** Additional CBS condition flags. */
        cbsConditions?: {
            firstmsg?: boolean;
            chatRole?: string;
        };
    }): Promise<string>;
    

    /**
     * Saves a chat at a specific index
     * @param characterIndex - Character index
     * @param chatIndex - Chat index
     * @param chat - Chat object to save
     */
    setChatToIndex(characterIndex: number, chatIndex: number, chat: any): Promise<void>;

    /**
     * Gets the current character index
     * @returns Current character index
     */
    getCurrentCharacterIndex(): Promise<number>;

    /**
     * Gets the current chat index
     * @returns Current chat index
     */
    getCurrentChatIndex: () => Promise<number>;

    /**
     * Gets raw lorebook entries for the current character or group, the
     * current chat, and currently active modules.
     *
     * This does not apply lorebook activation or token budget filtering.
     *
     * @returns Raw lorebook entries from the current character/chat/module sources
     */
    getCurrentLorebookEntries(): Promise<any[]>;

    // ========== Storage APIs ==========

    /** Plugin-specific storage (syncs with save files) */
    pluginStorage: PluginStorage;

    /** Device-specific storage (shared between plugins) */
    safeLocalStorage: SafeLocalStorage;

    /**
     * Gets a device-local storage instance shared between plugins
     * @returns SafeLocalPluginStorage instance for device-local storage
     *
     * @example
     * ```typescript
     * const storage = await risuai.getLocalPluginStorage();
     * await storage.setItem('myKey', { data: 'value' });
     * const value = await storage.getItem('myKey');
     * ```
     */
    getLocalPluginStorage(): Promise<SafeLocalPluginStorage>;

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
     * @param includeOnly - Array of keys to include or 'all' for all allowed keys. defaults to 'all'.
     * @returns DatabaseSubset object (limited to allowed keys) or null if consent not given
     *
     * Allowed keys: characters, modules, enabledModules, moduleIntergration,
     * pluginV2, personas, plugins, pluginCustomStorage, temperature, askRemoval,
     * maxContext, maxResponse, frequencyPenalty, PresensePenalty, theme,
     * textTheme, lineHeight, seperateModelsForAxModels, seperateModels,
     * customCSS, guiHTML, colorSchemeName, characterOrder, selectedPersona
     *
     * Use includeOnly to limit which keys to retrieve for better performance.
     * 
     * @example
     * ```typescript
     * const db = await risuai.getDatabase();
     * if(db) {
     *   console.log(db.characters);
     * }
     * ```
     */
    getDatabase(includeOnly:string[]|'all' = 'all'): Promise<DatabaseSubset|null>;

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

    // ========== Color Scheme APIs ==========

    /**
     * Change to a preset color scheme by name.
     * Available presets: 'default', 'dark', 'light', 'cherry', 'galaxy', 'nature', 'realblack', 'monokai-light', 'monokai-black'
     * @param name - Preset color scheme name
     */
    changeColorScheme(name: string): Promise<void>;

    /**
     * Apply a custom color scheme. Automatically sets colorSchemeName to 'custom'.
     * @param scheme - ColorScheme object with all color values
     */
    setColorScheme(scheme: ColorScheme): Promise<void>;

    /**
     * Get the current color scheme name and values.
     * @returns Object with name and scheme
     */
    getColorScheme(): Promise<{ name: string; scheme: ColorScheme }>;

    // ========== Text Theme APIs ==========

    /**
     * Change to a preset text theme.
     * @param name - 'standard' | 'highcontrast'
     */
    changeTextTheme(name: string): Promise<void>;

    /**
     * Apply a custom text theme. Automatically sets textTheme to 'custom'.
     * @param theme - CustomTextTheme object with all font color values
     */
    setCustomTextTheme(theme: CustomTextTheme): Promise<void>;

    /**
     * Get the current text theme name and custom theme values.
     * @returns Object with name and customTheme
     */
    getTextTheme(): Promise<{ name: string; customTheme: CustomTextTheme }>;

    // ========== Network APIs ==========

    /**
     * Makes a native fetch request (bypasses Risuai networking)
     * @param url - Request URL
     * @param options - Fetch options
     * @returns Response promise
     */
    nativeFetch(url: string, options?: RequestInit): Promise<Response>;

    /**
     * Saves a secret header for network requests, for protected Headers (like Authorization) that are stripped by Risuai for security.
     * To use saved secret headers, use an object `{ secretHeader: 'Header-Name' }` in the `headers` field of `nativeFetch` options,
     * Like `{ headers: {"Authorization":{ secretHeader: 'Authorization' }} }`
     * @m This API is work in progress and may have breaking changes in the future.
     * @param key - Header key (e.g., 'Authorization')
     * @param value - Header value.
     */
    saveSecretHeader(key: string, prefix: string, value: string|string[]): Promise<void>;

    // ========== UI Registration ==========

    /**
     * Registers a settings menu item.
     * If `id` is provided and a setting with that ID already exists, it will be replaced in-place (preserving position).
     *
     * @param name - Display name
     * @param callback - Callback function when clicked
     * @param icon - Icon content (HTML or image URL)
     * @param iconType - Icon type ('html', 'img', or 'none')
     * @param id - Optional stable ID. If omitted, a UUID is generated. If provided and already registered, the existing entry is replaced in-place.
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
     *   'html',
     *   'my-plugin-settings'
     * );
     * ```
     */
    registerSetting(
        name: string,
        callback: () => void | Promise<void>,
        icon?: string,
        iconType?: IconType,
        id?: string
    ): Promise<UIPartResponse>;


    /**
     * Registers a floating action button.
     * If `id` is provided and a button with that ID already exists, it will be replaced in-place (preserving position).
     * When replacing, the button stays in its original location store regardless of the `location` parameter.
     *
     * @param arg - Button configuration
     * @param arg.name - Display name
     * @param arg.icon - Icon content (HTML or image URL)
     * @param arg.iconType - Icon type ('html', 'img', or 'none')
     * @param arg.location - Button location ('action', 'chat', or 'hamburger'). Ignored when replacing an existing button.
     * @param arg.id - Optional stable ID. If omitted, a UUID is generated. If provided and already registered, the existing button is replaced in-place.
     * @param callback - Callback function when clicked
     *
     * @example
     * ```typescript
     * // First registration
     * await risuai.registerButton({
     *   name: 'My Action',
     *   icon: '🔥',
     *   iconType: 'html',
     *   location: 'action',
     *   id: 'my-plugin-action'
     * }, async () => {
     *     console.log('Action button clicked!');
     * });
     *
     * // Later: replace in-place (position preserved)
     * await risuai.registerButton({
     *   name: 'Updated Action',
     *   icon: '✨',
     *   iconType: 'html',
     *   id: 'my-plugin-action'
     * }, async () => {
     *     console.log('Updated!');
     * });
     * ```
     */
    registerButton(arg:  {
        name: string,
        icon: string,
        iconType: 'html'|'img'|'none',
        location?: 'action'|'chat'|'hamburger',
        id?: string
    }, callback: () => void): Promise<UIPartResponse>;

    /**
     * Unregisters a UI part
     * @param id - UI part ID returned during registration
     */
    unregisterUIPart(id: string): Promise<void>;

    // ========== MCP APIs ==========

    /**
     * Registers a custom MCP (Model Context Protocol) module
     * @param arg - MCP module configuration
     * @param arg.identifier - Unique identifier (must start with 'plugin:')
     * @param arg.name - Display name of the MCP module
     * @param arg.version - Version string
     * @param arg.description - Description of the MCP module
     * @param getToolList - Function that returns the list of available tools
     * @param callTool - Function that handles tool invocations
     *
     * @example
     * ```typescript
     * await risuai.registerMCP(
     *   {
     *     identifier: 'plugin:my-tools',
     *     name: 'My Tools',
     *     version: '1.0.0',
     *     description: 'Custom tools for my plugin'
     *   },
     *   async () => [{
     *     name: 'hello',
     *     description: 'Says hello',
     *     inputSchema: { type: 'object', properties: { name: { type: 'string' } } }
     *   }],
     *   async (toolName, content) => [{
     *     type: 'text',
     *     text: `Hello, ${content.name}!`
     *   }]
     * );
     * ```
     */
    registerMCP(
        arg: {
            identifier: string;
            name: string;
            version: string;
            description: string;
        },
        getToolList: () => Promise<MCPToolDef[]>,
        callTool: (toolName: string, content: any) => Promise<MCPToolCallContent[]>
    ): Promise<void>;

    /**
     * Unregisters a previously registered MCP module
     * @param identifier - The identifier used when registering the MCP module
     *
     * @example
     * ```typescript
     * await risuai.unregisterMCP('plugin:my-tools');
     * ```
     */
    unregisterMCP(identifier: string): Promise<void>;

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
     *     const response = await risuai.nativeFetch('https://api.example.com/chat', {
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

    // ========== TTS Hooks ==========

    /**
     * Registers a preprocessor that runs before every TTS synthesis.
     * The hook may transform the text or abort playback by returning `{ skip: true }`.
     *
     * Multiple preprocessors run sequentially in registration order — each hook
     * receives the previous hook's output. If a hook throws, its result is
     * discarded and the next hook runs.
     *
     * No timeout is enforced on hook execution (consistent with
     * `addRisuScriptHandler` and `addRisuReplacer`), so a hook that hangs will
     * stall TTS playback for that message. Plugins that call slow services
     * (auxiliary LLMs, remote analysis) should implement their own
     * `AbortController` + timer if cancellation is needed.
     *
     * Applies to all providers (including 'webspeech'). No permission prompt.
     * Auto-unregistered when the plugin unloads.
     *
     * @example
     * ```typescript
     * await risuai.addTTSPreprocessor(async (ctx) => {
     *   if (ctx.ttsMode !== 'openai') return;
     *   return { text: ctx.text.replace(/\*(.*?)\*/g, '') };
     * });
     * ```
     */
    addTTSPreprocessor(
        func: (ctx: BeforeTTSContext) => Promise<BeforeTTSResult | void> | BeforeTTSResult | void,
    ): Promise<void>;

    /**
     * Registers a postprocessor that runs after synthesis, just before playback.
     * The hook receives the raw encoded audio bytes and may return replacement
     * audio (with optional new mimeType) or `{ skip: true }` to suppress playback.
     *
     * Sequential pipeline semantics identical to `addTTSPreprocessor`. No
     * timeout is enforced on hook execution; plugins that perform long-running
     * audio transforms should self-manage cancellation.
     *
     * Skipped for the 'webspeech' provider (browser-native synthesis does not
     * produce an audio buffer) and the 'vits' provider (uses a separate playback
     * path that does not flow through the shared helper).
     *
     * @example
     * ```typescript
     * await risuai.addTTSPostprocessor(async (ctx) => {
     *   const audioBuffer = await new AudioContext().decodeAudioData(ctx.audio);
     *   // ... analyse / normalize / re-encode ...
     *   return { audio: normalizedBytes, mimeType: 'audio/wav' };
     * });
     * ```
     */
    addTTSPostprocessor(
        func: (ctx: AfterTTSContext) => Promise<AfterTTSResult | void> | AfterTTSResult | void,
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

    // ========== Chat Listeners ==========

    /**
     * Adds a listener that fires after a model output has been processed and
     * committed to the chat.
     *
     * The listener runs once per output event after streaming completes, after the
     * existing Lua `output` trigger has finished, and after host-side output
     * transformations such as inlay screen processing have been written to the chat.
     * Listeners are awaited sequentially and receive the same event snapshot. A slow
     * listener delays the remaining chat flow. To run background work without
     * blocking, fire off an async function without awaiting it inside the listener.
     *
     * The listener receives plain snapshots of `char` and the committed chat,
     * matching the convention of `getCharacterFromIndex` / `getChatFromIndex`.
     * Mutations to those snapshots do not propagate back to the host. To persist
     * changes from background work, use `characterIndex`, `chatIndex`, and
     * `messageIndex` with APIs such as `setChatToIndex`. If you need to merge with
     * changes saved by another listener, read the latest chat with `getChatFromIndex`
     * before saving.
     *
     * The `characterIndex` and `chatIndex` are captured when the listener fires,
     * so background work can locate the original chat even if the user navigates
     * elsewhere. `messageIndex` is resolved against the provided chat snapshot and
     * points to the model output message when it is still present. It may be -1 if a
     * Lua output trigger or host-side output processing removed that message.
     *
     * Modes:
     * - 'output': fires after an AI message is appended to or updated in the chat
     *
     * @param mode - Listener mode
     * @param func - Listener function. Receives the current character, chat, and generated message index.
     *
     * @example
     * ```typescript
     * await risuai.addRisuChatListener('output', async ({ chat, messageIndex }) => {
     *   const message = chat.message[messageIndex];
     *   if (!message) return;
     *   console.log('Model said:', message.data);
     * });
     * ```
     */
    addRisuChatListener(
        mode: 'output',
        func: (arg: ChatOutputListenerArg) => void | Promise<void>
    ): Promise<void>;

    /**
     * Removes a chat listener.
     * @param mode - Listener mode
     * @param func - Listener function to remove
     */
    removeRisuChatListener(
        mode: 'output',
        func: (arg: ChatOutputListenerArg) => void | Promise<void>
    ): Promise<void>;

    // ========== Body Interceptors ==========

    /**
     * Registers a body interceptor that can read and replace HTTP request bodies on LLM requests.
     * Sensitive fields like API keys are excluded from the body passed to the callback.
     * Requires 'replacer' permission.
     *
     * @param callback - Function that receives the request body and request type, and returns the modified body
     * @returns Object with an `id` for later unregistration, or null if permission was denied
     *
     * @example
     * ```typescript
     * const interceptor = await risuai.registerBodyIntercepter(async (body, type) => {
     *   body.temperature = 0.5;
     *   return body;
     * });
     *
     * // Later, unregister:
     * if (interceptor) {
     *   await risuai.unregisterBodyIntercepter(interceptor.id);
     * }
     * ```
     */
    registerBodyIntercepter(
        callback: (body: any, type: string) => any
    ): Promise<{ id: string } | null>;

    /**
     * Unregisters a previously registered body interceptor
     * @param id - The interceptor ID returned by registerBodyIntercepter
     *
     * @example
     * ```typescript
     * await risuai.unregisterBodyIntercepter(interceptor.id);
     * ```
     */
    unregisterBodyIntercepter(id: string): Promise<void>;

    // ========== Asset Management ==========

    /**
     * Reads an image asset
     * @param path - Asset path
     * @returns Image data
     */
    readImage(path?: string): Promise<any>;

    /**
     * Reads an inlay asset (image / audio / video / signature) attached by the
     * user in chat, by its UUID. The UUID can be extracted from raw message
     * text via the `{{inlayed::<uuid>}}` placeholder
     * (`getChatFromIndex(...).message[i].data`).
     *
     * Returns `null` if no asset exists for that UUID.
     *
     * @param id - Inlay UUID
     * @returns Asset with `data` as a base64 data-URI string, or `null`
     *
     * @example
     * ```typescript
     * const m = rawMessageData.match(/\{\{inlayed::([a-f0-9-]+)\}\}/i);
     * if (m) {
     *     const inlay = await risuai.readInlay(m[1]);
     *     // inlay.data === "data:image/png;base64,iVBORw0..."
     *     // inlay.ext  === "png"
     *     // inlay.type === "image"
     * }
     * ```
     */
    readInlay(id: string): Promise<InlayAssetForPlugin | null>;

    /**
     * Saves an asset
     * @param data - Asset data
     * @returns Saved asset path
     */
    saveAsset(data: any): Promise<string>;

    /**
     * Creates an inlay from image data, embeddable in chat messages via the
     * `{{inlay::id}}` syntax. Unlike `saveAsset`, inlays live in inlay storage
     * rather than the character card, so generating many images does not grow
     * the card. The image is re-encoded as PNG (animated GIF/WEBP keep only the
     * first frame) and downscaled to fit 1024x1024 total pixels, matching the
     * built-in image generation inlays.
     *
     * @param data - Image bytes (JPEG, PNG, GIF, WEBP, ...) as a Uint8Array, or
     * an image data URI string. Remote URLs are rejected — fetch them with
     * `nativeFetch` and pass the bytes. The Uint8Array's buffer is transferred
     * to the host and detached after the call; pass a copy if you still need it.
     * @param options - `name` sets the display name in the inlay explorer; defaults to the id.
     * @returns The inlay id; insert `{{inlay::<id>}}` into a message to render it.
     * @throws Error if the data is not decodable image data, or the string is not a data URI.
     *
     * @example
     * ```typescript
     * const id = await risuai.createInlay(imageBytes, { name: 'generated.png' });
     * // then insert `{{inlay::${id}}}` into a chat message
     * ```
     */
    createInlay(data: Uint8Array | string, options?: { name?: string }): Promise<string>;

    // ========== Plugin Management ==========

    /**
     * Reloads all plugins
     */
    loadPlugins(): Promise<void>;

    /**
     * Registers an unload function called when plugin is unloaded
     */
    onUnload(func: () => void | Promise<void>): Promise<void>;

    /**
     * Gets the fetch logs
     * @returns Array of fetch log entries or null if consent not given
    */
    getFetchLogs(): Promise<{
        url: string;
        body: string;
        status?: number;
        response?: string;
        error?: string;
        timestamp: number;
    }[]|null>;

    /**
     * Checks and corrects character order in the database
     */
    checkCharOrder(): Promise<void>;

    /**
     * Gets runtime information about Risuai environment
     * @returns Object containing apiVersion, platform, and saveMethod
     */
    getRuntimeInfo(): Promise<{
        apiVersion: string;
        platform: string;
        saveMethod: string;
    }>

    /**
     * Requests permission for a specific action
     * @param permission - Permission string (e.g. 'fetchLogs'|'db'|'mainDom')
     * @returns True if permission granted, false otherwise
     */
    requestPluginPermission(permission: string): Promise<boolean>;

    /**
     * Unwraps a SafeClassArray into a standard array
     * @param safeArray - The SafeClassArray to unwrap
     * @returns Standard array of items
     */
    unwarpSafeArray<T>(safeArray: SafeClassArray<T>): Promise<T[]>;

    /**
     * Searches the LLM translation cache for entries whose key contains the given partial key
     * @param partialKey - A substring to match against cache keys
     * @returns Array of matching cache entries with key and value
     */
    searchTranslationCache(partialKey: string): Promise<{key: string, value: string}[]>;

    /**
     * Gets a single entry from the LLM translation cache by exact key
     * @param key - The exact cache key to look up
     * @returns The cached translation or null if not found
     */
    getTranslationCache(key: string): Promise<string | null>;

    /**
     * Registers a listener for a named plugin channel (IPC between plugins).
     * @param channelName - The channel name to listen on (scoped to this plugin)
     * @param callback - Function to call when a message is received on this channel
     * @remarks This API is subject to change. API might be changed, deprecated, or removed in the future without prior notice.
     */
    addPluginChannelListener(channelName: string, callback: Function): Promise<void>;

    /**
     * Sends a message to another plugin's named channel (IPC between plugins).
     * @param pluginName - The internal name of the target plugin
     * @param channelName - The channel name to post to
     * @param message - The message payload to send
     * @remarks This API is subject to change. API might be changed, deprecated, or removed in the future without prior notice.
     */
    postPluginChannelMessage(pluginName: string, channelName: string, message: any): Promise<void>;

    // ========== Model Requesters ==========

    /**
     * Runs a request through a specified LLM model with given messages and options.
     * @param options - Options for the LLM request
     * @param options.messages - Array of chat messages to send to the model
     * @param options.staticModel - Optional static model name to use (e.g., 'gpt-4')
     * @param options.mode - Request mode
     * @param options.allowPlugins - If true, allow the call to resolve to a
     *   plugin-provided model (`pluginmodel:::*`). Default is false: plugin
     *   models are blocked to guard against accidental IPC loops between
     *   provider plugins. Opt in when the plugin legitimately needs to use
     *   the user's plugin-supplied main or auxiliary model (e.g. a TTS
     *   preprocessor rewriting text with the configured otherAx model).
     *   Loop avoidance becomes the opting-in plugin's responsibility.
     * @returns The model's response, which may be a string or a stream depending on the mode
     */
    runLLMModel(options: {
        messages: any[];
        staticModel?: string;
        mode: string;
        allowPlugins?: boolean;
    }): Promise<any>;

    /**
     * Sends a chat message as if it were sent by the user, triggering the normal chat processing flow.
     * @param message - The chat message to send, if string is a blank message, it will trigger the send action without adding a new message.
     */
    sendChat(message: string): Promise<void>;
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

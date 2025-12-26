/**
 * RisuAI Plugin API v3.0 Type Definitions
 *
 * This file provides TypeScript type definitions for the RisuAI Plugin API v3.0.
 * All API methods are accessed through the global `risuai` object.
 *
 * @important **ALL METHODS RETURN PROMISES**
 *
 * Due to the iframe-based sandboxing architecture, ALL method calls go through
 * postMessage communication, which makes them asynchronous. Even methods that
 * appear synchronous in the implementation (like log(), showContainer(), etc.)
 * return Promises when called from the plugin iframe.
 *
 * **ALWAYS use `await` or `.then()` when calling any risuai method or SafeElement method.**
 *
 * @example
 * ```typescript
 * //@name MyPlugin
 * //@api 3.0
 *
 * (async () => {
 *   // ALL methods require await
 *   await risuai.log('Plugin initialized');
 *
 *   const character = await risuai.getCharacter();
 *   await risuai.log(`Current character: ${character.name}`);
 *
 *   const apiKey = await risuai.getArgument('api_key');
 *
 *   await risuai.registerSetting('My Plugin', async () => {
 *     await risuai.showContainer('fullscreen');
 *     // Build UI...
 *   }, '⚙️', 'html');
 *
 *   // Even DOM operations require await
 *   const doc = await risuai.getRootDocument();
 *   const element = await doc.querySelector('.chat');
 *   await element.setTextContent('Hello!');
 *
 *   // Storage operations require await
 *   await risuai.pluginStorage.setItem('key', 'value');
 *   const value = await risuai.pluginStorage.getItem('key');
 * })();
 * ```
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * OpenAI-format chat message
 */
export interface OpenAIChat {
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
export type ContainerMode = 'fullscreen';

/**
 * Icon type for UI elements
 */
export type IconType = 'html' | 'img' | 'none';

/**
 * Script handler mode
 */
export type ScriptMode = 'display' | 'output' | 'input' | 'process';

/**
 * Replacer type
 */
export type ReplacerType = 'beforeRequest' | 'afterRequest';

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
 *   risuai.log('Clicked!');
 * });
 * ```
 */
export interface SafeElement {
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
     *   risuai.log('Element clicked!');
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
}

// ============================================================================
// SafeDocument API
// ============================================================================

/**
 * SafeDocument extends SafeElement with document-specific methods.
 * Provides secure access to the main RisuAI document.
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
export interface SafeDocument extends SafeElement {
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
// SafeMutationObserver
// ============================================================================

/**
 * Mutation record from SafeMutationObserver
 */
export interface SafeMutationRecord {
    /** Type of mutation */
    type: string;
    /** Target element that was modified */
    target: SafeElement;
    /** Array of added SafeElements */
    addedNodes: SafeElement[];
    /** Array of removed SafeElements */
    removedNodes?: SafeElement[];
}

/**
 * Callback for SafeMutationObserver
 */
export type SafeMutationCallback = (mutations: SafeMutationRecord[]) => void;

/**
 * SafeMutationObserver watches for DOM changes in the main document
 *
 * @example
 * ```typescript
 * const observer = risuai.createMutationObserver((mutations) => {
 *   mutations.forEach(mutation => {
 *     risuai.log(`Mutation type: ${mutation.type}`);
 *     mutation.addedNodes.forEach(async (node) => {
 *       const text = await node.textContent();
 *       risuai.log(`Node added: ${text}`);
 *     });
 *   });
 * });
 *
 * const doc = risuai.getRootDocument();
 * const body = doc.querySelector('body');
 * observer.observe(body, {
 *   childList: true,
 *   subtree: true,
 *   attributes: true
 * });
 * ```
 */
export interface SafeMutationObserver {
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
export interface PluginStorage {
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
export interface SafeLocalStorage {
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
export interface ProviderArguments {
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
export interface ProviderResponse {
    /** Whether the request was successful */
    success: boolean;
    /** Generated content (string or stream) */
    content: string | ReadableStream<string>;
}

/**
 * Provider function type
 */
export type ProviderFunction = (
    args: ProviderArguments,
    abortSignal?: AbortSignal
) => Promise<ProviderResponse>;

/**
 * Provider options
 */
export interface ProviderOptions {
    /** Tokenizer name (e.g., 'gpt-4') */
    tokenizer?: string;
    /** Custom tokenizer function */
    tokenizerFunc?: (content: string) => number[] | Promise<number[]>;
}

// ============================================================================
// RisuAI Global API
// ============================================================================

/**
 * RisuAI Plugin API v3.0
 *
 * All methods are accessed through the global `risuai` object.
 *
 * @important All methods are asynchronous unless otherwise noted.
 * Always use `await` or `.then()` when calling API methods.
 */
export interface RisuaiPluginAPI {
    // ========== Version Information ==========

    /** API version string */
    apiVersion: string;

    /** Array of compatible API versions */
    apiVersionCompatibleWith: string[];

    // ========== Logging ==========

    /**
     * Logs a message with plugin identification
     * @param message - Message to log
     * @returns Promise that resolves when log is complete
     *
     * @example
     * ```typescript
     * await risuai.log('Plugin initialized');
     * // Output: [RisuAI Plugin: YourPlugin] Plugin initialized
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
     * @returns Promise resolving to SafeDocument for the main RisuAI document
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
     * risuai.log(`Current character: ${char.name}`);
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
     * @returns Database object (limited to allowed keys)
     *
     * Allowed keys: characters, modules, enabledModules, moduleIntergration,
     * pluginV2, personas, plugins, pluginCustomStorage
     *
     * @example
     * ```typescript
     * const db = await risuai.getDatabase();
     * console.log(db.characters);
     * ```
     */
    getDatabase(): Promise<any>;

    /**
     * Sets the database (lightweight save)
     * @param db - Database object to save
     */
    setDatabaseLite(db: any): Promise<void>;

    /**
     * Sets the database (full save with sync)
     * @param db - Database object to save
     */
    setDatabase(db: any): Promise<void>;

    // ========== Network APIs ==========

    /**
     * Makes a native fetch request (bypasses RisuAI networking)
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
     * @param callback - Callback function when clicked
     * @param icon - Icon content (HTML or image URL)
     * @param iconType - Icon type ('html', 'img', or 'none')
     *
     * @example
     * ```typescript
     * await risuai.registerActionButton({
     *   name: 'My Action',
     *   icon: '🔥',
     *   iconType: 'html',
     *   callback: async () => {
     *     risuai.log('Action button clicked!');
     *   },
     * });
     * ```
     */
    registerActionButton(arg:  {
        name: string,
        icon: string,
        iconType: 'html'|'img'|'none',
        callback: () => void,
        location?: 'topright'
    }): Promise<void>;

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
     * @deprecated Cleanup only happens on shutdown
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
 * Global RisuAI API object available in all plugins
 */
declare global {
    const risuai: RisuaiPluginAPI;
}

export {};

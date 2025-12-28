# Plugin 2.0 -> 2.1/3.0 Migration Guide

## Overview

Originally, Risuai plugins got unlimited access to the global environment, which posed significant security risks. To mitigate these risks, we limited some of the accessible APIs in plugin scripts.
This is due to the fact that plugins can run arbitrary code, which may lead to security vulnerabilities if they access sensitive API keys or data, especially with planned account systems in the future.

So plugin 2.1 and 3.0 introduced a new plugin API versioning system. 2.1 is mostly compatible with 2.0, but with some restricted APIs and added safe alternatives. however, 2.1 were just a transitional version, and still have some security issues due to API's structure. 3.0 will introduce API overhaul with many breaking changes, with focus on security and stability.

2.1 can be deprecated in the future, but it will still be supported for a long time for compatibility reasons. however, 3.0 will be the recommended version for new plugins, and 2.1 might show security warnings in future versions.

## Declaring Plugin Version

Plugin 2.1

```
//@api 2.1
```

Plugin 3.0

```
//@api 3.0
```

If no api version is declared, it will be treated as 2.1. however, it will be mandatory to declare api version in future versions.

## API 2.1

API 2.1 works like 2.0, mostly compatible and working in same document context, but with some restricted APIs and added safe alternatives.

### Restricted APIs

- Global Scope: Plugins can no longer access the global scope directly. Instead, they must use the safeGlobalThis object provided by Risuai. `window`, `global`, `self` and similar references will be automatically redirected to `safeGlobalThis`.

- Document: Direct access to the Document object has been removed. instead, `safeDocument` is provided for secure DOM manipulations. `document` will be redirected to `safeDocument`.

- Storage APIs: Direct access to localStorage, sessionStorage, cookieStorage, and IndexedDB has been removed. instead, `safeLocalStorage`, and `safeIdbFactory` are provided for secure storage operations.
`localStorage` will be redirected to `safeLocalStorage`, and `indexedDB` will be redirected to `safeIdbFactory`. `sessionStorage` and `cookieStorage` are no longer accessible.

- Internal APIs: Although it wasn't never intended for plugins to access internal APIs, due to wrongful implementation, internal APIs were accessible. This has been fixed, and plugins can no longer access internal APIs. however, some APIs are added officially for plugin usage, but with limitations. 

- Now run inside a independent function scope, preventing access to the outer scope.

If your plugin relies on any of the above APIs, you will need to modify your code to use the provided safe alternatives. if you need additional APIs, please request them through github issues or make a pull request.

### Added APIs

`safeGlobalThis`: A secure version of the global object that plugins can use to access safe APIs and data. contains:
- `console`
- `TextEncoder`
- `TextDecoder`
- `setTimeout`
- `setInterval`
- `clearTimeout`
- `clearInterval`
- `URL`
- `URLSearchParams`
- `location`
- `alert`
- `confirm`
- `prompt`
- `innerWidth`
- `innerHeight`
- `navigator`
- `localStorage` (redirected to `safeLocalStorage`)
- `indexedDB` (redirected to `safeIdbFactory`)
- `Object`
- `Array`
- `String`
- `Number`
- `Boolean`
- `Math`
- `Date`
- `RegExp`
- `Error`
- `Function` (redirected to `SafeFunction`)
- `document` (redirected to `safeDocument`)
- `addEventListener` (proxied to the main window)
- `removeEventListener` (proxied to the main window)

`safeLocalStorage`: A secure wrapper around localStorage that restricts access to internal data. still it can be shared between plugins. can also be accessed using `localStorage`.

`safeIdbFactory`: A secure wrapper around IndexedDB that restricts access to internal databases. still it can be shared between plugins. can also be accessed using `indexedDB`.

`safeDocument`: A secure wrapper around the Document object that restricts access to sensitive data and methods. still it can be used to create elements, query elements, and manipulate the DOM. can also be accessed using `document`.

`pluginStorage`: A storage object specific to the plugin, which is shared plugins. unlike `safeLocalStorage`, its data is safed safe file wise, not device wise, making it syncable between devices using the same save file.
- `getItem(key: string): any | null`
- `setItem(key: string, value: any): void`
- `removeItem(key: string): void`
- `clear(): void`
- `key(index: number): any | null`
- `keys(): string[]`
- `length(): number`

`apiVersion`: A string representing the API version available to the plugin. currently set to "2.1".

`apiVersionCompatibleWith`: An array of strings representing the API versions compatible with the plugin. currently set to ["2.0", "2.1"].

`getDatabase()`: A function to get a user database. same as internal `getDatabase`, but with limited access.

`setDatabaseLite()`: A function to set a user database. same as internal `setDatabaseLite`, but with limited access.

`setDatabase()`: A function to set a user database. same as internal `setDatabase`, but with limited access.

`loadPlugins()`: A function to load plugins. same as internal `loadPlugins`.

`readImage()`: A function to read an image asset. same as internal `readImage`.

`saveAsset()`: A function to save an asset. same as internal `saveAsset`.

`getBackupFile()` : A function to get a save file for backup. unlike real file, its data is encrypted and can only be used for backup purposes. returns Promise<Uint8Array>.

`loadBackupFile()` : A function to load a encrypted save file created by `getBackupFile()`. returns Promise<boolean> indicating success or failure.

### APIs for Compatibility

To make widely used plugins compatible with 2.1 in best effort, some APIs are added, but without full functionality. its not to recommend to use these APIs in new plugins.

`SafeFunction`: A secure version of the Function constructor. the return value is literally undefined function, meaning that it might return any function, which is subject to change without notice. However, if its called as `Function("return this")()`, it returns `safeGlobalThis` object.

`alertStore`: Compatibility layer for alertStore. It doesn't provides functionality. just to prevent errors referring to it.

`safeGlobalThis.__pluginApis__`: An object representing all the plugin APIs.

## API 3.0

API 3.0 introduces significant changes to enhance security and stability. It is not backward compatible with 2.0 or 2.1, and plugins will need to be updated to work with this version.

### Key Changes

- Works in sandboxed iframe, preventing access to the main document context.
- Uses structured cloning for data exchange between the plugin and main application, ensuring data integrity and security.
- Data is not shared between plugins, each plugin has its own isolated context, unless APIs like safeLocalStorage or pluginStorage are used.
- More restricted APIs, with focus on security. some APIs from 2.1 are removed or modified.
- All APIs are asynchronous, returning Promises.
- API is in `risuai` object in the global scope.
- DOM access to the main document is available only through `getRootDocument()` method, and returns a safeDocument object, which is imcompatible with standard Document object.
- Plugins can access there own DOM inside there iframe though standard Document object. the iframe is hidden by default, but can be made visible using `showContainer()` method.

### APIs

#### Core API Object

All API v3 methods are accessed through the `risuai` global object. The API uses a sandboxed iframe environment to ensure security isolation.

#### Legacy APIs from v2.1 (Maintained for Compatibility)

The following APIs from v2.1 are still available in v3.0:

- `risuFetch`: Fetch wrapper with Risuai-specific enhancements
- `nativeFetch`: Direct native fetch access
- `getChar`: Get current character data (deprecated, use `getCharacter` instead)
- `setChar`: Set character data (deprecated, use `setCharacter` instead)
- `addProvider`: Add a custom AI provider
- `addRisuScriptHandler`: Add a custom script handler
- `removeRisuScriptHandler`: Remove a script handler
- `addRisuReplacer`: Add a custom text replacer
- `removeRisuReplacer`: Remove a text replacer
- `safeLocalStorage`: Secure localStorage wrapper (device-specific)
- `getDatabase`: Get database with limited access
- `pluginStorage`: Plugin-specific storage (save file-specific, syncable)
- `setDatabaseLite`: Set database (lightweight)
- `setDatabase`: Set database (full)
- `loadPlugins`: Load additional plugins
- `readImage`: Read image assets
- `saveAsset`: Save assets
- `onUnload`: Cleanup handler (deprecated - cleanup only happens on shutdown)
- `getArg`: Get plugin arguments (deprecated, use `getArgument` instead)
- `setArg`: Set plugin arguments (deprecated, use `setArgument` instead)

#### New Character APIs (v3.0)

Better-named alternatives to match API naming conventions:

```javascript
// Get current character
await risuai.getCharacter()

// Set character data
await risuai.setCharacter(characterData)
```

#### Argument APIs (v3.0)

Type-safe argument management:

```javascript
// Get a plugin argument by key
const value = await risuai.getArgument(key)

// Set a plugin argument
await risuai.setArgument(key, value)
```

**Note:** These replace the deprecated `getArg`/`setArg` methods.

#### Container Management

Control the plugin's iframe visibility and display mode:

```javascript
// Show the plugin container in fullscreen mode
risuai.showContainer('fullscreen')

// Hide the plugin container
risuai.hideContainer()
```

When shown in fullscreen mode:
- The iframe is moved to document.body
- Positioned fixed at top-left (0, 0)
- Sized to 100% width and height
- Z-index set to 1000
- Border removed

#### DOM Access

Access the main document through a secure wrapper:

```javascript
// Get the root document (returns SafeDocument)
const rootDoc = risuai.getRootDocument()

// Create elements
const div = rootDoc.createElement('div')
const anchor = rootDoc.createAnchorElement('https://example.com')

// Query elements
const element = rootDoc.querySelector('.some-class')
const elements = rootDoc.querySelectorAll('div')
```

#### SafeElement API

The `SafeElement` class provides secure DOM manipulation with restricted access to prevent security vulnerabilities:

##### Element Manipulation
```javascript
// Append/remove/replace children
element.appendChild(childElement)
element.removeChild(childElement)
element.replaceChild(newChild, oldChild)
element.replaceWith(newElement)
element.prepend(childElement)
element.remove()

// Clone nodes
const cloned = element.cloneNode(deep)
```

##### Text Content
```javascript
// Get text content
const text = element.innerText()
const content = element.textContent()

// Set text content
element.setInnerText('Hello World')
element.setTextContent('Hello World')
```

##### Attributes (Restricted)
```javascript
// Only 'x-' prefixed attributes allowed for security
element.setAttribute('x-custom-id', 'value')
const value = element.getAttribute('x-custom-id')
```

**Security Note:** Only attributes starting with `x-` can be get/set directly. Use dedicated methods for other attributes.

##### Styling
```javascript
// Style properties
element.setStyle('color', 'red')
const color = element.getStyle('color')

// Style attribute
element.setStyleAttribute('color: red; font-size: 16px')
const styleStr = element.getStyleAttribute()

// CSS classes
element.addClass('active')
element.removeClass('inactive')
element.setClassName('container active')
const className = element.getClassName()
const hasClass = element.hasClass('active')
```

##### HTML Content (Sanitized)
```javascript
// Get HTML
const inner = element.getInnerHTML()
const outer = element.getOuterHTML()

// Set HTML (automatically sanitized with DOMPurify)
element.setInnerHTML('<div>Safe HTML</div>')
element.setOuterHTML('<span>Safe HTML</span>')

//This won't work expected
element.setInnerHTML('<script>alert("XSS")</script>') // script tag will be removed
```

##### Traversal and Querying
```javascript
// Navigation
const children = element.getChildren()
const parent = element.getParent()

// Querying
const matches = element.querySelectorAll('.child-class')
const single = element.querySelector('#child-id')
const byId = element.getElementById('some-id')
const byClass = element.getElementsByClassName('some-class')

// Matching
const matches = element.matches('.some-selector')
```

##### Dimensions and Position
```javascript
const height = element.clientHeight()
const width = element.clientWidth()
const top = element.clientTop()
const left = element.clientLeft()

const rects = element.getClientRects()
const rect = element.getBoundingClientRect()
```

##### Node Information
```javascript
const name = element.nodeName()
const type = element.nodeType()
```

##### Focus
```javascript
element.focus()
```

##### Event Listeners

Event listeners have security restrictions to prevent fingerprinting and malicious behavior:

```javascript
// Add event listener (returns unique ID)
const listenerId = await element.addEventListener('click', (event) => {
  console.log('Clicked!', event)
}, options)

// Remove event listener
element.removeEventListener('click', listenerId, options)
```

**Allowed Events (unlimited):**
- Mouse events: `click`, `dblclick`, `contextmenu`, `mousedown`, `mouseup`, `mousemove`, `mouseover`, `mouseleave`
- Pointer events: `pointercancel`, `pointerdown`, `pointerenter`, `pointerleave`, `pointermove`, `pointerout`, `pointerover`, `pointerup`
- Scroll events: `scroll`, `scrollend`

**Allowed Events (with random delay for fingerprinting protection):**
- Keyboard events: `keydown`, `keyup`, `keypress`

These events are delayed by a random number of milliseconds to prevent timing-based fingerprinting attacks.

**Important:** Other event types are blocked for security reasons.

#### SafeDocument API

Extends `SafeElement` with document-specific methods:

```javascript
// Create regular elements (restricted to whitelist)
const div = safeDoc.createElement('div')
const span = safeDoc.createElement('span')

// Create anchor elements (with URL validation)
const link = safeDoc.createAnchorElement('https://example.com')
```

**Security Features:**
- Only whitelisted HTML tags can be created
- Non-whitelisted tags are replaced with `<div>`
- Anchor elements validate URLs (only http/https protocols allowed)
- Invalid URLs default to '#'

#### Mutation Observer

Monitor DOM changes safely:

```javascript
// Create mutation observer
const observer = risuai.createMutationObserver((mutations) => {
  mutations.forEach(mutation => {
    console.log('Type:', mutation.type)
    console.log('Target:', mutation.target)
    console.log('Added nodes:', mutation.addedNodes)
  })
})

// Start observing
observer.observe(element, {
  childList: true,
  subtree: true,
  attributes: true
})
```

**Mutation Record Properties:**
- `type`: Type of mutation ('attributes', 'childList', etc.)
- `target`: SafeElement that was modified
- `addedNodes`: Array of added SafeElement nodes

#### UI Registration

Register custom UI elements:

```javascript
// Register a settings menu item
risuai.registerSetting(
  'My Plugin Settings',
  () => {
    // Callback when clicked
    risuai.showContainer('fullscreen')
  },
  '<svg>...</svg>', // Optional icon
  'html' // Icon type: 'html', 'img', or 'none'
)

// Register a floating action button
risuai.registerButton({
    name: 'My Action',
    icon: 'https://example.com/icon.png', // Optional icon
    iconType: 'img', // Icon type: 'html', 'img', or 'none'
    location: 'action'
}, () => {
      // Callback when clicked
})
```

**Parameters:**
- `name`: Display name (required, non-empty string)
- `callback`: Function to call when activated
- `icon`: Icon content (HTML string or image URL)
- `iconType`: How to interpret icon ('html', 'img', or 'none')

#### Logging

Centralized logging with plugin identification:

```javascript
console.log('This is a log message')
// Output: [Risuai Plugin: YourPluginName] This is a log message
```

#### Metadata

```javascript
// API version
console.log(risuai.apiVersion) // "3.0"

// Compatible versions
console.log(risuai.apiVersionCompatibleWith) // ["3.0"]
```

#### Internal Methods

```javascript
// Get legacy API keys (for debugging/compatibility checking)
const oldKeys = risuai._getOldKeys()
```

**Note:** Methods prefixed with `_` are internal and subject to change without notice.

### Security Model

API v3.0 implements multiple security layers:

1. **Iframe Isolation**: Plugins run in sandboxed iframes, preventing direct access to the main application context
2. **SafeElement Wrapper**: All DOM access goes through SafeElement, which restricts dangerous operations
3. **Attribute Restrictions**: Only `x-` prefixed custom attributes can be manipulated directly
4. **HTML Sanitization**: All HTML content is sanitized with DOMPurify before insertion
5. **Event Filtering**: Only safe event types are allowed; keyboard events are delayed to prevent fingerprinting
6. **URL Validation**: Anchor elements only accept http/https protocols
7. **Element Whitelist**: Only safe HTML elements can be created
8. **Structured Cloning**: Data exchange uses structured cloning for integrity

### Migration from v2.1 to v3.0

#### Breaking Changes

1. **Global Scope**: No direct access to `window`, `document`, or global variables
2. **Async APIs**: All API methods return Promises
3. **DOM Access**: Must use `getRootDocument()` instead of `document`
4. **Element Type**: DOM methods return `SafeElement` instead of standard HTMLElement
5. **Event Listeners**: Return unique IDs instead of using direct function references
6. **Isolation**: Data is not shared between plugins unless explicitly using shared storage APIs

#### Migration Steps

1. **Update API declaration:**
   ```javascript
   //@api 3.0
   ```

2. **Access APIs through `risuai` object:**
   ```javascript
   // Old (v2.0 / v2.1)
   const db = getDatabase()

   // New (v3.0)
   const db = await risuai.getDatabase()
   ```


3. **Migrate DOM Modal to Iframe:**
   ```javascript
   // Old (v2.0 / v2.1)
   // Build your Modal at main document
   const container = document.createElement('div')
   container.style.innerHTML = '<h1>Hello World Modal</h1>'
   document.body.appendChild(container)

   // New (v3.0)
   // Build your UI inside the iframe context

   //looks same in this example, but its inside the iframe now!
   const container = document.createElement('div')
   container.style.innerHTML = '<h1>Hello World Modal</h1>'

   //don't forget to show the iframe container when needed
   risuai.showContainer('fullscreen')
   ```

3-1. **Migrate Settings UI Registration:**
   ```javascript
   // Old (v2.0 / v2.1)
   // This was one of the hacky way to build settings button
    const observer = new MutationObserver(() => {
      const menu = document.querySelector('.rs-setting-cont-3')
      if (menu && !document.querySelector('.my-plugin-settings')) {
        const button = document.createElement('div')
        button.className = 'my-plugin-settings'
        button.innerHTML = '⚙️ My Plugin Settings'
        button.onclick = () => {
          // Build your Modal at main document...
        }
        menu.appendChild(button)
      }
    })
  observer.observe(document.body, { childList: true, subtree: true })


   // New (v3.0)
   // Now its officially supported to register settings button
   risuai.registerSetting(
     'My Plugin Settings',
     () => {
       risuai.showContainer('fullscreen')
       // Build your UI inside the iframe...
     },
     '⚙️',
     'html'
   )
   ```

3-2. **Migrate Action Button Registration:**
   ```javascript
   // Old (v2.0 / v2.1)
   // This was one of the hacky way to build floating action button
   setInterval(() => {
     if (!document.querySelector('.my-plugin-action-button')) {
       const button = document.createElement('div')
       button.style.position = 'fixed'
       button.style.top = '10px'
       button.style.right = '10px'
       button.style.zIndex = '1000'
       button.innerHTML = '<img src="https://example.com/icon.png" />'
        button.className = 'my-plugin-action-button'
       button.onclick = () => {
         // Your action here...
       }
       document.body.appendChild(button)
     }
   },100)

   // New (v3.0)
   // Now its officially supported to register action buttons
   risuai.registerButton({
       name: 'My Action',
       icon: 'https://example.com/icon.png',
       iconType: 'img',
       location: 'action'
   }, () => {
      // Your action here...
   })
   ```

3-3. **Or use getRootDocument for main DOM access:**

   Note: We recommend building your UI inside the iframe using standard Document APIs, and using `registerSetting`/`registerButton` for UI integration. however, if you really need to access the main document, use `getRootDocument()`. we don't recommend using this method for building UIs, since it adds more restrictions and complexity.

   ```javascript
   // Old (v2.0 / v2.1)
   const element = document.querySelector('.my-class')

   // New (v3.0)
   const doc = risuai.getRootDocument()
   const element = doc.querySelector('.my-class')
   ```

4. **Handle SafeElement instead of HTMLElement:**
   ```javascript
   // Old (v2.0 / v2.1)
   element.style.color = 'red'

   // New (v3.0)
   element.setStyle('color', 'red')
   ```

5. **Use async/await for all API calls:**
   ```javascript
   // Old (v2.0 / v2.1)
   const char = getChar()

   // New (v3.0)
   const char = await risuai.getCharacter()
   ```

6. **Update event listeners:**
   ```javascript
   // Old (v2.0 / v2.1)
   element.addEventListener('click', handler)

   // New (v3.0)
   const id = await element.addEventListener('click', handler)
   // Store id for later removal
   ```

### Best Practices

1. **Use new naming conventions**: Prefer `getCharacter`/`setCharacter` over `getChar`/`setChar`
2. **Use type-safe arguments**: Use `getArgument`/`setArgument` instead of deprecated `getArg`/`setArg`
3. **Leverage iframe container**: Use `showContainer`/`hideContainer` for custom UIs
4. **Use pluginStorage for persistence**: Prefer `pluginStorage` over `safeLocalStorage` for syncable data
5. **Sanitize all user input**: Even though HTML is auto-sanitized, validate data before processing
6. **Handle async errors**: Wrap async calls in try-catch blocks
7. **Clean up resources**: Remove event listeners when no longer needed

### Example: Complete v3.0 Plugin

```javascript
//@api 3.0

(async () => {
  try {
    // Log plugin start
    console.log('Plugin initialized')

    // Register a settings button
    risuai.registerSetting(
      'My Plugin Settings',
      async () => {
        risuai.showContainer('fullscreen')
        // Build UI in iframe...
      },
      '⚙️',
      'html'
    )

    // Access main document
    const doc = risuai.getRootDocument()

    // Monitor changes
    const observer = risuai.createMutationObserver((mutations) => {
      console.log(`Detected ${mutations.length} mutations`)
    })

    const body = doc.querySelector('body')
    if (body) {
      observer.observe(body, { childList: true, subtree: true })
    }

    // Get/set data
    const setting = await risuai.getArgument('mySetting')
    if (!setting) {
      await risuai.setArgument('mySetting', 'defaultValue')
    }

    // Use plugin storage
    risuai.pluginStorage.setItem('lastRun', Date.now())

    console.log('Plugin setup complete')
  } catch (error) {
    console.log(`Error: ${error.message}`)
  }
})()
```

### Making Your Plugin Compatible with 2.0, 2.1, and 3.0

first, declare the api version at the top of your plugin script:

```javascript
//@api 2.0 2.1 3.0
```

This will make the software load the plugin in the highest supported api version. then, you can use feature detection to check which api version is currently running, and adjust your code accordingly:

```javascript

(async () => {

  //This works in all api versions, except 1.0, which is deprecated long ago
  const apiVersion = (typeof risuai !== 'undefined' ? risuai.apiVersion : apiVersion) || '2.0'

  if (apiVersion === '3.0') {
    // Use API v3.0 features
    const doc = risuai.getRootDocument();
    // ...
  } else if (apiVersion === '2.1') {
    // Use API v2.1 features
    const doc = safeDocument;
    // ...
  } else {
    // Use API v2.0 features
    const doc = document;
    // ...
  }
})();
```

# Deprecation Schedule

| Version | Deprecation Date | Notes |
|---------|------------------|-------|
| 1.0    | Already Deprecated | No longer supported, plugins using this version will not work in current versions. |
| 2.0     | After Account System Release | Transitional support for legacy plugins, it will quickly be deprecated after account system release. |
| 2.1     | Unknown (Long-term support) | Will be supported for a long time for compatibility, but security warnings will be shown after 2.0 deprecation. |
| 3.0     | N/A              | Recommended version for new plugins, will be supported indefinitely, unless major security issues arise. |
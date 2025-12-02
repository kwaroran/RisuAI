# NOTE: 2.1 is not final yet. this is a draft. all APIs and behaviors are subject to change.

# Plugin 2.0 -> 2.1 Migration Guide

## Overview

Originally, RisuAI plugins got unlimited access to the global environment, which posed significant security risks. To mitigate these risks, we limited some of the accessible APIs in plugin scripts.
This is due to the fact that plugins can run arbitrary code, which may lead to security vulnerabilities if they access sensitive API keys or data, especially with planned account systems in the future.

Although 2.0 plugins will be supported for some versions, we highly recommend updating your plugins to 2.1 as soon as possible to ensure compatibility with future releases and to take advantage of the new secure APIs.

## Declaring Plugin Version

```
//@api 2.1
```

should be added at the top of the plugin script to declare it as a 2.1 plugin. otherwise, it will be treated as a 2.0 plugin.

## Restricted APIs

- Global Scope: Plugins can no longer access the global scope directly. Instead, they must use the safeGlobalThis object provided by RisuAI. `window`, `global`, `self` and similar references will be automatically redirected to `safeGlobalThis`.

- Document: Direct access to the Document object has been removed. instead, `safeDocument` is provided for secure DOM manipulations. `document` will be redirected to `safeDocument`.

- Storage APIs: Direct access to localStorage, sessionStorage, cookieStorage, and IndexedDB has been removed. instead, `safeLocalStorage`, and `safeIdbFactory` are provided for secure storage operations.
`localStorage` will be redirected to `safeLocalStorage`, and `indexedDB` will be redirected to `safeIdbFactory`. `sessionStorage` and `cookieStorage` are no longer accessible.

- Internal APIs: Although it wasn't never intended for plugins to access internal APIs, due to wrongful implementation, internal APIs were accessible. This has been fixed, and plugins can no longer access internal APIs. however, some APIs are added officially for plugin usage, but with limitations. 

- Now run inside a independent function scope, preventing access to the outer scope.

If your plugin relies on any of the above APIs, you will need to modify your code to use the provided safe alternatives. if you need additional APIs, please request them through github issues or make a pull request.

## Added APIs

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

## APIs for Compatibility

To make widely used plugins compatible with 2.1 in best effort, some APIs are added, but without full functionality. its not to recommend to use these APIs in new plugins.

`SafeFunction`: A secure version of the Function constructor. the return value is literally undefined function, meaning that it might return any function, which is subject to change without notice. However, if its called as `Function("return this")()`, it returns `safeGlobalThis` object.

`alertStore`: Compatibility layer for alertStore. It doesn't provides functionality. just to prevent errors referring to it.

`safeGlobalThis.__pluginApis__`: An object representing all the plugin APIs.
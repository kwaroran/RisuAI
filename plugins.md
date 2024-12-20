
# Plugins

RisuAI uses a plugin system to allow for easy extension of the functionality.

## Creating a Plugin

A plugin is a js file with a header. for example:

```js
//@name exampleplugin
//display-name: Example Plugin

// Plugin code here
```

## Header Fields

- `@name <name>` - The name of the plugin. This is used to identify the plugin. required.
- `@display-name <display_name>` - The display name of the plugin. This is used to display the plugin in the UI.
- `@arg <name> <type>` Argument definition. This is used to define the arguments that the plugin takes. The type can be `int` or `string`.

## API Reference


### `risuFetch(url: string, arg: GlobalFetchArgs = {}): Promise<GlobalFetchResult>`

> Note: `nativeFetch` is recommended for fetching URLs, as it has the same functionality as `risuFetch`, but with a similar API to `fetch` with more predictable behavior.

Fetches a URL with a native API, which doesn't have CORS restrictions.

#### Arguments

- `url: string` - The URL to fetch.
- `arg: GlobalFetchArgs` - The fetch arguments.
    - `body: string|Object` - The body to send with the request. if it's an object, it will be converted to JSON.
    - `headers: Record<string, string>` - The headers to send with the request.
    - `method: string` - The method to use for the request `GET` and `POST` are supported. Default: `POST`.
    - `abortSignal: AbortSignal` - The signal to use for aborting the request.
    - `rawResponse: boolean` - If true, the response will be returned as Uint8Array. Default: `false`.

#### Returns

- `Promise<GlobalFetchResult>` - The fetch result.
    - `ok: boolean` - If the request was successful.
    - `data: any` - The response data which is parsed JSON if possible. if `rawResponse` is true, it will be a Uint8Array.
    - `headers: Record<string, string>` - The response headers.

### `nativeFetch(url: string, arg: NativeFetchArg = {}): Promise<NativeFetchResults>`

Fetches a URL with the native API, which doesn't have CORS restrictions. this API is designed as a subset of [fetch api](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), except it doesn't have CORS restrictions and default method is `POST`.

#### Arguments

- `url: string` - The URL to fetch.
- `arg: NativeFetchArg` - The fetch arguments.
    - `body: string|Uint8Array|ArrayBuffer` - The body to send with the request.
    - `headers: Record<string, string>` - The headers to send with the request.
    - `method: string` - The method to use for the request. `GET`, `POST`, `PUT`, `DELETE` are supported. Default: `POST`.
    - `signal: AbortSignal` - The signal to use for aborting the request.

#### Returns

- `Promise<NativeFetchResults>` - The fetch result.
    - `body: ReadableStream<Uint8Array>` - The response body.
    - `headers: Headers` - The response headers.
    - `status: number` - The response status.
    - `json: () => Promise<any>` - A function that returns a promise that resolves to the JSON representation of the response body.
    - `text: () => Promise<string>` - A function that returns a promise that resolves to the text representation of the response body.
    - `arrayBuffer: () => Promise<ArrayBuffer>` - A function that returns a promise that resolves to the ArrayBuffer representation of the response body.

### `getArg(name: string): string|number`

Gets the argument value by name.

#### Arguments

- `name: string` - The argument name. must be format of `<plugin_name>::<arg_name>` like `exampleplugin::arg1`.

#### Returns

- `string|number` - The argument value.

### `getChar(): character`

Gets the current character.

### `setChar(char: character): void`

Sets the current character.

### `addProvider(type: string, func: (arg:PluginV2ProviderArgument) => Promise<{success:boolean,content:string}>): void`

Adds a provider to the plugin.

#### Arguments

- `type: string` - The provider name.
- `func: (arg:PluginV2ProviderArgument) => Promise<{success:boolean,content:string}>` - The provider function.
    - `arg: PluginV2ProviderArgument` - The provider argument.
        - `prompt_chat: Chat[]` - The chat prompt.
        - `frequency_penalty?: number` - The frequency penalty.
        - `min_p?: number` - The minimum p value.
        - `presence_penalty?: number` - The presence penalty.
        - `repetition_penalty?: number` - The repetition penalty.
        - `top_k?: number` - The top k value.
        - `top_p?: number` - The top p value.
        - `temperature?: number` - The temperature value.
        - `mode: string` - The mode. one of `model`, `submodel`, `memory`, `emotion`, `otherAx`, `translate`
    - `Promise<{success:boolean,content:string}>` - The provider result.
        - `success: boolean` - If the provider was successful.
        - `content: string` - The provider content.

### `addRisuScriptHandler(type: string, func: (content:string) => string|null|undefined|Promise<string|null|undefined>): void`

Adds a risu script handler to the plugin.

#### Arguments

- `type: string` - The handler type. one of `display`, `output`, `input`, `process`
- `func: (content:string) => string|null|undefined|Promise<string|null|undefined>` - The handler function.
    - `content: string` - The content to handle.
    - `string|null|undefined|Promise<string|null|undefined>` - The handler result. if it is a string or string promise, the data will be replaced with the result.

### `removeRisuScriptHandler(type: string, func: (content:string) => string|null|undefined|Promise<string|null|undefined>): void`

Removes a risu script handler from the plugin.

### `addRisuReplacer(type: string, func: ReplacerFunction): void`

Adds a risu replacer to the plugin.

#### Arguments

- `type: string` - The replacer type. one of `beforeRequest`, `afterRequest`.
- `func: ReplacerFunction` - The replacer function. vary depending on the type.
    - If the type is `afterRequest`, the function should be `(content: string, mode:string) => string`.
    - If the type is `beforeRequest`, the function should be `(content: Chat[], mode:string) => Chat[]`.
    - mode is one of `model`, `submodel`, `memory`, `emotion`, `otherAx`, `translate`.

### `removeRisuReplacer(type: string, func: ReplacerFunction): void`

Removes a risu replacer from the plugin.

### `onUnload(func: () => void): void`

Adds an unload handler to the plugin.


## Migration from Plugin V1

The plugin system has been updated to V2. The following changes have been made:
  - Now runs in same context as the main script rather than in a sandbox, making it accessible to the main script and DOM.
  - Added `nativeFetch`, `addRisuScriptHandler`, `removeRisuScriptHandler`, `addRisuReplacer`, `removeRisuReplacer`, `onUnload` functions.
  - `method`, `abortSignal`, `rawResponse` arguments has been added to `risuFetch`.
  - `min_p`, `top_k`, `top_p`, `mode` arguments has been added to `addProvider`.
  - `bias` argument has been removed from `addProvider`. however for compatibility, it still calls with empty array.
  - Now plugin doesn't automatically terminates itself. you have to manually unload the plugin using `onUnload` function.
  - `addCharaJs` function has been removed. use `addRisuScriptHandler` instead.
  - Many security restrictions have been removed.
  - `@risu-name`, `@risu-display-name`, `@risu-arg` headers has been removed. use `@name`, `@display-name`, `@arg` instead. if it's not present, it will be ran as V1 plugin.
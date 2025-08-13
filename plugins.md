
# Plugins

RisuAI uses a plugin system to allow for easy extension of the functionality.

## Creating a Plugin

A plugin is a js file with a header. for example:

```js
//@name exampleplugin
//@display-name Example Plugin

// Plugin code here
```

## Header Fields

- `@name <name>` - The name of the plugin. This is used to identify the plugin. required.
- `@display-name <display_name>` - The display name of the plugin. This is used to display the plugin in the UI.
- `@arg <name> <type>` Argument definition. This is used to define the arguments that the plugin takes. The type can be `int` or `string`. If name starts with `hidden_`, it will be hidden from the UI while still being available in the code.
- `@link <url> [hoverText]` A link to the plugin documentation or repository. Link shouldn't contain space character. The hover text is optional and will be displayed when hovering over the link in the UI. Recommend to use this to link to the plugin documentation, repository, publish page, etc.

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

### `nativeFetch(url: string, arg: NativeFetchArg = {}): Promise<Response>`

Fetches a URL with the native API, which doesn't have CORS restrictions. this API is designed as a subset of [fetch api](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), except it doesn't have CORS restrictions and default method is `POST`.

#### Arguments

- `url: string` - The URL to fetch.
- `arg: NativeFetchArg` - The fetch arguments.
    - `body: string|Uint8Array|ArrayBuffer` - The body to send with the request.
    - `headers: Record<string, string>` - The headers to send with the request.
    - `method: string` - The method to use for the request. `GET`, `POST`, `PUT`, `DELETE` are supported. Default: `POST`.
    - `signal: AbortSignal` - The signal to use for aborting the request.

#### Returns

- `Promise<Response>` - The fetch result, in a [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) object.

### `getArg(name: string): string|number`

Gets the argument value by name.

#### Arguments

- `name: string` - The argument name. must be format of `<plugin_name>::<arg_name>` like `exampleplugin::arg1`.

#### Returns

- `string|number` - The argument value.

### `setArg(name: string, value: string|number): void`

Sets the argument value by name.

#### Arguments

- `name: string` - The argument name. must be format of `<plugin_name>::<arg_name>` like `exampleplugin::arg1`.
- `value: string|number` - The argument value.

### `getChar(): character`

Gets the current character.

### `setChar(char: character): void`

Sets the current character.

### `addProvider(type: string, func: (arg:PluginV2ProviderArgument, abortSignal?: AbortSignal) => Promise<{success:boolean,content:string|ReadableStream<string>}>, options?:PluginV2ProviderOptions): void`

Adds a provider to the plugin.

#### Arguments

- `type: string` - The provider name.
- `func: (arg:PluginV2ProviderArgument, abortSignal?: AbortSignal) => Promise<{success:boolean,content:string}>` - The provider function.
    - `arg: PluginV2ProviderArgument` - The provider argument.
        - `prompt_chat: Chat[]` - The chat prompt.
        - `frequency_penalty?: number` - The frequency penalty.
        - `min_p?: number` - The minimum p value.
        - `presence_penalty?: number` - The presence penalty.
        - `repetition_penalty?: number` - The repetition penalty.
        - `top_k?: number` - The top k value.
        - `top_p?: number` - The top p value.
        - `temperature?: number` - The temperature value.
        - `max_tokens?: number` - The max tokens value.
        - `mode: string` - The mode. one of `model`, `submodel`, `memory`, `emotion`, `otherAx`, `translate`
    - `abortSignal?: AbortSignal` - The signal to use for aborting the request.
    - `Promise<{success:boolean,content:string|ReadableStream<string>}>` - The provider result.
        - `success: boolean` - If the provider was successful.
        - `content: string|ReadableStream<string>` - The provider content. if it's a ReadableStream, it will be streamed to the chat.
- `options?: PluginV2ProviderOptions` - The provider options.
    - `tokenizer?: string` - The tokenizer name. must be one of `"mistral"`, `"llama"`, `"novelai"`, `"claude"`, `"novellist"`, `"llama3"`, `"gemma"`, `"cohere"`, `"tiktoken"` or `"custom"`. if it's `"custom"`, you have to provide `tokenizerFunc`.
    - `tokenizerFunc?: (content: string) => number[]|Promise<number[]>` - The tokenizer function.

### `addRisuScriptHandler(type: string, func: (content:string) => string|null|undefined|Promise<string|null|undefined>): void`

Adds a risu script handler to the plugin.

#### Arguments

- `type: string` - The handler type. one of `display`, `output`, `input`, `process`
    - `display` - The handler will be called when the data is displayed.
    - `output` - The handler will be called when the data is outputted by the AI model.
    - `input` - The handler will be called when the data is inputted by the user.
    - `process` - The handler will be called when creating actual request data.
- `func: (content:string) => string|null|undefined|Promise<string|null|undefined>` - The handler function.
    - `content: string` - The content to handle.
    - `string|null|undefined|Promise<string|null|undefined>` - The handler result. if it is a string or string promise, the data will be replaced with the result.

### `removeRisuScriptHandler(type: string, func: (content:string) => string|null|undefined|Promise<string|null|undefined>): void`

Removes a risu script handler from the plugin.

### `addRisuReplacer(type: string, func: ReplacerFunction): void`

Adds a risu replacer to the plugin.

#### Arguments

- `type: string` - The replacer type. one of `beforeRequest`, `afterRequest`.
    - `beforeRequest` - The replacer will be called right before the request is sent.
    - `afterRequest` - The replacer will be called right after the response is received.
- `func: ReplacerFunction` - The replacer function. vary depending on the type.
    - If the type is `afterRequest`, the function should be `(content: string, mode:string) => string`.
    - If the type is `beforeRequest`, the function should be `(content: Chat[], mode:string) => Chat[]`.
    - mode is one of `model`, `submodel`, `memory`, `emotion`, `otherAx`, `translate`.

### `removeRisuReplacer(type: string, func: ReplacerFunction): void`

Removes a risu replacer from the plugin.

### `onUnload(func: () => void): void`

Adds an unload handler to the plugin.


## Changes from Plugin V1

The plugin system has been updated to V2. The following changes have been made:
  - Now runs in same context as the main script rather than in a sandbox, making it accessible to the main script and DOM.
  - Added `nativeFetch`, `addRisuScriptHandler`, `removeRisuScriptHandler`, `addRisuReplacer`, `removeRisuReplacer`, `onUnload` functions.
  - `method`, `abortSignal`, `rawResponse` arguments has been added to `risuFetch`.
  - `min_p`, `top_k`, `top_p`, `mode` arguments has been added to `addProvider`.
  - `bias` argument has been removed from `addProvider`. however for compatibility, it still calls with empty array.
  - Now plugin doesn't automatically terminates itself. you have to manually unload the plugin using `onUnload` function.
  - `addCharaJs` function has been removed. use `addRisuScriptHandler` instead.
  - `risuLog` function has been removed. use `console.log` instead.
  - Many security restrictions have been removed.
  - `@risu-name`, `@risu-display-name`, `@risu-arg` headers has been removed. use `@name`, `@display-name`, `@arg` instead. if it's not present, it will be ran as V1 plugin.

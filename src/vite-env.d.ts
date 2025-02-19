/// <reference types="svelte" />
/// <reference types="vite/client" />


declare var Buffer: BufferConstructor
declare var safeStructuredClone: <T>(data: T) => T
declare var userScriptFetch: (url: string,arg:RequestInit) => Promise<Response>
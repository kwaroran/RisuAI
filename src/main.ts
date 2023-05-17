import "./styles.css";
import App from "./App.svelte";
import { loadData } from "./ts/globalApi";
import { ReadableStream, WritableStream, TransformStream } from "web-streams-polyfill/ponyfill/es2018";
import { Buffer as BufferPolyfill } from 'buffer'
import { initHotkey } from "./ts/hotkey";

//Polyfills
declare var Buffer: typeof BufferPolyfill;
globalThis.Buffer = BufferPolyfill
//@ts-ignore
globalThis.WritableStream = globalThis.WritableStream ?? WritableStream
globalThis.ReadableStream = globalThis.ReadableStream ?? ReadableStream
globalThis.TransformStream = globalThis.TransformStream ?? TransformStream

const app = new App({
  target: document.getElementById("app"),
});

loadData()
initHotkey()
export default app;
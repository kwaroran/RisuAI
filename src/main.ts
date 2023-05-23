import "./styles.css";
import "core-js/actual"
import App from "./App.svelte";
import { loadData } from "./ts/globalApi";
import { ReadableStream, WritableStream, TransformStream } from "web-streams-polyfill/ponyfill/es2018";
import { Buffer as BufferPolyfill } from 'buffer'
import { initHotkey } from "./ts/hotkey";
import {polyfill as dragDropPolyfil} from "mobile-drag-drop";
import {scrollBehaviourDragImageTranslateOverride} from "mobile-drag-drop/scroll-behaviour";

dragDropPolyfil({
  // use this to make use of the scroll behaviour
  dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
  forceApply: navigator.maxTouchPoints > 0,
  holdToDrag: 400
});

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
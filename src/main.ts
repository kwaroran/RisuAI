import "./styles.css";
import "core-js/actual"
import App from "./App.svelte";
import { loadData } from "./ts/globalApi";
import { ReadableStream, WritableStream, TransformStream } from "web-streams-polyfill/ponyfill/es2018";
import { Buffer as BufferPolyfill } from 'buffer'
import { initHotkey } from "./ts/hotkey";

const testDom = document.createElement('div');
const supports  = ('draggable' in testDom) || ('ondragstart' in testDom && 'ondrop' in testDom);
const isIos = navigator.userAgent ? (!!navigator.userAgent.match('iPhone OS') || !!navigator.userAgent.match('iPad')) : false
testDom.remove()

if((!supports) || isIos){
  const dragDrop = await import("mobile-drag-drop")
  const dragDropBehavior = await import("mobile-drag-drop/scroll-behaviour")

  dragDrop.polyfill({
    // use this to make use of the scroll behaviour
    dragImageTranslateOverride: dragDropBehavior.scrollBehaviourDragImageTranslateOverride,
    holdToDrag: 400
  });
}

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
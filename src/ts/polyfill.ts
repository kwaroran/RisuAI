import { ReadableStream, WritableStream, TransformStream } from "web-streams-polyfill/ponyfill/es2018";
import { Buffer as BufferPolyfill } from 'buffer'
import { polyfill as dragPolyfill} from "mobile-drag-drop"
import {scrollBehaviourDragImageTranslateOverride} from 'mobile-drag-drop/scroll-behaviour'
import rfdc from 'rfdc'
import { isIOS } from "./platform";
/**
 * Polyfill for structuredClone.
 * Falls back to rfdc (Really Fast Deep Clone) if structuredClone throws an error.
 */

const rfdcClone = rfdc({
  circles:false,
})
function safeStructuredClone<T>(data:T):T{
  try {
      return structuredClone(data)
  } catch (error) {
      return rfdcClone(data)
  }
}

try {
    const testDom = document.createElement('div');
    const supports  = ('draggable' in testDom) || ('ondragstart' in testDom && 'ondrop' in testDom);
    testDom.remove()
    
    if((!supports) || isIOS()){
      globalThis.polyfilledDragDrop = true
      dragPolyfill({
        // use this to make use of the scroll behaviour
        dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
        // holdToDrag: 400,
        forceApply: true
      });
    }
} catch (error) {
    
}

globalThis.safeStructuredClone = safeStructuredClone

globalThis.Buffer = BufferPolyfill
//@ts-expect-error ponyfill WritableStream type is incompatible with globalThis.WritableStream
globalThis.WritableStream = globalThis.WritableStream ?? WritableStream
//@ts-expect-error ponyfill ReadableStream type is incompatible with globalThis.ReadableStream
globalThis.ReadableStream = globalThis.ReadableStream ?? ReadableStream
//@ts-expect-error ponyfill TransformStream type is incompatible with globalThis.TransformStream
globalThis.TransformStream = globalThis.TransformStream ?? TransformStream   

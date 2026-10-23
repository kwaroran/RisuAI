import { ReadableStream, WritableStream, TransformStream } from "web-streams-polyfill/ponyfill/es2018";
import { Buffer as BufferPolyfill } from 'buffer'
import { polyfill as dragPolyfill} from "mobile-drag-drop"
import {scrollBehaviourDragImageTranslateOverride} from 'mobile-drag-drop/scroll-behaviour'
import rfdc from 'rfdc'
/**
 * Polyfill for structuredClone.
 * Falls back to rfdc (Really Fast Deep Clone) if structuredClone throws an error.
 */

const rfdcClone = rfdc({
  circles:false,
})
export function safeStructuredClone<T>(data:T):T{
  try {
      return structuredClone(data)
  } catch (error) {
      return rfdcClone(data)
  }
}

function findDraggableTargetAtTouch(event: TouchEvent): HTMLElement | undefined {
    const touch = event.changedTouches[0]
    if(!touch){
      return
    }

    let target: Element | null = document.elementFromPoint(touch.clientX, touch.clientY)
    while(target){
      if(target instanceof HTMLElement && (target.draggable || target.getAttribute('draggable') === 'true')){
        return target
      }
      target = target.parentElement
    }
}

try {
    const applied = dragPolyfill({
      // use this to make use of the scroll behaviour
      dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
      // Let touch users scroll normally unless they intentionally hold first.
      holdToDrag: 350,
      // Delayed touch events can lose their composed path in Chromium.
      tryFindDraggableTarget: findDraggableTargetAtTouch,
    });

    if(applied){
      globalThis.polyfilledDragDrop = true
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

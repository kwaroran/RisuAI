import { ReadableStream, WritableStream, TransformStream } from "web-streams-polyfill/ponyfill/es2018";
import { Buffer as BufferPolyfill } from 'buffer'
import { polyfill as dragPolyfill} from "mobile-drag-drop"
import {scrollBehaviourDragImageTranslateOverride} from 'mobile-drag-drop/scroll-behaviour'

export function polyfill() {
    try {
        const testDom = document.createElement('div');
        const supports  = ('draggable' in testDom) || ('ondragstart' in testDom && 'ondrop' in testDom);
        const isIos = navigator.userAgent ? (!!navigator.userAgent.match('iPhone OS') || !!navigator.userAgent.match('iPad')) : false
        testDom.remove()
        
        if((!supports) || isIos){
          console.log('polyfiled dragdrop')
          globalThis.polyfilledDragDrop = true
          dragPolyfill({
            // use this to make use of the scroll behaviour
            dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
            // holdToDrag: 400,
            forceApply: true
          });
        }
        else{
          console.log("supports dragdrop")
        }
    } catch (error) {
        
    }
    globalThis.Buffer = BufferPolyfill
    //@ts-ignore
    globalThis.WritableStream = globalThis.WritableStream ?? WritableStream
    globalThis.ReadableStream = globalThis.ReadableStream ?? ReadableStream
    globalThis.TransformStream = globalThis.TransformStream ?? TransformStream   
}
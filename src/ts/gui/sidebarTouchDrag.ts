import { on } from "svelte/events";
import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour";

/** Touch dragging uses the sidebar's existing drag/drop handlers. */
export function sidebarTouchDrag(node: HTMLElement) {
  let touchId: number | undefined;
  let originX = 0;
  let originY = 0;
  let ready = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let transfer: DataTransfer | undefined;
  let preview: HTMLElement | undefined;
  let target: Element | null = null;
  let suppressClick = false;

  function dispatch(type: string, element: Element, x: number, y: number) {
    return !element.dispatchEvent(
      new DragEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        dataTransfer: transfer,
      }),
    );
  }

  function cleanup() {
    clearTimeout(timer);
    if (transfer)
      scrollBehaviourDragImageTranslateOverride(
        undefined,
        undefined,
        undefined,
        () => {},
      );
    preview?.remove();
    preview = undefined;
    transfer = undefined;
    target = null;
    touchId = undefined;
    ready = false;
  }

  function updateTarget(x: number, y: number) {
    const next = document.elementFromPoint(x, y);
    if (next !== target) {
      if (target) dispatch("dragleave", target, x, y);
      target = next;
      if (target) dispatch("dragenter", target, x, y);
    }
    return target ? dispatch("dragover", target, x, y) : false;
  }

  function cancel() {
    if (transfer) {
      if (target) dispatch("dragleave", target, originX, originY);
      dispatch("dragend", node, originX, originY);
    }
    cleanup();
  }

  const off = [
    on(
      node,
      "touchstart",
      (event) => {
        suppressClick = false;
        if (event.touches.length !== 1) {
          cancel();
          return;
        }
        // Keep the global mobile polyfill from starting a second drag.
        event.stopPropagation();
        const touch = event.changedTouches[0];
        touchId = touch.identifier;
        originX = touch.clientX;
        originY = touch.clientY;
        timer = setTimeout(() => {
          ready = true;
        }, 350);
      },
      { passive: true },
    ),
    on(
      node,
      "touchmove",
      (event) => {
        const touch = Array.from(event.changedTouches).find(
          (t) => t.identifier === touchId,
        );
        if (!touch) return;
        if (event.touches.length !== 1) {
          cancel();
          return;
        }
        if (!ready) {
          if (Math.hypot(touch.clientX - originX, touch.clientY - originY) > 8)
            cleanup();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (!transfer) {
          transfer = new DataTransfer();
          if (dispatch("dragstart", node, originX, originY)) {
            cleanup();
            return;
          }
          suppressClick = true;
          const avatar = node.querySelector<HTMLElement>(".avatar");
          if (avatar) {
            preview = avatar.cloneNode(true) as HTMLElement;
            const rect = avatar.getBoundingClientRect();
            preview.style.cssText = `position:fixed;left:0;top:0;width:${rect.width}px;height:${rect.height}px;opacity:0.6;z-index:999999;pointer-events:none;`;
            preview.querySelectorAll<HTMLElement>("*").forEach((child) => {
              child.style.pointerEvents = "none";
            });
            preview.setAttribute("aria-hidden", "true");
            document.body.appendChild(preview);
          }
        }
        if (preview)
          preview.style.transform = `translate(${touch.clientX}px, ${touch.clientY}px) translate(-50%, -50%)`;
        updateTarget(touch.clientX, touch.clientY);
        scrollBehaviourDragImageTranslateOverride(
          event,
          { x: touch.clientX, y: touch.clientY },
          target as HTMLElement,
          () => updateTarget(touch.clientX, touch.clientY),
        );
      },
      { passive: false },
    ),
    on(
      node,
      "touchend",
      (event) => {
        const touch = Array.from(event.changedTouches).find(
          (t) => t.identifier === touchId,
        );
        if (!touch) return;
        if (transfer) {
          event.preventDefault();
          event.stopPropagation();
          // Resolve at release, even if the last movement was very quick.
          try {
            if (updateTarget(touch.clientX, touch.clientY) && target) {
              dispatch("drop", target, touch.clientX, touch.clientY);
            }
          } finally {
            dispatch("dragend", node, touch.clientX, touch.clientY);
            cleanup();
          }
        } else cleanup();
      },
      { passive: false },
    ),
    on(node, "touchcancel", cancel),
    on(window, "blur", cancel),
    on(
      node,
      "contextmenu",
      (event) => {
        if (touchId !== undefined) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    ),
    on(
      node,
      "dragstart",
      (event) => {
        if (event.isTrusted && touchId !== undefined) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    ),
    on(
      node,
      "click",
      (event) => {
        if (suppressClick) {
          event.preventDefault();
          event.stopImmediatePropagation();
          suppressClick = false;
        }
      },
      { capture: true },
    ),
  ];
  return {
    destroy() {
      cancel();
      off.forEach((remove) => remove());
    },
  };
}

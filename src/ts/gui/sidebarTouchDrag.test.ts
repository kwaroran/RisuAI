import { afterEach, expect, test, vi } from "vitest";
import { sidebarTouchDrag } from "./sidebarTouchDrag";

let destroy: (() => void) | undefined;
afterEach(() => {
  destroy?.();
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup() {
  vi.useFakeTimers();
  // happy-dom's DragEvent does not implement dataTransfer yet.
  vi.stubGlobal(
    "DragEvent",
    class extends MouseEvent {
      dataTransfer: DataTransfer | null;
      constructor(type: string, init: DragEventInit) {
        super(type, init);
        this.dataTransfer = init.dataTransfer ?? null;
      }
    },
  );
  const source = document.createElement("div");
  source.innerHTML = '<span class="avatar">Bot</span>';
  const destination = document.createElement("div");
  document.body.append(source, destination);
  destroy = sidebarTouchDrag(source).destroy;
  const start = vi.fn((event: DragEvent) =>
    event.dataTransfer!.setData("application/x-risu-sidebar-drag", "true"),
  );
  const drop = vi.fn();
  source.addEventListener("dragstart", start);
  destination.addEventListener("dragover", (event) => event.preventDefault());
  destination.addEventListener("drop", drop);
  vi.spyOn(document, "elementFromPoint").mockReturnValue(destination);
  const touch = (type: string, y: number) => {
    const point = { identifier: 1, clientX: 40, clientY: y };
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
      touches: { value: type === "touchend" ? [] : [point] },
      changedTouches: { value: [point] },
    });
    source.dispatchEvent(event);
    return event;
  };
  return { source, destination, start, drop, touch };
}

test("drops on the release target without waiting for a polling interval", async () => {
  const { source, destination, start, drop, touch } = setup();
  await Promise.resolve();
  touch("touchstart", 90);
  vi.advanceTimersByTime(350);
  touch("touchmove", 100);
  // Release over a different target immediately after starting the drag.
  const gap = document.createElement("div");
  document.body.append(gap);
  const reorder = vi.fn();
  gap.addEventListener("dragover", (event) => event.preventDefault());
  gap.addEventListener("drop", reorder);
  vi.mocked(document.elementFromPoint).mockReturnValue(gap);
  touch("touchend", 200);
  expect(start).toHaveBeenCalledOnce();
  expect(drop).not.toHaveBeenCalled();
  expect(reorder).toHaveBeenCalledOnce();
  expect((reorder.mock.calls[0][0] as DragEvent).dataTransfer!.types).toContain(
    "application/x-risu-sidebar-drag",
  );
  expect(document.querySelector("[aria-hidden=true]")).toBeNull();
  expect(
    source.dispatchEvent(new MouseEvent("click", { cancelable: true })),
  ).toBe(false);
  expect(destination.isConnected).toBe(true);
});

test("holding and dropping on a bot delivers the existing folder drop event", async () => {
  const { drop, touch } = setup();
  await Promise.resolve();
  touch("touchstart", 90);
  vi.advanceTimersByTime(350);
  touch("touchmove", 100);
  touch("touchend", 160);
  expect(drop).toHaveBeenCalledOnce();
});

test("swiping before the hold delay preserves scrolling and does not start a drag", async () => {
  const { start, drop, touch } = setup();
  await Promise.resolve();
  touch("touchstart", 90);
  expect(touch("touchmove", 110).defaultPrevented).toBe(false);
  vi.advanceTimersByTime(400);
  touch("touchmove", 160);
  touch("touchend", 160);
  expect(start).not.toHaveBeenCalled();
  expect(drop).not.toHaveBeenCalled();
});

test("cancellation clears the preview without dropping", async () => {
  const { drop, touch } = setup();
  await Promise.resolve();
  touch("touchstart", 90);
  vi.advanceTimersByTime(350);
  touch("touchmove", 100);
  touch("touchcancel", 100);
  touch("touchend", 160);
  expect(drop).not.toHaveBeenCalled();
  expect(document.querySelector("[aria-hidden=true]")).toBeNull();
});

test("releasing outside an accepted target does not drop", async () => {
  const { drop, touch } = setup();
  await Promise.resolve();
  touch("touchstart", 90);
  vi.advanceTimersByTime(350);
  touch("touchmove", 100);
  vi.mocked(document.elementFromPoint).mockReturnValue(document.body);
  touch("touchend", 160);
  expect(drop).not.toHaveBeenCalled();
  expect(document.querySelector("[aria-hidden=true]")).toBeNull();
});

test("mouse dragstart remains available without a touch gesture", async () => {
  const { source, start } = setup();
  await Promise.resolve();
  const event = new DragEvent("dragstart", {
    cancelable: true,
    dataTransfer: new DataTransfer(),
  });
  expect(source.dispatchEvent(event)).toBe(true);
  expect(start).toHaveBeenCalledOnce();
});

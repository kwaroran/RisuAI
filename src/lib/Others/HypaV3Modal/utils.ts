import { get } from "svelte/store";
import { processScriptFull, risuChatParser } from "src/ts/process/scripts";
import { type Message } from "src/ts/storage/database.svelte";
import { alertConfirm } from "src/ts/alert";
import { DBState, selectedCharID } from "src/ts/stores.svelte";

export async function alertConfirmTwice(
  firstMessage: string,
  secondMessage: string
): Promise<boolean> {
  return (
    (await alertConfirm(firstMessage)) && (await alertConfirm(secondMessage))
  );
}

export type DualActionParams = {
  onMainAction?: () => void;
  onAlternativeAction?: () => void;
};

export function handleDualAction(
  element: HTMLElement,
  params: DualActionParams = {}
) {
  const DOUBLE_TAP_DELAY = 300;

  const state = {
    lastTap: 0,
    tapTimeout: null,
  };

  const handleTouch = (event: TouchEvent) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - state.lastTap;

    if (tapLength < DOUBLE_TAP_DELAY && tapLength > 0) {
      // Double tap detected
      event.preventDefault();
      window.clearTimeout(state.tapTimeout); // Cancel the first tap timeout
      params.onAlternativeAction?.();
      state.lastTap = 0; // Reset state
    } else {
      state.lastTap = currentTime; // First tap
      // Delayed single tap execution
      state.tapTimeout = window.setTimeout(() => {
        if (state.lastTap === currentTime) {
          // If no double tap occurred
          params.onMainAction?.();
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleClick = (event: MouseEvent) => {
    if (event.shiftKey) {
      params.onAlternativeAction?.();
    } else {
      params.onMainAction?.();
    }
  };

  if ("ontouchend" in window) {
    // Mobile environment
    element.addEventListener("touchend", handleTouch);
  } else {
    // Desktop environment
    element.addEventListener("click", handleClick);
  }

  return {
    destroy() {
      if ("ontouchend" in window) {
        element.removeEventListener("touchend", handleTouch);
      } else {
        element.removeEventListener("click", handleClick);
      }

      window.clearTimeout(state.tapTimeout); // Cleanup timeout
    },
    update(newParams: DualActionParams) {
      params = newParams;
    },
  };
}

export function getFirstMessage(): string | null {
  const char = DBState.db.characters[get(selectedCharID)];
  const chat = char.chats[DBState.db.characters[get(selectedCharID)].chatPage];

  return chat.fmIndex === -1
    ? char.firstMessage
    : char.alternateGreetings?.[chat.fmIndex]
    ? char.alternateGreetings[chat.fmIndex]
    : null;
}

export async function processRegexScript(
  msg: Message,
  msgIndex: number = -1
): Promise<Message> {
  const char = DBState.db.characters[get(selectedCharID)];
  const newData: string = (
    await processScriptFull(
      char,
      risuChatParser(msg.data, { chara: char, role: msg.role }),
      "editprocess",
      msgIndex,
      {
        chatRole: msg.role,
      }
    )
  ).data;

  return {
    ...msg,
    data: newData,
  };
}

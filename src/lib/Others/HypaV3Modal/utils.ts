import { get } from "svelte/store";
import { processScriptFull, risuChatParser } from "src/ts/process/scripts";
import { type Message } from "src/ts/storage/database.svelte";
import { alertConfirm } from "src/ts/alert";
import { DBState, selectedCharID } from "src/ts/stores.svelte";
import { language } from "src/lang";

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

export function getCategoryName(categoryId: string | undefined, categories: any[]): string {
  const category = categories.find(c => c.id === (categoryId || ""));
  return category?.name || language.hypaV3Modal.unclassified;
}

export function createCategoryId(): string {
  return `cat_${Date.now()}`;
}

export function shouldShowSummary(
  summary: any, 
  index: number, 
  showImportantOnly: boolean, 
  selectedCategoryFilter: string
): boolean {
  if (showImportantOnly && !summary.isImportant) {
    return false;
  }

  if (selectedCategoryFilter !== "all") {
    const summaryCategory = summary.categoryId || "";
    if (summaryCategory !== selectedCategoryFilter) {
      return false;
    }
  }

  return true;
}

export function isGuidLike(str: string): boolean {
  const strTrimed = str.trim();
  if (strTrimed.length < 4) return false;
  return /^[0-9a-f]{4,12}(-[0-9a-f]{4,12}){0,4}-?$/i.test(strTrimed);
}

export function parseSelectionInput(input: string, totalCount: number): Set<number> {
  const newSelection = new Set<number>();
  const parts = input.split(',').map(s => s.trim()).filter(s => s);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim());
      const start = parseInt(startStr);
      const end = parseInt(endStr);

      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          const index = i - 1;
          if (index >= 0 && index < totalCount) {
            newSelection.add(index);
          }
        }
      }
    } else {
      const num = parseInt(part);
      if (!isNaN(num)) {
        const index = num - 1;
        if (index >= 0 && index < totalCount) {
          newSelection.add(index);
        }
      }
    }
  }

  return newSelection;
}

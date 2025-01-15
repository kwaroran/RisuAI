<script lang="ts">
  import {
    Trash2Icon,
    XIcon,
    LanguagesIcon,
    StarIcon,
    RefreshCw,
    CheckIcon,
  } from "lucide-svelte";
  import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
  import { alertConfirm } from "../../ts/alert";
  import { DBState, alertStore, selectedCharID } from "src/ts/stores.svelte";
  import {
    type SerializableHypaV3Data,
    summarize,
  } from "src/ts/process/memory/hypav3";
  import { translateHTML } from "src/ts/translator/translator";
  import PersonaSettings from "../Setting/Pages/PersonaSettings.svelte";

  type Summary = SerializableHypaV3Data["summaries"][number];

  interface ExtendedSummary extends Summary {
    state: {
      isTranslating: boolean;
      translation?: string | null;
      isRerolling: boolean;
      rerolledText?: string | null;
      isRerolledTranslating: boolean;
      rerolledTranslation?: string | null;
    };
  }

  interface HypaV3ModalState {
    summaries: ExtendedSummary[];
    expandedMessage: {
      summaryChatMemos: string[];
      selectedChatMemo: string;
      isTranslating: boolean;
      translation?: string | null;
    } | null;
  }

  // Initialize modal state
  let modalState = $state<HypaV3ModalState>({
    summaries: DBState.db.characters[$selectedCharID].chats[
      DBState.db.characters[$selectedCharID].chatPage
    ].hypaV3Data.summaries.map((s) => {
      const summary = s as ExtendedSummary;

      summary.state = {
        isTranslating: false,
        translation: null,
        isRerolling: false,
        rerolledText: null,
        isRerolledTranslating: false,
        rerolledTranslation: null,
      };

      return summary;
    }),
    expandedMessage: null,
  });

  async function toggleTranslate(
    summary: ExtendedSummary,
    regenerate?: boolean
  ): Promise<void> {
    if (summary.state.isTranslating) return;

    if (summary.state.translation) {
      summary.state.translation = null;
      return;
    }

    summary.state.isTranslating = true;
    summary.state.translation = "Loading...";

    const result = await translate(summary.text, regenerate);

    summary.state.translation = result;
    summary.state.isTranslating = false;
  }

  function isRerollable(summary: ExtendedSummary): boolean {
    for (const chatMemo of summary.chatMemos) {
      if (typeof chatMemo === "string") {
        const char = DBState.db.characters[$selectedCharID];
        const chat =
          char.chats[DBState.db.characters[$selectedCharID].chatPage];

        if (!chat.message.find((m) => m.chatId === chatMemo)) {
          return false;
        }
      }
    }

    return true;
  }

  async function toggleReroll(summary: ExtendedSummary): Promise<void> {
    if (summary.state.isRerolling) return;
    if (!isRerollable(summary)) return;

    summary.state.isRerolling = true;
    summary.state.rerolledText = "Loading...";

    try {
      const char = DBState.db.characters[$selectedCharID];
      const chat = char.chats[DBState.db.characters[$selectedCharID].chatPage];
      const firstMessage =
        chat.fmIndex === -1
          ? char.firstMessage
          : char.alternateGreetings?.[chat.fmIndex ?? 0];

      const toSummarize = summary.chatMemos.map((chatMemo) => {
        if (chatMemo == null) {
          return {
            role: "assistant",
            data: firstMessage,
          };
        }

        const msg = chat.message.find((m) => m.chatId === chatMemo);

        return msg
          ? {
              role: msg.role === "char" ? "assistant" : msg.role,
              data: msg.data,
            }
          : null;
      });

      const stringifiedChats = toSummarize
        .map((m) => `${m.role}: ${m.data}`)
        .join("\n");

      const summarizeResult = await summarize(stringifiedChats);

      if (summarizeResult.success) {
        summary.state.rerolledText = summarizeResult.data;
      }
    } catch (error) {
      summary.state.rerolledText = "Reroll failed";
    } finally {
      summary.state.isRerolling = false;
    }
  }

  async function toggleTranslateRerolled(
    summary: ExtendedSummary,
    regenerate?: boolean
  ): Promise<void> {
    if (summary.state.isRerolledTranslating) return;

    if (summary.state.rerolledTranslation) {
      summary.state.rerolledTranslation = null;
      return;
    }

    if (!summary.state.rerolledText) return;

    summary.state.isRerolledTranslating = true;
    summary.state.rerolledTranslation = "Loading...";

    const result = await translate(summary.state.rerolledText, regenerate);

    summary.state.rerolledTranslation = result;
    summary.state.isRerolledTranslating = false;
  }

  async function toggleTranslateExpandedMessage(
    regenerate?: boolean
  ): Promise<void> {
    if (!modalState.expandedMessage || modalState.expandedMessage.isTranslating)
      return;

    if (modalState.expandedMessage.translation) {
      modalState.expandedMessage.translation = null;
      return;
    }

    const messageData = getMessageData();

    if (!messageData) return;

    modalState.expandedMessage.isTranslating = true;
    modalState.expandedMessage.translation = "Loading...";

    const result = await translate(messageData.data, regenerate);

    modalState.expandedMessage.translation = result;
    modalState.expandedMessage.isTranslating = false;
  }

  function isMessageExpanded(
    summary: ExtendedSummary,
    chatMemo: string | null
  ): boolean {
    return (
      modalState.expandedMessage?.summaryChatMemos === summary.chatMemos &&
      modalState.expandedMessage?.selectedChatMemo === chatMemo
    );
  }

  function toggleExpandMessage(
    summary: ExtendedSummary,
    chatMemo: string | null
  ): void {
    modalState.expandedMessage = isMessageExpanded(summary, chatMemo)
      ? null
      : {
          summaryChatMemos: summary.chatMemos,
          selectedChatMemo: chatMemo,
          isTranslating: false,
          translation: null,
        };
  }

  function getMessageData(): { role: string; data: string } | null {
    const char = DBState.db.characters[$selectedCharID];
    const chat = char.chats[DBState.db.characters[$selectedCharID].chatPage];
    const firstMessage =
      chat.fmIndex === -1
        ? char.firstMessage
        : char.alternateGreetings?.[chat.fmIndex ?? 0];

    const targetMessage =
      modalState.expandedMessage?.selectedChatMemo == null
        ? { role: "char", data: firstMessage }
        : chat.message.find(
            (m) => m.chatId === modalState.expandedMessage!.selectedChatMemo
          );

    if (!targetMessage) {
      return null;
    }

    return {
      ...targetMessage,
      role: targetMessage.role === "char" ? char.name : targetMessage.role,
    };
  }

  async function translate(
    text: string,
    regenerate?: boolean
  ): Promise<string> {
    try {
      return await translateHTML(text, false, "", -1, regenerate);
    } catch (error) {
      return `Translation failed: ${error}`;
    }
  }

  type DualActionParams = {
    onMainAction?: () => void;
    onAlternativeAction?: () => void;
  };

  function handleDualAction(node: HTMLElement, params: DualActionParams = {}) {
    const state = {
      lastTap: 0,
      tapTimeout: null as any,
    };

    const DOUBLE_TAP_DELAY = 300;

    function handleInteraction(event: Event) {
      if ("ontouchend" in window) {
        // Mobile environment
        const currentTime = new Date().getTime();
        const tapLength = currentTime - state.lastTap;

        if (tapLength < DOUBLE_TAP_DELAY && tapLength > 0) {
          // Double tap detected
          event.preventDefault();
          clearTimeout(state.tapTimeout); // Cancel the first tap timeout
          params.onAlternativeAction?.();
          state.lastTap = 0; // Reset state
        } else {
          // First tap
          state.lastTap = currentTime;

          // Delayed single tap execution
          state.tapTimeout = setTimeout(() => {
            if (state.lastTap === currentTime) {
              // If no double tap occurred
              params.onMainAction?.();
            }
          }, DOUBLE_TAP_DELAY);
        }
      } else {
        // Desktop environment
        if ((event as MouseEvent).shiftKey) {
          params.onAlternativeAction?.();
        } else {
          params.onMainAction?.();
        }
      }
    }

    node.addEventListener("click", handleInteraction);
    node.addEventListener("touchend", handleInteraction);

    return {
      destroy() {
        node.removeEventListener("click", handleInteraction);
        node.removeEventListener("touchend", handleInteraction);
        clearTimeout(state.tapTimeout); // Cleanup timeout
      },
      update(newParams: DualActionParams) {
        params = newParams;
      },
    };
  }
</script>

<div class="fixed inset-0 z-50 bg-black/50 p-4">
  <div class="h-full w-full flex justify-center">
    <div
      class="bg-zinc-900 p-6 rounded-lg flex flex-col w-full max-w-3xl {modalState
        .summaries.length === 0
        ? 'h-48'
        : 'max-h-full'}"
    >
      <!-- Header -->
      <div class="flex justify-between items-center w-full mb-4">
        <h1 class="text-2xl font-semibold text-zinc-100">HypaV3 Data</h1>
        <div class="flex items-center gap-2">
          <!-- Reset Button -->
          <button
            class="p-2 text-zinc-400 hover:text-zinc-200 hover:text-rose-300 transition-colors"
            onclick={async () => {
              let confirmed = await alertConfirm(
                "This action cannot be undone. Do you want to reset HypaV3 data?"
              );

              if (confirmed) {
                confirmed = await alertConfirm(
                  "This action is irreversible. Do you really, really want to reset HypaV3 data?"
                );

                if (confirmed) {
                  DBState.db.characters[$selectedCharID].chats[
                    DBState.db.characters[$selectedCharID].chatPage
                  ].hypaV3Data = {
                    summaries: [],
                  };
                }
              }
            }}
          >
            <Trash2Icon size={24} />
          </button>

          <!-- Close Button -->
          <button
            class="p-2 text-zinc-400 hover:text-zinc-200 hover:text-rose-300 transition-colors"
            onclick={() => {
              alertStore.set({
                type: "none",
                msg: "",
              });
            }}
          >
            <XIcon size={24} />
          </button>
        </div>
      </div>

      <!-- Summaries List -->
      <div class="flex flex-col gap-3 w-full overflow-y-auto">
        {#each modalState.summaries as summary, i}
          <div
            class="flex flex-col p-4 rounded-lg border border-zinc-700 bg-zinc-800/50"
          >
            <!-- Summary Header -->
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-textcolor2">Summary #{i + 1}</span>
              <div class="flex items-center gap-4">
                <!-- Translate Button -->
                <button
                  class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                  use:handleDualAction={{
                    onMainAction: () => toggleTranslate(summary, false),
                    onAlternativeAction: () => toggleTranslate(summary, true),
                  }}
                >
                  <LanguagesIcon size={16} />
                </button>

                <!-- Important Button -->
                <button
                  class="p-2 hover:text-zinc-200 hover:text-amber-300 transition-colors {summary.isImportant
                    ? 'text-yellow-500'
                    : 'text-zinc-400'}"
                  onclick={() => {
                    summary.isImportant = !summary.isImportant;
                  }}
                >
                  <StarIcon size={16} />
                </button>

                <!-- Reroll Button -->
                <button
                  class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                  onclick={async () => await toggleReroll(summary)}
                  disabled={!isRerollable(summary)}
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            <!-- Original Summary -->
            <TextAreaInput
              bind:value={summary.text}
              className="w-full bg-zinc-900 text-zinc-200 rounded-md p-3 min-h-[100px] resize-y"
            />

            <!-- Translation (if exists) -->
            {#if summary.state.translation}
              <div class="mt-4">
                <span class="text-sm text-textcolor2 mb-2 block"
                  >Translation</span
                >
                <div
                  class="p-2 max-h-48 overflow-y-auto bg-zinc-800 rounded-md whitespace-pre-wrap"
                >
                  {summary.state.translation}
                </div>
              </div>
            {/if}

            <!-- Rerolled Summary (if exists) -->
            {#if summary.state.rerolledText}
              <div class="mt-4">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm text-textcolor2">Rerolled Summary</span>
                  <div class="flex items-center gap-2">
                    <!-- Translate Rerolled Button -->
                    <button
                      class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                      use:handleDualAction={{
                        onMainAction: () =>
                          toggleTranslateRerolled(summary, false),
                        onAlternativeAction: () =>
                          toggleTranslateRerolled(summary, true),
                      }}
                    >
                      <LanguagesIcon size={16} />
                    </button>

                    <!-- Cancel Button -->
                    <button
                      class="p-2 text-zinc-400 hover:text-zinc-200 hover:text-rose-300 transition-colors"
                      onclick={() => {
                        summary.state.rerolledText = null;
                        summary.state.rerolledTranslation = null;
                      }}
                    >
                      <XIcon size={16} />
                    </button>

                    <!-- Apply Button -->
                    <button
                      class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                      onclick={() => {
                        summary.text = summary.state.rerolledText!;
                        summary.state.rerolledText = null;
                        summary.state.rerolledTranslation = null;
                      }}
                    >
                      <CheckIcon size={16} />
                    </button>
                  </div>
                </div>
                <TextAreaInput
                  bind:value={summary.state.rerolledText}
                  className="w-full bg-zinc-900 text-zinc-200 rounded-md p-3 min-h-[100px] resize-y"
                />

                <!-- Rerolled Translation (if exists) -->
                {#if summary.state.rerolledTranslation}
                  <div class="mt-4">
                    <span class="text-sm text-textcolor2 mb-2 block"
                      >Rerolled Translation</span
                    >
                    <div
                      class="p-2 max-h-48 overflow-y-auto bg-zinc-800 rounded-md whitespace-pre-wrap"
                    >
                      {summary.state.rerolledTranslation}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Connected Messages -->
            <div class="mt-4">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-textcolor2">
                  Connected Messages ({summary.chatMemos.length})
                </span>
                <!-- Translate Message Button -->
                <button
                  class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                  use:handleDualAction={{
                    onMainAction: () => toggleTranslateExpandedMessage(false),
                    onAlternativeAction: () =>
                      toggleTranslateExpandedMessage(true),
                  }}
                >
                  <LanguagesIcon size={16} />
                </button>
              </div>

              <!-- Message IDs -->
              <div class="flex flex-wrap gap-1">
                {#each summary.chatMemos as chatMemo}
                  <button
                    class="text-xs px-3 py-1.5 bg-zinc-900 text-zinc-300 rounded-full hover:bg-zinc-800 transition-colors {isMessageExpanded(
                      summary,
                      chatMemo
                    )
                      ? 'ring-1 ring-blue-500'
                      : ''}"
                    onclick={() => toggleExpandMessage(summary, chatMemo)}
                  >
                    {chatMemo == null ? "First Message" : chatMemo}
                  </button>
                {/each}
              </div>

              <!-- Selected Message Content -->
              {#if modalState.expandedMessage?.summaryChatMemos === summary.chatMemos}
                {@const messageData = getMessageData()}
                <div class="mt-4">
                  {#if messageData}
                    <!-- Role -->
                    <div class="text-sm text-textcolor2 mb-2 block">
                      {messageData.role}:
                    </div>
                    <!-- Content -->
                    <div
                      class="p-2 max-h-48 overflow-y-auto bg-zinc-800 rounded-md whitespace-pre-wrap"
                    >
                      {messageData.data}
                    </div>
                  {:else}
                    <div class="text-sm text-red-500">Message not found</div>
                  {/if}

                  <!-- Message Translation -->
                  {#if modalState.expandedMessage.translation}
                    <div class="mt-4">
                      <span class="text-sm text-textcolor2 mb-2 block"
                        >Translation</span
                      >
                      <div
                        class="p-2 max-h-48 overflow-y-auto bg-zinc-800 rounded-md whitespace-pre-wrap"
                      >
                        {modalState.expandedMessage.translation}
                      </div>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/each}

        {#if modalState.summaries.length === 0}
          <span class="text-textcolor2 text-center p-4">No summaries yet</span>
        {/if}
      </div>
    </div>
  </div>
</div>

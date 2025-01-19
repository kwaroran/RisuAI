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
  import { alertConfirm, showHypaV3Alert } from "../../ts/alert";
  import { DBState, alertStore, selectedCharID } from "src/ts/stores.svelte";
  import { summarize } from "src/ts/process/memory/hypav3";
  import { type OpenAIChat } from "src/ts/process/index.svelte";
  import { type Message } from "src/ts/storage/database.svelte";
  import { translateHTML } from "src/ts/translator/translator";

  interface SummaryUI {
    isTranslating: boolean;
    translation: string | null;
    isRerolling: boolean;
    rerolledText: string | null;
    isRerolledTranslating: boolean;
    rerolledTranslation: string | null;
  }

  interface ExpandedMessageUI {
    summaryIndex: number;
    selectedChatMemo: string;
    isTranslating: boolean;
    translation?: string | null;
  }

  const hypaV3DataState = $derived(
    DBState.db.characters[$selectedCharID].chats[
      DBState.db.characters[$selectedCharID].chatPage
    ].hypaV3Data
  );

  let summaryUIStates = $state<SummaryUI[]>([]);
  let expandedMessageUIState = $state<ExpandedMessageUI | null>(null);

  $effect.pre(() => {
    summaryUIStates = hypaV3DataState.summaries.map(() => ({
      isTranslating: false,
      translation: null,
      isRerolling: false,
      rerolledText: null,
      isRerolledTranslating: false,
      rerolledTranslation: null,
    }));

    expandedMessageUIState = null;
  });

  async function alertConfirmTwice(
    firstMessage: string,
    secondMessage: string
  ): Promise<boolean> {
    return (
      (await alertConfirm(firstMessage)) && (await alertConfirm(secondMessage))
    );
  }

  function getFirstMessage(): string | null {
    const char = DBState.db.characters[$selectedCharID];
    const chat = char.chats[DBState.db.characters[$selectedCharID].chatPage];

    return chat.fmIndex === -1
      ? char.firstMessage
      : char.alternateGreetings?.[chat.fmIndex]
        ? char.alternateGreetings[chat.fmIndex]
        : null;
  }

  function getMessageFromChatMemo(chatMemo: string | null): Message | null {
    const char = DBState.db.characters[$selectedCharID];
    const chat = char.chats[DBState.db.characters[$selectedCharID].chatPage];
    const firstMessage = getFirstMessage();

    if (!firstMessage) {
      return null;
    }

    if (chatMemo == null) {
      return { role: "char", data: firstMessage };
    }

    return chat.message.find((m) => m.chatId === chatMemo) || null;
  }

  async function toggleTranslate(
    summaryIndex: number,
    regenerate?: boolean
  ): Promise<void> {
    const summaryUIState = summaryUIStates[summaryIndex];

    if (summaryUIState.isTranslating) return;

    if (summaryUIState.translation) {
      summaryUIState.translation = null;
      return;
    }

    summaryUIState.isTranslating = true;
    summaryUIState.translation = "Loading...";

    const result = await translate(
      hypaV3DataState.summaries[summaryIndex].text,
      regenerate
    );

    summaryUIState.translation = result;
    summaryUIState.isTranslating = false;
  }

  function isRerollable(summaryIndex: number): boolean {
    const summary = hypaV3DataState.summaries[summaryIndex];

    for (const chatMemo of summary.chatMemos) {
      if (!getMessageFromChatMemo(chatMemo)) {
        return false;
      }
    }

    return true;
  }

  async function toggleReroll(summaryIndex: number): Promise<void> {
    const summaryUIState = summaryUIStates[summaryIndex];

    if (summaryUIState.isRerolling) return;
    if (!isRerollable(summaryIndex)) return;

    summaryUIState.isRerolling = true;
    summaryUIState.rerolledText = "Loading...";

    try {
      const summary = hypaV3DataState.summaries[summaryIndex];
      const toSummarize: OpenAIChat[] = summary.chatMemos.map((chatMemo) => {
        const message = getMessageFromChatMemo(chatMemo);

        return {
          role: (message.role === "char"
            ? "assistant"
            : message.role) as OpenAIChat["role"],
          content: message.data,
        };
      });

      const summarizeResult = await summarize(toSummarize);

      if (summarizeResult.success) {
        summaryUIState.rerolledText = summarizeResult.data;
      }
    } catch (error) {
      summaryUIState.rerolledText = "Reroll failed";
    } finally {
      summaryUIState.isRerolling = false;
    }
  }

  async function toggleTranslateRerolled(
    summaryIndex: number,
    regenerate?: boolean
  ): Promise<void> {
    const summaryUIState = summaryUIStates[summaryIndex];

    if (summaryUIState.isRerolledTranslating) return;

    if (summaryUIState.rerolledTranslation) {
      summaryUIState.rerolledTranslation = null;
      return;
    }

    if (!summaryUIState.rerolledText) return;

    summaryUIState.isRerolledTranslating = true;
    summaryUIState.rerolledTranslation = "Loading...";

    const result = await translate(summaryUIState.rerolledText, regenerate);

    summaryUIState.rerolledTranslation = result;
    summaryUIState.isRerolledTranslating = false;
  }

  async function toggleTranslateExpandedMessage(
    regenerate?: boolean
  ): Promise<void> {
    if (!expandedMessageUIState || expandedMessageUIState.isTranslating) return;

    if (expandedMessageUIState.translation) {
      expandedMessageUIState.translation = null;
      return;
    }

    const message = getMessageFromChatMemo(
      expandedMessageUIState.selectedChatMemo
    );

    if (!message) return;

    expandedMessageUIState.isTranslating = true;
    expandedMessageUIState.translation = "Loading...";

    const result = await translate(message.data, regenerate);

    expandedMessageUIState.translation = result;
    expandedMessageUIState.isTranslating = false;
  }

  function isMessageExpanded(
    summaryIndex: number,
    chatMemo: string | null
  ): boolean {
    if (!expandedMessageUIState) return false;

    const summary = hypaV3DataState.summaries[summaryIndex];

    return (
      expandedMessageUIState.summaryIndex === summaryIndex &&
      expandedMessageUIState.selectedChatMemo === chatMemo
    );
  }

  function toggleExpandMessage(
    summaryIndex: number,
    chatMemo: string | null
  ): void {
    expandedMessageUIState = isMessageExpanded(summaryIndex, chatMemo)
      ? null
      : {
          summaryIndex,
          selectedChatMemo: chatMemo,
          isTranslating: false,
          translation: null,
        };
  }

  function getNextMessageToSummarize(): Message | null {
    const char = DBState.db.characters[$selectedCharID];
    const chat = char.chats[DBState.db.characters[$selectedCharID].chatPage];
    const firstMessage = getFirstMessage();

    if (!firstMessage) {
      return null;
    }

    // Summaries exist
    if (hypaV3DataState.summaries.length > 0) {
      const lastSummary = hypaV3DataState.summaries.at(-1);
      const lastMessageIndex = chat.message.findIndex(
        (msg) => msg.chatId === lastSummary.chatMemos.at(-1)
      );

      if (lastMessageIndex !== -1) {
        const nextMessage = chat.message[lastMessageIndex + 1];

        if (nextMessage) {
          return nextMessage;
        }
      }
    }

    // No summaries
    if (firstMessage?.trim() === "") {
      if (chat.message.length > 0) {
        return chat.message[0];
      }

      return null;
    }

    // will summarize first message
    return { role: "char", chatId: "first message", data: firstMessage };
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
        clearTimeout(state.tapTimeout); // Cancel the first tap timeout
        params.onAlternativeAction?.();
        state.lastTap = 0; // Reset state
      } else {
        state.lastTap = currentTime; // First tap
        // Delayed single tap execution
        state.tapTimeout = setTimeout(() => {
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
``      }
    };

    if ("ontouchend" in window) {
      // Mobile environment
      node.addEventListener("touchend", handleTouch);
    } else {
      // Desktop environment
      node.addEventListener("click", handleClick);
    }

    return {
      destroy() {
        if ("ontouchend" in window) {
          node.removeEventListener("touchend", handleTouch);
        } else {
          node.removeEventListener("click", handleClick);
        }

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
      class="bg-zinc-900 p-6 rounded-lg flex flex-col w-full max-w-3xl {hypaV3DataState
        .summaries.length === 0
        ? 'max-h-[26rem]'
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
              if (
                await alertConfirmTwice(
                  "This action cannot be undone. Do you want to reset HypaV3 data?",
                  "This action is irreversible. Do you really, really want to reset HypaV3 data?"
                )
              ) {
                DBState.db.characters[$selectedCharID].chats[
                  DBState.db.characters[$selectedCharID].chatPage
                ].hypaV3Data = {
                  summaries: [],
                  lastSelectedSummaries: [],
                };
              } else {
                showHypaV3Alert();
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
        {#if hypaV3DataState.summaries.length === 0}
          <span class="text-textcolor2 text-center p-4">No summaries yet</span>
        {/if}

        {#each hypaV3DataState.summaries as summary, i}
          {#if summaryUIStates[i]}
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
                      onMainAction: () => toggleTranslate(i, false),
                      onAlternativeAction: () => toggleTranslate(i, true),
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
                    onclick={async () => await toggleReroll(i)}
                    disabled={!isRerollable(i)}
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
              {#if summaryUIStates[i].translation}
                <div class="mt-4">
                  <span class="text-sm text-textcolor2 mb-2 block"
                    >Translation</span
                  >
                  <div
                    class="p-2 max-h-48 overflow-y-auto bg-zinc-800 rounded-md whitespace-pre-wrap"
                  >
                    {summaryUIStates[i].translation}
                  </div>
                </div>
              {/if}

              <!-- Rerolled Summary (if exists) -->
              {#if summaryUIStates[i].rerolledText}
                <div class="mt-4">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-textcolor2">Rerolled Summary</span
                    >
                    <div class="flex items-center gap-2">
                      <!-- Translate Rerolled Button -->
                      <button
                        class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                        use:handleDualAction={{
                          onMainAction: () => toggleTranslateRerolled(i, false),
                          onAlternativeAction: () =>
                            toggleTranslateRerolled(i, true),
                        }}
                      >
                        <LanguagesIcon size={16} />
                      </button>

                      <!-- Cancel Button -->
                      <button
                        class="p-2 text-zinc-400 hover:text-zinc-200 hover:text-rose-300 transition-colors"
                        onclick={() => {
                          summaryUIStates[i].rerolledText = null;
                          summaryUIStates[i].rerolledTranslation = null;
                        }}
                      >
                        <XIcon size={16} />
                      </button>

                      <!-- Apply Button -->
                      <button
                        class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                        onclick={() => {
                          summary.text = summaryUIStates[i].rerolledText!;
                          summaryUIStates[i].translation = null;
                          summaryUIStates[i].rerolledText = null;
                          summaryUIStates[i].rerolledTranslation = null;
                        }}
                      >
                        <CheckIcon size={16} />
                      </button>
                    </div>
                  </div>
                  <TextAreaInput
                    bind:value={summaryUIStates[i].rerolledText}
                    className="w-full bg-zinc-900 text-zinc-200 rounded-md p-3 min-h-[100px] resize-y"
                  />

                  <!-- Rerolled Translation (if exists) -->
                  {#if summaryUIStates[i].rerolledTranslation}
                    <div class="mt-4">
                      <span class="text-sm text-textcolor2 mb-2 block"
                        >Rerolled Translation</span
                      >
                      <div
                        class="p-2 max-h-48 overflow-y-auto bg-zinc-800 rounded-md whitespace-pre-wrap"
                      >
                        {summaryUIStates[i].rerolledTranslation}
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
                        i,
                        chatMemo
                      )
                        ? 'ring-1 ring-blue-500'
                        : ''}"
                      onclick={() => toggleExpandMessage(i, chatMemo)}
                    >
                      {chatMemo == null ? "First Message" : chatMemo}
                    </button>
                  {/each}
                </div>

                <!-- Selected Message Content -->
                {#if expandedMessageUIState?.summaryIndex === i}
                  {@const message = getMessageFromChatMemo(
                    expandedMessageUIState.selectedChatMemo
                  )}
                  <div class="mt-4">
                    {#if message}
                      <!-- Role -->
                      <div class="text-sm text-textcolor2 mb-2 block">
                        {message.role}'s Message
                      </div>
                      <!-- Content -->
                      <div
                        class="p-2 max-h-48 overflow-y-auto bg-zinc-800 rounded-md whitespace-pre-wrap"
                      >
                        {message.data}
                      </div>
                    {:else}
                      <div class="text-sm text-red-500">Message not found</div>
                    {/if}

                    <!-- Message Translation -->
                    {#if expandedMessageUIState.translation}
                      <div class="mt-4">
                        <span class="text-sm text-textcolor2 mb-2 block"
                          >Translation</span
                        >
                        <div
                          class="p-2 max-h-48 overflow-y-auto bg-zinc-800 rounded-md whitespace-pre-wrap"
                        >
                          {expandedMessageUIState.translation}
                        </div>
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        {/each}

        {#if true}
          <!-- Next message to summarize -->
          {@const nextMessage = getNextMessageToSummarize()}
          {#if nextMessage}
            <div class="mt-4">
              <span class="text-sm text-textcolor2 mb-2 block">
                HypaV3 will summarize [{nextMessage.chatId}]
              </span>
              <div
                class="p-2 max-h-48 overflow-y-auto bg-zinc-800 rounded-md whitespace-pre-wrap"
              >
                {nextMessage.data}
              </div>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</div>

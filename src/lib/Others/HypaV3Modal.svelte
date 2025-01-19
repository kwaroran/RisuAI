<script lang="ts">
  import { tick } from "svelte";
  import {
    SettingsIcon,
    Trash2Icon,
    XIcon,
    LanguagesIcon,
    StarIcon,
    RefreshCw,
    ScissorsLineDashed,
    CheckIcon,
  } from "lucide-svelte";
  import TextAreaInput from "../../lib/UI/GUI/TextAreaInput.svelte";
  import {
    alertConfirm,
    alertNormalWait,
    showHypaV3Alert,
  } from "../../ts/alert";
  import {
    DBState,
    alertStore,
    selectedCharID,
    settingsOpen,
    SettingsMenuIndex,
  } from "../../ts/stores.svelte";
  import { type OpenAIChat } from "../../ts/process/index.svelte";
  import {
    processScriptFull,
    risuChatParser,
  } from "../../ts/process/scripts";
  import { summarize } from "../../ts/process/memory/hypav3";
  import { type Message } from "../../ts/storage/database.svelte";
  import { translateHTML } from "../../ts/translator/translator";

  interface SummaryUI {
    isTranslating: boolean;
    translation: string | null;
    translationRef: HTMLDivElement;
    isRerolling: boolean;
    rerolledText: string | null;
    isRerolledTranslating: boolean;
    rerolledTranslation: string | null;
    rerolledTranslationRef: HTMLDivElement;
  }

  interface ExpandedMessageUI {
    summaryIndex: number;
    selectedChatMemo: string;
    isTranslating: boolean;
    translation: string | null;
    translationRef: HTMLDivElement;
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
      translationRef: null,
      isRerolling: false,
      rerolledText: null,
      isRerolledTranslating: false,
      rerolledTranslation: null,
      rerolledTranslationRef: null,
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

    // Focus on translation element after it's rendered
    await tick();

    if (summaryUIState.translationRef) {
      summaryUIState.translationRef.focus();
      summaryUIState.translationRef.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }

    // Translate
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
      const toSummarize: OpenAIChat[] = await Promise.all(
        summary.chatMemos.map(async (chatMemo) => {
          // Processed message
          const message = await getProcessedMessageFromChatMemo(chatMemo);

          return {
            role: (message.role === "char"
              ? "assistant"
              : message.role) as OpenAIChat["role"],
            content: message.data,
          };
        })
      );

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

    // Focus on rerolled translation element after it's rendered
    await tick();

    if (summaryUIState.rerolledTranslationRef) {
      summaryUIState.rerolledTranslationRef.focus();
      summaryUIState.rerolledTranslationRef.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }

    // Translate
    const result = await translate(summaryUIState.rerolledText, regenerate);

    summaryUIState.rerolledTranslation = result;
    summaryUIState.isRerolledTranslating = false;
  }

  async function getProcessedMessageFromChatMemo(
    chatMemo: string | null
  ): Promise<Message | null> {
    const unprocessed = getMessageFromChatMemo(chatMemo);

    if (!unprocessed) {
      return null;
    }

    return DBState.db.hypaV3Settings.processRegexScript
      ? await processRegexScript(unprocessed)
      : unprocessed;
  }

  function getMessageFromChatMemo(chatMemo: string | null): Message | null {
    const char = DBState.db.characters[$selectedCharID];
    const chat = char.chats[DBState.db.characters[$selectedCharID].chatPage];

    if (chatMemo == null) {
      const firstMessage = getFirstMessage();

      return firstMessage ? { role: "char", data: firstMessage } : null;
    }

    return chat.message.find((m) => m.chatId === chatMemo) || null;
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

  async function processRegexScript(msg: Message): Promise<Message> {
    const char = DBState.db.characters[$selectedCharID];
    const chat = char.chats[DBState.db.characters[$selectedCharID].chatPage];
    const newData: string = (
      await processScriptFull(
        char,
        risuChatParser(msg.data, { chara: char, role: msg.role }),
        "editprocess",
        -1,
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
          translationRef: null,
        };
  }

  async function toggleTranslateExpandedMessage(
    regenerate?: boolean
  ): Promise<void> {
    if (!expandedMessageUIState || expandedMessageUIState.isTranslating) return;

    if (expandedMessageUIState.translation) {
      expandedMessageUIState.translation = null;
      return;
    }

    // Processed message
    const message = await getProcessedMessageFromChatMemo(
      expandedMessageUIState.selectedChatMemo
    );

    if (!message) return;

    expandedMessageUIState.isTranslating = true;
    expandedMessageUIState.translation = "Loading...";

    // Focus on translation element after it's rendered
    await tick();

    if (expandedMessageUIState.translationRef) {
      expandedMessageUIState.translationRef.focus();
      expandedMessageUIState.translationRef.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }

    // Translate
    const result = await translate(message.data, regenerate);

    expandedMessageUIState.translation = result;
    expandedMessageUIState.isTranslating = false;
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

  async function getProcessedNextSummarizationTarget(): Promise<Message | null> {
    const unprocessed = getNextSummarizationTarget();

    if (!unprocessed) {
      return null;
    }

    return DBState.db.hypaV3Settings.processRegexScript
      ? await processRegexScript(unprocessed)
      : unprocessed;
  }

  function getNextSummarizationTarget(): Message | null {
    const char = DBState.db.characters[$selectedCharID];
    const chat = char.chats[DBState.db.characters[$selectedCharID].chatPage];

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

    const firstMessage = getFirstMessage();

    // When no summaries exist OR couldn't find last connected message
    // Check if first message is available
    if (!firstMessage || firstMessage.trim() === "") {
      if (chat.message.length > 0) {
        return chat.message[0];
      }

      return null;
    }

    // will summarize first message
    return { role: "char", chatId: "first", data: firstMessage };
  }

  function isHypaV2ConversionPossible(): boolean {
    const char = DBState.db.characters[$selectedCharID];
    const chat = char.chats[DBState.db.characters[$selectedCharID].chatPage];

    return chat.hypaV3Data?.summaries?.length === 0 && chat.hypaV2Data != null;
  }

  function convertHypaV2ToV3(): { success: boolean; error?: string } {
    try {
      const char = DBState.db.characters[$selectedCharID];
      const chat = char.chats[DBState.db.characters[$selectedCharID].chatPage];
      const hypaV2Data = chat.hypaV2Data;

      if (chat.hypaV3Data?.summaries?.length > 0) {
        return {
          success: false,
          error: "HypaV3 data already exists.",
        };
      }

      if (!hypaV2Data) {
        return {
          success: false,
          error: "HypaV2 data not found.",
        };
      }

      if (hypaV2Data.mainChunks.length === 0) {
        return {
          success: false,
          error: "No main chunks found.",
        };
      }

      for (let i = 0; i < hypaV2Data.mainChunks.length; i++) {
        const mainChunk = hypaV2Data.mainChunks[i];

        if (!Array.isArray(mainChunk.chatMemos)) {
          return {
            success: false,
            error: `Chunk ${i}'s chatMemos is not an array.`,
          };
        }

        if (mainChunk.chatMemos.length === 0) {
          return {
            success: false,
            error: `Chunk ${i}'s chatMemos is empty.`,
          };
        }
      }

      const newHypaV3Data = {
        summaries: hypaV2Data.mainChunks.map((mainChunk) => ({
          text: mainChunk.text,
          chatMemos: [...mainChunk.chatMemos],
          isImportant: false,
        })),
        lastSelectedSummaries: [],
      };

      chat.hypaV3Data = newHypaV3Data;

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error occurred: ${error.message}`,
      };
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
      }
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

<!-- Modal backdrop -->
<div class="fixed inset-0 z-50 bg-black/50 p-4">
  <!-- Modal wrapper -->
  <div class="h-full w-full flex justify-center">
    <!-- Modal window -->
    <div
      class="bg-zinc-900 p-6 rounded-lg flex flex-col w-full max-w-3xl {hypaV3DataState
        .summaries.length === 0
        ? 'h-fit'
        : 'max-h-full'}"
    >
      <!-- Header -->
      <div class="flex justify-between items-center w-full mb-4">
        <h1 class="text-2xl font-semibold text-zinc-100">HypaV3 Data</h1>
        <!-- Button Container -->
        <div class="flex items-center gap-2">
          <!-- Settings Button -->
          <button
            class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            onclick={() => {
              alertStore.set({
                type: "none",
                msg: "",
              });

              settingsOpen.set(true);
              SettingsMenuIndex.set(2); // Other bot settings
            }}
          >
            <SettingsIcon size={24} />
          </button>

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

      <!-- Scrollable Container -->
      <div class="flex flex-col gap-3 w-full overflow-y-auto">
        {#if hypaV3DataState.summaries.length === 0}
          <!-- Conversion Section -->
          {#if isHypaV2ConversionPossible()}
            <div
              class="flex flex-col p-4 rounded-lg border border-zinc-700 bg-zinc-800/50"
            >
              <div class="mt-4 flex flex-col items-center gap-2">
                <span class="text-textcolor2 text-center p-4"
                  >No summaries yet, but you may convert HypaV2 data to V3.</span
                >
                <button
                  class="px-4 py-2 bg-zinc-800 text-zinc-200 rounded-md hover:bg-zinc-700 transition-colors"
                  onclick={async () => {
                    const conversionResult = convertHypaV2ToV3();

                    if (conversionResult.success) {
                      await alertNormalWait(
                        "Successfully converted HypaV2 data to V3"
                      );
                    } else {
                      await alertNormalWait(
                        `Failed to convert HypaV2 data to V3: ${conversionResult.error}`
                      );
                    }

                    showHypaV3Alert();
                  }}
                >
                  Convert to V3
                </button>
              </div>
            </div>
          {:else}
            <span class="text-textcolor2 text-center p-4">No summaries yet</span
            >
          {/if}
        {/if}

        <!-- Summaries List -->
        {#each hypaV3DataState.summaries as summary, i}
          {#if summaryUIStates[i]}
            <!-- Summary Item  -->
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

                  <!-- Delete After Button -->
                  <button
                    class="p-2 text-zinc-400 hover:text-zinc-200 hover:text-rose-300 transition-colors"
                    onclick={async () => {
                      if (
                        await alertConfirmTwice(
                          "Delete all summaries after this one?",
                          "This action cannot be undone. Are you really sure?"
                        )
                      ) {
                        hypaV3DataState.summaries.splice(i + 1);
                      }

                      showHypaV3Alert();
                    }}
                  >
                    <ScissorsLineDashed size={16} />
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
                    bind:this={summaryUIStates[i].translationRef}
                    tabindex="-1"
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
                        bind:this={summaryUIStates[i].rerolledTranslationRef}
                        tabindex="-1"
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

                <!-- Selected Message (if selected) -->
                {#if expandedMessageUIState?.summaryIndex === i}
                  <div class="mt-4">
                    <!-- Processed Message -->
                    {#await getProcessedMessageFromChatMemo(expandedMessageUIState.selectedChatMemo) then expandedMessage}
                      {#if expandedMessage}
                        <!-- Role -->
                        <div class="text-sm text-textcolor2 mb-2 block">
                          {expandedMessage.role}'s Message
                        </div>
                        <!-- Content -->
                        <div
                          class="p-2 max-h-48 overflow-y-auto bg-zinc-800 rounded-md whitespace-pre-wrap"
                        >
                          {expandedMessage.data}
                        </div>
                      {:else}
                        <div class="text-sm text-red-500">
                          Message not found
                        </div>
                      {/if}
                    {:catch error}
                      <div class="text-sm text-red-500 mb-2">
                        Error loading expanded message: {error.message}
                      </div>
                    {/await}

                    <!-- Message Translation -->
                    {#if expandedMessageUIState.translation}
                      <div class="mt-4">
                        <span class="text-sm text-textcolor2 mb-2 block"
                          >Translation</span
                        >
                        <div
                          class="p-2 max-h-48 overflow-y-auto bg-zinc-800 rounded-md whitespace-pre-wrap"
                          bind:this={expandedMessageUIState.translationRef}
                          tabindex="-1"
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

        <!-- Next Summarization Target -->
        {#await getProcessedNextSummarizationTarget() then nextMessage}
          {#if nextMessage}
            {@const chatId =
              nextMessage.chatId === "first"
                ? "First Message"
                : nextMessage.chatId == null
                  ? "No Message ID"
                  : nextMessage.chatId}
            <div class="mt-4">
              <span class="text-sm text-textcolor2 mb-2 block">
                HypaV3 will summarize [{chatId}]
              </span>
              <div
                class="p-2 max-h-48 overflow-y-auto bg-zinc-800 rounded-md whitespace-pre-wrap"
              >
                {nextMessage.data}
              </div>
            </div>
          {/if}
        {:catch error}
          <div class="text-sm text-red-500 mb-2">
            Error loading next message: {error.message}
          </div>
        {/await}

        <!-- No First Message -->
        {#if !getFirstMessage()}
          <div class="mt-4">
            <div class="text-sm text-red-500 mb-2">
              WARN: Selected first message is empty
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

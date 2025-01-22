<script lang="ts">
  import { untrack, tick } from "svelte";
  import {
    SearchIcon,
    SettingsIcon,
    Trash2Icon,
    XIcon,
    LanguagesIcon,
    StarIcon,
    RefreshCw,
    ScissorsLineDashed,
    CheckIcon,
  } from "lucide-svelte";
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
  import { processScriptFull, risuChatParser } from "../../ts/process/scripts";
  import { summarize } from "../../ts/process/memory/hypav3";
  import { type Message } from "../../ts/storage/database.svelte";
  import { translateHTML } from "../../ts/translator/translator";

  interface SummaryUI {
    originalRef: HTMLTextAreaElement;
    isTranslating: boolean;
    translation: string | null;
    translationRef: HTMLTextAreaElement;
    isRerolling: boolean;
    rerolledText: string | null;
    isRerolledTranslating: boolean;
    rerolledTranslation: string | null;
    rerolledTranslationRef: HTMLTextAreaElement;
    chatMemoRefs: HTMLButtonElement[];
  }

  interface ExpandedMessageUI {
    summaryIndex: number;
    selectedChatMemo: string;
    isTranslating: boolean;
    translation: string | null;
    translationRef: HTMLTextAreaElement;
  }

  interface SearchResult {
    element: HTMLElement;
    matchType: "chatMemo" | "summary";
  }

  interface SearchUI {
    ref: HTMLInputElement;
    query: string;
    currentIndex: number;
    results: SearchResult[];
  }

  const hypaV3DataState = $derived(
    DBState.db.characters[$selectedCharID].chats[
      DBState.db.characters[$selectedCharID].chatPage
    ].hypaV3Data
  );

  let summaryUIStates = $state<SummaryUI[]>([]);
  let expandedMessageUIState = $state<ExpandedMessageUI>(null);
  let searchUIState = $state<SearchUI>(null);

  $effect.pre(() => {
    summaryUIStates = hypaV3DataState.summaries.map((summary) => ({
      originalRef: null,
      isTranslating: false,
      translation: null,
      translationRef: null,
      isRerolling: false,
      rerolledText: null,
      isRerolledTranslating: false,
      rerolledTranslation: null,
      rerolledTranslationRef: null,
      chatMemoRefs: new Array(summary.chatMemos.length).fill(null),
    }));

    untrack(() => {
      expandedMessageUIState = null;
      searchUIState = null;
    });
  });

  async function alertConfirmTwice(
    firstMessage: string,
    secondMessage: string
  ): Promise<boolean> {
    return (
      (await alertConfirm(firstMessage)) && (await alertConfirm(secondMessage))
    );
  }

  async function toggleSearch() {
    if (searchUIState === null) {
      searchUIState = {
        ref: null,
        query: "",
        currentIndex: -1,
        results: [],
      };

      // Focus on search element after it's rendered
      await tick();

      if (searchUIState.ref) {
        searchUIState.ref.focus();
      }
    } else {
      searchUIState = null;
    }
  }

  function onSearch(e: KeyboardEvent) {
    if (!searchUIState) return;

    if (e.key === "Escape") {
      searchUIState = null;
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault(); // Prevent event default action

      const query = searchUIState.query.trim();

      if (!query) return;

      // Search summary index
      if (query.match(/^#\d+$/)) {
        const summaryNumber = parseInt(query.substring(1)) - 1;

        if (
          summaryNumber >= 0 &&
          summaryNumber < hypaV3DataState.summaries.length
        ) {
          summaryUIStates[summaryNumber].originalRef.scrollIntoView({
            behavior: "instant",
            block: "center",
          });
        }

        return;
      }

      const normalizedQuery = query.toLowerCase();

      if (searchUIState.currentIndex === -1) {
        const results: SearchResult[] = [];

        if (isGuidLike(query)) {
          // Search chatMemo
          summaryUIStates.forEach((summaryUI) => {
            summaryUI.chatMemoRefs.forEach((buttonRef) => {
              const buttonText = buttonRef.textContent?.toLowerCase() || "";

              if (buttonText.includes(normalizedQuery)) {
                results.push({
                  element: buttonRef as HTMLButtonElement,
                  matchType: "chatMemo",
                });
              }
            });
          });
        } else {
          // Search summary
          summaryUIStates.forEach((summaryUI) => {
            const textAreaText = summaryUI.originalRef.value?.toLowerCase();

            if (textAreaText.includes(normalizedQuery)) {
              results.push({
                element: summaryUI.originalRef as HTMLTextAreaElement,
                matchType: "summary",
              });
            }
          });
        }

        searchUIState.results = results;
        searchUIState.currentIndex = -1;
      }

      // Rotate search results
      if (searchUIState.results.length > 0) {
        searchUIState.currentIndex =
          (searchUIState.currentIndex + 1) % searchUIState.results.length;

        const currentResult = searchUIState.results[searchUIState.currentIndex];

        // Scroll to element
        currentResult.element.scrollIntoView({
          behavior: "instant",
          block: "center",
        });

        if (currentResult.matchType === "chatMemo") {
          // Simulate focus effect
          currentResult.element.classList.add("ring-2", "ring-zinc-500");

          // Remove focus effect after a short delay
          window.setTimeout(() => {
            currentResult.element.classList.remove("ring-2", "ring-zinc-500");
          }, 1000);
        } else {
          const textarea = currentResult.element as HTMLTextAreaElement;
          const startIndex = textarea.value
            .toLowerCase()
            .indexOf(normalizedQuery);
          const lineHeight = parseInt(
            window.getComputedStyle(textarea).lineHeight,
            10
          );

          if (startIndex !== -1) {
            // Select query
            textarea.setSelectionRange(
              startIndex,
              startIndex + normalizedQuery.length
            );

            // Scroll to the bottom
            textarea.scrollTop = textarea.scrollHeight;

            textarea.blur(); // Collapse selection
            textarea.focus(); // This scrolls the textarea

            searchUIState.ref.focus(); // Restore focus to search bar
          }
        }
      }
    }
  }

  function isGuidLike(str: string): boolean {
    const strTrimed = str.trim();

    // Exclude too short inputs
    if (strTrimed.length < 4) return false;

    return /^[0-9a-f]{4,12}(-[0-9a-f]{4,12}){0,4}-?$/i.test(strTrimed);
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

        window.clearTimeout(state.tapTimeout); // Cleanup timeout
      },
      update(newParams: DualActionParams) {
        params = newParams;
      },
    };
  }
</script>

<!-- Modal backdrop -->
<div class="fixed inset-0 z-50 p-1 sm:p-2 bg-black/50">
  <!-- Modal wrapper -->
  <div class="flex justify-center w-full h-full">
    <!-- Modal window -->
    <div
      class="flex flex-col p-3 sm:p-6 rounded-lg bg-zinc-900 w-full max-w-3xl {hypaV3DataState
        .summaries.length === 0
        ? 'h-fit'
        : 'h-full'}"
    >
      <!-- Header -->
      <div class="flex justify-between items-center mb-2 sm:mb-4">
        <!-- Modal Title -->
        <h1 class="text-lg sm:text-2xl font-semibold text-zinc-300">
          HypaV3 Data
        </h1>
        <!-- Buttons Container -->
        <div class="flex items-center gap-2">
          <!-- Search Button -->
          <button
            class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            onclick={async () => toggleSearch()}
          >
            <SearchIcon class="w-6 h-6" />
          </button>

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
            <SettingsIcon class="w-6 h-6" />
          </button>

          <!-- Reset Button -->
          <button
            class="p-2 text-zinc-400 hover:text-rose-300 transition-colors"
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
            <Trash2Icon class="w-6 h-6" />
          </button>

          <!-- Close Button -->
          <button
            class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            onclick={() => {
              alertStore.set({
                type: "none",
                msg: "",
              });
            }}
          >
            <XIcon class="w-6 h-6" />
          </button>
        </div>
      </div>

      <!-- Scrollable Container -->
      <div class="flex flex-col gap-2 sm:gap-4 overflow-y-auto">
        {#if hypaV3DataState.summaries.length === 0}
          <!-- Conversion Section -->
          {#if isHypaV2ConversionPossible()}
            <div
              class="flex flex-col p-2 sm:p-4 rounded-lg border border-zinc-700 bg-zinc-800/50"
            >
              <div class="flex flex-col items-center">
                <div class="my-1 sm:my-2 text-center text-zinc-300">
                  No summaries yet, but you may convert HypaV2 data to V3.
                </div>
                <button
                  class="my-1 sm:my-2 px-4 py-2 rounded-md text-zinc-300 font-semibold bg-zinc-700 hover:bg-zinc-500 transition-colors"
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
            <div class="p-4 sm:p-3 md:p-4 text-center text-zinc-400">
              No summaries yet
            </div>
          {/if}

          <!-- Search Bar -->
        {:else if searchUIState}
          <div class="sticky top-0 z-50 p-2 sm:p-3 bg-zinc-800">
            <div class="flex items-center gap-2">
              <div class="relative flex flex-1 items-center">
                <input
                  class="w-full px-2 sm:px-4 py-2 sm:py-3 rounded border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-200 bg-zinc-900"
                  placeholder="Enter #N, ID, or search query"
                  bind:this={searchUIState.ref}
                  bind:value={searchUIState.query}
                  oninput={() => {
                    if (searchUIState) {
                      searchUIState.currentIndex = -1;
                      searchUIState.results = [];
                    }
                  }}
                  onkeydown={(e) => onSearch(e)}
                />

                {#if searchUIState.results.length > 0}
                  <span
                    class="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 sm:py-3 py-1 sm:py-2 rounded text-sm font-semibold text-zinc-100 bg-zinc-700/65"
                  >
                    {searchUIState.currentIndex + 1}/{searchUIState.results
                      .length}
                  </span>
                {/if}
              </div>
              <button
                class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                onclick={async () => toggleSearch()}
              >
                <XIcon class="w-6 h-6" />
              </button>
            </div>
          </div>
        {/if}

        <!-- Summaries List -->
        {#each hypaV3DataState.summaries as summary, i}
          {#if summaryUIStates[i]}
            <!-- Summary Item  -->
            <div
              class="flex flex-col p-2 sm:p-4 rounded-lg border border-zinc-700 bg-zinc-800/50"
            >
              <!-- Original Summary Header -->
              <div class="flex justify-between items-center">
                <span class="text-sm text-zinc-400">Summary #{i + 1}</span>

                <div class="flex items-center gap-2">
                  <!-- Translate Button -->
                  <button
                    class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                    use:handleDualAction={{
                      onMainAction: () => toggleTranslate(i, false),
                      onAlternativeAction: () => toggleTranslate(i, true),
                    }}
                  >
                    <LanguagesIcon class="w-4 h-4" />
                  </button>

                  <!-- Important Button -->
                  <button
                    class="p-2 hover:text-zinc-200 transition-colors {summary.isImportant
                      ? 'text-yellow-400'
                      : 'text-zinc-400'}"
                    onclick={() => {
                      summary.isImportant = !summary.isImportant;
                    }}
                  >
                    <StarIcon class="w-4 h-4" />
                  </button>

                  <!-- Reroll Button -->
                  <button
                    class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                    onclick={async () => await toggleReroll(i)}
                    disabled={!isRerollable(i)}
                  >
                    <RefreshCw class="w-4 h-4" />
                  </button>

                  <!-- Delete After Button -->
                  <button
                    class="p-2 text-zinc-400 hover:text-rose-300 transition-colors"
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
                    <ScissorsLineDashed class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Original Summary -->
              <div class="mt-2 sm:mt-4">
                <textarea
                  class="p-2 sm:p-4 w-full min-h-40 sm:min-h-56 resize-vertical rounded border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors text-zinc-200 bg-zinc-900"
                  bind:this={summaryUIStates[i].originalRef}
                  bind:value={summary.text}
                >
                </textarea>
              </div>

              <!-- Original Summary Translation -->
              {#if summaryUIStates[i].translation}
                <div class="mt-2 sm:mt-4">
                  <div class="mb-2 sm:mb-4 text-sm text-zinc-400">
                    Translation
                  </div>

                  <textarea
                    readonly
                    class="p-2 sm:p-4 w-full min-h-40 sm:min-h-56 resize-vertical rounded border border-zinc-700 focus:outline-none transition-colors text-zinc-200 bg-zinc-900"
                    bind:this={summaryUIStates[i].translationRef}
                    tabindex="-1"
                    value={summaryUIStates[i].translation}
                  ></textarea>
                </div>
              {/if}

              {#if summaryUIStates[i].rerolledText}
                <!-- Rerolled Summary Header -->
                <div class="mt-2 sm:mt-4">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-zinc-400">Rerolled Summary</span>
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
                        <LanguagesIcon class="w-4 h-4" />
                      </button>

                      <!-- Cancel Button -->
                      <button
                        class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                        onclick={() => {
                          summaryUIStates[i].rerolledText = null;
                          summaryUIStates[i].rerolledTranslation = null;
                        }}
                      >
                        <XIcon class="w-4 h-4" />
                      </button>

                      <!-- Apply Button -->
                      <button
                        class="p-2 text-zinc-400 hover:text-rose-300 transition-colors"
                        onclick={() => {
                          summary.text = summaryUIStates[i].rerolledText!;
                          summaryUIStates[i].translation = null;
                          summaryUIStates[i].rerolledText = null;
                          summaryUIStates[i].rerolledTranslation = null;
                        }}
                      >
                        <CheckIcon class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Rerolled Summary -->
                <div class="mt-2 sm:mt-4">
                  <textarea
                    class="p-2 sm:p-4 w-full min-h-40 sm:min-h-56 resize-vertical rounded border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors text-zinc-200 bg-zinc-900"
                    bind:value={summaryUIStates[i].rerolledText}
                  >
                  </textarea>
                </div>

                <!-- Rerolled Summary Translation -->
                {#if summaryUIStates[i].rerolledTranslation}
                  <div class="mt-2 sm:mt-4">
                    <div class="mb-2 sm:mb-4 text-sm text-zinc-400">
                      Rerolled Translation
                    </div>

                    <textarea
                      readonly
                      class="p-2 sm:p-4 w-full min-h-40 sm:min-h-56 resize-vertical rounded border border-zinc-700 focus:outline-none transition-colors text-zinc-200 bg-zinc-900"
                      bind:this={summaryUIStates[i].rerolledTranslationRef}
                      tabindex="-1"
                      value={summaryUIStates[i].rerolledTranslation}
                    ></textarea>
                  </div>
                {/if}
              {/if}

              <!-- Connected Messages Header -->
              <div class="mt-2 sm:mt-4">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-zinc-400"
                    >Connected Messages ({summary.chatMemos.length})</span
                  >

                  <div class="flex items-center gap-2">
                    <!-- Translate Message Button -->
                    <button
                      class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                      use:handleDualAction={{
                        onMainAction: () =>
                          toggleTranslateExpandedMessage(false),
                        onAlternativeAction: () =>
                          toggleTranslateExpandedMessage(true),
                      }}
                    >
                      <LanguagesIcon class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Connected Message IDs -->
              <div class="flex flex-wrap mt-2 sm:mt-4 gap-2">
                {#each summary.chatMemos as chatMemo, memoIndex}
                  <button
                    class="px-3 py-2 rounded-full text-xs text-zinc-200 hover:bg-zinc-700 transition-colors bg-zinc-900 {isMessageExpanded(
                      i,
                      chatMemo
                    )
                      ? 'ring-2 ring-zinc-500'
                      : ''}"
                    bind:this={summaryUIStates[i].chatMemoRefs[memoIndex]}
                    onclick={() => toggleExpandMessage(i, chatMemo)}
                  >
                    {chatMemo == null ? "First Message" : chatMemo}
                  </button>
                {/each}
              </div>

              {#if expandedMessageUIState?.summaryIndex === i}
                <!-- Expanded Message -->
                <div class="mt-2 sm:mt-4">
                  <!-- Processed Message -->
                  {#await getProcessedMessageFromChatMemo(expandedMessageUIState.selectedChatMemo) then expandedMessage}
                    {#if expandedMessage}
                      <!-- Role -->
                      <div class="mb-2 sm:mb-4 text-sm text-zinc-400">
                        {expandedMessage.role}'s Message
                      </div>

                      <!-- Content -->
                      <textarea
                        readonly
                        class="p-2 sm:p-4 w-full min-h-40 sm:min-h-56 resize-vertical rounded border border-zinc-700 focus:outline-none transition-colors text-zinc-200 bg-zinc-900"
                        value={expandedMessage.data}
                      ></textarea>
                    {:else}
                      <span class="text-sm text-red-400">Message not found</span
                      >
                    {/if}
                  {:catch error}
                    <span class="text-sm text-red-400"
                      >Error loading expanded message: {error.message}</span
                    >
                  {/await}
                </div>

                <!-- Expanded Message Translation -->
                {#if expandedMessageUIState.translation}
                  <div class="mt-2 sm:mt-4">
                    <div class="mb-2 sm:mb-4 text-sm text-zinc-400">
                      Translation
                    </div>

                    <textarea
                      readonly
                      class="p-2 sm:p-4 w-full min-h-40 sm:min-h-56 resize-vertical rounded border border-zinc-700 focus:outline-none transition-colors text-zinc-200 bg-zinc-900"
                      bind:this={expandedMessageUIState.translationRef}
                      tabindex="-1"
                      value={expandedMessageUIState.translation}
                    ></textarea>
                  </div>
                {/if}
              {/if}
            </div>
          {/if}
        {/each}

        <!-- Next Summarization Target -->
        <div class="mt-2 sm:mt-4">
          {#await getProcessedNextSummarizationTarget() then nextMessage}
            {#if nextMessage}
              {@const chatId =
                nextMessage.chatId === "first"
                  ? "First Message"
                  : nextMessage.chatId == null
                    ? "No Message ID"
                    : nextMessage.chatId}
              <div class="mb-2 sm:mb-4 text-sm text-zinc-400">
                HypaV3 will summarize [{chatId}]
              </div>

              <textarea
                readonly
                class="p-2 sm:p-4 w-full min-h-40 sm:min-h-56 resize-none overflow-y-auto rounded border border-zinc-700 focus:outline-none transition-colors text-zinc-200 bg-zinc-900"
                value={nextMessage.data}
              ></textarea>
            {:else}
              <span class="text-sm text-red-400">WARN: No messages found</span>
            {/if}
          {:catch error}
            <span class="text-sm text-red-400"
              >Error loading next message: {error.message}</span
            >
          {/await}
        </div>

        <!-- No First Message -->
        {#if !getFirstMessage()}
          <div class="mt-2 sm:mt-4">
            <span class="text-sm text-red-400"
              >WARN: Selected first message is empty</span
            >
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<script lang="ts">
  import { untrack, tick } from "svelte";
  import {
    SearchIcon,
    SettingsIcon,
    Trash2Icon,
    XIcon,
    ChevronUpIcon,
    ChevronDownIcon,
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
  import { language } from "../../lang";

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

  class SummarySearchResult {
    constructor(
      public summaryIndex: number,
      public start: number,
      public end: number
    ) {}
  }

  class ChatMemoSearchResult {
    constructor(
      public summaryIndex: number,
      public memoIndex: number
    ) {}
  }

  type SearchResult = SummarySearchResult | ChatMemoSearchResult;

  interface SearchUI {
    ref: HTMLInputElement;
    query: string;
    results: SearchResult[];
    currentResultIndex: number;
    requestedSearchFromIndex: number;
    isNavigating: boolean;
  }

  const hypaV3DataState = $derived(
    DBState.db.characters[$selectedCharID].chats[
      DBState.db.characters[$selectedCharID].chatPage
    ].hypaV3Data
  );

  let summaryUIStates = $state<SummaryUI[]>([]);
  let expandedMessageUIState = $state<ExpandedMessageUI>(null);
  let searchUIState = $state<SearchUI>(null);
  let showImportantOnly = $state(false);

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
        results: [],
        currentResultIndex: -1,
        requestedSearchFromIndex: -1,
        isNavigating: false,
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
      e.preventDefault?.(); // Prevent event default action

      const query = searchUIState.query.trim();

      if (!query) return;

      // When received a new query
      if (searchUIState.currentResultIndex === -1) {
        const results = generateSearchResults(query);

        if (results.length === 0) return;

        searchUIState.results = results;
      }

      const nextResult = getNextSearchResult(e.shiftKey);

      if (nextResult) {
        navigateToSearchResult(nextResult);
      }
    }
  }

  function generateSearchResults(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const normalizedQuery = query.trim().toLowerCase();

    // Search summary index
    if (query.match(/^#\d+$/)) {
      const summaryNumber = parseInt(query.substring(1)) - 1;

      if (
        summaryNumber >= 0 &&
        summaryNumber < hypaV3DataState.summaries.length &&
        (!showImportantOnly ||
          hypaV3DataState.summaries[summaryNumber].isImportant)
      ) {
        results.push(new SummarySearchResult(summaryNumber, 0, 0));
      }

      return results;
    }

    if (isGuidLike(query)) {
      // Search chatMemo
      summaryUIStates.forEach((summaryUI, summaryIndex) => {
        if (
          !showImportantOnly ||
          hypaV3DataState.summaries[summaryIndex].isImportant
        ) {
          summaryUI.chatMemoRefs.forEach((buttonRef, memoIndex) => {
            const buttonText = buttonRef.textContent?.toLowerCase() || "";

            if (buttonText.includes(normalizedQuery)) {
              results.push(new ChatMemoSearchResult(summaryIndex, memoIndex));
            }
          });
        }
      });
    } else {
      // Search summary
      summaryUIStates.forEach((summaryUI, summaryIndex) => {
        if (
          !showImportantOnly ||
          hypaV3DataState.summaries[summaryIndex].isImportant
        ) {
          const textAreaText = summaryUI.originalRef.value?.toLowerCase();
          let pos = -1;

          while (
            (pos = textAreaText.indexOf(normalizedQuery, pos + 1)) !== -1
          ) {
            results.push(
              new SummarySearchResult(
                summaryIndex,
                pos,
                pos + normalizedQuery.length
              )
            );
          }
        }
      });
    }

    return results;
  }

  function isGuidLike(str: string): boolean {
    const strTrimed = str.trim();

    // Exclude too short inputs
    if (strTrimed.length < 4) return false;

    return /^[0-9a-f]{4,12}(-[0-9a-f]{4,12}){0,4}-?$/i.test(strTrimed);
  }

  function getNextSearchResult(backward: boolean): SearchResult | null {
    if (!searchUIState || searchUIState.results.length === 0) return null;

    let nextIndex: number;

    if (searchUIState.requestedSearchFromIndex !== -1) {
      const fromSummaryIndex = searchUIState.requestedSearchFromIndex;

      nextIndex = backward
        ? searchUIState.results.findLastIndex(
            (r) => r.summaryIndex <= fromSummaryIndex
          )
        : searchUIState.results.findIndex(
            (r) => r.summaryIndex >= fromSummaryIndex
          );

      if (nextIndex === -1) {
        nextIndex = backward ? searchUIState.results.length - 1 : 0;
      }

      searchUIState.requestedSearchFromIndex = -1;
    } else {
      const delta = backward ? -1 : 1;

      nextIndex =
        (searchUIState.currentResultIndex +
          delta +
          searchUIState.results.length) %
        searchUIState.results.length;
    }

    searchUIState.currentResultIndex = nextIndex;
    return searchUIState.results[nextIndex];
  }

  function navigateToSearchResult(result: SearchResult) {
    searchUIState.isNavigating = true;

    if (result instanceof SummarySearchResult) {
      const textarea = summaryUIStates[result.summaryIndex].originalRef;

      // Scroll to element
      textarea.scrollIntoView({
        behavior: "instant",
        block: "center",
      });

      if (result.start === result.end) {
        return;
      }

      // Scroll to query
      textarea.setSelectionRange(result.start, result.end);
      scrollToSelection(textarea);

      // Highlight query on desktop environment
      if (!("ontouchend" in window)) {
        // Make readonly temporarily
        textarea.readOnly = true;
        textarea.focus();
        window.setTimeout(() => {
          searchUIState.ref.focus(); // Restore focus to search bar
          textarea.readOnly = false; // Remove readonly after focus moved
        }, 300);
      }
    } else {
      const button =
        summaryUIStates[result.summaryIndex].chatMemoRefs[result.memoIndex];

      // Scroll to element
      button.scrollIntoView({
        behavior: "instant",
        block: "center",
      });

      // Highlight chatMemo
      button.classList.add("ring-2", "ring-zinc-500");

      // Remove highlight after a short delay
      window.setTimeout(() => {
        button.classList.remove("ring-2", "ring-zinc-500");
      }, 1000);
    }

    searchUIState.isNavigating = false;
  }

  function scrollToSelection(textarea: HTMLTextAreaElement) {
    const { selectionStart, selectionEnd } = textarea;

    if (
      selectionStart === null ||
      selectionEnd === null ||
      selectionStart === selectionEnd
    ) {
      return; // Exit if there is no selected text
    }

    // Calculate the text before the selected position based on the textarea's text
    const textBeforeSelection = textarea.value.substring(0, selectionStart);

    // Use a temporary DOM element to calculate the exact position of the selected text
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.whiteSpace = "pre-wrap";
    tempDiv.style.overflowWrap = "break-word";
    tempDiv.style.font = window.getComputedStyle(textarea).font;
    tempDiv.style.width = `${textarea.offsetWidth}px`;
    tempDiv.style.visibility = "hidden"; // Set it to be invisible

    tempDiv.textContent = textBeforeSelection;
    document.body.appendChild(tempDiv);

    // Calculate the position of the selected text within the textarea
    const selectionTop = tempDiv.offsetHeight;
    document.body.removeChild(tempDiv);

    // Adjust the scroll so that the selected text is centered on the screen
    textarea.scrollTop = selectionTop - textarea.clientHeight / 2;
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
          {language.hypaV3Modal.titleLabel}
        </h1>
        <!-- Buttons Container -->
        <div class="flex items-center gap-2">
          <!-- Search Button -->
          <button
            class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            tabindex="-1"
            onclick={async () => toggleSearch()}
            aria-label="검색"
          >
            <SearchIcon class="w-6 h-6" />
          </button>

          <!-- Filter Important Summary Button -->
          <button
            class="p-2 transition-colors {showImportantOnly
              ? 'text-yellow-400 hover:text-yellow-300'
              : 'text-zinc-400 hover:text-zinc-200'}"
            tabindex="-1"
            onclick={() => {
              if (searchUIState) {
                searchUIState.query = "";
                searchUIState.results = [];
                searchUIState.currentResultIndex = -1;
              }

              showImportantOnly = !showImportantOnly;
            }}
            aria-label={showImportantOnly ? "모든 요약 보기" : "중요 요약만 보기"}
          >
            <StarIcon class="w-6 h-6" />
          </button>

          <!-- Settings Button -->
          <button
            class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            tabindex="-1"
            onclick={() => {
              alertStore.set({
                type: "none",
                msg: "",
              });

              settingsOpen.set(true);
              SettingsMenuIndex.set(2); // Other bot settings
            }}
            aria-label="설정"
          >
            <SettingsIcon class="w-6 h-6" />
          </button>

          <!-- Reset Button -->
          <button
            class="p-2 text-zinc-400 hover:text-rose-300 transition-colors"
            tabindex="-1"
            onclick={async () => {
              if (
                await alertConfirmTwice(
                  language.hypaV3Modal.resetConfirmMessage,
                  language.hypaV3Modal.resetConfirmSecondMessage
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
            aria-label="초기화"
          >
            <Trash2Icon class="w-6 h-6" />
          </button>

          <!-- Close Button -->
          <button
            class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            tabindex="-1"
            onclick={() => {
              alertStore.set({
                type: "none",
                msg: "",
              });
            }}
            aria-label="닫기"
          >
            <XIcon class="w-6 h-6" />
          </button>
        </div>
      </div>

      <!-- Scrollable Container -->
      <div class="flex flex-col gap-2 sm:gap-4 overflow-y-auto" tabindex="-1">
        {#if hypaV3DataState.summaries.length === 0}
          <!-- Conversion Section -->
          {#if isHypaV2ConversionPossible()}
            <div
              class="flex flex-col p-2 sm:p-4 rounded-lg border border-zinc-700 bg-zinc-800/50"
            >
              <div class="flex flex-col items-center">
                <div class="my-1 sm:my-2 text-center text-zinc-300">
                  {language.hypaV3Modal.convertLabel}
                </div>
                <button
                  class="my-1 sm:my-2 px-4 py-2 rounded-md text-zinc-300 font-semibold bg-zinc-700 hover:bg-zinc-500 transition-colors"
                  tabindex="-1"
                  onclick={async () => {
                    const conversionResult = convertHypaV2ToV3();

                    if (conversionResult.success) {
                      await alertNormalWait(
                        language.hypaV3Modal.convertSuccessMessage
                      );
                    } else {
                      await alertNormalWait(
                        language.hypaV3Modal.convertErrorMessage.replace(
                          "{0}",
                          conversionResult.error
                        )
                      );
                    }

                    showHypaV3Alert();
                  }}
                >
                  {language.hypaV3Modal.convertButton}
                </button>
              </div>
            </div>
          {:else}
            <div class="p-4 sm:p-3 md:p-4 text-center text-zinc-400">
              {language.hypaV3Modal.noSummariesLabel}
            </div>
          {/if}

          <!-- Search Bar -->
        {:else if searchUIState}
          <div class="sticky top-0 z-50 p-2 sm:p-3 bg-zinc-800">
            <div class="flex items-center gap-2">
              <div class="relative flex flex-1 items-center">
                <form
                  class="w-full"
                  onsubmit={(e) => {
                    e.preventDefault();
                    onSearch({ key: "Enter" } as KeyboardEvent);
                  }}
                >
                  <input
                    class="w-full px-2 sm:px-4 py-2 sm:py-3 rounded border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-200 bg-zinc-900"
                    placeholder={language.hypaV3Modal.searchPlaceholder}
                    bind:this={searchUIState.ref}
                    bind:value={searchUIState.query}
                    oninput={() => {
                      if (searchUIState) {
                        searchUIState.results = [];
                        searchUIState.currentResultIndex = -1;
                      }
                    }}
                    onkeydown={(e) => onSearch(e)}
                  />
                </form>

                {#if searchUIState.results.length > 0}
                  <span
                    class="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 sm:px-3 py-1 sm:py-2 rounded text-sm font-semibold text-zinc-100 bg-zinc-700/65"
                  >
                    {searchUIState.currentResultIndex + 1}/{searchUIState
                      .results.length}
                  </span>
                {/if}
              </div>

              <!-- Previous Button -->
              <button
                class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                tabindex="-1"
                onclick={() => {
                  onSearch({ shiftKey: true, key: "Enter" } as KeyboardEvent);
                }}
                aria-label="이전 검색 결과"
              >
                <ChevronUpIcon class="w-6 h-6" />
              </button>

              <!-- Next Button -->
              <button
                class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                tabindex="-1"
                onclick={() => {
                  onSearch({ key: "Enter" } as KeyboardEvent);
                }}
                aria-label="다음 검색 결과"
              >
                <ChevronDownIcon class="w-6 h-6" />
              </button>
            </div>
          </div>
        {/if}

        <!-- Summaries List -->
        {#each hypaV3DataState.summaries as summary, i}
          {#if !showImportantOnly || summary.isImportant}
            {#if summaryUIStates[i]}
              <!-- Summary Item  -->
              <div
                class="flex flex-col p-2 sm:p-4 rounded-lg border border-zinc-700 bg-zinc-800/50"
              >
                <!-- Original Summary Header -->
                <div class="flex justify-between items-center">
                  <span class="text-sm text-zinc-400"
                    >{language.hypaV3Modal.summaryNumberLabel.replace(
                      "{0}",
                      (i + 1).toString()
                    )}</span
                  >

                  <div class="flex items-center gap-2">
                    <!-- Translate Button -->
                    <button
                      class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                      tabindex="-1"
                      use:handleDualAction={{
                        onMainAction: () => toggleTranslate(i, false),
                        onAlternativeAction: () => toggleTranslate(i, true),
                      }}
                      aria-label="번역"
                    >
                      <LanguagesIcon class="w-4 h-4" />
                    </button>

                    <!-- Important Button -->
                    <button
                      class="p-2 transition-colors {summary.isImportant
                        ? 'text-yellow-400 hover:text-yellow-300'
                        : 'text-zinc-400 hover:text-zinc-200'}"
                      tabindex="-1"
                      onclick={() => {
                        summary.isImportant = !summary.isImportant;
                      }}
                      aria-label={summary.isImportant ? "중요 표시 해제" : "중요 표시"}
                    >
                      <StarIcon class="w-4 h-4" />
                    </button>

                    <!-- Reroll Button -->
                    <button
                      class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                      tabindex="-1"
                      disabled={!isRerollable(i)}
                      onclick={async () => await toggleReroll(i)}
                      aria-label="다시 생성"
                    >
                      <RefreshCw class="w-4 h-4" />
                    </button>

                    <!-- Delete After Button -->
                    <button
                      class="p-2 text-zinc-400 hover:text-rose-300 transition-colors"
                      tabindex="-1"
                      onclick={async () => {
                        if (
                          await alertConfirmTwice(
                            language.hypaV3Modal.deleteAfterConfirmMessage,
                            language.hypaV3Modal.deleteAfterConfirmSecondMessage
                          )
                        ) {
                          hypaV3DataState.summaries.splice(i + 1);
                        }

                        showHypaV3Alert();
                      }}
                      aria-label="이후 삭제"
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
                    onfocus={() => {
                      if (searchUIState && !searchUIState.isNavigating) {
                        searchUIState.requestedSearchFromIndex = i;
                      }
                    }}
                  >
                  </textarea>
                </div>

                <!-- Original Summary Translation -->
                {#if summaryUIStates[i].translation}
                  <div class="mt-2 sm:mt-4">
                    <div class="mb-2 sm:mb-4 text-sm text-zinc-400">
                      {language.hypaV3Modal.translationLabel}
                    </div>

                    <textarea
                      class="p-2 sm:p-4 w-full min-h-40 sm:min-h-56 resize-vertical rounded border border-zinc-700 focus:outline-none transition-colors text-zinc-200 bg-zinc-900"
                      readonly
                      tabindex="-1"
                      bind:this={summaryUIStates[i].translationRef}
                      value={summaryUIStates[i].translation}
                    ></textarea>
                  </div>
                {/if}

                {#if summaryUIStates[i].rerolledText}
                  <!-- Rerolled Summary Header -->
                  <div class="mt-2 sm:mt-4">
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-zinc-400"
                        >{language.hypaV3Modal.rerolledSummaryLabel}</span
                      >
                      <div class="flex items-center gap-2">
                        <!-- Translate Rerolled Button -->
                        <button
                          class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                          tabindex="-1"
                          use:handleDualAction={{
                            onMainAction: () =>
                              toggleTranslateRerolled(i, false),
                            onAlternativeAction: () =>
                              toggleTranslateRerolled(i, true),
                          }}
                          aria-label="번역"
                        >
                          <LanguagesIcon class="w-4 h-4" />
                        </button>

                        <!-- Cancel Button -->
                        <button
                          class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                          tabindex="-1"
                          onclick={() => {
                            summaryUIStates[i].rerolledText = null;
                            summaryUIStates[i].rerolledTranslation = null;
                          }}
                          aria-label="취소"
                        >
                          <XIcon class="w-4 h-4" />
                        </button>

                        <!-- Apply Button -->
                        <button
                          class="p-2 text-zinc-400 hover:text-rose-300 transition-colors"
                          tabindex="-1"
                          onclick={() => {
                            summary.text = summaryUIStates[i].rerolledText!;
                            summaryUIStates[i].translation = null;
                            summaryUIStates[i].rerolledText = null;
                            summaryUIStates[i].rerolledTranslation = null;
                          }}
                          aria-label="적용"
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
                      tabindex="-1"
                      bind:value={summaryUIStates[i].rerolledText}
                    >
                    </textarea>
                  </div>

                  <!-- Rerolled Summary Translation -->
                  {#if summaryUIStates[i].rerolledTranslation}
                    <div class="mt-2 sm:mt-4">
                      <div class="mb-2 sm:mb-4 text-sm text-zinc-400">
                        {language.hypaV3Modal.rerolledTranslationLabel}
                      </div>

                      <textarea
                        class="p-2 sm:p-4 w-full min-h-40 sm:min-h-56 resize-vertical rounded border border-zinc-700 focus:outline-none transition-colors text-zinc-200 bg-zinc-900"
                        readonly
                        tabindex="-1"
                        bind:this={summaryUIStates[i].rerolledTranslationRef}
                        value={summaryUIStates[i].rerolledTranslation}
                      ></textarea>
                    </div>
                  {/if}
                {/if}

                <!-- Connected Messages Header -->
                <div class="mt-2 sm:mt-4">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-zinc-400"
                      >{language.hypaV3Modal.connectedMessageCountLabel.replace(
                        "{0}",
                        summary.chatMemos.length.toString()
                      )}</span
                    >

                    <div class="flex items-center gap-2">
                      <!-- Translate Message Button -->
                      <button
                        class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                        tabindex="-1"
                        use:handleDualAction={{
                          onMainAction: () =>
                            toggleTranslateExpandedMessage(false),
                          onAlternativeAction: () =>
                            toggleTranslateExpandedMessage(true),
                        }}
                        aria-label="메시지 번역"
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
                      tabindex="-1"
                      bind:this={summaryUIStates[i].chatMemoRefs[memoIndex]}
                      onclick={() => toggleExpandMessage(i, chatMemo)}
                    >
                      {chatMemo == null
                        ? language.hypaV3Modal.connectedFirstMessageLabel
                        : chatMemo}
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
                          {language.hypaV3Modal.connectedMessageRoleLabel.replace(
                            "{0}",
                            expandedMessage.role
                          )}
                        </div>

                        <!-- Content -->
                        <textarea
                          class="p-2 sm:p-4 w-full min-h-40 sm:min-h-56 resize-vertical rounded border border-zinc-700 focus:outline-none transition-colors text-zinc-200 bg-zinc-900"
                          readonly
                          tabindex="-1"
                          value={expandedMessage.data}
                        ></textarea>
                      {:else}
                        <span class="text-sm text-red-400"
                          >{language.hypaV3Modal
                            .connectedMessageNotFoundLabel}</span
                        >
                      {/if}
                    {:catch error}
                      <span class="text-sm text-red-400"
                        >{language.hypaV3Modal.connectedMessageLoadingError.replace(
                          "{0}",
                          error.message
                        )}</span
                      >
                    {/await}
                  </div>

                  <!-- Expanded Message Translation -->
                  {#if expandedMessageUIState.translation}
                    <div class="mt-2 sm:mt-4">
                      <div class="mb-2 sm:mb-4 text-sm text-zinc-400">
                        {language.hypaV3Modal.connectedMessageTranslationLabel}
                      </div>

                      <textarea
                        class="p-2 sm:p-4 w-full min-h-40 sm:min-h-56 resize-vertical rounded border border-zinc-700 focus:outline-none transition-colors text-zinc-200 bg-zinc-900"
                        readonly
                        tabindex="-1"
                        bind:this={expandedMessageUIState.translationRef}
                        value={expandedMessageUIState.translation}
                      ></textarea>
                    </div>
                  {/if}
                {/if}
              </div>
            {/if}
          {/if}
        {/each}

        <!-- Next Summarization Target -->
        <div class="mt-2 sm:mt-4">
          {#await getProcessedNextSummarizationTarget() then nextMessage}
            {#if nextMessage}
              {@const chatId =
                nextMessage.chatId === "first"
                  ? language.hypaV3Modal.nextSummarizationFirstMessageLabel
                  : nextMessage.chatId == null
                    ? language.hypaV3Modal.nextSummarizationNoMessageIdLabel
                    : nextMessage.chatId}
              <div class="mb-2 sm:mb-4 text-sm text-zinc-400">
                {language.hypaV3Modal.nextSummarizationLabel.replace(
                  "{0}",
                  chatId
                )}
              </div>

              <textarea
                class="p-2 sm:p-4 w-full min-h-40 sm:min-h-56 resize-none overflow-y-auto rounded border border-zinc-700 focus:outline-none transition-colors text-zinc-200 bg-zinc-900"
                readonly
                value={nextMessage.data}
              ></textarea>
            {:else}
              <span class="text-sm text-red-400"
                >{language.hypaV3Modal
                  .nextSummarizationNoMessagesFoundLabel}</span
              >
            {/if}
          {:catch error}
            <span class="text-sm text-red-400"
              >{language.hypaV3Modal.nextSummarizationLoadingError.replace(
                "{0}",
                error.message
              )}</span
            >
          {/await}
        </div>

        <!-- No First Message -->
        {#if !getFirstMessage()}
          <div class="mt-2 sm:mt-4">
            <span class="text-sm text-red-400"
              >{language.hypaV3Modal.emptySelectedFirstMessageLabel}</span
            >
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

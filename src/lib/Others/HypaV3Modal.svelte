<script lang="ts">
  import { untrack, tick } from "svelte";
  import {
    SearchIcon,
    SettingsIcon,
    MoreVerticalIcon,
    BarChartIcon,
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
    summarize,
    getCurrentHypaV3Preset,
  } from "src/ts/process/memory/hypav3";
  import { type OpenAIChat } from "src/ts/process/index.svelte";
  import { processScriptFull, risuChatParser } from "src/ts/process/scripts";
  import { type Message } from "src/ts/storage/database.svelte";
  import { translateHTML } from "src/ts/translator/translator";
  import { alertConfirm, alertNormalWait } from "src/ts/alert";
  import {
    DBState,
    selectedCharID,
    settingsOpen,
    SettingsMenuIndex,
    hypaV3ModalOpen,
  } from "src/ts/stores.svelte";
  import { language } from "src/lang";

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
  let showDropdown = $state(false);
  let showMetrics = $state(false);

  $effect.pre(() => {
    untrack(() => {
      DBState.db.characters[$selectedCharID].chats[
        DBState.db.characters[$selectedCharID].chatPage
      ].hypaV3Data ??= {
        summaries: [],
      };
    });

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
      const summaryIndex = parseInt(query.substring(1)) - 1;

      if (
        summaryIndex >= 0 &&
        summaryIndex < hypaV3DataState.summaries.length &&
        isSummaryVisible(summaryIndex)
      ) {
        results.push(new SummarySearchResult(summaryIndex, 0, 0));
      }

      return results;
    }

    if (isGuidLike(query)) {
      // Search chatMemo
      summaryUIStates.forEach((summaryUI, summaryIndex) => {
        if (isSummaryVisible(summaryIndex)) {
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
        if (isSummaryVisible(summaryIndex)) {
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

  function isSummaryVisible(index: number): boolean {
    const summary = hypaV3DataState.summaries[index];
    const metrics = hypaV3DataState.metrics;

    const metricsFilter =
      !showMetrics ||
      !metrics ||
      metrics.lastImportantSummaries.includes(index) ||
      metrics.lastRecentSummaries.includes(index) ||
      metrics.lastSimilarSummaries.includes(index) ||
      metrics.lastRandomSummaries.includes(index);

    const importantFilter = !showImportantOnly || summary.isImportant;

    return metricsFilter && importantFilter;
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

  function isOrphan(summaryIndex: number): boolean {
    const char = DBState.db.characters[$selectedCharID];
    const chat = char.chats[DBState.db.characters[$selectedCharID].chatPage];
    const summary = hypaV3DataState.summaries[summaryIndex];

    for (const chatMemo of summary.chatMemos) {
      if (chatMemo == null) {
        // Check first message exists
        if (!getFirstMessage()) return true;
      } else {
        if (chat.message.findIndex((m) => m.chatId === chatMemo) === -1)
          return true;
      }
    }

    return false;
  }

  async function toggleReroll(summaryIndex: number): Promise<void> {
    const summaryUIState = summaryUIStates[summaryIndex];

    if (summaryUIState.isRerolling) return;
    if (isOrphan(summaryIndex)) return;

    summaryUIState.isRerolling = true;
    summaryUIState.rerolledText = "Loading...";

    try {
      const summary = hypaV3DataState.summaries[summaryIndex];
      const toSummarize: OpenAIChat[] = await Promise.all(
        summary.chatMemos.map(async (chatMemo) => {
          const message = await getMessageFromChatMemo(chatMemo);

          return {
            role: (message.role === "char"
              ? "assistant"
              : message.role) as OpenAIChat["role"],
            content: message.data,
          };
        })
      );

      const summarizeResult = await summarize(toSummarize);

      summaryUIState.rerolledText = summarizeResult;
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

  async function getMessageFromChatMemo(
    chatMemo: string | null
  ): Promise<Message | null> {
    const char = DBState.db.characters[$selectedCharID];
    const chat = char.chats[DBState.db.characters[$selectedCharID].chatPage];
    const shouldProcess = getCurrentHypaV3Preset().settings.processRegexScript;

    let msg = null;
    let msgIndex = -1;

    if (chatMemo == null) {
      const firstMessage = getFirstMessage();

      if (!firstMessage) return null;
      msg = { role: "char", data: firstMessage };
    } else {
      msgIndex = chat.message.findIndex((m) => m.chatId === chatMemo);
      if (msgIndex === -1) return null;
      msg = chat.message[msgIndex];
    }

    return shouldProcess ? await processRegexScript(msg, msgIndex) : msg;
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

  async function processRegexScript(
    msg: Message,
    msgIndex: number = -1
  ): Promise<Message> {
    const char = DBState.db.characters[$selectedCharID];
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

    const message = await getMessageFromChatMemo(
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

  async function getNextSummarizationTarget(): Promise<Message | null> {
    const char = DBState.db.characters[$selectedCharID];
    const chat = char.chats[DBState.db.characters[$selectedCharID].chatPage];
    const shouldProcess = getCurrentHypaV3Preset().settings.processRegexScript;

    // Summaries exist
    if (hypaV3DataState.summaries.length > 0) {
      const lastSummary = hypaV3DataState.summaries.at(-1);
      const lastMessageIndex = chat.message.findIndex(
        (m) => m.chatId === lastSummary.chatMemos.at(-1)
      );

      if (lastMessageIndex !== -1) {
        const next = chat.message[lastMessageIndex + 1] ?? null;

        return next && shouldProcess
          ? await processRegexScript(next, lastMessageIndex + 1)
          : next;
      }
    }

    // When no summaries exist OR couldn't find last connected message,
    // check if first message is available
    const firstMessage = getFirstMessage();

    if (!firstMessage) {
      const next = chat.message[0] ?? null;

      return next && shouldProcess ? await processRegexScript(next, 0) : next;
    }

    // Will summarize first message
    const next: Message = { role: "char", chatId: "first", data: firstMessage };

    return shouldProcess ? await processRegexScript(next) : next;
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
<div class="fixed inset-0 z-40 p-1 sm:p-2 bg-black/50">
  <!-- Modal wrapper -->
  <div class="flex justify-center w-full h-full">
    <!-- Modal window -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex flex-col p-3 sm:p-6 rounded-lg bg-zinc-900 w-full max-w-3xl {hypaV3DataState
        .summaries.length === 0
        ? 'h-fit'
        : 'h-full'}"
      onclick={(e) => {
        e.stopPropagation();
        showDropdown = false;
      }}
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
          >
            <StarIcon class="w-6 h-6" />
          </button>

          <!-- Settings Button -->
          <button
            class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            tabindex="-1"
            onclick={() => {
              $hypaV3ModalOpen = false;
              $settingsOpen = true;
              $SettingsMenuIndex = 2; // Other bot settings
            }}
          >
            <SettingsIcon class="w-6 h-6" />
          </button>

          <!-- Show Dropdown Button -->
          <div class="relative">
            <button
              class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
              tabindex="-1"
              onclick={(e) => {
                e.stopPropagation();
                showDropdown = true;
              }}
            >
              <MoreVerticalIcon class="w-6 h-6" />
            </button>

            {#if showDropdown}
              <div
                class="absolute z-10 right-0 mt-1 p-2 rounded-md shadow-lg border border-zinc-700 bg-zinc-800"
              >
                <!-- Buttons Container -->
                <div class="flex items-center gap-2">
                  <!-- Show Metrics Button -->
                  <button
                    class="p-2 transition-colors {showMetrics
                      ? 'text-blue-400 hover:text-blue-300'
                      : 'text-zinc-400 hover:text-zinc-200'}"
                    tabindex="-1"
                    onclick={() => {
                      if (searchUIState) {
                        searchUIState.query = "";
                        searchUIState.results = [];
                        searchUIState.currentResultIndex = -1;
                      }

                      showMetrics = !showMetrics;
                    }}
                  >
                    <BarChartIcon class="w-6 h-6" />
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
                        };
                      }
                    }}
                  >
                    <Trash2Icon class="w-6 h-6" />
                  </button>
                </div>
              </div>
            {/if}
          </div>

          <!-- Close Button -->
          <button
            class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            tabindex="-1"
            onclick={() => {
              $hypaV3ModalOpen = false;
            }}
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
          <div class="sticky top-0 p-2 sm:p-3 bg-zinc-800">
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
              >
                <ChevronDownIcon class="w-6 h-6" />
              </button>
            </div>
          </div>
        {/if}

        <!-- Summaries List -->
        {#each hypaV3DataState.summaries as summary, i}
          {#if isSummaryVisible(i)}
            {#if summaryUIStates[i]}
              <!-- Summary Item  -->
              <div
                class="flex flex-col p-2 sm:p-4 rounded-lg border border-zinc-700 bg-zinc-800/50"
              >
                <!-- Original Summary Header -->
                <div class="flex justify-between items-center">
                  <!-- Summary Number / Metrics Container -->
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-zinc-400"
                      >{language.hypaV3Modal.summaryNumberLabel.replace(
                        "{0}",
                        (i + 1).toString()
                      )}</span
                    >

                    {#if showMetrics && hypaV3DataState.metrics}
                      <div class="flex flex-wrap gap-1">
                        {#if hypaV3DataState.metrics.lastImportantSummaries.includes(i)}
                          <span
                            class="px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap text-purple-200 bg-purple-900/70"
                          >
                            Important
                          </span>
                        {/if}
                        {#if hypaV3DataState.metrics.lastRecentSummaries.includes(i)}
                          <span
                            class="px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap text-blue-200 bg-blue-900/70"
                          >
                            Recent
                          </span>
                        {/if}
                        {#if hypaV3DataState.metrics.lastSimilarSummaries.includes(i)}
                          <span
                            class="px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap text-green-200 bg-green-900/70"
                          >
                            Similar
                          </span>
                        {/if}
                        {#if hypaV3DataState.metrics.lastRandomSummaries.includes(i)}
                          <span
                            class="px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap text-yellow-200 bg-yellow-900/70"
                          >
                            Random
                          </span>
                        {/if}
                      </div>
                    {/if}
                  </div>

                  <!-- Buttons Container -->
                  <div class="flex items-center gap-2">
                    <!-- Translate Button -->
                    <button
                      class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                      tabindex="-1"
                      use:handleDualAction={{
                        onMainAction: () => toggleTranslate(i, false),
                        onAlternativeAction: () => toggleTranslate(i, true),
                      }}
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
                    >
                      <StarIcon class="w-4 h-4" />
                    </button>

                    <!-- Reroll Button -->
                    <button
                      class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                      tabindex="-1"
                      disabled={isOrphan(i)}
                      onclick={async () => await toggleReroll(i)}
                    >
                      <RefreshCw class="w-4 h-4" />
                    </button>

                    <!-- Delete This Button -->
                    <button
                      class="p-2 text-zinc-400 hover:text-rose-300 transition-colors"
                      tabindex="-1"
                      onclick={async () => {
                        if (
                          await alertConfirm(
                            language.hypaV3Modal.deleteThisConfirmMessage
                          )
                        ) {
                          hypaV3DataState.summaries =
                            hypaV3DataState.summaries.filter(
                              (_, index) => index !== i
                            );
                        }
                      }}
                    >
                      <Trash2Icon class="w-4 h-4" />
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
                    {#await getMessageFromChatMemo(expandedMessageUIState.selectedChatMemo) then expandedMessage}
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
          {#await getNextSummarizationTarget() then nextMessage}
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

        <div class="mt-2 sm:mt-4">
          <div class="mb-2 sm:mb-4 text-sm text-zinc-400">
            {language.hypaV3Modal.summarizationConditionLabel}
          </div>

          <!-- No First Message -->
          {#if !getFirstMessage()}
            <span class="text-sm text-red-400"
              >{language.hypaV3Modal.emptySelectedFirstMessageLabel}</span
            >
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

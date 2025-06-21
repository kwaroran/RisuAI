<script lang="ts">
  import { untrack } from "svelte";
  import { ChevronUpIcon, ChevronDownIcon } from "lucide-svelte";
  import { type SerializableSummary } from "src/ts/process/memory/hypav3";
  import { alertNormalWait } from "src/ts/alert";
  import { DBState, selectedCharID } from "src/ts/stores.svelte";
  import { language } from "src/lang";
  import ModalHeader from "./HypaV3Modal/modal-header.svelte";
  import ModalSummaryItem from "./HypaV3Modal/modal-summary-item.svelte";
  import ModalFooter from "./HypaV3Modal/modal-footer.svelte";
  import type {
    SummaryItemState,
    ExpandedMessageState,
    SearchState,
    SearchResult,
  } from "./HypaV3Modal/types";

  const hypaV3Data = $derived(
    DBState.db.characters[$selectedCharID].chats[
      DBState.db.characters[$selectedCharID].chatPage
    ].hypaV3Data
  );

  let summaryItemStateMap = new WeakMap<
    SerializableSummary,
    SummaryItemState
  >();
  let expandedMessageState = $state<ExpandedMessageState>(null);
  let searchState = $state<SearchState>(null);
  let filterImportant = $state(false);
  let dropdownOpen = $state(false);
  let filterSelected = $state(false);
  let summaryUIStates = $state<SummaryUI[]>([]);
  let expandedMessageUIState = $state<ExpandedMessageUI>(null);
  let searchUIState = $state<SearchUI>(null);
  let showImportantOnly = $state(false);
  let selectedCategoryFilter = $state<string>("all");
  let bulkEditMode = $state(false);
  let selectedSummaries = $state<Set<number>>(new Set());
  let selectedCategory = $state<string>("");
  let categoryManagerOpen = $state(false);
  let editingCategory = $state<{id: string, name: string} | null>(null);

  // hypaV3Data에서 categories 읽어오기 (미분류는 항상 첫 번째)
  let categories = $derived((() => {
    const savedCategories = hypaV3DataState.categories || [];
    const uncategorized = { id: "", name: "미분류" };

    // 미분류가 이미 있는지 확인
    const hasUncategorized = savedCategories.some(c => c.id === "");

    if (hasUncategorized) {
      // 미분류를 맨 앞으로 이동
      return [uncategorized, ...savedCategories.filter(c => c.id !== "")];
    } else {
      // 미분류가 없으면 추가
      return [uncategorized, ...savedCategories];
    }
  })());

  $effect.pre(() => {
    hypaV3Data?.summaries?.length;
    filterImportant;
    filterSelected;

    untrack(() => {
      DBState.db.characters[$selectedCharID].chats[
        DBState.db.characters[$selectedCharID].chatPage
      ].hypaV3Data ??= {
        summaries: [],
        categories: [{ id: "", name: "미분류" }],
        lastSelectedSummaries: [],
      };

      expandedMessageState = null;
      searchState = null;
    });
  });

  function onSearch(e: KeyboardEvent) {
    if (!searchState) return;

    if (e.key === "Escape") {
      searchState = null;
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault?.(); // Prevent event default action

      const query = searchState.query.trim();

      if (!query) return;

      // When received a new query
      if (searchState.currentResultIndex === -1) {
        const results = generateSearchResults(query);

        if (results.length === 0) return;

        searchState.results = results;
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
        summaryIndex < hypaV3Data.summaries.length &&
        isSummaryVisible(summaryIndex)
      ) {
        results.push({ type: "summary", summaryIndex, start: 0, end: 0 });
      }

      return results;
    }

    if (isGuidLike(query)) {
      // Search chatMemo
      hypaV3Data.summaries.forEach((summary, summaryIndex) => {
        if (!isSummaryVisible(summaryIndex)) return;

        const summaryItemState = summaryItemStateMap.get(summary);

        summaryItemState.chatMemoRefs.forEach((buttonRef, memoIndex) => {
          const buttonText = buttonRef.textContent?.toLowerCase() || "";

          if (buttonText.includes(normalizedQuery)) {
            results.push({ type: "chatmemo", summaryIndex, memoIndex });
          }
        });
      });
    } else {
      // Search summary
      hypaV3Data.summaries.forEach((summary, summaryIndex) => {
        if (!isSummaryVisible(summaryIndex)) return;

        const summaryItemState = summaryItemStateMap.get(summary);
        const textAreaText = summaryItemState.originalRef.value?.toLowerCase();
        let pos = -1;

        while ((pos = textAreaText.indexOf(normalizedQuery, pos + 1)) !== -1) {
          results.push({
            type: "summary",
            summaryIndex,
            start: pos,
            end: pos + normalizedQuery.length,
          });
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
    if (!searchState || searchState.results.length === 0) return null;

    let nextIndex: number;

    if (searchState.requestedSearchFromIndex !== -1) {
      const fromSummaryIndex = searchState.requestedSearchFromIndex;

      nextIndex = backward
        ? searchState.results.findLastIndex(
            (r) => r.summaryIndex <= fromSummaryIndex
          )
        : searchState.results.findIndex(
            (r) => r.summaryIndex >= fromSummaryIndex
          );

      if (nextIndex === -1) {
        nextIndex = backward ? searchState.results.length - 1 : 0;
      }

      searchState.requestedSearchFromIndex = -1;
    } else {
      const delta = backward ? -1 : 1;

      nextIndex =
        (searchState.currentResultIndex + delta + searchState.results.length) %
        searchState.results.length;
    }

    searchState.currentResultIndex = nextIndex;
    return searchState.results[nextIndex];
  }

  function navigateToSearchResult(result: SearchResult) {
    searchState.isNavigating = true;

    if (result.type === "summary") {
      const summary = hypaV3Data.summaries[result.summaryIndex];
      const summaryItemState = summaryItemStateMap.get(summary);
      const textarea = summaryItemState.originalRef;

      // Scroll to element
      textarea.scrollIntoView({
        behavior: "instant",
        block: "center",
      });

      if (result.start === result.end) {
        searchState.isNavigating = false;
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
          searchState.ref.focus(); // Restore focus to search bar
          textarea.readOnly = false; // Remove readonly after focus moved
        }, 300);
      }
    } else {
      const summary = hypaV3Data.summaries[result.summaryIndex];
      const summaryItemState = summaryItemStateMap.get(summary);
      const button = summaryItemState.chatMemoRefs[result.memoIndex];

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

    searchState.isNavigating = false;
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
    const summary = hypaV3Data.summaries[index];
    const metrics = hypaV3Data.metrics;

    const selectedFilter =
      !filterSelected ||
      !metrics ||
      metrics.lastImportantSummaries.includes(index) ||
      metrics.lastRecentSummaries.includes(index) ||
      metrics.lastSimilarSummaries.includes(index) ||
      metrics.lastRandomSummaries.includes(index);

    const importantFilter = !filterImportant || summary.isImportant;

    return selectedFilter && importantFilter;
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

  function toggleBulkEditMode() {
    bulkEditMode = !bulkEditMode;
    if (!bulkEditMode) {
      selectedSummaries = new Set();
    }
  }

  function toggleSummarySelection(summaryIndex: number) {
    const newSelection = new Set(selectedSummaries);
    if (newSelection.has(summaryIndex)) {
      newSelection.delete(summaryIndex);
    } else {
      newSelection.add(summaryIndex);
    }
    selectedSummaries = newSelection;
  }

  function selectAllSummaries() {
    const visibleIndices = hypaV3DataState.summaries
      .map((_, index) => index)
      .filter(index => shouldShowSummary(hypaV3DataState.summaries[index], index));

    selectedSummaries = new Set(visibleIndices);
  }

  function clearSelection() {
    selectedSummaries = new Set();
  }

  function applyCategoryToSelected() {
    if (selectedSummaries.size === 0) return;

    for (const summaryIndex of selectedSummaries) {
      hypaV3DataState.summaries[summaryIndex].categoryId = selectedCategory || undefined;
    }

    clearSelection();
  }

  function getCategoryName(categoryId?: string): string {
    const category = categories.find(c => c.id === (categoryId || ""));
    return category?.name || "미분류";
  }

  function shouldShowSummary(summary: any, index: number): boolean {
    // 중요도 필터
    if (showImportantOnly && !summary.isImportant) {
      return false;
    }

    // 카테고리 필터
    if (selectedCategoryFilter !== "all") {
      const summaryCategory = summary.categoryId || "";
      if (summaryCategory !== selectedCategoryFilter) {
        return false;
      }
    }

    return true;
  }

  function addCategory(name: string) {
    const id = `cat_${Date.now()}`;
    const currentCategories = hypaV3DataState.categories || [];
    const uncategorized = { id: "", name: "미분류" };

    // 미분류가 없으면 추가
    const hasUncategorized = currentCategories.some(c => c.id === "");
    const baseCategories = hasUncategorized ? currentCategories : [uncategorized, ...currentCategories];

    hypaV3DataState.categories = [...baseCategories, { id, name }];
  }

  function updateCategory(id: string, name: string) {
    hypaV3DataState.categories = (hypaV3DataState.categories || []).map(c => c.id === id ? { ...c, name } : c);
  }

  function deleteCategory(id: string) {
    // 미분류는 삭제 불가
    if (id === "") return;

    // 해당 카테고리를 사용하는 요약들을 미분류로 변경
    for (const summary of hypaV3DataState.summaries) {
      if (summary.categoryId === id) {
        summary.categoryId = undefined;
      }
    }

    // 카테고리 삭제
    hypaV3DataState.categories = (hypaV3DataState.categories || []).filter(c => c.id !== id);

    // 현재 필터가 삭제된 카테고리였다면 전체로 변경
    if (selectedCategoryFilter === id) {
      selectedCategoryFilter = "all";
    }
  }

  function openCategoryManager() {
    categoryManagerOpen = true;
  }

  function closeCategoryManager() {
    categoryManagerOpen = false;
    editingCategory = null;
  }

  function startEditCategory(category: {id: string, name: string}) {
    editingCategory = { ...category };
  }

  function saveEditingCategory() {
    if (!editingCategory) return;

    if (editingCategory.id === "") {
      // 새 카테고리 추가
      addCategory(editingCategory.name);
    } else {
      // 기존 카테고리 수정
      updateCategory(editingCategory.id, editingCategory.name);
    }

    editingCategory = null;
  }

  function cancelEditingCategory() {
    editingCategory = null;
  }

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

<!-- Modal Backdrop -->
<div class="fixed inset-0 z-40 p-1 sm:p-2 bg-black/50">
  <!-- Modal Wrapper -->
  <div class="flex justify-center w-full h-full">
    <!-- Modal Window -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex flex-col w-full max-w-3xl p-3 rounded-lg sm:p-6 bg-zinc-900 {hypaV3Data
        .summaries.length === 0
        ? 'h-fit'
        : 'h-full'}"
      onclick={(e) => {
        e.stopPropagation();
        dropdownOpen = false;
      }}
    >
      <!-- Header -->
      <ModalHeader
        bind:searchState
        bind:filterImportant
        bind:dropdownOpen
        bind:filterSelected
      />
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

          <!-- Bulk Edit Mode Button -->
          <button
            class="p-2 transition-colors {bulkEditMode
              ? 'text-blue-400 hover:text-blue-300'
              : 'text-zinc-400 hover:text-zinc-200'}"
            tabindex="-1"
            onclick={toggleBulkEditMode}
          >
            <EditIcon class="w-6 h-6" />
          </button>

          <!-- Category Manager Button -->
          <button
            class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            tabindex="-1"
            onclick={openCategoryManager}
          >
            <TagIcon class="w-6 h-6" />
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
              }
            }}
          >
            <Trash2Icon class="w-6 h-6" />
          </button>

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
      <div class="flex flex-col gap-2 overflow-y-auto sm:gap-4" tabindex="-1">
        {#if hypaV3Data.summaries.length === 0}
          <!-- Conversion Section -->
          {#if isHypaV2ConversionPossible()}
            <div
              class="flex flex-col p-2 border rounded-lg sm:p-4 border-zinc-700 bg-zinc-800/50"
            >
              <div class="flex flex-col items-center">
                <div class="my-1 text-center sm:my-2 text-zinc-300">
                  {language.hypaV3Modal.convertLabel}
                </div>
                <button
                  class="px-4 py-2 my-1 font-semibold transition-colors rounded-md sm:my-2 text-zinc-300 bg-zinc-700 hover:bg-zinc-500"
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
            <div class="p-4 text-center sm:p-3 md:p-4 text-zinc-400">
              {language.hypaV3Modal.noSummariesLabel}
            </div>
          {/if}

          <!-- Search Bar -->
        {:else if searchState}
          <div class="sticky top-0 p-2 sm:p-3 bg-zinc-800">
            <div class="flex items-center gap-2">
              <div class="relative flex items-center flex-1">
                <form
                  class="w-full"
                  onsubmit={(e) => {
                    e.preventDefault();
                    onSearch({ key: "Enter" } as KeyboardEvent);
                  }}
                >
                  <input
                    class="w-full px-2 py-2 border rounded sm:px-4 sm:py-3 border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-200 bg-zinc-900"
                    placeholder={language.hypaV3Modal.searchPlaceholder}
                    bind:this={searchState.ref}
                    bind:value={searchState.query}
                    oninput={() => {
                      if (searchState) {
                        searchState.results = [];
                        searchState.currentResultIndex = -1;
                      }
                    }}
                    onkeydown={(e) => onSearch(e)}
                  />
                </form>

                {#if searchState.results.length > 0}
                  <span
                    class="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 sm:px-3 py-1 sm:py-2 rounded text-sm font-semibold text-zinc-100 bg-zinc-700/65"
                  >
                    {searchState.currentResultIndex + 1}/{searchState.results
                      .length}
                  </span>
                {/if}
              </div>

              <!-- Previous Button -->
              <button
                class="p-2 transition-colors text-zinc-400 hover:text-zinc-200"
                tabindex="-1"
                onclick={() => {
                  onSearch({ shiftKey: true, key: "Enter" } as KeyboardEvent);
                }}
              >
                <ChevronUpIcon class="w-6 h-6" />
              </button>

              <!-- Next Button -->
              <button
                class="p-2 transition-colors text-zinc-400 hover:text-zinc-200"
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
        {#each hypaV3Data.summaries as summary, i (summary)}
          {#if isSummaryVisible(i)}
            <!-- Summary Item  -->
            <ModalSummaryItem
              summaryIndex={i}
              {hypaV3Data}
              {summaryItemStateMap}
              bind:expandedMessageState
              bind:searchState
              {filterSelected}
            />
        {#each hypaV3DataState.summaries as summary, i}
          {#if shouldShowSummary(summary, i)}
            {#if summaryUIStates[i]}
              <!-- Summary Item  -->
              <div
                class="flex flex-col p-2 sm:p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 {selectedSummaries.has(i) ? 'ring-2 ring-blue-500' : ''}"
              >
                <!-- Original Summary Header -->
                <div class="flex justify-between items-center">
                  <div class="flex items-center gap-2">
                    <!-- Bulk Edit Checkbox -->
                    {#if bulkEditMode}
                      <input
                        type="checkbox"
                        class="w-4 h-4 text-blue-600 bg-zinc-900 border-zinc-600 rounded focus:ring-blue-500"
                        checked={selectedSummaries.has(i)}
                        onchange={() => toggleSummarySelection(i)}
                      />
                    {/if}

                    <span class="text-sm text-zinc-400"
                      >{language.hypaV3Modal.summaryNumberLabel.replace(
                        "{0}",
                        (i + 1).toString()
                      )}</span
                    >

                    <!-- Category Tag -->
                    <span class="px-2 py-1 text-xs rounded-full bg-zinc-700 text-zinc-300">
                      <TagIcon class="w-3 h-3 inline mr-1" />
                      {getCategoryName(summary.categoryId)}
                    </span>
                  </div>

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

        <!-- Footer -->
        <ModalFooter {hypaV3Data} />
      </div>

      <!-- Bulk Edit Action Bar -->
      {#if bulkEditMode}
        <div class="sticky bottom-0 p-3 bg-zinc-800 border-t border-zinc-700 rounded-b-lg">
          <div class="flex items-center justify-between">
            <span class="text-sm text-zinc-300">
              {selectedSummaries.size > 0 ? `${selectedSummaries.size}개 선택됨` : '항목을 선택하세요'}
            </span>

            <div class="flex items-center gap-2">
              <!-- Category Selection -->
              <select
                class="px-3 py-2 rounded border border-zinc-600 bg-zinc-900 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                bind:value={selectedCategory}
              >
                {#each categories as category}
                  <option value={category.id}>{category.name}</option>
                {/each}
              </select>

              <!-- Apply Button -->
              <button
                class="px-4 py-2 rounded text-sm font-medium transition-colors {selectedSummaries.size > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-zinc-600 text-zinc-400 cursor-not-allowed'}"
                onclick={applyCategoryToSelected}
                disabled={selectedSummaries.size === 0}
              >
                적용
              </button>

              <!-- Select All Button -->
              <button
                class="px-3 py-2 rounded border border-zinc-600 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
                onclick={selectAllSummaries}
              >
                전체선택
              </button>

              <!-- Clear Selection Button -->
              <button
                class="px-3 py-2 rounded border border-zinc-600 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
                onclick={clearSelection}
              >
                선택해제
              </button>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Category Manager Modal -->
{#if categoryManagerOpen}
  <div class="fixed inset-0 z-50 p-4 bg-black/70 flex items-center justify-center">
    <div class="bg-zinc-900 rounded-lg p-6 w-full max-w-md">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-lg font-semibold text-zinc-300">카테고리</h2>
        <div class="flex items-center gap-2">
          <!-- Add Category Button -->
          <button
            class="p-2 text-zinc-400 hover:text-green-400 transition-colors"
            onclick={() => startEditCategory({ id: "", name: "" })}
          >
            <PlusIcon class="w-5 h-5" />
          </button>
          <!-- Close Button -->
          <button
            class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            onclick={closeCategoryManager}
          >
            <XIcon class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Combined Category List -->
      <div class="space-y-2 max-h-80 overflow-y-auto">
        <!-- All Categories -->
        <button
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded transition-colors text-left {selectedCategoryFilter === 'all'
            ? 'bg-blue-600 text-white'
            : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}"
          onclick={() => {
            selectedCategoryFilter = 'all';
            if (searchUIState) {
              searchUIState.query = '';
              searchUIState.results = [];
              searchUIState.currentResultIndex = -1;
            }
            categoryManagerOpen = false;
          }}
        >
          <span class="flex-1 text-sm">전체 ({hypaV3DataState.summaries.length})</span>
          <!-- Spacer to match button height -->
          <div class="flex gap-1">
            <div class="p-1.5 w-8 h-8"></div>
            <div class="p-1.5 w-8 h-8"></div>
          </div>
        </button>

        {#each categories as category}
          {@const count = hypaV3DataState.summaries.filter(s => (s.categoryId || '') === category.id).length}
          <div
            class="flex items-center gap-3 px-3 py-2.5 rounded transition-colors {selectedCategoryFilter === category.id
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}"
          >
            {#if editingCategory?.id === category.id}
              <input
                type="text"
                class="flex-1 px-3 py-1.5 text-sm rounded border border-zinc-600 bg-zinc-900 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                bind:value={editingCategory.name}
                placeholder="카테고리 이름"
              />
              <button
                class="p-1.5 text-green-400 hover:text-green-300 transition-colors"
                onclick={saveEditingCategory}
              >
                <CheckIcon class="w-4 h-4" />
              </button>
              <button
                class="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                onclick={cancelEditingCategory}
              >
                <XIcon class="w-4 h-4" />
              </button>
            {:else}
              <button
                class="flex-1 text-sm text-left"
                onclick={() => {
                  selectedCategoryFilter = category.id;
                  if (searchUIState) {
                    searchUIState.query = '';
                    searchUIState.results = [];
                    searchUIState.currentResultIndex = -1;
                  }
                  categoryManagerOpen = false;
                }}
              >
                {category.name} ({count})
              </button>
              {#if category.id !== ""}
                <button
                  class="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                  onclick={() => startEditCategory(category)}
                >
                  <EditIcon class="w-4 h-4" />
                </button>
                <button
                  class="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                  onclick={() => deleteCategory(category.id)}
                >
                  <Trash2Icon class="w-4 h-4" />
                </button>
              {:else}
                <!-- Spacer to match button height for 미뵤류 -->
                <div class="flex gap-1">
                  <div class="p-1.5 w-8 h-8"></div>
                  <div class="p-1.5 w-8 h-8"></div>
                </div>
              {/if}
            {/if}
          </div>
        {/each}

        <!-- Empty State -->
        {#if categories.filter(c => c.id !== "").length === 0 && !editingCategory}
          <div class="text-center py-8 text-zinc-500 text-sm">
            아직 카테고리가 없습니다.<br>
            <span class="text-xs">위의 + 버튼을 클릭해서 추가해보세요.</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<script lang="ts">
  import { StarIcon } from "@lucide/svelte";
  import { DBState, selectedCharID } from "src/ts/stores.svelte";
  import type { BulkEditState, Category } from "./types";
  import { language } from "src/lang";

  interface Props {
    bulkEditState: BulkEditState;
    categories: Category[];
    showImportantOnly: boolean;
    selectedCategoryFilter: string;
    onResummarize: () => void;
    onClearSelection: () => void;
    onUpdateSelectedCategory: (categoryId: string) => void;
    onUpdateBulkSelectInput: (input: string) => void;
    onApplyCategory: () => void;
    onToggleImportant: () => void;
    onParseAndSelectSummaries: () => void;
  }

  let {
    bulkEditState,
    categories,
    showImportantOnly,
    selectedCategoryFilter,
    onResummarize,
    onClearSelection,
    onUpdateSelectedCategory,
    onUpdateBulkSelectInput,
    onApplyCategory,
    onToggleImportant,
    onParseAndSelectSummaries,
  }: Props = $props();

  const hypaV3Data = $derived(
    DBState.db.characters[$selectedCharID].chats[
      DBState.db.characters[$selectedCharID].chatPage
    ].hypaV3Data
  );

  function applyCategoryToSelected() {
    onApplyCategory();
  }

  function bulkToggleImportant() {
    onToggleImportant();
  }

  function parseAndSelectSummaries() {
    onParseAndSelectSummaries();
  }

  function clearSelection() {
    onClearSelection();
  }

  function handleCategoryChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    onUpdateSelectedCategory(target.value);
  }

  function handleBulkSelectInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    onUpdateBulkSelectInput(target.value);
  }

  function handleBulkSelectKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      parseAndSelectSummaries();
    }
  }
</script>

<!-- Bulk Edit Action Bar -->
{#if bulkEditState.isEnabled}
  <div class="sticky bottom-0 p-3 bg-zinc-800 border-t border-zinc-700 rounded-b-lg">
    <div class="flex items-center justify-between">
      <!-- Left Side: Resummarize Button -->
      <div class="flex items-center gap-2">
        <!-- Resummarize Button -->
        <button
          class="px-4 py-2 rounded text-sm font-medium transition-colors {bulkEditState.selectedSummaries.size > 1 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'bg-zinc-600 text-zinc-400 cursor-not-allowed'}"
          onclick={onResummarize}
          disabled={bulkEditState.selectedSummaries.size < 2}
        >
          {language.hypaV3Modal.reSummarize}
        </button>
      </div>
      
      <!-- Right Side: Category, Important, Bulk Select, Clear -->
      <div class="flex items-center gap-2">
        <!-- Category Selection -->
        <select
          class="px-3 py-2 rounded-sm border border-zinc-600 bg-zinc-900 text-zinc-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          value={bulkEditState.selectedCategory}
          onchange={handleCategoryChange}
        >
          {#each categories as category}
            <option value={category.id}>{category.name}</option>
          {/each}
        </select>

        <!-- Apply Category Button -->
        <button
          class="px-4 py-2 rounded text-sm font-medium transition-colors {bulkEditState.selectedSummaries.size > 0
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-zinc-600 text-zinc-400 cursor-not-allowed'}"
          onclick={applyCategoryToSelected}
          disabled={bulkEditState.selectedSummaries.size === 0}
        >
          {language.apply}
        </button>

        <!-- Bulk Toggle Important Button -->
        <button
          class="px-3 py-2 rounded-sm border border-yellow-600 hover:bg-yellow-700 text-yellow-300 text-sm transition-colors flex items-center gap-2 {bulkEditState.selectedSummaries.size === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
          onclick={bulkToggleImportant}
          disabled={bulkEditState.selectedSummaries.size === 0}
        >
          <StarIcon class="w-4 h-4" />
        </button>

        <!-- Bulk Select by Numbers -->
        <div class="flex gap-2">
          <input
            type="text"
            value={bulkEditState.bulkSelectInput}
            oninput={handleBulkSelectInputChange}
            placeholder="1,3,5-8"
            class="w-32 px-3 py-2 text-sm bg-zinc-800 border border-zinc-600 rounded-sm text-zinc-300 placeholder-zinc-500 focus:border-blue-500 outline-hidden"
            onkeydown={handleBulkSelectKeydown}
          />
          <button
            class="px-3 py-2 rounded-sm border border-blue-600 hover:bg-blue-700 text-blue-300 text-sm transition-colors"
            onclick={parseAndSelectSummaries}
          >
            {language.select}
          </button>
        </div>

        <!-- Clear Selection Button -->
        <button
          class="px-3 py-2 rounded-sm border border-red-600 hover:bg-red-700 text-red-300 text-sm transition-colors"
          onclick={clearSelection}
        >
          {language.cancel}
        </button>
      </div>
    </div>
  </div>
{/if}
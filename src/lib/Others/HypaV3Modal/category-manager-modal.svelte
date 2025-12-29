<script lang="ts">
  import {
    PlusIcon,
    XIcon,
    SquarePenIcon,
    Trash2Icon,
    CheckIcon,
  } from "@lucide/svelte";
  import { language } from "src/lang";
  import { DBState, selectedCharID } from "src/ts/stores.svelte";
  import type { Category, CategoryManagerState, SearchState, FilterState } from "./types";
  import { createCategoryId } from "./utils";

  interface Props {
    categoryManagerState: CategoryManagerState;
    searchState: SearchState;
    filterState?: FilterState;
    onCategoryFilter?: (categoryId: string) => void;
  }

  let {
    categoryManagerState = $bindable(),
    searchState = $bindable(),
    filterState,
    onCategoryFilter,
  }: Props = $props();

  const hypaV3Data = $derived(
    DBState.db.characters[$selectedCharID].chats[
      DBState.db.characters[$selectedCharID].chatPage
    ].hypaV3Data
  );

  let categories = $derived((() => {
    const savedCategories = hypaV3Data.categories || [];
    const uncategorized = { id: "", name: language.hypaV3Modal.unclassified };

    const hasUncategorized = savedCategories.some(c => c.id === "");

    if (hasUncategorized) {
      return [uncategorized, ...savedCategories.filter(c => c.id !== "")];
    } else {
      return [uncategorized, ...savedCategories];
    }
  })());

  function closeCategoryManager() {
    categoryManagerState.isOpen = false;
    categoryManagerState.editingCategory = null;
  }

  function startEditCategory(category: Category) {
    categoryManagerState.editingCategory = { ...category };
  }

  function startAddCategory() {
    categoryManagerState.editingCategory = { id: "", name: "" };
  }

  function saveEditingCategory() {
    if (!categoryManagerState.editingCategory) return;

    if (categoryManagerState.editingCategory.id === "") {
      addCategory(categoryManagerState.editingCategory.name);
    } else {
      updateCategory(categoryManagerState.editingCategory.id, categoryManagerState.editingCategory.name);
    }

    categoryManagerState.editingCategory = null;
  }

  function cancelEditingCategory() {
    categoryManagerState.editingCategory = null;
  }

  function addCategory(name: string) {
    const id = createCategoryId();
    const currentCategories = hypaV3Data.categories || [];
    const uncategorized = { id: "", name: language.hypaV3Modal.unclassified };

    const hasUncategorized = currentCategories.some(c => c.id === "");
    const baseCategories = hasUncategorized ? currentCategories : [uncategorized, ...currentCategories];

    hypaV3Data.categories = [...baseCategories, { id, name }];
  }

  function updateCategory(id: string, name: string) {
    hypaV3Data.categories = (hypaV3Data.categories || []).map(c => c.id === id ? { ...c, name } : c);
  }

  function deleteCategory(id: string) {
    if (id === "") return;

    for (const summary of hypaV3Data.summaries) {
      if (summary.categoryId === id) {
        summary.categoryId = undefined;
      }
    }

    hypaV3Data.categories = (hypaV3Data.categories || []).filter(c => c.id !== id);

    if (categoryManagerState.selectedCategoryFilter === id) {
      categoryManagerState.selectedCategoryFilter = "all";
    }
    if (filterState?.selectedCategoryFilter === id && onCategoryFilter) {
      onCategoryFilter("all");
    }
  }

  function selectCategory(categoryId: string) {
    categoryManagerState.selectedCategoryFilter = categoryId;
    if (onCategoryFilter) {
      onCategoryFilter(categoryId);
    }
    if (searchState) {
      searchState.query = '';
      searchState.results = [];
      searchState.currentResultIndex = -1;
    }
    closeCategoryManager();
  }
</script>

<!-- Category Manager Modal -->
{#if categoryManagerState.isOpen}
  <div class="fixed inset-0 z-50 p-4 bg-black/70 flex items-center justify-center">
    <div class="bg-zinc-900 rounded-lg p-6 w-full max-w-md">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-lg font-semibold text-zinc-300">{language.hypaV3Modal.categoryManager}</h2>
        <div class="flex items-center gap-2">
          <!-- Add Category Button -->
          <button
            class="p-2 text-zinc-400 hover:text-green-400 transition-colors"
            onclick={startAddCategory}
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
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded transition-colors text-left {categoryManagerState.selectedCategoryFilter === 'all'
            ? 'bg-blue-600 text-white'
            : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}"
          onclick={() => selectCategory('all')}
        >
          <span class="flex-1 text-sm">{language.hypaV3Modal.allCategories} ({hypaV3Data.summaries.length})</span>
          <!-- Spacer to match button height -->
          <div class="flex gap-1">
            <div class="p-1.5 w-8 h-8"></div>
            <div class="p-1.5 w-8 h-8"></div>
          </div>
        </button>

        {#each categories as category}
          {@const count = hypaV3Data.summaries.filter(s => (s.categoryId || '') === category.id).length}
          <div
            class="flex items-center gap-3 px-3 py-2.5 rounded transition-colors {categoryManagerState.selectedCategoryFilter === category.id
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}"
          >
            {#if categoryManagerState.editingCategory?.id === category.id}
              <input
                type="text"
                class="flex-1 px-3 py-1.5 text-sm rounded-sm border border-zinc-600 bg-zinc-900 text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                bind:value={categoryManagerState.editingCategory.name}
                placeholder={language.hypaV3Modal.categoryName}
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
                onclick={() => selectCategory(category.id)}
              >
                {category.name} ({count})
              </button>
              {#if category.id !== ""}
                <button
                  class="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                  onclick={() => startEditCategory(category)}
                >
                  <SquarePenIcon class="w-4 h-4" />
                </button>
                <button
                  class="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                  onclick={() => deleteCategory(category.id)}
                >
                  <Trash2Icon class="w-4 h-4" />
                </button>
              {:else}
                <!-- Spacer to match button height for 미분류 -->
                <div class="flex gap-1">
                  <div class="p-1.5 w-8 h-8"></div>
                  <div class="p-1.5 w-8 h-8"></div>
                </div>
              {/if}
            {/if}
          </div>
        {/each}

        <!-- Empty State -->
        {#if categories.filter(c => c.id !== "").length === 0 && !categoryManagerState.editingCategory}
          <div class="text-center py-8 text-zinc-500 text-sm">
            {language.hypaV3Modal.noCategoriesYet}<br>
            <span class="text-xs">{language.hypaV3Modal.addNewCategoryHint}</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
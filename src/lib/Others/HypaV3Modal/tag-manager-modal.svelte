<script lang="ts">
  import {
    XIcon,
    SquarePenIcon,
    Trash2Icon,
    CheckIcon,
  } from "@lucide/svelte";
  import { language } from "src/lang";
  import { DBState, selectedCharID } from "src/ts/stores.svelte";
  import type { TagManagerState } from "./types";

  interface Props {
    tagManagerState: TagManagerState;
  }

  let {
    tagManagerState = $bindable(),
  }: Props = $props();

  const hypaV3Data = $derived(
    DBState.db.characters[$selectedCharID].chats[
      DBState.db.characters[$selectedCharID].chatPage
    ].hypaV3Data
  );

  function closeTagManager() {
    tagManagerState.isOpen = false;
    tagManagerState.currentSummaryIndex = -1;
    tagManagerState.editingTag = "";
    tagManagerState.editingTagIndex = -1;
  }

  function addTag(summaryIndex: number, tagName: string) {
    if (!tagName.trim()) return;

    const summary = hypaV3Data.summaries[summaryIndex];
    if (!summary.tags) {
      summary.tags = [];
    }

    if (!summary.tags.includes(tagName.trim())) {
      summary.tags.push(tagName.trim());
    }
  }

  function removeTag(summaryIndex: number, tagIndex: number) {
    const summary = hypaV3Data.summaries[summaryIndex];
    if (summary.tags && tagIndex >= 0 && tagIndex < summary.tags.length) {
      summary.tags.splice(tagIndex, 1);
    }
  }

  function startEditTag(tagIndex: number, tagName: string) {
    tagManagerState.editingTagIndex = tagIndex;
    tagManagerState.editingTag = tagName;
  }

  function saveEditingTag() {
    if (tagManagerState.editingTagIndex === -1 || !tagManagerState.editingTag.trim()) return;

    const summary = hypaV3Data.summaries[tagManagerState.currentSummaryIndex];
    if (summary.tags && tagManagerState.editingTagIndex < summary.tags.length) {
      summary.tags[tagManagerState.editingTagIndex] = tagManagerState.editingTag.trim();
    }

    tagManagerState.editingTag = "";
    tagManagerState.editingTagIndex = -1;
  }

  function cancelEditingTag() {
    tagManagerState.editingTag = "";
    tagManagerState.editingTagIndex = -1;
  }

  function handleAddTagEnter() {
    addTag(tagManagerState.currentSummaryIndex, tagManagerState.editingTag);
    tagManagerState.editingTag = "";
  }

  function handleEditTagKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      saveEditingTag();
    } else if (e.key === 'Escape') {
      cancelEditingTag();
    }
  }

  function handleAddTagKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleAddTagEnter();
    }
  }
</script>

<!-- Tag Manager Modal -->
{#if tagManagerState.isOpen && tagManagerState.currentSummaryIndex >= 0}
  <div class="fixed inset-0 z-50 p-4 bg-black/70 flex items-center justify-center">
    <div class="bg-zinc-900 rounded-lg p-6 w-full max-w-md">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-lg font-semibold text-zinc-300">
          {language.hypaV3Modal.tagManagerTitle.replace("{0}", (tagManagerState.currentSummaryIndex + 1).toString())}
        </h2>
        <button
          class="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
          onclick={closeTagManager}
        >
          <XIcon class="w-5 h-5" />
        </button>
      </div>

      <!-- Add New Tag -->
      <div class="mb-4">
        <div class="flex gap-2">
          <input
            type="text"
            class="flex-1 px-3 py-2 text-sm rounded-sm border border-zinc-600 bg-zinc-900 text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            placeholder={language.hypaV3Modal.newTagName}
            bind:value={tagManagerState.editingTag}
            onkeydown={handleAddTagKeydown}
          />
          <button
            class="px-4 py-2 rounded-sm bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors"
            onclick={handleAddTagEnter}
          >
            {language.add}
          </button>
        </div>
      </div>

      <!-- Tag List -->
      <div class="space-y-2 max-h-60 overflow-y-auto">
        {#if hypaV3Data.summaries[tagManagerState.currentSummaryIndex].tags && hypaV3Data.summaries[tagManagerState.currentSummaryIndex].tags.length > 0}
          {#each hypaV3Data.summaries[tagManagerState.currentSummaryIndex].tags as tag, tagIndex}
            <div class="flex items-center gap-2 px-3 py-2 rounded-sm bg-zinc-800">
              {#if tagManagerState.editingTagIndex === tagIndex}
                <input
                  type="text"
                  class="flex-1 px-2 py-1 text-sm rounded-sm border border-zinc-600 bg-zinc-900 text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  bind:value={tagManagerState.editingTag}
                  onkeydown={handleEditTagKeydown}
                />
                <button
                  class="p-1.5 text-green-400 hover:text-green-300 transition-colors"
                  onclick={saveEditingTag}
                >
                  <CheckIcon class="w-4 h-4" />
                </button>
                <button
                  class="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                  onclick={cancelEditingTag}
                >
                  <XIcon class="w-4 h-4" />
                </button>
              {:else}
                <span class="flex-1 text-sm text-zinc-200">#{tag}</span>
                <button
                  class="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                  onclick={() => startEditTag(tagIndex, tag)}
                >
                  <SquarePenIcon class="w-4 h-4" />
                </button>
                <button
                  class="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                  onclick={() => removeTag(tagManagerState.currentSummaryIndex, tagIndex)}
                >
                  <Trash2Icon class="w-4 h-4" />
                </button>
              {/if}
            </div>
          {/each}
        {:else}
          <div class="text-center py-8 text-zinc-500 text-sm">
            {language.hypaV3Modal.noTagsYet}<br>
            <span class="text-xs">{language.hypaV3Modal.addNewTagHint}</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
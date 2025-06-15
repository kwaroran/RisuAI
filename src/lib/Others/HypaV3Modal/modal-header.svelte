<script lang="ts">
  import { tick } from "svelte";
  import {
    SearchIcon,
    StarIcon,
    SettingsIcon,
    MoreVerticalIcon,
    BarChartIcon,
    Trash2Icon,
    XIcon,
  } from "lucide-svelte";
  import { language } from "src/lang";
  import {
    hypaV3ModalOpen,
    settingsOpen,
    SettingsMenuIndex,
    DBState,
    selectedCharID,
  } from "src/ts/stores.svelte";
  import type { SearchUI } from "./types";
  import { alertConfirmTwice } from "./utils";

  interface Props {
    searchUIState: SearchUI;
    filterImportant: boolean;
    dropdownOpen: boolean;
    filterSelected: boolean;
  }

  let {
    searchUIState = $bindable(null),
    filterImportant = $bindable(false),
    dropdownOpen = $bindable(false),
    filterSelected = $bindable(false),
  }: Props = $props();

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

  function toggleFilterImportant() {
    searchUIState = null;
    filterImportant = !filterImportant;
  }

  function openGlobalSettings() {
    $hypaV3ModalOpen = false;
    $settingsOpen = true;
    $SettingsMenuIndex = 2; // Other bot settings
  }

  function openDropdown(e: MouseEvent) {
    e.stopPropagation();
    dropdownOpen = true;
  }

  function toggleFilterSelected() {
    searchUIState = null;
    filterSelected = !filterSelected;
  }

  async function resetData() {
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
  }

  function closeModal() {
    $hypaV3ModalOpen = false;
  }
</script>

<div class="flex items-center justify-between mb-2 sm:mb-4">
  <!-- Modal Title -->
  <h1 class="text-lg font-semibold sm:text-2xl text-zinc-300">
    {language.hypaV3Modal.titleLabel}
  </h1>

  <!-- Buttons Container -->
  <div class="flex items-center gap-2">
    <!-- Open Search Button -->
    <button
      class="p-2 transition-colors text-zinc-400 hover:text-zinc-200"
      tabindex="-1"
      onclick={async () => await toggleSearch()}
    >
      <SearchIcon class="w-6 h-6" />
    </button>

    <!-- Filter Important Summary Button -->
    <button
      class="p-2 transition-colors {filterImportant
        ? 'text-yellow-400 hover:text-yellow-300'
        : 'text-zinc-400 hover:text-zinc-200'}"
      tabindex="-1"
      onclick={toggleFilterImportant}
    >
      <StarIcon class="w-6 h-6" />
    </button>

    <!-- Open Global Settings Button -->
    <button
      class="p-2 transition-colors text-zinc-400 hover:text-zinc-200"
      tabindex="-1"
      onclick={openGlobalSettings}
    >
      <SettingsIcon class="w-6 h-6" />
    </button>

    <!-- Open Dropdown Button -->
    <div class="relative">
      <button
        class="p-2 transition-colors text-zinc-400 hover:text-zinc-200"
        tabindex="-1"
        onclick={openDropdown}
      >
        <MoreVerticalIcon class="w-6 h-6" />
      </button>

      {#if dropdownOpen}
        <div
          class="absolute right-0 z-10 p-2 mt-1 border rounded-md shadow-lg border-zinc-700 bg-zinc-800"
        >
          <!-- Buttons Container -->
          <div class="flex items-center gap-2">
            <!-- Filter Selected Summary Button -->
            <button
              class="p-2 transition-colors {filterSelected
                ? 'text-blue-400 hover:text-blue-300'
                : 'text-zinc-400 hover:text-zinc-200'}"
              tabindex="-1"
              onclick={toggleFilterSelected}
            >
              <BarChartIcon class="w-6 h-6" />
            </button>

            <!-- Reset Data Button -->
            <button
              class="p-2 transition-colors text-zinc-400 hover:text-rose-300"
              tabindex="-1"
              onclick={async () => await resetData()}
            >
              <Trash2Icon class="w-6 h-6" />
            </button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Close Modal Button -->
    <button
      class="p-2 transition-colors text-zinc-400 hover:text-zinc-200"
      tabindex="-1"
      onclick={closeModal}
    >
      <XIcon class="w-6 h-6" />
    </button>
  </div>
</div>

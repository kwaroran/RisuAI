<script>
  import { alertConfirm, alertError } from "../../ts/alert";
  import { language } from "../../lang";
  import { DataBase, changeToPreset, presetTemplate } from "../../ts/database";
  import { EditIcon, PlusIcon, TrashIcon, XIcon } from "lucide-svelte";

  let editMode = false;
  export let close = () => {};
</script>

<div
  class="absolute z-40 flex h-full w-full items-center justify-center bg-black bg-opacity-50"
>
  <div class="break-any flex w-96 max-w-3xl flex-col rounded-md bg-darkbg p-4">
    <div class="mb-4 flex items-center text-neutral-200">
      <h2 class="mb-0 mt-0">{language.presets}</h2>
      <div class="flex flex-grow justify-end">
        <button
          class="mr-2 cursor-pointer items-center text-gray-500 hover:text-green-500"
          on:click={close}
        >
          <XIcon size={24} />
        </button>
      </div>
    </div>
    {#each $DataBase.botPresets as presets, i}
      <button
        on:click={() => {
          if (!editMode) {
            changeToPreset(i);
            close();
          }
        }}
        class="flex cursor-pointer items-center border-0 border-t-1 border-solid border-gray-600 p-2 text-neutral-200"
        class:bg-selected={i === $DataBase.botPresetsId}
      >
        {#if editMode}
          <input
            class="input-text bg-transparent p-2 text-neutral-200 focus:bg-selected"
            bind:value={$DataBase.botPresets[i].name}
            placeholder="string"
          />
        {:else}
          {#if i < 9}
            <span class="mr-2 w-2 text-center text-gray-400">{i + 1}</span>
          {/if}
          <span>{presets.name}</span>
        {/if}
        <div class="flex flex-grow justify-end">
          <button
            class="cursor-pointer text-gray-500 hover:text-green-500"
            on:click={async (e) => {
              e.stopPropagation();
              if ($DataBase.botPresets.length === 1) {
                alertError(language.errors.onlyOneChat);
                return;
              }
              const d = await alertConfirm(
                `${language.removeConfirm}${presets.name}`
              );
              if (d) {
                changeToPreset(0);
                let botPresets = $DataBase.botPresets;
                botPresets.splice(i, 1);
                $DataBase.botPresets = botPresets;
              }
            }}
          >
            <TrashIcon size={18} />
          </button>
        </div>
      </button>
    {/each}
    <div class="mt-2 flex items-center">
      <button
        class="mr-1 cursor-pointer text-gray-500 hover:text-green-500"
        on:click={() => {
          let botPresets = $DataBase.botPresets;
          let newPreset = JSON.parse(JSON.stringify(presetTemplate));
          newPreset.name = `New Preset`;
          botPresets.push(newPreset);

          $DataBase.botPresets = botPresets;
        }}
      >
        <PlusIcon />
      </button>
      <button
        class="cursor-pointer text-gray-500 hover:text-green-500"
        on:click={() => {
          editMode = !editMode;
        }}
      >
        <EditIcon size={18} />
      </button>
    </div>
    <span class="text-sm text-gray-400">{language.quickPreset}</span>
  </div>
</div>

<style>
  .break-any {
    word-break: normal;
    overflow-wrap: anywhere;
  }
</style>

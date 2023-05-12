<script lang="ts">
  import { XIcon } from "lucide-svelte";
  import { language } from "../../lang";
  import type { loreBook } from "../../ts/database";
  import { alertConfirm } from "../../ts/alert";
  import Check from "../Others/Check.svelte";
  import Help from "../Others/Help.svelte";
  export let value: loreBook;
  export let onRemove: () => void = () => {};
  let open = false;
</script>

<div class="flex w-full flex-col">
  <div class="flex w-full items-center transition-colors">
    <button
      class="endflex valuer border-borderc"
      on:click={() => {
        value.secondkey = value.secondkey ?? "";
        open = !open;
      }}
    >
      <span
        >{value.comment.length === 0
          ? value.key.length === 0
            ? "Unnamed Lore"
            : value.key
          : value.comment}</span
      >
    </button>
    <button
      class="valuer"
      on:click={async () => {
        const d = await alertConfirm(language.removeConfirm + value.comment);
        if (d) {
          onRemove();
        }
      }}
    >
      <XIcon />
    </button>
  </div>
  {#if open}
    <div class="seperator">
      <span class="mt-6 text-neutral-200"
        >{language.name} <Help key="loreName" /></span
      >
      <input
        class="input-text bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
        bind:value={value.comment}
      />
      {#if !value.alwaysActive}
        <span class="mt-6 text-neutral-200"
          >{language.activationKeys} <Help key="loreActivationKey" /></span
        >
        <span class="text-xs text-gray-500">{language.activationKeysInfo}</span>
        <input
          class="input-text bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
          bind:value={value.key}
        />

        {#if value.selective}
          <span class="mt-6 text-neutral-200">{language.SecondaryKeys}</span>
          <span class="text-xs text-gray-500"
            >{language.activationKeysInfo}</span
          >
          <input
            class="input-text bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
            bind:value={value.secondkey}
          />
        {/if}
      {/if}
      <span class="mt-4 text-neutral-200"
        >{language.insertOrder} <Help key="loreorder" /></span
      >
      <input
        class="input-text bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
        bind:value={value.insertorder}
        type="number"
        min={0}
        max={1000}
      />
      <span class="mt-4 text-neutral-200">{language.prompt}</span>
      <textarea
        class="input-text mt-2 h-20 resize-none bg-transparent text-xs text-gray-200 focus:bg-selected"
        autocomplete="off"
        bind:value={value.content}
      />
      <div class="mt-4 flex items-center">
        <Check bind:check={value.alwaysActive} />
        <span>{language.alwaysActive}</span>
      </div>
      <div class="mb-6 mt-2 flex items-center">
        <Check bind:check={value.selective} />
        <span>{language.selective} <Help key="loreSelective" /></span>
      </div>
    </div>
  {/if}
</div>

<style>
  .valuer:hover {
    color: rgba(16, 185, 129, 1);
    cursor: pointer;
  }

  .endflex {
    display: flex;
    flex-grow: 1;
    cursor: pointer;
  }

  .seperator {
    border: none;
    outline: 0;
    width: 100%;
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    margin-bottom: 0.5rem;
    background-color: #282a36;
  }
</style>

<script>
  import { onMount } from "svelte";
  import { alertStore } from "../../ts/alert";
  import { DataBase } from "../../ts/database";
  import { getCharImage } from "../../ts/characters";
  import { ParseMarkdown } from "../../ts/parser";
  import BarIcon from "../SideBars/BarIcon.svelte";
  import { User } from "lucide-svelte";
  let btn;
  let input = "";

  $: (() => {
    if (btn) {
      btn.focus();
    }
    if ($alertStore.type !== "input") {
      input = "";
    }
  })();
</script>

{#if $alertStore.type !== "none" && $alertStore.type !== "toast"}
  <div
    class="absolute z-50 flex h-full w-full items-center justify-center bg-black bg-opacity-50"
    class:vis={$alertStore.type === "wait2"}
  >
    <div
      class="break-any flex max-h-full max-w-3xl flex-col overflow-y-auto rounded-md bg-darkbg p-4"
    >
      {#if $alertStore.type === "error"}
        <h2 class="mb-2 mt-0 w-40 max-w-full text-red-700">Error</h2>
      {:else if $alertStore.type === "ask"}
        <h2 class="mb-2 mt-0 w-40 max-w-full text-green-700">Confirm</h2>
      {:else if $alertStore.type === "selectChar"}
        <h2 class="mb-2 mt-0 w-40 max-w-full text-green-700">Select</h2>
      {:else if $alertStore.type === "input"}
        <h2 class="mb-2 mt-0 w-40 max-w-full text-green-700">Input</h2>
      {/if}
      {#if $alertStore.type === "markdown"}
        <span class="chattext chattext2 prose prose-invert text-gray-300"
          >{@html ParseMarkdown($alertStore.msg)}</span
        >
      {:else if $alertStore.type !== "select"}
        <span class="text-gray-300">{$alertStore.msg}</span>
      {/if}
      {#if $alertStore.type === "ask"}
        <div class="flex w-full gap-2">
          <button
            bind:this={btn}
            class="focus:border-3 mt-4 flex-1 border-1 border-solid border-borderc bg-transparent p-2 text-lg text-neutral-200 outline-none transition-colors hover:bg-green-500"
            on:click={() => {
              alertStore.set({
                type: "none",
                msg: "yes",
              });
            }}>YES</button
          >
          <button
            class="focus:border-3 mt-4 flex-1 border-1 border-solid border-borderc bg-transparent p-2 text-lg text-neutral-200 outline-none transition-colors hover:bg-red-500"
            on:click={() => {
              alertStore.set({
                type: "none",
                msg: "no",
              });
            }}>NO</button
          >
        </div>
      {:else if $alertStore.type === "select"}
        {#each $alertStore.msg.split("||") as n, i}
          <button
            bind:this={btn}
            class="focus:border-3 mt-4 border-1 border-solid border-borderc bg-transparent p-2 text-lg text-neutral-200 outline-none transition-colors hover:bg-green-500"
            on:click={() => {
              alertStore.set({
                type: "none",
                msg: i.toString(),
              });
            }}>{n}</button
          >
        {/each}
      {:else if $alertStore.type === "error" || $alertStore.type === "normal" || $alertStore.type === "markdown"}
        <button
          bind:this={btn}
          class="focus:border-3 mt-4 border-1 border-solid border-borderc bg-transparent p-2 text-lg text-neutral-200 outline-none transition-colors hover:bg-green-500"
          on:click={() => {
            alertStore.set({
              type: "none",
              msg: "",
            });
          }}>OK</button
        >
      {:else if $alertStore.type === "input"}
        <input
          class="input-text mt-2 bg-transparent p-2 text-neutral-200 focus:bg-selected"
          bind:value={input}
        />
        <button
          bind:this={btn}
          class="focus:border-3 mt-4 border-1 border-solid border-borderc bg-transparent p-2 text-lg text-neutral-200 outline-none transition-colors hover:bg-green-500"
          on:click={() => {
            alertStore.set({
              type: "none",
              msg: input,
            });
          }}>OK</button
        >
      {:else if $alertStore.type === "selectChar"}
        <div class="flex w-full flex-wrap items-start justify-start gap-2">
          {#each $DataBase.characters as char, i}
            {#if char.type !== "group"}
              {#if char.image}
                {#await getCharImage($DataBase.characters[i].image, "css")}
                  <BarIcon
                    onClick={() => {
                      //@ts-ignore
                      alertStore.set({ type: "none", msg: char.chaId });
                    }}
                  >
                    <User />
                  </BarIcon>
                {:then im}
                  <BarIcon
                    onClick={() => {
                      //@ts-ignore
                      alertStore.set({ type: "none", msg: char.chaId });
                    }}
                    additionalStyle={im}
                  />
                {/await}
              {:else}
                <BarIcon
                  onClick={() => {
                    //@ts-ignore
                    alertStore.set({ type: "none", msg: char.chaId });
                  }}
                >
                  <User />
                </BarIcon>
              {/if}
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>
{:else if $alertStore.type === "toast"}
  <div
    class="toast-anime break-any max-h-11/12 absolute bottom-0 right-0 z-50 flex max-w-3xl flex-col overflow-y-auto rounded-md bg-darkbg p-4 text-neutral-200"
    on:animationend={() => {
      alertStore.set({
        type: "none",
        msg: "",
      });
    }}
  >
    {$alertStore.msg}
  </div>
{/if}

<style>
  .break-any {
    word-break: normal;
    overflow-wrap: anywhere;
  }
  @keyframes toastAnime {
    0% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  .toast-anime {
    animation: toastAnime 1s ease-out;
  }

  .vis {
    opacity: 1 !important;
    --tw-bg-opacity: 1 !important;
  }
</style>

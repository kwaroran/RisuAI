<script lang="ts">
  import {
    ArrowLeft,
    ArrowRight,
    ChevronLeftIcon,
    ChevronRightIcon,
    EditIcon,
    LanguagesIcon,
    RefreshCcwIcon,
    TrashIcon,
  } from "lucide-svelte";
  import { ParseMarkdown } from "../../ts/parser";
  import AutoresizeArea from "./AutoresizeArea.svelte";
  import { alertConfirm } from "../../ts/alert";
  import { language } from "../../lang";
  import { DataBase } from "../../ts/database";
  import { selectedCharID } from "../../ts/stores";
  import { translate } from "../../ts/translator/translator";
  import { replacePlaceholders } from "../../ts/util";
  export let message = "";
  export let name = "";
  export let img: string | Promise<string> = "";
  export let idx = -1;
  export let rerollIcon = false;
  export let onReroll = () => {};
  export let unReroll = () => {};
  let translating = false;
  let editMode = false;
  export let altGreeting = false;

  let msgDisplay = "";

  async function rm() {
    const rm = await alertConfirm(language.removeChat);
    if (rm) {
      if ($DataBase.instantRemove) {
        const r = await alertConfirm(language.instantRemoveConfirm);
        let msg =
          $DataBase.characters[$selectedCharID].chats[
            $DataBase.characters[$selectedCharID].chatPage
          ].message;
        if (!r) {
          msg = msg.slice(0, idx);
        } else {
          msg.splice(idx, 1);
        }
        $DataBase.characters[$selectedCharID].chats[
          $DataBase.characters[$selectedCharID].chatPage
        ].message = msg;
      } else {
        let msg =
          $DataBase.characters[$selectedCharID].chats[
            $DataBase.characters[$selectedCharID].chatPage
          ].message;
        msg.splice(idx, 1);
        $DataBase.characters[$selectedCharID].chats[
          $DataBase.characters[$selectedCharID].chatPage
        ].message = msg;
      }
    }
  }

  async function edit() {
    let msg =
      $DataBase.characters[$selectedCharID].chats[
        $DataBase.characters[$selectedCharID].chatPage
      ].message;
    msg[idx].data = message;
    $DataBase.characters[$selectedCharID].chats[
      $DataBase.characters[$selectedCharID].chatPage
    ].message = msg;
  }

  async function displaya(message: string) {
    if ($DataBase.autoTranslate && $DataBase.translator !== "") {
      msgDisplay = replacePlaceholders(message, name);
      msgDisplay = await translate(replacePlaceholders(message, name), false);
    } else {
      msgDisplay = replacePlaceholders(message, name);
    }
  }

  $: displaya(message);
</script>

<div class="flex max-w-full">
  <div
    class="flexium ml-4 mr-4 mt-2 flex-grow items-start border-transparent border-t-gray-900 border-opacity-30 bg-transparent p-2 text-neutral-200"
  >
    {#await img}
      <div
        class="mt-2 rounded-md bg-gray-500 shadow-lg"
        style={`height:${($DataBase.iconsize * 3.5) / 100}rem;width:${
          ($DataBase.iconsize * 3.5) / 100
        }rem`}
      />
    {:then m}
      <div
        class="mt-2 rounded-md bg-gray-500 shadow-lg"
        style={m +
          `height:${($DataBase.iconsize * 3.5) / 100}rem;width:${
            ($DataBase.iconsize * 3.5) / 100
          }rem`}
      />
    {/await}
    <span class="ml-4 flex w-full flex-col">
      <div class="flexium chat items-center">
        <span class="chat unmargin text-xl">{name}</span>
        <div class="flex flex-grow items-center justify-end text-gray-500">
          {#if idx > -1}
            <button
              class="transition-colors hover:text-green-500"
              on:click={() => {
                if (!editMode) {
                  editMode = true;
                } else {
                  editMode = false;
                  edit();
                }
              }}
            >
              <EditIcon size={20} />
            </button>
            <button
              class="ml-2 transition-colors hover:text-green-500"
              on:click={rm}
            >
              <TrashIcon size={20} />
            </button>
          {/if}
          {#if $DataBase.translator !== ""}
            <button
              class="ml-2 cursor-pointer transition-colors hover:text-green-500"
              class:translating
              on:click={async () => {
                if (translating) {
                  return;
                }
                if (msgDisplay === replacePlaceholders(message, name)) {
                  translating = true;
                  msgDisplay = await translate(message, false);
                  translating = false;
                } else {
                  msgDisplay = replacePlaceholders(message, name);
                }
              }}
            >
              <LanguagesIcon />
            </button>
          {/if}
          {#if rerollIcon || altGreeting}
            {#if $DataBase.swipe || altGreeting}
              <button
                class="ml-2 transition-colors hover:text-green-500"
                on:click={unReroll}
              >
                <ArrowLeft size={22} />
              </button>
              <button
                class="ml-2 transition-colors hover:text-green-500"
                on:click={onReroll}
              >
                <ArrowRight size={22} />
              </button>
            {:else}
              <button
                class="ml-2 transition-colors hover:text-green-500"
                on:click={onReroll}
              >
                <RefreshCcwIcon size={20} />
              </button>
            {/if}
          {/if}
        </div>
      </div>
      {#if editMode}
        <AutoresizeArea bind:value={message} />
      {:else}
        <span
          class="text chat chattext prose prose-invert"
          style:font-size="{0.875 * ($DataBase.zoomsize / 100)}rem"
          style:line-height="{1.25 * ($DataBase.zoomsize / 100)}rem"
          >{@html ParseMarkdown(msgDisplay)}</span
        >
      {/if}
    </span>
  </div>
</div>

<style>
  .flexium {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
  }
  .chat {
    max-width: calc(95% - 0.5rem);
    word-break: normal;
    overflow-wrap: anywhere;
  }
  .translating {
    color: rgba(16, 185, 129, 1);
  }
</style>

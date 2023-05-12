<script>
  import { alertConfirm, alertError } from "../../ts/alert";
  import { language } from "../../lang";
  import { DataBase } from "../../ts/database";
  import { selectedCharID } from "../../ts/stores";
  import {
    DownloadIcon,
    EditIcon,
    FolderUpIcon,
    PlusIcon,
    TrashIcon,
    XIcon,
  } from "lucide-svelte";
  import { exportChat, importChat } from "../../ts/characters";
  import { findCharacterbyId } from "../../ts/util";

  let editMode = false;
  export let close = () => {};
</script>

<div
  class="absolute z-40 flex h-full w-full items-center justify-center bg-black bg-opacity-50"
>
  <div class="break-any flex w-72 max-w-3xl flex-col rounded-md bg-darkbg p-4">
    <div class="mb-4 flex items-center text-neutral-200">
      <h2 class="mb-0 mt-0">{language.chatList}</h2>
      <div class="flex flex-grow justify-end">
        <button
          class="mr-2 cursor-pointer items-center text-gray-500 hover:text-green-500"
          on:click={close}
        >
          <XIcon size={24} />
        </button>
      </div>
    </div>
    {#each $DataBase.characters[$selectedCharID].chats as chat, i}
      <button
        on:click={() => {
          if (!editMode) {
            $DataBase.characters[$selectedCharID].chatPage = i;
            close();
          }
        }}
        class="flex cursor-pointer items-center border-0 border-t-1 border-solid border-gray-600 p-2 text-neutral-200"
        class:bg-selected={i === $DataBase.characters[$selectedCharID].chatPage}
      >
        {#if editMode}
          <input
            class="input-text bg-transparent p-2 text-neutral-200 focus:bg-selected"
            bind:value={$DataBase.characters[$selectedCharID].chats[i].name}
            placeholder="string"
          />
        {:else}
          <span>{chat.name}</span>
        {/if}
        <div class="flex flex-grow justify-end">
          <button
            class="mr-2 cursor-pointer text-gray-500 hover:text-green-500"
            on:click={async (e) => {
              e.stopPropagation();
              exportChat(i);
            }}
          >
            <DownloadIcon size={18} />
          </button>
          <button
            class="cursor-pointer text-gray-500 hover:text-green-500"
            on:click={async (e) => {
              e.stopPropagation();
              if ($DataBase.characters[$selectedCharID].chats.length === 1) {
                alertError(language.errors.onlyOneChat);
                return;
              }
              const d = await alertConfirm(
                `${language.removeConfirm}${chat.name}`
              );
              if (d) {
                $DataBase.characters[$selectedCharID].chatPage = 0;
                let chats = $DataBase.characters[$selectedCharID].chats;
                chats.splice(i, 1);
                $DataBase.characters[$selectedCharID].chats = chats;
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
          const cha = $DataBase.characters[$selectedCharID];
          const len = $DataBase.characters[$selectedCharID].chats.length;
          let chats = $DataBase.characters[$selectedCharID].chats;
          chats.push({
            message: [],
            note: "",
            name: `New Chat ${len + 1}`,
            localLore: [],
          });
          if (cha.type === "group") {
            cha.characters.map((c) => {
              chats[len].message.push({
                saying: c,
                role: "char",
                data: findCharacterbyId(c).firstMessage,
              });
            });
          }
          $DataBase.characters[$selectedCharID].chats = chats;
          $DataBase.characters[$selectedCharID].chatPage = len;
          close();
        }}
      >
        <PlusIcon />
      </button>
      <button
        class="mr-2 cursor-pointer text-gray-500 hover:text-green-500"
        on:click={() => {
          importChat();
        }}
      >
        <FolderUpIcon size={18} />
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
  </div>
</div>

<style>
  .break-any {
    word-break: normal;
    overflow-wrap: anywhere;
  }
</style>

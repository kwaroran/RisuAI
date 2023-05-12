<script lang="ts">
  import {
    CharEmotion,
    SizeStore,
    selectedCharID,
    settingsOpen,
    sideBarStore,
  } from "../../ts/stores";
  import { DataBase } from "../../ts/database";
  import BarIcon from "./BarIcon.svelte";
  import {
    Plus,
    User,
    X,
    Settings,
    Users,
    Edit3Icon,
    ArrowUp,
    ArrowDown,
    ListIcon,
    LayoutGridIcon,
    PlusIcon,
  } from "lucide-svelte";
  import {
    characterFormatUpdate,
    createNewCharacter,
    createNewGroup,
    getCharImage,
  } from "../../ts/characters";
  import { importCharacter } from "src/ts/characterCards";
  import SettingsDom from "./Settings.svelte";
  import CharConfig from "./CharConfig.svelte";
  import { language } from "../../lang";
  import Botpreset from "../Others/botpreset.svelte";
  import { onDestroy } from "svelte";
  import { isEqual } from "lodash";
  let openPresetList = false;
  let sideBarMode = 0;
  let editMode = false;
  let menuMode = 0;
  export let openGrid = () => {};

  function createScratch() {
    reseter();
    const cid = createNewCharacter();
    selectedCharID.set(-1);
  }
  function createGroup() {
    reseter();
    const cid = createNewGroup();
    selectedCharID.set(-1);
  }
  async function createImport() {
    reseter();
    const cid = await importCharacter();
    selectedCharID.set(-1);
  }

  function changeChar(index: number) {
    reseter();
    characterFormatUpdate(index);
    selectedCharID.set(index);
  }

  function reseter() {
    menuMode = 0;
    sideBarMode = 0;
    editMode = false;
    settingsOpen.set(false);
    CharEmotion.set({});
  }

  let charImages: string[] = [];

  const unsub = DataBase.subscribe((db) => {
    let newCharImages: string[] = [];
    for (const cha of db.characters) {
      newCharImages.push(cha.image ?? "");
    }
    if (!isEqual(charImages, newCharImages)) {
      charImages = newCharImages;
    }
  });

  onDestroy(unsub);
</script>

<div
  class="flex h-full w-20 min-w-20 flex-col items-center overflow-x-hidden overflow-y-scroll bg-bgcolor text-white shadow-lg"
  class:editMode
>
  <button
    class="absolute top-0 flex h-8 w-14 min-w-14 cursor-pointer items-center justify-center rounded-b-md bg-gray-500 transition-colors hover:bg-green-500"
    on:click={() => {
      menuMode = 1 - menuMode;
    }}><ListIcon /></button
  >
  <div class="h-8 min-h-8 w-14 min-w-14 bg-transparent" />
  {#if menuMode === 0}
    {#each charImages as charimg, i}
      <div class="flex items-center">
        {#if charimg !== ""}
          <BarIcon
            onClick={() => {
              changeChar(i);
            }}
            additionalStyle={getCharImage($DataBase.characters[i].image, "css")}
          />
        {:else}
          <BarIcon
            onClick={() => {
              changeChar(i);
            }}
            additionalStyle={i === $selectedCharID ? "background:#44475a" : ""}
          />
        {/if}
        {#if editMode}
          <div class="mt-2 flex flex-col">
            <button
              on:click={() => {
                let chars = $DataBase.characters;
                if (chars[i - 1]) {
                  const currentchar = chars[i];
                  chars[i] = chars[i - 1];
                  chars[i - 1] = currentchar;
                  $DataBase.characters = chars;
                }
              }}
            >
              <ArrowUp size={20} />
            </button>
            <button
              on:click={() => {
                let chars = $DataBase.characters;
                if (chars[i + 1]) {
                  const currentchar = chars[i];
                  chars[i] = chars[i + 1];
                  chars[i + 1] = currentchar;
                  $DataBase.characters = chars;
                }
              }}
            >
              <ArrowDown size={22} />
            </button>
          </div>
        {/if}
      </div>
    {/each}
    <BarIcon
      onClick={() => {
        if (sideBarMode === 1) {
          reseter();
          sideBarMode = 0;
        } else {
          reseter();
          sideBarMode = 1;
        }
      }}><PlusIcon /></BarIcon
    >
  {:else}
    <BarIcon
      onClick={() => {
        if ($settingsOpen) {
          reseter();
          settingsOpen.set(false);
        } else {
          reseter();
          settingsOpen.set(true);
        }
      }}><Settings /></BarIcon
    >
    <BarIcon
      onClick={() => {
        reseter();
        openGrid();
      }}><LayoutGridIcon /></BarIcon
    >
  {/if}
</div>
<div
  class="setting-area flex w-96 flex-col overflow-y-auto overflow-x-hidden bg-darkbg p-6 text-gray-200"
  class:flex-grow={$SizeStore.w <= 1000}
  class:minw96={$SizeStore.w > 1000}
>
  <button
    class="flex w-full justify-end text-gray-200"
    on:click={() => {
      sideBarStore.set(false);
    }}
  >
    <button class="border-none bg-transparent p-0 text-gray-200"><X /></button>
  </button>
  {#if sideBarMode === 0}
    {#if $selectedCharID < 0 || $settingsOpen}
      <SettingsDom bind:openPresetList />
    {:else}
      <CharConfig />
    {/if}
  {:else if sideBarMode === 1}
    <h2 class="title mt-2 text-xl font-bold">Create</h2>
    <button
      on:click={createScratch}
      class="ml-2 mr-2 mt-2 flex items-center justify-center border-1 border-solid border-borderc p-5 text-lg drop-shadow-lg hover:bg-selected"
    >
      {language.createfromScratch}
    </button>
    <button
      on:click={createImport}
      class="ml-2 mr-2 mt-2 flex items-center justify-center border-1 border-solid border-borderc p-5 text-lg drop-shadow-lg hover:bg-selected"
    >
      {language.importCharacter}
    </button>
    <button
      on:click={createGroup}
      class="ml-2 mr-2 mt-2 flex items-center justify-center border-1 border-solid border-borderc p-3 drop-shadow-lg hover:bg-selected"
    >
      {language.createGroup}
    </button>
    <h2 class="title mt-4 text-xl font-bold">Edit</h2>
    <button
      on:click={() => {
        editMode = !editMode;
        $selectedCharID = -1;
      }}
      class="ml-2 mr-2 mt-2 flex items-center justify-center border-1 border-solid border-borderc p-3 drop-shadow-lg hover:bg-selected"
    >
      {language.editOrder}
    </button>
  {/if}
</div>

{#if openPresetList}
  <Botpreset
    close={() => {
      openPresetList = false;
    }}
  />
{/if}

<style>
  .minw96 {
    min-width: 24rem; /* 384px */
  }
  .title {
    margin-bottom: 0.5rem;
  }
  .editMode {
    min-width: 6rem;
  }
</style>

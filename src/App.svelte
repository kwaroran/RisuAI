<script lang="ts">
  import Sidebar from "./lib/SideBars/Sidebar.svelte";
  import { ArrowRight } from "lucide-svelte";
  import { SizeStore, sideBarStore } from "./ts/stores";
  import { DataBase, loadedStore } from "./ts/database";
  import ChatScreen from "./lib/ChatScreens/ChatScreen.svelte";
  import AlertComp from "./lib/Others/AlertComp.svelte";
  import { alertStore } from "./ts/alert";
  import GridChars from "./lib/Others/GridCatalog.svelte";
  import WelcomeRisu from "./lib/Others/WelcomeRisu.svelte";

  let didFirstSetup: boolean = false;
  let gridOpen = false;

  DataBase.subscribe((db) => {
    if (db.didFirstSetup !== didFirstSetup) {
      didFirstSetup = db.didFirstSetup || false;
    }
  });
</script>

<main class="bg-bg flex h-full w-full">
  {#if !$loadedStore}
    <div
      class="flex h-full w-full items-center justify-center text-xl text-gray-200"
    >
      <span>Loading...</span>
    </div>
  {:else if !didFirstSetup}
    <WelcomeRisu />
  {:else if gridOpen}
    <GridChars
      endGrid={() => {
        gridOpen = false;
      }}
    />
  {:else}
    {#if $sideBarStore}
      <Sidebar
        openGrid={() => {
          gridOpen = true;
        }}
      />
    {:else}
      <button
        on:click={() => {
          sideBarStore.set(true);
        }}
        class="fixed left-0 top-3 z-20 flex h-12 w-12 items-center justify-center rounded-r-md border-none bg-borderc text-neutral-200 opacity-30 transition-colors hover:bg-green-500 hover:opacity-70"
      >
        <ArrowRight />
      </button>
    {/if}
    {#if $SizeStore.w > 1028 || !$sideBarStore}
      <ChatScreen />
    {/if}
  {/if}
  {#if $alertStore.type !== "none"}
    <AlertComp />
  {/if}
</main>

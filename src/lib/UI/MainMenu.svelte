<script lang="ts">
  import { DataBase, appVer } from "src/ts/storage/database";
  import GithubStars from "../Others/GithubStars.svelte";
  import Hub from "./Hub.svelte";
  import { sideBarStore } from "src/ts/stores";
  import Help from "../Others/Help.svelte";
  import { ArrowLeft, HomeIcon } from "lucide-svelte";
  import { openURL } from "src/ts/storage/globalApi";
  import { language } from "src/lang";
  let openHub = false
</script>
<div class="h-full w-full flex flex-col overflow-y-auto items-center">
    {#if !openHub}
      <h2 class="text-4xl text-white mb-0 mt-6 font-black">RisuAI</h2>
      <h3 class="text-gray-500 mt-1">Version {appVer}</h3>
      <GithubStars />
    {/if}
    <div class="w-full flex p-4 flex-col text-white max-w-4xl">
      {#if !openHub}
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <button class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow hover:ring-1" on:click={() => {
          openURL("https://github.com/kwaroran/RisuAI/wiki/RisuAI-Quick-Start")
        }}>
          <h1 class="text-2xl font-bold text-start">Quick Start</h1>
          <span class="mt-2 text-gray-400 text-start">Simple Guide to start RisuAI</span>
        </button>
        <button class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow hover:ring-1" on:click={() => {
          openURL("https://github.com/kwaroran/RisuAI/wiki")
        }}>
          <h1 class="text-2xl font-bold text-start">Official Wiki</h1>
          <span class="mt-2 text-gray-400 text-start">Official Wiki for RisuAI. anyone can see and anyone who has github account can edit.</span>
        </button>
        <button class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow hover:ring-1" on:click={() => {sideBarStore.set(true)}}>
          <h1 class="text-2xl font-bold text-start">Your Characters</h1>
          <span class="mt-2 text-gray-400 text-start">Opens your character list. you can open with pressing arrow button in top left corner too.</span>
        </button>
        {#if $DataBase.useExperimental}
          <button class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow hover:ring-1" on:click={() => (openHub = true)}>
            <h1 class="text-2xl font-bold text-start">{language.hub} <Help key="experimental" /></h1>
            <span class="mt-2 text-gray-400 text-start">Characters made and shared by the community</span>
          </button>
        {:else}
          <button class="bg-darkbg rounded-md p-6 flex flex-col">
            <h1 class="text-2xl font-bold text-start">Comming soon</h1>
            <span class="mt-2 text-gray-400 text-start">More options comming soon</span>
          </button>
        {/if}
      </div>
      {:else}
        <div class="flex items-center mt-4">
          <button class="mr-2 text-gray-400 hover:text-green-500" on:click={() => (openHub = false)}>
            <ArrowLeft/>
          </button>
          <h1 class="text-3xl font-bold">{language.hub} <Help key="experimental" /> </h1>
        </div>
        <Hub />
      {/if}
  </div>
</div>
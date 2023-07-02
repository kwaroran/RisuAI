<script lang="ts">
  import { appVer, webAppSubVer } from "src/ts/storage/database";
  import GithubStars from "../Others/GithubStars.svelte";
  import Hub from "./Hub.svelte";
  import { sideBarStore } from "src/ts/stores";
  import { ArrowLeft } from "lucide-svelte";
  import { isNodeServer, isTauri, openURL } from "src/ts/storage/globalApi";
  import { language } from "src/lang";
  import { getRisuHub } from "src/ts/characterCards";
  import RisuHubIcon from "./RisuHubIcon.svelte";
  let openHub = false
</script>
<div class="h-full w-full flex flex-col overflow-y-auto items-center">
    {#if !openHub}
      <h2 class="text-4xl text-white mb-0 mt-6 font-black">RisuAI</h2>
      {#if (!isTauri) && (!isNodeServer)}
        <h3 class="text-gray-500 mt-1">Version {appVer}{webAppSubVer}</h3>
      {:else}
        <h3 class="text-gray-500 mt-1">Version {appVer}</h3>
      {/if}
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
        <button class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow hover:ring-1" on:click={() => {openURL("https://discord.gg/JzP8tB9ZK8")}}>
          <h1 class="text-2xl font-bold text-start">Official Discord</h1>
          <span class="mt-2 text-gray-400 text-start">Official Discord to talk about RisuAI</span>
        </button>
      </div>
      {#await getRisuHub({
          search: '',
          page: -10,
          nsfw: false,
          sort: ''
      }) then charas}
          <div class="mt-4 mb-4 w-full border-t border-t-selected"></div>
          <h1 class="text-2xl font-bold">Recent Characters from {language.hub} <button class="text-base font-medium float-right p-1 bg-darkbg rounded-md hover:ring" on:click={() => {
            openHub = true
          }}>Get More</button></h1>
          {#if charas.length > 0}
          <div class="w-full flex gap-4 p-2 flex-wrap justify-center">
              {#each charas as chara}
                  <RisuHubIcon onClick={() => {openHub = true}} chara={chara} />
              {/each}
          </div>
          {:else}
          <div class="text-gray-500">Failed to load {language.hub}...</div>
          {/if}
      {/await}
      {:else}
        <div class="flex items-center mt-4">
          <button class="mr-2 text-gray-400 hover:text-green-500" on:click={() => (openHub = false)}>
            <ArrowLeft/>
          </button>
        </div>
        <Hub />
      {/if}
  </div>
</div>
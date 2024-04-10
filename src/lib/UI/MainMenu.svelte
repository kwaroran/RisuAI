<script lang="ts">
  import { DataBase, appVer, webAppSubVer } from "src/ts/storage/database";
  import GithubStars from "../Others/GithubStars.svelte";
  import Hub from "./Realm/RealmMain.svelte";
  import { sideBarStore } from "src/ts/stores";
  import { ArrowLeft } from "lucide-svelte";
  import { isNodeServer, isTauri, openURL } from "src/ts/storage/globalApi";
  import { language } from "src/lang";
  import { getRisuHub } from "src/ts/characterCards";
  import RisuHubIcon from "./Realm/RealmHubIcon.svelte";
  import Title from "./Title.svelte";
  import { getPatchNote } from "src/etc/patchNote";
  import { parseMarkdownSafe } from "src/ts/parser";
  let openHub = false
  const patch = getPatchNote(appVer)
  let patchNodeHidden = true

</script>
<div class="h-full w-full flex flex-col overflow-y-auto items-center">
    {#if !openHub}
      <Title />
      {#if (!isTauri) && (!isNodeServer)}
        <h3 class="text-textcolor2 mt-1">Version {appVer}{webAppSubVer}</h3>
      {:else}
        <h3 class="text-textcolor2 mt-1">Version {appVer}</h3>
      {/if}
      <GithubStars />
      {#if patch.content}
        <div class="w-full max-w-4xl pl-4 pr-4 pt-4 relative">
          {#if patch.version !== $DataBase.lastPatchNoteCheckVersion}
            <div class="absolute inline-flex items-center justify-center p-1 text-sm font-bold text-white bg-red-500 border-2 border-red-600 rounded-full top-2 start-2 ">
              Update
            </div>
          {/if}
          <div class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow overflow-y-hidden shadow-inner"
            on:click={() => {
              patchNodeHidden = false
              $DataBase.lastPatchNoteCheckVersion = patch.version
            }}
            class:max-h-40={patchNodeHidden}>
              <div class="prose prose-invert">
                {@html parseMarkdownSafe(patch.content)}
              </div>
          </div>
        </div>
      {/if}
    {/if}
    <div class="w-full flex p-4 flex-col text-textcolor max-w-4xl">
      {#if !openHub}
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <button class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow hover:ring-1" on:click={() => {
          openURL("https://github.com/kwaroran/RisuAI/wiki")
        }}>
          <h1 class="text-2xl font-bold text-start">{language.officialWiki}</h1>
          <span class="mt-2 text-textcolor2 text-start">{language.officialWikiDesc}</span>
        </button>
        <button class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow hover:ring-1" on:click={() => {openURL("https://discord.gg/JzP8tB9ZK8")}}>
          <h1 class="text-2xl font-bold text-start">{language.officialDiscord}</h1>
          <span class="mt-2 text-textcolor2 text-start">{language.officialDiscordDesc}</span>
        </button>
      </div>
      <div class="mt-4 mb-4 w-full border-t border-t-selected"></div>
      <h1 class="text-2xl font-bold">Recently Uploaded<button class="text-base font-medium float-right p-1 bg-darkbg rounded-md hover:ring" on:click={() => {
        openHub = true
      }}>Get More</button></h1>
          {#if !$DataBase.hideRealm}
            {#await getRisuHub({
                  search: '',
                  page: -10,
                  nsfw: false,
                  sort: ''
              }) then charas}
            {#if charas.length > 0}
              <div class="w-full flex gap-4 p-2 flex-wrap justify-center">
                  {#each charas as chara}
                      <RisuHubIcon onClick={() => {openHub = true}} chara={chara} />
                  {/each}
              </div>
            {:else}
              <div class="text-textcolor2">Failed to load {language.hub}...</div>
            {/if}
          {/await}
        {:else}
          <div class="text-textcolor2">{language.hideRealm}</div>
        {/if}
      {:else}
        <div class="flex items-center mt-4">
          <button class="mr-2 text-textcolor2 hover:text-green-500" on:click={() => (openHub = false)}>
            <ArrowLeft/>
          </button>
        </div>
        <Hub />
      {/if}
  </div>
</div>
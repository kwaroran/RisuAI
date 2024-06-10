<script lang="ts">
    import { DataBase, appVer, webAppSubVer } from "src/ts/storage/database";
    import Hub from "./Realm/RealmMain.svelte";
    import { OpenRealmStore } from "src/ts/stores";
    import { ArrowLeft } from "lucide-svelte";
    import { isNodeServer, isTauri } from "src/ts/storage/globalApi";
    import { language } from "src/lang";
    import { getRisuHub, hubAdditionalHTML } from "src/ts/characterCards";
    import RisuHubIcon from "./Realm/RealmHubIcon.svelte";
    import Title from "./Title.svelte";

</script>
<div class="h-full w-full flex flex-col overflow-y-auto items-center">
    {#if !$OpenRealmStore}
      <Title />
      {#if (!isTauri) && (!isNodeServer)}
        <h3 class="text-textcolor2 mt-1">Version {appVer}{webAppSubVer}</h3>
      {:else}
        <h3 class="text-textcolor2 mt-1">Version {appVer}</h3>
      {/if}
    {/if}
    <div class="w-full flex p-4 flex-col text-textcolor max-w-4xl">
      {#if !$OpenRealmStore}
      <div class="mt-4 mb-4 w-full border-t border-t-selected"></div>
      <h1 class="text-2xl font-bold">Recently Uploaded<button class="text-base font-medium float-right p-1 bg-darkbg rounded-md hover:ring" on:click={() => {
        $OpenRealmStore = true
      }}>Get More</button></h1>
          {#if !$DataBase.hideRealm}
            {#await getRisuHub({
                  search: '',
                  page: -10,
                  nsfw: false,
                  sort: ''
              }) then charas}
            {#if charas.length > 0}
              {@html hubAdditionalHTML}
              <div class="w-full flex gap-4 p-2 flex-wrap justify-center">
                  {#each charas as chara}
                      <RisuHubIcon onClick={() => {$OpenRealmStore = true}} chara={chara} />
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
          <button class="mr-2 text-textcolor2 hover:text-green-500" on:click={() => ($OpenRealmStore = false)}>
            <ArrowLeft/>
          </button>
        </div>
        <Hub />
      {/if}
  </div>
</div>
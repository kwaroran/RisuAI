<script lang="ts">
    import { appVer, webAppSubVer } from "src/ts/storage/database.svelte";
    import { DBState } from 'src/ts/stores.svelte';
    import Hub from "./Realm/RealmMain.svelte";
    import { OpenRealmStore } from "src/ts/stores.svelte";
    import { ArrowLeft } from "lucide-svelte";
    import { isNodeServer, isTauri, openURL } from "src/ts/globalApi.svelte";
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
      <h1 class="text-2xl font-bold">Recently Uploaded<button class="text-base font-medium float-right p-1 bg-darkbg rounded-md hover:ring" onclick={() => {
        $OpenRealmStore = true
      }} aria-label="더 많은 캐릭터 가져오기">Get More</button></h1>
          {#if !DBState.db.hideRealm}
            {#await getRisuHub({
                  search: '',
                  page: 0,
                  nsfw: false,
                  sort: 'recommended'
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
      <div class="mt-4 mb-4 w-full border-t border-t-selected"></div>
      <h1 class="text-2xl font-bold mb-4">
        Related Links
      </h1>
        <div class="w-full flex gap-4 p-2 flex-wrap justify-center">
        <button class="bg-darkbg rounded-lg p-4 flex flex-col hover:bg-selected transition-colors relative lg:w-96 w-full items-start text-start" onclick={() => {
          openURL("https://discord.gg/Exy3NrqkGm")
        }} aria-label="디스코드 서버 방문하기">
          <h2 class="text-xl">Discord</h2>
          <span class="text-textcolor2">
            Join our Discord server to chat with other users and the developer.
          </span>
        </button>
        <button class="bg-darkbg rounded-lg p-4 flex flex-col hover:bg-selected transition-colors relative lg:w-96 w-full items-start text-start" onclick={() => {
          openURL("https://risuai.net")
        }} aria-label="공식 웹사이트 방문하기">
          <h2 class="text-xl">
            Website
          </h2>
          <span class="text-textcolor2">
            See the official website for the project.
          </span>
        </button>
        <button class="bg-darkbg rounded-lg p-4 flex flex-col hover:bg-selected transition-colors relative lg:w-96 w-full items-start text-start" onclick={() => {
          openURL("https://github.com/kwaroran/RisuAI")
        }} aria-label="깃허브 저장소 방문하기">
          <h2 class="text-xl">Github</h2>
          <span class="text-textcolor2">
            View the source code and contribute to the project.
          </span>
        </button>
        <button class="bg-darkbg rounded-lg p-4 flex flex-col hover:bg-selected transition-colors relative lg:w-96 w-full items-start text-start" onclick={() => {
          openURL("mailto:support@risuai.net")
        }} aria-label="이메일로 연락하기">
          <h2 class="text-xl">Email</h2>
          <span class="text-textcolor2">
            Contact the developer directly.
          </span>
        </button>
      </div>

      {:else}
        <div class="flex items-center mt-4">
          <button class="mr-2 text-textcolor2 hover:text-green-500" onclick={() => ($OpenRealmStore = false)} aria-label="뒤로 가기">
            <ArrowLeft/>
          </button>
        </div>
        <Hub />
      {/if}
  </div>
</div>
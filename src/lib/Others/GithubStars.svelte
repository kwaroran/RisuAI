<script lang="ts">
    import { HomeIcon, MailIcon, MaximizeIcon, WalletIcon } from "lucide-svelte";
    import { isTauri, openURL, toggleFullscreen } from "src/ts/globalApi.svelte";

</script>
<svelte:head>
    <script async defer src="https://buttons.github.io/buttons.js"></script>
</svelte:head>

<div class="flex gap-2 items-center mt-2">
  {#if !isTauri}
    <a class="github-button mt-4" href="https://github.com/kwaroran/risuAI" data-color-scheme="no-preference: dark; light: dark; dark: dark;" data-size="large" data-show-count="true" aria-label="Star kwaroran/risuAI on GitHub">Star</a>
  {:else}
    <button onclick={() => {
      openURL("https://github.com/kwaroran/risuAI")
    }} aria-label="GitHub 방문하기">
      <img src="/icon/github-mark-white.svg" width="24" alt="github" />
    </button>
  {/if}
  <button class="text-textcolor" onclick={() => {
    openURL("https://risuai.net/")
  }} aria-label="홈페이지 방문하기">
    <HomeIcon size={24} />
  </button>
  <button class="text-textcolor" onclick={() => {
    openURL("https://www.patreon.com/RisuAI")
  }} aria-label="Patreon 후원하기">
    <WalletIcon size={24} />
  </button>
  <button class="text-textcolor" onclick={() => {
    openURL("mailto:risuai@proton.me")
  }} aria-label="이메일 보내기">
    <MailIcon size={24} />
  </button>
  {#if !isTauri}
    <button class="text-textcolor" onclick={() => {
      toggleFullscreen()
    }} aria-label="전체 화면 전환">
      <MaximizeIcon size={24} />
    </button>
  {/if}
</div>
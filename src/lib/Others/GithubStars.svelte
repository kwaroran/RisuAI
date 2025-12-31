<script lang="ts">
    import { HomeIcon, MailIcon, MaximizeIcon, WalletIcon } from "@lucide/svelte";
    import { openURL, toggleFullscreen } from "src/ts/globalApi.svelte";
    import { isTauri } from "src/ts/platform"

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
    }}>
      <img src="/icon/github-mark-white.svg" width="24" alt="github" />
    </button>
  {/if}
  <button class="text-textcolor" onclick={() => {
    openURL("https://risuai.net/")
  }}>
    <HomeIcon size={24} />
  </button>
  <button class="text-textcolor" onclick={() => {
    openURL("https://www.patreon.com/RisuAI")
  }}>
    <WalletIcon size={24} />
  </button>
  <button class="text-textcolor" onclick={() => {
    openURL("mailto:risuai@proton.me")
  }}>
    <MailIcon size={24} />
  </button>
  {#if !isTauri}
    <button class="text-textcolor" onclick={() => {
      toggleFullscreen()
    }}>
      <MaximizeIcon size={24} />
    </button>
  {/if}
</div>
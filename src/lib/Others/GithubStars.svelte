<script lang="ts">
  import { MailIcon, WalletIcon } from "lucide-svelte";
  import { isTauri, openURL } from "src/ts/storage/globalApi";

</script>
<svelte:head>
    <script async defer src="https://buttons.github.io/buttons.js"></script>
</svelte:head>

<div class="flex gap-2 items-center mt-2">
  {#if !isTauri}
    <a class="github-button mt-4" href="https://github.com/kwaroran/risuAI" data-color-scheme="no-preference: dark; light: dark; dark: dark;" data-size="large" data-show-count="true" aria-label="Star kwaroran/risuAI on GitHub">Star</a>
  {:else}
    <button on:click={() => {
      openURL("https://github.com/kwaroran/risuAI")
    }}>
      <img src="/icon/github-mark-white.svg" width="24" alt="github" />
    </button>
  {/if}
  <button class="text-textcolor" on:click={() => {
    openURL("https://www.patreon.com/RisuAI")
  }}>
    <WalletIcon size={24} />
  </button>
  <button class="text-textcolor" on:click={() => {
    openURL("mailto:amasio1234@proton.me")
  }}>
    <MailIcon size={24} />
  </button>
</div>
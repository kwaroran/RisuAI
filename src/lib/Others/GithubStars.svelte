<script lang="ts">
  import { isTauri } from "src/ts/globalApi";

</script>
<svelte:head>
    <script async defer src="https://buttons.github.io/buttons.js"></script>
</svelte:head>
<!-- Place this tag where you want the button to render. -->
{#if isTauri}
    <a class="github-button mt-4" href="https://github.com/kwaroran/risuAI" data-color-scheme="no-preference: dark; light: dark; dark: dark;" data-size="large" data-show-count="true" aria-label="Star kwaroran/risuAI on GitHub">Star</a>
{/if}

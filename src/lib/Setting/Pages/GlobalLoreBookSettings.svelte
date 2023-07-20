<script lang="ts">
  import { language } from "src/lang";
  import Help from "src/lib/Others/Help.svelte";
  import LoreBookSetting from "src/lib/SideBars/LoreBook/LoreBookSetting.svelte";
  import { DataBase } from "src/ts/storage/database";
  export let openLoreList = false
</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.globalLoreBook} <Help key="lorebook" /></h2>
<button on:click={() => {openLoreList = true}} class="mt-4 drop-shadow-lg p-3 flex justify-center items-center ml-2 mr-2 rounded-lg bg-selected mb-4">{$DataBase.loreBook[$DataBase.loreBookPage].name}</button>

<LoreBookSetting globalMode />
<script lang="ts">
  import { OctagonAlert, SaveIcon } from "@lucide/svelte";
  import { alertMd } from "src/ts/alert";
  import { saving } from "src/ts/globalApi.svelte";
  import { AccountWarning } from "src/ts/storage/accountStorage";
  import { DBState } from "src/ts/stores.svelte";

</script>

{#if DBState?.db?.showSavingIcon && saving.state}
  <div
    class="absolute top-3 right-3 z-10 text-white p-2 rounded-sm bg-linear-to-br from-blue-500 to-purple-800 saving-animation pointer-events-none opacity-15"
  >
    <SaveIcon size={24} />
  </div>
{:else if $AccountWarning}
  <button class="absolute top-3 right-3 z-10 text-white bg-red-800 hover:bg-red-600 p-2 rounded-sm" onclick={() =>{
      alertMd($AccountWarning)
      $AccountWarning = ''
  }}>
      <OctagonAlert size={24} />
  </button>
{/if}
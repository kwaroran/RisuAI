<script lang="ts">
  import { AlertOctagon, SaveIcon } from "lucide-svelte";
  import { alertMd } from "src/ts/alert";
  import { saving } from "src/ts/globalApi.svelte";
  import { AccountWarning } from "src/ts/storage/accountStorage";
  import { DBState } from "src/ts/stores.svelte";
  import { language } from "src/lang";
</script>

{#if DBState?.db?.showSavingIcon && saving.state}
  <div
    class="absolute top-3 right-3 z-10 text-white p-2 rounded bg-gradient-to-br from-blue-500 to-purple-800 saving-animation pointer-events-none opacity-15"
    role="status"
    aria-label="저장 중"
  >
    <SaveIcon size={24} aria-hidden="true" />
  </div>
{:else if $AccountWarning}
  <button 
    class="absolute top-3 right-3 z-10 text-white bg-red-800 hover:bg-red-600 p-2 rounded" 
    onclick={() =>{
      alertMd($AccountWarning)
      $AccountWarning = ''
    }}
    aria-label="계정 경고"
  >
      <AlertOctagon size={24} aria-hidden="true" />
  </button>
{/if}
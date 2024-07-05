<script lang="ts">
  import { AlertOctagon } from "lucide-svelte";
  import { alertMd } from "src/ts/alert";
  import { AccountWarning } from "src/ts/storage/accountStorage";

</script>
<button class="absolute top-2 right-2 z-10 text-white bg-red-800 hover:bg-red-600 p-2 rounded" on:click={() =>{
    alertMd($AccountWarning)
    $AccountWarning = ''
}}>
    <AlertOctagon size={24} />
</button>
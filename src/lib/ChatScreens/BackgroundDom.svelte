<script lang="ts">
  import { ParseMarkdown } from "src/ts/parser";
  import { DataBase } from "src/ts/storage/database";
  import { selectedCharID } from "src/ts/stores";
</script>


{#if $selectedCharID > 0 && $DataBase.characters[$selectedCharID].backgroundHTML}
    <div class="absolute top-0 left-0 w-full h-full">
        {#await ParseMarkdown($DataBase.characters[$selectedCharID].backgroundHTML, $DataBase.characters[$selectedCharID], 'back') then md} 
            {@html md}
        {/await}
    </div>
{/if}
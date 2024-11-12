<script lang="ts">
    import { ParseMarkdown, risuChatParser } from "src/ts/parser.svelte";
    import { type character, type groupChat } from "src/ts/storage/database.svelte";
    import { DBState } from 'src/ts/stores.svelte';
    import { moduleBackgroundEmbedding, ReloadGUIPointer, selIdState } from "src/ts/stores.svelte";

    let backgroundHTML = $derived(DBState.db?.characters?.[selIdState.selId]?.backgroundHTML)
    let currentChar:character|groupChat = $state()

</script>


{#if backgroundHTML || $moduleBackgroundEmbedding}
    {#if selIdState.selId > -1}
        {#key $ReloadGUIPointer}
            <div class="absolute top-0 left-0 w-full h-full">
                {#await ParseMarkdown(risuChatParser((backgroundHTML || '') + '\n' + ($moduleBackgroundEmbedding || ''), {chara:currentChar}), currentChar, 'back') then md} 
                    {@html md}
                {/await}
            </div>
        {/key}
    {/if}
{/if}
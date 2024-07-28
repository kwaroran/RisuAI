<script lang="ts">
    import { ParseMarkdown, risuChatParser } from "src/ts/parser";
    import { DataBase, type Database, type character, type groupChat } from "src/ts/storage/database";
    import { CurrentVariablePointer, moduleBackgroundEmbedding, ReloadGUIPointer, selectedCharID } from "src/ts/stores";
    import { onDestroy } from "svelte";

    let backgroundHTML = ''
    let lastdb:Database
    let currentChar:character|groupChat
    let selectedId = 0

    function checkUpdate(){
        if(selectedId > 0 && lastdb){
            if(lastdb.characters[selectedId] && lastdb.characters[selectedId].backgroundHTML !== backgroundHTML){
                backgroundHTML = lastdb.characters[selectedId].backgroundHTML
                currentChar = lastdb.characters[selectedId]
            }
        }
        else{
            if(backgroundHTML !== ''){
                backgroundHTML = ''
            }
        }
    }

    const unsubDatabase = DataBase.subscribe(v => {
        lastdb = v
        checkUpdate()
    })

    const unsubID = selectedCharID.subscribe(v => {
        selectedId = v
        checkUpdate()
    })

    onDestroy(() => {
        unsubDatabase()
        unsubID()
    })

</script>


{#if backgroundHTML || $moduleBackgroundEmbedding}
    {#key $CurrentVariablePointer}
        {#key $ReloadGUIPointer}
            <div class="absolute top-0 left-0 w-full h-full">
                {#await ParseMarkdown(risuChatParser((backgroundHTML || '') + ($moduleBackgroundEmbedding || ''), {chara:currentChar}), currentChar, 'back') then md} 
                    {@html md}
                {/await}
            </div>
        {/key}
    {/key}
{/if}
<script lang="ts">
    import { ParseMarkdown, risuChatParser } from "src/ts/parser";
    import { DataBase, type Database, type character, type groupChat } from "src/ts/storage/database";
    import { selectedCharID } from "src/ts/stores";
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


{#if backgroundHTML}
    {#key currentChar}
        <div class="absolute top-0 left-0 w-full h-full">
            {#await ParseMarkdown(risuChatParser(backgroundHTML, {chara:currentChar}), currentChar, 'back') then md} 
                {@html md}
            {/await}
        </div>
    {/key}
{/if}
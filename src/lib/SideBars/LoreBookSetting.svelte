<script lang="ts">
    import { DataBase } from "../../ts/database";
    import { language } from "../../lang";
    import {selectedCharID} from '../../ts/stores'
    import { DownloadIcon, FolderUpIcon, ImportIcon, PlusIcon } from "lucide-svelte";
    import { addLorebook, exportLoreBook, importLoreBook } from "../../ts/lorebook";
    import LoreBookData from "./LoreBookData.svelte";
    let submenu = 0
</script>

<div class="flex w-full">
    <button on:click={() => {
        submenu = 0
    }} class="flex-1 border-solid border-borderc border-1 p-2 flex justify-center cursor-pointer" class:bg-selected={submenu === 0}>
        <span>{$DataBase.characters[$selectedCharID].type === 'group' ? language.group : language.character}</span>
    </button>
    <button on:click={() => {
        submenu = 1
    }} class="flex-1 border-solid border-borderc border-1 border-l-transparent p-2 flex justify-center cursor-pointer" class:bg-selected={submenu === 1}>
        <span>{language.Chat}</span>
    </button>
</div>
<span class="text-gray-500 mt-2 mb-6 text-sm">{submenu === 0 ? $DataBase.characters[$selectedCharID].type === 'group' ? language.groupLoreInfo : language.globalLoreInfo : language.localLoreInfo}</span>

<div class="border-solid border-borderc p-2 flex flex-col border-1">
    {#if submenu === 0}
        {#if $DataBase.characters[$selectedCharID].globalLore.length === 0}
            <span class="text-gray-500">No Lorebook</span>
        {:else}
            {#each $DataBase.characters[$selectedCharID].globalLore as book, i}
                {#if i !== 0}
                    <div class="border-borderc mt-2 mb-2 w-full border-solid border-b-1 seperator"></div>
                {/if}
                <LoreBookData bind:value={$DataBase.characters[$selectedCharID].globalLore[i]} onRemove={() => {
                    let lore  = $DataBase.characters[$selectedCharID].globalLore
                    lore.splice(i, 1)
                    $DataBase.characters[$selectedCharID].globalLore = lore
                }}/>
            {/each}
        {/if}
    {:else}
        {#if $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].localLore.length === 0}
            <span class="text-gray-500">No Lorebook</span>
        {:else}
            {#each $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].localLore as book, i}
                {#if i !== 0}
                    <div class="border-borderc mt-2 mb-2 w-full border-solid border-b-1 seperator"></div>
                {/if}
                <LoreBookData bind:value={$DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].localLore[i]} onRemove={() => {
                    let lore  = $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].localLore
                    lore.splice(i, 1)
                    $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].localLore = lore
                }}/>
            {/each}
        {/if}
    {/if}

</div>

<div class="text-gray-500 mt-2 flex">
    <button on:click={() => {addLorebook(submenu)}} class="hover:text-neutral-200 cursor-pointer">
        <PlusIcon />
    </button>
    <button on:click={() => {
        exportLoreBook(submenu === 0 ? 'global' : 'local')
    }} class="hover:text-neutral-200 ml-1  cursor-pointer">
        <DownloadIcon />
    </button>
    <button on:click={() => {
        importLoreBook(submenu === 0 ? 'global' : 'local')
    }} class="hover:text-neutral-200 ml-2  cursor-pointer">
        <FolderUpIcon />
    </button>
</div>

<style>
    .seperator{
        border-top: 0px;
        border-left: 0px;
        border-right: 0px;
    }
</style>
<script lang="ts">
    import { DataBase, type loreBook } from "src/ts/storage/database";
    import LoreBookData from "./LoreBookData.svelte";
    import { selectedCharID } from "src/ts/stores";
    import Sortable from 'sortablejs/modular/sortable.core.esm.js';
    import { onDestroy, onMount } from "svelte";
    import { sleep } from "src/ts/util";

    export let globalMode = false
    export let submenu = 0
    let stb: Sortable = null
    let ele: HTMLDivElement
    let sorted = 0
    const createStb = () => {
        stb = Sortable.create(ele, {
            onEnd: async () => {
                let idx:number[] = []
                ele.querySelectorAll('[data-risu-idx]').forEach((e, i) => {
                    idx.push(parseInt(e.getAttribute('data-risu-idx')))
                })
                if(globalMode){
                    let newLore:loreBook[] = []
                    idx.forEach((i) => {
                        newLore.push($DataBase.loreBook[$DataBase.loreBookPage].data[i])
                    })
                    $DataBase.loreBook[$DataBase.loreBookPage].data = newLore
                }
                else if(submenu === 1){
                    let newLore:loreBook[] = []
                    idx.forEach((i) => {
                        newLore.push($DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].localLore[i])
                    })
                    $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].localLore = newLore
                }
                else{
                    let newLore:loreBook[] = []
                    idx.forEach((i) => {
                        newLore.push($DataBase.characters[$selectedCharID].globalLore[i])
                    })
                    $DataBase.characters[$selectedCharID].globalLore = newLore
                }
                stb.destroy()
                sorted += 1
                await sleep(1)
                createStb()
            }
        })
    }
    // onMount(createStb)

    let opened = 0
    
    const onOpen = () => {
        opened += 1
        if(stb){
            stb.destroy()
        }
    }
    const onClose = () => {
        opened -= 1
        // if(opened === 0){
        //     createStb()
        // }
    }

    onDestroy(() => {
        if(stb){
            stb.destroy()
        }
    })
</script>


<div class="border-solid border-selected p-2 flex flex-col border-1 rounded-md" bind:this={ele}>
    {#key sorted}
        {#if globalMode}
            {#if $DataBase.loreBook[$DataBase.loreBookPage].data.length === 0}
                <span class="text-textcolor2">No Lorebook</span>
            {:else}
                {#each $DataBase.loreBook[$DataBase.loreBookPage].data as book, i}
                    <LoreBookData bind:value={$DataBase.loreBook[$DataBase.loreBookPage].data[i]} idx={i} onRemove={() => {
                        let lore = $DataBase.loreBook[$DataBase.loreBookPage].data
                        lore.splice(i, 1)
                        $DataBase.loreBook[$DataBase.loreBookPage].data = lore
                    }} onOpen={onOpen} onClose={onClose}/>
                {/each}
            {/if}
        {:else if submenu === 0}
            {#if $DataBase.characters[$selectedCharID].globalLore.length === 0}
                <span class="text-textcolor2">No Lorebook</span>
            {:else}
                {#each $DataBase.characters[$selectedCharID].globalLore as book, i}
                    <LoreBookData bind:value={$DataBase.characters[$selectedCharID].globalLore[i]} idx={i} onRemove={() => {
                        let lore  = $DataBase.characters[$selectedCharID].globalLore
                        lore.splice(i, 1)
                        $DataBase.characters[$selectedCharID].globalLore = lore
                    }} onOpen={onOpen} onClose={onClose}/>
                {/each}
            {/if}
        {:else if submenu === 1}
            {#if $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].localLore.length === 0}
                <span class="text-textcolor2">No Lorebook</span>
            {:else}
                {#each $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].localLore as book, i}
                    <LoreBookData bind:value={$DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].localLore[i]} idx={i} onRemove={() => {
                        let lore  = $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].localLore
                        lore.splice(i, 1)
                        $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].localLore = lore
                    }} onOpen={onOpen} onClose={onClose}/>
                {/each}
            {/if}
        {/if}
    {/key}
</div>
<script lang="ts">
    import { DBState, type loreBook } from "src/ts/storage/database.svelte";
    import LoreBookData from "./LoreBookData.svelte";
    import { selectedCharID } from "src/ts/stores";
    import Sortable from 'sortablejs/modular/sortable.core.esm.js';
    import { onDestroy, onMount } from "svelte";
    import { sleep, sortableOptions } from "src/ts/util";

    interface Props {
        globalMode?: boolean;
        submenu?: number;
        lorePlus?: boolean;
    }

    let { globalMode = false, submenu = 0, lorePlus = false }: Props = $props();
    let stb: Sortable = null
    let ele: HTMLDivElement = $state()
    let sorted = $state(0)
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
                        newLore.push(DBState.db.loreBook[DBState.db.loreBookPage].data[i])
                    })
                    DBState.db.loreBook[DBState.db.loreBookPage].data = newLore
                }
                else if(submenu === 1){
                    let newLore:loreBook[] = []
                    idx.forEach((i) => {
                        newLore.push(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].localLore[i])
                    })
                    DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].localLore = newLore
                }
                else{
                    let newLore:loreBook[] = []
                    idx.forEach((i) => {
                        newLore.push(DBState.db.characters[$selectedCharID].globalLore[i])
                    })
                    DBState.db.characters[$selectedCharID].globalLore = newLore
                }
                try {
                    stb.destroy()
                } catch (error) {}
                sorted += 1
                await sleep(1)
                createStb()
            },
            ...sortableOptions
        })
    }
    onMount(createStb)

    let opened = 0
    
    const onOpen = () => {
        opened += 1
        if(stb){
            try {
                stb.destroy()
            } catch (error) {}
        }
    }
    const onClose = () => {
        opened -= 1
        if(opened === 0){
            createStb()
        }
    }

    onDestroy(() => {
        if(stb){
            try {
                stb.destroy()
            } catch (error) {  }
        }
    })
</script>


<div class="border-solid border-selected p-2 flex flex-col border-1 rounded-md" bind:this={ele}>
    {#key sorted}
        {#if globalMode}
            {#if DBState.db.loreBook[DBState.db.loreBookPage].data.length === 0}
                <span class="text-textcolor2">No Lorebook</span>
            {:else}
                {#each DBState.db.loreBook[DBState.db.loreBookPage].data as book, i}
                    <LoreBookData bind:value={DBState.db.loreBook[DBState.db.loreBookPage].data[i]} idx={i} onRemove={() => {
                        let lore = DBState.db.loreBook[DBState.db.loreBookPage].data
                        lore.splice(i, 1)
                        DBState.db.loreBook[DBState.db.loreBookPage].data = lore
                    }} onOpen={onOpen} onClose={onClose}/>
                {/each}
            {/if}
        {:else if submenu === 0}
            {#if DBState.db.characters[$selectedCharID].globalLore.length === 0}
                <span class="text-textcolor2">No Lorebook</span>
            {:else}
                {#each DBState.db.characters[$selectedCharID].globalLore as book, i}
                    <LoreBookData bind:value={DBState.db.characters[$selectedCharID].globalLore[i]} idx={i} onRemove={() => {
                        let lore  = DBState.db.characters[$selectedCharID].globalLore
                        lore.splice(i, 1)
                        DBState.db.characters[$selectedCharID].globalLore = lore
                    }} onOpen={onOpen} onClose={onClose} lorePlus={lorePlus}/>
                {/each}
            {/if}
        {:else if submenu === 1}
            {#if DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].localLore.length === 0}
                <span class="text-textcolor2">No Lorebook</span>
            {:else}
                {#each DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].localLore as book, i}
                    <LoreBookData bind:value={DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].localLore[i]} idx={i} onRemove={() => {
                        let lore  = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].localLore
                        lore.splice(i, 1)
                        DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].localLore = lore
                    }} onOpen={onOpen} onClose={onClose} lorePlus={lorePlus}/>
                {/each}
            {/if}
        {/if}
    {/key}
</div>
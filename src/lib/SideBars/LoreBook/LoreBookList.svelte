<script lang="ts">
    import { type loreBook } from "src/ts/storage/database.svelte";
    import { DBState } from 'src/ts/stores.svelte';
    import LoreBookData from "./LoreBookData.svelte";
    import { selectedCharID } from "src/ts/stores.svelte";
    import Sortable from 'sortablejs/modular/sortable.core.esm.js';
    import { onDestroy, onMount } from "svelte";
    import { sleep, sortableOptions } from "src/ts/util";
    import { v4 } from "uuid";

    interface Props {
        globalMode?: boolean;
        submenu?: number;
        lorePlus?: boolean;
        externalLoreBooks?: loreBook[];
        showFolder?: string
    }

    let { globalMode = false, submenu = 0, lorePlus = false, externalLoreBooks = null, showFolder = '' }: Props = $props();
    let stb: Sortable = null
    let ele: HTMLDivElement = $state()
    let sorted = $state(0)
    let idgroup = 'a' + v4() //make should it starts with alphabetic character
    const createStb = () => {
        stb = Sortable.create(ele, {
            onEnd: async () => {
                let idx:number[] = []
                ele.querySelectorAll(`[data-risu-idx][data-risu-idgroup=${idgroup}]`).forEach((e, i) => {
                    idx.push(parseInt(e.getAttribute('data-risu-idx')))
                })
                if(globalMode){
                    let newLore:loreBook[] = []
                    idx.forEach((i) => {
                        newLore.push(DBState.db.loreBook[DBState.db.loreBookPage].data[i])
                    })
                    DBState.db.loreBook[DBState.db.loreBookPage].data = newLore
                }
                else if(externalLoreBooks){
                    const tempArray = [...externalLoreBooks];
                    externalLoreBooks.length = 0;
                    idx.forEach((i) => {
                        externalLoreBooks.push(tempArray[i]);
                    });
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
            ...sortableOptions,
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

{#key sorted}
    <div class="border-solid border-selected p-2 flex flex-col border-1 rounded-md" bind:this={ele}>
        {#if globalMode}
            <!--
                This was a place for global lorebooks, but it was removed :)
            -->
        {:else if externalLoreBooks}
            {#if externalLoreBooks.length === 0}
                <span class="text-textcolor2">No Lorebook</span>
            {:else}
                {#each externalLoreBooks as book, i}
                    {#if (!showFolder && !book.folder) || (showFolder === book.folder)}
                        <LoreBookData idgroup={idgroup} bind:value={externalLoreBooks[i]} idx={i} onRemove={() => {
                            let lore = externalLoreBooks
                            lore.splice(i, 1)
                            externalLoreBooks = lore
                        }} onOpen={onOpen} onClose={onClose} bind:externalLoreBooks={externalLoreBooks} />
                    {:else}
                        <div data-risu-idx={i} data-risu-idgroup={idgroup}></div>
                    {/if}
                {/each}
            {/if}
        {:else if submenu === 0}
            {#if DBState.db.characters[$selectedCharID].globalLore.length === 0}
                <span class="text-textcolor2">No Lorebook</span>
            {:else}
                {#each DBState.db.characters[$selectedCharID].globalLore as book, i}
                    {#if (!showFolder && !book.folder) || (showFolder === book.folder)}
                        <LoreBookData idgroup={idgroup} bind:value={DBState.db.characters[$selectedCharID].globalLore[i]} idx={i} onRemove={() => {
                            let lore  = DBState.db.characters[$selectedCharID].globalLore
                            lore.splice(i, 1)
                            DBState.db.characters[$selectedCharID].globalLore = lore
                        }} onOpen={onOpen} onClose={onClose} lorePlus={lorePlus} bind:externalLoreBooks={DBState.db.characters[$selectedCharID].globalLore}/>
                    {:else}
                        <div data-risu-idx={i} data-risu-idgroup={idgroup}></div>
                    {/if}
                {/each}
            {/if}
        {:else if submenu === 1}
            {#if DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].localLore.length === 0}
                <span class="text-textcolor2">No Lorebook</span>
            {:else}
                {#each DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].localLore as book, i}
                    {#if (!showFolder && !book.folder) || (showFolder === book.folder)}
                        <LoreBookData idgroup={idgroup} bind:value={DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].localLore[i]} idx={i} onRemove={() => {
                            let lore  = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].localLore
                            lore.splice(i, 1)
                            DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].localLore = lore
                        }} onOpen={onOpen} onClose={onClose} lorePlus={lorePlus} bind:externalLoreBooks={DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].localLore}/>
                    {:else}
                        <div data-risu-idx={i} data-risu-idgroup={idgroup}></div>
                    {/if}
                {/each}
            {/if}
        {/if}
    </div>
{/key}

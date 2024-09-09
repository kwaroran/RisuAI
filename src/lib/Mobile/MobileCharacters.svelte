<script lang="ts">
    import { DataBase } from "src/ts/storage/database";
    import BarIcon from "../SideBars/BarIcon.svelte";
    import { characterFormatUpdate, getCharImage } from "src/ts/characters";
    import { MobileSearch, selectedCharID } from "src/ts/stores";
    import { doingChat } from "src/ts/process";
    function changeChar(index: number) {
        if($doingChat){
            return
        }
        characterFormatUpdate(index);
        selectedCharID.set(index);
    }
</script>
<div class="flex flex-col items-center w-full">
    {#each $DataBase.characters as char, i}
        {#if char.name.toLocaleLowerCase().includes($MobileSearch.toLocaleLowerCase())}
            <button class="flex p-2 border-t-darkborderc gap-2 w-full" class:border-t={i !== 0} on:click={() => {
                changeChar(i)
            }}>
                <BarIcon additionalStyle={getCharImage(char.image, 'css')}></BarIcon>
                <div class="flex flex-1 w-full flex-col justify-start items-start text-start">
                    <span>{char.name}</span>
                    <span class="text-sm text-textcolor2">{char.chats.length} Chats</span>
                </div>
            </button>
        {/if}
    {/each}
</div>
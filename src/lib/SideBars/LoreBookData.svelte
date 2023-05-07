<script lang="ts">
    import { XIcon } from "lucide-svelte";
    import { language } from "../../lang";
    import type { loreBook } from "../../ts/database";
    import { alertConfirm } from "../../ts/alert";
    import Check from "../Others/Check.svelte";
    import Help from "../Others/Help.svelte";
    export let value:loreBook
    export let onRemove: () => void = () => {}
    let open = false
</script>

<div class="w-full flex flex-col">
    <div class="flex items-center transition-colors w-full ">
        <button class="endflex valuer border-borderc" on:click={() => {
            open = !open
        }}>
            <span>{value.comment.length === 0 ? 'Unnamed Lore' : value.comment}</span>
        </button>
        <button class="valuer" on:click={async () => {
            const d = await alertConfirm(language.removeConfirm + value.comment)
            if(d){
                onRemove()
            }
        }}>
            <XIcon />
        </button>
    </div>
    {#if open}
        <div class="seperator">
            <span class="text-neutral-200 mt-6">{language.name} <Help key="loreName"/></span>
            <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={value.comment}>
            {#if !value.alwaysActive}
                <span class="text-neutral-200 mt-6">{language.activationKeys} <Help key="loreActivationKey"/></span>
                <span class="text-xs text-gray-500">{language.activationKeysInfo}</span>
                <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={value.key}>
            {/if}
            <span class="text-neutral-200 mt-4">{language.insertOrder} <Help key="loreorder"/></span>
            <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={value.insertorder} type="number" min={0} max={1000}>
            <span class="text-neutral-200 mt-4">{language.prompt}</span>
            <textarea class="bg-transparent input-text mt-2 text-gray-200 resize-none h-20 focus:bg-selected text-xs" autocomplete="off" bind:value={value.content}></textarea>
            <div class="flex items-center mt-4 mb-6">
                <Check bind:check={value.alwaysActive}/>
                <span>{language.alwaysActive}</span>
            </div>
        </div>
    {/if}
</div>



<style>
    .valuer:hover{
        color: rgba(16, 185, 129, 1);
        cursor: pointer;
    }

    .endflex{
        display: flex;
        flex-grow: 1;
        cursor: pointer;
    }

    .seperator{
        border: none;
        outline: 0;
        width: 100%;
        margin-top: 0.5rem;
        display: flex;
        flex-direction: column;
        margin-bottom: 0.5rem;
        background-color: #282a36;
    }
    
</style>
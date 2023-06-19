<script lang="ts">
    import { XIcon } from "lucide-svelte";
    import { language } from "../../lang";
    import type { loreBook } from "../../ts/storage/database";
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
            value.secondkey = value.secondkey ?? ''
            open = !open
        }}>
            <span>{value.comment.length === 0 ? value.key.length === 0 ? "Unnamed Lore" : value.key : value.comment}</span>
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

                {#if value.selective}
                    <span class="text-neutral-200 mt-6">{language.SecondaryKeys}</span>
                    <span class="text-xs text-gray-500">{language.activationKeysInfo}</span>
                    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={value.secondkey} min="0" max="100">
                {/if}
            {/if}
            {#if !(value.activationPercent === undefined || value.activationPercent === null)}
                <span class="text-neutral-200 mt-6">{language.activationProbability}</span>
                <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={value.activationPercent} on:change={() => {
                    if(isNaN(value.activationPercent) || !value.activationPercent || value.activationPercent < 0){
                        value.activationPercent = 0
                    }
                    if(value.activationPercent > 100){
                        value.activationPercent = 100
                    }
                }}>
            {/if}
            <span class="text-neutral-200 mt-4">{language.insertOrder} <Help key="loreorder"/></span>
            <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={value.insertorder} type="number" min={0} max={1000}>
            <span class="text-neutral-200 mt-4">{language.prompt}</span>
            <textarea class="bg-transparent input-text mt-2 text-gray-200 resize-none h-20 focus:bg-selected text-xs" autocomplete="off" bind:value={value.content}></textarea>
            <div class="flex items-center mt-4">
                <Check bind:check={value.alwaysActive} name={language.alwaysActive}/>
            </div>
            <div class="flex items-center mt-2">
                <Check bind:check={value.selective} name={language.selective}/>
                <Help key="loreSelective" name={language.selective}/>
            </div>
            <div class="flex items-center mt-2 mb-6">
                {#if value.activationPercent === undefined || value.activationPercent === null}
                    <Check name={language.loreRandomActivation} check={false} onChange={() => {value.activationPercent = 50}}/>
                {:else}
                    <Check name={language.loreRandomActivation} check={true} onChange={() => {value.activationPercent = null}}/>
                {/if}
                <span><Help name={language.loreRandomActivation} key="loreRandomActivation"/></span>
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
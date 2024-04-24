<script lang="ts">
    import type { language } from "src/lang";
    import Help from "../Others/Help.svelte";

    export let name = ""
    let open = false
    export let styled = false
    export let help: (keyof (typeof language.help))|'' = ''

</script>

{#if styled}
    <div class="flex flex-col mt-2">
        <button class="hover:bg-selected px-6 py-2 text-lg rounded-t-md border-selected border"
            class:bg-selected={open}
            class:rounded-b-md={!open}
            on:click={() => {
                open = !open
            }}
        >{name}{#if help}
            <Help key={help} />
        {/if}</button>
        {#if open}
            <div class="flex flex-col border border-selected p-2 rounded-b-md">
                <slot></slot>
            </div>
        {/if}
    </div>
{:else}
    <div class="flex flex-col">
        <button class="hover:bg-selected px-6 py-2 text-lg" class:bg-selected={open} on:click={() => {
            open = !open
        }}>{name}</button>
        {#if open}
            <div class="flex flex-col bg-darkbg">
                <slot></slot>
            </div>
        {/if}
    </div>
{/if}
<script lang="ts">
    import type { language } from "src/lang";
    import Help from "../Others/Help.svelte";

    let open = $state(false)
    interface Props {
        name?: string;
        styled?: boolean;
        help?: (keyof (typeof language.help))|'';
        disabled?: boolean;
        ariaLabel?: string;
        children?: import('svelte').Snippet;
        className?: string;
    }

    let {
        name = "",
        styled = false,
        help = '',
        disabled = false,
        ariaLabel,
        children,
        className = ""
    }: Props = $props();
</script>
{#if disabled}
    {@render children?.()}
{:else if styled}
    <div class="flex flex-col mt-2">
        <button class="hover:bg-selected px-6 py-2 text-lg rounded-t-md border-selected border"
            class:bg-selected={open}
            class:rounded-b-md={!open}
            onclick={() => {
                open = !open
            }}
            aria-label={ariaLabel || `Toggle ${name}`}
            aria-expanded={open}
        >
            <span class="mr-2">{name}</span>
        {#if help}
            <Help key={help} />
        {/if}</button>
        {#if open}
            <div class={"flex flex-col border border-selected p-2 rounded-b-md " + className}>
                {@render children?.()}
            </div>
        {/if}
    </div>
{:else}
    <div class="flex flex-col">
        <button class="hover:bg-selected px-6 py-2 text-lg" 
            class:bg-selected={open} 
            onclick={() => {
                open = !open
            }}
            aria-label={ariaLabel || `Toggle ${name}`}
            aria-expanded={open}
        >{name}</button>
        {#if open}
            <div class="flex flex-col bg-darkbg">
                {@render children?.()}
            </div>
        {/if}
    </div>
{/if}
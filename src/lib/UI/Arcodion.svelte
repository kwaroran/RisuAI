<script lang="ts">
    export let name = ""
    let open = false
</script>

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

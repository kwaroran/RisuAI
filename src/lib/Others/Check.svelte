<script lang="ts">
    import { CheckIcon } from "lucide-svelte";

    export let check = false
    export let onChange = (check) => {}
</script>

<label class="mr-2">
    <input type="checkbox" class="hidden" bind:checked={check} on:change={() => {
        onChange(check)
    }}>
    {#if check}
        <div class="w-6 h-6 bg-green-500 flex justify-center items-center text-sm">
            <CheckIcon />
        </div>
    {:else}
        <div class="w-6 h-6 bg-selected"></div>
    {/if}
</label>
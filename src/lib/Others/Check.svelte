<script lang="ts">
    import { CheckIcon } from "lucide-svelte";

    export let check = false
    export let onChange = (check) => {}
    export let margin = true
    export let name = ''
    export let hiddenName = false
</script>

<label title={name} class:mr-2={margin} class="flex relative">
    <input title={name} type="checkbox" class='absolute opacity-0 w-6 h-6' bind:checked={check} on:change={() => {
        onChange(check)
    }}/>
    {#if check}
        <div class="w-6 h-6 bg-green-500 flex justify-center items-center text-sm">
            <CheckIcon />
        </div>
    {:else}
        <div class="w-6 h-6 bg-selected flex justify-center items-center text-sm"/>
    {/if}
    {#if name != '' && !hiddenName}
        <span class="text-neutral-200 ml-2">{name}</span>
    {/if}
</label>

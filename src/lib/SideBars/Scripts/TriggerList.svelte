<script lang="ts">
    import type { triggerscript } from "src/ts/storage/database";
    import TriggerData from "./TriggerData.svelte";
    export let value:triggerscript[] = []
    let ele: HTMLDivElement
    let sorted = 0

</script>

<div class="contain w-full max-w-full mt-4 flex flex-col p-3 border-selected border-1 bg-darkbg rounded-md" bind:this={ele}>
    {#if value.length === 0}
            <div class="text-textcolor2">No Scripts</div>
    {/if}
    {#key sorted}
        {#each value as triggerscript, i}
            <TriggerData idx={i} bind:value={value[i]} onRemove={() => {
                let triggerscript = value
                triggerscript.splice(i, 1)
                value = triggerscript
            }}/>
        {/each}
    {/key}
</div>
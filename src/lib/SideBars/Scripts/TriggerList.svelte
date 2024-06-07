<script lang="ts">
    import type { triggerscript } from "src/ts/storage/database";
    import TriggerData from "./TriggerData.svelte";
    export let value:triggerscript[] = []
    export let lowLevelAble = false
    import Sortable from "sortablejs";
    import { sleep, sortableOptions } from "src/ts/util";
    import { onDestroy, onMount } from "svelte";
    let stb: Sortable = null
    let ele: HTMLDivElement
    let sorted = 0
    let opened = 0
    const createStb = () => {
        stb = Sortable.create(ele, {
            onEnd: async () => {
                let idx:number[] = []
                ele.querySelectorAll('[data-risu-idx2]').forEach((e, i) => {
                    idx.push(parseInt(e.getAttribute('data-risu-idx2')))
                })
                let newValue:triggerscript[] = []
                idx.forEach((i) => {
                    newValue.push(value[i])
                })
                value = newValue
                try {
                    stb.destroy()
                } catch (error) {}
                sorted += 1
                await sleep(1)
                createStb()
            },
            ...sortableOptions
        })
    }

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

    onMount(createStb)

    onDestroy(() => {
        if(stb){
            try {
                stb.destroy()
            } catch (error) {}
        }
    })

</script>

<div class="contain w-full max-w-full mt-2 flex flex-col p-3 border-selected border-1 bg-darkbg rounded-md" bind:this={ele}>
    {#if value.length === 0}
            <div class="text-textcolor2">No Scripts</div>
    {/if}
    {#key sorted}
        {#each value as triggerscript, i}
            <TriggerData idx={i} bind:value={value[i]} lowLevelAble={lowLevelAble} onOpen={onOpen} onClose={onClose} onRemove={() => {
                let triggerscript = value
                triggerscript.splice(i, 1)
                value = triggerscript
            }}/>
        {/each}
    {/key}
</div>
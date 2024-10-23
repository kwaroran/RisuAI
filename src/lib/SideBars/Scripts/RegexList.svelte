<script lang="ts">
    import type { customscript } from "src/ts/storage/database.svelte";
    import RegexData from "./RegexData.svelte";
    import Sortable from "sortablejs";
    import { sleep, sortableOptions } from "src/ts/util";
    import { onDestroy, onMount } from "svelte";
    interface Props {
        value?: customscript[];
    }

    let { value = $bindable([]) }: Props = $props();
    let stb: Sortable = null
    let ele: HTMLDivElement = $state()
    let sorted = $state(0)
    let opened = 0
    const createStb = () => {
        stb = Sortable.create(ele, {
            onEnd: async () => {
                let idx:number[] = []
                ele.querySelectorAll('[data-risu-idx]').forEach((e, i) => {
                    idx.push(parseInt(e.getAttribute('data-risu-idx')))
                })
                let newValue:customscript[] = []
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
        {#each value as customscript, i}
            <RegexData idx={i} bind:value={value[i]} onOpen={onOpen} onClose={onClose} onRemove={() => {
                let customscript = value
                customscript.splice(i, 1)
                value = customscript
            }}/>
        {/each}
    {/key}
</div>
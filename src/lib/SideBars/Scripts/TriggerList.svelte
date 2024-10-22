<script lang="ts">
  import { stopPropagation } from 'svelte/legacy';

    import type { triggerscript } from "src/ts/storage/database";
    import TriggerData from "./TriggerData.svelte";
    import Sortable from "sortablejs";
    import { sleep, sortableOptions } from "src/ts/util";
    import { onDestroy, onMount } from "svelte";
  import { language } from "src/lang";
  import { alertConfirm } from "src/ts/alert";
  import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
  import Button from "src/lib/UI/GUI/Button.svelte";
  import { openURL } from "src/ts/storage/globalApi";
  import { hubURL } from "src/ts/characterCards";
  import { PlusIcon } from "lucide-svelte";
  interface Props {
    value?: triggerscript[];
    lowLevelAble?: boolean;
  }

  let { value = $bindable([]), lowLevelAble = false }: Props = $props();
    let stb: Sortable = null
    let ele: HTMLDivElement = $state()
    let sorted = $state(0)
    let opened = 0
    const createStb = () => {
        if (!ele) {
            return;
        }
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

<div class="flex items-start mt-2 gap-2">
    <button class="bg-bgcolor py-1 rounded-md text-sm px-2" class:ring-1={
        value?.[0]?.effect?.[0]?.type !== 'triggercode' &&
        value?.[0]?.effect?.[0]?.type !== 'triggerlua'
    } onclick={stopPropagation(async () => {
        const codeType = value?.[0]?.effect?.[0]?.type
        if(codeType === 'triggercode' || codeType === 'triggerlua'){
            const codeTrigger = value?.[0]?.effect?.[0]?.code
            if(codeTrigger){
                const t = await alertConfirm(language.triggerSwitchWarn)
                if(!t){
                    return
                }
            }
            value = []
        }
    })}>{language.blockMode}</button>
    <button class="bg-bgcolor py-1 rounded-md text-sm px-2" class:ring-1={value?.[0]?.effect?.[0]?.type === 'triggerlua'} onclick={stopPropagation(async () => {
        if(value?.[0]?.effect?.[0]?.type !== 'triggerlua'){
            if(value && value.length > 0){
                const t = await alertConfirm(language.triggerSwitchWarn)
                if(!t){
                    return
                }
            }
            value = [{
                comment: "",
                type: "start",
                conditions: [],
                effect: [{
                    type: "triggerlua",
                    code: ""
                }]
            }]
        }
    })}>Lua</button>
</div>
{#if value?.[0]?.effect?.[0]?.type === 'triggerlua'}
    <TextAreaInput margin="both" autocomplete="off" bind:value={value[0].effect[0].code}></TextAreaInput>
    <Button onclick={() => {
        openURL(hubURL + '/redirect/docs/lua')
    }}>{language.helpBlock}</Button>
{:else}
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
    <button class="font-medium cursor-pointer hover:text-textcolor mb-2 text-textcolor2" onclick={() => {
        value.push({
            comment: "",
            type: "start",
            conditions: [],
            effect: []
        })
        value = value
    }}><PlusIcon /></button>
{/if}
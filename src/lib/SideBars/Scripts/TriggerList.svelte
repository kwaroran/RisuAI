<script lang="ts">

    import type { triggerscript } from "src/ts/storage/database.svelte";
    import TriggerData from "./TriggerData.svelte";
    import Sortable from "sortablejs";
    import { sleep, sortableOptions } from "src/ts/util";
    import { onDestroy, onMount } from "svelte";
    import { language } from "src/lang";
    import { alertConfirm } from "src/ts/alert";
    import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
    import Button from "src/lib/UI/GUI/Button.svelte";
    import { openURL } from "src/ts/globalApi.svelte";
    import { hubURL } from "src/ts/characterCards";
    import { PlusIcon } from "@lucide/svelte";
    import TriggerV2List from "./TriggerList2.svelte";
    import { DBState } from "src/ts/stores.svelte";
    interface Props {
        value?: triggerscript[];
        lowLevelAble?: boolean;
    }

    let { value = $bindable([]), lowLevelAble = false }: Props = $props();
    let stb: Sortable = null
    let ele: HTMLDivElement = $state()
    let sorted = $state(0)
    let v1Enabled = $derived(value?.[0]?.effect?.[0]?.type !== 'triggercode' && value?.[0]?.effect?.[0]?.type !== 'triggerlua' && value?.[0]?.effect?.[0]?.type !== 'v2Header')
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
    {#if v1Enabled || DBState.db.showDeprecatedTriggerV1 }
        <button class="bg-bgcolor py-1 rounded-md text-sm px-2" class:ring-1={v1Enabled} onclick={(async (e) => {
            e.stopPropagation()
            const codeType = value?.[0]?.effect?.[0]?.type
            if(codeType === 'triggercode' || codeType === 'triggerlua' || codeType === 'v2Header'){
                const t = await alertConfirm(language.triggerSwitchWarn)
                if(!t){
                    return
                }
                value = []
            }
        })}>V1</button>
    {/if}
    <button class="bg-bgcolor py-1 rounded-md text-sm px-2" class:ring-1={
        value?.[0]?.effect?.[0]?.type === 'v2Header'
    } onclick={(async (e) => {
        e.stopPropagation()
        const codeType = value?.[0]?.effect?.[0]?.type
        if(codeType !== 'v2Header'){
            const t = await alertConfirm(language.triggerSwitchWarn)
            if(!t){
                return
            }
            value = [{
                comment: "",
                type: "manual",
                conditions: [],
                effect: [{
                    type: "v2Header",
                    code: "",
                    indent: 0
                }]
            }, {
                comment: "New Event",
                type: 'manual',
                conditions: [],
                effect: []
            }]
        }
    })}>V2</button>
    <button class="bg-bgcolor py-1 rounded-md text-sm px-2" class:ring-1={value?.[0]?.effect?.[0]?.type === 'triggerlua'} onclick={(async (e) => {
        e.stopPropagation()
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
{#if v1Enabled}
    <span class="text-draculared">{language.triggerV1Warning}</span>
{/if}
{#if value?.[0]?.effect?.[0]?.type === 'triggerlua'}
    <TextAreaInput margin="both" autocomplete="off" bind:value={value[0].effect[0].code}></TextAreaInput>
    <Button onclick={() => {
        openURL(hubURL + '/redirect/docs/lua')
    }}>{language.helpBlock}</Button>
{:else if value?.[0]?.effect?.[0]?.type === 'v2Header'}
    <TriggerV2List bind:value={value} lowLevelAble={lowLevelAble}/>
{:else}
    {#key sorted}
        <div
            class="contain w-full max-w-full mt-2 flex flex-col border-selected border-1 bg-darkbg rounded-md p-3" bind:this={ele}
        >
            {#if value.length === 0}
                <div class="text-textcolor2">No Scripts</div>
            {/if}
            {#each value as triggerscript, i}
                <TriggerData idx={i} bind:value={value[i]} lowLevelAble={lowLevelAble} onOpen={onOpen} onClose={onClose} onRemove={() => {
                    let triggerscript = value
                    triggerscript.splice(i, 1)
                    value = triggerscript
                }}/>
            {/each}
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
    {/key}
{/if}
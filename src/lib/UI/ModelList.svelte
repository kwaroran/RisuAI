<script lang="ts">
    
    import { DBState } from 'src/ts/stores.svelte';
    import { getHordeModels } from "src/ts/horde/getModels";
    import Accordion from "./Accordion.svelte";
    import { language } from "src/lang";
    import CheckInput from "./GUI/CheckInput.svelte";
    import { getModelInfo, getModelList } from 'src/ts/model/modellist';
    import { ArrowLeft, Check, ChevronDown } from "@lucide/svelte";

    interface Props {
        value?: string;
        onChange?: (v:string) => void;
        onclick?: (event: MouseEvent & {
            currentTarget: EventTarget & HTMLDivElement;
        }) => any
        blankable?: boolean
        excludesPrefix?: string
        noMargin?: boolean
    }

    let { value = $bindable(""), onChange = (v) => {}, onclick, blankable, excludesPrefix, noMargin }: Props = $props();
    let openOptions = $state(false)

    function changeModel(name:string){
        value = name
        openOptions = false
        onChange(name)
    }
    let showUnrec = $state(false)
    let providers = $derived(getModelList({
        recommendedOnly: !showUnrec,
        groupedByProvider: true
    }))

    function isSelectableModel(model: { id: string }) {
        return !excludesPrefix || !model.id.startsWith(excludesPrefix)
    }

</script>

{#if openOptions}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="fixed top-0 w-full h-full left-0 bg-black/40 z-50 flex justify-center items-center p-4 backdrop-blur-sm" role="button" tabindex="0" onclick={() => {
        openOptions = false
    }}>
        <div class="w-96 max-w-full max-h-full overflow-hidden bg-bgcolor rounded-2xl border border-borderc/30 shadow-2xl flex flex-col" role="button" tabindex="0" onclick={(e)=>{
            e.stopPropagation()
            onclick?.(e)
        }}>
            <div class="flex items-center gap-2 px-3 pt-3 pb-1">
                <button
                    class="flex items-center justify-center p-1.5 rounded-lg hover:bg-selected transition-colors shrink-0 text-textcolor2 hover:text-textcolor"
                    onclick={() => {
                        openOptions = false
                    }}
                    title="Back"
                >
                    <ArrowLeft size={18} />
                </button>
                <h1 class="font-semibold text-lg flex-1 text-textcolor">{language.model}</h1>
            </div>

            <div class="model-list-scroll min-h-0 overflow-y-auto overflow-x-hidden mx-3 my-2 py-1 pr-1 flex flex-col gap-1">
                {#each providers as provider}
                    {#if provider.providerName === '@as-is'}
                        {#each provider.models as model}
                            <button class="flex items-center justify-between gap-2 hover:bg-selected/60 rounded-lg px-3 py-2 text-sm transition-colors text-left"
                                class:bg-selected={value === model.id}
                                onclick={() => {changeModel(model.id)}}>
                                <span class="truncate">{model.name}</span>
                                {#if value === model.id}
                                    <Check size={18} class="text-textcolor shrink-0" />
                                {/if}
                            </button>
                        {/each}
                    {:else}
                        <Accordion name={provider.providerName}>
                            {#each provider.models.filter(isSelectableModel) as model}
                                <button class="flex items-center justify-between gap-2 hover:bg-selected/60 rounded-lg px-3 py-2 text-sm transition-colors text-left"
                                    class:bg-selected={value === model.id}
                                    onclick={() => {changeModel(model.id)}}>
                                    <span class="truncate">{model.name}</span>
                                    {#if value === model.id}
                                        <Check size={18} class="text-textcolor shrink-0" />
                                    {/if}
                                </button>
                            {/each}
                        </Accordion>
                    {/if}
                {/each}
                <Accordion name="Horde">
                    {#await getHordeModels()}
                        <button class="p-2 text-sm text-textcolor2">Loading...</button>
                    {:then models}
                        <button onclick={() => {changeModel("horde:::" + 'auto')}} class="flex items-start justify-between gap-2 w-full p-2 hover:bg-selected/60 rounded-lg transition-colors text-left">
                            <span class="text-sm">Auto Model<br><span class="text-textcolor2 text-xs">Performace: Auto</span></span>
                            {#if value === "horde:::" + 'auto'}
                                <Check size={18} class="text-textcolor shrink-0" />
                            {/if}
                        </button>
                        {#each models as model}
                            <button onclick={() => {changeModel("horde:::" + model.name)}} class="flex items-start justify-between gap-2 w-full p-2 hover:bg-selected/60 rounded-lg transition-colors text-left">
                                <span class="text-sm">{model.name.trim()}<br><span class="text-textcolor2 text-xs">Performace: {model.performance.toFixed(1)}</span></span>
                                {#if value === "horde:::" + model.name}
                                    <Check size={18} class="text-textcolor shrink-0" />
                                {/if}
                            </button>
                        {/each}
                    {/await}
                </Accordion>

                {#if DBState?.db.customModels?.length > 0}
                    <Accordion name={language.customModels}>
                        {#each DBState.db.customModels as model}
                            <button class="flex items-center justify-between gap-2 hover:bg-selected/60 rounded-lg px-3 py-2 text-sm transition-colors text-left"
                                class:bg-selected={value === model.id}
                                onclick={() => {changeModel(model.id)}}>
                                <span class="truncate">{model.name ?? "Unnamed"}</span>
                                {#if value === model.id}
                                    <Check size={18} class="text-textcolor shrink-0" />
                                {/if}
                            </button>
                        {/each}
                    </Accordion>

                {/if}



                {#if blankable}
                    <button class="flex items-center justify-between gap-2 hover:bg-selected/60 rounded-lg px-3 py-2 text-sm transition-colors text-left"
                        class:bg-selected={value === ''}
                        onclick={() => {changeModel('')}}>
                        <span class="text-textcolor2">{language.none}</span>
                        {#if value === ''}
                            <Check size={18} class="text-textcolor shrink-0" />
                        {/if}
                    </button>
                {/if}
                <div class="text-textcolor2 text-xs pt-1">
                    <CheckInput name={language.showUnrecommended}  grayText bind:check={showUnrec}/>
                </div>
            </div>
        </div>
    </div>

{/if}

<button onclick={() => {openOptions = true}}
    class={{
        "p-2.5 flex justify-between items-center gap-2 w-full rounded-lg border text-textcolor border-borderc/40 bg-transparent hover:bg-selected/60 hover:border-borderc transition-colors duration-150 text-sm": true,
        "my-4": !noMargin,
    }}>
    <span class="truncate">{getModelInfo(value)?.fullName || language.none}</span>
    <ChevronDown size={16} class="text-textcolor2 shrink-0" />
</button>

<style>
    .model-list-scroll {
        scrollbar-width: thin;
        scrollbar-color: rgba(136, 136, 136, 0.5) transparent;
        scrollbar-gutter: stable;
    }

    .model-list-scroll::-webkit-scrollbar {
        width: 6px;
    }

    .model-list-scroll::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 999px;
    }

    .model-list-scroll::-webkit-scrollbar-thumb {
        background: rgba(136, 136, 136, 0.5);
        border-radius: 999px;
    }

    .model-list-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(85, 85, 85, 0.5);
    }
</style>

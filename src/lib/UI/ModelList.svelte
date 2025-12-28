<script lang="ts">
    
    import { DBState } from 'src/ts/stores.svelte';
    import { getHordeModels } from "src/ts/horde/getModels";
    import Arcodion from "./Arcodion.svelte";
    import { language } from "src/lang";
    import CheckInput from "./GUI/CheckInput.svelte";
    import { getModelInfo, getModelList } from 'src/ts/model/modellist';
    import { ArrowLeft } from "@lucide/svelte";

    interface Props {
        value?: string;
        onChange?: (v:string) => void;
        onclick?: (event: MouseEvent & {
            currentTarget: EventTarget & HTMLDivElement;
        }) => any
        blankable?: boolean
    }

    let { value = $bindable(""), onChange = (v) => {}, onclick, blankable }: Props = $props();
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
</script>

{#if openOptions}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="fixed top-0 w-full h-full left-0 bg-black/50 z-50 flex justify-center items-center" role="button" tabindex="0" onclick={() => {
        openOptions = false
    }}>
        <div class="w-96 max-w-full max-h-full overflow-y-auto overflow-x-hidden bg-bgcolor p-4 flex flex-col" role="button" tabindex="0" onclick={(e)=>{
            e.stopPropagation()
            onclick?.(e)
        }}>
            <div class="flex items-center gap-3 mb-4">
                <button 
                    class="flex items-center justify-center p-2 rounded-lg hover:bg-selected transition-colors shrink-0"
                    onclick={() => {
                        openOptions = false
                    }}
                    title="Back"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 class="font-bold text-xl flex-1">{language.model}</h1>
            </div>
            <div class="border-t-1 border-y-selected mb-2"></div>

            {#each providers as provider}
                {#if provider.providerName === '@as-is'}
                    {#each provider.models as model}
                        <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel(model.id)}}>{model.name}</button>
                    {/each}
                {:else}
                    <Arcodion name={provider.providerName}>
                        {#each provider.models as model}
                            <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel(model.id)}}>{model.name}</button>
                        {/each}
                    </Arcodion>
                {/if}
            {/each}
            <Arcodion name="Horde">
                {#await getHordeModels()}
                    <button class="p-2">Loading...</button>
                {:then models}
                    <button onclick={() => {changeModel("horde:::" + 'auto')}} class="p-2 hover:text-green-500">
                        Auto Model
                        <br><span class="text-textcolor2 text-sm">Performace: Auto</span>
                    </button>
                    {#each models as model}
                        <button onclick={() => {changeModel("horde:::" + model.name)}} class="p-2 hover:text-green-500">
                            {model.name.trim()}
                            <br><span class="text-textcolor2 text-sm">Performace: {model.performance.toFixed(1)}</span>
                        </button>
                    {/each}
                {/await}
            </Arcodion>

            {#if DBState?.db.customModels?.length > 0}
                <Arcodion name={language.customModels}>
                    {#each DBState.db.customModels as model}
                        <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel(model.id)}}>{model.name ?? "Unnamed"}</button>
                    {/each}
                </Arcodion>

            {/if}

            

            {#if blankable}
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('')}}>{language.none}</button>
            {/if}
            <div class="text-textcolor2 text-xs">
                <CheckInput name={language.showUnrecommended}  grayText bind:check={showUnrec}/>
            </div>
        </div>
    </div>

{/if}

<button onclick={() => {openOptions = true}}
    class="mt-4 drop-shadow-lg p-3 flex justify-center items-center ml-2 mr-2 rounded-lg bg-darkbutton mb-4 border-darkborderc border">
        {getModelInfo(value)?.fullName || language.none}
</button>


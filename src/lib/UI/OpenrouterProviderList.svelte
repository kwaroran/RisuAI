<script lang="ts">

    import { language } from "src/lang";
    import TextInput from "./GUI/TextInput.svelte";
    import { ArrowLeft } from "@lucide/svelte";

    interface Props {
        value?: string;
        options?: string[];
        onChange?: (v:string) => void;
        onclick?: (event: MouseEvent & {
            currentTarget: EventTarget & HTMLDivElement;
        }) => any
    }

    let { value = $bindable(""), options = [], onChange = (v) => {}, onclick }: Props = $props();
    let openOptions = $state(false)

    function changeModel(name:string){
        value = name
        openOptions = false
        onChange(name)
    }
    let custom = $state('')
    let providers = $derived(options)
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
                <h1 class="font-bold text-xl flex-1">{language.provider}</h1>
            </div>
            <div class="border-t-1 border-y-selected mb-2"></div>

            {#each providers as provider}
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel(provider)}}>{provider}</button>
            {/each}

            <TextInput bind:value={custom} onchange={() => {changeModel(custom)}}/>
        </div>
    </div>

{/if}

<button onclick={() => {openOptions = true}}
    class="mt-4 drop-shadow-lg p-3 flex justify-center items-center ml-2 mr-2 rounded-lg bg-darkbutton mb-4 border-darkborderc border">
        {value}
</button>


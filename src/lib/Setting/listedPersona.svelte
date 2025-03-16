<script lang="ts">
    import { XIcon } from "lucide-svelte";
    import { language } from "../../lang";
    
    import { DBState } from 'src/ts/stores.svelte';
    import { changeUserPersona } from "src/ts/persona";


    interface Props {
        close?: any;
    }

    let { close = () => {} }: Props = $props();

</script>

<div class="absolute w-full h-full z-40 bg-black bg-opacity-50 flex justify-center items-center">
    <div class="bg-darkbg p-4 break-any rounded-md flex flex-col max-w-3xl w-96 max-h-full overflow-y-auto">
        <div class="flex items-center text-textcolor mb-4">
            <h2 class="mt-0 mb-0">{language.persona}</h2>
            <div class="flex-grow flex justify-end">
                <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer items-center" onclick={close} aria-label="닫기">
                    <XIcon size={24}/>
                </button>
            </div>
        </div>
        {#each DBState.db.personas as persona, i}
            <button onclick={() => {
                changeUserPersona(i)
                close()
            }} class="flex items-center text-textcolor border-t-1 border-solid border-0 border-darkborderc p-2 cursor-pointer" class:bg-selected={i === DBState.db.selectedPersona} aria-label={`${persona.name} 페르소나 선택`}>
                <span>{persona.name}</span>
            </button>
        {/each}
    </div>
</div>

<style>
    .break-any{
        word-break: normal;
        overflow-wrap: anywhere;
    }
</style>
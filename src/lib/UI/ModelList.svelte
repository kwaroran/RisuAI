<script lang="ts">
    import { DataBase } from "src/ts/storage/database";
    import { getHordeModels } from "src/ts/horde/getModels";
    import Arcodion from "./Arcodion.svelte";
    import { language } from "src/lang";
    import Help from "../Others/Help.svelte";
    import CheckInput from "./GUI/CheckInput.svelte";
    import { isTauri } from "src/ts/storage/globalApi";
    import {open} from '@tauri-apps/api/dialog'
    import { getModelName } from "src/ts/model/names";

    export let value = ""
    export let onChange: (v:string) => void = (v) => {}
    let openOptions = false

    function changeModel(name:string){
        value = name
        openOptions = false
        onChange(name)
    }

    let showUnrec = false
</script>

{#if openOptions}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="fixed top-0 w-full h-full left-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" on:click={() => {
        openOptions = false
    }}>
        <div class="w-96 max-w-full max-h-full overflow-y-auto overflow-x-hidden bg-bgcolor p-4 flex flex-col" on:click|stopPropagation>
            <h1 class="font-bold text-xl">{language.model}
            </h1>
            <div class="border-t-1 border-y-selected mt-1 mb-1"></div>
            <Arcodion name="OpenAI GPT">
                <button class="p-2 hover:text-green-500" on:click={() => {changeModel('gpt35')}}>GPT-3.5 Turbo</button>
                <button class="p-2 hover:text-green-500" on:click={() => {changeModel('instructgpt35')}}>GPT-3.5 Instruct</button>
                <button class="p-2 hover:text-green-500" on:click={() => {changeModel('gpt4')}}>GPT-4</button>
                <button class="p-2 hover:text-green-500" on:click={() => {changeModel('gpt4_32k')}}>GPT-4 32K</button>
                <button class="p-2 hover:text-green-500" on:click={() => {changeModel('gpt4_0125')}}>GPT-4 Turbo 0125</button>
                <button class="p-2 hover:text-green-500" on:click={() => {changeModel('gptvi4_1106')}}>GPT-4 Turbo 1106 Vision</button>
                {#if showUnrec}
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('gpt35_16k')}}>GPT-3.5 Turbo 16K</button>
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('gpt4_0314')}}>GPT-4 0314</button>
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('gpt4_0613')}}>GPT-4 0613</button>
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('gpt4_32k_0613')}}>GPT-4 32K 0613</button>
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('gpt4_1106')}}>GPT-4 Turbo 1106</button>
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('gpt35_0125')}}>GPT-3.5 Turbo 0125</button>
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('gpt35_1106')}}>GPT-3.5 Turbo 1106</button>
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('gpt35_0613')}}>GPT-3.5 Turbo 0613</button>
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('gpt35_16k_0613')}}>GPT-3.5 Turbo 16K 0613</button>
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('gpt35_0301')}}>GPT-3.5 Turbo 0301</button>
                {/if}
            </Arcodion>
            <Arcodion name="Anthropic Claude">
                <button class="p-2 hover:text-green-500" on:click={() => {changeModel('claude-3-opus-20240229')}}>Claude 3 Opus (20240229)</button>
                <button class="p-2 hover:text-green-500" on:click={() => {changeModel('claude-3-sonnet-20240229')}}>Claude 3 Sonnet (20240229)</button>
                <button class="p-2 hover:text-green-500" on:click={() => {changeModel('claude-3-haiku-20240307')}}>Claude 3 Haiku (20240307)</button>
                {#if showUnrec}
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('claude-2.1')}}>claude-2.1</button>
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('claude-2')}}>claude-2</button>
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('claude-2-100k')}}>claude-2-100k</button>
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('claude-v1')}}>claude-v1</button>
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('claude-v1-100k')}}>claude-v1-100k</button>
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('claude-instant-v1')}}>claude-instant-v1</button>
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('claude-instant-v1-100k')}}>claude-instant-v1-100k</button>
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('claude-1.2')}}>claude-v1.2</button>
                    <button class="p-2 hover:text-green-500" on:click={() => {changeModel('claude-1.0')}}>claude-v1.0</button>
                {/if}
            </Arcodion>
            <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('reverse_proxy')}}>Reverse Proxy</button>
            {#if $DataBase.tpo && isTauri}
                <button class="hover:bg-selected px-6 py-2 text-lg" on:click={async () => {
                    const selected = await open({
                        filters: [{
                            name: 'Model File',
                            extensions: ['gguf']
                        }]
                    });
                    if(selected){
                        changeModel('local_' + selected)
                    }
                }}>Local GGUF Model <Help key="experimental"/> </button>
            {/if}
            <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('ooba')}}>Oobabooga</button>
            {#if showUnrec}
                <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('textgen_webui')}}>Oobabooga Legacy</button>
            {/if}
            <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('mancer')}}>Mancer</button>
            <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('openrouter')}}>OpenRouter</button>
            <Arcodion name="Mistral API">
                <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('mistral-small-latest')}}>Mistral Small</button>
                <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('mistral-medium-latest')}}>Mistral Medium</button>
                <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('mistral-large-latest')}}>Mistral Medium</button>
            </Arcodion>
            {#if showUnrec}
                <Arcodion name="Google Palm2">
                    <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('palm2')}}>Bison</button>
                    <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('palm2_unicorn')}}>Unicorn</button>
                </Arcodion>
                <Arcodion name="Google Gemini">
                    <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('gemini-pro')}}>Gemini Pro</button>
                    <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('gemini-pro-vision')}}>Gemini Pro Vision</button>
                    <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('gemini-ultra')}}>Gemini Ultra</button>
                    <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('gemini-ultra-vision')}}>Gemini Ultra Vision</button>
                </Arcodion>
                <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('kobold')}}>Kobold</button>
            {/if}
            <Arcodion name="Novellist">
                <button class="p-2 hover:text-green-500" on:click={() => {changeModel('novellist')}}>SuperTrin</button>
                <button class="p-2 hover:text-green-500" on:click={() => {changeModel('novellist_damsel')}}>Damsel</button>
            </Arcodion>
            <Arcodion name="NovelAI">
                <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('novelai')}}>NovelAI Clio</button>
                <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('novelai_kayra')}}>NovelAI Kayra</button>
            </Arcodion>
            <Arcodion name="Horde">
                {#await getHordeModels()}
                    <button class="p-2">Loading...</button>
                {:then models}
                    <button on:click={() => {changeModel("horde:::" + 'auto')}} class="p-2 hover:text-green-500">
                        Auto Model
                        <br><span class="text-textcolor2 text-sm">Performace: Auto</span>
                    </button>
                    {#each models as model}
                        <button on:click={() => {changeModel("horde:::" + model.name)}} class="p-2 hover:text-green-500">
                            {model.name.trim()}
                            <br><span class="text-textcolor2 text-sm">Performace: {model.performance.toFixed(1)}</span>
                        </button>
                    {/each}
                {/await}
            </Arcodion>
            {#if showUnrec}
            <Arcodion name="WebLLM Local">
                <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('hf:::Xenova/opt-350m')}}>opt-350m</button>
                <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('hf:::Xenova/tiny-random-mistral')}}>tiny-random-mistral</button>
                <button class="hover:bg-selected px-6 py-2 text-lg" on:click={() => {changeModel('hf:::Xenova/gpt2-large-conversational')}}>gpt2-large-conversational</button>
            </Arcodion>
            {/if}
            {#if $DataBase.plugins.length > 0}
                <button on:click={() => {changeModel('custom')}} class="hover:bg-selected px-6 py-2 text-lg" >Plugin</button>
            {/if}
            <div class="text-textcolor2 text-xs">
                <CheckInput name={language.showUnrecommended}  grayText bind:check={showUnrec}/>
            </div>
        </div>
    </div>

{/if}

<button on:click={() => {openOptions = true}}
    class="mt-4 drop-shadow-lg p-3 flex justify-center items-center ml-2 mr-2 rounded-lg bg-selected mb-4">
        {getModelName(value)}
</button>


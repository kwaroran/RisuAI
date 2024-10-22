<script lang="ts">
    import { stopPropagation } from 'svelte/legacy';
    import { DataBase } from "src/ts/storage/database";
    import { getHordeModels } from "src/ts/horde/getModels";
    import Arcodion from "./Arcodion.svelte";
    import { language } from "src/lang";
    import Help from "../Others/Help.svelte";
    import CheckInput from "./GUI/CheckInput.svelte";
    import { isTauri } from "src/ts/storage/globalApi";
    import {open} from '@tauri-apps/plugin-dialog'
    import { getModelName } from "src/ts/model/names";

    interface Props {
        value?: string;
        onChange?: (v:string) => void;
        onclick?: (event: MouseEvent & {
            currentTarget: EventTarget & HTMLDivElement;
        }) => any
    }

    let { value = $bindable(""), onChange = (v) => {}, onclick }: Props = $props();
    let openOptions = $state(false)

    function changeModel(name:string){
        value = name
        openOptions = false
        onChange(name)
    }

    let showUnrec = $state(false)
</script>

{#if openOptions}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="fixed top-0 w-full h-full left-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" role="button" tabindex="0" onclick={() => {
        openOptions = false
    }}>
        <div class="w-96 max-w-full max-h-full overflow-y-auto overflow-x-hidden bg-bgcolor p-4 flex flex-col" role="button" tabindex="0" onclick={(e)=>{
            e.stopPropagation()
            onclick?.(e)
        }}>
            <h1 class="font-bold text-xl">{language.model}
            </h1>
            <div class="border-t-1 border-y-selected mt-1 mb-1"></div>
            <Arcodion name="OpenAI GPT">
                <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt35')}}>GPT-3.5 Turbo</button>
                <button class="p-2 hover:text-green-500" onclick={() => {changeModel('instructgpt35')}}>GPT-3.5 Instruct</button>
                <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt4_turbo')}}>GPT-4 Turbo</button>
                <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt4o')}}>GPT-4o</button>
                <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt4om')}}>GPT-4o Mini</button>
                {#if showUnrec}
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt4')}}>GPT-4 (Old)</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt4_32k')}}>GPT-4 32K (Old)</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt35_16k')}}>GPT-3.5 Turbo 16K</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt4_0314')}}>GPT-4 0314</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt4_0613')}}>GPT-4 0613</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt4_32k_0613')}}>GPT-4 32K 0613</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt4_1106')}}>GPT-4 Turbo 1106</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt35_0125')}}>GPT-3.5 Turbo 0125</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt35_1106')}}>GPT-3.5 Turbo 1106</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt35_0613')}}>GPT-3.5 Turbo 0613</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt35_16k_0613')}}>GPT-3.5 Turbo 16K 0613</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt35_0301')}}>GPT-3.5 Turbo 0301</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt4_0125')}}>GPT-4 Turbo 0125</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gptvi4_1106')}}>GPT-4 Turbo 1106 Vision</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt4_turbo_20240409')}}>GPT-4 Turbo 20240409</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt4o-2024-05-13')}}>GPT-4o 20240513</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt4o-2024-08-06')}}>GPT-4o 20240806</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt4o-chatgpt')}}>GPT-4o ChatGPT</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt4o1-preview')}}>o1 Preview</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('gpt4o1-mini')}}>o1 Mini</button>
                {/if}
            </Arcodion>
            <Arcodion name="Anthropic Claude">
                <button class="p-2 hover:text-green-500" onclick={() => {changeModel('claude-3-5-sonnet-20240620')}}>Claude 3.5 Sonnet (20240620)</button>
                <button class="p-2 hover:text-green-500" onclick={() => {changeModel('claude-3-haiku-20240307')}}>Claude 3 Haiku (20240307)</button>
                {#if showUnrec}
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('claude-3-opus-20240229')}}>Claude 3 Opus (20240229)</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('claude-3-sonnet-20240229')}}>Claude 3 Sonnet (20240229)</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('claude-2.1')}}>claude-2.1</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('claude-2')}}>claude-2</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('claude-2-100k')}}>claude-2-100k</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('claude-v1')}}>claude-v1</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('claude-v1-100k')}}>claude-v1-100k</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('claude-instant-v1')}}>claude-instant-v1</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('claude-instant-v1-100k')}}>claude-instant-v1-100k</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('claude-1.2')}}>claude-v1.2</button>
                    <button class="p-2 hover:text-green-500" onclick={() => {changeModel('claude-1.0')}}>claude-v1.0</button>
                {/if}
            </Arcodion>
            <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('reverse_proxy')}}>Custom (OpenAI-compatible)</button>
            {#if $DataBase.tpo && isTauri}
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={async () => {
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
            <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('ooba')}}>Oobabooga</button>
            {#if showUnrec}
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('textgen_webui')}}>Oobabooga Legacy</button>
            {/if}
            <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('mancer')}}>Mancer</button>
            <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('openrouter')}}>OpenRouter</button>
            <Arcodion name="Mistral API">
                {#if showUnrec}
                    <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('mistral-small-latest')}}>Mistral Small</button>
                    <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('mistral-medium-latest')}}>Mistral Medium</button>
                {/if}
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('open-mistral-nemo')}}>Mistral Nemo</button>
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('mistral-large-latest')}}>Mistral Large</button>
            </Arcodion>
            <Arcodion name="Google Gemini">
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('gemini-1.5-pro-exp-0827')}}>Gemini Pro 1.5 0827</button>
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('gemini-1.5-pro-002')}}>Gemini Pro 1.5 002</button>
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('gemini-1.5-pro-latest')}}>Gemini Pro 1.5</button>
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('gemini-1.5-flash')}}>Gemini Flash 1.5</button>
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('gemini-pro')}}>Gemini Pro</button>
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('gemini-pro-vision')}}>Gemini Pro Vision</button>
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('gemini-ultra')}}>Gemini Ultra</button>
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('gemini-ultra-vision')}}>Gemini Ultra Vision</button>
            </Arcodion>
            {#if showUnrec}
                <Arcodion name="Google Palm2">
                    <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('palm2')}}>Bison</button>
                    <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('palm2_unicorn')}}>Unicorn</button>
                </Arcodion>
            {/if}
            <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('kobold')}}>Kobold</button>
            <Arcodion name="Novellist">
                <button class="p-2 hover:text-green-500" onclick={() => {changeModel('novellist')}}>SuperTrin</button>
                <button class="p-2 hover:text-green-500" onclick={() => {changeModel('novellist_damsel')}}>Damsel</button>
            </Arcodion>
            <Arcodion name="Cohere">
                <button class="p-2 hover:text-green-500" onclick={() => {changeModel('cohere-command-r')}}>Command R</button>
                <button class="p-2 hover:text-green-500" onclick={() => {changeModel('cohere-command-r-plus')}}>Command R Plus</button>
                <button class="p-2 hover:text-green-500" onclick={() => {changeModel('cohere-command-r-08-2024')}}>Command R 08-2024</button>
                <button class="p-2 hover:text-green-500" onclick={() => {changeModel('cohere-command-r-03-2024')}}>Command R 03-2024</button>         
                <button class="p-2 hover:text-green-500" onclick={() => {changeModel('cohere-command-r-plus-08-2024')}}>Command R Plus 08-2024</button>
                <button class="p-2 hover:text-green-500" onclick={() => {changeModel('cohere-command-r-plus-04-2024')}}>Command R Plus 04-2024</button>
            </Arcodion>
            <Arcodion name="NovelAI">
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('novelai')}}>NovelAI Clio</button>
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('novelai_kayra')}}>NovelAI Kayra</button>
            </Arcodion>
            <Arcodion name="AI21">
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('jamba-1.5-large')}}>Jamba 1.5 Large</button>
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('jamba-1.5-medium')}}>Jamba 1.5 Medium</button>
            </Arcodion>
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
            <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('ollama-hosted')}}>OLlama</button>
            {#if showUnrec}
            <Arcodion name="WebLLM Local">
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('hf:::Xenova/opt-350m')}}>opt-350m</button>
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('hf:::Xenova/tiny-random-mistral')}}>tiny-random-mistral</button>
                <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('hf:::Xenova/gpt2-large-conversational')}}>gpt2-large-conversational</button>
            </Arcodion>
            <button class="hover:bg-selected px-6 py-2 text-lg" onclick={() => {changeModel('risullm-proto')}}>RisuAI LLM (Prototype)</button>
            {/if}
            {#if $DataBase.plugins.length > 0}
                <button onclick={() => {changeModel('custom')}} class="hover:bg-selected px-6 py-2 text-lg" >Plugin</button>
            {/if}
            <div class="text-textcolor2 text-xs">
                <CheckInput name={language.showUnrecommended}  grayText bind:check={showUnrec}/>
            </div>
        </div>
    </div>

{/if}

<button onclick={() => {openOptions = true}}
    class="mt-4 drop-shadow-lg p-3 flex justify-center items-center ml-2 mr-2 rounded-lg bg-darkbutton mb-4 border-darkborderc border">
        {getModelName(value)}
</button>


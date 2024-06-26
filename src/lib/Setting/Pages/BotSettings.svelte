<script lang="ts">
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import { language } from "src/lang";
    import Help from "src/lib/Others/Help.svelte";
    import { DataBase } from "src/ts/storage/database";
    import { customProviderStore, getCurrentPluginMax } from "src/ts/plugins/plugins";
    import { getModelMaxContext, isTauri } from "src/ts/storage/globalApi";
    import { tokenize, tokenizeAccurate, tokenizerList } from "src/ts/tokenizer";
    import ModelList from "src/lib/UI/ModelList.svelte";
    import DropList from "src/lib/SideBars/DropList.svelte";
    import { PlusIcon, TrashIcon } from "lucide-svelte";
    import { onDestroy } from "svelte";
    import { recommendedPresetExist, setRecommended } from "src/ts/process/templates/getRecomended";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import NumberInput from "src/lib/UI/GUI/NumberInput.svelte";
    import SliderInput from "src/lib/UI/GUI/SliderInput.svelte";
    import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
    import Button from "src/lib/UI/GUI/Button.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import { openRouterModels } from "src/ts/model/openrouter";
    import { novelLogin } from "src/ts/process/models/nai";
    import { alertConfirm } from "src/ts/alert";
    import OobaSettings from "./OobaSettings.svelte";
    import Arcodion from "src/lib/UI/Arcodion.svelte";
    import { startsWith } from "lodash";
    import OpenrouterSettings from "./OpenrouterSettings.svelte";
    import ChatFormatSettings from "./ChatFormatSettings.svelte";

    let tokens = {
        mainPrompt: 0,
        jailbreak: 0,
        globalNote: 0,
        autoSuggest: 0
    }

    let lasttokens = {
        mainPrompt: '',
        jailbreak: '',
        globalNote: '',
        autoSuggest: ''
    }
    export let openPresetList =false
    export let goPromptTemplate = () => {}

    async function loadTokenize(){
        tokens.mainPrompt = await tokenizeAccurate($DataBase.mainPrompt, true)
        tokens.jailbreak = await tokenizeAccurate($DataBase.jailbreak, true)
        tokens.globalNote = await tokenizeAccurate($DataBase.globalNote, true)
        tokens.autoSuggest = await tokenizeAccurate($DataBase.autoSuggestPrompt, true)
    }

    let advancedBotSettings = false
    const unsub = DataBase.subscribe(db => {
        if(db.advancedBotSettings !== advancedBotSettings){
            advancedBotSettings = db.advancedBotSettings
        }
        loadTokenize()
    })

    onDestroy(() => {
        unsub()
    })

    $: if($DataBase.aiModel === 'textgen_webui' || $DataBase.subModel === 'mancer'){
        $DataBase.useStreaming = $DataBase.textgenWebUIStreamURL.startsWith("wss://")
    }
</script>

<h2 class="mb-2 text-2xl font-bold mt-2">{language.chatBot}</h2>
<div class="flex w-full mb-4">
    <button on:click={() => {
        $DataBase.advancedBotSettings = false
    }} class="flex-1 border-solid  p-2 flex justify-center cursor-pointer rounded-l-lg bg-darkbg" class:bg-selected={!$DataBase.advancedBotSettings}>
        <span>{language.simple}</span>
    </button>
    <button on:click={() => {
        $DataBase.advancedBotSettings = true
    }} class="flex-1 border-solid border-l-transparent p-2 flex justify-center cursor-pointer rounded-r-lg bg-darkbg" class:bg-selected={$DataBase.advancedBotSettings}>
        <span>{language.advanced}</span>
    </button>
</div>
{#if advancedBotSettings}
    <span class="text-textcolor mt-4">{language.model} <Help key="model"/></span>
    <ModelList bind:value={$DataBase.aiModel}/>

    <span class="text-textcolor mt-2">{language.submodel} <Help key="submodel"/></span>
    <ModelList bind:value={$DataBase.subModel}/>
{:else}
    <span class="text-textcolor mt-4">{language.model} <Help key="model"/></span>
    <ModelList bind:value={$DataBase.aiModel} onChange={(v) => {
        $DataBase.subModel = v
        if(v.startsWith('gpt') || v.startsWith('palm2')){
            $DataBase.maxContext = 4000
            $DataBase.maxResponse = 500
        }
        else if(v.startsWith('claude')){
            $DataBase.maxContext = 7500
            $DataBase.maxResponse = 500
            if(v.endsWith('100k')){
                $DataBase.maxContext = 99000
            }
        }
        else{
            $DataBase.maxContext = 1500
            $DataBase.maxResponse = 200
            if(v.startsWith('horde')){
                $DataBase.maxResponse = 100
            }
        }
        setRecommended(v, 'force')
    }}/>

{/if}

{#if advancedBotSettings && recommendedPresetExist($DataBase.aiModel)}
    <div>
        <Button size="sm" className="mb-2" on:click={() => {setRecommended($DataBase.aiModel, 'ask')}}>{language.recommendedPreset}</Button>
    </div>
{/if}
{#if $DataBase.aiModel.startsWith('palm2') || $DataBase.subModel.startsWith('palm2') || $DataBase.aiModel.startsWith('gemini') || $DataBase.subModel.startsWith('gemini')}
    <span class="text-textcolor">
        {#if $DataBase.google.projectId === 'aigoogle'}
            GoogleAI API Key
        {:else}
            Google Bearer Token
        {/if}
    </span>
    <TextInput marginBottom={true} size={"sm"} placeholder="..." hideText bind:value={$DataBase.google.accessToken}/>

    {#if $DataBase.google.projectId !== 'aigoogle'}
        <span class="text-textcolor">Google Project ID</span>
        <TextInput marginBottom={true} size={"sm"} placeholder="..." hideText bind:value={$DataBase.google.projectId}/>
    {/if}

    <Check check={$DataBase.google.projectId !== 'aigoogle'} className="mb-2" name={'Use Vertex AI'} onChange={(v) => {
        if(!v){
            $DataBase.google.projectId = 'aigoogle'
        }
        else{
            $DataBase.google.projectId = ''
        }
    }}/>
{/if}
{#if $DataBase.aiModel.startsWith('novellist') || $DataBase.subModel.startsWith('novellist')}
    <span class="text-textcolor">NovelList {language.apiKey}</span>
    <TextInput hideText marginBottom={true} size={"sm"} placeholder="..." bind:value={$DataBase.novellistAPI}/>
{/if}
{#if $DataBase.aiModel.startsWith('mancer') || $DataBase.subModel.startsWith('mancer')}
    <span class="text-textcolor">Mancer {language.apiKey}</span>
    <TextInput hideText marginBottom={true} size={"sm"} placeholder="..." bind:value={$DataBase.mancerHeader}/>
{/if}
{#if $DataBase.aiModel.startsWith('claude-') || $DataBase.subModel.startsWith('claude-')}
    <span class="text-textcolor">Claude {language.apiKey}</span>
    <TextInput hideText marginBottom={true} size={"sm"} placeholder="..." bind:value={$DataBase.claudeAPIKey}/>
    {#if $DataBase.useExperimental}
        <Check name="AWS Claude" bind:check={$DataBase.claudeAws}> <Help key="experimental" /></Check>
    {/if}
{/if}
{#if $DataBase.aiModel.startsWith('mistral') || $DataBase.subModel.startsWith('mistral')}
    <span class="text-textcolor">Mistral {language.apiKey}</span>
    <TextInput hideText marginBottom={true} size={"sm"} placeholder="..." bind:value={$DataBase.mistralKey}/>
{/if}
{#if $DataBase.aiModel === 'reverse_proxy' || $DataBase.subModel === 'reverse_proxy'}
    <span class="text-textcolor mt-2">URL <Help key="forceUrl"/></span>
    <TextInput marginBottom={false} size={"sm"} bind:value={$DataBase.forceReplaceUrl} placeholder="https//..." />
    <span class="text-textcolor mt-4"> {language.proxyAPIKey}</span>
    <TextInput hideText marginBottom={false} size={"sm"} placeholder="leave it blank if it hasn't password" bind:value={$DataBase.proxyKey} />
    <span class="text-textcolor mt-4"> {language.proxyRequestModel}</span>
    <SelectInput className="mt-2" bind:value={$DataBase.proxyRequestModel}>
        <OptionInput value="">None</OptionInput>
        <OptionInput value="gpt35">GPT 3.5</OptionInput>
        <OptionInput value="gpt35_16k">GPT 3.5 16k</OptionInput>
        <OptionInput value="gpt4">GPT-4</OptionInput>
        <OptionInput value="gpt4o">GPT-4o</OptionInput>
        <OptionInput value="gpt4_32k">GPT-4 32k</OptionInput>
        <OptionInput value="gpt4_1106">GPT-4 Turbo 1106</OptionInput>
        <OptionInput value="gptvi4_1106">GPT-4 Turbo 1106 Vision</OptionInput>
        <OptionInput value="gpt35_0301">GPT-3.5 0301</OptionInput>
        <OptionInput value="gpt4_0301">GPT-4 0301</OptionInput>
        <OptionInput value="gpt35_0613">GPT-3.5 0613</OptionInput>
        <OptionInput value="gpt4_0613">GPT-4 0613</OptionInput>
        <OptionInput value="claude-2.1">claude-2.1</OptionInput>
        <OptionInput value="claude-2.0">claude-2.0</OptionInput>
        <OptionInput value="claude-2">claude-2</OptionInput>
        <OptionInput value="claude-v1.3">claude-v1.3</OptionInput>
        <OptionInput value="claude-v1.3-100k">claude-v1.3-100k</OptionInput>
        <OptionInput value="claude-v1.2">claude-v1.2</OptionInput>
        <OptionInput value="claude-instant-v1.1">claude-instant-v1.1</OptionInput>
        <OptionInput value="claude-instant-v1.1-100k">claude-instant-v1.1-100k</OptionInput>
        <OptionInput value="claude-3-opus-20240229">claude-3-opus-20240229</OptionInput>
        <OptionInput value="claude-3-sonnet-20240229">claude-3-sonnet-20240229</OptionInput>
        <OptionInput value="custom">Custom</OptionInput>
    </SelectInput>
    {#if $DataBase.proxyRequestModel === 'custom'}
        <TextInput marginBottom={true} size={"sm"} bind:value={$DataBase.customProxyRequestModel} placeholder="Name" />
    {:else}
        <div class="mb-4"></div>
    {/if}
    <div class="flex items-center mt-2 mb-4">
        <Check bind:check={$DataBase.reverseProxyOobaMode} name={`${language.reverseProxyOobaMode}`}/>
    </div>
{/if}
{#if $DataBase.aiModel.startsWith('risullm')}
    <span class="text-textcolor mt-4">Risu {language.apiKey}</span>
    <TextInput hideText marginBottom={false} size={"sm"} bind:value={$DataBase.proxyKey} />
{/if}
{#if $DataBase.aiModel.startsWith('cohere')}
    <span class="text-textcolor mt-4">Cohere {language.apiKey}</span>
    <TextInput hideText marginBottom={false} size={"sm"} bind:value={$DataBase.cohereAPIKey} />
{/if}
{#if $DataBase.aiModel === 'ollama-hosted'}
    <span class="text-textcolor mt-4">Ollama URL</span>
    <TextInput marginBottom={false} size={"sm"} bind:value={$DataBase.ollamaURL} />

    <span class="text-textcolor mt-4">Ollama Model</span>
    <TextInput marginBottom={false} size={"sm"} bind:value={$DataBase.ollamaModel} />
{/if}
{#if $DataBase.aiModel === 'openrouter' || $DataBase.subModel === 'openrouter'}
    <span class="text-textcolor mt-4">Openrouter Key</span>
    <TextInput hideText marginBottom={false} size={"sm"} bind:value={$DataBase.openrouterKey} />

    <span class="text-textcolor mt-4">Openrouter Model</span>
    {#await openRouterModels()}
        <SelectInput className="mt-2 mb-4" value="">
            <OptionInput value="">Loading..</OptionInput>
        </SelectInput>
    {:then m}
        <SelectInput className="mt-2 mb-4" bind:value={$DataBase.openrouterRequestModel}>
            {#if (!m) || (m.length === 0)}
                <OptionInput value="openai/gpt-3.5-turbo">GPT 3.5</OptionInput>
                <OptionInput value="openai/gpt-3.5-turbo-16k">GPT 3.5 16k</OptionInput>
                <OptionInput value="openai/gpt-4">GPT-4</OptionInput>
                <OptionInput value="openai/gpt-4-32k">GPT-4 32k</OptionInput>
                <OptionInput value="anthropic/claude-2">Claude 2</OptionInput>
                <OptionInput value="anthropic/claude-instant-v1">Claude Instant v1</OptionInput>
                <OptionInput value="anthropic/claude-instant-v1-100k">Claude Instant v1 100k</OptionInput>
                <OptionInput value="anthropic/claude-v1">Claude v1</OptionInput>
                <OptionInput value="anthropic/claude-v1-100k">Claude v1 100k</OptionInput>
                <OptionInput value="anthropic/claude-1.2">Claude v1.2</OptionInput>
            {:else}
                <OptionInput value={"risu/free"}>Free Auto</OptionInput>
                <OptionInput value={"openrouter/auto"}>Openrouter Auto</OptionInput>
                {#each m as model}
                    <OptionInput value={model.id}>{model.name}</OptionInput>
                {/each}
            {/if}
        </SelectInput>
    {/await}
{/if}
{#if $DataBase.aiModel === 'openrouter' || $DataBase.aiModel === 'reverse_proxy'}
    <span class="text-textcolor">{language.tokenizer}</span>
    <SelectInput bind:value={$DataBase.customTokenizer}>
        {#each tokenizerList as entry}
            <OptionInput value={entry[0]}>{entry[1]}</OptionInput>
        {/each}
    </SelectInput>
{/if}
{#if $DataBase.aiModel.startsWith('gpt') || $DataBase.subModel.startsWith('gpt')
    || $DataBase.aiModel.startsWith('instructgpt') || $DataBase.subModel.startsWith('instructgpt')}
    <span class="text-textcolor">OpenAI {language.apiKey} <Help key="oaiapikey"/></span>
    <TextInput hideText marginBottom={false} size={"sm"} bind:value={$DataBase.openAIKey} placeholder="sk-XXXXXXXXXXXXXXXXXXXX"/>

{/if}
{#if $DataBase.aiModel.startsWith('gpt') || $DataBase.aiModel === 'reverse_proxy' || $DataBase.aiModel === 'openrouter' || $DataBase.aiModel.startsWith('claude-3')}
    <div class="flex items-center mt-2 mb-4">
        <Check bind:check={$DataBase.useStreaming} name={`Response ${language.streaming}`}/>
    </div>
{/if}

{#if $DataBase.aiModel === 'custom' || $DataBase.subModel === 'custom'}
    <span class="text-textcolor mt-2">{language.plugin}</span>
    <SelectInput className="mt-2 mb-4" bind:value={$DataBase.currentPluginProvider}>
        <OptionInput value="">None</OptionInput>
        {#each $customProviderStore as plugin}
            <OptionInput value={plugin}>{plugin}</OptionInput>
        {/each}
    </SelectInput>
{/if}
{#if $DataBase.aiModel === "novelai" || $DataBase.subModel === "novelai" || $DataBase.aiModel === 'novelai_kayra' || $DataBase.subModel === 'novelai_kayra'}

    <span class="text-textcolor">NovelAI Bearer Token</span>
    <TextInput bind:value={$DataBase.novelai.token}/>

    <div class="flex items-center mt-2">
        <Check bind:check={$DataBase.NAIadventure} name={language.textAdventureNAI}/>
    </div>

    <div class="flex items-center mt-2 mb-4">
        <Check bind:check={$DataBase.NAIappendName} name={language.appendNameNAI}/>
    </div>
{/if}

{#if $DataBase.aiModel === "kobold" || $DataBase.subModel === "kobold"}
    <span class="text-textcolor">Kobold URL</span>
    <TextInput marginBottom={true} bind:value={$DataBase.koboldURL} />

{/if}


{#if $DataBase.aiModel.startsWith("horde") || $DataBase.subModel.startsWith("horde") }
    <span class="text-textcolor">Horde {language.apiKey}</span>
    <TextInput hideText marginBottom={true} bind:value={$DataBase.hordeConfig.apiKey} />

{/if}
{#if $DataBase.aiModel === 'textgen_webui' || $DataBase.subModel === 'textgen_webui'
    || $DataBase.aiModel === 'mancer' || $DataBase.subModel === 'mancer'}
    <span class="text-textcolor mt-2">Blocking {language.providerURL}</span>
    <TextInput marginBottom={true} bind:value={$DataBase.textgenWebUIBlockingURL} placeholder="https://..."/>
    <span class="text-draculared text-xs mb-2">You must use textgen webui with --public-api</span>
    <span class="text-textcolor mt-2">Stream {language.providerURL}</span>
    <TextInput marginBottom={true} bind:value={$DataBase.textgenWebUIStreamURL} placeholder="wss://..."/>
    {#if !isTauri}
        <span class="text-draculared text-xs mb-2">You are using web version. you must use ngrok or other tunnels to use your local webui.</span>
    {/if}
    <span class="text-draculared text-xs mb-2">Warning: For Ooba version over 1.7, use "Ooba" as model, and use url like http://127.0.0.1:5000/v1/chat/completions</span>
{/if}
{#if $DataBase.aiModel === 'ooba' || $DataBase.subModel === 'ooba'}
    <span class="text-textcolor mt-2">Ooba {language.providerURL}</span>
    <TextInput marginBottom={true} bind:value={$DataBase.textgenWebUIBlockingURL} placeholder="https://..."/>
{/if}
{#if advancedBotSettings}
    {#if !$DataBase.promptTemplate}
        <span class="text-textcolor">{language.mainPrompt} <Help key="mainprompt"/></span>
        <TextAreaInput fullwidth autocomplete="off" height={"32"} bind:value={$DataBase.mainPrompt}></TextAreaInput>
        <span class="text-textcolor2 mb-6 text-sm mt-2">{tokens.mainPrompt} {language.tokens}</span>
        <span class="text-textcolor">{language.jailbreakPrompt} <Help key="jailbreak"/></span>
        <TextAreaInput fullwidth autocomplete="off" height={"32"} bind:value={$DataBase.jailbreak}></TextAreaInput>
        <span class="text-textcolor2 mb-6 text-sm mt-2">{tokens.jailbreak} {language.tokens}</span>
        <span class="text-textcolor">{language.globalNote} <Help key="globalNote"/></span>
        <TextAreaInput fullwidth autocomplete="off" height={"32"} bind:value={$DataBase.globalNote}></TextAreaInput>
        <span class="text-textcolor2 mb-6 text-sm mt-2">{tokens.globalNote} {language.tokens}</span>
    {/if}    

    <span class="text-textcolor">{language.maxContextSize}</span>
    <NumberInput min={0} max={getModelMaxContext($DataBase.aiModel)} marginBottom={true} bind:value={$DataBase.maxContext}/>


    <span class="text-textcolor">{language.maxResponseSize}</span>
    <NumberInput min={0} max={2048} marginBottom={true} bind:value={$DataBase.maxResponse}/>

{#if $DataBase.aiModel.startsWith('gpt') || $DataBase.aiModel === 'reverse_proxy' || $DataBase.aiModel === 'openrouter'}
<span class="text-textcolor">{language.seed}</span>

<NumberInput bind:value={$DataBase.generationSeed} marginBottom={true}/>
{/if}
<span class="text-textcolor">{language.temperature} <Help key="tempature"/></span>

{#if $DataBase.aiModel.startsWith("novelai")}
    <SliderInput min={0} max={250} bind:value={$DataBase.temperature}/>
{:else}
    <SliderInput min={0} max={200} bind:value={$DataBase.temperature}/>
{/if}
<span class="text-textcolor2 mb-6 text-sm">{($DataBase.temperature / 100).toFixed(2)}</span>

{#if $DataBase.aiModel.startsWith('openrouter') || $DataBase.aiModel.startsWith('claude-3') || $DataBase.aiModel.startsWith('cohere-')}
    <span class="text-textcolor">Top K</span>
    <SliderInput min={0} max={100} step={1} bind:value={$DataBase.top_k}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.top_k).toFixed(0)}</span>
{/if}
{#if $DataBase.aiModel.startsWith('openrouter')}
    <span class="text-textcolor">Repetition penalty</span>
    <SliderInput min={0} max={2} step={0.01} bind:value={$DataBase.repetition_penalty}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.repetition_penalty).toFixed(2)}</span>

    <span class="text-textcolor">Min P</span>
    <SliderInput min={0} max={1} step={0.01} bind:value={$DataBase.min_p}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.min_p).toFixed(2)}</span>

    <span class="text-textcolor">Top A</span>
    <SliderInput min={0} max={1} step={0.01} bind:value={$DataBase.top_a}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.top_a).toFixed(2)}</span>
{/if}
{#if $DataBase.aiModel === 'textgen_webui' || $DataBase.aiModel === 'mancer' || $DataBase.aiModel.startsWith('local_') || $DataBase.aiModel.startsWith('hf:::')}
    <span class="text-textcolor">Repetition Penalty</span>
    <SliderInput min={1} max={1.5} step={0.01} bind:value={$DataBase.ooba.repetition_penalty}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.ooba.repetition_penalty).toFixed(2)}</span>
    <span class="text-textcolor">Length Penalty</span>
    <SliderInput min={-5} max={5} step={0.05} bind:value={$DataBase.ooba.length_penalty}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.ooba.length_penalty).toFixed(2)}</span>
    <span class="text-textcolor">Top K</span>
    <SliderInput min={0} max={100} step={1} bind:value={$DataBase.ooba.top_k} />
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.ooba.top_k).toFixed(0)}</span>
    <span class="text-textcolor">Top P</span>
    <SliderInput min={0} max={1} step={0.01} bind:value={$DataBase.ooba.top_p}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.ooba.top_p).toFixed(2)}</span>
    <span class="text-textcolor">Typical P</span>
    <SliderInput min={0} max={1} step={0.01} bind:value={$DataBase.ooba.typical_p}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.ooba.typical_p).toFixed(2)}</span>
    <span class="text-textcolor">Top A</span>
    <SliderInput min={0} max={1} step={0.01} bind:value={$DataBase.ooba.top_a}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.ooba.top_a).toFixed(2)}</span>
    <span class="text-textcolor">No Repeat n-gram Size</span>
    <SliderInput min={0} max={20} step={1} bind:value={$DataBase.ooba.no_repeat_ngram_size}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.ooba.no_repeat_ngram_size).toFixed(0)}</span>
    <div class="flex items-center mt-4">
        <Check bind:check={$DataBase.ooba.do_sample} name={'Do Sample'}/>
    </div>
    <div class="flex items-center mt-4">
        <Check bind:check={$DataBase.ooba.add_bos_token} name={'Add BOS Token'}/>
    </div>
    <div class="flex items-center mt-4">
        <Check bind:check={$DataBase.ooba.ban_eos_token} name={'Ban EOS Token'}/>
    </div>
    <div class="flex items-center mt-4">
        <Check bind:check={$DataBase.ooba.skip_special_tokens} name={'Skip Special Tokens'}/>
    </div>
    <div class="flex items-center mt-4">
        <Check check={!!$DataBase.localStopStrings} name={language.customStopWords} onChange={() => {
            if(!$DataBase.localStopStrings){
                $DataBase.localStopStrings = []
            }
            else{
                $DataBase.localStopStrings = null
            }
        }} />
    </div>
    {#if $DataBase.localStopStrings}
        <div class="flex flex-col p-2 rounded border border-selected mt-2 gap-1">
            <div class="p-2">
                <button class="font-medium flex justify-center items-center h-full cursor-pointer hover:text-green-500 w-full" on:click={() => {
                    let localStopStrings = $DataBase.localStopStrings
                    localStopStrings.push('')
                    $DataBase.localStopStrings = localStopStrings
                }}><PlusIcon /></button>
            </div>
            {#each $DataBase.localStopStrings as stopString, i}
                <div class="flex w-full">
                    <div class="flex-grow">
                        <TextInput marginBottom bind:value={$DataBase.localStopStrings[i]} fullwidth fullh/>
                    </div>
                    <div>
                        <button class="font-medium flex justify-center items-center h-full cursor-pointer hover:text-green-500 w-full" on:click={() => {
                            let localStopStrings = $DataBase.localStopStrings
                            localStopStrings.splice(i, 1)
                            $DataBase.localStopStrings = localStopStrings
                        }}><TrashIcon /></button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
    <div class="flex flex-col p-3 rounded-md border-selected border mt-4">
        <ChatFormatSettings />
    </div>

    <span class="text-textcolor mt-2">{language.autoSuggest} <Help key="autoSuggest"/></span>
    <TextAreaInput fullwidth autocomplete="off" bind:value={$DataBase.autoSuggestPrompt} />
    <span class="text-textcolor2 mb-6 text-sm">{tokens.autoSuggest} {language.tokens}</span>

    <span class="text-textcolor">{language.autoSuggest} Prefix</span>
    <TextInput marginBottom={true} bind:value={$DataBase.autoSuggestPrefix} />

    <Check bind:check={$DataBase.autoSuggestClean} name={`${language.autoSuggest} suffix removal`}/>

    <Check bind:check={$DataBase.ooba.formating.useName} name={language.useNamePrefix}/>

{:else if $DataBase.aiModel.startsWith('novelai')}
    <div class="flex flex-col p-3 bg-darkbg mt-4">
        <span class="text-textcolor">Starter</span>
        <TextInput bind:value={$DataBase.NAIsettings.starter} placeholder={'⁂'} />
        <span class="text-textcolor">Seperator</span>
        <TextInput bind:value={$DataBase.NAIsettings.seperator} placeholder={"\\n"}/>
    </div>
    <span class="text-textcolor">Top P</span>
    <SliderInput min={0} max={1} step={0.01} bind:value={$DataBase.NAIsettings.topP}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.NAIsettings.topP).toFixed(2)}</span>
    <span class="text-textcolor">Top K</span>
    <SliderInput min={0} max={100} step={1} bind:value={$DataBase.NAIsettings.topK}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.NAIsettings.topK).toFixed(0)}</span>
    <span class="text-textcolor">Top A</span>
    <SliderInput min={0} max={1} step={0.01} bind:value={$DataBase.NAIsettings.topA}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.NAIsettings.topA).toFixed(2)}</span>
    <span class="text-textcolor">Tailfree Sampling</span>
    <SliderInput min={0} max={1} step={0.001} bind:value={$DataBase.NAIsettings.tailFreeSampling}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.NAIsettings.tailFreeSampling).toFixed(3)}</span>
    <span class="text-textcolor">Typical P</span>
    <SliderInput min={0} max={1} step={0.01} bind:value={$DataBase.NAIsettings.typicalp}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.NAIsettings.typicalp).toFixed(2)}</span>
    <span class="text-textcolor">Repetition Penalty</span>
    <SliderInput min={0} max={3} step={0.01} bind:value={$DataBase.NAIsettings.repetitionPenalty}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.NAIsettings.repetitionPenalty).toFixed(2)}</span>
    <span class="text-textcolor">Repetition Penalty Range</span>
    <SliderInput min={0} max={8192} step={1} bind:value={$DataBase.NAIsettings.repetitionPenaltyRange}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.NAIsettings.repetitionPenaltyRange).toFixed(0)}</span>
    <span class="text-textcolor">Repetition Penalty Slope</span>
    <SliderInput min={0} max={10} step={0.01} bind:value={$DataBase.NAIsettings.repetitionPenaltySlope}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.NAIsettings.repetitionPenaltySlope).toFixed(2)}</span>
    <span class="text-textcolor">Frequency Penalty</span>
    <SliderInput min={-2} max={2} step={0.01} bind:value={$DataBase.NAIsettings.frequencyPenalty}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.NAIsettings.frequencyPenalty).toFixed(2)}</span>
    <span class="text-textcolor">Presence Penalty</span>
    <SliderInput min={-2} max={2} step={0.01} bind:value={$DataBase.NAIsettings.presencePenalty}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.NAIsettings.presencePenalty).toFixed(2)}</span>
    <span class="text-textcolor">Mirostat LR</span>
    <SliderInput min={0} max={1} step={0.01} bind:value={$DataBase.NAIsettings.mirostat_lr}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.NAIsettings.mirostat_lr).toFixed(2)}</span>
    <span class="text-textcolor">Mirostat Tau</span>
    <SliderInput min={0} max={6} step={0.01} bind:value={$DataBase.NAIsettings.mirostat_tau}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.NAIsettings.mirostat_tau).toFixed(2)}</span>
    <span class="text-textcolor">Cfg Scale</span>
    <SliderInput min={1} max={3} step={0.01} bind:value={$DataBase.NAIsettings.cfg_scale}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.NAIsettings.cfg_scale).toFixed(2)}</span>

{:else if $DataBase.aiModel.startsWith('novellist')}
    <span class="text-textcolor">Top P</span>
    <SliderInput min={0} max={2} step={0.01} bind:value={$DataBase.ainconfig.top_p}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.ainconfig.top_p).toFixed(2)}</span>
    <span class="text-textcolor">Reputation Penalty</span>
    <SliderInput min={0} max={2} step={0.01} bind:value={$DataBase.ainconfig.rep_pen}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.ainconfig.rep_pen).toFixed(2)}</span>
    <span class="text-textcolor">Reputation Penalty Range</span>
    <SliderInput min={0} max={2048} step={1} bind:value={$DataBase.ainconfig.rep_pen_range}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.ainconfig.rep_pen_range).toFixed(2)}</span>
    <span class="text-textcolor">Reputation Penalty Slope</span>
    <SliderInput min={0} max={10} step={0.1} bind:value={$DataBase.ainconfig.rep_pen_slope}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.ainconfig.rep_pen_slope).toFixed(2)}</span>
    <span class="text-textcolor">Top K</span>
    <SliderInput min={1} max={500} step={1} bind:value={$DataBase.ainconfig.top_k}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.ainconfig.top_k).toFixed(2)}</span>
    <span class="text-textcolor">Top A</span>
    <SliderInput min={0} max={1} step={0.01} bind:value={$DataBase.ainconfig.top_a}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.ainconfig.top_a).toFixed(2)}</span>
    <span class="text-textcolor">Typical P</span>
    <SliderInput min={0} max={1} step={0.01} bind:value={$DataBase.ainconfig.typical_p}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.ainconfig.typical_p).toFixed(2)}</span>
{:else if $DataBase.aiModel.startsWith('claude')}
    <span class="text-textcolor">Top P <Help key="topP"/></span>
    <SliderInput min={0} max={1} step={0.01} bind:value={$DataBase.top_p}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.top_p).toFixed(2)}</span>
    <span class="text-textcolor mt-2">{language.autoSuggest} <Help key="autoSuggest"/></span>
    <TextAreaInput autocomplete="off" bind:value={$DataBase.autoSuggestPrompt} />
    <span class="text-textcolor2 mb-6 text-sm">{tokens.autoSuggest} {language.tokens}</span>
{:else}


    <span class="text-textcolor">Top P <Help key="topP"/></span>
    <SliderInput min={0} max={1} step={0.01} bind:value={$DataBase.top_p}/>
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.top_p).toFixed(2)}</span>

    <span class="text-textcolor">{language.frequencyPenalty} <Help key="frequencyPenalty"/></span>
    <SliderInput min={0} max={200} bind:value={$DataBase.frequencyPenalty} />
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.frequencyPenalty / 100).toFixed(2)}</span>
    <span class="text-textcolor">{language.presensePenalty} <Help key="presensePenalty"/></span>
    <SliderInput min={0} max={200} bind:value={$DataBase.PresensePenalty} />
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.PresensePenalty / 100).toFixed(2)}</span>

    <span class="text-textcolor mt-2">{language.autoSuggest} <Help key="autoSuggest"/></span>
    <TextAreaInput autocomplete="off" bind:value={$DataBase.autoSuggestPrompt} />
    <span class="text-textcolor2 mb-6 text-sm">{tokens.autoSuggest} {language.tokens}</span>
{/if}
{/if}

{#if ($DataBase.reverseProxyOobaMode && $DataBase.aiModel === 'reverse_proxy') || ($DataBase.aiModel === 'ooba')}
    <OobaSettings instructionMode={$DataBase.aiModel === 'ooba'} />
{/if}

{#if $DataBase.aiModel.startsWith('openrouter')}
    <OpenrouterSettings />
{/if}


{#if advancedBotSettings}
    {#if !$DataBase.promptTemplate}
        <span class="text-textcolor mb-2 mt-4">{language.formatingOrder} <Help key="formatOrder"/></span>
        <DropList bind:list={$DataBase.formatingOrder} />
    {/if}
    <Arcodion styled name="Bias " help="bias">
        <table class="contain w-full max-w-full tabler">
            <tr>
                <th class="font-medium">Bias</th>
                <th class="font-medium">{language.value}</th>
                <th>
                    <button class="font-medium cursor-pointer hover:text-green-500 w-full flex justify-center items-center" on:click={() => {
                        let bia = $DataBase.bias
                        bia.push(['', 0])
                        $DataBase.bias = bia
                    }}><PlusIcon /></button>
                </th>
            </tr>
            {#if $DataBase.bias.length === 0}
                <tr>
                    <div class="text-textcolor2">{language.noBias}</div>
                </tr>
            {/if}
            {#each $DataBase.bias as bias, i}
                <tr>
                    <td class="font-medium truncate">
                        <TextInput bind:value={$DataBase.bias[i][0]} size="lg" fullwidth/>
                    </td>
                    <td class="font-medium truncate">
                        <NumberInput bind:value={$DataBase.bias[i][1]} max={100} min={-101} size="lg" fullwidth/>
                    </td>
                    <td>
                        <button class="font-medium flex justify-center items-center h-full cursor-pointer hover:text-green-500 w-full" on:click={() => {
                            let bia = $DataBase.bias
                            bia.splice(i, 1)
                            $DataBase.bias = bia
                        }}><TrashIcon /></button>
                    </td>
                </tr>
            {/each}
        </table>
    </Arcodion>

    {#if $DataBase.aiModel === 'reverse_proxy'}
    <Arcodion styled name="{language.additionalParams} " help="additionalParams">
        <table class="contain w-full max-w-full tabler">
            <tr>
                <th class="font-medium">{language.key}</th>
                <th class="font-medium">{language.value}</th>
                <th>
                    <button class="font-medium cursor-pointer hover:text-green-500 w-full flex justify-center items-center" on:click={() => {
                        let additionalParams = $DataBase.additionalParams
                        additionalParams.push(['', ''])
                        $DataBase.additionalParams = additionalParams
                    }}><PlusIcon /></button>
                </th>
            </tr>
            {#if $DataBase.bias.length === 0}
                <tr>
                    <div class="text-textcolor2">{language.noData}</div>
                </tr>
            {/if}
            {#each $DataBase.additionalParams as additionalParams, i}
                <tr>
                    <td class="font-medium truncate">
                        <TextInput bind:value={$DataBase.additionalParams[i][0]} size="lg" fullwidth/>
                    </td>
                    <td class="font-medium truncate">
                        <TextInput bind:value={$DataBase.additionalParams[i][1]} size="lg" fullwidth/>
                    </td>
                    <td>
                        <button class="font-medium flex justify-center items-center h-full cursor-pointer hover:text-green-500 w-full" on:click={() => {
                            let additionalParams = $DataBase.additionalParams
                            additionalParams.splice(i, 1)
                            $DataBase.additionalParams = additionalParams
                        }}><TrashIcon /></button>
                    </td>
                </tr>
            {/each}
        </table>
    </Arcodion>
    {/if}


    {#if !$DataBase.promptTemplate}
        <div class="flex items-center mt-4">
            <Check bind:check={$DataBase.promptPreprocess} name={language.promptPreprocess}/>
        </div>
    {/if}
    <div class="flex items-center mt-4">
        {#if $DataBase.promptTemplate}
            <Check check={!!$DataBase.promptTemplate} name={language.usePromptTemplate} onChange={async ()=>{
                const conf = await alertConfirm(language.resetPromptTemplateConfirm)
                
                if(conf){
                    $DataBase.promptTemplate = undefined
                }
                else{
                    $DataBase.promptTemplate = $DataBase.promptTemplate
                }


            }}/>
        {:else}
            <Check check={false} name={language.usePromptTemplate} onChange={() => {
                $DataBase.promptTemplate = []
            }}/>
        {/if}
    </div>

    {#if ($DataBase.promptTemplate)}
        <div class="mt-2">
            <Button on:click={goPromptTemplate} size="sm">{language.promptTemplate}</Button>
        </div>
    {/if}
    <Button on:click={() => {openPresetList = true}} className="mt-4">{language.presets}</Button>

{/if}

<script lang="ts">
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import { language } from "src/lang";
    import Help from "src/lib/Others/Help.svelte";
    import { DataBase } from "src/ts/storage/database";
    import { customProviderStore, getCurrentPluginMax } from "src/ts/plugins/plugins";
    import { getModelMaxContext, isTauri } from "src/ts/storage/globalApi";
    import { tokenize } from "src/ts/tokenizer";
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
        tokens.mainPrompt = await tokenize($DataBase.mainPrompt)
        tokens.jailbreak = await tokenize($DataBase.jailbreak)
        tokens.globalNote = await tokenize($DataBase.globalNote)
        tokens.autoSuggest = await tokenize($DataBase.autoSuggestPrompt)
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
{#if $DataBase.aiModel === 'palm2' || $DataBase.subModel === 'palm2'}
    <span class="text-textcolor">Palm2 {language.apiKey}</span>
    <TextInput marginBottom={true} size={"sm"} placeholder="..." bind:value={$DataBase.palmAPI}/>
{/if}
{#if $DataBase.aiModel.startsWith('novellist') || $DataBase.subModel.startsWith('novellist')}
    <span class="text-textcolor">NovelList {language.apiKey}</span>
    <TextInput marginBottom={true} size={"sm"} placeholder="..." bind:value={$DataBase.novellistAPI}/>
{/if}
{#if $DataBase.aiModel.startsWith('mancer') || $DataBase.subModel.startsWith('mancer')}
    <span class="text-textcolor">Mancer {language.apiKey}</span>
    <TextInput marginBottom={true} size={"sm"} placeholder="..." bind:value={$DataBase.mancerHeader}/>
{/if}
{#if $DataBase.aiModel.startsWith('claude') || $DataBase.subModel.startsWith('claude')}
    <span class="text-textcolor">Claude {language.apiKey}</span>
    <TextInput marginBottom={true} size={"sm"} placeholder="..." bind:value={$DataBase.claudeAPIKey}/>
{/if}
{#if $DataBase.aiModel === 'reverse_proxy' || $DataBase.subModel === 'reverse_proxy'}
    <span class="text-textcolor mt-2">{language.forceReplaceUrl} URL <Help key="forceUrl"/></span>
    <TextInput marginBottom={false} size={"sm"} bind:value={$DataBase.forceReplaceUrl} placeholder="https//..." />
    <span class="text-textcolor mt-4"> {language.proxyAPIKey}</span>
    <TextInput marginBottom={false} size={"sm"} placeholder="leave it blank if it hasn't password" bind:value={$DataBase.proxyKey} />
    <span class="text-textcolor mt-4"> {language.proxyRequestModel}</span>
    <SelectInput className="mt-2 mb-4" bind:value={$DataBase.proxyRequestModel}>
        <OptionInput value="">None</OptionInput>
        <OptionInput value="gpt35">GPT 3.5</OptionInput>
        <OptionInput value="gpt35_16k">GPT 3.5 16k</OptionInput>
        <OptionInput value="gpt4">GPT-4</OptionInput>
        <OptionInput value="gpt4_32k">GPT-4 32k</OptionInput>
        <OptionInput value="gpt35_0301">GPT-3.5 0301</OptionInput>
        <OptionInput value="gpt4_0301">GPT-4 0301</OptionInput>
        <OptionInput value="claude-2">claude-2</OptionInput>
        <OptionInput value="claude-v1.3">claude-v1.3</OptionInput>
        <OptionInput value="claude-v1.3-100k">claude-v1.3-100k</OptionInput>
        <OptionInput value="claude-v1.2">claude-v1.2</OptionInput>
        <OptionInput value="claude-instant-v1.1">claude-instant-v1.1</OptionInput>
        <OptionInput value="claude-instant-v1.1-100k">claude-instant-v1.1-100k</OptionInput>
    </SelectInput>
{/if}
{#if $DataBase.aiModel === 'openrouter' || $DataBase.subModel === 'openrouter'}
    <span class="text-textcolor mt-4">Openrouter Key</span>
    <TextInput marginBottom={false} size={"sm"} bind:value={$DataBase.openrouterKey} />

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
                {#each m as model}
                    <OptionInput value={model}>{model}</OptionInput>
                {/each}
            {/if}
        </SelectInput>
    {/await}
{/if}
{#if $DataBase.aiModel.startsWith('gpt') || $DataBase.subModel.startsWith('gpt')}
    <span class="text-textcolor">OpenAI {language.apiKey} <Help key="oaiapikey"/></span>
    <TextInput marginBottom={false} size={"sm"} bind:value={$DataBase.openAIKey} placeholder="sk-XXXXXXXXXXXXXXXXXXXX"/>

{/if}
{#if $DataBase.aiModel.startsWith('gpt') || $DataBase.aiModel === 'reverse_proxy' || $DataBase.aiModel === 'openrouter'}
    <div class="flex items-center mt-2 mb-4">
        <Check bind:check={$DataBase.useStreaming} name={`Response ${language.streaming}`}/>
    </div>
{/if}

{#if $DataBase.aiModel === 'custom'}
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
    <TextInput marginBottom={true} bind:value={$DataBase.novelai.token}/>

    <!-- {#if !($DataBase.novelai.token)}
        <div class="mb-2">
            <Button on:click={novelLogin} size="sm">Login to NovelAI</Button>
        </div>
    {/if} -->
{/if}

{#if $DataBase.aiModel === "kobold" || $DataBase.subModel === "kobold"}
    <span class="text-textcolor">Kobold URL</span>
    <TextInput marginBottom={true} bind:value={$DataBase.koboldURL} />

{/if}


{#if $DataBase.aiModel.startsWith("horde") || $DataBase.subModel.startsWith("horde") }
    <span class="text-textcolor">Horde {language.apiKey}</span>
    <TextInput marginBottom={true} bind:value={$DataBase.hordeConfig.apiKey} />

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

<span class="text-textcolor">{language.temperature} <Help key="tempature"/></span>

{#if $DataBase.aiModel.startsWith("novelai")}
    <SliderInput min={0} max={250} bind:value={$DataBase.temperature}/>
{:else}
    <SliderInput min={0} max={200} bind:value={$DataBase.temperature}/>
{/if}
<span class="text-textcolor2 mb-6 text-sm">{($DataBase.temperature / 100).toFixed(2)}</span>

{#if $DataBase.aiModel === 'textgen_webui' || $DataBase.subModel === 'mancer'}
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
    <div class="flex flex-col p-3 bg-darkbg mt-4">
        <span class="text-textcolor">Header</span>
        <TextAreaInput fullwidth autocomplete="off" height={"24"} bind:value={$DataBase.ooba.formating.header} />
        <span class="text-textcolor">System Prefix</span>
        <TextAreaInput fullwidth autocomplete="off" height={"24"} bind:value={$DataBase.ooba.formating.systemPrefix} />
        <span class="text-textcolor">User Prefix</span>
        <TextAreaInput fullwidth autocomplete="off" height={"24"} bind:value={$DataBase.ooba.formating.userPrefix} />
        <span class="text-textcolor">Assistant Prefix</span>
        <TextAreaInput fullwidth autocomplete="off" height={"24"} bind:value={$DataBase.ooba.formating.assistantPrefix} />
        <span class="text-textcolor">Seperator</span>
        <TextAreaInput fullwidth autocomplete="off" height={"24"} bind:value={$DataBase.ooba.formating.seperator} />
    </div>

    <span class="text-textcolor mt-2">{language.autoSuggest} <Help key="autoSuggest"/></span>
    <TextAreaInput fullwidth autocomplete="off" height={"32"} bind:value={$DataBase.autoSuggestPrompt} />
    <span class="text-textcolor2 mb-6 text-sm">{tokens.autoSuggest} {language.tokens}</span>

    <span class="text-textcolor">{language.autoSuggest} Prefix</span>
    <TextInput marginBottom={true} bind:value={$DataBase.autoSuggestPrefix} />

    <Check bind:check={$DataBase.autoSuggestClean} name={`${language.autoSuggest} suffix removal`}/>
{:else if $DataBase.aiModel.startsWith('novelai')}
    <div class="flex flex-col p-3 bg-darkbg mt-4">
        <span class="text-textcolor">Starter</span>
        <TextInput bind:value={$DataBase.NAIsettings.starter} placeholder={'[conversation: start]\\n***'} />
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
{:else}
    <span class="text-textcolor">{language.frequencyPenalty} <Help key="frequencyPenalty"/></span>
    <SliderInput min={0} max={100} bind:value={$DataBase.frequencyPenalty} />
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.frequencyPenalty / 100).toFixed(2)}</span>
    <span class="text-textcolor">{language.presensePenalty} <Help key="presensePenalty"/></span>
    <SliderInput min={0} max={100} bind:value={$DataBase.PresensePenalty} />
    <span class="text-textcolor2 mb-6 text-sm">{($DataBase.PresensePenalty / 100).toFixed(2)}</span>

    <span class="text-textcolor mt-2">{language.autoSuggest} <Help key="autoSuggest"/></span>
    <TextAreaInput height="20" autocomplete="off" bind:value={$DataBase.autoSuggestPrompt} />
    <span class="text-textcolor2 mb-6 text-sm">{tokens.autoSuggest} {language.tokens}</span>
{/if}
{/if}



{#if advancedBotSettings}
    {#if !$DataBase.promptTemplate}
        <span class="text-textcolor mb-2 mt-4">{language.formatingOrder} <Help key="formatOrder"/></span>
        <DropList bind:list={$DataBase.formatingOrder} />
    {/if}
    <span class="text-textcolor mt-2">Bias <Help key="bias"/></span>
    <table class="contain w-full max-w-full tabler mt-2">
        <tr>
            <th class="font-medium w-1/2">Bias</th>
            <th class="font-medium w-1/3">{language.value}</th>
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
                <td class="font-medium truncate w-1/2">
                    <TextInput marginBottom bind:value={$DataBase.bias[i][0]} fullwidth fullh/>
                </td>
                <td class="font-medium truncate w-1/3">
                    <NumberInput marginBottom bind:value={$DataBase.bias[i][1]} max={100} min={-100} fullwidth fullh/>
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

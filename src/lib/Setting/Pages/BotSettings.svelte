<script lang="ts">
    import Check from "src/lib/Others/Check.svelte";
    import { language } from "src/lang";
    import Help from "src/lib/Others/Help.svelte";
    import { DataBase } from "src/ts/storage/database";
    import { customProviderStore, getCurrentPluginMax } from "src/ts/plugins/plugins";
    import { isTauri } from "src/ts/storage/globalApi";
    import { tokenize } from "src/ts/tokenizer";
    import ModelList from "src/lib/UI/ModelList.svelte";
    import DropList from "src/lib/SideBars/DropList.svelte";
    import { PlusIcon, TrashIcon } from "lucide-svelte";
    import { onDestroy } from "svelte";
  import { setRecommended } from "src/ts/process/templates/getRecomended";
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
    <span class="text-neutral-200 mt-4">{language.model} <Help key="model"/></span>
    <ModelList bind:value={$DataBase.aiModel} onChange={(v) => {
        setRecommended(v, 'ask')
    }}/>

    <span class="text-neutral-200 mt-2">{language.submodel} <Help key="submodel"/></span>
    <ModelList bind:value={$DataBase.subModel}/>
{:else}
    <span class="text-neutral-200 mt-4">{language.model} <Help key="model"/></span>
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

{#if $DataBase.aiModel === 'palm2' || $DataBase.subModel === 'palm2'}
    <span class="text-neutral-200">Palm2 {language.apiKey}</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" placeholder="..." bind:value={$DataBase.palmAPI}>
{/if}
{#if $DataBase.aiModel.startsWith('novellist') || $DataBase.subModel.startsWith('novellist')}
    <span class="text-neutral-200">NovelList {language.apiKey}</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" placeholder="..." bind:value={$DataBase.novellistAPI}>
{/if}

{#if $DataBase.aiModel.startsWith('claude') || $DataBase.subModel.startsWith('claude')}
    <span class="text-neutral-200">Claude {language.apiKey}</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" placeholder="..." bind:value={$DataBase.claudeAPIKey}>
{/if}
{#if $DataBase.aiModel === 'reverse_proxy' || $DataBase.subModel === 'reverse_proxy'}
    <span class="text-neutral-200 mt-2">{language.forceReplaceUrl} URL <Help key="forceUrl"/></span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected text-sm"bind:value={$DataBase.forceReplaceUrl} placeholder="https//...">
    <span class="text-neutral-200 mt-4"> {language.proxyAPIKey}</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected text-sm" placeholder="leave it blank if it hasn't password" bind:value={$DataBase.proxyKey}>
    <span class="text-neutral-200 mt-4"> {language.proxyRequestModel}</span>
    <select class="bg-transparent input-text mt-2 mb-4 text-gray-200 appearance-none text-sm" bind:value={$DataBase.proxyRequestModel}>
        <option value="" class="bg-darkbg appearance-none">None</option>
        <option value="gpt35" class="bg-darkbg appearance-none">GPT 3.5</option>
        <option value="gpt35_16k" class="bg-darkbg appearance-none">GPT 3.5 16k</option>
        <option value="gpt4" class="bg-darkbg appearance-none">GPT-4</option>
        <option value="gpt4_32k" class="bg-darkbg appearance-none">GPT-4 32k</option>
        <option value="gpt35_0301" class="bg-darkbg appearance-none">GPT-3.5 0301</option>
        <option value="gpt4_0301" class="bg-darkbg appearance-none">GPT-4 0301</option>
        <option value="gpt4_0613" class="bg-darkbg appearance-none">GPT-4 0613</option>
    </select>
{/if}
{#if $DataBase.aiModel === 'openrouter' || $DataBase.subModel === 'openrouter'}
    <span class="text-neutral-200 mt-4">Openrouter Key</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected text-sm" placeholder="leave it blank if it hasn't password" bind:value={$DataBase.openrouterKey}>
    <span class="text-neutral-200 mt-4">Openrouter Model</span>
    <select class="bg-transparent input-text mt-2 mb-4 text-gray-200 appearance-none text-sm" bind:value={$DataBase.openrouterRequestModel}>
        <option value="openai/gpt-3.5-turbo" class="bg-darkbg appearance-none">GPT 3.5</option>
        <option value="openai/gpt-3.5-turbo-16k" class="bg-darkbg appearance-none">GPT 3.5 16k</option>
        <option value="openai/gpt-4" class="bg-darkbg appearance-none">GPT-4</option>
        <option value="openai/gpt-4-32k" class="bg-darkbg appearance-none">GPT-4 32k</option>
        <option value="anthropic/claude-instant-v1" class="bg-darkbg appearance-none">Claude Instant v1</option>
        <option value="anthropic/claude-instant-v1-100k" class="bg-darkbg appearance-none">Claude Instant v1 100k</option>
        <option value="anthropic/claude-v1" class="bg-darkbg appearance-none">Claude v1</option>
        <option value="anthropic/claude-v1-100k" class="bg-darkbg appearance-none">Claude v1 100k</option>
    </select>
{/if}
{#if $DataBase.aiModel.startsWith('gpt') || $DataBase.subModel.startsWith('gpt')}
    <span class="text-neutral-200">OpenAI {language.apiKey} <Help key="oaiapikey"/></span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected text-sm" placeholder="sk-XXXXXXXXXXXXXXXXXXXX" bind:value={$DataBase.openAIKey}>
{/if}
{#if $DataBase.aiModel.startsWith('gpt') || $DataBase.aiModel === 'reverse_proxy' || $DataBase.aiModel === 'openrouter'}
    <div class="flex items-center mt-2 mb-4">
        <Check bind:check={$DataBase.useStreaming} name={`Response ${language.streaming}`}/>
    </div>
{/if}

{#if $DataBase.aiModel === 'custom'}
    <span class="text-neutral-200 mt-2">{language.plugin}</span>
    <select class="bg-transparent input-text mt-2 mb-4 text-gray-200 appearance-none text-sm" bind:value={$DataBase.currentPluginProvider}>
        <option value="" class="bg-darkbg appearance-none">None</option>
        {#each $customProviderStore as plugin}
            <option value={plugin} class="bg-darkbg appearance-none">{plugin}</option>
        {/each}
    </select>
{/if}
{#if $DataBase.aiModel === "novelai" || $DataBase.subModel === "novelai"}
    <span class="text-neutral-200">NovelAI Bearer Token</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected text-sm mb-2" bind:value={$DataBase.novelai.token}>

{/if}

{#if $DataBase.aiModel === "kobold" || $DataBase.subModel === "kobold"}
    <span class="text-neutral-200">Kobold URL</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected text-sm mb-2" bind:value={$DataBase.koboldURL}>
{/if}


{#if $DataBase.aiModel.startsWith("horde") || $DataBase.subModel.startsWith("horde") }
    <span class="text-neutral-200">Horde {language.apiKey}</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected text-sm mb-2" bind:value={$DataBase.hordeConfig.apiKey}>

{/if}
{#if $DataBase.aiModel === 'textgen_webui' || $DataBase.subModel === 'textgen_webui'}
    <span class="text-neutral-200">TextGen {language.providerURL} <Help key="oogaboogaURL"/></span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected" placeholder="https://..." bind:value={$DataBase.textgenWebUIURL}>
    <span class="text-draculared text-xs mb-2">You must use WebUI without agpl license or use unmodified version with agpl license to observe the contents of the agpl license.</span>
    <span class="text-draculared text-xs mb-2">You must use textgen webui with --no-stream and without --cai-chat or --chat</span>
    {#if !isTauri}
        <span class="text-draculared text-xs mb-2">You are using web version. you must use ngrok or other tunnels to use your local webui.</span>
    {/if}
{/if}
{#if advancedBotSettings}
    <span class="text-neutral-200">{language.mainPrompt} <Help key="mainprompt"/></span>
    <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 resize-none h-20 min-h-20 focus:bg-selected text-xs w-full" autocomplete="off" bind:value={$DataBase.mainPrompt}></textarea>
    <span class="text-gray-400 mb-6 text-sm">{tokens.mainPrompt} {language.tokens}</span>
    <span class="text-neutral-200">{language.jailbreakPrompt} <Help key="jailbreak"/></span>
    <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 resize-none h-20 min-h-20 focus:bg-selected text-xs w-full" autocomplete="off" bind:value={$DataBase.jailbreak}></textarea>
    <span class="text-gray-400 mb-6 text-sm">{tokens.jailbreak} {language.tokens}</span>
    <span class="text-neutral-200">{language.globalNote} <Help key="globalNote"/></span>
    <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 resize-none h-20 min-h-20 focus:bg-selected text-xs w-full" autocomplete="off" bind:value={$DataBase.globalNote}></textarea>
    <span class="text-gray-400 mb-6 text-sm">{tokens.globalNote} {language.tokens}</span>    

    <span class="text-neutral-200">{language.maxContextSize}</span>
{#if $DataBase.aiModel === 'gpt35'}
    <input class="text-neutral-200 mb-4 text-sm p-2 bg-transparent input-text focus:bg-selected" type="number" min={0} max="4000" bind:value={$DataBase.maxContext}>
{:else if $DataBase.aiModel === 'gpt35_16k' || $DataBase.aiModel === 'gpt35_16k_0613'}
    <input class="text-neutral-200 mb-4 text-sm p-2 bg-transparent input-text focus:bg-selected" type="number" min={0} max="16000" bind:value={$DataBase.maxContext}>
{:else if $DataBase.aiModel === 'gpt4'}
    <input class="text-neutral-200 mb-4 text-sm p-2 bg-transparent input-text focus:bg-selected" type="number" min={0} max="8000" bind:value={$DataBase.maxContext}>
{:else if $DataBase.aiModel === 'custom'}
    <input class="text-neutral-200 mb-4 text-sm p-2 bg-transparent input-text focus:bg-selected" type="number" min={0} max={getCurrentPluginMax($DataBase.currentPluginProvider)} bind:value={$DataBase.maxContext}>
{:else}
    <input class="text-neutral-200 mb-4 text-sm p-2 bg-transparent input-text focus:bg-selected" type="number" min={0} bind:value={$DataBase.maxContext}>
{/if}

<span class="text-neutral-200">{language.maxResponseSize}</span>
<input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="2048" bind:value={$DataBase.maxResponse}>
<span class="text-neutral-200">{language.temperature} <Help key="tempature"/></span>
<input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="200" bind:value={$DataBase.temperature}>
<span class="text-gray-400 mb-6 text-sm">{($DataBase.temperature / 100).toFixed(2)}</span>
{#if $DataBase.aiModel === 'textgen_webui'}
    <span class="text-neutral-200">Top K</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="2" step="0.01" bind:value={$DataBase.ooba.top_k}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.ooba.top_k).toFixed(2)}</span>
    <span class="text-neutral-200">Top P</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="2" step="0.01" bind:value={$DataBase.ooba.top_p}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.ooba.top_p).toFixed(2)}</span>
    <span class="text-neutral-200">Typical P</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="1" step="0.01" bind:value={$DataBase.ooba.typical_p}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.ooba.typical_p).toFixed(2)}</span>
    <span class="text-neutral-200">Top A</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="1" step="0.01" bind:value={$DataBase.ooba.top_a}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.ooba.top_a).toFixed(2)}</span>
    <span class="text-neutral-200">Tail Free Sampling</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="1" step="0.01" bind:value={$DataBase.ooba.tfs}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.ooba.tfs).toFixed(2)}</span>
    <span class="text-neutral-200">Epsilon Cutoff</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="9" step="0.01" bind:value={$DataBase.ooba.epsilon_cutoff}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.ooba.epsilon_cutoff).toFixed(2)}</span>
    <span class="text-neutral-200">Eta Cutoff</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="20" step="0.01" bind:value={$DataBase.ooba.eta_cutoff}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.ooba.eta_cutoff).toFixed(2)}</span>
    <span class="text-neutral-200">Number of Beams</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="1" max="20" step="1" bind:value={$DataBase.ooba.num_beams}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.ooba.num_beams).toFixed(2)}</span>
    <span class="text-neutral-200">Length Penalty</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min={-5} max="5" step="0.1" bind:value={$DataBase.ooba.length_penalty}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.ooba.length_penalty).toFixed(2)}</span>
    <span class="text-neutral-200">Penalty Alpha</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min={0} max="5" step="0.05" bind:value={$DataBase.ooba.penalty_alpha}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.ooba.penalty_alpha).toFixed(2)}</span>
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
        <Check bind:check={$DataBase.ooba.formating.custom} name={'Instruct Format'}/>
    </div>
    {#if $DataBase.ooba.formating.custom}
        <div class="flex flex-col p-3 bg-darkbg mt-4">
            <span class="text-neutral-200">User Prefix</span>
            <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected" bind:value={$DataBase.ooba.formating.userPrefix}>
            <span class="text-neutral-200">Assistant Prefix</span>
            <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected" bind:value={$DataBase.ooba.formating.assistantPrefix}>
            <span class="text-neutral-200">Seperator</span>
            <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected" bind:value={$DataBase.ooba.formating.seperator}>
        </div>
    {/if}
{:else if $DataBase.aiModel.startsWith('novellist')}
    <span class="text-neutral-200">Top P</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="2" step="0.01" bind:value={$DataBase.ainconfig.top_p}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.ainconfig.top_p).toFixed(2)}</span>
    <span class="text-neutral-200">Reputation Penalty</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="2" step="0.01" bind:value={$DataBase.ainconfig.rep_pen}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.ainconfig.rep_pen).toFixed(2)}</span>
    <span class="text-neutral-200">Reputation Penalty Range</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="2048" step="1" bind:value={$DataBase.ainconfig.rep_pen_range}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.ainconfig.rep_pen_range).toFixed(2)}</span>
    <span class="text-neutral-200">Reputation Penalty Slope</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="10" step="0.1" bind:value={$DataBase.ainconfig.rep_pen_slope}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.ainconfig.rep_pen_slope).toFixed(2)}</span>
    <span class="text-neutral-200">Top K</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="1" max="500" step="1" bind:value={$DataBase.ainconfig.top_k}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.ainconfig.top_k).toFixed(2)}</span>
    <span class="text-neutral-200">Top A</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="1" step="0.01" bind:value={$DataBase.ainconfig.top_a}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.ainconfig.top_a).toFixed(2)}</span>
    <span class="text-neutral-200">Typical P</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="1" step="0.01" bind:value={$DataBase.ainconfig.typical_p}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.ainconfig.typical_p).toFixed(2)}</span>
{:else}
    <span class="text-neutral-200">{language.frequencyPenalty} <Help key="frequencyPenalty"/></span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="100" bind:value={$DataBase.frequencyPenalty}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.frequencyPenalty / 100).toFixed(2)}</span>
    <span class="text-neutral-200">{language.presensePenalty} <Help key="presensePenalty"/></span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="100" bind:value={$DataBase.PresensePenalty}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.PresensePenalty / 100).toFixed(2)}</span>

    <span class="text-neutral-200 mt-2">{language.autoSuggest} <Help key="autoSuggest"/></span>
    <textarea class="bg-transparent input-text mb-2 text-gray-200 resize-none h-20 min-h-20 focus:bg-selected text-xs w-full" autocomplete="off" bind:value={$DataBase.autoSuggestPrompt}></textarea>
    <span class="text-gray-400 mb-6 text-sm">{tokens.autoSuggest} {language.tokens}</span>
{/if}
{/if}



{#if advancedBotSettings}
    <span class="text-neutral-200 mb-2 mt-4">{language.formatingOrder} <Help key="formatOrder"/></span>
    <DropList bind:list={$DataBase.formatingOrder} />
    <span class="text-neutral-200 mt-2">Bias <Help key="bias"/></span>
    <table class="contain w-full max-w-full tabler mt-2">
        <tr>
            <th class="font-medium w-1/2">Bias</th>
            <th class="font-medium w-1/3">{language.value}</th>
            <th class="font-medium cursor-pointer hover:text-green-500" on:click={() => {
                    let bia = $DataBase.bias
                    bia.push(['', 0])
                    $DataBase.bias = bia
            }}><PlusIcon /></th>
        </tr>
        {#if $DataBase.bias.length === 0}
            <tr>
                <div class="text-gray-500">{language.noBias}</div>
            </tr>
        {/if}
        {#each $DataBase.bias as bias, i}
            <tr>
                <td class="font-medium truncate w-1/2">
                    <input class="text-neutral-200 mt-2 mb-4 p-2 bg-transparent input-text focus:bg-selected" bind:value={$DataBase.bias[i][0]} placeholder="string">
                </td>
                <td class="font-medium truncate w-1/3">
                    <input class="text-neutral-200 mt-2 mb-4 w-full p-2 bg-transparent input-text focus:bg-selected" bind:value={$DataBase.bias[i][1]} type="number" max="100" min="-100">
                </td>
                <button class="font-medium flex justify-center items-center h-full cursor-pointer hover:text-green-500" on:click={() => {
                    let bia = $DataBase.bias
                    bia.splice(i, 1)
                    $DataBase.bias = bia
                }}><TrashIcon /></button>
            </tr>
        {/each}
    </table>

    <div class="flex items-center mt-4">
        <Check bind:check={$DataBase.promptPreprocess} name={language.promptPreprocess}/>
    </div>

<button on:click={() => {openPresetList = true}} class="mt-4 drop-shadow-lg p-3 border-borderc border-solid flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected">{language.presets}</button>

{/if}

<script lang="ts">

    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import { language } from "src/lang";
    import Help from "src/lib/Others/Help.svelte";
    
    import { DBState } from 'src/ts/stores.svelte';
    import { customProviderStore } from "src/ts/plugins/plugins";
    import { downloadFile, isTauri } from "src/ts/globalApi.svelte";
    import { tokenizeAccurate, tokenizerList } from "src/ts/tokenizer";
    import ModelList from "src/lib/UI/ModelList.svelte";
    import DropList from "src/lib/SideBars/DropList.svelte";
    import { PlusIcon, TrashIcon, HardDriveUploadIcon, DownloadIcon, UploadIcon } from "@lucide/svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import NumberInput from "src/lib/UI/GUI/NumberInput.svelte";
    import SliderInput from "src/lib/UI/GUI/SliderInput.svelte";
    import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
    import Button from "src/lib/UI/GUI/Button.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import { openRouterModels } from "src/ts/model/openrouter";
    import OobaSettings from "./OobaSettings.svelte";
    import Arcodion from "src/lib/UI/Arcodion.svelte";
    import OpenrouterSettings from "./OpenrouterSettings.svelte";
    import ChatFormatSettings from "./ChatFormatSettings.svelte";
    import PromptSettings from "./PromptSettings.svelte";
    import { openPresetList } from "src/ts/stores.svelte";
    import { selectSingleFile } from "src/ts/util";
  import { getModelInfo, LLMFlags, LLMFormat, LLMProvider } from "src/ts/model/modellist";
  import CheckInput from "src/lib/UI/GUI/CheckInput.svelte";
  import RegexList from "src/lib/SideBars/Scripts/RegexList.svelte";
    
let tokens = $state({
        mainPrompt: 0,
        jailbreak: 0,
        globalNote: 0,
    })

    interface Props {
        goPromptTemplate?: any;
    }

    let { goPromptTemplate = () => {} }: Props = $props();

    async function loadTokenize(){
        tokens.mainPrompt = await tokenizeAccurate(DBState.db.mainPrompt, true)
        tokens.jailbreak = await tokenizeAccurate(DBState.db.jailbreak, true)
        tokens.globalNote = await tokenizeAccurate(DBState.db.globalNote, true)
    }

    $effect.pre(() => {
        if(DBState.db.aiModel === 'textgen_webui' || DBState.db.subModel === 'mancer'){
            DBState.db.useStreaming = DBState.db.textgenWebUIStreamURL.startsWith("wss://")
        }
    });

    function clearVertexToken() {
        DBState.db.vertexAccessToken = '';
        DBState.db.vertexAccessTokenExpires = 0;
        console.log('Vertex AI token cleared');
    }

    $effect(() => {
        if (DBState.db.aiModel === 'openrouter' || DBState.db.subModel === 'openrouter') {
            openrouterSearchQuery = ""
        }
    });


    let submenu = $state(DBState.db.useLegacyGUI ? -1 : 0)
    let modelInfo = $derived(getModelInfo(DBState.db.aiModel))
    let subModelInfo = $derived(getModelInfo(DBState.db.subModel))
    let openrouterSearchQuery = $state("")
</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.chatBot}</h2>

{#if submenu !== -1}
    <div class="flex w-full rounded-md border border-darkborderc mb-4">
        <button onclick={() => {
            submenu = 0
        }} class="p-2 flex-1 border-r border-darkborderc" class:bg-darkbutton={submenu === 0}>
            <span>{language.model}</span>
        </button>
        <button onclick={() => {
            submenu = 1
        }} class="p2 flex-1 border-r border-darkborderc" class:bg-darkbutton={submenu === 1}>
            <span>{language.parameters}</span>
        </button>
        <button onclick={() => {
            submenu = 2
        }} class="p-2 flex-1 border-r border-darkborderc" class:bg-darkbutton={submenu === 2}>
            <span>{language.prompt}</span>
        </button>
        <button onclick={() => {
            submenu = 3
        }} class="p-2 flex-1" class:bg-darkbutton={submenu === 3}>
            <span>{language.others}</span>
        </button>
    </div>
{/if}

{#if submenu === 0 || submenu === -1}
    <span class="text-textcolor mt-4">{language.model} <Help key="model"/></span>
    <ModelList bind:value={DBState.db.aiModel}/>

    <span class="text-textcolor mt-2">{language.submodel} <Help key="submodel"/></span>
    <ModelList bind:value={DBState.db.subModel}/>

    {#if modelInfo.provider === LLMProvider.GoogleCloud || subModelInfo.provider === LLMProvider.GoogleCloud}
        <span class="text-textcolor">GoogleAI API Key</span>
        <TextInput marginBottom={true} size={"sm"} placeholder="..." hideText={DBState.db.hideApiKey} bind:value={DBState.db.google.accessToken}/>
    {/if}
    {#if modelInfo.provider === LLMProvider.VertexAI || subModelInfo.provider === LLMProvider.VertexAI}
        <span class="text-textcolor">Project ID</span>
        <TextInput marginBottom={true} size={"sm"} placeholder="..." bind:value={DBState.db.google.projectId} oninput={clearVertexToken}/>
        <span class="text-textcolor">Vertex Client Email</span>
        <TextInput marginBottom={true} size={"sm"} placeholder="..." bind:value={DBState.db.vertexClientEmail} oninput={clearVertexToken}/>
        <span class="text-textcolor">Vertex Private Key</span>
        <TextInput marginBottom={true} size={"sm"} placeholder="..." hideText={DBState.db.hideApiKey} bind:value={DBState.db.vertexPrivateKey} oninput={clearVertexToken}/>
        <span class="text-textcolor">Region</span>
        <SelectInput value={DBState.db.vertexRegion} onchange={(e) => {
            DBState.db.vertexRegion = e.currentTarget.value
            clearVertexToken()
        }}>
            <OptionInput value={'global'}>
                global
            </OptionInput>
            <OptionInput value={'us-central1'}>
                us-central1
            </OptionInput>
            <OptionInput value={'us-west1'}>
                us-west1
            </OptionInput>
        </SelectInput>    
    {/if}
    {#if modelInfo.provider === LLMProvider.AI21 || subModelInfo.provider === LLMProvider.AI21}
        <span class="text-textcolor">AI21 {language.apiKey}</span>
        <TextInput hideText={DBState.db.hideApiKey} marginBottom={true} size={"sm"} placeholder="..." bind:value={DBState.db.ai21Key}/>
    {/if}
    {#if modelInfo.provider === LLMProvider.NovelList || subModelInfo.provider === LLMProvider.NovelList}
        <span class="text-textcolor">NovelList {language.apiKey}</span>
        <TextInput hideText={DBState.db.hideApiKey} marginBottom={true} size={"sm"} placeholder="..." bind:value={DBState.db.novellistAPI}/>
    {/if}
    {#if DBState.db.aiModel.startsWith('mancer') || DBState.db.subModel.startsWith('mancer')}
        <span class="text-textcolor">Mancer {language.apiKey}</span>
        <TextInput hideText={DBState.db.hideApiKey} marginBottom={true} size={"sm"} placeholder="..." bind:value={DBState.db.mancerHeader}/>
    {/if}
    {#if modelInfo.provider === LLMProvider.Anthropic || subModelInfo.provider === LLMProvider.Anthropic
            || modelInfo.provider === LLMProvider.AWS || subModelInfo.provider === LLMProvider.AWS }
        <span class="text-textcolor">Claude {language.apiKey}</span>
        <TextInput hideText={DBState.db.hideApiKey} marginBottom={true} size={"sm"} placeholder="..." bind:value={DBState.db.claudeAPIKey}/>
    {/if}
    {#if modelInfo.provider === LLMProvider.Mistral || subModelInfo.provider === LLMProvider.Mistral}
        <span class="text-textcolor">Mistral {language.apiKey}</span>
        <TextInput hideText={DBState.db.hideApiKey} marginBottom={true} size={"sm"} placeholder="..." bind:value={DBState.db.mistralKey}/>
    {/if}
    {#if modelInfo.provider === LLMProvider.NovelAI || subModelInfo.provider === LLMProvider.NovelAI}
        <span class="text-textcolor">NovelAI Bearer Token</span>
        <TextInput bind:value={DBState.db.novelai.token}/>
    {/if}
    {#if DBState.db.aiModel === 'reverse_proxy' || DBState.db.subModel === 'reverse_proxy'}
        <span class="text-textcolor mt-2">URL <Help key="forceUrl"/></span>
        <TextInput marginBottom={false} size={"sm"} bind:value={DBState.db.forceReplaceUrl} placeholder="https//..." />
        <span class="text-textcolor mt-4"> {language.proxyAPIKey}</span>
        <TextInput hideText={DBState.db.hideApiKey} marginBottom={false} size={"sm"} placeholder="leave it blank if it hasn't password" bind:value={DBState.db.proxyKey} />
        <span class="text-textcolor mt-4"> {language.proxyRequestModel}</span>
        <TextInput marginBottom={false} size={"sm"} bind:value={DBState.db.customProxyRequestModel} placeholder="Name" />
        <span class="text-textcolor mt-4"> {language.format}</span>
        <SelectInput value={DBState.db.customAPIFormat.toString()} onchange={(e) => {
            DBState.db.customAPIFormat = parseInt(e.currentTarget.value)
        }}>
            <OptionInput value={LLMFormat.OpenAICompatible.toString()}>
                OpenAI Compatible
            </OptionInput>
            <OptionInput value={LLMFormat.OpenAIResponseAPI.toString()}>
                OpenAI Response API
            </OptionInput>
            <OptionInput value={LLMFormat.Anthropic.toString()}>
                Anthropic Claude
            </OptionInput>
            <OptionInput value={LLMFormat.Mistral.toString()}>
                Mistral
            </OptionInput>
            <OptionInput value={LLMFormat.GoogleCloud.toString()}>
                Google Cloud
            </OptionInput>
            <OptionInput value={LLMFormat.Cohere.toString()}>
                Cohere
            </OptionInput>
        </SelectInput>
    {/if}
    {#if modelInfo.provider === LLMProvider.Cohere || subModelInfo.provider === LLMProvider.Cohere}
        <span class="text-textcolor mt-4">Cohere {language.apiKey}</span>
        <TextInput hideText={DBState.db.hideApiKey} marginBottom={false} size={"sm"} bind:value={DBState.db.cohereAPIKey} />
    {/if}
    {#if DBState.db.aiModel === 'ollama-hosted'}
        <span class="text-textcolor mt-4">Ollama URL</span>
        <TextInput marginBottom={false} size={"sm"} bind:value={DBState.db.ollamaURL} />

        <span class="text-textcolor mt-4">Ollama Model</span>
        <TextInput marginBottom={false} size={"sm"} bind:value={DBState.db.ollamaModel} />
    {/if}
    {#if DBState.db.aiModel === 'openrouter' || DBState.db.subModel === 'openrouter'}
        <span class="text-textcolor mt-4">Openrouter Key</span>
        <TextInput hideText={DBState.db.hideApiKey} marginBottom={false} size={"sm"} bind:value={DBState.db.openrouterKey} />

        <span class="text-textcolor mt-4">Openrouter Model</span>
        {#await openRouterModels()}
            <SelectInput className="mt-2 mb-4" value="">
                <OptionInput value="">Loading..</OptionInput>
            </SelectInput>
        {:then m}
            {#if m && m.length > 0}
                <TextInput 
                    bind:value={openrouterSearchQuery} 
                    placeholder="Search models..." 
                    size="sm" 
                />
            {/if}
            <SelectInput className="mt-2 mb-4" bind:value={DBState.db.openrouterRequestModel}>
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
                    {#each m.filter(model => {
                        if (openrouterSearchQuery === "") return true;
                        const searchTerms = openrouterSearchQuery.toLowerCase().trim().split(/\s+/);
                        const modelText = (model.name + " " + model.id).toLowerCase();
                        return searchTerms.every(term => modelText.includes(term));
                    }) as model}
                        <OptionInput value={model.id}>{model.name}</OptionInput>
                    {/each}
                {/if}
            </SelectInput>
        {/await}
    {/if}
    {#if DBState.db.aiModel === 'openrouter' || DBState.db.aiModel === 'reverse_proxy'}
        <span class="text-textcolor">{language.tokenizer}</span>
        <SelectInput bind:value={DBState.db.customTokenizer}>
            {#each tokenizerList as entry}
                <OptionInput value={entry[0]}>{entry[1]}</OptionInput>
            {/each}
        </SelectInput>
    {/if}
    {#if modelInfo.provider === LLMProvider.OpenAI || subModelInfo.provider === LLMProvider.OpenAI}
        <span class="text-textcolor">OpenAI {language.apiKey} <Help key="oaiapikey"/></span>
        <TextInput hideText={DBState.db.hideApiKey} marginBottom={false} size={"sm"} bind:value={DBState.db.openAIKey} placeholder="sk-XXXXXXXXXXXXXXXXXXXX"/>
    {/if}

    {#if modelInfo.keyIdentifier}
        <span class="text-textcolor">{modelInfo.name} {language.apiKey}</span>
        <TextInput hideText={DBState.db.hideApiKey} marginBottom={false} size={"sm"} bind:value={DBState.db.OaiCompAPIKeys[modelInfo.keyIdentifier]} placeholder="..."/>
    {/if}

    {#if subModelInfo.keyIdentifier && subModelInfo.keyIdentifier !== modelInfo.keyIdentifier}
        <span class="text-textcolor">{subModelInfo.name} {language.apiKey}</span>
        <TextInput hideText={DBState.db.hideApiKey} marginBottom={false} size={"sm"} bind:value={DBState.db.OaiCompAPIKeys[subModelInfo.keyIdentifier]} placeholder="..."/>
    {/if}

    <div class="py-2 flex flex-col gap-2 mb-4">
        {#if modelInfo.flags.includes(LLMFlags.hasStreaming) || subModelInfo.flags.includes(LLMFlags.hasStreaming)}
            <Check bind:check={DBState.db.useStreaming} name={`Response ${language.streaming}`}/>
            
            {#if DBState.db.useStreaming && (modelInfo.flags.includes(LLMFlags.geminiThinking) || subModelInfo.flags.includes(LLMFlags.geminiThinking))}
                <Check bind:check={DBState.db.streamGeminiThoughts} name={`Stream Gemini Thoughts`}/>
            {/if}
        {/if}

        {#if DBState.db.aiModel === 'reverse_proxy' || DBState.db.subModel === 'reverse_proxy'}
            <Check bind:check={DBState.db.reverseProxyOobaMode} name={`${language.reverseProxyOobaMode}`}/>
        {/if}
        {#if modelInfo.provider === LLMProvider.NovelAI || subModelInfo.provider === LLMProvider.NovelAI}
            <Check bind:check={DBState.db.NAIadventure} name={language.textAdventureNAI}/>

            <Check bind:check={DBState.db.NAIappendName} name={language.appendNameNAI}/>
        {/if}
    </div>

    {#if DBState.db.aiModel === 'custom' || DBState.db.subModel === 'custom'}
        <span class="text-textcolor mt-2">{language.plugin}</span>
        <SelectInput className="mt-2 mb-4" bind:value={DBState.db.currentPluginProvider}>
            <OptionInput value="">None</OptionInput>
            {#each $customProviderStore as plugin}
                <OptionInput value={plugin}>{plugin}</OptionInput>
            {/each}
        </SelectInput>
    {/if}

    {#if DBState.db.aiModel === "kobold" || DBState.db.subModel === "kobold"}
        <span class="text-textcolor">Kobold URL</span>
        <TextInput marginBottom={true} bind:value={DBState.db.koboldURL} />

    {/if}

    {#if DBState.db.aiModel === 'echo_model' || DBState.db.subModel === 'echo_model'}
        <span class="text-textcolor mt-2">Echo Message</span>
        <TextAreaInput margin="bottom" bind:value={DBState.db.echoMessage} placeholder="Message to echo..."/>
        <span class="text-textcolor mt-2">Echo Delay (Seconds)</span>
        <NumberInput marginBottom={true} bind:value={DBState.db.echoDelay} min={0}/>
    {/if}


    {#if DBState.db.aiModel.startsWith("horde") || DBState.db.subModel.startsWith("horde") }
        <span class="text-textcolor">Horde {language.apiKey}</span>
        <TextInput hideText={DBState.db.hideApiKey} marginBottom={true} bind:value={DBState.db.hordeConfig.apiKey} />
    {/if}
    {#if DBState.db.aiModel === 'textgen_webui' || DBState.db.subModel === 'textgen_webui'
        || DBState.db.aiModel === 'mancer' || DBState.db.subModel === 'mancer'}
        <span class="text-textcolor mt-2">Blocking {language.providerURL}</span>
        <TextInput marginBottom={true} bind:value={DBState.db.textgenWebUIBlockingURL} placeholder="https://..."/>
        <span class="text-draculared text-xs mb-2">You must use textgen webui with --public-api</span>
        <span class="text-textcolor mt-2">Stream {language.providerURL}</span>
        <TextInput marginBottom={true} bind:value={DBState.db.textgenWebUIStreamURL} placeholder="wss://..."/>
        {#if !isTauri}
            <span class="text-draculared text-xs mb-2">You are using web version. you must use ngrok or other tunnels to use your local webui.</span>
        {/if}
        <span class="text-draculared text-xs mb-2">Warning: For Ooba version over 1.7, use "Ooba" as model, and use url like http://127.0.0.1:5000/v1/chat/completions</span>
    {/if}
    {#if DBState.db.aiModel === 'ooba' || DBState.db.subModel === 'ooba'}
        <span class="text-textcolor mt-2">Ooba {language.providerURL}</span>
        <TextInput marginBottom={true} bind:value={DBState.db.textgenWebUIBlockingURL} placeholder="https://..."/>
    {/if}
    {#if DBState.db.aiModel.startsWith("horde") || DBState.db.aiModel === 'kobold' }
        <ChatFormatSettings />
    {/if}
{/if}

{#if submenu === 1 || submenu === -1}
    <span class="text-textcolor">{language.maxContextSize}</span>
    <NumberInput min={0} marginBottom={true} bind:value={DBState.db.maxContext}/>


    <span class="text-textcolor">{language.maxResponseSize}</span>
    <NumberInput min={0} max={2048} marginBottom={true} bind:value={DBState.db.maxResponse}/>

    {#if DBState.db.aiModel.startsWith('gpt') || DBState.db.aiModel === 'reverse_proxy' || DBState.db.aiModel === 'openrouter'}
        <span class="text-textcolor">{language.seed}</span>

        <NumberInput bind:value={DBState.db.generationSeed} marginBottom={true}/>
    {/if}

    {#if modelInfo.parameters.includes('thinking_tokens')}
        <span class="text-textcolor">{language.thinkingTokens}</span>
        <SliderInput min={-1} max={64000} marginBottom step={200} bind:value={DBState.db.thinkingTokens} disableable/>

    {/if}
    <span class="text-textcolor">{language.temperature} <Help key="tempature"/></span>
    <SliderInput min={0} max={200} marginBottom bind:value={DBState.db.temperature} multiple={0.01} fixed={2} disableable/>
    {#if modelInfo.parameters.includes('top_k')}
        <span class="text-textcolor">Top K</span>
        <SliderInput min={0} max={100} marginBottom step={1} bind:value={DBState.db.top_k} disableable/>
    {/if}
    {#if modelInfo.parameters.includes('min_p')}
        <span class="text-textcolor">Min P</span>
        <SliderInput min={0} max={1} marginBottom step={0.01} fixed={2} bind:value={DBState.db.min_p} disableable/>

    {/if}
    {#if modelInfo.parameters.includes('top_a')}
        <span class="text-textcolor">Top A</span>
        <SliderInput min={0} max={1} marginBottom step={0.01} fixed={2} bind:value={DBState.db.top_a} disableable/>
    {/if}
    {#if modelInfo.parameters.includes('repetition_penalty')}
        <span class="text-textcolor">Repetition penalty</span>
        <SliderInput min={0} max={2} marginBottom step={0.01} fixed={2} bind:value={DBState.db.repetition_penalty} disableable/>

    {/if}
    {#if modelInfo.parameters.includes('reasoning_effort')}
        <span class="text-textcolor">Reasoning Effort</span>
        <SliderInput min={-1} max={2} marginBottom step={1} fixed={0} bind:value={DBState.db.reasoningEffort} disableable/>
    {/if}
    {#if modelInfo.parameters.includes('verbosity')}
        <span class="text-textcolor">Verbosity</span>
    <SliderInput min={0} max={2} marginBottom step={1} fixed={0} bind:value={DBState.db.verbosity} disableable/>
    {/if}
    {#if DBState.db.aiModel === 'textgen_webui' || DBState.db.aiModel === 'mancer' || DBState.db.aiModel.startsWith('local_') || DBState.db.aiModel.startsWith('hf:::')}
        <span class="text-textcolor">Repetition Penalty</span>
        <SliderInput min={1} max={1.5} step={0.01} fixed={2} marginBottom bind:value={DBState.db.ooba.repetition_penalty}/>
        <span class="text-textcolor">Length Penalty</span>
        <SliderInput min={-5} max={5} step={0.05} marginBottom fixed={2} bind:value={DBState.db.ooba.length_penalty}/>
        <span class="text-textcolor">Top K</span>
        <SliderInput min={0} max={100} step={1} marginBottom bind:value={DBState.db.ooba.top_k} />
        <span class="text-textcolor">Top P</span>
        <SliderInput min={0} max={1} step={0.01} marginBottom fixed={2} bind:value={DBState.db.ooba.top_p}/>
        <span class="text-textcolor">Typical P</span>
        <SliderInput min={0} max={1} step={0.01} marginBottom fixed={2} bind:value={DBState.db.ooba.typical_p}/>
        <span class="text-textcolor">Top A</span>
        <SliderInput min={0} max={1} step={0.01} marginBottom fixed={2} bind:value={DBState.db.ooba.top_a}/>
        <span class="text-textcolor">No Repeat n-gram Size</span>
        <SliderInput min={0} max={20} step={1} marginBottom bind:value={DBState.db.ooba.no_repeat_ngram_size}/>
        <div class="flex items-center mt-4">
            <Check bind:check={DBState.db.ooba.do_sample} name={'Do Sample'}/>
        </div>
        <div class="flex items-center mt-4">
            <Check bind:check={DBState.db.ooba.add_bos_token} name={'Add BOS Token'}/>
        </div>
        <div class="flex items-center mt-4">
            <Check bind:check={DBState.db.ooba.ban_eos_token} name={'Ban EOS Token'}/>
        </div>
        <div class="flex items-center mt-4">
            <Check bind:check={DBState.db.ooba.skip_special_tokens} name={'Skip Special Tokens'}/>
        </div>
        <div class="flex items-center mt-4">
            <Check check={!!DBState.db.localStopStrings} name={language.customStopWords} onChange={() => {
                if(!DBState.db.localStopStrings){
                    DBState.db.localStopStrings = []
                }
                else{
                    DBState.db.localStopStrings = null
                }
            }} />
        </div>
        {#if DBState.db.localStopStrings}
            <div class="flex flex-col p-2 rounded-sm border border-selected mt-2 gap-1">
                <div class="p-2">
                    <button class="font-medium flex justify-center items-center h-full cursor-pointer hover:text-green-500 w-full" onclick={() => {
                        let localStopStrings = DBState.db.localStopStrings
                        localStopStrings.push('')
                        DBState.db.localStopStrings = localStopStrings
                    }}><PlusIcon /></button>
                </div>
                {#each DBState.db.localStopStrings as stopString, i}
                    <div class="flex w-full">
                        <div class="grow">
                            <TextInput marginBottom bind:value={DBState.db.localStopStrings[i]} fullwidth fullh/>
                        </div>
                        <div>
                            <button class="font-medium flex justify-center items-center h-full cursor-pointer hover:text-green-500 w-full" onclick={() => {
                                let localStopStrings = DBState.db.localStopStrings
                                localStopStrings.splice(i, 1)
                                DBState.db.localStopStrings = localStopStrings
                            }}><TrashIcon /></button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
        <div class="flex flex-col p-3 rounded-md border-selected border mt-4">
            <ChatFormatSettings />
        </div>
        <Check bind:check={DBState.db.ooba.formating.useName} name={language.useNamePrefix}/>
    
    {:else if modelInfo.format === LLMFormat.NovelAI}
        <div class="flex flex-col p-3 bg-darkbg mt-4">
            <span class="text-textcolor">Starter</span>
            <TextInput bind:value={DBState.db.NAIsettings.starter} placeholder={'⁂'} />
            <span class="text-textcolor">Seperator</span>
            <TextInput bind:value={DBState.db.NAIsettings.seperator} placeholder={"\\n"}/>
        </div>
        <span class="text-textcolor">Top P</span>
        <SliderInput min={0} max={1} step={0.01} marginBottom fixed={2} bind:value={DBState.db.NAIsettings.topP}/>
        <span class="text-textcolor">Top K</span>
        <SliderInput min={0} max={100} step={1} marginBottom bind:value={DBState.db.NAIsettings.topK}/>
        <span class="text-textcolor">Top A</span>
        <SliderInput min={0} max={1} step={0.01} marginBottom fixed={2} bind:value={DBState.db.NAIsettings.topA}/>
        <span class="text-textcolor">Tailfree Sampling</span>
        <SliderInput min={0} max={1} step={0.001} marginBottom fixed={3} bind:value={DBState.db.NAIsettings.tailFreeSampling}/>
        <span class="text-textcolor">Typical P</span>
        <SliderInput min={0} max={1} step={0.01} marginBottom fixed={2} bind:value={DBState.db.NAIsettings.typicalp}/>
        <span class="text-textcolor">Repetition Penalty</span>
        <SliderInput min={0} max={3} step={0.01} marginBottom fixed={2} bind:value={DBState.db.NAIsettings.repetitionPenalty}/>
        <span class="text-textcolor">Repetition Penalty Range</span>
        <SliderInput min={0} max={8192} step={1} marginBottom fixed={0} bind:value={DBState.db.NAIsettings.repetitionPenaltyRange}/>
        <span class="text-textcolor">Repetition Penalty Slope</span>
        <SliderInput min={0} max={10} step={0.01} marginBottom fixed={2} bind:value={DBState.db.NAIsettings.repetitionPenaltySlope}/>
        <span class="text-textcolor">Frequency Penalty</span>
        <SliderInput min={-2} max={2} step={0.01} marginBottom fixed={2} bind:value={DBState.db.NAIsettings.frequencyPenalty}/>
        <span class="text-textcolor">Presence Penalty</span>
        <SliderInput min={-2} max={2} step={0.01} marginBottom fixed={2} bind:value={DBState.db.NAIsettings.presencePenalty}/>
        <span class="text-textcolor">Mirostat LR</span>
        <SliderInput min={0} max={1} step={0.01} marginBottom fixed={2} bind:value={DBState.db.NAIsettings.mirostat_lr}/>
        <span class="text-textcolor">Mirostat Tau</span>
        <SliderInput min={0} max={6} step={0.01} marginBottom fixed={2} bind:value={DBState.db.NAIsettings.mirostat_tau}/>
        <span class="text-textcolor">Cfg Scale</span>
        <SliderInput min={1} max={3} step={0.01} marginBottom fixed={2} bind:value={DBState.db.NAIsettings.cfg_scale}/>

    {:else if modelInfo.format === LLMFormat.NovelList}
        <span class="text-textcolor">Top P</span>
        <SliderInput min={0} max={2} step={0.01} marginBottom fixed={2} bind:value={DBState.db.ainconfig.top_p}/>
        <span class="text-textcolor">Reputation Penalty</span>
        <SliderInput min={0} max={2} step={0.01} marginBottom fixed={2} bind:value={DBState.db.ainconfig.rep_pen}/>
        <span class="text-textcolor">Reputation Penalty Range</span>
        <SliderInput min={0} max={2048} step={1} marginBottom fixed={2} bind:value={DBState.db.ainconfig.rep_pen_range}/>
        <span class="text-textcolor">Reputation Penalty Slope</span>
        <SliderInput min={0} max={10} step={0.1} marginBottom fixed={2} bind:value={DBState.db.ainconfig.rep_pen_slope}/>
        <span class="text-textcolor">Top K</span>
        <SliderInput min={1} max={500} step={1} marginBottom fixed={2} bind:value={DBState.db.ainconfig.top_k}/>
        <span class="text-textcolor">Top A</span>
        <SliderInput min={0} max={1} step={0.01} marginBottom fixed={2} bind:value={DBState.db.ainconfig.top_a}/>
        <span class="text-textcolor">Typical P</span>
        <SliderInput min={0} max={1} step={0.01} marginBottom fixed={2} bind:value={DBState.db.ainconfig.typical_p}/>
    {:else}
        {#if modelInfo.parameters.includes('top_p')}
            <span class="text-textcolor">Top P</span>
            <SliderInput min={0} max={1} step={0.01} marginBottom fixed={2} bind:value={DBState.db.top_p} disableable/>
        {/if}
        {#if modelInfo.parameters.includes('frequency_penalty')}
            <span class="text-textcolor">{language.frequencyPenalty}</span>
            <SliderInput min={0} max={200} marginBottom fixed={2} multiple={0.01} bind:value={DBState.db.frequencyPenalty} disableable/>
        {/if}
        {#if modelInfo.parameters.includes('presence_penalty')}
            <span class="text-textcolor">{language.presensePenalty}</span>
            <SliderInput min={0} max={200} marginBottom fixed={2} multiple={0.01} bind:value={DBState.db.PresensePenalty} disableable/>
        {/if}
    {/if}

    {#if (DBState.db.reverseProxyOobaMode && DBState.db.aiModel === 'reverse_proxy') || (DBState.db.aiModel === 'ooba')}
        <OobaSettings instructionMode={DBState.db.aiModel === 'ooba'} />
    {/if}

    {#if DBState.db.aiModel.startsWith('openrouter')}
        <OpenrouterSettings />
    {/if}

    <Arcodion name={language.seperateParameters} styled>
        <CheckInput bind:check={DBState.db.seperateParametersEnabled} name={language.seperateParametersEnabled} />
        {#if DBState.db.seperateParametersEnabled}
            {#each Object.keys(DBState.db.seperateParameters) as param, i}
                <Arcodion name={
                    {
                        memory: language.longTermMemory,
                        emotion: language.emotionImage,
                        translate: language.translator,
                        otherAx: language.others,

                    }[param]
                } styled>
                    <span class="text-textcolor">{language.temperature} <Help key="tempature"/></span>
                    <SliderInput min={0} max={200} marginBottom bind:value={DBState.db.seperateParameters[param].temperature} multiple={0.01} fixed={2} disableable/>
                    <span class="text-textcolor">Top K</span>
                    <SliderInput min={0} max={100} marginBottom step={1} bind:value={DBState.db.seperateParameters[param].top_k} disableable/>
                    <span class="text-textcolor">Repetition penalty</span>
                    <SliderInput min={0} max={2} marginBottom step={0.01} fixed={2} bind:value={DBState.db.seperateParameters[param].repetition_penalty} disableable/>
                    <span class="text-textcolor">Min P</span>
                    <SliderInput min={0} max={1} marginBottom step={0.01} fixed={2} bind:value={DBState.db.seperateParameters[param].min_p} disableable/>
                    <span class="text-textcolor">Top A</span>
                    <SliderInput min={0} max={1} marginBottom step={0.01} fixed={2} bind:value={DBState.db.seperateParameters[param].top_a} disableable/>
                    <span class="text-textcolor">Top P</span>
                    <SliderInput min={0} max={1} marginBottom step={0.01} fixed={2} bind:value={DBState.db.seperateParameters[param].top_p} disableable/>
                    <span class="text-textcolor">Frequency Penalty</span>
                    <SliderInput min={0} max={200} marginBottom step={0.01} fixed={2} bind:value={DBState.db.seperateParameters[param].frequency_penalty} disableable/>
                    <span class="text-textcolor">Presence Penalty</span>
                    <SliderInput min={0} max={200} marginBottom step={0.01} fixed={2} bind:value={DBState.db.seperateParameters[param].presence_penalty} disableable/>
                    <span class="text-textcolor">{language.thinkingTokens}</span>
                    <SliderInput min={0} max={64000} marginBottom step={200} fixed={0} bind:value={DBState.db.seperateParameters[param].thinking_tokens} disableable/>
                    <span class="text-textcolor">Verbosity</span>
                    <SliderInput min={0} max={2} marginBottom step={1} fixed={0} bind:value={DBState.db.seperateParameters[param].verbosity} disableable/>
                </Arcodion>
            {/each}

        {/if}
    </Arcodion>

{/if}

{#if submenu === 3 || submenu === -1}
    <Arcodion styled name="Bias " help="bias">
        <table class="contain w-full max-w-full tabler">
            <tbody>
            <tr>
                <th class="font-medium">Bias</th>
                <th class="font-medium">{language.value}</th>
                <th>
                    <button class="font-medium cursor-pointer hover:text-green-500 w-full flex justify-center items-center" onclick={() => {
                        let bia = DBState.db.bias
                        bia.push(['', 0])
                        DBState.db.bias = bia
                    }}><PlusIcon /></button>
                </th>
            </tr>
            {#if DBState.db.bias.length === 0}
                <tr>
                    <td colspan="3" class="text-textcolor2">{language.noBias}</td>
                </tr>
            {/if}
            {#each DBState.db.bias as bias, i}
                <tr>
                    <td class="font-medium truncate">
                        <TextInput bind:value={DBState.db.bias[i][0]} size="lg" fullwidth/>
                    </td>
                    <td class="font-medium truncate">
                        <NumberInput bind:value={DBState.db.bias[i][1]} max={100} min={-101} size="lg" fullwidth/>
                    </td>
                    <td>
                        <button class="font-medium flex justify-center items-center h-full cursor-pointer hover:text-green-500 w-full" onclick={() => {
                            let bia = DBState.db.bias
                            bia.splice(i, 1)
                            DBState.db.bias = bia
                        }}><TrashIcon /></button>
                    </td>
                </tr>
            {/each}
            </tbody>
        </table>
        <div class="text-textcolor2 mt-2 flex items-center gap-2">
            <button class="font-medium cursor-pointer hover:text-textcolor gap-2" onclick={() => {
                const data = JSON.stringify(DBState.db.bias, null, 2)
                downloadFile('bias.json', data)
            }}><DownloadIcon /></button>
            <button class="font-medium cursor-pointer hover:text-textcolor" onclick={async () => {
                const sel = await selectSingleFile(['json'])
                const utf8 = new TextDecoder().decode(sel.data)
                if(Array.isArray(JSON.parse(utf8))){
                    DBState.db.bias = JSON.parse(utf8)
                }
            }}><HardDriveUploadIcon /></button>
        </div>
    </Arcodion>

    {#if DBState.db.aiModel === 'reverse_proxy'}
    <Arcodion styled name="{language.additionalParams} " help="additionalParams">
        <table class="contain w-full max-w-full tabler">
            <tbody>
            <tr>
                <th class="font-medium">{language.key}</th>
                <th class="font-medium">{language.value}</th>
                <th>
                    <button class="font-medium cursor-pointer hover:text-green-500 w-full flex justify-center items-center" onclick={() => {
                        let additionalParams = DBState.db.additionalParams
                        additionalParams.push(['', ''])
                        DBState.db.additionalParams = additionalParams
                    }}><PlusIcon /></button>
                </th>
            </tr>
            {#if DBState.db.bias.length === 0}
                <tr class="text-textcolor2">
                    <td colspan="3">{language.noData}</td>
                </tr>
            {/if}
            {#each DBState.db.additionalParams as additionalParams, i}
                <tr>
                    <td class="font-medium truncate">
                        <TextInput bind:value={DBState.db.additionalParams[i][0]} size="lg" fullwidth/>
                    </td>
                    <td class="font-medium truncate">
                        <TextInput bind:value={DBState.db.additionalParams[i][1]} size="lg" fullwidth/>
                    </td>
                    <td>
                        <button class="font-medium flex justify-center items-center h-full cursor-pointer hover:text-green-500 w-full" onclick={() => {
                            let additionalParams = DBState.db.additionalParams
                            additionalParams.splice(i, 1)
                            DBState.db.additionalParams = additionalParams
                        }}><TrashIcon /></button>
                    </td>
                </tr>
            {/each}
            </tbody>
        </table>
    </Arcodion>
    {/if}


    <Arcodion styled name={language.promptTemplate}>
        {#if DBState.db.promptTemplate}
            {#if submenu !== -1}
                <PromptSettings mode='inline' subMenu={1} />
            {/if}
        {:else}
            <Check check={false} name={language.usePromptTemplate} onChange={() => {
                DBState.db.promptTemplate = []
            }}/>
        {/if}
    </Arcodion>

    {#snippet CustomFlagButton(name:string,flag:number)}
        <Button className="mt-2" onclick={(e) => {
            if(DBState.db.customFlags.includes(flag)){
                DBState.db.customFlags = DBState.db.customFlags.filter((f) => f !== flag)
            }
            else{
                DBState.db.customFlags.push(flag)
            }
        }} styled={DBState.db.customFlags.includes(flag) ? 'primary' : 'outlined'}>
            {name}
        </Button>
    {/snippet}

    <Arcodion styled name={language.customFlags}>
        <Check bind:check={DBState.db.enableCustomFlags} name={language.enableCustomFlags}/>


        {#if DBState.db.enableCustomFlags}
            {@render CustomFlagButton('hasImageInput', 0)}
            {@render CustomFlagButton('hasImageOutput', 1)}
            {@render CustomFlagButton('hasAudioInput', 2)}
            {@render CustomFlagButton('hasAudioOutput', 3)}
            {@render CustomFlagButton('hasPrefill', 4)}
            {@render CustomFlagButton('hasCache', 5)}
            {@render CustomFlagButton('hasFullSystemPrompt', 6)}
            {@render CustomFlagButton('hasFirstSystemPrompt', 7)}
            {@render CustomFlagButton('hasStreaming', 8)}
            {@render CustomFlagButton('requiresAlternateRole', 9)}
            {@render CustomFlagButton('mustStartWithUserInput', 10)}
            {@render CustomFlagButton('hasVideoInput', 12)}
            {@render CustomFlagButton('OAICompletionTokens', 13)}
            {@render CustomFlagButton('DeveloperRole', 14)}
            {@render CustomFlagButton('geminiThinking', 15)}
            {@render CustomFlagButton('geminiBlockOff', 16)}
            {@render CustomFlagButton('deepSeekPrefix', 17)}
            {@render CustomFlagButton('deepSeekThinkingInput', 18)}
            {@render CustomFlagButton('deepSeekThinkingOutput', 19)}

        {/if}
    </Arcodion>

    <Arcodion styled name={language.moduleIntergration} help="moduleIntergration">
        <TextAreaInput bind:value={DBState.db.moduleIntergration} fullwidth height={"32"} autocomplete="off"/>
    </Arcodion>

    <Arcodion styled name={language.tools}>
        <Check name={language.search} check={DBState.db.modelTools.includes('search')} onChange={() => {
            if(DBState.db.modelTools.includes('search')){
                DBState.db.modelTools = DBState.db.modelTools.filter((tool) => tool !== 'search')
            }
            else{
                DBState.db.modelTools.push('search')
            }
        }} />
    </Arcodion>
    
    <Arcodion styled name={language.regexScript}>
        <RegexList bind:value={DBState.db.presetRegex} buttons />
    </Arcodion>

    <Arcodion styled name={language.icon}>
        <div class="p-2 rounded-md border border-darkborderc flex flex-col items-center gap-2">
            <span>
                {language.preview}
            </span>
            <div class="flex items-center justify-center gap-2">
                {#if DBState.db.botPresets[DBState.db.botPresetsId]?.image}
                    <img src={DBState.db.botPresets[DBState.db.botPresetsId]?.image} alt="icon" class="w-6 h-6 rounded-md" decoding="async"/>
                    <span class="text-textcolor2">{DBState.db.botPresets[DBState.db.botPresetsId]?.name}</span>
                {:else}
                    <span class="text-textcolor2">{language.noImages}</span>
                {/if}
            </div>
        </div>
        <button class="mt-2 text-textcolor2 hover:text-textcolor focus-within:text-textcolor" onclick={async () => {
            const sel = await selectSingleFile(['png', 'jpg', 'jpeg', 'webp'])
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            const img = new Image()
            //@ts-expect-error Uint8Array buffer type (ArrayBufferLike) is incompatible with BlobPart's ArrayBuffer
            const blob = new Blob([sel.data], {type: "image/png"})
            img.src = URL.createObjectURL(blob)
            await img.decode()
            canvas.width = 48
            canvas.height = 48
            ctx.drawImage(img, 0, 0, 48, 48)
            const data = canvas.toDataURL('image/jpeg', 0.7)
            DBState.db.botPresets[DBState.db.botPresetsId].image = data //Since its small (max 2304 pixels), its okay to store it directly
        }}>
            <UploadIcon />
        </button>
    </Arcodion>
    {#if submenu !== -1}
        <Button onclick={() => {$openPresetList = true}} className="mt-4">{language.presets}</Button>
    {/if}
{/if}

{#if submenu === 2 || submenu === -1}
    {#if !DBState.db.promptTemplate}
        <span class="text-textcolor">{language.mainPrompt} <Help key="mainprompt"/></span>
        <TextAreaInput fullwidth autocomplete="off" height={"32"} bind:value={DBState.db.mainPrompt}></TextAreaInput>
        <span class="text-textcolor2 mb-6 text-sm mt-2">{tokens.mainPrompt} {language.tokens}</span>
        <span class="text-textcolor">{language.jailbreakPrompt} <Help key="jailbreak"/></span>
        <TextAreaInput fullwidth autocomplete="off" height={"32"} bind:value={DBState.db.jailbreak}></TextAreaInput>
        <span class="text-textcolor2 mb-6 text-sm mt-2">{tokens.jailbreak} {language.tokens}</span>
        <span class="text-textcolor">{language.globalNote} <Help key="globalNote"/></span>
        <TextAreaInput fullwidth autocomplete="off" height={"32"} bind:value={DBState.db.globalNote}></TextAreaInput>
        <span class="text-textcolor2 mb-6 text-sm mt-2">{tokens.globalNote} {language.tokens}</span>  
        <span class="text-textcolor mb-2 mt-4">{language.formatingOrder} <Help key="formatOrder"/></span>
        <DropList bind:list={DBState.db.formatingOrder} />
        <div class="flex items-center mt-4">
            <Check bind:check={DBState.db.promptPreprocess} name={language.promptPreprocess}/>
        </div>
    {:else if submenu === 2}
        <PromptSettings mode='inline' />
    {/if}
{/if}


{#if DBState.db.promptTemplate && submenu === -1}
    <div class="mt-2">
        <Button onclick={goPromptTemplate} size="sm">{language.promptTemplate}</Button>
    </div>
{/if}
{#if submenu === -1}
    <Button onclick={() => {$openPresetList = true}} className="mt-4">{language.presets}</Button>
{/if}

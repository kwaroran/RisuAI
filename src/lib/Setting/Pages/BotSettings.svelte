<script lang="ts">

    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import { language } from "src/lang";
    import Help from "src/lib/Others/Help.svelte";
    
    import { DBState } from 'src/ts/stores.svelte';
    import { customProviderStore } from "src/ts/plugins/plugins.svelte";
    import { downloadFile } from "src/ts/globalApi.svelte";
    import { isTauri } from "src/ts/platform"
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
    import CheckInput from "src/lib/UI/GUI/CheckInput.svelte";
    import SegmentedControl from "src/lib/UI/GUI/SegmentedControl.svelte";
    import { getOpenRouterModels, toModelGridItem as orToGridItem } from "src/ts/model/openrouter";
    import { getNanoGPTModels, getNanoGPTSubscriptionModels, toModelGridItem as ngToGridItem } from "src/ts/model/nanogpt";
    import { getOllamaModels } from "src/ts/model/ollama";
    import ModelGrid from "src/lib/UI/ModelGrid.svelte";
    import NanoGPTDashboard from "src/lib/UI/NanoGPTDashboard.svelte";
    import NanoGPTProviderPicker from "src/lib/UI/NanoGPTProviderPicker.svelte";
    import type { ModelGridPinnedItem } from "src/ts/model/modelGrid";
    import OobaSettings from "./OobaSettings.svelte";
    import Accordion from "src/lib/UI/Accordion.svelte";
    import OpenrouterSettings from "./OpenrouterSettings.svelte";
    import ChatFormatSettings from "./ChatFormatSettings.svelte";
    import PromptSettings from "./PromptSettings.svelte";
    import { openPresetList } from "src/ts/stores.svelte";
    import { selectSingleFile } from "src/ts/util";
    import { getModelInfo, LLMFlags, LLMFormat, LLMProvider } from "src/ts/model/modellist";
    import RegexList from "src/lib/SideBars/Scripts/RegexList.svelte";
    import SettingRenderer from "../SettingRenderer.svelte";
    import { allBasicParameterItems } from "src/ts/setting/botSettingsParamsData";
    import SeparateParametersSection from "./SeparateParametersSection.svelte";
    
    const openrouterPinnedItems: ModelGridPinnedItem[] = [
        { id: 'risu/free',       displayName: 'Free Auto',       providerName: 'Risu'       },
        { id: 'openrouter/auto', displayName: 'OpenRouter Auto', providerName: 'OpenRouter' },
    ]

    type AuxModelRole = 'memory' | 'translate' | 'emotion' | 'otherAx'
    type ModelCardRole = 'main' | 'sub' | AuxModelRole

    const auxModelRoles: AuxModelRole[] = ['memory', 'translate', 'emotion', 'otherAx']

    // Reset model selection and display name when subscription mode toggles
    let _nanogptSubModeInitialized = false
    $effect(() => {
        const _sub = DBState.db.nanogptUseSubscriptionEndpoint
        if (!_nanogptSubModeInitialized) { _nanogptSubModeInitialized = true; return }
        DBState.db.nanogptRequestModel = ''
        DBState.db.nanogptRequestModelName = ''
    })

    // Reset provider selection to Auto when the model or subscription mode changes
    let _nanogptProviderResetInitialized = false
    $effect(() => {
        const _model = DBState.db.nanogptRequestModel
        const _sub   = DBState.db.nanogptUseSubscriptionEndpoint
        if (!_nanogptProviderResetInitialized) { _nanogptProviderResetInitialized = true; return }
        DBState.db.nanogptProvider = ''
    })

    // Reset subscription mode (and related state) when API key is cleared
    let _nanogptKeyInitialized = false
    $effect(() => {
        const _key = DBState.db.nanogptKey
        if (!_nanogptKeyInitialized) { _nanogptKeyInitialized = true; return }
        if (!_key) {
            DBState.db.nanogptUseSubscriptionEndpoint = false
            DBState.db.nanogptSubscriptionState = ''
            DBState.db.nanogptRequestModel = ''
            DBState.db.nanogptRequestModelName = ''
            DBState.db.nanogptProvider = ''
        }
    })

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


    let submenu = $state(DBState.db.useLegacyGUI ? -1 : 0)
    let modelInfo = $derived(getModelInfo(DBState.db.aiModel))
    let subModelInfo = $derived(getModelInfo(DBState.db.subModel))
    let nanogptInputMode = $state<'list' | 'manual'>(DBState.db.nanogptRequestModel && !DBState.db.nanogptRequestModelName ? 'manual' : 'list')
    // svelte-ignore state_referenced_locally
    let prevNanogptInputMode = nanogptInputMode;
    $effect(() => {
        if (nanogptInputMode !== prevNanogptInputMode) {
            DBState.db.nanogptRequestModel = '';
            DBState.db.nanogptRequestModelName = '';
            prevNanogptInputMode = nanogptInputMode;
        }
    });

    function isAuxModelRole(role: ModelCardRole): role is AuxModelRole {
        return role !== 'main' && role !== 'sub'
    }

    function modelRoleLabel(role: ModelCardRole) {
        if (role === 'main') {
            return (language as any).mainModel ?? language.model
        }
        if (role === 'memory') {
            return language.memoryAuxModel
        }
        if (role === 'translate') {
            return language.translateAuxModel
        }
        if (role === 'emotion') {
            return language.emotionAuxModel
        }
        if (role === 'otherAx') {
            return language.otherAuxModel
        }

        return language.submodel
    }

    function modelRoleHelp(role: ModelCardRole): 'model' | 'submodel' | '' {
        return role === 'main' ? 'model' : role === 'sub' ? 'submodel' : ''
    }

    function modelIdForRole(role: ModelCardRole) {
        if (role === 'main') {
            return DBState.db.aiModel
        }
        if (role === 'sub') {
            return DBState.db.subModel
        }

        return DBState.db.seperateModels[role]
    }

    function isProviderShownForRole(role: ModelCardRole, currentMatches: boolean, mainMatches: boolean) {
        return currentMatches && (role !== 'sub' || !mainMatches)
    }

    function isModelShownForRole(role: ModelCardRole, currentModelId: string, targetModelId: string) {
        return currentModelId === targetModelId && (role !== 'sub' || DBState.db.aiModel !== targetModelId)
    }

    function isPrefixShownForRole(role: ModelCardRole, currentModelId: string, targetPrefix: string) {
        return currentModelId.startsWith(targetPrefix) && (role !== 'sub' || !DBState.db.aiModel.startsWith(targetPrefix))
    }
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
    <div class="flex flex-col">
        {#snippet ModelCard(role: ModelCardRole)}
            {@const modelId = modelIdForRole(role)}
            {@const info = isAuxModelRole(role) ? getModelInfo(modelId || DBState.db.subModel) : role === 'main' ? modelInfo : subModelInfo}
            <Accordion styled name={modelRoleLabel(role)} help={modelRoleHelp(role)} className="gap-3">
                        <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                            <span class="text-sm font-medium text-textcolor">{language.model}</span>
                            <div class="min-w-0">
                                {#if role === 'main'}
                                    <ModelList bind:value={DBState.db.aiModel} noMargin fullWidth />
                                {:else if role === 'sub'}
                                    <ModelList bind:value={DBState.db.subModel} noMargin fullWidth />
                                {:else if role === 'memory'}
                                    <ModelList bind:value={DBState.db.seperateModels.memory} blankable noMargin fullWidth />
                                {:else if role === 'translate'}
                                    <ModelList bind:value={DBState.db.seperateModels.translate} blankable noMargin fullWidth />
                                {:else if role === 'emotion'}
                                    <ModelList bind:value={DBState.db.seperateModels.emotion} blankable noMargin fullWidth />
                                {:else}
                                    <ModelList bind:value={DBState.db.seperateModels.otherAx} blankable noMargin fullWidth />
                                {/if}
                            </div>
                        </div>

                        {#if !isAuxModelRole(role) || modelId}
                        {#if isProviderShownForRole(role, info.provider === LLMProvider.GoogleCloud, modelInfo.provider === LLMProvider.GoogleCloud)}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">GoogleAI API Key</span>
                                <TextInput fullwidth size={"sm"} placeholder="..." hideText={DBState.db.hideApiKey} bind:value={DBState.db.google.accessToken}/>
                            </div>
                        {/if}
                        {#if isProviderShownForRole(role, info.provider === LLMProvider.VertexAI, modelInfo.provider === LLMProvider.VertexAI)}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">Project ID</span>
                                <TextInput fullwidth size={"sm"} placeholder="..." bind:value={DBState.db.google.projectId} oninput={clearVertexToken}/>
                            </div>
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">Vertex Client Email</span>
                                <TextInput fullwidth size={"sm"} placeholder="..." bind:value={DBState.db.vertexClientEmail} oninput={clearVertexToken}/>
                            </div>
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">Vertex Private Key</span>
                                <TextInput fullwidth size={"sm"} placeholder="..." hideText={DBState.db.hideApiKey} bind:value={DBState.db.vertexPrivateKey} oninput={clearVertexToken}/>
                            </div>
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">Region</span>
                                <SelectInput className="w-full" value={DBState.db.vertexRegion} onchange={(e) => {
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
                            </div>
                        {/if}
                        {#if isProviderShownForRole(role, info.provider === LLMProvider.NovelList, modelInfo.provider === LLMProvider.NovelList)}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">NovelList {language.apiKey}</span>
                                <TextInput fullwidth hideText={DBState.db.hideApiKey} size={"sm"} placeholder="..." bind:value={DBState.db.novellistAPI}/>
                            </div>
                        {/if}
                        {#if isPrefixShownForRole(role, modelId, 'mancer')}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">Mancer {language.apiKey}</span>
                                <TextInput fullwidth hideText={DBState.db.hideApiKey} size={"sm"} placeholder="..." bind:value={DBState.db.mancerHeader}/>
                            </div>
                        {/if}
                        {#if isProviderShownForRole(role, info.provider === LLMProvider.Anthropic || info.provider === LLMProvider.AWS, modelInfo.provider === LLMProvider.Anthropic || modelInfo.provider === LLMProvider.AWS)}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">Claude {language.apiKey}</span>
                                <TextInput fullwidth hideText={DBState.db.hideApiKey} size={"sm"} placeholder="..." bind:value={DBState.db.claudeAPIKey}/>
                            </div>
                        {/if}
                        {#if isProviderShownForRole(role, info.provider === LLMProvider.Mistral, modelInfo.provider === LLMProvider.Mistral)}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">Mistral {language.apiKey}</span>
                                <TextInput fullwidth hideText={DBState.db.hideApiKey} size={"sm"} placeholder="..." bind:value={DBState.db.mistralKey}/>
                            </div>
                        {/if}
                        {#if isProviderShownForRole(role, info.provider === LLMProvider.NovelAI, modelInfo.provider === LLMProvider.NovelAI)}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">NovelAI Bearer Token</span>
                                <TextInput fullwidth hideText={DBState.db.hideApiKey} size={"sm"} bind:value={DBState.db.novelai.token}/>
                            </div>
                        {/if}
                        {#if isModelShownForRole(role, modelId, 'reverse_proxy')}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">URL <Help key="forceUrl"/></span>
                                <TextInput fullwidth size={"sm"} bind:value={DBState.db.forceReplaceUrl} placeholder="https//..." />
                            </div>
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">{language.proxyAPIKey}</span>
                                <TextInput fullwidth hideText={DBState.db.hideApiKey} size={"sm"} placeholder="leave it blank if it hasn't password" bind:value={DBState.db.proxyKey} />
                            </div>
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">{language.proxyRequestModel}</span>
                                <TextInput fullwidth size={"sm"} bind:value={DBState.db.customProxyRequestModel} placeholder="Name" />
                            </div>
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">{language.format}</span>
                                <SelectInput className="w-full" value={DBState.db.customAPIFormat.toString()} onchange={(e) => {
                                    DBState.db.customAPIFormat = parseInt(e.currentTarget.value) as LLMFormat
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
                            </div>
                        {/if}
                        {#if isProviderShownForRole(role, info.provider === LLMProvider.Cohere, modelInfo.provider === LLMProvider.Cohere)}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">Cohere {language.apiKey}</span>
                                <TextInput fullwidth hideText={DBState.db.hideApiKey} size={"sm"} bind:value={DBState.db.cohereAPIKey} />
                            </div>
                        {/if}
                        {#if isModelShownForRole(role, modelId, 'ollama-hosted') || isModelShownForRole(role, modelId, 'ollama-cloud')}
                            {#if modelId === 'ollama-hosted'}
                                <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                    <span class="text-sm font-medium text-textcolor">Ollama URL</span>
                                    <TextInput fullwidth size={"sm"} bind:value={DBState.db.ollamaURL} />
                                </div>
                            {/if}

                            {#if modelId === 'ollama-cloud'}
                                <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                    <span class="text-sm font-medium text-textcolor">Ollama {language.model}</span>
                                    <SegmentedControl
                                        bind:value={DBState.db.ollamaInputMode}
                                        options={[
                                            { value: 'list', label: (language as any).nanoGPTSelectFromList || 'Select from List' },
                                            { value: 'manual', label: (language as any).nanoGPTManualInput || 'Manual Input' }
                                        ]}
                                        size="md"
                                    />
                                </div>

                                {#if DBState.db.ollamaInputMode === 'manual'}
                                    <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                        <span class="text-sm font-medium text-textcolor">Ollama {language.model}</span>
                                        <TextInput fullwidth size={"sm"} bind:value={DBState.db.ollamaCloudModel} placeholder="Model" oninput={() => DBState.db.ollamaCloudModelName = ''} />
                                    </div>
                                {:else}
                                    {#await getOllamaModels(DBState.db.ollamaURL, 'cloud', DBState.db.ollamaApiKey)}
                                        <ModelGrid bind:value={DBState.db.ollamaCloudModel} loading={true} />
                                    {:then cloudModels}
                                        <ModelGrid
                                            bind:value={DBState.db.ollamaCloudModel}
                                            items={cloudModels ?? []}
                                            selectedLabelOverride={DBState.db.ollamaCloudModel ? `Cloud / ${DBState.db.ollamaCloudModelName || DBState.db.ollamaCloudModel}` : undefined}
                                            onselect={(_id, name) => {
                                                DBState.db.ollamaModelSource = 'cloud'
                                                DBState.db.ollamaCloudModelName = name
                                            }}
                                        />
                                    {/await}
                                {/if}

                                <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                    <span class="text-sm font-medium text-textcolor">Ollama {language.apiKey}</span>
                                    <TextInput fullwidth hideText={DBState.db.hideApiKey} size={"sm"} bind:value={DBState.db.ollamaApiKey} />
                                </div>

                                <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                    <span class="text-sm font-medium text-textcolor">Ollama {language.format}</span>
                                    <SelectInput className="w-full" value={DBState.db.ollamaRequestFormat.toString()} onchange={(e) => {
                                        DBState.db.ollamaRequestFormat = parseInt(e.currentTarget.value) as LLMFormat
                                    }}>
                                        <OptionInput value={LLMFormat.Ollama.toString()}>
                                            Ollama SDK
                                        </OptionInput>
                                        <OptionInput value={LLMFormat.OpenAICompatible.toString()}>
                                            OpenAI Compatible
                                        </OptionInput>
                                        <OptionInput value={LLMFormat.OpenAIResponseAPI.toString()}>
                                            OpenAI Response API
                                        </OptionInput>
                                        <OptionInput value={LLMFormat.Anthropic.toString()}>
                                            Anthropic Claude
                                        </OptionInput>
                                    </SelectInput>
                                </div>

                                <div class="flex items-center justify-between gap-3 border-t border-darkborderc/60 pt-3">
                                    <CheckInput bind:check={DBState.db.useStreaming} name={`Response ${language.streaming}`} />
                                </div>
                            {/if}

                            {#if modelId === 'ollama-hosted'}
                                <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                    <span class="text-sm font-medium text-textcolor">Ollama Model</span>
                                    <TextInput fullwidth size={"sm"} bind:value={DBState.db.ollamaModel} placeholder="Model" oninput={() => { DBState.db.ollamaModelSource = 'local'; DBState.db.ollamaModelName = '' }} />
                                </div>
                            {/if}

                            {#if modelId === 'ollama-hosted' || (modelId === 'ollama-cloud' && DBState.db.ollamaRequestFormat === LLMFormat.Ollama)}
                                <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                    <span class="text-sm font-medium text-textcolor">Ollama Thinking</span>
                                    <SelectInput className="w-full" bind:value={DBState.db.ollamaThinkingMode}>
                                        <OptionInput value="auto">
                                            Auto
                                        </OptionInput>
                                        <OptionInput value="off">
                                            Off
                                        </OptionInput>
                                        <OptionInput value="on">
                                            On
                                        </OptionInput>
                                        <OptionInput value="low">
                                            Low
                                        </OptionInput>
                                        <OptionInput value="medium">
                                            Medium
                                        </OptionInput>
                                        <OptionInput value="high">
                                            High
                                        </OptionInput>
                                    </SelectInput>
                                </div>
                            {/if}
                        {/if}
                        {#if isModelShownForRole(role, modelId, 'nanogpt')}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">NanoGPT {language.apiKey}</span>
                                <TextInput fullwidth hideText={DBState.db.hideApiKey} size={"sm"} bind:value={DBState.db.nanogptKey} />
                            </div>

                            <NanoGPTDashboard apiKey={DBState.db.nanogptKey} />

                            {#if DBState.db.nanogptSubscriptionState === 'active' || DBState.db.nanogptSubscriptionState === 'grace'}
                                <div class="flex items-center border-t border-darkborderc/60 pt-3">
                                    <CheckInput bind:check={DBState.db.nanogptUseSubscriptionEndpoint} name={language.nanoGPTUseSubscriptionEndpoint} />
                                </div>
                            {/if}

                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">NanoGPT {language.model}</span>
                                <SegmentedControl
                                    bind:value={nanogptInputMode}
                                    options={[
                                        { value: 'list', label: (language as any).nanoGPTSelectFromList || 'Select from List' },
                                        { value: 'manual', label: (language as any).nanoGPTManualInput || 'Manual Input' }
                                    ]}
                                    size="md"
                                />
                            </div>

                            {#if nanogptInputMode === 'manual'}
                                <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                    <span class="text-sm font-medium text-textcolor">NanoGPT {language.model}</span>
                                    <TextInput fullwidth size={"sm"} bind:value={DBState.db.nanogptRequestModel} placeholder={(language as any).nanoGPTManualModelSelect || "Manual Model Select"} oninput={() => DBState.db.nanogptRequestModelName = ''}/>
                                </div>
                            {:else}
                                {#await Promise.all([getNanoGPTModels(), getNanoGPTSubscriptionModels(DBState.db.nanogptKey)])}
                                    <ModelGrid bind:value={DBState.db.nanogptRequestModel} loading={true} />
                                {:then [regular, sub]}
                                    <ModelGrid
                                        bind:value={DBState.db.nanogptRequestModel}
                                        items={DBState.db.nanogptUseSubscriptionEndpoint ? (sub ?? []).map(ngToGridItem) : (regular ?? []).map(ngToGridItem)}
                                        showSubBadge={DBState.db.nanogptUseSubscriptionEndpoint}
                                        selectedLabelOverride={DBState.db.nanogptRequestModel && !DBState.db.nanogptRequestModelName ? DBState.db.nanogptRequestModel : undefined}
                                        onselect={(_id, name) => { DBState.db.nanogptRequestModelName = name }}
                                    />
                                    {#if !DBState.db.nanogptUseSubscriptionEndpoint}
                                        <NanoGPTProviderPicker
                                            apiKey={DBState.db.nanogptKey}
                                            modelId={DBState.db.nanogptRequestModel}
                                            bind:value={DBState.db.nanogptProvider}
                                        />
                                    {/if}
                                {/await}
                            {/if}
                        {/if}
                        {#if isModelShownForRole(role, modelId, 'openrouter')}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">OpenRouter {language.apiKey}</span>
                                <TextInput fullwidth hideText={DBState.db.hideApiKey} size={"sm"} bind:value={DBState.db.openrouterKey} />
                            </div>

                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-start">
                                <span class="text-sm font-medium text-textcolor md:pt-2">OpenRouter {language.model}</span>
                                {#await getOpenRouterModels()}
                                    <ModelGrid bind:value={DBState.db.openrouterRequestModel} pinnedItems={openrouterPinnedItems} loading={true} />
                                {:then m}
                                    <ModelGrid bind:value={DBState.db.openrouterRequestModel} items={(m ?? []).map(orToGridItem)} pinnedItems={openrouterPinnedItems} />
                                {/await}
                            </div>
                        {/if}
                        {#if isModelShownForRole(role, modelId, 'openrouter') || isModelShownForRole(role, modelId, 'reverse_proxy')}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">{language.tokenizer}</span>
                                <SelectInput className="w-full" bind:value={DBState.db.customTokenizer}>
                                    {#each tokenizerList as entry}
                                        <OptionInput value={entry[0]}>{entry[1]}</OptionInput>
                                    {/each}
                                </SelectInput>
                            </div>
                        {/if}
                        {#if isProviderShownForRole(role, info.provider === LLMProvider.OpenAI, modelInfo.provider === LLMProvider.OpenAI)}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">OpenAI {language.apiKey} <Help key="oaiapikey"/></span>
                                <TextInput fullwidth hideText={DBState.db.hideApiKey} size={"sm"} bind:value={DBState.db.openAIKey} placeholder="sk-XXXXXXXXXXXXXXXXXXXX"/>
                            </div>
                        {/if}

                        {#if info.keyIdentifier && (role !== 'sub' || info.keyIdentifier !== modelInfo.keyIdentifier)}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">{info.name} {language.apiKey}</span>
                                <TextInput fullwidth hideText={DBState.db.hideApiKey} size={"sm"} bind:value={DBState.db.OaiCompAPIKeys[info.keyIdentifier]} placeholder="..."/>
                            </div>
                        {/if}

                        <div class="flex flex-col gap-2 border-t border-darkborderc/60 pt-3">
                            {#if modelId !== 'ollama-cloud' && info.flags.includes(LLMFlags.hasStreaming)}
                                <Check bind:check={DBState.db.useStreaming} name={`Response ${language.streaming}`}/>

                                {#if DBState.db.useStreaming && info.flags.includes(LLMFlags.geminiThinking)}
                                    <Check bind:check={DBState.db.streamGeminiThoughts} name={`Stream Gemini Thoughts`}/>
                                {/if}
                            {/if}

                            {#if isModelShownForRole(role, modelId, 'reverse_proxy')}
                                <Check bind:check={DBState.db.reverseProxyOobaMode} name={`${language.reverseProxyOobaMode}`}/>
                            {/if}
                            {#if isProviderShownForRole(role, info.provider === LLMProvider.NovelAI, modelInfo.provider === LLMProvider.NovelAI)}
                                <Check bind:check={DBState.db.NAIadventure} name={language.textAdventureNAI}/>

                                <Check bind:check={DBState.db.NAIappendName} name={language.appendNameNAI}/>
                            {/if}
                        </div>

                        {#if isModelShownForRole(role, modelId, 'custom')}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">{language.plugin}</span>
                                <SelectInput className="w-full" bind:value={DBState.db.currentPluginProvider}>
                                    <OptionInput value="">None</OptionInput>
                                    {#each $customProviderStore as plugin}
                                        <OptionInput value={plugin}>{plugin}</OptionInput>
                                    {/each}
                                </SelectInput>
                            </div>
                        {/if}

                        {#if isModelShownForRole(role, modelId, 'kobold')}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">Kobold URL</span>
                                <TextInput fullwidth size={"sm"} bind:value={DBState.db.koboldURL} />
                            </div>
                        {/if}

                        {#if isModelShownForRole(role, modelId, 'echo_model')}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-start">
                                <span class="text-sm font-medium text-textcolor md:pt-2">Echo Message</span>
                                <TextAreaInput margin="bottom" bind:value={DBState.db.echoMessage} placeholder={"The message you want to receive as the bot's response\n(e.g., Lumi tilts her head, her white hair sliding down as her pretty green and aqua eyes sparkle…)"}/>
                            </div>
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">Echo Delay (Seconds)</span>
                                <NumberInput marginBottom={true} bind:value={DBState.db.echoDelay} min={0}/>
                            </div>
                        {/if}

                        {#if isPrefixShownForRole(role, modelId, 'horde')}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">Horde {language.apiKey}</span>
                                <TextInput fullwidth hideText={DBState.db.hideApiKey} size={"sm"} bind:value={DBState.db.hordeConfig.apiKey} />
                            </div>
                        {/if}
                        {#if isModelShownForRole(role, modelId, 'textgen_webui') || isModelShownForRole(role, modelId, 'mancer')}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">Blocking {language.providerURL}</span>
                                <TextInput fullwidth size={"sm"} bind:value={DBState.db.textgenWebUIBlockingURL} placeholder="https://..."/>
                            </div>
                            <span class="text-draculared text-xs">You must use textgen webui with --public-api</span>
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">Stream {language.providerURL}</span>
                                <TextInput fullwidth size={"sm"} bind:value={DBState.db.textgenWebUIStreamURL} placeholder="wss://..."/>
                            </div>
                            {#if !isTauri}
                                <span class="text-draculared text-xs">You are using web version. you must use ngrok or other tunnels to use your local webui.</span>
                            {/if}
                            <span class="text-draculared text-xs">Warning: For Ooba version over 1.7, use "Ooba" as model, and use url like http://127.0.0.1:5000/v1/chat/completions</span>
                        {/if}
                        {#if isModelShownForRole(role, modelId, 'ooba')}
                            <div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
                                <span class="text-sm font-medium text-textcolor">Ooba {language.providerURL}</span>
                                <TextInput fullwidth size={"sm"} bind:value={DBState.db.textgenWebUIBlockingURL} placeholder="https://..."/>
                            </div>
                        {/if}
                        {#if isPrefixShownForRole(role, modelId, 'horde') || isModelShownForRole(role, modelId, 'kobold')}
                            <div class="rounded-md border border-darkborderc/80 bg-darkbg/40 p-3">
                                <ChatFormatSettings />
                            </div>
                        {/if}
                        {/if}
            </Accordion>
        {/snippet}

        {@render ModelCard('main')}
        {@render ModelCard('sub')}

        <div class="mt-2 rounded-md border border-darkborderc/80 bg-darkbg/35 p-3">
            <div class="grid gap-3">
                <Check bind:check={DBState.db.seperateModelsForAxModels} name={language.seperateModelsForAxModels}></Check>
                {#if DBState.db.seperateModelsForAxModels}
                    <Check bind:check={DBState.db.doNotChangeSeperateModels} name={language.doNotChangeSeperateModels}></Check>
                {/if}
            </div>
        </div>

        {#if DBState.db.seperateModelsForAxModels}
            {#each auxModelRoles as role}
                {@render ModelCard(role)}
            {/each}
        {/if}
    </div>
{/if}

{#if submenu === 1 || submenu === -1}
    <!-- Data-driven basic parameters -->
    <SettingRenderer items={allBasicParameterItems} {modelInfo} {subModelInfo} />
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
        <!-- Standard parameters now handled by SettingRenderer above -->
    {/if}

    {#if (DBState.db.reverseProxyOobaMode && DBState.db.aiModel === 'reverse_proxy') || (DBState.db.aiModel === 'ooba')}
        <OobaSettings instructionMode={DBState.db.aiModel === 'ooba'} />
    {/if}

    {#if DBState.db.aiModel.startsWith('openrouter')}
        <OpenrouterSettings />
    {/if}

    <!-- Separate Parameters - handled by custom component -->
    <SeparateParametersSection />
{/if}

{#if submenu === 3 || submenu === -1}
    <Accordion styled name="Bias " help="bias">
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
    </Accordion>

    <Accordion styled name="{language.additionalParams} " help="additionalParams">
        <table class="contain w-full max-w-full tabler">
            <tbody>
            <tr>
                <th class="font-medium">{language.key}</th>
                <th class="font-medium">{language.value}</th>
                <th>
                    <button class="font-medium cursor-pointer hover:text-green-500 w-full flex justify-center items-center" onclick={() => {
                        DBState.db.additionalParams.push(['', ''])
                    }}><PlusIcon /></button>
                </th>
            </tr>
            {#if DBState.db.additionalParams.length === 0}
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
    </Accordion>


    <Accordion styled name={language.promptTemplate}>
        {#if DBState.db.promptTemplate}
            {#if submenu !== -1}
                <PromptSettings mode='inline' subMenu={1} />
            {/if}
        {:else}
            <Check check={false} name={language.usePromptTemplate} onChange={() => {
                DBState.db.promptTemplate = []
            }}/>
        {/if}
    </Accordion>

    {#snippet CustomFlagButton(name:string,flag:number)}
        <Button className="mt-2" onclick={(e) => {
            if(DBState.db.customFlags.includes(flag as LLMFlags)){
                DBState.db.customFlags = DBState.db.customFlags.filter((f) => f !== flag)
            }
            else{
                DBState.db.customFlags.push(flag as LLMFlags)
            }
        }} styled={DBState.db.customFlags.includes(flag as LLMFlags) ? 'primary' : 'outlined'}>
            {name}
        </Button>
    {/snippet}

    <Accordion styled name={language.customFlags}>
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
            {@render CustomFlagButton('noCivilIntegrity', 20)}
            {@render CustomFlagButton('claudeThinking', 21)}
            {@render CustomFlagButton('claudeAdaptiveThinking', 22)}
            {@render CustomFlagButton('claudeXHighEffort', 23)}
            {@render CustomFlagButton('deepSeekThinkingToggle', 24)}

        {/if}
    </Accordion>

    <Accordion styled name={language.moduleIntergration} help="moduleIntergration">
        <TextAreaInput bind:value={DBState.db.moduleIntergration} fullwidth height={"32"} autocomplete="off"/>
    </Accordion>

    <Accordion styled name={language.tools}>
        <Check name={language.search} check={DBState.db.modelTools.includes('search')} onChange={() => {
            if(DBState.db.modelTools.includes('search')){
                DBState.db.modelTools = DBState.db.modelTools.filter((tool) => tool !== 'search')
            }
            else{
                DBState.db.modelTools.push('search')
            }
        }} />
    </Accordion>
    
    <Accordion styled name={language.regexScript}>
        <RegexList bind:value={DBState.db.presetRegex} buttons />
    </Accordion>

    <Accordion styled name={language.icon}>
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
    </Accordion>
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

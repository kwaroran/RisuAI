<script lang="ts">
    import { alertGenerationInfoStore } from "../../ts/alert";
    
    import { DBState } from 'src/ts/stores.svelte';
    import { getCharImage } from '../../ts/characters';
    import { ParseMarkdown } from '../../ts/parser.svelte';
    import BarIcon from '../SideBars/BarIcon.svelte';
    import { ChevronRightIcon, User } from '@lucide/svelte';
    import { hubURL, isCharacterHasAssets } from 'src/ts/characterCards';
    import TextInput from '../UI/GUI/TextInput.svelte';
    import { aiLawApplies, openURL, getFetchLogs } from 'src/ts/globalApi.svelte';
    import Button from '../UI/GUI/Button.svelte';
    import { XIcon, ChevronDownIcon, ChevronUpIcon, CopyIcon, CheckIcon } from "@lucide/svelte";
    import hljs from 'highlight.js/lib/core';
    import json from 'highlight.js/lib/languages/json';
    import SelectInput from "../UI/GUI/SelectInput.svelte";
    import OptionInput from "../UI/GUI/OptionInput.svelte";
    import { language } from 'src/lang';
    import { getFetchData } from 'src/ts/globalApi.svelte';
    import { alertStore, selectedCharID } from "src/ts/stores.svelte";
    import { tokenize } from "src/ts/tokenizer";
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import ModuleChatMenu from "../Setting/Pages/Module/ModuleChatMenu.svelte";
    import { ColorSchemeTypeStore } from "src/ts/gui/colorscheme";
    import Help from "./Help.svelte";
    import { getChatBranches } from "src/ts/gui/branches";
    import { getCurrentCharacter } from "src/ts/storage/database.svelte";
    import { translateStackTrace } from "../../ts/sourcemap";

    let showDetails = $state(false);
    let translatedStackTrace = $state('');
    let isTranslated = $state(false);
    let isTranslating = $state(false);

    let btn
    let input = $state('')
    let cardExportType = $state('realm')
    let cardExportType2 = $state('')
    let cardLicense = $state('')
    let generationInfoMenuIndex = $state(0)
    let branchHover:null|{
        x:number,
        y:number,
        content:string,
    } = $state(null)
    let expandedLogs: Set<number> = $state(new Set())
    let allExpanded = $state(false)
    let copiedKey: string | null = $state(null)

    // Register JSON language for syntax highlighting
    if (!hljs.getLanguage('json')) {
        hljs.registerLanguage('json', json)
    }

    function highlightJson(code: string): string {
        try {
            return hljs.highlight(code, { language: 'json' }).value
        } catch {
            return code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        }
    }

    async function copyToClipboard(text: string, key: string) {
        try {
            await navigator.clipboard.writeText(text)
        } catch {
            // fallback
            const textarea = document.createElement('textarea')
            textarea.value = text
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
        }
        copiedKey = key
        setTimeout(() => {
            if (copiedKey === key) copiedKey = null
        }, 1500)
    }
    $effect.pre(() => {
        showDetails = false;
        translatedStackTrace = '';
        isTranslated = false;
        isTranslating = false;
        if(btn){
            btn.focus()
        }
        if($alertStore.type !== 'input'){
            input = ''
        }
        if($alertStore.type !== 'branches'){
            branchHover = null
        }
        if($alertStore.type !== 'cardexport'){
            cardExportType = 'realm'
            cardExportType2 = ''
            cardLicense = ''
        }
        if($alertStore.type !== 'requestlogs'){
            expandedLogs = new Set()
            allExpanded = false
        }
    });

    $effect(() => {
        if (showDetails) {
            const shouldAutoTranslate = DBState.db.sourcemapTranslate;
            isTranslated = shouldAutoTranslate;
            if (shouldAutoTranslate && !translatedStackTrace) {
                loadTranslatedTrace();
            }
        }
    });

    async function loadTranslatedTrace() {
        if (isTranslating || translatedStackTrace) return;
        isTranslating = true;
        try {
            translatedStackTrace = await translateStackTrace($alertStore.stackTrace);
        } catch (e) {
            console.error("Failed to translate stack trace:", e);
            isTranslated = false;
        } finally {
            isTranslating = false;
        }
    }

    async function handleToggleTranslate() {
        if (!isTranslated && !translatedStackTrace) {
            await loadTranslatedTrace();
        }
        isTranslated = !isTranslated;
    }

    const beautifyJSON = (data:string) =>{
        try {
            return JSON.stringify(JSON.parse(data), null, 2)
        } catch (error) {
            return data
        }
    }
</script>

<svelte:window onmessage={async (e) => {
    if(e.origin.startsWith("https://sv.risuai.xyz") || e.origin.startsWith("https://nightly.sv.risuai.xyz") || e.origin.startsWith("http://127.0.0.1") || e.origin === window.location.origin){
        if(e.data.msg?.data?.vaild && $alertStore.type === 'login'){
            $alertStore = {
                type: 'none',
                msg: JSON.stringify(e.data.msg)
            }
        }
    }
}}></svelte:window>

{#if $alertStore.type !== 'none' &&  $alertStore.type !== 'toast' &&  $alertStore.type !== 'cardexport' && $alertStore.type !== 'branches' && $alertStore.type !== 'selectModule' && $alertStore.type !== 'pukmakkurit' && $alertStore.type !== 'requestlogs'}
    <div class="absolute w-full h-full z-50 bg-black/50 flex justify-center items-center" class:vis={ $alertStore.type === 'wait2'}>
        <div class="bg-darkbg p-4 break-any rounded-md flex flex-col max-w-3xl  max-h-full overflow-y-auto">
            {#if $alertStore.type === 'error'}
                <h2 class="text-red-700 mt-0 mb-2 w-40 max-w-full">Error</h2>
            {:else if $alertStore.type === 'ask'}
                <h2 class="text-green-700 mt-0 mb-2 w-40 max-w-full">Confirm</h2>
            {:else if $alertStore.type === 'pluginconfirm'}
                <h2 class="text-green-700 mt-0 mb-2 w-40 max-w-full">Plugin Import</h2>
            {:else if $alertStore.type === 'selectChar'}
                <h2 class="text-green-700 mt-0 mb-2 w-40 max-w-full">Select</h2>
            {:else if $alertStore.type === 'input'}
                <h2 class="text-green-700 mt-0 mb-2 w-40 max-w-full">Input</h2>
            {/if}
            {#if $alertStore.type === 'markdown'}
                <div class="overflow-y-auto">
                    <span class="text-gray-300 chattext prose chattext2" class:prose-invert={$ColorSchemeTypeStore}>
                        {#await ParseMarkdown($alertStore.msg) then msg}
                            {@html msg}                        
                        {/await}
                    </span>
                </div>
            {:else if $alertStore.type === 'tos'}
                <!-- svelte-ignore a11y_missing_attribute -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <div class="text-textcolor">You should accept <a role="button" tabindex="0" class="text-green-600 hover:text-green-500 transition-colors duration-200 cursor-pointer" onclick={() => {
                    openURL('https://sv.risuai.xyz/hub/tos')
                }}>Terms of Service</a> to continue</div>
            {:else if $alertStore.type === 'pluginconfirm'}
                {@const parts = $alertStore.msg.split('\n\n')}
                {@const mainPart = parts[0]}
                {@const confirmMessage = parts[1]}
                {@const mainParts = mainPart.split('\n')}
                {@const pluginName = mainParts[0]}
                {@const warnings = mainParts.slice(1)}
                <div class="plugin-confirm-content">
                    <p class="plugin-name">{pluginName}</p>
                    {#if warnings.length > 0}
                        <ul class="warnings-list">
                            {#each warnings as warning}
                                <li class="warning-item">{warning}</li>
                            {/each}
                        </ul>
                    {/if}
                    <p class="confirm-message">{confirmMessage}</p>
                </div>
            {:else if $alertStore.type !== 'select' && $alertStore.type !== 'requestdata' && $alertStore.type !== 'addchar' && $alertStore.type !== 'hypaV2' && $alertStore.type !== 'chatOptions'}
                <span class="text-gray-300 whitespace-pre-wrap">{$alertStore.msg}</span>
                {#if $alertStore.submsg && $alertStore.type !== 'progress'}
                    <span class="text-gray-500 text-sm">{$alertStore.submsg}</span>
                {/if}

                {#if $alertStore.type === 'error' && $alertStore.stackTrace}
                    <div class="mt-4">
                        <Button styled="outlined" size="sm" onclick={() => showDetails = !showDetails}>
                            {showDetails ? language.hideErrorDetails : language.showErrorDetails}
                            {#if showDetails}
                                <XIcon class="inline ml-2" />
                            {:else}
                                <ChevronRightIcon class="inline ml-2" />
                            {/if}
                        </Button>
                        {#if showDetails}
                            <Button styled="outlined" size="sm" onclick={handleToggleTranslate} disabled={isTranslating} className="ml-2">
                                {#if isTranslating}
                                    {language.translating}
                                {:else if isTranslated}
                                    {language.showOriginal}
                                {:else}
                                    {language.translateCode}
                                {/if}
                            </Button>
                            <pre class="stack-trace">{@html isTranslated ? translatedStackTrace : $alertStore.stackTrace}</pre>
                        {/if}
                    </div>
                {/if}
            {/if}
            {#if $alertStore.type === 'progress'}
                <div class="w-full min-w-64 md:min-w-138 h-2 bg-darkbg border border-darkborderc rounded-md mt-6">
                    <div class="h-full bg-linear-to-r from-blue-500 to-purple-800 saving-animation transition-[width]" style:width={$alertStore.submsg + '%'}></div>
                </div>
                <div class="w-full flex justify-center mt-6">
                    <span class="text-gray-500 text-sm">{$alertStore.submsg + '%'}</span>
                </div>
            {/if}

            {#if $alertStore.type === 'ask' || $alertStore.type === 'pluginconfirm'}
                <div class="flex gap-2 w-full">
                    <Button className="mt-4 grow" onclick={() => {
                        alertStore.set({
                            type: 'none',
                            msg: 'yes'
                        })
                    }}>YES</Button>
                    <Button className="mt-4 grow" onclick={() => {
                        alertStore.set({
                            type: 'none',
                            msg: 'no'
                        })
                    }}>NO</Button>
                </div>
            {:else if $alertStore.type === 'tos'}
                <div class="flex gap-2 w-full">
                    <Button className="mt-4 grow" onclick={() => {
                        alertStore.set({
                            type: 'none',
                            msg: 'yes'
                        })
                    }}>Accept</Button>
                    <Button styled={'outlined'} className="mt-4 grow" onclick={() => {
                        alertStore.set({
                            type: 'none',
                            msg: 'no'
                        })
                    }}>Do not Accept</Button>
                </div>
            {:else if $alertStore.type === 'select'}
                {@const hasDisplay = $alertStore.msg.startsWith('__DISPLAY__')}
                {#if hasDisplay}
                    {@const parts = $alertStore.msg.substring(11).split('||')}
                    <div class="mb-4 text-textcolor">{parts[0]}</div>
                    {#each parts.slice(1) as n, i}
                        <Button className="mt-4" onclick={() => {
                            alertStore.set({
                                type: 'none',
                                msg: i.toString()
                            })
                        }}>{n}</Button>
                    {/each}
                {:else}
                    {@const parts = $alertStore.msg.split('||')}
                    {#each parts as n, i}
                        <Button className="mt-4" onclick={() => {
                            alertStore.set({
                                type: 'none',
                                msg: i.toString()
                            })
                        }}>{n}</Button>
                    {/each}
                {/if}
            {:else if $alertStore.type === 'error' || $alertStore.type === 'normal' || $alertStore.type === 'markdown'}
               <Button className="mt-4" onclick={() => {
                    alertStore.set({
                        type: 'none',
                        msg: ''
                    })
                }}>OK</Button>
            {:else if $alertStore.type === 'input'}
                <TextInput value="" id="alert-input" autocomplete="off" marginTop list="alert-input-list" />
                <Button className="mt-4" onclick={() => {
                    alertStore.set({
                        type: 'none',
                        //@ts-expect-error 'value' doesn't exist on Element, but target is HTMLInputElement here
                        msg: document.querySelector('#alert-input')?.value
                    })
                }}>OK</Button>
                {#if $alertStore.datalist}
                    <datalist id="alert-input-list">
                        {#each $alertStore.datalist as item}
                            <option
                                value={item[0]}
                                label={item[1] ? item[1] : item[0]}
                            >{item[1] ? item[1] : item[0]}</option>
                        {/each}
                    </datalist>
                {/if}
            {:else if $alertStore.type === 'login'}
                <div class="fixed top-0 left-0 bg-black/50 w-full h-full flex justify-center items-center">
                    <iframe src={hubURL + '/hub/login'} title="login" class="w-full h-full">
                    </iframe>
                </div>
            {:else if $alertStore.type === 'selectChar'}
                <div class="flex w-full items-start flex-wrap gap-2 justify-start">
                    {#each DBState.db.characters as char, i}
                        {#if char.type !== 'group'}
                            {#if char.image}
                                {#await getCharImage(DBState.db.characters[i].image, 'css')}
                                    <BarIcon onClick={() => {
                                        alertStore.set({type: 'none',msg: char.chaId})
                                    }}>
                                        <User/>
                                    </BarIcon>
                                {:then im} 
                                    <BarIcon onClick={() => {
                                        alertStore.set({type: 'none',msg: char.chaId})
                                    }} additionalStyle={im} />
                                    
                                {/await}
                            {:else}
                                <BarIcon onClick={() => {
                                    alertStore.set({type: 'none',msg: char.chaId})
                                }}>
                                <User/>
                                </BarIcon>
                            {/if}
                        {/if}
                    {/each}
                </div>
            {:else if $alertStore.type === 'requestdata'}
                {#if aiLawApplies()}
                <div>
                    {language.generatedByAIDisclaimer}
                </div>
                {/if}
                <div class="flex flex-wrap gap-2">
                    <Button selected={generationInfoMenuIndex === 0} size="sm" onclick={() => {generationInfoMenuIndex = 0}}>
                        {language.tokens}
                    </Button>
                    <Button selected={generationInfoMenuIndex === 1} size="sm" onclick={() => {generationInfoMenuIndex = 1}}>
                        {language.metaData}
                    </Button>
                    <Button selected={generationInfoMenuIndex === 2} size="sm" onclick={() => {generationInfoMenuIndex = 2}}>
                        {language.log}
                    </Button>
                    <Button selected={generationInfoMenuIndex === 3} size="sm" onclick={() => {generationInfoMenuIndex = 3}}>
                        {language.prompt}
                    </Button>
                    <button class="ml-auto" onclick={() => {
                        alertStore.set({
                            type: 'none',
                            msg: ''
                        })
                    }}>✖</button>
                </div>
                {#if generationInfoMenuIndex === 0}
                    <div class="mt-4 flex justify-center w-full">
                        <div class="w-32 h-32 border-darkborderc border-4 rounded-lg" style:background={
                            `linear-gradient(0deg,
                            rgb(59,130,246) 0%,
                            rgb(59,130,246) ${($alertGenerationInfoStore.genInfo.inputTokens / $alertGenerationInfoStore.genInfo.maxContext) * 100}%,
                            rgb(34 197 94) ${($alertGenerationInfoStore.genInfo.inputTokens / $alertGenerationInfoStore.genInfo.maxContext) * 100}%,
                            rgb(34 197 94) ${(($alertGenerationInfoStore.genInfo.outputTokens + $alertGenerationInfoStore.genInfo.inputTokens) / $alertGenerationInfoStore.genInfo.maxContext) * 100}%,
                            rgb(156 163 175) ${(($alertGenerationInfoStore.genInfo.outputTokens + $alertGenerationInfoStore.genInfo.inputTokens) / $alertGenerationInfoStore.genInfo.maxContext) * 100}%,
                            rgb(156 163 175) 100%)`
                        }>

                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-y-2 gap-x-4 mt-4">
                        <span class="text-blue-500">{language.inputTokens}</span>
                        <span class="text-blue-500 justify-self-end">{$alertGenerationInfoStore.genInfo.inputTokens ?? '?'} {language.tokens}</span>
                        <span class="text-green-500">{language.outputTokens}</span>
                        <span class="text-green-500 justify-self-end">{$alertGenerationInfoStore.genInfo.outputTokens ?? '?'} {language.tokens}</span>
                        <span class="text-gray-400">{language.maxContextSize}</span>
                        <span class="text-gray-400 justify-self-end">{$alertGenerationInfoStore.genInfo.maxContext ?? '?'} {language.tokens}</span>
                    </div>
                    <span class="text-textcolor2 text-sm">{language.tokenWarning}</span>
                {/if}
                {#if generationInfoMenuIndex === 1}
                <div class="grid grid-cols-2 gap-y-2 gap-x-4 mt-4">
                    <span class="text-blue-500">Index</span>
                    <span class="text-blue-500 justify-self-end">{$alertGenerationInfoStore.idx}</span>
                    <span class="text-amber-500">Model</span>
                    <span class="text-amber-500 justify-self-end">{$alertGenerationInfoStore.genInfo.model}</span>
                    <span class="text-green-500">ID</span>
                    <span class="text-green-500 justify-self-end">{DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx].chatId ?? "None"}</span>
                    <span class="text-red-500">GenID</span>
                    <span class="text-red-500 justify-self-end">{$alertGenerationInfoStore.genInfo.generationId}</span>
                    <span class="text-cyan-500">Saying</span>
                    <span class="text-cyan-500 justify-self-end">{DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx].saying}</span>
                    <span class="text-purple-500">Size</span>
                    <span class="text-purple-500 justify-self-end">{JSON.stringify(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx]).length} Bytes</span>
                    <span class="text-yellow-500">Time</span>
                    <span class="text-yellow-500 justify-self-end">{(new Date(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx].time ?? 0)).toLocaleString()}</span>
                    {#if $alertGenerationInfoStore.genInfo.stageTiming}
                        {@const stage1 = parseFloat(((($alertGenerationInfoStore.genInfo.stageTiming.stage1 ?? 0) / 1000).toFixed(1)))}
                        {@const stage2 = parseFloat(((($alertGenerationInfoStore.genInfo.stageTiming.stage2 ?? 0) / 1000).toFixed(1)))}
                        {@const stage3 = parseFloat(((($alertGenerationInfoStore.genInfo.stageTiming.stage3 ?? 0) / 1000).toFixed(1)))}
                        {@const stage4 = parseFloat(((($alertGenerationInfoStore.genInfo.stageTiming.stage4 ?? 0) / 1000).toFixed(1)))}
                        {@const totalRounded = (stage1 + stage2 + stage3 + stage4).toFixed(1)}
                        <span class="text-gray-400">Timing</span>
                        <span class="text-gray-400 justify-self-end">
                            <span style="color: #60a5fa;">{stage1}</span> + 
                            <span style="color: #db2777;">{stage2}</span> + 
                            <span style="color: #34d399;">{stage3}</span> + 
                            <span style="color: #8b5cf6;">{stage4}</span> = 
                            <span class="text-white font-bold">{totalRounded}s</span>
                        </span>
                    {/if}

                    <span class="text-green-500">Tokens</span>
                    {#await tokenize(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx].data)}
                        <span class="text-green-500 justify-self-end">Loading</span>
                    {:then tokens} 
                        <span class="text-green-500 justify-self-end">{tokens}</span>
                    {/await}
                </div>
                {/if}
                {#if generationInfoMenuIndex === 2}
                    {#await getFetchData($alertStore.msg) then data} 
                        {#if !data}
                            <span class="text-gray-300 text-lg mt-2">{language.errors.requestLogRemoved}</span>
                            <span class="text-gray-500">{language.errors.requestLogRemovedDesc}</span>
                        {:else}
                            <h1 class="text-2xl font-bold my-4">URL</h1>
                            <code class="text-gray-300 border border-darkborderc p-2 rounded-md whitespace-pre-wrap">{data.url}</code>
                            <h1 class="text-2xl font-bold my-4">Request Body</h1>
                            <code class="text-gray-300 border border-darkborderc p-2 rounded-md whitespace-pre-wrap">{beautifyJSON(data.body)}</code>
                            <h1 class="text-2xl font-bold my-4">Response</h1>
                            <code class="text-gray-300 border border-darkborderc p-2 rounded-md whitespace-pre-wrap">{beautifyJSON(data.response)}</code>
                        {/if}
                    {/await}
                {/if}
                {#if generationInfoMenuIndex === 3}
                    {#if Object.keys(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx].promptInfo || {}).length === 0}
                        <div class="text-gray-300 text-lg mt-2">{language.promptInfoEmptyMessage}</div>
                    {:else}
                        <div class="grid grid-cols-2 gap-y-2 gap-x-4 mt-4">
                            <span class="text-blue-500">Preset Name</span>
                            <span class="text-blue-500 justify-self-end">{DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx].promptInfo.promptName}</span>
                            <span class="text-purple-500">Toggles</span>
                            <div class="col-span-2 max-h-32 overflow-y-auto border border-stone-500 rounded-sm p-2 bg-gray-900">
                                {#if DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx].promptInfo.promptToggles.length === 0}
                                    <div class="text-gray-500 italic text-center py-4">{language.promptInfoEmptyToggle}</div>
                                {:else}
                                    <div class="grid grid-cols-2 gap-y-2 gap-x-4">
                                        {#each DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx].promptInfo.promptToggles as toggle}
                                        <span class="text-gray-200 truncate">{toggle.key}</span>
                                        <span class="text-gray-200 justify-self-end truncate">{toggle.value}</span>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                            <span class="text-red-500">Prompt Text</span>
                            <div class="col-span-2 max-h-80 overflow-y-auto border border-stone-500 rounded-sm p-4 bg-gray-900">
                                {#if !DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx].promptInfo.promptText}
                                    <div class="text-gray-500 italic text-center py-4">{language.promptInfoEmptyText}</div>
                                {:else}
                                    {#each DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx].promptInfo.promptText as block}
                                        <div class="mb-2">
                                            <div class="font-bold text-gray-600">{block.role}</div>
                                            <pre class="whitespace-pre-wrap text-sm bg-stone-900 p-2 rounded-sm border border-stone-500">{block.content}</pre>
                                        </div>
                                    {/each}
                                {/if}
                            </div>
                        </div>
                    {/if}
                {/if}
            {:else if $alertStore.type === 'hypaV2'}
                <div class="flex flex-wrap gap-2 mb-4 max-w-full w-124">
                    <Button selected={generationInfoMenuIndex === 0} size="sm" onclick={() => {generationInfoMenuIndex = 0}}>
                        Chunks
                    </Button>
                    <Button selected={generationInfoMenuIndex === 1} size="sm" onclick={() => {generationInfoMenuIndex = 1}}>
                        Summarized
                    </Button>
                    <button class="ml-auto" onclick={() => {
                        alertStore.set({
                            type: 'none',
                            msg: ''
                        })
                    }}>✖</button>
                </div>
                {#if generationInfoMenuIndex === 0}
                    <div class="flex flex-col gap-2 w-full">
                        {#each DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].hypaV2Data.chunks as chunk, i}
                            <TextAreaInput bind:value={chunk.text} />
                        {/each}

                        <!-- Adding non-bound chunk is not okay, change the user flow to edit existing ones. -->
                    </div>
                {:else}
                    {#each DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].hypaV2Data.mainChunks as chunk, i} <!-- Summarized should be mainChunks, afaik. Be aware of that chunks are created with mainChunks, however this editing would not change related chunks. -->
                        <div class="flex flex-col p-2 rounded-md border-darkborderc border">
                            {#if i === 0}
                                <span class="text-green-500">Active</span>
                            {:else}
                                <span>Inactive</span>
                            {/if}
                            <TextAreaInput bind:value={chunk.text} />
                        </div>
                    {/each}
                {/if}
            {:else if $alertStore.type === 'addchar'}
                <div class="w-2xl flex flex-col max-w-full">

                    <button class="border-darkborderc border py-12 px-8 flex rounded-md hover:ring-2 justify-center items-center" onclick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        alertStore.set({
                            type: 'none',
                            msg: 'importFromRealm'
                        })
                    }}>
                        <div class="flex flex-col justify-start items-start">
                            <span class="text-2xl font-bold">{language.importFromRealm}</span>
                            <span class="text-textcolor2">{language.importFromRealmDesc}</span>
                        </div>
                        <div class="ml-9 float-right flex-1 flex justify-end">
                            <ChevronRightIcon />
                        </div>
                    </button>
                    <button class="border-darkborderc border py-2 px-8 flex rounded-md hover:ring-2 items-center mt-2" onclick={((e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        alertStore.set({
                            type: 'none',
                            msg: 'importCharacter'
                        })
                    })}>
                        <div class="flex flex-col justify-start items-start">
                            <span>{language.importCharacter}</span>
                        </div>
                        <div class="ml-9 float-right flex-1 flex justify-end">
                            <ChevronRightIcon />
                        </div>
                    </button>
                    <button class="border-darkborderc border py-2 px-8 flex rounded-md hover:ring-2 items-center mt-2" onclick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        alertStore.set({
                            type: 'none',
                            msg: 'createfromScratch'
                        })
                    }}>
                        <div class="flex flex-col justify-start items-start">
                            <span>{language.createfromScratch}</span>
                        </div>
                        <div class="ml-9 float-right flex-1 flex justify-end">
                            <ChevronRightIcon />
                        </div>
                    </button>
                    <button class="border-darkborderc border py-2 px-8 flex rounded-md hover:ring-2 items-center mt-2" onclick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        alertStore.set({
                            type: 'none',
                            msg: 'createGroup'
                        })
                    }}>
                        <div class="flex flex-col justify-start items-start">
                            <span>{language.createGroup}</span>
                        </div>
                        <div class="ml-9 float-right flex-1 flex justify-end">
                            <ChevronRightIcon />
                        </div>
                    </button>
                    <button class="border-darkborderc border py-2 px-8 flex rounded-md hover:ring-2 items-center mt-2" onclick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        alertStore.set({
                            type: 'none',
                            msg: 'cancel'
                        })
                    }}>
                        <div class="flex flex-col justify-start items-start">
                            <span>{language.cancel}</span>
                        </div>
                    </button>
                </div>
            {:else if $alertStore.type === 'chatOptions'}
                <div class="w-2xl flex flex-col max-w-full">
                    <h1 class="text-xl mb-4 font-bold">
                        {language.chatOptions}
                    </h1>
                    <button class="border-darkborderc border py-2 px-8 flex rounded-md hover:ring-2 items-center mt-2" onclick={() => {
                        alertStore.set({
                            type: 'none',
                            msg: '0'
                        })
                    }}>
                        <div class="flex flex-col justify-start items-start">
                            <span>{language.createCopy}</span>
                        </div>
                        <div class="ml-9 float-right flex-1 flex justify-end">
                            <ChevronRightIcon />
                        </div>
                    </button>
                    <button class="border-darkborderc border py-2 px-8 flex rounded-md hover:ring-2 items-center mt-2" onclick={() => {
                        alertStore.set({
                            type: 'none',
                            msg: '1'
                        })
                    }}>
                        <div class="flex flex-col justify-start items-start">
                            <span>{language.bindPersona}</span>
                        </div>
                        <div class="ml-9 float-right flex-1 flex justify-end">
                            <ChevronRightIcon />
                        </div>
                    </button>
                    {#if DBState.db.useExperimental}
                        <button class="border-darkborderc border py-2 px-8 flex rounded-md hover:ring-2 items-center mt-2" onclick={() => {
                            alertStore.set({
                                type: 'none',
                                msg: '2'
                            })
                        }}>
                            <div class="flex flex-col justify-start items-start">
                                <span>{language.createMultiuserRoom} <Help key="experimental"/></span>
                            </div>
                            <div class="ml-9 float-right flex-1 flex justify-end">
                                <ChevronRightIcon />
                            </div>
                        </button>
                    {/if}
                    <button class="border-darkborderc border py-2 px-8 flex rounded-md hover:ring-2 items-center mt-2" onclick={() => {
                        alertStore.set({
                            type: 'none',
                            msg: 'cancel'
                        })
                    }}>
                        <div class="flex flex-col justify-start items-start">
                            <span>{language.cancel}</span>
                        </div>
                    </button>
                </div>
            {/if}
        </div>
    </div>

{:else if $alertStore.type === 'cardexport'}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div  class="fixed top-0 left-0 h-full w-full bg-black/50 flex flex-col z-50 items-center justify-center" role="button" tabindex="0" onclick={close}>
        <div class="bg-darkbg rounded-md p-4 max-w-full flex flex-col w-2xl" role="button" tabindex="0" onclick={(e) => {
            e.stopPropagation()
        }}>
            <h1 class="font-bold text-2xl w-full">
                <span>
                    {language.shareExport}
                </span>
                <button class="float-right text-textcolor2 hover:text-green-500" onclick={() => {
                    alertStore.set({
                        type: 'none',
                        msg: JSON.stringify({
                            type: 'cancel',
                            type2: cardExportType2
                        })
                    })
                }}>
                    <XIcon />
                </button>
            </h1>
            <span class="text-textcolor mt-4">{language.type}</span>
            {#if cardExportType === ''}
                {#if $alertStore.submsg === 'module'}
                    <span class="text-textcolor2 text-sm">{language.risuMDesc}</span>
                {:else if $alertStore.submsg === 'preset'}
                    <span class="text-textcolor2 text-sm">{language.risupresetDesc}</span>
                    {#if cardExportType2 === 'preset' && (DBState.db.botPresets[DBState.db.botPresetsId].image || DBState.db.botPresets[DBState.db.botPresetsId].regex?.length > 0)}
                        <span class="text-red-500 text-sm">Use RisuRealm to share the preset. Preset with image or regexes cannot be exported for now.</span>
                    {/if}
                {:else}
                    <span class="text-textcolor2 text-sm">{language.ccv3Desc}</span>
                    {#if cardExportType2 !== 'charx' && cardExportType2 !== 'charxJpeg' && isCharacterHasAssets(DBState.db.characters[$selectedCharID])}
                        <span class="text-red-500 text-sm">{language.notCharxWarn}</span>
                    {/if}
                {/if}
            {:else if cardExportType === 'json'}
                <span class="text-textcolor2 text-sm">{language.jsonDesc}</span>
            {:else if cardExportType === 'ccv2'}
                <span class="text-textcolor2 text-sm">{language.ccv2Desc}</span>
                <span class="text-red-500 text-sm">{language.v2Warning}</span>
            {:else}
                <span class="text-textcolor2 text-sm">{language.realmDesc}</span>
            {/if}
            <div class="flex items-center flex-wrap mt-2">
                {#if $alertStore.submsg === 'preset'}
                    <button class="bg-bgcolor px-2 py-4 rounded-lg flex-1" class:ring-1={cardExportType === 'realm'} onclick={() => {cardExportType = 'realm'}}>RisuRealm</button>
                    <button class="bg-bgcolor px-2 py-4 rounded-lg ml-2 flex-1" class:ring-1={cardExportType === ''} onclick={() => {cardExportType = ''}}>Risupreset</button>
                {:else if $alertStore.submsg === 'module'}
                    <button class="bg-bgcolor px-2 py-4 rounded-lg ml-2 flex-1" class:ring-1={cardExportType === 'realm'} onclick={() => {cardExportType = 'realm'}}>RisuRealm</button>
                    <button class="bg-bgcolor px-2 py-4 rounded-lg flex-1" class:ring-1={cardExportType === ''} onclick={() => {cardExportType = ''}}>RisuM</button>
                {:else}
                    <button class="bg-bgcolor px-2 py-4 rounded-lg flex-1" class:ring-1={cardExportType === 'realm'} onclick={() => {cardExportType = 'realm'}}>RisuRealm</button>
                    <button class="bg-bgcolor px-2 py-4 rounded-lg ml-2 flex-1" class:ring-1={cardExportType === ''} onclick={() => {
                        cardExportType = ''
                        cardExportType2 = 'charxJpeg'
                    }}>Character Card V3</button>
                    <button class="bg-bgcolor px-2 py-4 rounded-lg ml-2 flex-1" class:ring-1={cardExportType === 'ccv2'} onclick={() => {cardExportType = 'ccv2'}}>Character Card V2</button>
                {/if}
            </div>
            {#if $alertStore.submsg === '' && cardExportType === ''}
                <span class="text-textcolor mt-4">{language.format}</span>
                <SelectInput bind:value={cardExportType2} className="mt-2">
                    <OptionInput value="charx">CHARX</OptionInput>
                    <OptionInput value="charxJpeg">CHARX-JPEG</OptionInput>
                    <OptionInput value="">PNG</OptionInput>
                    <OptionInput value="json">JSON</OptionInput>
                </SelectInput>
            {/if}
            <Button className="mt-4" onclick={() => {
                alertStore.set({
                    type: 'none',
                    msg: JSON.stringify({
                        type: cardExportType,
                        type2: cardExportType2
                    })
                })
            }}>{cardExportType === 'realm' ? language.shareCloud : language.export}</Button>
        </div>
    </div>

{:else if $alertStore.type === 'toast'}
    <div class="toast-anime absolute right-0 bottom-0 bg-darkbg p-4 break-any rounded-md flex flex-col max-w-3xl  max-h-11/12 overflow-y-auto z-50 text-textcolor"
        onanimationend={() => {
            alertStore.set({
                type: 'none',
                msg: ''
            })
        }}
    >{$alertStore.msg}</div>
{:else if $alertStore.type === 'selectModule'}
    <ModuleChatMenu alertMode close={(d) => {
        alertStore.set({
            type: 'none',
            msg: d
        })
    }} />
{:else if $alertStore.type === 'pukmakkurit'}
    <!-- Log Generator by dootaang, GPL3 -->
    <!-- Svelte, Typescript version by Kwaroran -->
    
    <div class="absolute w-full h-full z-50 bg-black/50 flex justify-center items-center">
        <div class="bg-darkbg p-4 break-any rounded-md flex flex-col max-w-3xl  max-h-full overflow-y-auto">
            <h2 class="text-green-700 mt-0 mb-2 w-40 max-w-full">{language.preview}</h2>

        </div>
    </div>
{:else if $alertStore.type === 'branches'}
    <div class="absolute w-full h-full z-50 bg-black/80 flex justify-center items-center overflow-x-auto overflow-y-auto">
        {#if branchHover !== null}
            <div class="z-30 whitespace-pre-wrap p-4 text-textcolor bg-darkbg border-darkborderc border rounded-md absolute text-white" style="top: {branchHover.y * 80 + 24}px; left: {(branchHover.x + 1) * 80 + 24}px">
                {branchHover.content}
            </div>
        {/if}

        <div class="x-50 right-2 top-2 absolute">
            <button class="bg-darkbg border-darkborderc border p-2 rounded-md" onclick={() => {
                alertStore.set({
                    type: 'none',
                    msg: ''
                })
            }}>
                <XIcon />
            </button>
        </div>

        {#each getChatBranches() as obj}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <div
                role="table"
                class="peer w-12 h-12 z-20 bg-bgcolor border border-darkborderc rounded-full flex justify-center items-center overflow-y-auto absolute"
                style="top: {obj.y * 80 + 24}px; left: {obj.x * 80 + 24}px"
                onmouseenter={() => {
                    if(branchHover === null){
                        const char = getCurrentCharacter()
                        branchHover = {
                            x: obj.x,
                            y: obj.y,
                            content: char.chats[obj.chatId].message[obj.y - 1].data
                        }
                    }
                }}
                onclick={() => {
                    if(branchHover === null){
                        const char = getCurrentCharacter()
                        branchHover = {
                            x: obj.x,
                            y: obj.y,
                            content: char.chats[obj.chatId].message[obj.y - 1].data
                        }
                    }
                }}
                onmouseleave={() => {
                    branchHover = null
                }}
            >
                
            </div>
            {#if obj.connectX === obj.x}
                {#if obj.multiChild}
                    <div class="w-0 h-20 border-x border-x-red-500 absolute" style="top: {(obj.y-1) * 80 + 24}px; left: {obj.x * 80 + 45}px">

                    </div>
                {:else}
                    <div class="w-0 h-20 border-x border-x-blue-500 absolute" style="top: {(obj.y-1) * 80 + 24}px; left: {obj.x * 80 + 45}px">

                    </div>
                {/if}
            {:else if obj.connectX !== -1}
                <div class="w-0 h-10 border-x border-x-red-500 absolute" style="top: {(obj.y) * 80}px; left: {obj.x * 80 + 45}px">

                </div>
                <div class="h-0 border-y border-y-red-500 absolute" style="top: {(obj.y) * 80}px; left: {obj.connectX * 80 + 46}px" style:width={Math.abs((obj.x - obj.connectX) * 80) + 'px'}>

                </div>
            {/if}
        {/each}
    </div>
{:else if $alertStore.type === 'requestlogs'}
    {@const logs = getFetchLogs()}
    <div class="fixed inset-0 z-50 bg-black/80 flex justify-center items-start overflow-y-auto p-4">
        <div class="bg-darkbg rounded-lg w-full max-w-4xl my-4 flex flex-col max-h-[90vh]">
            <div class="flex items-center justify-between p-4 border-b border-darkborderc sticky top-0 bg-darkbg z-10">
                <h1 class="text-xl font-bold text-textcolor">{language.ShowLog}</h1>
                <div class="flex items-center gap-2">
                    <Button size="sm" onclick={() => {
                        if(allExpanded) {
                            expandedLogs = new Set()
                        } else {
                            expandedLogs = new Set(logs.map((_, i) => i))
                        }
                        allExpanded = !allExpanded
                    }}>
                        {allExpanded ? language.collapseAll : language.expandAll}
                    </Button>
                    <button class="text-textcolor2 hover:text-textcolor p-1" onclick={() => {
                        alertStore.set({ type: 'none', msg: '' })
                    }}>
                        <XIcon />
                    </button>
                </div>
            </div>
            <div class="flex-1 overflow-y-auto p-4">
                {#if logs.length === 0}
                    <div class="text-textcolor2 text-center py-8">{language.noRequestLogs}</div>
                {:else}
                    <div class="flex flex-col gap-2">
                        {#each logs as log, i}
                            {@const isExpanded = expandedLogs.has(i)}
                            <div class="border border-darkborderc rounded-lg overflow-hidden">
                                <button
                                    class="w-full flex items-center justify-between p-3 hover:bg-bgcolor/50 transition-colors"
                                    onclick={() => {
                                        const newSet = new Set(expandedLogs)
                                        if(isExpanded) {
                                            newSet.delete(i)
                                        } else {
                                            newSet.add(i)
                                        }
                                        expandedLogs = newSet
                                    }}
                                >
                                    <div class="flex items-center gap-3 min-w-0 flex-1">
                                        <span class="px-2 py-1 rounded text-xs font-bold font-mono {log.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}">
                                            {log.status ?? (log.success ? 'OK' : 'ERR')}
                                        </span>
                                        <span class="text-textcolor text-sm truncate flex-1 text-left font-mono" title={log.url}>
                                            {log.url}
                                        </span>
                                        <span class="text-textcolor text-xs whitespace-nowrap opacity-70">{log.date}</span>
                                    </div>
                                    <div class="ml-2 text-textcolor">
                                        {#if isExpanded}
                                            <ChevronUpIcon size={20} />
                                        {:else}
                                            <ChevronDownIcon size={20} />
                                        {/if}
                                    </div>
                                </button>
                                {#if isExpanded}
                                    <div class="border-t border-darkborderc p-4 bg-bgcolor/30">
                                        <div class="space-y-4">
                                            <div>
                                                <div class="flex items-center justify-between mb-2">
                                                    <span class="text-textcolor text-sm font-semibold">URL</span>
                                                    <button
                                                        class="p-1 rounded hover:bg-bgcolor transition-colors {copiedKey === `${i}-url` ? 'text-green-500' : 'text-textcolor2 hover:text-textcolor'}"
                                                        onclick={(e) => { e.stopPropagation(); copyToClipboard(log.url, `${i}-url`) }}
                                                        title="Copy"
                                                    >
                                                        {#if copiedKey === `${i}-url`}
                                                            <CheckIcon size={14} />
                                                        {:else}
                                                            <CopyIcon size={14} />
                                                        {/if}
                                                    </button>
                                                </div>
                                                <pre class="request-log-code hljs text-sm">{log.url}</pre>
                                            </div>
                                            <div>
                                                <div class="flex items-center justify-between mb-2">
                                                    <span class="text-textcolor text-sm font-semibold">Request Body</span>
                                                    <button
                                                        class="p-1 rounded hover:bg-bgcolor transition-colors {copiedKey === `${i}-body` ? 'text-green-500' : 'text-textcolor2 hover:text-textcolor'}"
                                                        onclick={(e) => { e.stopPropagation(); copyToClipboard(log.body, `${i}-body`) }}
                                                        title="Copy"
                                                    >
                                                        {#if copiedKey === `${i}-body`}
                                                            <CheckIcon size={14} />
                                                        {:else}
                                                            <CopyIcon size={14} />
                                                        {/if}
                                                    </button>
                                                </div>
                                                <pre class="request-log-code hljs">{@html highlightJson(log.body)}</pre>
                                            </div>
                                            <div>
                                                <div class="flex items-center justify-between mb-2">
                                                    <span class="text-textcolor text-sm font-semibold">Request Header</span>
                                                    <button
                                                        class="p-1 rounded hover:bg-bgcolor transition-colors {copiedKey === `${i}-header` ? 'text-green-500' : 'text-textcolor2 hover:text-textcolor'}"
                                                        onclick={(e) => { e.stopPropagation(); copyToClipboard(log.header, `${i}-header`) }}
                                                        title="Copy"
                                                    >
                                                        {#if copiedKey === `${i}-header`}
                                                            <CheckIcon size={14} />
                                                        {:else}
                                                            <CopyIcon size={14} />
                                                        {/if}
                                                    </button>
                                                </div>
                                                <pre class="request-log-code hljs max-h-32">{@html highlightJson(log.header)}</pre>
                                            </div>
                                            <div>
                                                <div class="flex items-center justify-between mb-2">
                                                    <span class="text-textcolor text-sm font-semibold">Response</span>
                                                    <button
                                                        class="p-1 rounded hover:bg-bgcolor transition-colors {copiedKey === `${i}-response` ? 'text-green-500' : 'text-textcolor2 hover:text-textcolor'}"
                                                        onclick={(e) => { e.stopPropagation(); copyToClipboard(log.response, `${i}-response`) }}
                                                        title="Copy"
                                                    >
                                                        {#if copiedKey === `${i}-response`}
                                                            <CheckIcon size={14} />
                                                        {:else}
                                                            <CopyIcon size={14} />
                                                        {/if}
                                                    </button>
                                                </div>
                                                <pre class="request-log-code hljs max-h-64">{@html highlightJson(log.response)}</pre>
                                            </div>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .plugin-confirm-content .plugin-name {
        font-size: 1.25rem;
        font-weight: bold;
        color: white;
    }
    .plugin-confirm-content .warnings-list {
        list-style-type: disc;
        list-style-position: inside;
        margin-top: 0.5rem;
        margin-bottom: 0.5rem;
        padding-left: 1rem;
        color: #f87171; /* red-400 */
    }
    .plugin-confirm-content .warning-item {
        margin-bottom: 0.25rem;
    }
    .plugin-confirm-content .confirm-message {
        margin-top: 1rem;
        color: #d1d5db; /* gray-300 */
    }
    .break-any{
        word-break: normal;
        overflow-wrap: anywhere;
    }
    @keyframes toastAnime {
        0% {
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    .toast-anime {
        animation: toastAnime 1s ease-out;
    }

    .vis{
        opacity: 1 !important;
        --tw-bg-opacity: 1 !important;
    }

    .stack-trace {
        background-color: var(--risu-theme-bgcolor);
        color: var(--risu-theme-textcolor2);
        border: 1px solid var(--risu-theme-darkborderc);
        border-radius: 0.25rem;
        padding: 0.5rem;
        margin-top: 0.5rem;
        font-family: monospace;
        font-size: 0.75rem;
        white-space: pre-wrap;
        word-break: break-all;
        max-height: 200px;
        overflow-y: auto;
    }

    .request-log-code {
        background-color: #1a1a2e;
        color: #e0e0e0;
        border: 1px solid var(--risu-theme-darkborderc);
        border-radius: 0.375rem;
        padding: 0.75rem;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 0.75rem;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-all;
        max-height: 12rem;
        overflow: auto;
    }
</style>
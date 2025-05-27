<script lang="ts">
    import { alertGenerationInfoStore } from "../../ts/alert";
    
    import { DBState } from 'src/ts/stores.svelte';
    import { getCharImage } from '../../ts/characters';
    import { ParseMarkdown } from '../../ts/parser.svelte';
    import BarIcon from '../SideBars/BarIcon.svelte';
    import { ChevronRightIcon, User } from 'lucide-svelte';
    import { hubURL, isCharacterHasAssets } from 'src/ts/characterCards';
    import TextInput from '../UI/GUI/TextInput.svelte';
    import { openURL } from 'src/ts/globalApi.svelte';
    import Button from '../UI/GUI/Button.svelte';
    import { XIcon, PlusIcon, Lock } from "lucide-svelte";
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
    $effect.pre(() => {
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
    });

    const beautifyJSON = (data:string) =>{
        try {
            return JSON.stringify(JSON.parse(data), null, 2)
        } catch (error) {
            return data
        }
    }
    
    let commentExpandedId: string | null = $state(null)
    let commentDraftTitle = $state('')
    let commentDraftContent = $state('')
    const commentDraftByte = $derived(new TextEncoder().encode(commentDraftContent).length)
</script>

<svelte:window onmessage={async (e) => {
    if(e.origin.startsWith("https://sv.risuai.xyz") || e.origin.startsWith("http://127.0.0.1") || e.origin === window.location.origin){
        if(e.data.msg?.data?.vaild && $alertStore.type === 'login'){
            $alertStore = {
                type: 'none',
                msg: JSON.stringify(e.data.msg)
            }
        }
    }
}}></svelte:window>

{#if $alertStore.type !== 'none' &&  $alertStore.type !== 'toast' &&  $alertStore.type !== 'cardexport' && $alertStore.type !== 'branches' && $alertStore.type !== 'selectModule' && $alertStore.type !== 'pukmakkurit'}
    <div class="absolute w-full h-full z-50 bg-black bg-opacity-50 flex justify-center items-center" class:vis={ $alertStore.type === 'wait2'}>
        <div class="bg-darkbg p-4 break-any rounded-md flex flex-col max-w-3xl  max-h-full overflow-y-auto">
            {#if $alertStore.type === 'error'}
                <h2 class="text-red-700 mt-0 mb-2 w-40 max-w-full">Error</h2>
            {:else if $alertStore.type === 'ask'}
                <h2 class="text-green-700 mt-0 mb-2 w-40 max-w-full">Confirm</h2>
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
            {:else if $alertStore.type !== 'select' && $alertStore.type !== 'requestdata' && $alertStore.type !== 'addchar' && $alertStore.type !== 'hypaV2' && $alertStore.type !== 'chatOptions'}
                <span class="text-gray-300">{$alertStore.msg}</span>
                {#if $alertStore.submsg && $alertStore.type !== 'progress'}
                    <span class="text-gray-500 text-sm">{$alertStore.submsg}</span>
                {/if}
            {/if}
            {#if $alertStore.type === 'progress'}
                <div class="w-full min-w-64 md:min-w-138 h-2 bg-darkbg border border-darkborderc rounded-md mt-6">
                    <div class="h-full bg-gradient-to-r from-blue-500 to-purple-800 saving-animation transition-[width]" style:width={$alertStore.submsg + '%'}></div>
                </div>
                <div class="w-full flex justify-center mt-6">
                    <span class="text-gray-500 text-sm">{$alertStore.submsg + '%'}</span>
                </div>
            {/if}

            {#if $alertStore.type === 'ask'}
                <div class="flex gap-2 w-full">
                    <Button className="mt-4 flex-grow" onclick={() => {
                        alertStore.set({
                            type: 'none',
                            msg: 'yes'
                        })
                    }}>YES</Button>
                    <Button className="mt-4 flex-grow" onclick={() => {
                        alertStore.set({
                            type: 'none',
                            msg: 'no'
                        })
                    }}>NO</Button>
                </div>
            {:else if $alertStore.type === 'tos'}
                <div class="flex gap-2 w-full">
                    <Button className="mt-4 flex-grow" onclick={() => {
                        alertStore.set({
                            type: 'none',
                            msg: 'yes'
                        })
                    }}>Accept</Button>
                    <Button styled={'outlined'} className="mt-4 flex-grow" onclick={() => {
                        alertStore.set({
                            type: 'none',
                            msg: 'no'
                        })
                    }}>Do not Accept</Button>
                </div>
            {:else if $alertStore.type === 'select'}
                {#each $alertStore.msg.split('||') as n, i}
                    <Button className="mt-4" onclick={() => {
                        alertStore.set({
                            type: 'none',
                            msg: i.toString()
                        })
                    }}>{n}</Button>
                {/each}
            {:else if $alertStore.type === 'error' || $alertStore.type === 'normal' || $alertStore.type === 'markdown'}
               <Button className="mt-4" onclick={() => {
                    alertStore.set({
                        type: 'none',
                        msg: ''
                    })
                }}>OK</Button>
            {:else if $alertStore.type === 'input'}
                <TextInput value="" id="alert-input" autocomplete="off" marginTop />
                <Button className="mt-4" onclick={() => {
                    alertStore.set({
                        type: 'none',
                        //@ts-ignore
                        msg: document.querySelector('#alert-input')?.value
                    })
                }}>OK</Button>
            {:else if $alertStore.type === 'login'}
                <div class="fixed top-0 left-0 bg-black bg-opacity-50 w-full h-full flex justify-center items-center">
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
                                        //@ts-ignore
                                        alertStore.set({type: 'none',msg: char.chaId})
                                    }}>
                                        <User/>
                                    </BarIcon>
                                {:then im} 
                                    <BarIcon onClick={() => {
                                        //@ts-ignore
                                        alertStore.set({type: 'none',msg: char.chaId})
                                    }} additionalStyle={im} />
                                    
                                {/await}
                            {:else}
                                <BarIcon onClick={() => {
                                    //@ts-ignore
                                    alertStore.set({type: 'none',msg: char.chaId})
                                }}>
                                <User/>
                                </BarIcon>
                            {/if}
                        {/if}
                    {/each}
                </div>
            {:else if $alertStore.type === 'requestdata'}
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
                    <Button selected={generationInfoMenuIndex === 4} size="sm" onclick={() => {generationInfoMenuIndex = 4}}>
                        {language.commentaries}
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
                            <div class="col-span-2 max-h-32 overflow-y-auto border border-stone-500 rounded p-2 bg-gray-900">
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
                            <div class="col-span-2 max-h-80 overflow-y-auto border border-stone-500 rounded p-4 bg-gray-900">
                                {#if !DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx].promptInfo.promptText}
                                    <div class="text-gray-500 italic text-center py-4">{language.promptInfoEmptyText}</div>
                                {:else}
                                    {#each DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx].promptInfo.promptText as block}
                                        <div class="mb-2">
                                            <div class="font-bold text-gray-600">{block.role}</div>
                                            <pre class="whitespace-pre-wrap text-sm bg-stone-900 p-2 rounded border border-stone-500">{block.content}</pre>
                                        </div>
                                    {/each}
                                {/if}
                            </div>
                        </div>
                    {/if}
                {/if}
                {#if generationInfoMenuIndex === 4}
                    {#if Object.keys(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx].commentaries || {}).length === 0}
                        <div class="text-gray-300 text-lg mt-2">{language.commentariesEmptyMessage}</div>
                    {:else}
                        <div class="space-y-3 mt-4">
                            {#each DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx].commentaries as commentary, idx (commentary.id)}
                                <div role="button" tabindex="0" class="flex items-center bg-gray-900 rounded-md px-4 py-3 shadow-sm hover:bg-neutral-700 transition-all" onclick={(e) => {
                                        e.preventDefault()
                                        commentExpandedId = commentExpandedId === commentary.id ? null : commentary.id
                                        commentDraftTitle = commentary.title
                                        commentDraftContent = commentary.content
                                    }}
                                    onkeydown={() => {

                                    }}>
                                    <button class={`mr-2 ${commentary.locked ? 'text-green-500' : 'hover:text-green-500 text-textcolor2'} cursor-pointer`} onclick={(e) => {
                                        e.stopPropagation()
                                        commentary.locked = !commentary.locked
                                    }}>
                                        <Lock />
                                    </button>
                                    <span class="flex-1 font-semibold w-2xl text-lg text-gray-100 truncate">{commentary.title}</span>
                                    <div class="flex flex-col sm:flex-row items-end text-sm text-gray-300 leading-tight mr-2">
                                        <span class="text-gray-400 text-sm">{new Date(commentary.createdAt).toLocaleDateString()}</span>
                                        <span class="text-gray-400 text-sm">{new Date(commentary.createdAt).toLocaleTimeString()}</span>
                                    </div>
                                    <button onclick={async (e) => {
                                        e.stopPropagation()
                                        if(commentary.locked) return

                                        let targetMessage = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx]
                                        if(!Array.isArray(targetMessage.commentaries)){
                                            console.error(`[Commentary Delete] 'commentaries' should be an array but got: ${targetMessage.commentaries} at ${targetMessage}`)
                                            return
                                        }
                                        
                                        const r = await confirm(`${language.commentariesDelete}`)
                                        if(!r) return

                                        targetMessage.commentaries = targetMessage.commentaries.filter((_, i) => i !== idx)
                                    }} class={`text-textcolor2 ${commentary.locked ? 'opacity-30' : 'hover:text-green-500 opacity-100'} cursor-pointer`} disabled={commentary.locked}>
                                        <XIcon />
                                    </button>
                                </div>
                                {#if commentExpandedId === commentary.id}
                                    <div class="mt-3 mb-6 rounded-md bg-neutral-800 border-l-4 border-green-600 pl-4 pr-2 py-4 overflow-hidden">
                                        <input
                                            type="text"
                                            bind:value={commentDraftTitle}
                                            readonly={commentary.locked}
                                            class="w-full bg-neutral-900 text-lg font-semibold px-2 py-1 rounded mb-2" />
                                        <div class="text-xs text-gray-400 flex gap-4 mb-2">
                                            <span>Created: {new Date(commentary.createdAt).toLocaleString()}</span>
                                            <span>Updated: {new Date(commentary.updatedAt).toLocaleString()}</span>
                                        </div>
                                        <textarea
                                            bind:value={commentDraftContent}
                                            rows="6"
                                            class="w-full bg-neutral-900 text-gray-100 px-2 py-1 rounded"
                                            readonly={commentary.locked}
                                        ></textarea>
                                        <div class="mt-3 flex items-center justify-between">
                                            <div class={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${commentDraftByte > 50000 ? 'text-red-400' : 'text-gray-200'} bg-neutral-700 rounded-full select-none`}>{commentDraftByte.toLocaleString()} Bytes</div>
                                            <div class="mt-3 flex justify-end gap-2">
                                                <button
                                                    class="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600"
                                                    onclick={() => commentExpandedId = null}
                                                >Cancel</button>
                                                <button
                                                    class={`px-3 py-1 rounded bg-green-600 ${commentary.locked ? 'opacity-30' : 'hover:bg-green-700 opacity-100'} text-white`} disabled={commentary.locked}
                                                    onclick={() => {
                                                        if(commentary.locked) return
                                                        
                                                        commentary.title = commentDraftTitle.trim() || 'New comment'
                                                        commentary.content = commentDraftContent
                                                        commentary.updatedAt = new Date().toISOString()
                                                        commentExpandedId = null
                                                    }}
                                                >Save</button>
                                            </div>
                                        </div>                                        
                                    </div>
                                {/if}
                            {/each}
                        </div>
                    {/if}

                    <div class="mt-6 flex items-center justify-between">
                        <button onclick={() => {
                            let targetMessage = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx]
                            if((!Array.isArray(targetMessage.commentaries))){
                                console.error(`[Commentary Add] 'commentaries' should be an array but got: ${targetMessage.commentaries} at ${targetMessage}`)
                                return
                            }
                            if(targetMessage.commentaries.length >= 20){
                                return
                            }

                            let newCommentary = {
                                id: crypto.randomUUID(),
                                title: 'New comment',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                content: '',
                                locked: false,
                            }

                            targetMessage.commentaries = [...targetMessage.commentaries, newCommentary]
                        }} class="text-textcolor2 hover:text-green-500 cursor-pointer">
                            <PlusIcon />
                        </button>
                          <span class="ml-2 inline-flex items-end px-2 py-1 rounded-full bg-neutral-700 text-gray-300 text-sm font-mono">
                            {DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[$alertGenerationInfoStore.idx].commentaries?.length ?? 0} / 20
                        </span>
                    </div>
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
    <div  class="fixed top-0 left-0 h-full w-full bg-black bg-opacity-50 flex flex-col z-50 items-center justify-center" role="button" tabindex="0" onclick={close}>
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
    
    <div class="absolute w-full h-full z-50 bg-black bg-opacity-50 flex justify-center items-center">
        <div class="bg-darkbg p-4 break-any rounded-md flex flex-col max-w-3xl  max-h-full overflow-y-auto">
            <h2 class="text-green-700 mt-0 mb-2 w-40 max-w-full">{language.preview}</h2>

        </div>
    </div>
{:else if $alertStore.type === 'branches'}
    <div class="absolute w-full h-full z-50 bg-black bg-opacity-80 flex justify-center items-center overflow-x-auto overflow-y-auto">
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
{/if}

<style>
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
</style>
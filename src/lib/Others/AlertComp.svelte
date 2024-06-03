<script lang="ts">
    import { alertStore, alertGenerationInfoStore } from "../../ts/alert";
    import { DataBase } from '../../ts/storage/database';
    import { getCharImage } from '../../ts/characters';
    import { ParseMarkdown } from '../../ts/parser';
    import BarIcon from '../SideBars/BarIcon.svelte';
    import { ChevronRightIcon, User } from 'lucide-svelte';
    import { hubURL } from 'src/ts/characterCards';
    import TextInput from '../UI/GUI/TextInput.svelte';
    import { openURL } from 'src/ts/storage/globalApi';
    import Button from '../UI/GUI/Button.svelte';
    import { XIcon } from "lucide-svelte";
    import SelectInput from "../UI/GUI/SelectInput.svelte";
    import { CCLicenseData } from "src/ts/creation/license";
    import OptionInput from "../UI/GUI/OptionInput.svelte";
    import { language } from 'src/lang';
    import { getFetchData } from 'src/ts/storage/globalApi';
    import { CurrentChat } from "src/ts/stores";
    import { tokenize } from "src/ts/tokenizer";
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    let btn
    let input = ''
    let cardExportType = 'realm'
    let cardExportType2 = ''
    let cardLicense = ''
    let generationInfoMenuIndex = 0
    $: {
        if(btn){
            btn.focus()
        }
        if($alertStore.type !== 'input'){
            input = ''
        }
        if($alertStore.type !== 'cardexport'){
            cardExportType = 'realm'
            cardExportType2 = ''
            cardLicense = ''
        }
    }

    const beautifyJSON = (data:string) =>{
        try {
            return JSON.stringify(JSON.parse(data), null, 2)
        } catch (error) {
            return data
        }
    }
</script>

<svelte:window on:message={async (e) => {
    if(e.origin.startsWith("https://sv.risuai.xyz") || e.origin.startsWith("http://127.0.0.1")){
        if(e.data.msg.data.vaild && $alertStore.type === 'login'){
            $alertStore = {
                type: 'none',
                msg: JSON.stringify(e.data.msg)
            }
        }
    }
}}></svelte:window>

{#if $alertStore.type !== 'none' &&  $alertStore.type !== 'toast' &&  $alertStore.type !== 'cardexport'}
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
                <span class="text-gray-300 chattext prose prose-invert chattext2">
                    {#await ParseMarkdown($alertStore.msg) then msg}
                        {@html msg}                        
                    {/await}
                </span>
            {:else if $alertStore.type === 'tos'}
                <!-- svelte-ignore a11y-missing-attribute -->
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div class="text-textcolor">You should accept RisuRealm's <a class="text-green-600 hover:text-green-500 transition-colors duration-200 cursor-pointer" on:click={() => {
                    openURL('https://sv.risuai.xyz/hub/tos')
                }}>Terms of Service</a> to continue</div>
            {:else if $alertStore.type !== 'select' && $alertStore.type !== 'requestdata' && $alertStore.type !== 'addchar' && $alertStore.type !== 'hypaV2'}
                <span class="text-gray-300">{$alertStore.msg}</span>
                {#if $alertStore.submsg}
                    <span class="text-gray-500 text-sm">{$alertStore.submsg}</span>
                {/if}
            {/if}
            {#if $alertStore.type === 'ask'}
                <div class="flex gap-2 w-full">
                    <Button className="mt-4 flex-grow" on:click={() => {
                        alertStore.set({
                            type: 'none',
                            msg: 'yes'
                        })
                    }}>YES</Button>
                    <Button className="mt-4 flex-grow" on:click={() => {
                        alertStore.set({
                            type: 'none',
                            msg: 'no'
                        })
                    }}>NO</Button>
                </div>
            {:else if $alertStore.type === 'tos'}
                <div class="flex gap-2 w-full">
                    <Button className="mt-4 flex-grow" on:click={() => {
                        alertStore.set({
                            type: 'none',
                            msg: 'yes'
                        })
                    }}>Accept</Button>
                    <Button className="mt-4 flex-grow" on:click={() => {
                        alertStore.set({
                            type: 'none',
                            msg: 'no'
                        })
                    }}>Do not Accept</Button>
                </div>
            {:else if $alertStore.type === 'select'}
                {#each $alertStore.msg.split('||') as n, i}
                    <Button className="mt-4" on:click={() => {
                        alertStore.set({
                            type: 'none',
                            msg: i.toString()
                        })
                    }}>{n}</Button>
                {/each}
            {:else if $alertStore.type === 'error' || $alertStore.type === 'normal' || $alertStore.type === 'markdown'}
               <Button className="mt-4" on:click={() => {
                    alertStore.set({
                        type: 'none',
                        msg: ''
                    })
                }}>OK</Button>
            {:else if $alertStore.type === 'input'}
                <TextInput value="" id="alert-input" autocomplete="off" marginTop />
                <Button className="mt-4" on:click={() => {
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
                    {#each $DataBase.characters as char, i}
                        {#if char.type !== 'group'}
                            {#if char.image}
                                {#await getCharImage($DataBase.characters[i].image, 'css')}
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
                    <Button selected={generationInfoMenuIndex === 0} size="sm" on:click={() => {generationInfoMenuIndex = 0}}>
                        {language.tokens}
                    </Button>
                    <Button selected={generationInfoMenuIndex === 1} size="sm" on:click={() => {generationInfoMenuIndex = 1}}>
                        {language.metaData}
                    </Button>
                    <Button selected={generationInfoMenuIndex === 2} size="sm" on:click={() => {generationInfoMenuIndex = 2}}>
                        {language.log}
                    </Button>
                    <button class="ml-auto" on:click={() => {
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
                    <span class="text-green-500 justify-self-end">{$CurrentChat.message[$alertGenerationInfoStore.idx].chatId ?? "None"}</span>
                    <span class="text-red-500">GenID</span>
                    <span class="text-red-500 justify-self-end">{$alertGenerationInfoStore.genInfo.generationId}</span>
                    <span class="text-cyan-500">Saying</span>
                    <span class="text-cyan-500 justify-self-end">{$CurrentChat.message[$alertGenerationInfoStore.idx].saying}</span>
                    <span class="text-purple-500">Size</span>
                    <span class="text-purple-500 justify-self-end">{JSON.stringify($CurrentChat.message[$alertGenerationInfoStore.idx]).length} Bytes</span>
                    <span class="text-yellow-500">Time</span>
                    <span class="text-yellow-500 justify-self-end">{(new Date($CurrentChat.message[$alertGenerationInfoStore.idx].time ?? 0)).toLocaleString()}</span>
                    <span class="text-green-500">Tokens</span>
                    {#await tokenize($CurrentChat.message[$alertGenerationInfoStore.idx].data)}
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
            {:else if $alertStore.type === 'hypaV2'}
                <div class="flex flex-wrap gap-2 mb-4 max-w-full w-124">
                    <Button selected={generationInfoMenuIndex === 0} size="sm" on:click={() => {generationInfoMenuIndex = 0}}>
                        Chunks
                    </Button>
                    <Button selected={generationInfoMenuIndex === 1} size="sm" on:click={() => {generationInfoMenuIndex = 1}}>
                        Summarized
                    </Button>
                    <button class="ml-auto" on:click={() => {
                        alertStore.set({
                            type: 'none',
                            msg: ''
                        })
                    }}>✖</button>
                </div>
                {#if generationInfoMenuIndex === 0}
                    <div class="flex flex-col gap-2 w-full">
                        {#each $CurrentChat.hypaV2Data.chunks as chunk}
                            <TextAreaInput bind:value={chunk.text} />
                        {/each}

                        <Button on:click={() => {
                            $CurrentChat.hypaV2Data.chunks.push({
                                text: '',
                                targetId: 'all'
                            })
                            $CurrentChat.hypaV2Data.chunks = $CurrentChat.hypaV2Data.chunks
                        }}>+</Button>
                    </div>
                {:else}
                    {#each $CurrentChat.hypaV2Data.chunks as chunk, i}
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

                    <button class="border-darkborderc border py-12 px-8 flex rounded-md hover:ring-2 justify-center items-center" on:click={() => {
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
                    <button class="border-darkborderc border py-2 px-8 flex rounded-md hover:ring-2 items-center mt-2" on:click={() => {
                        alertStore.set({
                            type: 'none',
                            msg: 'importCharacter'
                        })
                    }}>
                        <div class="flex flex-col justify-start items-start">
                            <span>{language.importCharacter}</span>
                        </div>
                        <div class="ml-9 float-right flex-1 flex justify-end">
                            <ChevronRightIcon />
                        </div>
                    </button>
                    <button class="border-darkborderc border py-2 px-8 flex rounded-md hover:ring-2 items-center mt-2" on:click={() => {
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
                    <button class="border-darkborderc border py-2 px-8 flex rounded-md hover:ring-2 items-center mt-2" on:click={() => {
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
                    <button class="border-darkborderc border py-2 px-8 flex rounded-md hover:ring-2 items-center mt-2" on:click={() => {
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
    <div  class="fixed top-0 left-0 h-full w-full bg-black bg-opacity-50 flex flex-col z-50 items-center justify-center" on:click={close}>
        <div class="bg-darkbg rounded-md p-4 max-w-full flex flex-col w-2xl" on:click|stopPropagation>
            <h1 class="font-bold text-2xl w-full">
                <span>
                    {language.shareExport}
                </span>
                <button class="float-right text-textcolor2 hover:text-green-500" on:click={() => {
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
                    <span class="text-textcolor2 text-sm">{language.jsonDesc}</span>
                {:else if $alertStore.submsg === 'preset'}
                    <span class="text-textcolor2 text-sm">{language.risupresetDesc}</span>
                {:else}
                    <span class="text-textcolor2 text-sm">{language.ccv3Desc}</span>
                {/if}
            {:else if cardExportType === 'json'}
                <span class="text-textcolor2 text-sm">{language.jsonDesc}</span>
            {:else if cardExportType === 'ccv2'}
                <span class="text-textcolor2 text-sm">{language.ccv2Desc}</span>
            {:else}
                <span class="text-textcolor2 text-sm">{language.realmDesc}</span>
            {/if}
            <div class="flex items-center flex-wrap mt-2">
                {#if $alertStore.submsg === 'preset'}
                    <button class="bg-bgcolor px-2 py-4 rounded-lg ml-2 flex-1" class:ring-1={cardExportType === 'realm'} on:click={() => {cardExportType = 'realm'}}>RisuRealm</button>
                    <button class="bg-bgcolor px-2 py-4 rounded-lg flex-1" class:ring-1={cardExportType === ''} on:click={() => {cardExportType = ''}}>Risupreset</button>
                    <button class="bg-bgcolor px-2 py-4 rounded-lg ml-2 flex-1" class:ring-1={cardExportType === 'json'} on:click={() => {cardExportType = 'json'}}>JSON</button>
                {:else if $alertStore.submsg === 'module'}
                    <button class="bg-bgcolor px-2 py-4 rounded-lg ml-2 flex-1" class:ring-1={cardExportType === 'realm'} on:click={() => {cardExportType = 'realm'}}>RisuRealm</button>
                    <button class="bg-bgcolor px-2 py-4 rounded-lg flex-1" class:ring-1={cardExportType === ''} on:click={() => {cardExportType = ''}}>JSON</button>
                {:else}
                <button class="bg-bgcolor px-2 py-4 rounded-lg ml-2 flex-1" class:ring-1={cardExportType === 'realm'} on:click={() => {cardExportType = 'realm'}}>RisuRealm</button>
                    <button class="bg-bgcolor px-2 py-4 rounded-lg flex-1" class:ring-1={cardExportType === ''} on:click={() => {cardExportType = ''}}>Character Card V3</button>
                    <button class="bg-bgcolor px-2 py-4 rounded-lg flex-1 ml-2" class:ring-1={cardExportType === 'ccv2'} on:click={() => {cardExportType = 'ccv2'}}>Character Card V2</button>
                {/if}
            </div>
            {#if $alertStore.submsg === '' && cardExportType === ''}
                <span class="text-textcolor mt-4">{language.format}</span>
                <SelectInput bind:value={cardExportType2} className="mt-2">
                    <OptionInput value="">PNG</OptionInput>
                    <OptionInput value="json">JSON</OptionInput>
                    <OptionInput value="charx">CHARX</OptionInput>
                </SelectInput>
            {/if}
            <Button className="mt-4" on:click={() => {
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
        on:animationend={() => {
            alertStore.set({
                type: 'none',
                msg: ''
            })
        }}
    >{$alertStore.msg}</div>
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
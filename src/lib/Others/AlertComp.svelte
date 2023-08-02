<script>
    import { onMount } from 'svelte';
    import { alertStore } from "../../ts/alert";
    import { DataBase } from '../../ts/storage/database';
    import { getCharImage } from '../../ts/characters';
    import { ParseMarkdown } from '../../ts/parser';
    import BarIcon from '../SideBars/BarIcon.svelte';
    import { User } from 'lucide-svelte';
    import { hubURL } from 'src/ts/characterCards';
  import TextInput from '../UI/GUI/TextInput.svelte';
  import { openURL } from 'src/ts/storage/globalApi';
  import Button from '../UI/GUI/Button.svelte';
    let btn
    let input = ''

    $: (() => {
        if(btn){
            btn.focus()
        }
        if($alertStore.type !== 'input'){
            console.log('reset input')
            input = ''
        }
        
    })()

    alertStore.subscribe(() => {
        console.log('alup')
    })
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

{#if $alertStore.type !== 'none' &&  $alertStore.type !== 'toast'}
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
            {:else if $alertStore.type !== 'select'}
                <span class="text-gray-300">{$alertStore.msg}</span>
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
            {/if}
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
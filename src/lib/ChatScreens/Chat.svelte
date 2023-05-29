<script lang="ts">
    import { ArrowLeft, ArrowRight, EditIcon, LanguagesIcon, RefreshCcwIcon, TrashIcon } from "lucide-svelte";
    import { ParseMarkdown } from "../../ts/parser";
    import AutoresizeArea from "./AutoresizeArea.svelte";
    import { alertConfirm } from "../../ts/alert";
    import { language } from "../../lang";
    import { DataBase, type character, type groupChat } from "../../ts/storage/database";
    import { selectedCharID } from "../../ts/stores";
    import { translate } from "../../ts/translator/translator";
    import { replacePlaceholders } from "../../ts/util";
    export let message = ''
    export let name = ''
    export let isLastMemory:boolean
    export let img:string|Promise<string> = ''
    export let idx = -1
    export let rerollIcon = false
    export let onReroll = () => {}
    export let unReroll = () => {}
    export let character:character|groupChat|null = null
    let translating = false
    let editMode = false
    export let altGreeting = false

    let msgDisplay = ''
    let msgTranslated = ''
    let translated = false;
    async function rm(){
        const rm = $DataBase.askRemoval ? await alertConfirm(language.removeChat) : true
        if(rm){
            if($DataBase.instantRemove){
                const r = await alertConfirm(language.instantRemoveConfirm)
                let msg = $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].message
                if(!r){
                    msg = msg.slice(0, idx)
                }
                else{
                    msg.splice(idx, 1)
                }
                $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].message = msg
            }
            else{
                let msg = $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].message
                msg.splice(idx, 1)
                $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].message = msg
            }
        }
    }

    async function edit(){
        let msg = $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].message
        msg[idx].data = message
        $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].message = msg
    }

    async function displaya(message:string){
        if($DataBase.autoTranslate && $DataBase.translator !== ''){
            if(msgTranslated==='')
                msgDisplay = replacePlaceholders(message, name)
            msgDisplay = await translate(replacePlaceholders(message, name), false)
            msgTranslated = msgDisplay
            translated = true;
        }
        else{
            msgDisplay = replacePlaceholders(message, name)
        }
    }

    $: displaya(message)
</script>
<div class="flex max-w-full justify-center" class:bgc={isLastMemory}>
    <div class="text-neutral-200 mt-1 ml-4 mr-4 mb-1 p-2 bg-transparent flex-grow border-t-gray-900 border-opacity-30 border-transparent flexium items-start max-w-full" >
        {#await img}
            <div class="shadow-lg bg-gray-500 mt-2" style={`height:${$DataBase.iconsize * 3.5 / 100}rem;width:${$DataBase.iconsize * 3.5 / 100}rem;min-width:${$DataBase.iconsize * 3.5 / 100}rem`}
            class:rounded-md={!$DataBase.roundIcons} class:rounded-full={$DataBase.roundIcons} />
        {:then m}
            <div class="shadow-lg bg-gray-500 mt-2" style={m + `height:${$DataBase.iconsize * 3.5 / 100}rem;width:${$DataBase.iconsize * 3.5 / 100}rem;min-width:${$DataBase.iconsize * 3.5 / 100}rem`}
            class:rounded-md={!$DataBase.roundIcons} class:rounded-full={$DataBase.roundIcons}  />
        {/await}
        <span class="flex flex-col ml-4 w-full max-w-full min-w-0">
            <div class="flexium items-center chat">
                <span class="chat text-xl unmargin">{name}</span>
                <div class="flex-grow flex items-center justify-end text-gray-500">
                    {#if idx > -1}
                        <button class={"hover:text-green-500 transition-colors "+(editMode?'text-green-400':'')} on:click={() => {
                            if(!editMode){
                                editMode = true
                            }
                            else{
                                editMode = false
                                edit()
                            }
                        }}>
                            <EditIcon size={20}/>
                        </button>
                        <button class="ml-2 hover:text-green-500 transition-colors" on:click={rm}>
                            <TrashIcon size={20}/>
                        </button>
                    {/if}
                    {#if $DataBase.translator !== ''}
                        <button class={"ml-2 cursor-pointer hover:text-green-500 transition-colors " + (translated ? 'text-green-400':'')} class:translating={translating} on:click={async () => {
                            if(translating){
                                return
                            }
                            if(!translated){
                                translating = true
                                if(msgTranslated !== ''){
                                    msgDisplay = msgTranslated
                                    translating = false
                                    translated = true
                                    return
                                }
                                msgDisplay = (await translate(replacePlaceholders(message, name), false))
                                msgTranslated = msgDisplay
                                translating = false
                                translated = true
                            }
                            else{
                                msgDisplay = replacePlaceholders(message, name)
                                translated = false
                            }
                        }}>
                            <LanguagesIcon />
                        </button>
                    {/if}
                    {#if rerollIcon || altGreeting}
                        {#if $DataBase.swipe || altGreeting}
                            <button class="ml-2 hover:text-green-500 transition-colors" on:click={unReroll}>
                                <ArrowLeft size={22}/>
                            </button>
                            <button class="ml-2 hover:text-green-500 transition-colors" on:click={onReroll}>
                                <ArrowRight size={22}/>
                            </button>
                        {:else}
                            <button class="ml-2 hover:text-green-500 transition-colors" on:click={onReroll}>
                                <RefreshCcwIcon size={20}/>
                            </button>
                        {/if}
                    {/if}
                </div>
            </div>
            {#if editMode}
                <AutoresizeArea bind:value={message} />
            {:else}
                {#await ParseMarkdown(msgDisplay, character) then md} 
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <span class="text chat chattext prose prose-invert minw-0" on:click={() => {
                        if($DataBase.clickToEdit){
                            editMode = true
                        }
                    }}
                        style:font-size="{0.875 * ($DataBase.zoomsize / 100)}rem"
                        style:line-height="{1.25 * ($DataBase.zoomsize / 100)}rem"
                    >{@html md}</span>
                {/await}
            {/if}
        </span>

    </div>
</div>


<style>
    .flexium{
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
    }
    .chat{
        max-width: calc(100% - 0.5rem);
        word-break: normal;
        overflow-wrap: anywhere;
    }
    .translating{
        color: rgba(16, 185, 129, 1);
    }
</style>
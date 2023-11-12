<script lang="ts">
    import { ArrowLeft, ArrowRight, EditIcon, LanguagesIcon, RefreshCcwIcon, TrashIcon, CopyIcon } from "lucide-svelte";
    import { ParseMarkdown, type simpleCharacterArgument } from "../../ts/parser";
    import AutoresizeArea from "../UI/GUI/TextAreaResizable.svelte";
    import { alertConfirm } from "../../ts/alert";
    import { language } from "../../lang";
    import { DataBase, type groupChat } from "../../ts/storage/database";
    import { CurrentChat, selectedCharID } from "../../ts/stores";
    import { translate, translateHTML } from "../../ts/translator/translator";
    import { risuChatParser } from "src/ts/process/scripts";
    import { get } from "svelte/store";
    export let message = ''
    export let name = ''
    export let largePortrait = false
    export let isLastMemory:boolean
    export let img:string|Promise<string> = ''
    export let idx = -1
    export let rerollIcon = false
    export let onReroll = () => {}
    export let unReroll = () => {}
    export let character:simpleCharacterArgument|string|null = null
    let translating = false
    let editMode = false
    let statusMessage:string = ''
    export let altGreeting = false

    let msgDisplay = ''
    let translated = get(DataBase).autoTranslate
    async function rm(){
        const rm = $DataBase.askRemoval ? await alertConfirm(language.removeChat) : true
        if(rm){
            if($DataBase.instantRemove){
                const r = await alertConfirm(language.instantRemoveConfirm)
                let msg = $CurrentChat.message
                if(!r){
                    msg = msg.slice(0, idx)
                }
                else{
                    msg.splice(idx, 1)
                }
                $CurrentChat.message = msg
            }
            else{
                let msg = $CurrentChat.message
                msg.splice(idx, 1)
                $CurrentChat.message = msg
            }
        }
    }

    async function edit(){
        let msg = $CurrentChat.message
        msg[idx].data = message
        $CurrentChat.message = msg
    }

    async function displaya(message:string){
        msgDisplay = risuChatParser(message, {chara: name, chatID: idx, rmVar: true})
    }

    const setStatusMessage = (message:string, timeout:number = 0)=>{
        statusMessage = message
        if(timeout === 0) return
        setTimeout(() => {
            statusMessage = ''
        }, timeout)
    }

    let lastParsed = ''

    const markParsing = async (data: string, charArg?: string | groupChat | simpleCharacterArgument, mode?: "normal" | "back", chatID?: number, translateText?:boolean) => {
        const marked = await ParseMarkdown(data, charArg, mode, chatID)
        lastParsed = marked
        if(translateText){
            translating = true
            const translated = await translateHTML(marked, false)
            translating = false
            return translated
        }
        return marked
    }

    $: displaya(message)
</script>
<div class="flex max-w-full justify-center risu-chat" class:bgc={isLastMemory}>
    <div class="text-textcolor mt-1 ml-4 mr-4 mb-1 p-2 bg-transparent flex-grow border-t-gray-900 border-opacity-30 border-transparent flexium items-start max-w-full" >
        {#await img}
            <div class="shadow-lg bg-textcolor2 mt-2" style={`height:${$DataBase.iconsize * 3.5 / 100}rem;width:${$DataBase.iconsize * 3.5 / 100}rem;min-width:${$DataBase.iconsize * 3.5 / 100}rem`}
            class:rounded-md={!$DataBase.roundIcons} class:rounded-full={$DataBase.roundIcons} />
        {:then m}
            {#if largePortrait && (!$DataBase.roundIcons)}
                <div class="shadow-lg bg-textcolor2 mt-2" style={m + `height:${$DataBase.iconsize * 3.5 / 100 / 0.75}rem;width:${$DataBase.iconsize * 3.5 / 100}rem;min-width:${$DataBase.iconsize * 3.5 / 100}rem`}
                class:rounded-md={!$DataBase.roundIcons} class:rounded-full={$DataBase.roundIcons}  />
            {:else}
                <div class="shadow-lg bg-textcolor2 mt-2" style={m + `height:${$DataBase.iconsize * 3.5 / 100}rem;width:${$DataBase.iconsize * 3.5 / 100}rem;min-width:${$DataBase.iconsize * 3.5 / 100}rem`}
                class:rounded-md={!$DataBase.roundIcons} class:rounded-full={$DataBase.roundIcons}  />
            {/if}
        {/await}
        <span class="flex flex-col ml-4 w-full max-w-full min-w-0">
            <div class="flexium items-center chat">
                <span class="chat text-xl unmargin">{name}</span>
                <div class="flex-grow flex items-center justify-end text-textcolor2">
                    <span class="text-xs">{statusMessage}</span>
                    {#if $DataBase.useChatCopy}
                        <button class="ml-2 hover:text-green-500 transition-colors" on:click={()=>{
                            window.navigator.clipboard.writeText(msgDisplay).then(() => {
                                setStatusMessage(language.copied)
                            })
                        }}>
                            <CopyIcon size={20}/>
                        </button>    
                    {/if}
                    {#if idx > -1}
                        <button class={"ml-2 hover:text-green-500 transition-colors "+(editMode?'text-green-400':'')} on:click={() => {
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
                            translated = !translated
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
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <span class="text chat chattext prose prose-invert minw-0" on:click={() => {
                    if($DataBase.clickToEdit && idx > -1){
                        editMode = true
                    }
                }}
                    style:font-size="{0.875 * ($DataBase.zoomsize / 100)}rem"
                    style:line-height="{1.25 * ($DataBase.zoomsize / 100)}rem"
                >
                {#await markParsing(msgDisplay, character, 'normal', idx, translated)}
                    {@html lastParsed}
                {:then md}
                    {@html md}
                {/await}
                </span>
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
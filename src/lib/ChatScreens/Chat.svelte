<script lang="ts">
    import { ArrowLeft, ArrowRight, PencilIcon, LanguagesIcon, RefreshCcwIcon, TrashIcon, CopyIcon, Volume2Icon, BotIcon, ArrowLeftRightIcon, UserIcon } from "lucide-svelte";
    import { ParseMarkdown, type simpleCharacterArgument } from "../../ts/parser";
    import AutoresizeArea from "../UI/GUI/TextAreaResizable.svelte";
    import { alertConfirm, alertError, alertRequestData } from "../../ts/alert";
    import { language } from "../../lang";
    import { DataBase, type MessageGenerationInfo } from "../../ts/storage/database";
    import { CurrentCharacter, CurrentChat, CurrentVariablePointer } from "../../ts/stores";
    import { translateHTML } from "../../ts/translator/translator";
    import { risuChatParser } from "src/ts/process/scripts";
    import { get } from "svelte/store";
    import { isEqual } from "lodash";
    import { sayTTS } from "src/ts/process/tts";
    import { getModelShortName } from "src/ts/model/names";
    import { capitalize } from "src/ts/util";
    export let message = ''
    export let name = ''
    export let largePortrait = false
    export let isLastMemory:boolean
    export let img:string|Promise<string> = ''
    export let idx = -1
    export let rerollIcon = false
    export let MessageGenerationInfo:MessageGenerationInfo|null = null
    export let onReroll = () => {}
    export let unReroll = () => {}
    export let character:simpleCharacterArgument|string|null = null
    let translating = false
    try {
        translating = get(DataBase).autoTranslate                
    } catch (error) {}
    let editMode = false
    let statusMessage:string = ''
    export let altGreeting = false

    let msgDisplay = ''
    let translated = get(DataBase).autoTranslate
    async function rm(e:MouseEvent){
        if(e.shiftKey){
            let msg = $CurrentChat.message
            msg = msg.slice(0, idx)
            $CurrentChat.message = msg
            return
        }

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

    function displaya(message:string, chatPointer?:any){
        msgDisplay = risuChatParser(message, {chara: name, chatID: idx, rmVar: true, visualize: true})
    }

    const setStatusMessage = (message:string, timeout:number = 0)=>{
        statusMessage = message
        if(timeout === 0) return
        setTimeout(() => {
            statusMessage = ''
        }, timeout)
    }

    let lastParsed = ''
    let lastCharArg:string|simpleCharacterArgument = null
    let lastChatId = -10
    let blankMessage = (message === '{{none}}' || message === 'blank') && idx === -1
    $: blankMessage = (message === '{{none}}' || message === 'blank') && idx === -1
    const markParsing = async (data: string, charArg?: string | simpleCharacterArgument, mode?: "normal" | "back", chatID?: number, translateText?:boolean, tries?:number) => {
        try {
            if((!isEqual(lastCharArg, charArg)) || (chatID !== lastChatId)){
            lastParsed = ''
            lastCharArg = charArg
            lastChatId = chatID
            translateText = false
            try {
                translated = get(DataBase).autoTranslate
                if(translated){
                    translateText = true
                }
            } catch (error) {}
        }
            if(translateText){
                const marked = await ParseMarkdown(data, charArg, mode, chatID)
                translating = true
                const translated = await translateHTML(marked, false, charArg)
                translating = false
                lastParsed = translated
                lastCharArg = charArg
                return translated
            }
            else{
                const marked = await ParseMarkdown(data, charArg, mode, chatID)
                lastParsed = marked
                lastCharArg = charArg
                return marked
            }   
        } catch (error) {
            //retry
            if(tries > 2){

                alertError(`Error while parsing chat message: ${translateText}, ${error.message}, ${error.stack}`)
                return data
            }
            return await markParsing(data, charArg, mode, chatID, translateText, (tries ?? 0) + 1)
        }
    }

    $: displaya(message, $CurrentVariablePointer)
</script>
<div class="flex max-w-full justify-center risu-chat" style={isLastMemory ? `border-top:${$DataBase.memoryLimitThickness}px solid rgba(98, 114, 164, 0.7);` : ''}>
    <div class="text-textcolor mt-1 ml-4 mr-4 mb-1 p-2 bg-transparent flex-grow border-t-gray-900 border-opacity-30 border-transparent flexium items-start max-w-full" >
        {#if !blankMessage}
            {#if $CurrentCharacter?.chaId === "§playground"}
                <div class="shadow-lg border-textcolor2 border mt-2 flex justify-center items-center text-textcolor2" style={`height:${$DataBase.iconsize * 3.5 / 100}rem;width:${$DataBase.iconsize * 3.5 / 100}rem;min-width:${$DataBase.iconsize * 3.5 / 100}rem`}
                class:rounded-md={!$DataBase.roundIcons} class:rounded-full={$DataBase.roundIcons}>
                    {#if name === 'assistant'}
                        <BotIcon />
                    {:else}
                        <UserIcon />
                    {/if}
                </div>
            {:else}
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
            {/if}
        {/if}
        <span class="flex flex-col ml-4 w-full max-w-full min-w-0">
            <div class="flexium items-center chat">
                {#if $CurrentCharacter?.chaId === "§playground" && !blankMessage}
                    <span class="chat text-xl border-darkborderc flex items-center">
                        <span>{name === 'assistant' ? 'Assistant' : 'User'}</span>
                        <button class="ml-2 text-textcolor2 hover:text-textcolor" on:click={() => {
                            $CurrentChat.message[idx].role = $CurrentChat.message[idx].role === 'char' ? 'user' : 'char'
                            $CurrentChat = $CurrentChat
                        }}><ArrowLeftRightIcon size="18" /></button>
                    </span>
                {:else if !blankMessage}
                    <span class="chat text-xl unmargin">{name}</span>
                {/if}
                <div class="flex-grow flex items-center justify-end text-textcolor2">
                    <span class="text-xs">{statusMessage}</span>
                    {#if $DataBase.useChatCopy && !blankMessage}
                        <button class="ml-2 hover:text-green-500 transition-colors" on:click={()=>{
                            window.navigator.clipboard.writeText(msgDisplay).then(() => {
                                setStatusMessage(language.copied)
                            })
                        }}>
                            <CopyIcon size={20}/>
                        </button>    
                    {/if}
                    {#if idx > -1}
                        {#if $CurrentCharacter.type !== 'group' && $CurrentCharacter.ttsMode !== 'none' && ($CurrentCharacter.ttsMode)}
                            <button class="ml-2 hover:text-green-500 transition-colors" on:click={()=>{
                                return sayTTS(null, message)
                            }}>
                                <Volume2Icon size={20}/>
                            </button>
                        {/if}

                        <button class={"ml-2 hover:text-green-500 transition-colors "+(editMode?'text-green-400':'')} on:click={() => {
                            if(!editMode){
                                editMode = true
                            }
                            else{
                                editMode = false
                                edit()
                            }
                        }}>
                            <PencilIcon size={20}/>
                        </button>
                        <button class="ml-2 hover:text-green-500 transition-colors" on:click={rm}>
                            <TrashIcon size={20}/>
                        </button>
                    {/if}
                    {#if $DataBase.translator !== '' && !blankMessage}
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
            {#if MessageGenerationInfo && $DataBase.requestInfoInsideChat}
                <div>
                    <button class="text-sm p-1 text-textcolor2 border-darkborderc float-end mr-2 my-2
                                    hover:ring-borderc hover:ring rounded-md hover:text-textcolor transition-all flex justify-center items-center" 
                            on:click={() => {
                                alertRequestData({
                                    genInfo: MessageGenerationInfo,
                                    idx: idx,
                                })
                            }}
                    >
                        <BotIcon size={20} />
                        <span class="ml-1">
                            {capitalize(getModelShortName(MessageGenerationInfo.model))}
                        </span>
                    </button>
                </div>
            {/if}
            {#if editMode}
                <AutoresizeArea bind:value={message} />
            {:else if blankMessage}
                <div class="w-full flex justify-center text-textcolor2 italic mb-12">
                    {language.noMessage}
                </div>
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
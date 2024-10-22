<script lang="ts">
    import { run } from 'svelte/legacy';

    import { ArrowLeft, ArrowRight, PencilIcon, LanguagesIcon, RefreshCcwIcon, TrashIcon, CopyIcon, Volume2Icon, BotIcon, ArrowLeftRightIcon, UserIcon } from "lucide-svelte";
    import { type CbsConditions, ParseMarkdown, postTranslationParse, type simpleCharacterArgument } from "../../ts/parser";
    import AutoresizeArea from "../UI/GUI/TextAreaResizable.svelte";
    import { alertConfirm, alertError, alertRequestData } from "../../ts/alert";
    import { language } from "../../lang";
    import { DataBase, type MessageGenerationInfo } from "../../ts/storage/database";
    import { HideIconStore, ReloadGUIPointer, selectedCharID } from "../../ts/stores";
    import { translateHTML } from "../../ts/translator/translator";
    import { risuChatParser } from "src/ts/process/scripts";
    import { get, type Unsubscriber } from "svelte/store";
    import { isEqual } from "lodash";
    import { sayTTS } from "src/ts/process/tts";
    import { getModelShortName } from "src/ts/model/names";
    import { capitalize } from "src/ts/util";
    import { longpress } from "src/ts/gui/longtouch";
    import { ColorSchemeTypeStore } from "src/ts/gui/colorscheme";
    import { ConnectionOpenStore } from "src/ts/sync/multiuser";
    import { onDestroy, onMount } from "svelte";
    let translating = $state(false)
    try {
        translating = get(DataBase).autoTranslate                
    } catch (error) {}
    let editMode = $state(false)
    let statusMessage:string = $state('')
    interface Props {
        message?: string;
        name?: string;
        largePortrait?: boolean;
        isLastMemory: boolean;
        img?: string|Promise<string>;
        idx?: any;
        rerollIcon?: boolean;
        messageGenerationInfo?: MessageGenerationInfo|null;
        onReroll?: any;
        unReroll?: any;
        character?: simpleCharacterArgument|string|null;
        firstMessage?: boolean;
        altGreeting?: boolean;
    }

    let {
        message = $bindable(''),
        name = '',
        largePortrait = false,
        isLastMemory,
        img = '',
        idx = -1,
        rerollIcon = false,
        messageGenerationInfo = null,
        onReroll = () => {},
        unReroll = () => {},
        character = null,
        firstMessage = false,
        altGreeting = false
    }: Props = $props();

    let msgDisplay = $state('')
    let translated = $state(get(DataBase).autoTranslate)
    async function rm(e:MouseEvent, rec?:boolean){
        if(e.shiftKey){
            let msg = $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].message
            msg = msg.slice(0, idx)
            $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].message = msg
            return
        }

        const rm = $DataBase.askRemoval ? await alertConfirm(language.removeChat) : true
        if(rm){
            if($DataBase.instantRemove || rec){
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

    function getCbsCondition(){
        const cbsConditions:CbsConditions = {
            firstmsg: firstMessage ?? false,
            chatRole: $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage]?.message?.[idx]?.role ?? null,
        }
        return cbsConditions
    }

    function displaya(message:string){
        msgDisplay = risuChatParser(message, {chara: name, chatID: idx, rmVar: true, visualize: true, cbsConditions: getCbsCondition()})
    }

    const setStatusMessage = (message:string, timeout:number = 0)=>{
        statusMessage = message
        if(timeout === 0) return
        setTimeout(() => {
            statusMessage = ''
        }, timeout)
    }

    let lastParsed = $state('')
    let lastCharArg:string|simpleCharacterArgument = null
    let lastChatId = -10
    let blankMessage = $state((message === '{{none}}' || message === '{{blank}}' || message === '') && idx === -1)
    run(() => {
        blankMessage = (message === '{{none}}' || message === '{{blank}}' || message === '') && idx === -1
    });
    const markParsing = async (data: string, charArg?: string | simpleCharacterArgument, mode?: "normal" | "back", chatID?: number, translateText?:boolean, tries?:number) => {
        let lastParsedQueue = ''
        try {
            if((!isEqual(lastCharArg, charArg)) || (chatID !== lastChatId)){
                lastParsedQueue = ''
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
                if(!$DataBase.legacyTranslation){
                    const marked = await ParseMarkdown(data, charArg, 'pretranslate', chatID, getCbsCondition())
                    translating = true
                    const translated = await postTranslationParse(await translateHTML(marked, false, charArg, chatID))
                    translating = false
                    lastParsedQueue = translated
                    lastCharArg = charArg
                    return translated
                }
                else{
                    const marked = await ParseMarkdown(data, charArg, mode, chatID, getCbsCondition())
                    translating = true
                    const translated = await translateHTML(marked, false, charArg, chatID)
                    translating = false
                    lastParsedQueue = translated
                    lastCharArg = charArg
                    return translated
                }
            }
            else{
                const marked = await ParseMarkdown(data, charArg, mode, chatID, getCbsCondition())
                lastParsedQueue = marked
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
        finally{
            setTimeout(() => {
                lastParsed = lastParsedQueue
            }, 1)
        }
    }

    run(() => {
        displaya(message)
    });

    const unsubscribers:Unsubscriber[] = []

    onMount(()=>{
        unsubscribers.push(ReloadGUIPointer.subscribe((v) => {
            displaya(message)
        }))
    })

    onDestroy(()=>{
        unsubscribers.forEach(u => u())
    })
</script>
<div class="flex max-w-full justify-center risu-chat" style={isLastMemory ? `border-top:${$DataBase.memoryLimitThickness}px solid rgba(98, 114, 164, 0.7);` : ''}>
    <div class="text-textcolor mt-1 ml-4 mr-4 mb-1 p-2 bg-transparent flex-grow border-t-gray-900 border-opacity-30 border-transparent flexium items-start max-w-full" >
        {#if !blankMessage && !$HideIconStore}
            {#if $DataBase.characters[$selectedCharID]?.chaId === "§playground"}
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
                    class:rounded-md={!$DataBase.roundIcons} class:rounded-full={$DataBase.roundIcons}></div>
                {:then m}
                    {#if largePortrait && (!$DataBase.roundIcons)}
                        <div class="shadow-lg bg-textcolor2 mt-2" style={m + `height:${$DataBase.iconsize * 3.5 / 100 / 0.75}rem;width:${$DataBase.iconsize * 3.5 / 100}rem;min-width:${$DataBase.iconsize * 3.5 / 100}rem`}
                        class:rounded-md={!$DataBase.roundIcons} class:rounded-full={$DataBase.roundIcons}></div>
                    {:else}
                        <div class="shadow-lg bg-textcolor2 mt-2" style={m + `height:${$DataBase.iconsize * 3.5 / 100}rem;width:${$DataBase.iconsize * 3.5 / 100}rem;min-width:${$DataBase.iconsize * 3.5 / 100}rem`}
                        class:rounded-md={!$DataBase.roundIcons} class:rounded-full={$DataBase.roundIcons}></div>
                    {/if}
                {/await}
            {/if}
        {/if}
        <span class="flex flex-col ml-4 w-full max-w-full min-w-0">
            <div class="flexium items-center chat">
                {#if $DataBase.characters[$selectedCharID]?.chaId === "§playground" && !blankMessage}
                    <span class="chat text-xl border-darkborderc flex items-center">
                        <span>{name === 'assistant' ? 'Assistant' : 'User'}</span>
                        <button class="ml-2 text-textcolor2 hover:text-textcolor" onclick={() => {
                            $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].message[idx].role = $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage].message[idx].role === 'char' ? 'user' : 'char'
                            $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage] = $DataBase.characters[$selectedCharID].chats[$DataBase.characters[$selectedCharID].chatPage]
                        }}><ArrowLeftRightIcon size="18" /></button>
                    </span>
                {:else if !blankMessage && !$HideIconStore}
                    <span class="chat text-xl unmargin text-textcolor">{name}</span>
                {/if}
                <div class="flex-grow flex items-center justify-end text-textcolor2">
                    <span class="text-xs">{statusMessage}</span>
                    {#if $DataBase.useChatCopy && !blankMessage}
                        <button class="ml-2 hover:text-green-500 transition-colors" onclick={()=>{
                            window.navigator.clipboard.writeText(msgDisplay).then(() => {
                                setStatusMessage(language.copied)
                            })
                        }}>
                            <CopyIcon size={20}/>
                        </button>    
                    {/if}
                    {#if idx > -1}
                        {#if $DataBase.characters[$selectedCharID].type !== 'group' && $DataBase.characters[$selectedCharID].ttsMode !== 'none' && ($DataBase.characters[$selectedCharID].ttsMode)}
                            <button class="ml-2 hover:text-green-500 transition-colors" onclick={()=>{
                                return sayTTS(null, message)
                            }}>
                                <Volume2Icon size={20}/>
                            </button>
                        {/if}

                        {#if !$ConnectionOpenStore}
                            <button class={"ml-2 hover:text-green-500 transition-colors "+(editMode?'text-green-400':'')} onclick={() => {
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
                            <button class="ml-2 hover:text-green-500 transition-colors" onclick={(e) => rm(e, false)} use:longpress={(e) => rm(e, true)}>
                                <TrashIcon size={20}/>
                            </button>
                        {/if}
                    {/if}
                    {#if $DataBase.translator !== '' && !blankMessage}
                        <button class={"ml-2 cursor-pointer hover:text-green-500 transition-colors " + (translated ? 'text-green-400':'')} class:translating={translating} onclick={async () => {
                            translated = !translated
                        }}>
                            <LanguagesIcon />
                        </button>
                    {/if}
                    {#if rerollIcon || altGreeting}
                        {#if $DataBase.swipe || altGreeting}
                            <button class="ml-2 hover:text-green-500 transition-colors" onclick={unReroll}>
                                <ArrowLeft size={22}/>
                            </button>
                            <button class="ml-2 hover:text-green-500 transition-colors" onclick={onReroll}>
                                <ArrowRight size={22}/>
                            </button>
                        {:else}
                            <button class="ml-2 hover:text-green-500 transition-colors" onclick={onReroll}>
                                <RefreshCcwIcon size={20}/>
                            </button>
                        {/if}
                    {/if}
                </div>
            </div>
            {#if messageGenerationInfo && $DataBase.requestInfoInsideChat}
                <div>
                    <button class="text-sm p-1 text-textcolor2 border-darkborderc float-end mr-2 my-2
                                    hover:ring-darkbutton hover:ring rounded-md hover:text-textcolor transition-all flex justify-center items-center" 
                            onclick={() => {
                                alertRequestData({
                                    genInfo: messageGenerationInfo,
                                    idx: idx,
                                })
                            }}
                    >
                        <BotIcon size={20} />
                        <span class="ml-1">
                            {capitalize(getModelShortName(messageGenerationInfo.model))}
                        </span>
                    </button>
                </div>
            {/if}
            {#if editMode}
                <AutoresizeArea bind:value={message} handleLongPress={(e) => {
                    editMode = false
                }} />
            {:else if blankMessage}
                <div class="w-full flex justify-center text-textcolor2 italic mb-12">
                    {language.noMessage}
                </div>
            {:else}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <span class="text chat chattext prose minw-0" class:prose-invert={$ColorSchemeTypeStore} onclick={() => {
                    if($DataBase.clickToEdit && idx > -1){
                        editMode = true
                    }
                }}
                    style:font-size="{0.875 * ($DataBase.zoomsize / 100)}rem"
                    style:line-height="{($DataBase.lineHeight ?? 1.25) * ($DataBase.zoomsize / 100)}rem"
                >
                    {#key $ReloadGUIPointer}
                        {#await markParsing(msgDisplay, character, 'normal', idx, translated)}
                            {@html lastParsed}
                        {:then md}
                            {@html md}
                        {/await}
                    {/key}
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
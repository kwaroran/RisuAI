<script lang="ts">
    import { ArrowLeft, Sparkles, ArrowRight, PencilIcon, LanguagesIcon, RefreshCcwIcon, TrashIcon, CopyIcon, Volume2Icon, BotIcon, ArrowLeftRightIcon, UserIcon } from "lucide-svelte";
    import { type CbsConditions, ParseMarkdown, postTranslationParse, type simpleCharacterArgument } from "../../ts/parser.svelte";
    import AutoresizeArea from "../UI/GUI/TextAreaResizable.svelte";
    import { alertConfirm, alertError, alertRequestData } from "../../ts/alert";
    import { language } from "../../lang";
    import { type MessageGenerationInfo } from "../../ts/storage/database.svelte";
    import { alertStore, DBState } from 'src/ts/stores.svelte';
    import { HideIconStore, ReloadGUIPointer, selIdState } from "../../ts/stores.svelte";
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
    let translated = $state(DBState.db.autoTranslate)
    let role = $derived(DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message[idx]?.role)
    async function rm(e:MouseEvent, rec?:boolean){
        if(e.shiftKey){
            let msg = DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message
            msg = msg.slice(0, idx)
            DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message = msg
            return
        }

        const rm = DBState.db.askRemoval ? await alertConfirm(language.removeChat) : true
        if(rm){
            if(DBState.db.instantRemove || rec){
                const r = await alertConfirm(language.instantRemoveConfirm)
                let msg = DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message
                if(!r){
                    msg = msg.slice(0, idx)
                }
                else{
                    msg.splice(idx, 1)
                }
                DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message = msg
            }
            else{
                let msg = DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message
                msg.splice(idx, 1)
                DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message = msg
            }
        }
    }

    async function edit(){
        DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message[idx].data = message
    }

    function getCbsCondition(){
        try{
            const cbsConditions:CbsConditions = {
                firstmsg: firstMessage ?? false,
                chatRole: DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage]?.message?.[idx]?.role ?? null,
            }
            return cbsConditions
        }
        catch(e){
            return {
                firstmsg: firstMessage ?? false,
                chatRole: null,
            }
        }
    }

    function displaya(message:string){
        const perf = performance.now()
        msgDisplay = risuChatParser(message, {chara: name, chatID: idx, rmVar: true, visualize: true, cbsConditions: getCbsCondition()})
    }

    const setStatusMessage = (message:string, timeout:number = 0)=>{
        statusMessage = message
        if(timeout === 0) return
        setTimeout(() => {
            statusMessage = ''
        }, timeout)
    }

    // Since in svelte 5, @html isn
    // svelte-ignore non_reactive_update
    let lastParsed = ''
    let lastCharArg:string|simpleCharacterArgument = null
    let lastChatId = -10
    let blankMessage = $state((message === '{{none}}' || message === '{{blank}}' || message === '') && idx === -1)
    $effect.pre(() => {
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
                    if(DBState.db.autoTranslate){
                        translateText = true
                    }

                    setTimeout(() => {
                            translated = translateText
                    }, 10)
                } catch (error) {
                    console.error(error)
                }
            }
            if(translateText){
                if(!DBState.db.legacyTranslation){
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
            lastParsed = lastParsedQueue
        }
    }

    $effect.pre(() => {
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

    function RenderGUIHtml(html:string){
        try {
            const parser = new DOMParser()
            const doc = parser.parseFromString(risuChatParser(html ?? ''), 'text/html')
            console.log(doc.body)
            return doc.body   
        } catch (error) {
            const placeholder = document.createElement('div')
            return placeholder
        }
    }

</script>


{#snippet genInfo()}
    {#if messageGenerationInfo && DBState.db.requestInfoInsideChat}
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
{/snippet}

{#snippet textBox()}
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
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span class="text chat-width chattext prose minw-0" class:prose-invert={$ColorSchemeTypeStore} onclick={() => {
            if(DBState.db.clickToEdit && idx > -1){
                editMode = true
            }
        }}
            style:font-size="{0.875 * (DBState.db.zoomsize / 100)}rem"
            style:line-height="{(DBState.db.lineHeight ?? 1.25) * (DBState.db.zoomsize / 100)}rem"
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
{/snippet}

{#snippet icons(options:{applyTextColors?:boolean} = {})}
    <div class="flex-grow flex items-center justify-end" class:text-textcolor2={options?.applyTextColors !== false}>
        <span class="text-xs">{statusMessage}</span>
        {#if DBState.db.logShare}
            <button class="ml-2 hover:text-blue-500 transition-colors" onclick={() => {
                alertStore.set({
                    type: 'pukmakkurit',
                    msg: lastParsed,
                })
            }}>
                <Sparkles size={22}/>
            </button>
        {/if}
        {#if DBState.db.useChatCopy && !blankMessage}
            <button class="ml-2 hover:text-blue-500 transition-colors" onclick={()=>{
                window.navigator.clipboard.writeText(msgDisplay).then(() => {
                    setStatusMessage(language.copied)
                })
            }}>
                <CopyIcon size={20}/>
            </button>    
        {/if}
        {#if idx > -1}
            {#if DBState.db.characters[selIdState.selId].type !== 'group' && DBState.db.characters[selIdState.selId].ttsMode !== 'none' && (DBState.db.characters[selIdState.selId].ttsMode)}
                <button class="ml-2 hover:text-blue-500 transition-colors" onclick={()=>{
                    return sayTTS(null, message)
                }}>
                    <Volume2Icon size={20}/>
                </button>
            {/if}

            {#if !$ConnectionOpenStore}
                <button class={"ml-2 hover:text-blue-500 transition-colors "+(editMode?'text-blue-400':'')} onclick={() => {
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
                <button class="ml-2 hover:text-blue-500 transition-colors" onclick={(e) => rm(e, false)} use:longpress={(e) => rm(e, true)}>
                    <TrashIcon size={20}/>
                </button>
            {/if}
        {/if}
        {#if DBState.db.translator !== '' && !blankMessage}
            <button class={"ml-2 cursor-pointer hover:text-blue-500 transition-colors " + (translated ? 'text-blue-400':'')} class:translating={translating} onclick={async () => {
                translated = !translated
            }}>
                <LanguagesIcon />
            </button>
        {/if}
        {#if rerollIcon || altGreeting}
            {#if DBState.db.swipe || altGreeting}
                <button class="ml-2 hover:text-blue-500 transition-colors" onclick={unReroll}>
                    <ArrowLeft size={22}/>
                </button>
                <button class="ml-2 hover:text-blue-500 transition-colors" onclick={onReroll}>
                    <ArrowRight size={22}/>
                </button>
            {:else}
                <button class="ml-2 hover:text-blue-500 transition-colors" onclick={onReroll}>
                    <RefreshCcwIcon size={20}/>
                </button>
            {/if}
        {/if}
    </div>
{/snippet}

{#snippet icon(options:{rounded?:boolean,styleFix?:string} = {})}
    {#if !blankMessage && !$HideIconStore}
        {#if DBState.db.characters[selIdState.selId]?.chaId === "§playground"}
        <div class="shadow-lg border-textcolor2 border flex justify-center items-center text-textcolor2" style={options?.styleFix ?? `height:${DBState.db.iconsize * 3.5 / 100}rem;width:${DBState.db.iconsize * 3.5 / 100}rem;min-width:${DBState.db.iconsize * 3.5 / 100}rem`}
            class:rounded-md={options?.rounded} class:rounded-full={options?.rounded}>
                {#if name === 'assistant'}
                    <BotIcon />
                {:else}
                    <UserIcon />
                {/if}
            </div>
        {:else}
            {#await img}
                <div class="shadow-lg bg-textcolor2" style={options?.styleFix ??`height:${DBState.db.iconsize * 3.5 / 100}rem;width:${DBState.db.iconsize * 3.5 / 100}rem;min-width:${DBState.db.iconsize * 3.5 / 100}rem`}
                class:rounded-md={!options?.rounded} class:rounded-full={options?.rounded}></div>
            {:then m}
                {#if largePortrait && (!options?.rounded)}
                    <div class="shadow-lg bg-textcolor2" style={m + (options?.styleFix ?? `height:${DBState.db.iconsize * 3.5 / 100 / 0.75}rem;width:${DBState.db.iconsize * 3.5 / 100}rem;min-width:${DBState.db.iconsize * 3.5 / 100}rem`)}
                    class:rounded-md={!options?.rounded} class:rounded-full={options?.rounded}></div>
                {:else}
                    <div class="shadow-lg bg-textcolor2" style={m + (options?.styleFix ?? `height:${DBState.db.iconsize * 3.5 / 100}rem;width:${DBState.db.iconsize * 3.5 / 100}rem;min-width:${DBState.db.iconsize * 3.5 / 100}rem`)}
                    class:rounded-md={!options?.rounded} class:rounded-full={options?.rounded}></div>
                {/if}
            {/await}
        {/if}
    {/if}
{/snippet}

{#snippet renderGuiHtmlPart(dom:HTMLElement)}
    {#if dom.tagName === 'IMG'}
        <img class={dom.getAttribute('class') ?? ''} alt="" style={dom.getAttribute('style') ?? ''} />
    {:else if dom.tagName === 'A'}
        <a target="_blank" rel="noreferrer" href={
            (dom.getAttribute('href') && dom.getAttribute('href').startsWith('https')) ? dom.getAttribute('href') : ''
        } class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </a>
    {:else if dom.tagName === 'SPAN'}
        <span class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </span>
    {:else if dom.tagName === 'DIV'}
        <div class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </div>
    {:else if dom.tagName === 'P'}
        <p class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </p>
    {:else if dom.tagName === 'H1'}
        <h1 class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </h1>
    {:else if dom.tagName === 'H2'}
        <h2 class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </h2>
    {:else if dom.tagName === 'H3'}
        <h3 class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </h3>
    {:else if dom.tagName === 'H4'}
        <h4 class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </h4>
    {:else if dom.tagName === 'H5'}
        <h5 class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </h5>
    {:else if dom.tagName === 'H6'}
        <h6 class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </h6>
    {:else if dom.tagName === 'UL'}
        <ul class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </ul>
    {:else if dom.tagName === 'OL'}
        <ol class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </ol>
    {:else if dom.tagName === 'LI'}
        <li class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </li>
    {:else if dom.tagName === 'TABLE'}
        <table class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </table>
    {:else if dom.tagName === 'TR'}
        <tr class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </tr>
    {:else if dom.tagName === 'TD'}
        <td class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </td>
    {:else if dom.tagName === 'TH'}
        <th class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </th>
    {:else if dom.tagName === 'HR'}
        <hr class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''} />
    {:else if dom.tagName === 'BR'}
        <br class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''} />
    {:else if dom.tagName === 'CODE'}
        <code class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </code>
    {:else if dom.tagName === 'PRE'}
        <pre class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </pre>
    {:else if dom.tagName === 'BLOCKQUOTE'}
        <blockquote class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </blockquote>
    {:else if dom.tagName === 'EM'}
        <em class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </em>
    {:else if dom.tagName === 'STRONG'}
        <strong class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </strong>
    {:else if dom.tagName === 'U'}
        <u class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </u>
    {:else if dom.tagName === 'DEL'}
        <del class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </del>
    {:else if dom.tagName === 'BUTTON'}
        <button class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </button>
    {:else if dom.tagName === 'STYLE'}
        <!-- <div>
            <style>
                {dom.innerHTML}
            </style>
        </div> -->
    {:else if dom.tagName === 'RISUTEXTBOX'}
        {@render textBox()}
    {:else if dom.tagName === 'RISUICON'}
        {@render icon()}
    {:else if dom.tagName === 'RISUBUTTONS'}
        {@render icons()}
    {:else if dom.tagName === 'RISUGENINFO'}
        {@render genInfo()}
    {:else if dom.tagName === 'STYLE'}
        <svelte:element this={'style'}>
            {dom.innerHTML}
        </svelte:element>
    {:else}
        <div class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>
            {@render renderChilds(dom)}
        </div>
    {/if}

    
{/snippet}

{#snippet renderChilds(dom:HTMLElement)}
    {#each dom.children as node}
        {@render renderGuiHtmlPart((node as HTMLElement))}
    {/each}
{/snippet}

<div class="flex max-w-full justify-center risu-chat" style={isLastMemory ? `border-top:${DBState.db.memoryLimitThickness}px solid rgba(98, 114, 164, 0.7);` : ''}>
    <div class="text-textcolor mt-1 ml-4 mr-4 mb-1 p-2 bg-transparent flex-grow border-t-gray-900 border-opacity-30 border-transparent flexium items-start max-w-full" >
        {#if DBState.db.theme === 'mobilechat' && !blankMessage}
            <div class={role === 'user' ? "flex items-start w-full justify-end" : "flex items-start"}>
                {#if role !== 'user'}
                    {@render icon({rounded: true})}
                {/if}
                <div
                    class="bg-gray-100 rounded-lg p-3 max-w-[70%] mx-2"
                    class:rounded-tl-none={role !== 'user'}
                    class:rounded-tr-none={role === 'user'}
                >
                    <p class="text-gray-800">{@render textBox()}</p>
                    {#if DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message[idx]?.time}
                        <span class="text-xs text-textcolor2 mt-1 block">
                            {new Intl.DateTimeFormat(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                month: '2-digit',
                                day: '2-digit',
                                hour12: false
                            }).format(DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message[idx].time)}
                        </span>
                    {/if}
                </div>
                {#if role === 'user'}
                    {@render icon({rounded: true})}
                {/if}
            </div>
        {:else if DBState.db.theme === 'cardboard' && !blankMessage}
            <div class="w-full flex flex-col px-0 sm:px-4 py-4 relative">
                <div class="bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg shadow-lg border-gray-400 border p-4 flex flex-col">
                    <div class="flex gap-4 mt-2 flex-col sm:flex-row">
                        <div class="flex flex-col items-center">
                            <div class="sm:h-96 sm:w-72 sm:min-w-72 w-48 h-64">
                                {@render icon({rounded: false, styleFix:'height:100%;width:100%;'})}
                            </div>
                            <h2 class="text-base font-bold text-gray-500 text-center mt-2 max-w-full text-ellipsis">{name}</h2>

                        </div>
                        {#if editMode}
                            <textarea class="flex-grow h-138 sm:h-96 overflow-y-auto bg-transparent text-black p-2 mb-2 resize-none" bind:value={message}></textarea>
                        {:else}
                            <div class="flex-grow h-138 sm:h-96 overflow-y-auto p-2 mb-2 sm:mb-0">
                                {@render textBox()}
                            </div>
                        {/if}
                    </div>
                </div>
                <div class="absolute bottom-0 right-0 bg-gradient-to-b from-gray-200 to-gray-300 p-2 rounded-md border border-gray-400 text-gray-400">
                    {@render icons({applyTextColors: false})}
                </div>
            </div>
        {:else if DBState.db.theme === 'customHTML' && !blankMessage}
            {@render renderGuiHtmlPart(RenderGUIHtml(DBState.db.guiHTML))}
        {:else}
            {@render icon({rounded: DBState.db.roundIcons})}
            <span class="flex flex-col ml-4 w-full max-w-full min-w-0 text-black">
                <div class="flexium items-center chat-width">
                    {#if DBState.db.characters[selIdState.selId]?.chaId === "§playground" && !blankMessage}
                        <span class="chat-width text-xl border-darkborderc flex items-center">
                            <span>{name === 'assistant' ? 'Assistant' : 'User'}</span>
                            <button class="ml-2 text-textcolor2 hover:text-textcolor" onclick={() => {
                                DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message[idx].role = DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message[idx].role === 'char' ? 'user' : 'char'
                                DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage] = DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage]
                            }}><ArrowLeftRightIcon size="18" /></button>
                        </span>
                    {:else if !blankMessage && !$HideIconStore}
                        <span class="chat-width text-xl unmargin text-textcolor">{name}</span>
                    {/if}
                    {@render icons()}
                </div>
                {@render genInfo()}
                {@render textBox()}
            </span>
        {/if}
    </div>
</div>
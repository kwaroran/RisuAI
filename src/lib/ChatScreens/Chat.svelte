<script lang="ts">
    import { ArrowLeft, ArrowLeftRightIcon, ArrowRight, BookmarkIcon, BotIcon, CopyIcon, PowerOff, GitBranch, HamburgerIcon, LanguagesIcon, MenuIcon, PencilIcon, RefreshCcwIcon, SplitIcon, TrashIcon, UserIcon, Volume2Icon, Scissors } from "@lucide/svelte"
    import { aiLawApplies, changeChatTo, foldChatToMessage, getFileSrc } from "src/ts/globalApi.svelte"
    import { ColorSchemeTypeStore } from "src/ts/gui/colorscheme"
    import { longpress } from "src/ts/gui/longtouch"
    import { getModelInfo } from "src/ts/model/modellist"
    import { runLuaInteractionTrigger } from 'src/ts/process/scriptings'
    import { risuChatParser } from "src/ts/process/scripts"
    import { runTrigger } from 'src/ts/process/triggers'
    import { sayTTS } from "src/ts/process/tts"
    import { DBState, ReloadChatPointer, CurrentTriggerIdStore, popupStore } from 'src/ts/stores.svelte'
    import { ConnectionOpenStore } from "src/ts/sync/multiuser"
    import { capitalize, getUserIcon, getUserName, sleep } from "src/ts/util"
    import { onDestroy, onMount } from "svelte"
    import { type Unsubscriber } from "svelte/store"
    import { v4 as uuidv4, v4 } from 'uuid'
    import { language } from "../../lang"
    import { alertClear, alertConfirm, alertInput, alertNormal, alertRequestData, alertWait } from "../../ts/alert"
    import { ParseMarkdown, type CbsConditions, type simpleCharacterArgument } from "../../ts/parser.svelte"
    import { getCurrentCharacter, getCurrentChat, setCurrentChat, type MessageGenerationInfo } from "../../ts/storage/database.svelte"
    import { selectedCharID } from "../../ts/stores.svelte"
    import { HideIconStore, ReloadGUIPointer, selIdState } from "../../ts/stores.svelte"
    import AutoresizeArea from "../UI/GUI/TextAreaResizable.svelte"
    import ChatBody from './ChatBody.svelte'
    import PopupButton from "../UI/PopupButton.svelte";

    let translating = $state(false)
    let editMode = $state(false)
    let statusMessage:string = $state('')
    let retranslate = $state(false)
    let bodyRoot:HTMLElement|null = $state(null)
    interface Props {
        message?: string;
        name?: string;
        largePortrait?: boolean;
        isLastMemory: boolean;
        img?: string|Promise<string>;
        idx?: number;
        messageGenerationInfo?: MessageGenerationInfo|null;
        rerollIcon?: boolean|'dynamic';
        role?: string;
        totalLength?: number;
        onReroll?: () => void;
        unReroll?: () => void;
        character?: simpleCharacterArgument|string|null;
        firstMessage?: boolean;
        altGreeting?: boolean;
        currentPage?: number;
        totalPages?: number;
        isComment?: boolean;
        disabled?: boolean | 'allBefore';
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
        role = null,
        totalLength = 0,
        onReroll = () => {},
        unReroll = () => {},
        character = null,
        firstMessage = false,
        altGreeting = false,
        currentPage = 1,
        totalPages = 1,
        isComment = false,
        disabled = false,
    }: Props = $props();

    let msgDisplay = $state('')
    let translated = $state(false)

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
        msgDisplay = risuChatParser(message, {chara: name, chatID: idx, rmVar: true, visualize: true, cbsConditions: getCbsCondition()})
    }

    const setStatusMessage = (message:string, timeout:number = 0)=>{
        statusMessage = message
        if(timeout === 0) return
        setTimeout(() => {
            statusMessage = ''
        }, timeout)
    }


    let blankMessage = $derived((message === '{{none}}' || message === '{{blank}}' || message === '') && idx === -1 || isComment)

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
            const doc = parser.parseFromString(risuChatParser(html ?? '', {cbsConditions: getCbsCondition()}), 'text/html')
            return doc.body   
        } catch (error) {
            const placeholder = document.createElement('div')
            return placeholder
        }
    }

    async function handleButtonTriggerWithin(event: UIEvent) {
        const currentChar = getCurrentCharacter()
        if(currentChar.type === 'group'){
            return
        }

        const target = event.target as HTMLElement
        const origin = target.closest('[risu-trigger], [risu-btn]')
        if (!origin) {
            return
        }

        const triggerName = origin.getAttribute('risu-trigger')
        const triggerId = origin.getAttribute('risu-id')
        const btnEvent = origin.getAttribute('risu-btn')

        const triggerResult =
            triggerName ?
                await runTrigger(currentChar, 'manual', {
                    chat: getCurrentChat(),
                    manualName: triggerName,
                    triggerId: triggerId || undefined,
                }) :
            btnEvent ?
                await runLuaInteractionTrigger('button', currentChar, btnEvent) :
            null

        if(triggerResult) {
            setCurrentChat(triggerResult.chat)
            ReloadChatPointer.update((v) => {
                v[idx] = (v[idx] ?? 0) + 1
                return v
            })
        }
        
        if(triggerName && triggerId) {
            setTimeout(() => {
                CurrentTriggerIdStore.set(null)
            }, 100) // Small delay to allow display mode to complete
        }
    }

    async function handleFormTriggerWithin(event: SubmitEvent) {
        // Regardless of attribute presence, prevent undesirable site exits via form submission
        event.preventDefault()

        const currentChar = getCurrentCharacter()
        if (currentChar.type === 'group') {
            return
        }

        const target = event.target as HTMLFormElement
        const formEvent = target.getAttribute('risu-form')

        if (!formEvent) {
            return
        }

        const obj = {}
        for (const [k, v] of new FormData(target)) {
            if (obj[k]) {
                if (Array.isArray(obj[k])) {
                    (obj[k] as any[]).push(v)
                } else {
                    obj[k] = [obj[k], v]
                }
            } else {
                obj[k] = v
            }
        }

        const triggerResult =  formEvent ? await runLuaInteractionTrigger('form', currentChar, formEvent, { data: obj }) : null

        if(triggerResult) {
            setCurrentChat(triggerResult.chat)
            ReloadChatPointer.update((v) => {
                v[idx] = (v[idx] ?? 0) + 1
                return v
            })
        }
    }

    let isBookmarked = $derived(
        DBState.db.characters[selIdState.selId]
            ?.chats[DBState.db.characters[selIdState.selId].chatPage]
            ?.bookmarks?.includes(DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message[idx]?.chatId) ?? false
    );

    async function toggleBookmark() {
        const chat = DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage];
        
        if(!chat.message[idx]) return;

        let messageId = chat.message[idx]?.chatId;
        const messageContent = chat.message[idx]?.data;

        if (!messageId) {
            messageId = uuidv4();
            chat.message[idx].chatId = messageId;
        }

        chat.bookmarks ??= [];
        chat.bookmarkNames ??= {};

        const bookmarkIndex = chat.bookmarks.indexOf(messageId);

        if (bookmarkIndex > -1) {
            chat.bookmarks.splice(bookmarkIndex, 1);
            delete chat.bookmarkNames[messageId];
        } else {
            chat.bookmarks.push(messageId);

            const msgSender = chat.message[idx]?.role === 'user' ? getUserName() : name;
            const newName= await alertInput(language.bookmarkAskNameOrDefault);

            if (newName && newName.trim() !== '') {
                chat.bookmarkNames[messageId] = newName;
            } else {
                let defaultName;

                const blacklist = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', '|', ';', ':', '"', "'", ',', '.', '<', '>', '/', '?'];
                let lines = messageContent.split('\n');
                lines = lines.splice(Math.floor(lines.length * 0.5));
                for (const line of lines) {
                    if (line && !blacklist.some(char => line.startsWith(char))) {
                        defaultName = line.trim().slice(0, 50) + '...';
                        break;
                    }
                }
                if (!defaultName) {
                    defaultName = messageContent.slice(0, 50) + '...';
                }
                chat.bookmarkNames[messageId] = msgSender + '| ' + defaultName;
            }
        }

        chat.bookmarks = [...chat.bookmarks];
    }
</script>


{#snippet genInfo()}
    <div class="flex flex-col items-end">
        {#if messageGenerationInfo && (DBState.db.requestInfoInsideChat || aiLawApplies())}
            <button class="text-sm p-1 text-textcolor2 border-darkborderc float-end mr-2 my-1
                    hover:ring-darkbutton hover:ring-3 rounded-md hover:text-textcolor transition-all flex justify-center items-center" 
                    onclick={() => {
                        const currentGenerationInfo = idx >= 0 ? 
                            DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[idx].generationInfo :
                            messageGenerationInfo

                        alertRequestData({
                            genInfo: currentGenerationInfo,
                            idx: idx,
                        })
                    }}
            >
                <BotIcon size={20} />
                <span class="ml-1">
                    {capitalize(getModelInfo(messageGenerationInfo.model).shortName)}
                </span>
            </button>
        {/if}
        {#if DBState.db.translatorType === 'llm' && translated}
            <button class="text-sm p-1 text-textcolor2 border-darkborderc float-end mr-2 my-1
                            hover:ring-darkbutton hover:ring-3 rounded-md hover:text-textcolor transition-all flex justify-center items-center" 
                    onclick={() => {
                        retranslate = true
                    }}
            >
                <RefreshCcwIcon size={20} />
                <span class="ml-1">
                    {language.retranslate}
                </span>
            </button>
        {/if}
    </div>
{/snippet}

{#snippet textBox()}
    {#if editMode}
        <AutoresizeArea bind:value={message} handleLongPress={() => {
            editMode = false
        }} />
    {:else if isComment}
        <div class="w-full flex justify-center text-textcolor2 italic mb-12">

            {#if msgDisplay.startsWith('{{specialcomment')}
                {@const parts = msgDisplay.split('::')}
                {@const type = parts[1]}

                {#if type === 'branchedfrom'}
                    <button class="text-blue-500 hover:underline"
                        onclick={() => {
                            console.log(parts)
                            changeChatTo(parts[2] ?? '')
                            foldChatToMessage(parts[4])
                        }}
                    >
                        <GitBranch size={20} class="inline-block mr-1" />
                        {language.branchedText.replace("{}", parts[3] ?? '')}
                    </button>
                {/if}
            {:else}
                {msgDisplay}
            {/if}
        </div>
    {:else if blankMessage}
        <div class="w-full flex justify-center text-textcolor2 italic mb-12">
            {language.noMessage}
        </div>
    {:else}
        {@const chatReloadPointer = $ReloadGUIPointer + ($ReloadChatPointer[idx] ?? 0)}
        {@const totalLengthPointer = (idx > totalLength - 6) ? totalLength : 0}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span class="text chat-width chattext prose minw-0"
            class:prose-invert={$ColorSchemeTypeStore}
            bind:this={bodyRoot}
            onclick={() => {
            if(DBState.db.clickToEdit && idx > -1){
                editMode = true
            }
        }}
            style:font-size="{0.875 * (DBState.db.zoomsize / 100)}rem"
            style:line-height="{(DBState.db.lineHeight ?? 1.25) * (DBState.db.zoomsize / 100)}rem"
        >
            {#key `${totalLengthPointer}|${chatReloadPointer}`}
                <ChatBody
                    {character}
                    {firstMessage}
                    {idx}
                    {msgDisplay}
                    {name}
                    {bodyRoot}
                    modelShortName={
                        messageGenerationInfo ? getModelInfo(messageGenerationInfo?.model).shortName : ''
                    }
                    role={role ?? null}
                    bind:translated={translated}
                    bind:translating={translating}
                    bind:retranslate={retranslate} />
            {/key}
        </span>
    {/if}
{/snippet}

{#snippet iconButtons(options:{applyTextColors?:boolean} = {})}
    <div class="grow flex items-center justify-end" class:text-textcolor2={options?.applyTextColors !== false}>
        {#if isComment}
            <button
                class="flex items-center hover:text-blue-500 transition-colors button-icon-remove"
                onclick={async (e) => {
                    await rm(e, true)
                }}
            >
                <TrashIcon size={20} />

            </button>
        {:else}
            <span class="text-xs">{statusMessage}</span>
            <div class="flex items-center ml-2 gap-2">
                {#if window.innerWidth >= 640}
                    {@render majorIconButtonsBody(false)}
                    <PopupButton>
                        {@render minorIconButtonsBody(true)}
                    </PopupButton>
                {:else}
                    <PopupButton>
                        {@render majorIconButtonsBody(true)}
                        {@render minorIconButtonsBody(true)}
                    </PopupButton>
                {/if}
                {@render rerolls()}

            </div>
        {/if}
    </div>
{/snippet}


{#snippet majorIconButtonsBody(showNames:boolean)}
    {#if DBState.db.useChatCopy && !blankMessage}
    <button class="flex items-center hover:text-blue-500 transition-colors button-icon-copy" onclick={async ()=>{
        if(window.navigator.clipboard.write){
            try {
                alertWait(language.loading)
                const root = document.querySelector(':root') as HTMLElement;

                const parser = new DOMParser()
                const doc = parser.parseFromString(
                    await ParseMarkdown(msgDisplay, getCurrentCharacter(), 'normal', idx, getCbsCondition())
                , 'text/html')
                
                doc.querySelectorAll('mark').forEach((el) => {
                    const d = el.getAttribute('risu-mark')
                    if(d === 'quote1' || d === 'quote2'){
                        const newEle = document.createElement('div')
                        newEle.textContent = el.textContent
                        newEle.setAttribute('style', `background: transparent; color: ${
                            root.style.getPropertyValue('--FontColorQuote' + d.slice(-1))
                        };`)
                        el.replaceWith(newEle)
                        return
                    }
                })
                doc.querySelectorAll('p').forEach((el) => {
                    el.setAttribute('style', `color: ${root.style.getPropertyValue('--FontColorStandard')};`)
                })
                doc.querySelectorAll('em').forEach((el) => {
                    el.setAttribute('style', `font-style: italic; color: ${root.style.getPropertyValue('--FontColorItalic')};`)
                })
                doc.querySelectorAll('strong').forEach((el) => {
                    el.setAttribute('style', `font-weight: bold; color: ${root.style.getPropertyValue('--FontColorBold')};`)
                })
                doc.querySelectorAll('em strong').forEach((el) => {
                    el.setAttribute('style', `font-weight: bold; font-style: italic; color: ${root.style.getPropertyValue('--FontColorItalicBold')};`)
                })
                doc.querySelectorAll('strong em').forEach((el) => {
                    el.setAttribute('style', `font-weight: bold; font-style: italic; color: ${root.style.getPropertyValue('--FontColorItalicBold')};`)
                })
                
                const imgs = doc.querySelectorAll('img')
                for(const img of imgs){
                    img.setAttribute('alt', 'from Risuai')
                    const url = img.getAttribute('src')
                    
                    img.setAttribute('style', `
                        max-width: 100%;
                        margin: 10px 0;
                        border-radius: 8px;
                        box-shadow: rgba(0,0,0,0.1) 0px 2px 8px;
                        display: block;
                        margin-left: auto;
                        margin-right: auto;
                    `)
                    
                    if(url && (url.startsWith('http://asset.localhost') || url.startsWith('https://asset.localhost') || url.startsWith('https://sv.risuai') || url.startsWith('data:') || url.startsWith('http') || url.startsWith('/'))){
                        try {
                            let fetchUrl = url
                            if(url.startsWith('/')) {
                                fetchUrl = window.location.origin + url
                            }
                            
                            const data = await fetch(fetchUrl)
                            if (data.ok) {
                                const canvas = document.createElement('canvas')
                                const ctx = canvas.getContext('2d')
                                const imgElement = new Image()
                                imgElement.crossOrigin = 'anonymous'
                                imgElement.src = await data.blob().then((b) => new Promise((resolve, reject) => {
                                    const reader = new FileReader()
                                    reader.onload = () => resolve(reader.result as string)
                                    reader.onerror = reject
                                    reader.readAsDataURL(b)
                                }))
                                await new Promise((resolve) => {
                                    imgElement.onload = resolve
                                })
                                canvas.width = imgElement.width
                                canvas.height = imgElement.height
                                ctx.drawImage(imgElement, 0, 0)
                                const dataURL = canvas.toDataURL('image/jpeg', 0.6)
                                img.setAttribute('src', dataURL)
                            }
                        } catch (error) {
                            console.error('Image error:', error)
                        }
                    }
                }

                let iconDataUrl = ''
                let hasValidImage = false
                
                try {
                    const iconImage = (await getFileSrc(DBState.db.characters[selIdState.selId].image ?? '')) ?? ''
                    
                    if(iconImage && (iconImage.startsWith('http://asset.localhost') || iconImage.startsWith('https://asset.localhost') || iconImage.startsWith('https://sv.risuai') || iconImage.startsWith('data:') || iconImage.startsWith('http') || iconImage.startsWith('/'))){
                        if(iconImage.startsWith('data:')){
                            iconDataUrl = iconImage
                            hasValidImage = true
                        } else {
                            const data = await fetch(iconImage)
                            if (data.ok) {
                                const canvas = document.createElement('canvas')
                                const ctx = canvas.getContext('2d')
                                const img = new Image()
                                img.crossOrigin = 'anonymous'
                                img.src = await data.blob().then((b) => new Promise((resolve, reject) => {
                                    const reader = new FileReader()
                                    reader.onload = () => resolve(reader.result as string)
                                    reader.onerror = reject
                                    reader.readAsDataURL(b)
                                }))
                                await new Promise((resolve, reject) => {
                                    img.onload = () => {
                                        canvas.width = img.width
                                        canvas.height = img.height
                                        ctx.drawImage(img, 0, 0)
                                        iconDataUrl = canvas.toDataURL('image/jpeg', 0.9)
                                        hasValidImage = true
                                        resolve(true)
                                    }
                                    img.onerror = () => {
                                        hasValidImage = false
                                        resolve(false)
                                    }
                                })
                            }
                        }
                    }
                } catch (error) {
                    console.error('Icon error:', error)
                    hasValidImage = false
                }

                const isUserMessage = role === 'user'
                const displayName = isUserMessage ? getUserName() : name
                const modelInfo = messageGenerationInfo ? capitalize(getModelInfo(messageGenerationInfo.model).shortName) : (isUserMessage ? 'User' : 'AI')
                
                let finalIconDataUrl = iconDataUrl
                let finalHasValidImage = hasValidImage
                
                if (isUserMessage) {
                    finalHasValidImage = false
                    const userIcon = getUserIcon()
                    if (userIcon) {
                        try {
                            const userIconSrc = await getFileSrc(userIcon)
                            if (userIconSrc && (userIconSrc.startsWith('http://asset.localhost') || userIconSrc.startsWith('https://asset.localhost') || userIconSrc.startsWith('https://sv.risuai') || userIconSrc.startsWith('data:') || userIconSrc.startsWith('http') || userIconSrc.startsWith('/'))) {
                                if (userIconSrc.startsWith('data:')) {
                                    finalIconDataUrl = userIconSrc
                                    finalHasValidImage = true
                                } else {
                                    const data = await fetch(userIconSrc)
                                    if (data.ok) {
                                        const canvas = document.createElement('canvas')
                                        const ctx = canvas.getContext('2d')
                                        const img = new Image()
                                        img.crossOrigin = 'anonymous'
                                        img.src = await data.blob().then((b) => new Promise((resolve, reject) => {
                                            const reader = new FileReader()
                                            reader.onload = () => resolve(reader.result as string)
                                            reader.onerror = reject
                                            reader.readAsDataURL(b)
                                        }))
                                        await new Promise((resolve, reject) => {
                                            img.onload = () => {
                                                canvas.width = img.width
                                                canvas.height = img.height
                                                ctx.drawImage(img, 0, 0)
                                                finalIconDataUrl = canvas.toDataURL('image/jpeg', 0.9)
                                                finalHasValidImage = true
                                                resolve(true)
                                            }
                                            img.onerror = () => {
                                                finalHasValidImage = false
                                                resolve(false)
                                            }
                                        })
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('User icon error:', error)
                            finalHasValidImage = false
                        }
                    }
                }
                
                const html = `<div style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: ${root.style.getPropertyValue('--risu-theme-textcolor')}; line-height: 1.6; max-width: 600px; margin: 1rem auto; background: ${root.style.getPropertyValue('--risu-theme-bgcolor')}; border-radius: 12px; box-shadow: 0px 4px 12px rgba(0,0,0,0.15); overflow: hidden;">
<div style="padding: 20px;">
<div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 1rem; text-align: center;">
    ${finalHasValidImage ? `<img style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid ${root.style.getPropertyValue('--risu-theme-darkborderc')}; margin-bottom: 0.75rem; object-fit: cover;" src="${finalIconDataUrl}" alt="profile">` : ''}
    <h3 style="color: ${root.style.getPropertyValue('--risu-theme-textcolor')}; font-weight: 600; font-size: 1.5rem; margin: 0 0 0.5rem 0;">${displayName}</h3>
    ${!isUserMessage ? `<span style="display: inline-block; border-radius: 16px; font-size: 0.8rem; padding: 0.25rem 0.75rem; background: ${root.style.getPropertyValue('--risu-theme-darkbg')}; color: ${root.style.getPropertyValue('--risu-theme-textcolor')}; border: 1px solid ${root.style.getPropertyValue('--risu-theme-darkborderc')};">${modelInfo}</span>` : ''}
</div>
<div style="border-top: 1px solid ${root.style.getPropertyValue('--risu-theme-darkborderc')}; padding-top: 1rem;">
    ${doc.body.innerHTML}
</div>
<div style="text-align: center; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid ${root.style.getPropertyValue('--risu-theme-darkborderc')};">
    <span style="font-size: 0.75rem; color: ${root.style.getPropertyValue('--risu-theme-textcolor2')}; opacity: 0.7;">From Risuai</span>
</div>
</div>
</div>`

                await window.navigator.clipboard.write([
                    new ClipboardItem({
                        'text/plain': new Blob([msgDisplay], {type: 'text/plain'}),
                        'text/html': new Blob([html], {type: 'text/html'})
                    })
                ])
                alertNormal(language.copied)
                return
            }
            catch (e) {
                alertClear()
                window.navigator.clipboard.writeText(msgDisplay).then(() => {
                    setStatusMessage(language.copied)
                })
            }
        }
        window.navigator.clipboard.writeText(msgDisplay).then(() => {
            setStatusMessage(language.copied)
        })
    }}>
        <CopyIcon size={20}/>
        {#if showNames}
            <span class="ml-1">{language.copy}</span>
        {/if}
    </button>    
{/if}
{#if idx > -1}
    {#if DBState.db.characters[selIdState.selId].type !== 'group' && DBState.db.characters[selIdState.selId].ttsMode !== 'none' && (DBState.db.characters[selIdState.selId].ttsMode)}
        <button class="flex items-center hover:text-blue-500 transition-colors button-icon-tts" onclick={()=>{
            return sayTTS(null, message)
        }}>
            <Volume2Icon size={20}/>
            {#if showNames}
                <span class="ml-1">TTS</span>
            {/if}
        </button>
    {/if}
    {#if !$ConnectionOpenStore}
        <button class={"flex items-center hover:text-blue-500 transition-colors button-icon-edit "+(editMode?'text-blue-400':'')} onclick={() => {
            if(!editMode){
                editMode = true
            }
            else{
                editMode = false
                edit()
            }
        }}>
            <PencilIcon size={20}/>

            {#if showNames}
                <span class="ml-1">{language.edit}</span>
            {/if}
        </button>
        <button class="flex items-center hover:text-blue-500 transition-colors button-icon-remove" onclick={(e) => rm(e, false)} use:longpress={(e) => rm(e, true)}>
            <TrashIcon size={20}/>

            {#if showNames}
                <span class="ml-1">{language.remove}</span>
            {/if}
        </button>
    {/if}
{/if}
{#if DBState.db.translator !== '' && !blankMessage}
    <button class={"flex items-center cursor-pointer hover:text-blue-500 transition-colors button-icon-translate " + (translated ? 'text-blue-400':'')} class:translating={translating} onclick={async () => {
        translated = !translated
    }}>
        <LanguagesIcon />

        {#if showNames}
            <span class="ml-1">{language.translate}</span>
        {/if}
    </button>
{/if}
{/snippet}

{#snippet rerolls()}
    {#if rerollIcon || altGreeting}
        {#if DBState.db.swipe || altGreeting}
            <button class="flex items-center hover:text-blue-500 transition-colors button-icon-unreroll" class:dyna-icon={rerollIcon === 'dynamic'} onclick={unReroll}>
                <ArrowLeft size={22}/>
            </button>
            {#if firstMessage && DBState.db.swipe && DBState.db.showFirstMessagePages}
                <span class="flex items-center text-xs text-textcolor2">{currentPage}/{totalPages}</span>
            {/if}
            <button class="flex items-center hover:text-blue-500 transition-colors button-icon-reroll" class:dyna-icon={rerollIcon === 'dynamic'} onclick={onReroll}>
                <ArrowRight size={22}/>
            </button>
        {:else}
            <button class="flex items-center hover:text-blue-500 transition-colors button-icon-reroll" class:dyna-icon={rerollIcon === 'dynamic'} onclick={onReroll}>
                <RefreshCcwIcon size={20}/>
            </button>
        {/if}
    {/if}
{/snippet}

{#snippet minorIconButtonsBody(showNames:boolean)}
    
    {#if DBState.db.enableBookmark}
        <button class="flex items-center hover:text-blue-500 transition-colors button-icon-bookmark {isBookmarked ? 'text-yellow-400' : ''}" onclick={async () => {
            await sleep(1)
            toggleBookmark()
        }}>
            <BookmarkIcon size={20}/>
            {#if showNames}
                <span class="ml-1">{language.bookmark}</span>
            {/if}
        </button>
    {/if}

    <button class="flex items-center hover:text-blue-500 transition-colors" onclick={async () => {
        await sleep(1)
        const currentChat = DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage]
        const currentMessage = currentChat.message[idx]
        const newChat = $state.snapshot(currentChat)
        newChat.name = `Copy of ${newChat.name}`
        newChat.id = v4()
        newChat.message = newChat.message.slice(0, idx + 1)
        newChat.message.push({
            role: 'char',
            data: '{{specialcomment::branchedfrom::' + currentChat.id + '::' + currentChat.name + '::' + currentMessage.chatId + '::}}',
            isComment: true,
            disabled: true,
            chatId: v4(),
        })

        DBState.db.characters[selIdState.selId].chats.unshift(newChat)
        changeChatTo(0)
    }}>
        <SplitIcon size={20}/>
        {#if showNames}
            <span class="ml-1">{language.branch}</span>
        {/if}
    </button>

    <button class="flex items-center hover:text-blue-500 transition-colors" onclick={async () => {
        await sleep(1)
        const currentMessage = DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message[idx]
        DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message[idx].disabled = !currentMessage.disabled
    }}>
        <PowerOff size={20}/>
        {#if showNames}
            <span class="ml-1">{language.disableMessage}</span>
        {/if}
    </button>

    <button class="flex items-center hover:text-blue-500 transition-colors" onclick={async () => {
        await sleep(1)
        const currentMessage = DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message[idx]
        DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message[idx].disabled = currentMessage.disabled === 'allBefore' ? false : 'allBefore'
    }}>
        <Scissors size={20}/>
        {#if showNames}
            <span class="ml-1">{language.disableAbove}</span>
        {/if}
    </button>
{/snippet}

{#snippet senderIcon(options:{rounded?:boolean,styleFix?:string} = {})}
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
    {:else if dom.tagName === 'RISUTEXTBOX'}
        {@render textBox()}
    {:else if dom.tagName === 'RISUICON'}
        {@render senderIcon()}
    {:else if dom.tagName === 'RISUBUTTONS'}
        {@render iconButtons()}
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
    {#each dom.childNodes as node}
        {#if node.nodeType === Node.TEXT_NODE}
            {node.textContent}
        {:else if node.nodeType === Node.ELEMENT_NODE}
            {@render renderGuiHtmlPart((node as HTMLElement))}
        {/if}
    {/each}
{/snippet}


{#if disabled === true}
<div class="w-full border-t-2 border-dashed border-blue-500"></div>
{/if}
<div class="flex max-w-full justify-center risu-chat"
     data-chat-index={idx}
     data-chat-id={DBState.db.characters?.[selIdState.selId]?.chats?.[DBState.db.characters?.[selIdState.selId]?.chatPage]?.message?.[idx]?.chatId ?? ''}
     style={isLastMemory ? `border-top:${DBState.db.memoryLimitThickness}px solid rgba(98, 114, 164, 0.7);` : ''}
     onclickcapture={handleButtonTriggerWithin}
     onsubmitcapture={handleFormTriggerWithin}>
    <div class="text-textcolor mt-1 ml-4 mr-4 mb-1 p-2 bg-transparent grow border-t-gray-900 border-opacity/30 border-transparent flexium items-start max-w-full" >
        {#if DBState.db.theme === 'mobilechat' && !blankMessage}
            <div class={role === 'user' ? "flex items-start w-full justify-end" : "flex items-start"}>
                {#if role !== 'user'}
                    {@render senderIcon({rounded: true})}
                {/if}
                <div
                    class="bg-gray-100 rounded-lg p-3 max-w-[70%] mx-2"
                    class:rounded-tl-none={role !== 'user'}
                    class:rounded-tr-none={role === 'user'}
                >
                    <p class="text-gray-800">{@render textBox()}</p>
                    {#if DBState.db.characters?.[selIdState.selId]?.chats?.[DBState.db.characters?.[selIdState.selId]?.chatPage]?.message?.[idx]?.time}
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
                    {@render senderIcon({rounded: true})}
                {/if}
            </div>
        {:else if DBState.db.theme === 'cardboard' && !blankMessage}
            <div class="w-full flex flex-col px-0 sm:px-4 py-4 relative">
                <div class="bg-linear-to-b from-gray-100 to-gray-200 rounded-lg shadow-lg border-gray-400 border p-4 flex flex-col">
                    <div class="flex gap-4 mt-2 flex-col sm:flex-row">
                        <div class="flex flex-col items-center">
                            <div class="sm:h-96 sm:w-72 sm:min-w-72 w-48 h-64">
                                {@render senderIcon({rounded: false, styleFix:'height:100%;width:100%;'})}
                            </div>
                            <h2 class="text-base font-bold text-gray-500 text-center mt-2 max-w-full text-ellipsis">{name}</h2>

                        </div>
                        {#if editMode}
                            <textarea class="grow h-138 sm:h-96 overflow-y-auto bg-transparent text-black p-2 mb-2 resize-none message-edit-area" bind:value={message}></textarea>
                        {:else}
                            <div class="grow h-138 sm:h-96 overflow-y-auto p-2 mb-2 sm:mb-0">
                                {@render textBox()}
                            </div>
                        {/if}
                    </div>
                </div>
                <div class="absolute bottom-0 right-0 bg-linear-to-b from-gray-200 to-gray-300 p-2 rounded-md border border-gray-400 text-gray-400">
                    {@render iconButtons({applyTextColors: false})}
                </div>
            </div>
        {:else if DBState.db.theme === 'customHTML' && !blankMessage}
            {@render renderGuiHtmlPart(RenderGUIHtml(DBState.db.guiHTML))}
        {:else}
            {@render senderIcon({rounded: DBState.db.roundIcons})}
            <span class="flex flex-col ml-4 w-full max-w-full min-w-0 text-black">
                <div class="flexium items-center chat-width">
                    {#if DBState.db.characters[selIdState.selId]?.chaId === "§playground" && !blankMessage}
                        <span class="chat-width text-xl border-darkborderc flex items-center text-textcolor">
                            <span>{DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message[idx].role === 'char' ? 'Assistant' : 'User'}</span>
                            <button class="ml-2 text-textcolor2 hover:text-textcolor" onclick={() => {
                                DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message[idx].role = DBState.db.characters[selIdState.selId].chats[DBState.db.characters[selIdState.selId].chatPage].message[idx].role === 'char' ? 'user' : 'char'
                            }}><ArrowLeftRightIcon size="18" /></button>
                        </span>
                    {:else if !blankMessage && !$HideIconStore}
                        <div class="chat-width text-xl unmargin text-textcolor flex items-center">
                            <span>{name}</span>
                        </div>
                    {/if}
                    {@render iconButtons()}
                </div>
                {@render genInfo()}
                {@render textBox()}
            </span>
        {/if}
    </div>
</div>

{#if disabled}
<div class={{
    "w-full border-t-2 border-dashed": true,
    "border-blue-500": disabled === true,
    "border-amber-500": disabled === 'allBefore',
}}></div>
{/if}
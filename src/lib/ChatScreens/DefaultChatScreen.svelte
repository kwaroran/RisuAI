<script lang="ts">

    import Suggestion from './Suggestion.svelte';
    import AdvancedChatEditor from './AdvancedChatEditor.svelte';
    import { CameraIcon, DatabaseIcon, DicesIcon, GlobeIcon, ImagePlusIcon, LanguagesIcon, Laugh, MenuIcon, MicOffIcon, PackageIcon, Plus, RefreshCcwIcon, ReplyIcon, Send, StepForwardIcon, XIcon, BrainIcon } from "lucide-svelte";
    import { selectedCharID, PlaygroundStore, createSimpleCharacter, hypaV3ModalOpen } from "../../ts/stores.svelte";
    import Chat from "./Chat.svelte";
    import { type Message } from "../../ts/storage/database.svelte";
    import { DBState } from 'src/ts/stores.svelte';
    import { getCharImage } from "../../ts/characters";
    import { chatProcessStage, doingChat, sendChat } from "../../ts/process/index.svelte";
    import { sleep } from "../../ts/util";
    import { language } from "../../lang";
    import { isExpTranslator, translate } from "../../ts/translator/translator";
    import { alertError, alertNormal, alertWait, showHypaV2Alert } from "../../ts/alert";
    import sendSound from '../../etc/send.mp3'
    import { processScript } from "src/ts/process/scripts";
    import CreatorQuote from "./CreatorQuote.svelte";
    import { stopTTS } from "src/ts/process/tts";
    import MainMenu from '../UI/MainMenu.svelte';
    import AssetInput from './AssetInput.svelte';
    import { downloadFile } from 'src/ts/globalApi.svelte';
    import { runTrigger } from 'src/ts/process/triggers';
    import { v4 } from 'uuid';
    import { PreUnreroll, Prereroll } from 'src/ts/process/prereroll';
    import { processMultiCommand } from 'src/ts/process/command';
    import { postChatFile } from 'src/ts/process/files/multisend';
    import { getInlayAsset } from 'src/ts/process/files/inlays';
    import PlaygroundMenu from '../Playground/PlaygroundMenu.svelte';
    import { ConnectionOpenStore } from 'src/ts/sync/multiuser';
    import { coldStorageHeader, preLoadChat } from 'src/ts/process/coldstorage.svelte';
    import Chats from './Chats.svelte';

    let messageInput:string = $state('')
    let messageInputTranslate:string = $state('')
    let openMenu = $state(false)
    let loadPages = $state(30)
    let autoMode = $state(false)
    let rerolls:Message[][] = []
    let rerollid = -1
    let lastCharId = -1
    let doingChatInputTranslate = false
    let toggleStickers:boolean = $state(false)
    let fileInput:string[] = $state([])

    let currentCharacter = $derived(DBState.db.characters[$selectedCharID])
    let currentChat = $derived(currentCharacter?.chats[currentCharacter.chatPage]?.message ?? [])

    async function send(){
        return sendMain(false)
    }
    async function sendContinue(){
        return sendMain(true)
    }

    async function sendMain(continueResponse:boolean) {
        let selectedChar = $selectedCharID
        if($doingChat){
            return
        }
        if(lastCharId !== $selectedCharID){
            rerolls = []
            rerollid = -1
        }

        let cha = DBState.db.characters[selectedChar].chats[DBState.db.characters[selectedChar].chatPage].message

        if(messageInput.startsWith('/')){
            const commandProcessed = await processMultiCommand(messageInput)
            if(commandProcessed !== false){
                messageInput = ''
                return
            }
        }

        if(fileInput.length > 0){
            for(const file of fileInput){
                messageInput += `{{inlayed::${file}}}`
            }
            fileInput = []
        }

        if(messageInput === ''){
            if(DBState.db.characters[selectedChar].type !== 'group'){
                if(cha.length === 0 || cha[cha.length - 1].role !== 'user'){
                    if(DBState.db.useSayNothing){
                        cha.push({
                            role: 'user',
                            data: '*says nothing*',
                            name: $ConnectionOpenStore ? DBState.db.username : null
                        })
                    }
                }
            }
        }
        else{
            const char = DBState.db.characters[selectedChar]
            if(char.type === 'character'){
                let triggerResult = await runTrigger(char,'input', {chat: char.chats[char.chatPage]})
                if(triggerResult){
                    cha = triggerResult.chat.message
                }

                cha.push({
                    role: 'user',
                    data: await processScript(char,messageInput,'editinput'),
                    time: Date.now(),
                    name: $ConnectionOpenStore ? DBState.db.username : null
                })
            }
            else{
                cha.push({
                    role: 'user',
                    data: messageInput,
                    time: Date.now(),
                    name: $ConnectionOpenStore ? DBState.db.username : null
                })
            }
        }
        messageInput = ''
        messageInputTranslate = ''
        DBState.db.characters[selectedChar].chats[DBState.db.characters[selectedChar].chatPage].message = cha
        rerolls = []
        await sleep(10)
        updateInputSizeAll()
        await sendChatMain(continueResponse)

    }

    async function reroll() {
        if($doingChat){
            return
        }
        if(lastCharId !== $selectedCharID){
            rerolls = []
            rerollid = -1
        }
        const genId = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message.at(-1)?.generationInfo?.generationId
        if(genId){
            const r = Prereroll(genId)
            if(r){
                DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message.length - 1].data = r
                return
            }
        }
        if(rerollid < rerolls.length - 1){
            if(Array.isArray(rerolls[rerollid + 1])){
                rerollid += 1
                let rerollData = safeStructuredClone(rerolls[rerollid])
                let msgs = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message
                for(let i = 0; i < rerollData.length; i++){
                    msgs[msgs.length - rerollData.length + i] = rerollData[i]
                }
                DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message = msgs
            }
            return
        }
        if(rerolls.length === 0){
            rerolls.push(safeStructuredClone([DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message.at(-1)]))
            rerollid = rerolls.length - 1
        }
        let cha = safeStructuredClone(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message)
        if(cha.length === 0 ){
            return
        }
        openMenu = false
        const saying = cha[cha.length - 1].saying
        let sayingQu = 2
        while(cha[cha.length - 1].role !== 'user'){
            if(cha[cha.length - 1].saying === saying){
                sayingQu -= 1
                if(sayingQu === 0){
                    break
                }
            }
            let msg = cha.pop()
            if(!msg){
                return
            }
        }
        DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message = cha
        await sendChatMain()
    }

    async function unReroll() {
        if($doingChat){
            return
        }
        if(lastCharId !== $selectedCharID){
            rerolls = []
            rerollid = -1
        }
        const genId = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message.at(-1)?.generationInfo?.generationId
        if(genId){
            const r = PreUnreroll(genId)
            if(r){
                DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message.length - 1].data = r
                return
            }
        }
        if(rerollid <= 0){
            return
        }
        if(Array.isArray(rerolls[rerollid - 1])){
            rerollid -= 1
            let rerollData = safeStructuredClone(rerolls[rerollid])
            let msgs = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message
            for(let i = 0; i < rerollData.length; i++){
                msgs[msgs.length - rerollData.length + i] = rerollData[i]
            }
            DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message = msgs
        }
    }

    let abortController:null|AbortController = null

    async function sendChatMain(continued:boolean = false) {

        let previousLength = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message.length
        messageInput = ''
        abortController = new AbortController()
        try {
            await sendChat(-1, {
                signal:abortController.signal,
                continue:continued
            })
            if(previousLength < DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message.length){
                rerolls.push(safeStructuredClone(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message).slice(previousLength))
                rerollid = rerolls.length - 1
            }
        } catch (error) {
            console.error(error)
            alertError(error)
        }
        lastCharId = $selectedCharID
        $doingChat = false
        if(DBState.db.playMessage){
            const audio = new Audio(sendSound);
            audio.play();
        }
    }

    function abortChat(){
        if(abortController){
            abortController.abort()
        }
    }

    async function runAutoMode() {
        if(autoMode){
            autoMode = false
            return
        }
        const selectedChar = $selectedCharID
        autoMode = true
        while(autoMode){
            await sendChatMain()
            if(selectedChar !== $selectedCharID){
                autoMode = false
            }
        }
    }

    interface Props {
        openModuleList?: boolean;
        openChatList?: boolean;
        customStyle?: string;
    }

    let { userIconPortrait, currentUsername, userIcon } = $derived.by(() => {
        const bindedPersona = DBState?.db?.characters?.[$selectedCharID]?.chats?.[DBState?.db?.characters?.[$selectedCharID]?.chatPage]?.bindedPersona

        if(bindedPersona){
            const persona = DBState.db.personas.find((p) => p.id === bindedPersona)
            if(persona){
                return {
                    currentUsername: persona.name,
                    userIconPortrait: persona.largePortrait,
                    userIcon: persona.icon
                }
            }
        }

        const selectedPersonaIndex = DBState.db.selectedPersona
        return {
            currentUsername: DBState.db.username,
            userIconPortrait: DBState.db.personas[selectedPersonaIndex].largePortrait,
            userIcon: DBState.db.personas[selectedPersonaIndex].icon
        }
    })

    let { openModuleList = $bindable(false), openChatList = $bindable(false), customStyle = '' }: Props = $props();
    let inputHeight = $state("44px")
    let inputEle:HTMLTextAreaElement = $state()
    let inputTranslateHeight = $state("44px")
    let inputTranslateEle:HTMLTextAreaElement = $state()

    function updateInputSizeAll() {
        updateInputSize()
        updateInputTranslateSize()
    }

    function updateInputTranslateSize() {
        if(inputTranslateEle) {
            inputTranslateEle.style.height = "0";
            inputTranslateHeight = (inputTranslateEle.scrollHeight) + "px";
            inputTranslateEle.style.height = inputTranslateHeight
        }
    }
    function updateInputSize() {
        if(inputEle){
            inputEle.style.height = "0";
            inputHeight = (inputEle.scrollHeight) + "px";
            inputEle.style.height = inputHeight
        }
    }

    $effect.pre(() => {
        updateInputSizeAll()
    });

    async function updateInputTransateMessage(reverse: boolean) {
        if(!DBState.db.useAutoTranslateInput){
            return
        }
        if(isExpTranslator()){
            if(!reverse){
                messageInputTranslate = ''
                return
            }
            if(messageInputTranslate === '') {
                messageInput = ''
                return
            }
            const lastMessageInputTranslate = messageInputTranslate
            await sleep(1500)
            if(lastMessageInputTranslate === messageInputTranslate){
                translate(reverse ? messageInputTranslate : messageInput, reverse).then((translatedMessage) => {
                    if(translatedMessage){
                        if(reverse)
                            messageInput = translatedMessage
                        else
                            messageInputTranslate = translatedMessage
                    }
                })
            }
            return

        }
        if(reverse && messageInputTranslate === '') {
            messageInput = ''
            return
        }
        if(!reverse && messageInput === '') {
            messageInputTranslate = ''
            return
        }
        translate(reverse ? messageInputTranslate : messageInput, reverse).then((translatedMessage) => {
            if(translatedMessage){
                if(reverse)
                    messageInput = translatedMessage
                else
                    messageInputTranslate = translatedMessage
            }
        })
    }

    async function screenShot(){
        try {
            loadPages = Infinity
            const html2canvas = await import('html-to-image');
            const chats = document.querySelectorAll('.default-chat-screen .risu-chat')
            alertWait("Taking screenShot...")
            let canvases:HTMLCanvasElement[] = []

            for(const chat of chats){
                const cnv = await html2canvas.toCanvas(chat as HTMLElement)
                alertWait("Taking screenShot... "+canvases.length+"/"+chats.length)
                canvases.push(cnv)
            }

            canvases.reverse()

            alertWait("Merging images...")

            let mergedCanvas = document.createElement('canvas');
            mergedCanvas.width = 0;
            mergedCanvas.height = 0;
            let mergedCtx = mergedCanvas.getContext('2d');

            let totalHeight = 0;
            let maxWidth = 0;
            for(let i = 0; i < canvases.length; i++) {
                let canvas = canvases[i];
                totalHeight += canvas.height;
                maxWidth = Math.max(maxWidth, canvas.width);

                mergedCanvas.width = maxWidth;
                mergedCanvas.height = totalHeight;
            }

            mergedCtx.fillStyle = 'var(--risu-theme-bgcolor)'
            mergedCtx.fillRect(0, 0, maxWidth, totalHeight);
            let indh = 0
            for(let i = 0; i < canvases.length; i++) {
                let canvas = canvases[i];
                indh += canvas.height
                mergedCtx.drawImage(canvas, 0, indh - canvas.height);
                canvases[i].remove();
            }

            if(mergedCanvas){
                await downloadFile(`chat-${v4()}.png`, Buffer.from(mergedCanvas.toDataURL('png').split(',').at(-1), 'base64'))
                mergedCanvas.remove();
            }
            alertNormal(language.screenshotSaved)
            loadPages = 10
        } catch (error) {
            console.error(error)
            alertError("Error while taking screenshot")
        }
    }
</script>
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="w-full h-full" style={customStyle} onclick={() => {
    openMenu = false
}}>
    {#if $selectedCharID < 0}
        {#if $PlaygroundStore === 0}
            <MainMenu />
        {:else}
            <PlaygroundMenu />
        {/if}
    {:else}
        <div class="h-full w-full flex flex-col-reverse overflow-y-auto relative default-chat-screen"  onscroll={(e) => {
            //@ts-ignore  
            const scrolled = (e.target.scrollHeight - e.target.clientHeight + e.target.scrollTop)
            if(scrolled < 100 && DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message.length > loadPages){
                loadPages += 15
            }
        }}>
            <div
                    class="{DBState.db.fixedChatTextarea ? 'sticky pt-2 pb-2 right-0 bottom-0 bg-bgcolor' : 'mt-2 mb-2'} flex items-stretch w-full"
                    style="{DBState.db.fixedChatTextarea ? 'z-index:29;' : ''}"
            >
                {#if DBState.db.useChatSticker && currentCharacter.type !== 'group'}
                    <div onclick={()=>{toggleStickers = !toggleStickers}}
                         class={"ml-4 bg-textcolor2 flex justify-center items-center  w-12 h-12 rounded-md hover:bg-green-500 transition-colors "+(toggleStickers ? 'text-green-500':'text-textcolor')}>
                        <Laugh/>
                    </div>
                {/if}

                {#if !DBState.db.useAdvancedEditor}
                <textarea class="peer text-input-area focus:border-textcolor transition-colors outline-none text-textcolor p-2 min-w-0 border border-r-0 bg-transparent rounded-md rounded-r-none input-text text-xl flex-grow ml-4 border-darkborderc resize-none overflow-y-hidden overflow-x-hidden max-w-full"
                          bind:value={messageInput}
                          bind:this={inputEle}
                          onkeydown={(e) => {
                        if(e.key.toLocaleLowerCase() === "enter" && !e.isComposing){
                            if(DBState.db.sendWithEnter && (!e.shiftKey)){
                                send()
                                e.preventDefault()
                            }else if(!DBState.db.sendWithEnter && e.shiftKey){
                                send()
                                e.preventDefault()
                            }
                        }
                        if(e.key.toLocaleLowerCase() === "m" && (e.ctrlKey)){
                            reroll()
                            e.preventDefault()
                        }
                    }}
                          onpaste={(e) => {
                        const items = e.clipboardData?.items
                        if(!items){
                            return
                        }
                        let canceled = false

                        for(const item of items){
                            if(item.kind === 'file' && item.type.startsWith('image')){
                                if(!canceled){
                                    e.preventDefault()
                                    canceled = true
                                }
                                const file = item.getAsFile()
                                if(file){
                                    const reader = new FileReader()
                                    reader.onload = async (e) => {
                                        const buf = e.target?.result as ArrayBuffer
                                        const uint8 = new Uint8Array(buf)
                                        const res = await postChatFile({
                                            name: file.name,
                                            data: uint8
                                        })
                                        if(res?.type === 'asset'){
                                            fileInput.push(res.data)
                                            updateInputSizeAll()
                                        }
                                        if(res?.type === 'text'){
                                            messageInput += `{{file::${res.name}::${res.data}}}`
                                            updateInputSizeAll()
                                        }
                                    }
                                    reader.readAsArrayBuffer(file)
                                }
                            }
                        }
                    }}
                          oninput={()=>{updateInputSizeAll();updateInputTransateMessage(false)}}
                          style:height={inputHeight}
                ></textarea>
                {:else}
                    <AdvancedChatEditor
                            bind:value={messageInput}
                            bind:translate={messageInputTranslate}
                    />
                {/if}


                {#if $doingChat || doingChatInputTranslate}
                    <button
                            aria-labelledby="cancel"
                            class="peer-focus:border-textcolor  flex justify-center border-y border-darkborderc items-center text-gray-100 p-3 hover:bg-blue-500 transition-colors" onclick={abortChat}
                            style:height={inputHeight}
                    >
                        <div class="loadmove chat-process-stage-{$chatProcessStage}" class:autoload={autoMode}></div>
                    </button>
                {:else}
                    <button
                            onclick={send}
                            class="flex justify-center border-y border-darkborderc items-center text-gray-100 p-3 peer-focus:border-textcolor hover:bg-blue-500 transition-colors button-icon-send"
                            style:height={inputHeight}
                    >
                        <Send />
                    </button>
                {/if}
                {#if DBState.db.characters[$selectedCharID]?.chaId !== '§playground'}
                    <button
                            onclick={(e) => {
                            openMenu = !openMenu
                            e.stopPropagation()
                        }}
                            class="peer-focus:border-textcolor mr-2 flex border-y border-r border-darkborderc justify-center items-center text-gray-100 p-3 rounded-r-md hover:bg-blue-500 transition-colors"
                            style:height={inputHeight}
                    >
                        <MenuIcon />
                    </button>
                {:else}
                    <div onclick={(e) => {
                        DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message.push({
                            role: 'char',
                            data: ''
                        })
                        DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage] = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage]
                    }}
                         class="peer-focus:border-textcolor mr-2 flex border-y border-r border-darkborderc justify-center items-center text-gray-100 p-3 rounded-r-md hover:bg-blue-500 transition-colors"
                         style:height={inputHeight}
                    >
                        <Plus />
                    </div>
                {/if}
            </div>
            {#if DBState.db.useAutoTranslateInput && !DBState.db.useAdvancedEditor && DBState.db.characters[$selectedCharID]?.chaId !== '§playground'}
                <div class="flex items-center mt-2 mb-2">
                    <label for='messageInputTranslate' class="text-textcolor ml-4">
                        <LanguagesIcon />
                    </label>
                    <textarea id = 'messageInputTranslate' class="text-textcolor rounded-md p-2 min-w-0 bg-transparent input-text text-xl flex-grow ml-4 mr-2 border-darkbutton resize-none focus:bg-selected overflow-y-hidden overflow-x-hidden max-w-full"
                              bind:value={messageInputTranslate}
                              bind:this={inputTranslateEle}
                              onkeydown={(e) => {
                            if(e.key.toLocaleLowerCase() === "enter" && (!e.shiftKey)){
                                if(DBState.db.sendWithEnter){
                                    send()
                                    e.preventDefault()
                                }
                            }
                            if(e.key.toLocaleLowerCase() === "m" && (e.ctrlKey)){
                                reroll()
                                e.preventDefault()
                            }
                        }}
                              oninput={()=>{updateInputSizeAll();updateInputTransateMessage(true)}}
                              placeholder={language.enterMessageForTranslateToEnglish}
                              style:height={inputTranslateHeight}
                    ></textarea>
                </div>
            {/if}

            {#if fileInput.length > 0}
                <div class="flex items-center ml-4 flex-wrap p-2 m-2 border-darkborderc border rounded-md">
                    {#each fileInput as file, i}
                        {#await getInlayAsset(file) then inlayAsset}
                            <div class="relative">
                                {#if inlayAsset.type === 'image'}
                                    <img src={inlayAsset.data} alt="Inlay" class="max-w-48 max-h-48 border border-darkborderc">
                                {:else if inlayAsset.type === 'video'}
                                    <video controls class="max-w-48 max-h-48 border border-darkborderc">
                                        <source src={inlayAsset.data} type="video/mp4" />
                                        <track kind="captions" />
                                        Your browser does not support the video tag.
                                    </video>
                                {:else if inlayAsset.type === 'audio'}
                                    <audio controls class="max-w-48 max-h-24 border border-darkborderc">
                                        <source src={inlayAsset.data} type="audio/mpeg" />
                                        Your browser does not support the audio tag.
                                    </audio>
                                {:else}
                                    <div class="max-w-24 max-h-24">{file}</div>
                                {/if}
                                <button class="absolute -right-1 -top-1 p-1 bg-darkbg text-textcolor rounded-md transition-colors hover:text-draculared focus:text-draculared" onclick={() => {
                                    fileInput.splice(i, 1)
                                    updateInputSizeAll()
                                }}>
                                    <XIcon size={18} />
                                </button>
                            </div>
                        {/await}
                    {/each}
                </div>

            {/if}

            {#if toggleStickers}
                <div class="ml-4 flex flex-wrap">
                    <AssetInput currentCharacter={currentCharacter} onSelect={(additionalAsset)=>{
                        let fileType = 'img'
                        if(additionalAsset.length > 2 && additionalAsset[2]) {
                            const fileExtension = additionalAsset[2]
                            if(fileExtension === 'mp4' || fileExtension === 'webm')
                                fileType = 'video'
                            else if(fileExtension === 'mp3' || fileExtension === 'wav')
                                fileType = 'audio'
                        }
                        messageInput += `<span class='notranslate' translate='no'>{{${fileType}::${additionalAsset[0]}}}</span> *${additionalAsset[0]} added*`
                        updateInputSizeAll()
                    }}/>
                </div>
            {/if}

            {#if DBState.db.useAutoSuggestions}
                <Suggestion messageInput={(msg)=>messageInput=(
                    (DBState.db.subModel === "textgen_webui" || DBState.db.subModel === "mancer" || DBState.db.subModel.startsWith('local_')) && DBState.db.autoSuggestClean
                    ? msg.replace(/ +\(.+?\) *$| - [^"'*]*?$/, '')
                    : msg
                )} {send}/>
            {/if}

            {#if DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message?.[0]?.data?.startsWith(coldStorageHeader)  }
                {#await preLoadChat($selectedCharID, DBState.db.characters[$selectedCharID].chatPage)}
                    <div class="w-full flex justify-center text-textcolor2 italic mb-12">
                        {language.loadingChatData}
                    </div>
                {:then a}
                    <div></div>
                {/await}
            {:else}
            
            <Chats
                messages={currentChat}
                loadPages={loadPages}
                onReroll={reroll}
                unReroll={unReroll}
                currentCharacter={currentCharacter}
                currentUsername={currentUsername}
                userIcon={userIcon}
            />

            {#if DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message.length <= loadPages}
                {#if DBState.db.characters[$selectedCharID].type !== 'group' }
                    <Chat
                        character={createSimpleCharacter(DBState.db.characters[$selectedCharID])}
                        name={DBState.db.characters[$selectedCharID].name}
                        message={DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].fmIndex === -1 ? DBState.db.characters[$selectedCharID].firstMessage :
                            DBState.db.characters[$selectedCharID].alternateGreetings[DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].fmIndex]}
                        role='char'
                        img={getCharImage(DBState.db.characters[$selectedCharID].image, 'css')}
                        idx={-1}
                        altGreeting={DBState.db.characters[$selectedCharID].alternateGreetings.length > 0}
                        largePortrait={DBState.db.characters[$selectedCharID].largePortrait}
                        firstMessage={true}
                        onReroll={() => {
                            const cha = DBState.db.characters[$selectedCharID]
                            const chat = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage]
                            if(cha.type !== 'group'){
                                if (chat.fmIndex >= (cha.alternateGreetings.length - 1)){
                                    chat.fmIndex = -1
                                }
                                else{
                                    chat.fmIndex += 1
                                }
                            }
                            DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage] = chat
                        }}
                        unReroll={() => {
                            const cha = DBState.db.characters[$selectedCharID]
                            const chat = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage]
                            if(cha.type !== 'group'){
                                if (chat.fmIndex === -1){
                                    chat.fmIndex = (cha.alternateGreetings.length - 1)
                                }
                                else{
                                    chat.fmIndex -= 1
                                }
                            }
                            DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage] = chat
                        }}
                        isLastMemory={false}
                        currentPage={(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].fmIndex ?? -1) + 2}
                        totalPages={DBState.db.characters[$selectedCharID].alternateGreetings.length + 1}

                    />
                    {#if !DBState.db.characters[$selectedCharID].removedQuotes && DBState.db.characters[$selectedCharID].creatorNotes.length >= 2}
                        <CreatorQuote quote={DBState.db.characters[$selectedCharID].creatorNotes} onRemove={() => {
                            const cha = DBState.db.characters[$selectedCharID]
                            if(cha.type !== 'group'){
                                cha.removedQuotes = true
                            }
                            DBState.db.characters[$selectedCharID] = cha
                        }} />
                    {/if}
                {/if}
            {/if}

            {/if}

            {#if openMenu}
                <div class="{DBState.db.fixedChatTextarea ? 'fixed' : 'absolute'} right-2 bottom-16 p-5 bg-darkbg flex flex-col gap-3 text-textcolor rounded-md" onclick={(e) => {
                    e.stopPropagation()
                }}>
                    {#if DBState.db.characters[$selectedCharID].type === 'group'}
                        <div class="flex items-center cursor-pointer hover:text-green-500 transition-colors" onclick={runAutoMode}>
                            <DicesIcon />
                            <span class="ml-2">{language.autoMode}</span>
                        </div>
                    {/if}

                    
                    <!-- svelte-ignore block_empty -->
                    {#if DBState.db.characters[$selectedCharID].ttsMode === 'webspeech' || DBState.db.characters[$selectedCharID].ttsMode === 'elevenlab'}
                        <div class="flex items-center cursor-pointer hover:text-green-500 transition-colors" onclick={() => {
                            stopTTS()
                        }}>
                            <MicOffIcon />
                            <span class="ml-2">{language.ttsStop}</span>
                        </div>
                    {/if}

                    <div class="flex items-center cursor-pointer hover:text-green-500 transition-colors"
                        class:text-textcolor2={(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message.length < 2) || (DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message.length - 1].role !== 'char')}
                        onclick={() => {
                            if((DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message.length < 2) || (DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message[DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message.length - 1].role !== 'char')){
                                return
                            }
                            sendContinue();
                        }}
                    >
                        <StepForwardIcon />
                        <span class="ml-2">{language.continueResponse}</span>
                    </div>


                    {#if DBState.db.showMenuChatList}
                        <div class="flex items-center cursor-pointer hover:text-green-500 transition-colors" onclick={() => {
                            openChatList = true
                            openMenu = false
                        }}>
                            <DatabaseIcon />
                            <span class="ml-2">{language.chatList}</span>
                        </div>
                    {/if}

                    {#if DBState.db.showMenuHypaMemoryModal}
                        {#if (DBState.db.supaModelType !== 'none' && DBState.db.hypav2) || DBState.db.hypaV3}
                            <div class="flex items-center cursor-pointer hover:text-green-500 transition-colors" onclick={() => {
                                if (DBState.db.hypav2) {
                                    DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].hypaV2Data ??= {
                                        lastMainChunkID: 0,
                                        mainChunks: [],
                                        chunks: [],
                                    }
                                    showHypaV2Alert();
                                } else if (DBState.db.hypaV3) {
                                    $hypaV3ModalOpen = true
                                }

                                openMenu = false
                            }}>
                                <BrainIcon />
                                <span class="ml-2">
                                    {DBState.db.hypav2 ? language.hypaMemoryV2Modal : language.hypaMemoryV3Modal}
                                </span>
                            </div>
                        {/if}
                    {/if}
                    
                    {#if DBState.db.translator !== ''}
                        <div class={"flex items-center cursor-pointer "+ (DBState.db.useAutoTranslateInput ? 'text-green-500':'lg:hover:text-green-500')} onclick={() => {
                            DBState.db.useAutoTranslateInput = !DBState.db.useAutoTranslateInput
                        }}>
                            <GlobeIcon />
                            <span class="ml-2">{language.autoTranslateInput}</span>
                        </div>
                        
                    {/if}
            
                    <div class="flex items-center cursor-pointer hover:text-green-500 transition-colors" onclick={() => {
                        screenShot()
                    }}>
                        <CameraIcon />
                        <span class="ml-2">{language.screenshot}</span>
                    </div>

                    <div class="flex items-center cursor-pointer hover:text-green-500 transition-colors" onclick={async () => {
                        const res = await postChatFile(messageInput)
                        if(res?.type === 'asset'){
                            fileInput.push(res.data)
                            updateInputSizeAll()
                        }
                        if(res?.type === 'text'){
                            messageInput += `{{file::${res.name}::${res.data}}}`
                            updateInputSizeAll()
                        }
                    }}>

                        <ImagePlusIcon />
                        <span class="ml-2">{language.postFile}</span>
                    </div>


                    <div class={"flex items-center cursor-pointer "+ (DBState.db.useAutoSuggestions ? 'text-green-500':'lg:hover:text-green-500')} onclick={async () => {
                        DBState.db.useAutoSuggestions = !DBState.db.useAutoSuggestions
                    }}>
                        <ReplyIcon />
                        <span class="ml-2">{language.autoSuggest}</span>
                    </div>


                    <div class="flex items-center cursor-pointer hover:text-green-500 transition-colors" onclick={() => {
                        DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].modules ??= []
                        openModuleList = true
                        openMenu = false
                    }}>
                        <PackageIcon />
                        <span class="ml-2">{language.modules}</span>
                    </div>

                    {#if DBState.db.sideMenuRerollButton}
                        <div class="flex items-center cursor-pointer hover:text-green-500 transition-colors" onclick={reroll}>
                            <RefreshCcwIcon />
                            <span class="ml-2">{language.reroll}</span>
                        </div>
                    {/if}
                </div>

            {/if}
        </div>

    {/if}
</div>
<style>

    .chat-process-stage-1{
        border-top: 0.4rem solid #60a5fa;
        border-left: 0.4rem solid #60a5fa;
    }

    .chat-process-stage-2{
        border-top: 0.4rem solid #db2777;
        border-left: 0.4rem solid #db2777;
    }

    .chat-process-stage-3{
        border-top: 0.4rem solid #34d399;
        border-left: 0.4rem solid #34d399;
    }

    .chat-process-stage-4{
        border-top: 0.4rem solid #8b5cf6;
        border-left: 0.4rem solid #8b5cf6;
    }

    .autoload{
        border-top: 0.4rem solid #10b981;
        border-left: 0.4rem solid #10b981;
    }

    @keyframes spin {
        
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
</style>
<script lang="ts">
	import { requestChatData } from "src/ts/process/request";
    import { doingChat, type OpenAIChat } from "../../ts/process/index";
    import { DataBase, setDatabase, type character, type Message, type groupChat, type Database } from "../../ts/storage/database";
    import { CurrentCharacter, selectedCharID } from "../../ts/stores";
    import { translate } from "src/ts/translator/translator";
    import { CopyIcon, LanguagesIcon, RefreshCcwIcon } from "lucide-svelte";
    import { alertConfirm } from "src/ts/alert";
    import { language } from "src/lang";
    import { replacePlaceholders } from "../../ts/util";
    import { onDestroy } from 'svelte';
    import { processScript } from "src/ts/process/scripts";
    import { get } from "svelte/store";
    import { ParseMarkdown } from "src/ts/parser";

    export let send: () => any;
    export let messageInput:(string:string) => any;
    let suggestMessages:string[] = $CurrentCharacter?.chats[$CurrentCharacter.chatPage]?.suggestMessages
    let suggestMessagesTranslated:string[]
    let toggleTranslate:boolean = $DataBase.autoTranslate
    let progress:boolean;
    let progressChatPage=-1;
    let abortController:AbortController;
    let chatPage:number
    $: {
        $selectedCharID
        //FIXME add selectedChatPage for optimize render
        chatPage = $CurrentCharacter.chatPage
        updateSuggestions()
    }

    const updateSuggestions = () => {
        if($selectedCharID > -1 && !$doingChat) {
            if(progressChatPage > 0 && progressChatPage != chatPage){
                progress=false
                abortController?.abort()
            }
            let currentChar = $CurrentCharacter;
            suggestMessages = currentChar?.chats[currentChar.chatPage].suggestMessages
        }
    }
    

    const unsub = doingChat.subscribe((v) => {
        if(v) {
            progress=false
            abortController?.abort()
            suggestMessages = []
        }
        if(!v && $selectedCharID > -1 && (!suggestMessages || suggestMessages.length === 0) && !progress){
            let currentChar:character|groupChat = $CurrentCharacter;
            let messages:Message[] = []
            
            if(currentChar.type !== 'group'){
                const firstMsg:string = currentChar.firstMsgIndex === -1 ? currentChar.firstMessage : currentChar.alternateGreetings[currentChar.firstMsgIndex]
                messages.push({
                    role: 'char',
                    data: processScript(currentChar,
                        replacePlaceholders(firstMsg, currentChar.name),
                    'editprocess')
                })
            }
            messages = [...messages, ...currentChar.chats[currentChar.chatPage].message];
            let lastMessages:Message[] = messages.slice(Math.max(messages.length - 10, 0));
            if(lastMessages.length === 0)
                return
            let promptbody:OpenAIChat[] = [
            {
                role:'system',
                content: replacePlaceholders($DataBase.autoSuggestPrompt, currentChar.name)
            }
            ,{
                role: 'user', 
                content: lastMessages.map(b=>(b.role==='char'? currentChar.name : $DataBase.username)+":"+b.data).reduce((a,b)=>a+','+b)
            }
            ]

            if($DataBase.subModel === "textgen_webui" || $DataBase.subModel === 'mancer'){
                promptbody = [
                    {
                        role: 'system',
                        content: replacePlaceholders($DataBase.autoSuggestPrompt, currentChar.name)
                    },
                    ...lastMessages.map(({ role, data }) => ({
                        role: role === "user" ? "user" as const : "assistant" as const,
                        content: data,
                    })),
                ]
            }

            progress = true
            progressChatPage = chatPage
            abortController = new AbortController()
            requestChatData({
                formated: promptbody,
                bias: {},
                currentChar : currentChar as character
            }, 'submodel', abortController.signal).then(rq2=>{
                if(rq2.type !== 'fail' && rq2.type !== 'streaming' && rq2.type !== 'multiline' && progress){
                    var suggestMessagesNew = rq2.result.split('\n').filter(msg => msg.startsWith('-')).map(msg => msg.replace('-','').trim())
                    const db:Database = get(DataBase);
                    db.characters[$selectedCharID].chats[currentChar.chatPage].suggestMessages = suggestMessagesNew
                    setDatabase(db)
                    suggestMessages = suggestMessagesNew
                }
                progress = false
            })
            }
    })

    const translateSuggest = async (toggle, messages)=>{
        if(toggle && messages && messages.length > 0) {
            suggestMessagesTranslated = []
            for(let i = 0; i < suggestMessages.length; i++){
                let msg = suggestMessages[i]
                let translated = await translate(msg, false)
                suggestMessagesTranslated[i] = translated
            }
        }
    }

    onDestroy(unsub)

    $: {translateSuggest(toggleTranslate, suggestMessages)}
</script>

<div class="ml-4 flex flex-wrap">
    {#if progress}
        <div class="flex bg-textcolor2 p-2 rounded-lg items-center">
            <div class="loadmove mx-2"/>
            <div>{language.creatingSuggestions}</div>
        </div>        
    {:else if !$doingChat}
        {#if $DataBase.translator !== ''}
            <div class="flex mr-2 mb-2">
                <button class={"bg-textcolor2 hover:bg-darkbutton font-bold py-2 px-4 rounded " + (toggleTranslate ? 'text-green-500' : 'text-textcolor')}
                    on:click={() => {
                        toggleTranslate = !toggleTranslate
                    }}
                >
                    <LanguagesIcon/>
                </button>
            </div>    
        {/if}
        

        <div class="flex mr-2 mb-2">
            <button class="bg-textcolor2 hover:bg-darkbutton font-bold py-2 px-4 rounded text-textcolor"
                on:click={() => {
                    alertConfirm(language.askReRollAutoSuggestions).then((result) => {
                        if(result) {
                            suggestMessages = []
                            doingChat.set(true)
                            doingChat.set(false)        
                        }
                    })
                }}
            >
                <RefreshCcwIcon/>
            </button>
        </div>
        {#each suggestMessages??[] as suggest, i}
            <div class="flex mr-2 mb-2">
                <button class="bg-textcolor2 hover:bg-darkbutton text-textcolor font-bold py-2 px-4 rounded" on:click={() => {
                    suggestMessages = []
                    messageInput(suggest)
                    send()
                }}>
                {#await ParseMarkdown(($DataBase.translator !== '' && toggleTranslate && suggestMessagesTranslated && suggestMessagesTranslated.length > 0) ? suggestMessagesTranslated[i]??suggest : suggest) then md}
                    {@html md}
                {/await}
                </button>
                <button class="bg-textcolor2 hover:bg-darkbutton text-textcolor font-bold py-2 px-4 rounded ml-1" on:click={() => {
                    messageInput(suggest)
                }}>
                    <CopyIcon/>
                </button>
            </div>
        {/each}
        
    {/if}
</div>

<style>
    
    .loadmove {
        animation: spin 1s linear infinite;
        border-radius: 50%;
        border: 0.4rem solid rgba(0,0,0,0);
        width: 1rem;
        height: 1rem;
        border-top: 0.4rem solid var(--risu-theme-textcolor);
        border-left: 0.4rem solid var(--risu-theme-textcolor);
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
</style>


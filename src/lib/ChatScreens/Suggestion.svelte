<script lang="ts">
    import { requestChatData } from "src/ts/process/request";
    import { doingChat, type OpenAIChat } from "../../ts/process/index";
    import { DataBase, type character } from "../../ts/storage/database";
    import { selectedCharID } from "../../ts/stores";
    import { translate } from "src/ts/translator/translator";
    import { CopyIcon, LanguagesIcon, RefreshCcwIcon } from "lucide-svelte";
    import { alertConfirm } from "src/ts/alert";
    import { language } from "src/lang";
  import { onDestroy } from "svelte";

    export let send;
    export let messageInput;
    let suggestMessages = $DataBase.characters[$selectedCharID]?.chats[$DataBase.characters[$selectedCharID].chatPage]?.suggestMessages
    let suggestMessagesTranslated
    let toggleTranslate = $DataBase.autoTranslate
    let progress;
    let progressChatPage=-1;
    let abortController;
    let chatPage
    $: {
        $selectedCharID
        //FIXME add selectedChatPage for optimize render
        chatPage = $DataBase.characters[$selectedCharID].chatPage
        updateSuggestions()
    }

    const updateSuggestions = () => {
        if($selectedCharID > -1 && !$doingChat) {
            if(progressChatPage > 0 && progressChatPage != chatPage){
                progress=false
                abortController?.abort()
            }
            let currentChar = $DataBase.characters[$selectedCharID];
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
            let currentChar = $DataBase.characters[$selectedCharID] as character;
            let messages = currentChar.chats[currentChar.chatPage].message;
            let lastMessages = messages.slice(Math.max(messages.length - 10, 0));
            if(lastMessages.length === 0)
                return
            const promptbody:OpenAIChat[] = [
            {
                role:'system',
                content: $DataBase.autoSuggestPrompt
            }
            ,
            {
                role: 'user', 
                content: lastMessages.map(b=>b.role+":"+b.data).reduce((a,b)=>a+','+b)
            }
            ]

            progress = true
            progressChatPage = chatPage
            abortController = new AbortController()
            requestChatData({
                formated: promptbody,
                bias: {},
                currentChar
            }, 'submodel', abortController.signal).then(rq2=>{
                if(rq2.type !== 'fail' && rq2.type !== 'streaming' && progress){
                    var suggestMessagesNew = rq2.result.split('\n').filter(msg => msg.startsWith('-')).map(msg => msg.replace('-','').trim())
                    currentChar.chats[currentChar.chatPage].suggestMessages = suggestMessagesNew
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
        <div class="flex bg-gray-500 p-2 rounded-lg items-center">
            <div class="loadmove mx-2"/>
            <div>{language.creatingSuggestions}</div>
        </div>        
    {:else if !$doingChat}
        <div class="flex mr-2 mb-2">
            <button class={"bg-gray-500 hover:bg-gray-700 font-bold py-2 px-4 rounded " + (toggleTranslate ? 'text-green-500' : 'text-white')}
                on:click={() => {
                    toggleTranslate = !toggleTranslate
                    // translateSuggest(toggleTranslate, suggestMessages)
                }}
            >
                <LanguagesIcon/>
            </button>
        </div>

        <div class="flex mr-2 mb-2">
            <button class="bg-gray-500 hover:bg-gray-700 font-bold py-2 px-4 rounded text-white"
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
                <button class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded" on:click={() => {
                    suggestMessages = []
                    messageInput(suggest)
                    send()
                }}>
                {#if toggleTranslate && suggestMessagesTranslated && suggestMessagesTranslated.length > 0}
                    {suggestMessagesTranslated[i]??suggest}
                {:else}
                    {suggest}
                {/if}
                </button>
                <button class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded ml-1" on:click={() => {
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
        border-top: 0.4rem solid white;
        border-left: 0.4rem solid white;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
</style>


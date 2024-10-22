<script lang="ts">
    import { run } from 'svelte/legacy';


    import { ArrowBigLeftIcon, Send } from "lucide-svelte";
    import { changeLanguage, language } from "src/lang";
    import { DataBase, setPreset } from "src/ts/storage/database";
    import Chat from "../ChatScreens/Chat.svelte";
    import { prebuiltPresets } from "src/ts/process/templates/templates";
    import { updateTextThemeAndCSS } from "src/ts/gui/colorscheme";

    let step = $state(0)
    let provider = $state('')
    let input = $state('')

    if(step === 0){
        const browserLang = navigator.language
        const browserLangShort = browserLang.split('-')[0]
        const usableLangs = ['de', 'en', 'ko', 'cn', 'vi', 'zh-Hant']
        if(usableLangs.includes(browserLangShort)){
            changeLanguage(browserLangShort)
            $DataBase.language = browserLangShort
            step = 1
        }
    }
    let start = $state(false)

    function send(){
        switch(step){
            case 1:{
                if(input.length > 0){
                    $DataBase.username = input
                    step = 2
                    input = ''
                }
                break
            }
            case 2:{
                if(['openai','openrouter','horde','later'].includes(input.toLocaleLowerCase())){
                    provider = input.toLocaleLowerCase()
                    step = 3
                    input = ''
                }
                break
            }
            case 3:{
                if(provider === 'openai'){
                    if(input.length > 0 && input.startsWith('sk-')){
                        $DataBase.openAIKey = input
                        step = 10
                        input = ''
                    }
                }
                if(provider === 'openrouter'){
                    if(input.length > 0 && input.startsWith('sk-')){
                        $DataBase.openrouterKey = input
                        step = 10
                        input = ''
                    }
                }
            }
        }
    }

    run(() => {
        if(step === 10){
            setTimeout(() => {
                $DataBase = setPreset($DataBase, prebuiltPresets.OAI2)
                $DataBase.textTheme = 'highcontrast'
                updateTextThemeAndCSS()
                if(provider === 'openrouter'){
                    $DataBase.aiModel = 'openrouter'
                    $DataBase.subModel = 'openrouter'
                    $DataBase.openrouterRequestModel = 'risu/free'
                    $DataBase.maxContext = 6000
                }
                if(provider === 'horde'){
                    $DataBase.aiModel = 'horde:::auto'
                    $DataBase.subModel = 'horde:::auto'
                }

                if(provider === 'openai'){
                    $DataBase.maxContext = 4000
                }
                $DataBase.didFirstSetup = true
            }, 1000);
        }

    });
</script>

<div class="w-full h-full flex justify-center welcome-bg text-textcolor relative bg-gray-900">
    <div class="w-2xl overflow-x-hidden max-w-full min-h-full h-full flex flex-col overflow-y-hidden" class:justify-center={!start}>
        {#if !start}
            <div class="w-full justify-center flex mt-8 logo-animation" onanimationend={() => {
                start = true
            }}>
                <img src="/logo_typo_trans.png" alt="logo" class="w-full max-w-screen-sm  mb-0">
            </div>
        {:else}
            <div class="relative w-full flex-col bg-darkbg flex-grow mt-5 max-w-full p-5 rounded-t-lg overflow-x-hidden flex border-gray-800 border chat-animation overflow-y-auto">
                {#if step === 0}
                    <h2 class="animate-bounce">Choose your language</h2>
                    <div class="flex flex-col items-start ml-2">
                        <button class="hover:text-green-500 transition-colors" onclick={() => {
                            changeLanguage('de')
                            $DataBase.language='de'
                            step = 1
                        }}>• Deutsch</button>
                        <button class="hover:text-green-500 transition-colors" onclick={() => {
                            changeLanguage('en')
                            $DataBase.language='en'
                            step = 1
                        }}>• English</button>
                        <button class="hover:text-green-500 transition-colors" onclick={() => {
                            changeLanguage('ko')
                            $DataBase.language='ko'
                            step = 1
                        }}>• 한국어</button>
                        <button class="hover:text-green-500 transition-colors" onclick={() => {
                            changeLanguage('cn')
                            $DataBase.language='cn'
                            step = 1
                        }}>• 中文</button>
                        <button class="hover:text-green-500 transition-colors" onclick={() => {
                            changeLanguage('zh-Hant')
                            $DataBase.language='zh-Hant'
                            step = 1
                        }}>• 中文(繁體)</button>
                        <button class="hover:text-green-500 transition-colors" onclick={() => {
                            changeLanguage('vi')
                            $DataBase.language='vi'
                            step = 1
                        }}>• Tiếng Việt</button>
                    </div>

                {:else}
                    <Chat name="Risu" message={language.setup.welcome} isLastMemory={false} />
                    {#if step >= 2}
                        <Chat name={$DataBase.username} message={$DataBase.username} isLastMemory={false} />
                        <Chat name="Risu" message={language.setup.welcome2.replace('{username}', $DataBase.username)} isLastMemory={false} />
                    {/if}
                    {#if step === 2}
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <button class="border-l-blue-500 border-l-4 p-6 flex flex-col transition-shadow hover:ring-1" onclick={() => {
                                provider = 'openai'
                                step = 3
                            }}>
                                <h1 class="text-2xl font-bold text-start">OpenAI</h1>
                                <span class="mt-2 text-textcolor2 text-start">{language.setup.openAIProvider}</span>
                            </button>
                            <button class="border-l-red-500 border-l-4 p-6 flex flex-col transition-shadow hover:ring-1" onclick={() => {
                                provider = 'horde'
                                step = 10
                            }}>
                                <h1 class="text-2xl font-bold text-start">Horde</h1>
                                <span class="mt-2 text-textcolor2 text-start">{language.setup.hordeProvider}</span>
                            </button>
                            <button class="border-l-green-500 border-l-4 p-6 flex flex-col transition-shadow hover:ring-1" onclick={() => {
                                provider = 'openrouter'
                                step = 3
                            }}>
                                <h1 class="text-2xl font-bold text-start">OpenRouter</h1>
                                <span class="mt-2 text-textcolor2 text-start">{language.setup.openrouterProvider}</span>
                            </button>
                            <button class="border-l-gray-500 border-l-4 p-6 flex flex-col transition-shadow hover:ring-1" onclick={() => {
                                provider = 'later'
                                step = 10
                            }}>
                                <h1 class="text-2xl font-bold text-start">Setup Later</h1>
                                <span class="mt-2 text-textcolor2 text-start">{language.setup.setProviderLater}</span>
                            </button>
                        </div>
                    {/if}
                    {#if step >= 3}
                        <Chat name={$DataBase.username} message={provider} isLastMemory={false} />
                        {#if provider === 'openai'}
                            <Chat name="Risu" message={language.setup.setupOpenAI} isLastMemory={false} />
                        {/if}
                        {#if provider === 'openrouter'}
                            <Chat name="Risu" message={language.setup.setupOpenrouter} isLastMemory={false} />
                        {/if}
                    {/if}
                    {#if step === 10}
                        <Chat name="Risu" message={language.setup.allDone} isLastMemory={false} />
                    {/if}
                    <div class="flex items-end mb-2 w-full mt-auto ">
                        <input class="flex-grow text-textcolor p-2 min-w-0 bg-transparent input-text text-xl ml-4 mr-2 border-darkbutton resize-none focus:bg-selected overflow-y-hidden overflow-x-hidden max-w-full"
                            bind:value={input}
                            onkeydown={(e) => {
                                if(e.key.toLocaleLowerCase() === "enter" && (!e.shiftKey) && !e.isComposing){
                                    e.preventDefault()
                                    send()
                                }
                            }}
                            style:height={'44px'}
                        />
                        <div onclick={send}
                            class="mr-2 bg-textcolor2 flex justify-center items-center text-gray-100 w-12 h-12 rounded-md hover:bg-green-500 transition-colors">
                            <Send />
                        </div>
                    </div>
                {/if}
            </div>
        {/if}

    </div>
</div>
<style>
    .welcome-bg{
        background-size: cover;
        position: relative;
    }

    @keyframes darkness {
        from {
            opacity: 0;
        }
        50% {
            opacity: 0.2;
        }
        to {
            opacity: 0;
        }
    }

    .logo-animation{
        animation: logo-animation 3s ease-in-out;
        opacity: 0;
    }
    @keyframes logo-animation {
        from {
            opacity: 0;
        }
        80% {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }

    .chat-animation{
        animation: chat-animation 3s ease-in-out;
    }
    @keyframes chat-animation {
        from {
            top: 100vh;
        }
        to {
            top: 0;
        }
    }

</style>
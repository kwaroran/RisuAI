<script lang="ts">
    import { ArrowLeft, ChevronDown } from "@lucide/svelte";
    import { fly, fade } from "svelte/transition";
    import { MediaQuery } from "svelte/reactivity";
    import MarkdownIt from "markdown-it";
    import DOMPurify from "dompurify";
    import { changeLanguage, language } from "src/lang";
    import { setPreset } from "src/ts/storage/database.svelte";
    import { DBState } from 'src/ts/stores.svelte';
    import { openURL } from "src/ts/globalApi.svelte";
    import { prebuiltPresets } from "src/ts/process/templates/templates";
    import { updateTextThemeAndCSS } from "src/ts/gui/colorscheme";
    import { alertError } from "src/ts/alert";
    import Airisu from '../../etc/Airisu.webp'
    import WelcomeBackground from './WelcomeBackground.svelte'

    let step = $state(0)
    let history: number[] = $state([])
    let provider = $state('')
    let input = $state('')
    let chatLang = $state(0)
    let chatMemorySelection = $state(0)

    const languages = [
        { code: 'de', label: 'Deutsch' },
        { code: 'en', label: 'English' },
        { code: 'es', label: 'Español' },
        { code: 'ko', label: '한국어' },
        { code: 'cn', label: '中文' },
        { code: 'zh-Hant', label: '中文(繁體)' },
        { code: 'vi', label: 'Tiếng Việt' },
    ]

    // steps go 0-6, then jump to 10 when done
    const stepOrder = [0, 1, 2, 3, 4, 5, 6, 10]

    {
        const browserLang = navigator.language
        const browserLangShort = browserLang.split('-')[0]
        const usableLangs = ['de', 'en', 'es', 'ko', 'cn', 'vi', 'zh-Hant']
        if(usableLangs.includes(browserLangShort)){
            changeLanguage(browserLangShort)
            DBState.db.language = browserLangShort
            step = 1
        }
    }

    // what the user already saved on a step, so revisiting it doesn't make them type it again
    function savedInput(s: number){
        switch(s){
            case 1: return DBState.db.username
            case 4: {
                if(provider === 'openai') return DBState.db.openAIKey
                if(provider === 'openrouter') return DBState.db.openrouterKey
                // claudeAPIKey has no default, so a fresh database leaves it undefined
                if(provider === 'claude') return DBState.db.claudeAPIKey ?? ''
                return ''
            }
            default: return ''
        }
    }

    function goTo(next: number){
        history = [...history, step]
        step = next
        // the name step is skipped here since the default username would fill it on first visit
        input = next === 4 ? savedInput(next) : ''
    }

    function goBack(){
        step = history.at(-1) ?? 0
        history = history.slice(0, -1)
        input = savedInput(step)
    }

    function selectLanguage(code: string){
        changeLanguage(code)
        DBState.db.language = code
        goTo(1)
    }

    // on short screens like a landscape phone a pinned key input would crush the guide, so it scrolls with it instead
    const shortScreen = new MediaQuery('max-height: 32rem')

    let scrollArea: HTMLElement | undefined = $state()
    let moreBelow = $state(false)

    // shows the scroll hint while part of the step is still hidden below the fold
    function trackOverflow(node: HTMLElement){
        const update = () => {
            moreBelow = node.scrollHeight - node.scrollTop - node.clientHeight > 8
        }
        // children are observed too, so guide images that load late still update the hint
        const observer = new ResizeObserver(update)
        observer.observe(node)
        for(const child of node.children){
            observer.observe(child)
        }
        node.addEventListener('scroll', update, { passive: true })
        update()
        return {
            destroy(){
                observer.disconnect()
                node.removeEventListener('scroll', update)
            }
        }
    }

    function scrollDown(){
        scrollArea?.scrollBy({ top: scrollArea.clientHeight * 0.7, behavior: 'smooth' })
    }

    const md = new MarkdownIt({ linkify: true, breaks: true })
    function renderMarkdown(text: string){
        return DOMPurify.sanitize(md.render(text))
    }

    function onMarkdownClick(e: MouseEvent){
        const anchor = (e.target as HTMLElement).closest('a')
        if(anchor){
            e.preventDefault()
            openURL(anchor.href)
        }
    }

    const title = $derived.by(() => {
        switch(step){
            case 0: return 'Choose your language'
            case 1: return language.setup.welcomeTitleName
            case 2: return language.setup.welcomeTitleGuide
            case 3: return language.setup.welcomeTitleProvider
            case 4: return language.setup.welcomeTitleApiKey
            case 5: return language.setup.welcomeTitleChatLang
            case 6: return language.setup.welcomeTitleMemory
            default: return language.setup.welcomeTitleDone
        }
    })

    // what Airisu says on the current step
    const speech = $derived.by(() => {
        switch(step){
            case 0: return 'Hello! 안녕하세요! 你好! Xin chào! Hallo! ¡Hola!'
            case 1: return language.setup.welcome
            case 2: return language.setup.setupLaterMessage.replace('{username}', DBState.db.username)
            case 3: return language.setup.welcome2.replace('{username}', DBState.db.username)
            case 4: {
                if(provider === 'claude'){
                    return language.setup.setupClaude
                }
                const guide = provider === 'openai' ? language.setup.setupOpenAI : language.setup.setupOpenRouter
                return guide.split('\n')[0].trim()
            }
            case 5: return language.setup.chooseChatType
            case 6: return language.setup.chooseCheapOrMemory
            default: return language.setup.allDone
        }
    })

    const apiKeyGuide = $derived.by(() => {
        // language isn't reactive, so track the saved language to rebuild the guide after switching
        DBState.db.language
        if(provider === 'claude'){
            return language.setup.setupClaudeSteps.map((text, i) =>
                `![](/welcome/claude/ant_${i}.webp)\n\n${i === 0 ? 'https://console.anthropic.com/login?returnTo=%2F%3F\n\n' : ''}` + text
            )
        }
        const guide = provider === 'openai' ? language.setup.setupOpenAI : language.setup.setupOpenRouter
        return [guide.split('\n').slice(1).map((line) => line.trim()).join('\n')]
    })

    function send(){
        switch(step){
            case 1:{
                if(input.length > 0){
                    DBState.db.username = input
                    goTo(2)
                }
                break
            }
            case 4:{
                if(input.length === 0){
                    break
                }
                if(!input.startsWith('sk-')){
                    alertError('Invalid API key')
                    break
                }
                if(provider === 'openai'){
                    DBState.db.openAIKey = input
                }
                if(provider === 'openrouter'){
                    DBState.db.openrouterKey = input
                }
                if(provider === 'claude'){
                    DBState.db.claudeAPIKey = input
                }
                goTo(5)
                break
            }
        }
    }

    $effect.pre(() => {
        if(step === 10){
            setTimeout(() => {
                DBState.db = setPreset(DBState.db, prebuiltPresets.OAI2)
                DBState.db.textTheme = 'highcontrast'
                updateTextThemeAndCSS()

                switch(chatMemorySelection){
                    case 0:{
                        DBState.db.maxContext = 16000
                        DBState.db.maxResponse = 1000
                        break
                    }
                    case 1:{
                        DBState.db.maxContext = 8000
                        DBState.db.maxResponse = 500
                        break
                    }
                    case 2:{
                        DBState.db.maxContext = 12000
                        DBState.db.maxResponse = 800
                        break
                    }
                    case 3:{
                        DBState.db.maxContext = 100000
                        DBState.db.maxResponse = 1000
                        break
                    }
                }

                if(provider === 'claude'){
                    DBState.db.aiModel = 'claude-sonnet-4-6'
                    DBState.db.subModel = 'claude-sonnet-4-6'
                }

                if(provider === 'openai'){
                    DBState.db.aiModel = 'gpt4o-chatgpt'
                    DBState.db.subModel = 'gpt4o-chatgpt'
                }

                if(provider === 'openrouter'){
                    DBState.db.aiModel = 'openrouter'
                    DBState.db.subModel = 'openrouter'
                    DBState.db.openrouterRequestModel = 'risu/free'
                }
                if(provider === 'horde'){
                    DBState.db.aiModel = 'horde:::auto'
                    DBState.db.subModel = 'horde:::auto'
                }
                if(chatLang !== 0){
                    switch(DBState.db.language){
                        case 'de':{
                            DBState.db.translator = 'de'
                            break
                        }
                        case 'en':{
                            DBState.db.translator = 'en'
                            break
                        }
                        case 'ko':{
                            DBState.db.translator = 'ko'
                            break
                        }
                        case 'cn':{
                            DBState.db.translator = 'zh'
                            break
                        }
                        case 'es':{
                            DBState.db.translator = 'es'
                            break
                        }
                        case 'vi':{
                            DBState.db.translator = 'vi'
                            break
                        }
                        case 'zh-Hant':{
                            DBState.db.translator = 'zh-TW'
                            break
                        }
                    }
                }
                if(chatLang === 1){
                    DBState.db.autoTranslate = true
                    DBState.db.translatorType = 'google'
                    DBState.db.useAutoTranslateInput = true
                }

                DBState.db.didFirstSetup = true
            }, 1000);

            DBState.db.claudeCachingExperimental = true
        }

    });
</script>

<div class="relative h-full w-full overflow-hidden bg-bgcolor text-textcolor sm:p-3 lg:p-4">
    <div class="relative flex h-full w-full flex-col overflow-hidden sm:rounded-[2rem]">
        <WelcomeBackground />
        <div class="vignette pointer-events-none absolute inset-0"></div>
        <div class="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-black/20 lg:bg-linear-to-r lg:from-black/40 lg:via-transparent lg:to-transparent"></div>
        <img src={Airisu} alt="" class="airisu pointer-events-none absolute bottom-0 right-[6%] hidden h-[44%] max-h-[22rem] w-auto lg:block" draggable="false">

    <header class="relative z-20 flex shrink-0 items-center p-[clamp(1rem,2.4vmin,1.75rem)]">
        <!-- scales with the shorter screen side so tablets don't get a phone-sized logo -->
        <div class="rounded-[clamp(1rem,2.4vmin,1.5rem)] bg-darkbg/85 px-[clamp(1rem,2.2vmin,1.5rem)] py-[clamp(0.625rem,1.6vmin,1rem)] shadow-xl backdrop-blur">
            <img src="/logo_typo_trans.png" alt="Risuai" class="h-[clamp(1.5rem,5.5vmin,3.25rem)] w-auto">
        </div>
    </header>

    <main class="relative z-10 flex min-h-0 flex-1 items-end">
        <!-- on desktop the modal is centered on 25% of the screen width and keeps a fixed height that scales with the screen -->
        <div class="relative z-10 flex max-h-[78%] w-full flex-col rounded-t-[2rem] bg-darkbg shadow-2xl lg:absolute lg:left-1/4 lg:top-1/2 lg:h-[clamp(30rem,62%,40rem)] lg:max-h-[calc(100%-2.5rem)] lg:w-[clamp(26rem,32vw,36rem)] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[2rem]">
            <img src={Airisu} alt="" class="airisu pointer-events-none absolute bottom-full right-4 -mb-3 h-44 w-auto lg:hidden" draggable="false">
            <div class="flex items-center justify-between px-7 pt-6">
                <button class="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-textcolor2 transition-colors hover:bg-textcolor/10 hover:text-textcolor disabled:invisible" disabled={step === 0 || step === 10} onclick={goBack} aria-label={language.goback}>
                    <ArrowLeft size={20} />
                </button>
                <div class="flex items-center gap-1.5">
                    {#each stepOrder as s}
                        <span class="h-1.5 rounded-full transition-all duration-300 {s === step ? 'w-5 bg-textcolor' : stepOrder.indexOf(s) < stepOrder.indexOf(step) ? 'w-1.5 bg-textcolor/60' : 'w-1.5 bg-textcolor/15'}"></span>
                    {/each}
                </div>
                <div class="w-9"></div>
            </div>

            {#key step}
                <div class="flex min-h-0 flex-1 flex-col" in:fly={{ x: 16, duration: 300 }}>
                <div class="relative flex min-h-0 flex-1 flex-col">
                <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-7 pb-7 pt-4" bind:this={scrollArea} use:trackOverflow>
                    <h1 class="text-center text-3xl font-bold leading-tight tracking-tight lg:text-[clamp(1.875rem,3.6vmin,2.75rem)]">{title}</h1>
                    <div class="mt-3 flex items-start justify-center gap-2 text-center text-textcolor2 lg:mt-4 lg:text-[clamp(1rem,1.9vmin,1.375rem)] lg:leading-relaxed">
                        <span>{speech}</span>
                    </div>

                    <div class="mt-7 flex flex-col gap-3">
                        {#if step === 0}
                            <div class="grid grid-cols-2 gap-2">
                                {#each languages as lang}
                                    <button class="rounded-2xl bg-bgcolor px-4 py-3.5 font-medium transition-colors hover:bg-selected" onclick={() => selectLanguage(lang.code)}>{lang.label}</button>
                                {/each}
                            </div>
                        {:else if step === 1}
                            {@render textInput('text', DBState.db.username || 'Name')}
                        {:else if step === 2}
                            {@render option(language.setup.setupMessageOption1, language.setup.setupMessageOption1Desc, true, () => goTo(3))}
                            {@render option(language.setup.setupMessageOption2, '', false, () => {
                                provider = 'later'
                                goTo(10)
                            })}
                        {:else if step === 3}
                            {@render option('Claude', language.setup.claudeDesc, true, () => {
                                provider = 'claude'
                                goTo(4)
                            })}
                            {@render option('OpenAI', language.setup.openAIDesc, false, () => {
                                provider = 'openai'
                                goTo(4)
                            })}
                            {@render option('OpenRouter', language.setup.openRouterProvider, false, () => {
                                provider = 'openrouter'
                                goTo(4)
                            })}
                            {@render option('Horde', language.setup.hordeProvider, false, () => {
                                provider = 'horde'
                                goTo(10)
                            })}
                        {:else if step === 4}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                            <ol class="guide flex flex-col gap-3" onclick={onMarkdownClick}>
                                {#each apiKeyGuide as item}
                                    <li class="rounded-2xl bg-bgcolor p-4 text-sm leading-relaxed">{@html renderMarkdown(item)}</li>
                                {/each}
                            </ol>
                            {#if shortScreen.current}
                                <div class="pt-3">
                                    <!-- no autofocus here, it would jump past the guide straight to the input -->
                                    {@render textInput('password', 'sk-...', false)}
                                </div>
                            {/if}
                        {:else if step === 5}
                            {@render option(language.setup.chooseChatTypeOption1, language.setup.chooseChatTypeOption1Desc, false, () => {
                                chatLang = 0
                                goTo(6)
                            })}
                            {@render option(language.setup.chooseChatTypeOption2, language.setup.chooseChatTypeOption2Desc, false, () => {
                                chatLang = 1
                                goTo(6)
                            })}
                            {@render option(language.setup.chooseChatTypeOption3, language.setup.chooseChatTypeOption3Desc, false, () => {
                                chatLang = 2
                                goTo(6)
                            })}
                        {:else if step === 6}
                            {@render option(language.setup.chooseCheapOrMemoryOption3, language.setup.chooseCheapOrMemoryOption3Desc, true, () => {
                                chatMemorySelection = 2
                                goTo(10)
                            })}
                            {@render option(language.setup.chooseCheapOrMemoryOption1, language.setup.chooseCheapOrMemoryOption1Desc, false, () => {
                                chatMemorySelection = 0
                                goTo(10)
                            })}
                            {@render option(language.setup.chooseCheapOrMemoryOption2, language.setup.chooseCheapOrMemoryOption2Desc, false, () => {
                                chatMemorySelection = 1
                                goTo(10)
                            })}
                            {@render option(language.setup.chooseCheapOrMemoryOption4, language.setup.chooseCheapOrMemoryOption4Desc, false, () => {
                                chatMemorySelection = 3
                                goTo(10)
                            })}
                        {:else}
                            <div class="flex justify-center py-6" in:fade={{ delay: 200 }}>
                                <div class="h-8 w-8 animate-spin rounded-full border-2 border-textcolor/20 border-t-textcolor"></div>
                            </div>
                        {/if}
                    </div>

                    {#if step !== 4 && step !== 10}
                        <p class="mt-auto pt-6 text-center text-xs text-textcolor2">{step === 0 ? 'You can change it later in settings.' : language.setup.welcomeChangeLater}</p>
                    {/if}
                </div>
                {#if moreBelow}
                    <div class="pointer-events-none absolute inset-x-0 bottom-0 flex h-16 items-end justify-center bg-linear-to-t from-darkbg via-darkbg/80 to-transparent pb-3 {step === 4 && !shortScreen.current ? '' : 'lg:rounded-b-[2rem]'}" transition:fade={{ duration: 150 }}>
                        <!-- mouse shortcut only; the area itself scrolls with wheel, touch and keyboard -->
                        <button class="scroll-hint pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-bgcolor text-textcolor2 shadow-lg transition-colors hover:bg-selected hover:text-textcolor" tabindex="-1" aria-hidden="true" onclick={scrollDown}>
                            <ChevronDown size={20} />
                        </button>
                    </div>
                {/if}
                </div>
                {#if step === 4 && !shortScreen.current}
                    <!-- kept outside the scroll area so the key input stays reachable under the long guide -->
                    <div class="shrink-0 rounded-b-[2rem] px-7 pb-7 pt-4 shadow-[0_-12px_24px_-12px_rgb(0_0_0/0.4)]">
                        {@render textInput('password', 'sk-...')}
                    </div>
                {/if}
                </div>
            {/key}
        </div>
    </main>
    </div>
</div>

{#snippet option(title: string, desc: string, primary: boolean, onclick: () => void)}
    <button class="flex flex-col items-center rounded-2xl px-5 py-4 text-center transition-all hover:shadow-lg {primary ? 'bg-textcolor text-bgcolor hover:opacity-90' : 'bg-bgcolor hover:bg-selected'}" {onclick}>
        <span class="font-semibold">{title}</span>
        {#if desc}
            <span class="mt-1 text-xs leading-relaxed {primary ? 'opacity-70' : 'text-textcolor2'}">{desc}</span>
        {/if}
    </button>
{/snippet}

{#snippet textInput(type: string, placeholder: string, focus = true)}
    <!-- svelte-ignore a11y_autofocus -->
    <input class="w-full rounded-2xl bg-bgcolor px-5 py-4 text-center text-lg text-textcolor outline-hidden ring-textcolor/40 transition-shadow placeholder:text-textcolor2/50 focus:ring-2"
        bind:value={input}
        autofocus={focus}
        {type}
        {placeholder}
        onkeydown={(e) => {
            if(e.key === 'Enter' && !e.isComposing){
                e.preventDefault()
                send()
            }
        }}
    />
    <button class="mt-3 w-full rounded-2xl bg-textcolor py-4 font-semibold text-bgcolor transition-opacity hover:opacity-90 disabled:opacity-30" disabled={input.length === 0} onclick={send}>
        {language.setup.welcomeContinue}
    </button>
{/snippet}

<style>
    .vignette{
        background: radial-gradient(ellipse at 60% 45%, transparent 40%, rgb(0 0 0 / 0.5) 100%);
    }

    .airisu{
        filter: drop-shadow(0 12px 24px rgb(0 0 0 / 0.35));
        animation: airisu-idle 4s ease-in-out infinite;
        transform-origin: bottom center;
    }
    @keyframes airisu-idle {
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-8px);
        }
    }

    .scroll-hint{
        animation: scroll-hint 1.6s ease-in-out infinite;
    }
    @keyframes scroll-hint {
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(4px);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .airisu, .scroll-hint{
            animation: none;
        }
    }

    .guide :global(p){
        margin: 0;
    }
    .guide :global(p + p){
        margin-top: 0.5rem;
    }
    .guide :global(ol){
        list-style: decimal;
        padding-left: 1.25rem;
    }
    .guide :global(a){
        text-decoration: underline;
        word-break: break-all;
    }
    .guide :global(img){
        border-radius: 0.75rem;
        max-width: 100%;
        max-height: 14rem;
        margin: 0 auto;
        object-fit: contain;
    }
</style>

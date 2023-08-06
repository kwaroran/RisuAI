<script lang="ts">
    import { AccessibilityIcon, ActivityIcon, AlignLeft, BookIcon, BotIcon, BoxIcon, CodeIcon, ContactIcon, DiamondIcon, FolderIcon, LanguagesIcon, MonitorIcon, Sailboat, ScrollTextIcon, UserIcon, XCircleIcon } from "lucide-svelte";
    import { language } from "src/lang";
    import DisplaySettings from "./Pages/DisplaySettings.svelte";
    import UserSettings from "./Pages/UserSettings.svelte";
    import BotSettings from "./Pages/BotSettings.svelte";
    import OtherBotSettings from "./Pages/OtherBotSettings.svelte";
    import PluginSettings from "./Pages/PluginSettings.svelte";
    import FilesSettings from "./Pages/FilesSettings.svelte";
    import AdvancedSettings from "./Pages/AdvancedSettings.svelte";
    import { settingsOpen } from "src/ts/stores";
    import Botpreset from "./botpreset.svelte";
    import Communities from "./Pages/Communities.svelte";
    import GlobalLoreBookSettings from "./Pages/GlobalLoreBookSettings.svelte";
    import Lorepreset from "./lorepreset.svelte";
    import GlobalRegex from "./Pages/GlobalRegex.svelte";
    import LanguageSettings from "./Pages/LanguageSettings.svelte";
    import AccessibilitySettings from "./Pages/AccessibilitySettings.svelte";
    import PersonaSettings from "./Pages/PersonaSettings.svelte";
  import PromptSettings from "./Pages/PromptSettings.svelte";
  import { DataBase } from "src/ts/storage/database";
    let selected = -1
    let openPresetList = false
    let openLoreList = false
    if(window.innerWidth >= 700){
        selected = 1
    }

</script>
<div class="h-full w-full flex justify-center setting-bg">
    <div class="h-full max-w-screen-lg w-full flex relative">
        {#if window.innerWidth >= 700 || selected === -1}
            <div class="flex h-full flex-col p-4 pt-8 bg-darkbg gap-2 overflow-y-auto relative"
                class:w-full={window.innerWidth < 700}>
                <button class="flex gap-2 items-center hover:text-textcolor"
                    class:text-textcolor={selected === 1 || selected === 13}
                    class:text-textcolor2={selected !== 1 && selected !== 13}
                    on:click={() => {
                        selected = 1
                        
                }}>
                    <BotIcon />
                    <span>{language.chatBot}</span>
                </button>
                <button class="flex gap-2 items-center hover:text-textcolor"
                    class:text-textcolor={selected === 12}
                    class:text-textcolor2={selected !== 12}
                    on:click={() => {
                        selected = 12
                }}>
                    <ContactIcon />
                    <span>{language.persona}</span>
                </button>
                <button class="flex gap-2 items-center hover:text-textcolor"
                    class:text-textcolor={selected === 2}
                    class:text-textcolor2={selected !== 2}
                    on:click={() => {
                        selected = 2
                }}>
                    <Sailboat />
                    <span>{language.otherBots}</span>
                </button>
                <button class="flex gap-2 items-center hover:text-textcolor"
                    class:text-textcolor={selected === 3}
                    class:text-textcolor2={selected !== 3}
                    on:click={() => {
                        selected = 3
                }}>
                    <MonitorIcon />
                    <span>{language.display}</span>
                </button>
                <button class="flex gap-2 items-center hover:text-textcolor"
                    class:text-textcolor={selected === 10}
                    class:text-textcolor2={selected !== 10}
                    on:click={() => {
                        selected = 10
                }}>
                    <LanguagesIcon />
                    <span>{language.language}</span>
                </button>
                <button class="flex gap-2 items-center hover:text-textcolor"
                    class:text-textcolor={selected === 11}
                    class:text-textcolor2={selected !== 11}
                    on:click={() => {
                        selected = 11
                }}>
                    <AccessibilityIcon />
                    <span>{language.accessibility}</span>
                </button>
                <button class="flex gap-2 items-center hover:text-textcolor"
                    class:text-textcolor={selected === 8}
                    class:text-textcolor2={selected !== 8}
                    on:click={() => {
                        selected = 8
                }}>
                    <BookIcon />
                    <span>{language.globalLoreBook}</span>
                </button>
                <button class="flex gap-2 items-center hover:text-textcolor"
                    class:text-textcolor={selected === 9}
                    class:text-textcolor2={selected !== 9}
                    on:click={() => {
                        selected = 9
                }}>
                    <AlignLeft />
                    <span>{language.globalRegexScript}</span>
                </button>
                <button class="flex gap-2 items-center hover:text-textcolor"
                    class:text-textcolor={selected === 4}
                    class:text-textcolor2={selected !== 4}
                    on:click={() => {
                    selected = 4
                }}>
                    <CodeIcon />
                    <span>{language.plugin}</span>
                </button>
                <button class="flex gap-2 items-center hover:text-textcolor"
                    class:text-textcolor={selected === 0}
                    class:text-textcolor2={selected !== 0}
                    on:click={() => {
                        selected = 0
                }}>
                    <UserIcon />
                    <span>{language.account} & {language.files}</span>
                </button>
                <button class="flex gap-2 items-center hover:text-textcolor"
                    class:text-textcolor={selected === 6}
                    class:text-textcolor2={selected !== 6}
                    on:click={() => {
                    selected = 6
                }}>
                    <ActivityIcon />
                    <span>{language.advancedSettings}</span>
                </button>
                <button class="flex gap-2 items-center hover:text-textcolor"
                    class:text-textcolor={selected === 7}
                    class:text-textcolor2={selected !== 7}
                    on:click={() => {
                    selected = 7
                }}>
                    <BoxIcon />
                    <span>{language.community}</span>
                </button>
                {#if window.innerWidth < 700}
                    <button class="absolute top-2 right-2 hover:text-green-500 text-textcolor" on:click={() => {
                        settingsOpen.set(false)
                    }}> <XCircleIcon /> </button>
                {/if}
            </div>
        {/if}
        {#if window.innerWidth >= 700 || selected !== -1}
            {#key selected}
                <div class="flex-grow py-6 px-4 bg-bgcolor flex flex-col text-textcolor overflow-y-auto relative">
                    {#if selected === 0}
                        <UserSettings />
                    {:else if selected === 1}
                        <BotSettings bind:openPresetList goPromptTemplate={() => {
                            selected = 13
                        }} />
                    {:else if selected === 2}
                        <OtherBotSettings />
                    {:else if selected === 3}
                        <DisplaySettings />
                    {:else if selected === 4}
                        <PluginSettings />
                    {:else if selected === 5}
                        <FilesSettings />
                    {:else if selected === 6}
                        <AdvancedSettings />
                    {:else if selected === 7}
                        <Communities />
                    {:else if selected === 8}
                        <GlobalLoreBookSettings bind:openLoreList />
                    {:else if selected === 9}
                        <GlobalRegex/>
                    {:else if selected === 10}
                        <LanguageSettings/>
                    {:else if selected === 11}
                        <AccessibilitySettings/>
                    {:else if selected === 12}
                        <PersonaSettings/>
                    {:else if selected === 13}
                        <PromptSettings onGoBack={() => {
                            selected = 1
                        }}/>
                    {/if}
            </div>
            {/key}
            <button class="absolute top-2 right-2 hover:text-green-500 text-textcolor" on:click={() => {
                if(window.innerWidth >= 700){
                    settingsOpen.set(false)
                }
                else{
                    selected = -1
                }
            }}>
                <XCircleIcon />
            </button>            
        {/if}
    </div>
</div>
{#if openPresetList}
    <Botpreset close={() => {openPresetList = false}} />
{/if}
{#if openLoreList}
    <Lorepreset close={() => {openLoreList = false}} />
{/if}
<style>
    .setting-bg{
        background: linear-gradient(to right, var(--risu-theme-darkbg) 50%, var(--risu-theme-bgcolor) 50%);

    }
</style>
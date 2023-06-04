<script lang="ts">
    import { AccessibilityIcon, ActivityIcon, AlignLeft, BookIcon, BotIcon, BoxIcon, CodeIcon, DiamondIcon, FolderIcon, LanguagesIcon, MonitorIcon, Sailboat, UserIcon, XCircleIcon } from "lucide-svelte";
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
    let selected = -1
    let openPresetList = false
    let openLoreList = false
    if(window.innerWidth >= 700){
        selected = 0
    }

</script>
<div class="h-full w-full flex justify-center setting-bg">
    <div class="h-full max-w-screen-lg w-full flex relative">
        {#if window.innerWidth >= 700 || selected === -1}
            <div class="flex h-full flex-col p-4 pt-8 bg-darkbg gap-2 overflow-y-auto relative"
                class:w-full={window.innerWidth < 700}>
                <button class="text-gray-400 flex gap-2 items-center hover:text-gray-200" class:text-white={selected === 0} on:click={() => {
                    selected = 0
                }}>
                    <UserIcon />
                    <span>{language.user}</span>
                </button>
                <button class="text-gray-400 flex gap-2 items-center hover:text-gray-200" class:text-white={selected === 1} on:click={() => {
                    selected = 1
                }}>
                    <BotIcon />
                    <span>{language.chatBot}</span>
                </button>
                <button class="text-gray-400 flex gap-2 items-center hover:text-gray-200" class:text-white={selected === 2} on:click={() => {
                    selected = 2
                }}>
                    <Sailboat />
                    <span>{language.otherBots}</span>
                </button>
                <button class="text-gray-400 flex gap-2 items-center hover:text-gray-200" class:text-white={selected === 3} on:click={() => {
                    selected = 3
                }}>
                    <MonitorIcon />
                    <span>{language.display}</span>
                </button>
                <button class="text-gray-400 flex gap-2 items-center hover:text-gray-200" class:text-white={selected === 10} on:click={() => {
                    selected = 10
                }}>
                    <LanguagesIcon />
                    <span>{language.language}</span>
                </button>
                <button class="text-gray-400 flex gap-2 items-center hover:text-gray-200" class:text-white={selected === 11} on:click={() => {
                    selected = 11
                }}>
                    <AccessibilityIcon />
                    <span>{language.accessibility}</span>
                </button>
                <button class="text-gray-400 flex gap-2 items-center hover:text-gray-200" class:text-white={selected === 8} on:click={() => {
                    selected = 8
                }}>
                    <BookIcon />
                    <span>{language.globalLoreBook}</span>
                </button>
                <button class="text-gray-400 flex gap-2 items-center hover:text-gray-200" class:text-white={selected === 9} on:click={() => {
                    selected = 9
                }}>
                    <AlignLeft />
                    <span>{language.globalRegexScript}</span>
                </button>
                <button class="text-gray-400 flex gap-2 items-center hover:text-gray-200" class:text-white={selected === 4} on:click={() => {
                    selected = 4
                }}>
                    <CodeIcon />
                    <span>{language.plugin}</span>
                </button>
                <button class="text-gray-400 flex gap-2 items-center hover:text-gray-200" class:text-white={selected === 5} on:click={() => {
                    selected = 5
                }}>
                    <FolderIcon />
                    <span>{language.files}</span>
                </button>
                <button class="text-gray-400 flex gap-2 items-center hover:text-gray-200" class:text-white={selected === 6} on:click={() => {
                    selected = 6
                }}>
                    <ActivityIcon />
                    <span>{language.advancedSettings}</span>
                </button>
                <button class="text-gray-400 flex gap-2 items-center hover:text-gray-200" class:text-white={selected === 7} on:click={() => {
                    selected = 7
                }}>
                    <BoxIcon />
                    <span>{language.community}</span>
                </button>
                {#if window.innerWidth < 700}
                    <button class="absolute top-2 right-2 hover:text-green-500 text-white" on:click={() => {
                        settingsOpen.set(false)
                    }}> <XCircleIcon /> </button>
                {/if}
            </div>
        {/if}
        {#if window.innerWidth >= 700 || selected !== -1}
            <div class="flex-grow p-4 bg-bgcolor flex flex-col text-white overflow-y-auto relative">
                {#if selected === 0}
                    <UserSettings />
                {:else if selected === 1}
                    <BotSettings bind:openPresetList />
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
                {/if}
            </div>
            <button class="absolute top-2 right-2 hover:text-green-500 text-white" on:click={() => {
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
        background: linear-gradient(to right, #21222C 50%, #282a36 50%);

    }
</style>
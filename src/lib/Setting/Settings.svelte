<script lang="ts">
    import { AccessibilityIcon, ActivityIcon, AlignLeft, BookIcon, PackageIcon, BotIcon, BoxIcon, CodeIcon, ContactIcon, DiamondIcon, FolderIcon, LanguagesIcon, MonitorIcon, Sailboat, ScrollTextIcon, UserIcon, XCircleIcon } from "lucide-svelte";
    import { language } from "src/lang";
    import DisplaySettings from "./Pages/DisplaySettings.svelte";
    import UserSettings from "./Pages/UserSettings.svelte";
    import BotSettings from "./Pages/BotSettings.svelte";
    import OtherBotSettings from "./Pages/OtherBotSettings.svelte";
    import PluginSettings from "./Pages/PluginSettings.svelte";
    import FilesSettings from "./Pages/FilesSettings.svelte";
    import AdvancedSettings from "./Pages/AdvancedSettings.svelte";
    import { MobileGUI, SettingsMenuIndex, settingsOpen } from "src/ts/stores";
    import Botpreset from "./botpreset.svelte";
    import Communities from "./Pages/Communities.svelte";
    import GlobalLoreBookSettings from "./Pages/GlobalLoreBookSettings.svelte";
    import Lorepreset from "./lorepreset.svelte";
    import GlobalRegex from "./Pages/GlobalRegex.svelte";
    import LanguageSettings from "./Pages/LanguageSettings.svelte";
    import AccessibilitySettings from "./Pages/AccessibilitySettings.svelte";
    import PersonaSettings from "./Pages/PersonaSettings.svelte";
    import PromptSettings from "./Pages/PromptSettings.svelte";
    import ThanksPage from "./Pages/ThanksPage.svelte";
    import ModuleSettings from "./Pages/Module/ModuleSettings.svelte";
  import { isLite } from "src/ts/lite";

    let openLoreList = false
    if(window.innerWidth >= 900 && $SettingsMenuIndex === -1 && !$MobileGUI){
        $SettingsMenuIndex = 1
    }

</script>
<div class="h-full w-full flex justify-center rs-setting-cont" class:bg-bgcolor={$MobileGUI} class:setting-bg={!$MobileGUI}>
    <div class="h-full max-w-screen-lg w-full flex relative rs-setting-cont-2">
        {#if (window.innerWidth >= 700 && !$MobileGUI) || $SettingsMenuIndex === -1}
            <div class="flex h-full flex-col p-4 pt-8 gap-2 overflow-y-auto relative rs-setting-cont-3"
                class:w-full={window.innerWidth < 700 || $MobileGUI}
                class:bg-darkbg={!$MobileGUI} class:bg-bgcolor={$MobileGUI}
            >
                
                {#if !$isLite}
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 1 || $SettingsMenuIndex === 13}
                        class:text-textcolor2={$SettingsMenuIndex !== 1 && $SettingsMenuIndex !== 13}
                        on:click={() => {
                            $SettingsMenuIndex = 1
                            
                    }}>
                        <BotIcon />
                        <span>{language.chatBot}</span>
                    </button>
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 12}
                        class:text-textcolor2={$SettingsMenuIndex !== 12}
                        on:click={() => {
                            $SettingsMenuIndex = 12
                    }}>
                        <ContactIcon />
                        <span>{language.persona}</span>
                    </button>
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 2}
                        class:text-textcolor2={$SettingsMenuIndex !== 2}
                        on:click={() => {
                            $SettingsMenuIndex = 2
                    }}>
                        <Sailboat />
                        <span>{language.otherBots}</span>
                    </button>
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 3}
                        class:text-textcolor2={$SettingsMenuIndex !== 3}
                        on:click={() => {
                            $SettingsMenuIndex = 3
                    }}>
                        <MonitorIcon />
                        <span>{language.display}</span>
                    </button>
                {/if}
                <button class="flex gap-2 items-center hover:text-textcolor"
                    class:text-textcolor={$SettingsMenuIndex === 10}
                    class:text-textcolor2={$SettingsMenuIndex !== 10}
                    on:click={() => {
                        $SettingsMenuIndex = 10
                }}>
                    <LanguagesIcon />
                    <span>{language.language}</span>
                </button>
                {#if !$isLite}
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 11}
                        class:text-textcolor2={$SettingsMenuIndex !== 11}
                        on:click={() => {
                            $SettingsMenuIndex = 11
                    }}>
                        <AccessibilityIcon />
                        <span>{language.accessibility}</span>
                    </button>
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 14}
                        class:text-textcolor2={$SettingsMenuIndex !== 14}
                        on:click={() => {
                            $SettingsMenuIndex = 14
                    }}>
                        <PackageIcon />
                        <span>{language.modules}</span>
                    </button>
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 4}
                        class:text-textcolor2={$SettingsMenuIndex !== 4}
                        on:click={() => {
                        $SettingsMenuIndex = 4
                    }}>
                        <CodeIcon />
                        <span>{language.plugin}</span>
                    </button>
                {/if}
                <button class="flex gap-2 items-center hover:text-textcolor"
                    class:text-textcolor={$SettingsMenuIndex === 0}
                    class:text-textcolor2={$SettingsMenuIndex !== 0}
                    on:click={() => {
                        $SettingsMenuIndex = 0
                }}>
                    <UserIcon />
                    <span>{language.account} & {language.files}</span>
                </button>
                {#if !$isLite}
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 6}
                        class:text-textcolor2={$SettingsMenuIndex !== 6}
                        on:click={() => {
                        $SettingsMenuIndex = 6
                    }}>
                        <ActivityIcon />
                        <span>{language.advancedSettings}</span>
                    </button>
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 77}
                        class:text-textcolor2={$SettingsMenuIndex !== 77}
                        on:click={() => {
                        $SettingsMenuIndex = 77
                    }}>
                        <BoxIcon />
                        <span>{language.supporterThanks}</span>
                    </button>
                {/if}
                {#if window.innerWidth < 700 && !$MobileGUI}
                    <button class="absolute top-2 right-2 hover:text-green-500 text-textcolor" on:click={() => {
                        settingsOpen.set(false)
                    }}> <XCircleIcon /> </button>
                {/if}
            </div>
        {/if}
        {#if (window.innerWidth >= 700 && !$MobileGUI) || $SettingsMenuIndex !== -1}
            {#key $SettingsMenuIndex}
                <div class="flex-grow py-6 px-4 bg-bgcolor flex flex-col text-textcolor overflow-y-auto relative rs-setting-cont-4">
                    {#if $SettingsMenuIndex === 0}
                        <UserSettings />
                    {:else if $SettingsMenuIndex === 1}
                        <BotSettings goPromptTemplate={() => {
                            $SettingsMenuIndex = 13
                        }} />
                    {:else if $SettingsMenuIndex === 2}
                        <OtherBotSettings />
                    {:else if $SettingsMenuIndex === 3}
                        <DisplaySettings />
                    {:else if $SettingsMenuIndex === 4}
                        <PluginSettings />
                    {:else if $SettingsMenuIndex === 5}
                        <FilesSettings />
                    {:else if $SettingsMenuIndex === 6}
                        <AdvancedSettings />
                    {:else if $SettingsMenuIndex === 7}
                        <Communities />
                    {:else if $SettingsMenuIndex === 8}
                        <GlobalLoreBookSettings bind:openLoreList />
                    {:else if $SettingsMenuIndex === 9}
                        <GlobalRegex/>
                    {:else if $SettingsMenuIndex === 10}
                        <LanguageSettings/>
                    {:else if $SettingsMenuIndex === 11}
                        <AccessibilitySettings/>
                    {:else if $SettingsMenuIndex === 12}
                        <PersonaSettings/>
                    {:else if $SettingsMenuIndex === 14}
                        <ModuleSettings/>
                    {:else if $SettingsMenuIndex === 13}
                        <PromptSettings onGoBack={() => {
                            $SettingsMenuIndex = 1
                        }}/>
                    {:else if $SettingsMenuIndex === 77}
                        <ThanksPage/>
                    {/if}
            </div>
            {/key}
            {#if !$MobileGUI}
                <button class="absolute top-2 right-2 hover:text-green-500 text-textcolor" on:click={() => {
                    if(window.innerWidth >= 700){
                        settingsOpen.set(false)
                    }
                    else{
                        $SettingsMenuIndex = -1
                    }
                }}>
                    <XCircleIcon />
                </button>
            {/if}
        {/if}
    </div>
</div>
{#if openLoreList}
    <Lorepreset close={() => {openLoreList = false}} />
{/if}
<style>
    .setting-bg{
        background: linear-gradient(to right, var(--risu-theme-darkbg) 50%, var(--risu-theme-bgcolor) 50%);

    }
</style>
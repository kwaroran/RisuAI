<script lang="ts">
    
    import { DBState } from 'src/ts/stores.svelte';
    import { language } from "../../../lang";
    import { DownloadIcon, HardDriveUploadIcon, PlusIcon, SunIcon, LinkIcon, FolderPlusIcon } from "@lucide/svelte";
    import { addLorebook, addLorebookFolder, exportLoreBook, importLoreBook } from "../../../ts/process/lorebook.svelte";
    import Check from "../../UI/GUI/CheckInput.svelte";
    import NumberInput from "../../UI/GUI/NumberInput.svelte";
    import LoreBookList from "./LoreBookList.svelte";
    import Help from "src/lib/Others/Help.svelte";
    import { selectedCharID } from "src/ts/stores.svelte";

    let submenu = $state(0)
    interface Props {
        globalMode?: boolean;
    }

    let { globalMode = $bindable(false) }: Props = $props();

    function isAllCharacterLoreAlwaysActive() {
        const globalLore = DBState.db.characters[$selectedCharID].globalLore;
        return globalLore && globalLore.every((book) => book.alwaysActive);
    }

    function isAllChatLoreAlwaysActive() {
        const localLore = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].localLore;
        return localLore && localLore.every((book) => book.alwaysActive);
    }

    function toggleCharacterLoreAlwaysActive() {
        const globalLore = DBState.db.characters[$selectedCharID].globalLore;

        if (!globalLore) return;
        
        const allActive = globalLore.every((book) => book.alwaysActive);
        
        globalLore.forEach((book) => {
            book.alwaysActive = !allActive;
        });
    }

    function toggleChatLoreAlwaysActive() {
        const localLore = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].localLore;

        if (!localLore) return;

        const allActive = localLore.every((book) => book.alwaysActive);

        localLore.forEach((book) => {
            book.alwaysActive = !allActive;
        });
    }
</script>

{#if !globalMode}
    <div class="flex w-full rounded-md border border-selected">
        <button onclick={() => {
            submenu = 0
        }} class="p-2 flex-1" class:bg-selected={submenu === 0}>
            <span>{DBState.db.characters[$selectedCharID].type === 'group' ? language.group : language.character}</span>
        </button>
        <button onclick={() => {
            submenu = 1
        }} class="p2 flex-1 border-r border-l border-selected" class:bg-selected={submenu === 1}>
            <span>{language.Chat}</span>
        </button>
        <button onclick={() => {
            submenu = 2
        }} class="p-2 flex-1" class:bg-selected={submenu === 2}>
            <span>{language.settings}</span>
        </button>
    </div>
{/if}
{#if submenu !== 2}
    {#if !globalMode}
        <span class="text-textcolor2 mt-2 mb-6 text-sm">{submenu === 0 ? DBState.db.characters[$selectedCharID].type === 'group' ? language.groupLoreInfo : language.globalLoreInfo : language.localLoreInfo}</span>
    {/if}
    <LoreBookList globalMode={globalMode} submenu={submenu} lorePlus={(!globalMode) && DBState.db.characters[$selectedCharID]?.lorePlus} />
{:else}
    {#if DBState.db.characters[$selectedCharID].loreSettings}
        <div class="flex items-center mt-4">
            <Check check={false} onChange={() => {
                DBState.db.characters[$selectedCharID].loreSettings = undefined
            }}
            name={language.useGlobalSettings}
            />
        </div>
        <div class="flex items-center mt-4">
            <Check bind:check={DBState.db.characters[$selectedCharID].loreSettings.recursiveScanning} name={language.recursiveScanning}/>
        </div>
        <div class="flex items-center mt-4">
            <Check bind:check={DBState.db.characters[$selectedCharID].loreSettings.fullWordMatching} name={language.fullWordMatching}/>
        </div>
        <span class="text-textcolor mt-4 mb-2">{language.loreBookDepth}</span>
        <NumberInput size="sm" min={0} max={20} bind:value={DBState.db.characters[$selectedCharID].loreSettings.scanDepth} />
        <span class="text-textcolor">{language.loreBookToken}</span>
        <NumberInput size="sm" min={0} max={4096} bind:value={DBState.db.characters[$selectedCharID].loreSettings.tokenBudget} />
    {:else}
        <div class="flex items-center mt-4">
            <Check check={true} onChange={() => {
                DBState.db.characters[$selectedCharID].loreSettings = {
                    tokenBudget: DBState.db.loreBookToken,
                    scanDepth:DBState.db.loreBookDepth,
                    recursiveScanning: false
                }
            }}
            name={language.useGlobalSettings}
            />
        </div>
    {/if}
    <div class="flex items-center mt-4">
        {#if DBState.db.useExperimental}
            <Check bind:check={DBState.db.characters[$selectedCharID].lorePlus}
                name={language.lorePlus}
            ><Help key="lorePlus"></Help><Help key="experimental"></Help></Check>
        {/if}

    </div>
{/if}
{#if submenu !== 2}

<div class="text-textcolor2 mt-2 flex">
    <button onclick={() => {addLorebook(globalMode ? -1 : submenu)}} class="hover:text-textcolor cursor-pointer">
        <PlusIcon />
    </button>
    <button onclick={() => {
        exportLoreBook(globalMode ? 'sglobal' : submenu === 0 ? 'global' : 'local')
    }} class="hover:text-textcolor ml-1  cursor-pointer">
        <DownloadIcon />
    </button>
    <button onclick={() => {
        addLorebookFolder(globalMode ? -1 : submenu)
    }} class="hover:text-textcolor ml-2  cursor-pointer">
        <FolderPlusIcon />
    </button>
    <button onclick={() => {
        importLoreBook(globalMode ? 'sglobal' : submenu === 0 ? 'global' : 'local')
    }} class="hover:text-textcolor ml-2  cursor-pointer">
        <HardDriveUploadIcon />
    </button>
    {#if DBState.db.bulkEnabling}
        <button onclick={() => {
            toggleCharacterLoreAlwaysActive()
        }} class="hover:text-textcolor ml-2 cursor-pointer flex items-center gap-1">
            {#if isAllCharacterLoreAlwaysActive()}
                <SunIcon />
            {:else}
                <LinkIcon />
            {/if}
            <span class="text-xs">CHAR</span>
        </button>
        <button onclick={() => {
            toggleChatLoreAlwaysActive()
        }} class="hover:text-textcolor ml-2 cursor-pointer flex items-center gap-1">
            {#if isAllChatLoreAlwaysActive()}
                <SunIcon />
            {:else}
                <LinkIcon />
            {/if}
            <span class="text-xs">CHAT</span>
        </button>
    {/if}
</div>
{/if}
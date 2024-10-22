<script lang="ts">
    import { DataBase } from "../../../ts/storage/database";
    import { language } from "../../../lang";
    import { DownloadIcon, FolderUpIcon, ImportIcon, PlusIcon } from "lucide-svelte";
    import { addLorebook, exportLoreBook, importLoreBook } from "../../../ts/process/lorebook";
    import Check from "../../UI/GUI/CheckInput.svelte";
    import NumberInput from "../../UI/GUI/NumberInput.svelte";
    import LoreBookList from "./LoreBookList.svelte";
    import Help from "src/lib/Others/Help.svelte";
  import { selectedCharID } from "src/ts/stores";

    let submenu = $state(0)
    interface Props {
        globalMode?: boolean;
    }

    let { globalMode = $bindable(false) }: Props = $props();
</script>

{#if !globalMode}
    <div class="flex w-full rounded-md border border-selected">
        <button onclick={() => {
            submenu = 0
        }} class="p-2 flex-1" class:bg-selected={submenu === 0}>
            <span>{$DataBase.characters[$selectedCharID].type === 'group' ? language.group : language.character}</span>
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
        <span class="text-textcolor2 mt-2 mb-6 text-sm">{submenu === 0 ? $DataBase.characters[$selectedCharID].type === 'group' ? language.groupLoreInfo : language.globalLoreInfo : language.localLoreInfo}</span>
    {/if}
    <LoreBookList globalMode={globalMode} submenu={submenu} lorePlus={(!globalMode) && $DataBase.characters[$selectedCharID]?.lorePlus} />
{:else}
    {#if $DataBase.characters[$selectedCharID].loreSettings}
        <div class="flex items-center mt-4">
            <Check check={false} onChange={() => {
                $DataBase.characters[$selectedCharID].loreSettings = undefined
            }}
            name={language.useGlobalSettings}
            />
        </div>
        <div class="flex items-center mt-4">
            <Check bind:check={$DataBase.characters[$selectedCharID].loreSettings.recursiveScanning} name={language.recursiveScanning}/>
        </div>
        <div class="flex items-center mt-4">
            <Check bind:check={$DataBase.characters[$selectedCharID].loreSettings.fullWordMatching} name={language.fullWordMatching}/>
        </div>
        <span class="text-textcolor mt-4 mb-2">{language.loreBookDepth}</span>
        <NumberInput size="sm" min={0} max={20} bind:value={$DataBase.characters[$selectedCharID].loreSettings.scanDepth} />
        <span class="text-textcolor">{language.loreBookToken}</span>
        <NumberInput size="sm" min={0} max={4096} bind:value={$DataBase.characters[$selectedCharID].loreSettings.tokenBudget} />
    {:else}
        <div class="flex items-center mt-4">
            <Check check={true} onChange={() => {
                $DataBase.characters[$selectedCharID].loreSettings = {
                    tokenBudget: $DataBase.loreBookToken,
                    scanDepth:$DataBase.loreBookDepth,
                    recursiveScanning: false
                }
            }}
            name={language.useGlobalSettings}
            />
        </div>
    {/if}
    <div class="flex items-center mt-4">
        {#if $DataBase.useExperimental}
            <Check bind:check={$DataBase.characters[$selectedCharID].lorePlus}
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
        importLoreBook(globalMode ? 'sglobal' : submenu === 0 ? 'global' : 'local')
    }} class="hover:text-textcolor ml-2  cursor-pointer">
        <FolderUpIcon />
    </button>
</div>
{/if}
<script lang="ts">
    import { DataBase } from "../../../ts/storage/database";
    import { language } from "../../../lang";
    import {CurrentCharacter, selectedCharID} from '../../../ts/stores'
    import { DownloadIcon, FolderUpIcon, ImportIcon, PlusIcon } from "lucide-svelte";
    import { addLorebook, exportLoreBook, importLoreBook } from "../../../ts/process/lorebook";
    import Check from "../../UI/GUI/CheckInput.svelte";
    import NumberInput from "../../UI/GUI/NumberInput.svelte";
    import LoreBookList from "./LoreBookList.svelte";

    let submenu = 0
    export let globalMode = false
</script>

{#if !globalMode}
    <div class="flex w-full rounded-md border border-selected">
        <button on:click={() => {
            submenu = 0
        }} class="p-2 flex-1" class:bg-selected={submenu === 0}>
            <span>{$CurrentCharacter.type === 'group' ? language.group : language.character}</span>
        </button>
        <button on:click={() => {
            submenu = 1
        }} class="p2 flex-1 border-r border-l border-selected" class:bg-selected={submenu === 1}>
            <span>{language.Chat}</span>
        </button>
        <button on:click={() => {
            submenu = 2
        }} class="p-2 flex-1" class:bg-selected={submenu === 2}>
            <span>{language.settings}</span>
        </button>
    </div>
{/if}
{#if submenu !== 2}
    {#if !globalMode}
        <span class="text-textcolor2 mt-2 mb-6 text-sm">{submenu === 0 ? $CurrentCharacter.type === 'group' ? language.groupLoreInfo : language.globalLoreInfo : language.localLoreInfo}</span>
    {/if}
    <LoreBookList bind:globalMode bind:submenu />
{:else}
    {#if $CurrentCharacter.loreSettings}
        <div class="flex items-center mt-4">
            <Check check={false} onChange={() => {
                $CurrentCharacter.loreSettings = undefined
            }}
            name={language.useGlobalSettings}
            />
        </div>
        <div class="flex items-center mt-4">
            <Check bind:check={$CurrentCharacter.loreSettings.recursiveScanning} name={language.recursiveScanning}/>
        </div>
        <div class="flex items-center mt-4">
            <Check bind:check={$CurrentCharacter.loreSettings.fullWordMatching} name={language.fullWordMatching}/>
        </div>
        <span class="text-textcolor mt-4 mb-2">{language.loreBookDepth}</span>
        <NumberInput size="sm" min={0} max={20} bind:value={$CurrentCharacter.loreSettings.scanDepth} />
        <span class="text-textcolor">{language.loreBookToken}</span>
        <NumberInput size="sm" min={0} max={4096} bind:value={$CurrentCharacter.loreSettings.tokenBudget} />
    {:else}
        <div class="flex items-center mt-4">
            <Check check={true} onChange={() => {
                $CurrentCharacter.loreSettings = {
                    tokenBudget: $DataBase.loreBookToken,
                    scanDepth:$DataBase.loreBookDepth,
                    recursiveScanning: false
                }
            }}
            name={language.useGlobalSettings}
            />
        </div>
    {/if}
{/if}
{#if submenu !== 2}

<div class="text-textcolor2 mt-2 flex">
    <button on:click={() => {addLorebook(globalMode ? -1 : submenu)}} class="hover:text-textcolor cursor-pointer">
        <PlusIcon />
    </button>
    <button on:click={() => {
        exportLoreBook(globalMode ? 'sglobal' : submenu === 0 ? 'global' : 'local')
    }} class="hover:text-textcolor ml-1  cursor-pointer">
        <DownloadIcon />
    </button>
    <button on:click={() => {
        importLoreBook(globalMode ? 'sglobal' : submenu === 0 ? 'global' : 'local')
    }} class="hover:text-textcolor ml-2  cursor-pointer">
        <FolderUpIcon />
    </button>
</div>
{/if}
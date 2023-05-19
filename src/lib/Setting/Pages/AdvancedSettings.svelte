<script lang="ts">
    import Check from "src/lib/Others/Check.svelte";
    import { language } from "src/lang";
    import Help from "src/lib/Others/Help.svelte";
    import { DataBase } from "src/ts/database";
    import { alertMd } from "src/ts/alert";
    import { getRequestLog, isTauri } from "src/ts/globalApi";

</script>
<h2 class="text-2xl font-bold mt-2">{language.advancedSettings}</h2>
<span class="text-draculared text-xs mb-2">{language.advancedSettingsWarn}</span>
<span class="text-neutral-200 mt-4 mb-2">{language.loreBookDepth}</span>
<input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="20" bind:value={$DataBase.loreBookDepth}>
<span class="text-neutral-200">{language.loreBookToken}</span>
<input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="4096" bind:value={$DataBase.loreBookToken}>

<span class="text-neutral-200">{language.additionalPrompt}</span>
<input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm"bind:value={$DataBase.additionalPrompt}>

<span class="text-neutral-200">{language.descriptionPrefix}</span>
<input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm"bind:value={$DataBase.descriptionPrefix}>

<span class="text-neutral-200">{language.emotionPrompt}</span>
<input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm"bind:value={$DataBase.emotionPrompt2} placeholder="Leave it blank to use default">

<span class="text-neutral-200">{language.requestretrys}</span>
<input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="20" bind:value={$DataBase.requestRetrys}>

<span class="text-neutral-200">Request Type</span>
<select class="bg-transparent input-text text-gray-200 appearance-none text-sm mb-4" bind:value={$DataBase.requestmet}>
    <option value="normal" class="bg-darkbg appearance-none">Normal</option>
    <option value="proxy" class="bg-darkbg appearance-none">Proxy</option>
    <option value="plain" class="bg-darkbg appearance-none">Plain Fetch</option>
</select>

{#if $DataBase.requestmet === 'proxy'}
    <span class="text-neutral-200">Request Proxy URL</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={$DataBase.requestproxy}>
{/if}
{#if isTauri && $DataBase.requestmet === 'normal'}
    <span class="text-neutral-200">Request Lib</span>
    <select class="bg-transparent input-text text-gray-200 appearance-none text-sm" bind:value={$DataBase.requester}>
        <option value="new" class="bg-darkbg appearance-none">Reqwest</option>
        <option value="old" class="bg-darkbg appearance-none">Tauri</option>
    </select>
{/if}

<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.useSayNothing}/>
    <span>{language.sayNothing}</span>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.showUnrecommended}/>
    <span>{language.showUnrecommended}</span>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.useExperimental}/>
    <span>{language.useExperimental}</span>
</div>
<button
    on:click={async () => {
        alertMd(getRequestLog())
    }}
    class="drop-shadow-lg p-3 border-borderc border-solid mt-6 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm">
    {language.ShowLog}
</button>

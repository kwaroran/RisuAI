<script lang="ts">
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import { language } from "src/lang";
    
    import { DBState } from 'src/ts/stores.svelte';
    import { alertMd } from "src/ts/alert";
    import { getRequestLog, isTauri } from "src/ts/globalApi";
    import NumberInput from "src/lib/UI/GUI/NumberInput.svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import Help from "src/lib/Others/Help.svelte";
    import { installPython } from "src/ts/process/models/local";
    import { Capacitor } from "@capacitor/core";
    import { capStorageInvestigation } from "src/ts/storage/mobileStorage";

    let estaStorage:{
        key:string,
        size:string,
    }[] = $state([])

</script>
<h2 class="text-2xl font-bold mt-2">{language.advancedSettings}</h2>
<span class="text-draculared text-xs mb-2">{language.advancedSettingsWarn}</span>
<span class="text-textcolor mt-4 mb-2">{language.loreBookDepth}</span>
<NumberInput marginBottom={true} size={"sm"} min={0} max={20} bind:value={DBState.db.loreBookDepth}/>
<span class="text-textcolor">{language.loreBookToken}</span>
<NumberInput marginBottom={true} size={"sm"} min={0} max={4096} bind:value={DBState.db.loreBookToken}/>
<span class="text-textcolor">{language.autoContinueMinTokens}</span>
<NumberInput marginBottom={true} size={"sm"} min={0} bind:value={DBState.db.autoContinueMinTokens}/>

<span class="text-textcolor">{language.additionalPrompt}</span>
<TextInput marginBottom={true} size={"sm"} bind:value={DBState.db.additionalPrompt}/>

<span class="text-textcolor">{language.descriptionPrefix}</span>
<TextInput marginBottom={true} size={"sm"} bind:value={DBState.db.descriptionPrefix}/>

<span class="text-textcolor">{language.emotionPrompt} <Help key="emotionPrompt"/></span>
<TextInput marginBottom={true} size={"sm"} bind:value={DBState.db.emotionPrompt2} placeholder="Leave it blank to use default"/>

<span class="text-textcolor">Kei Server URL</span>
<TextInput marginBottom={true} size={"sm"} bind:value={DBState.db.keiServerURL} placeholder="Leave it blank to use default"/>

<span class="text-textcolor">{language.requestretrys} <Help key="requestretrys"/></span>
<NumberInput marginBottom={true} size={"sm"} min={0} max={20} bind:value={DBState.db.requestRetrys}/>

<span class="text-textcolor">{language.genTimes} <Help key="genTimes"/></span>
<NumberInput marginBottom={true} size={"sm"} min={0} max={4096} bind:value={DBState.db.genTime}/>

<span class="text-textcolor mt-4">GPT Vision Quality <Help key="gptVisionQuality"/></span>
<SelectInput bind:value={DBState.db.gptVisionQuality}>
    <OptionInput value="low">Low</OptionInput>
    <OptionInput value="high">High</OptionInput>
</SelectInput>

<span class="text-textcolor mt-4">{language.heightMode}</span>
<SelectInput bind:value={DBState.db.heightMode}>
    <OptionInput value="normal">Normal</OptionInput>
    <OptionInput value="percent">Percent</OptionInput>
    <OptionInput value="vh">VH</OptionInput>
    <OptionInput value="dvh">DVH</OptionInput>
    <OptionInput value="svh">SVH</OptionInput>
    <OptionInput value="lvh">LVH</OptionInput>
</SelectInput>

<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.useSayNothing} name={language.sayNothing}> <Help key="sayNothing"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.showUnrecommended} name={language.showUnrecommended}> <Help key="showUnrecommended"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.imageCompression} name={language.imageCompression}> <Help key="imageCompression"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.useExperimental} name={language.useExperimental}> <Help key="useExperimental"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.forceProxyAsOpenAI} name={language.forceProxyAsOpenAI}> <Help key="forceProxyAsOpenAI"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.autofillRequestUrl} name={language.autoFillRequestURL}> <Help key="autoFillRequestURL"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.autoContinueChat} name={language.autoContinueChat}> <Help key="autoContinueChat"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.removeIncompleteResponse} name={language.removeIncompleteResponse}></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.newOAIHandle} name={language.newOAIHandle}/>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.noWaitForTranslate} name={language.noWaitForTranslate}/>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.allowAllExtentionFiles} name="Allow all in file select"/>
</div>
{#if DBState.db.useExperimental}
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.antiClaudeOverload} name={language.antiClaudeOverload}>
            <Help key="experimental"/><Help key="antiClaudeOverload"/>
        </Check>
    </div>
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.claudeCachingExperimental} name={language.claudeCachingExperimental}>
            <Help key="experimental"/><Help key="claudeCachingExperimental"/>
        </Check>
    </div>
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.putUserOpen} name={language.oaiRandomUser}>
            <Help key="experimental"/><Help key="oaiRandomUser"/>
        </Check>
    </div>
{/if}
{#if DBState.db.showUnrecommended}
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.chainOfThought} name={language.cot}>
            <Help key="customChainOfThought" unrecommended/>
        </Check>
    </div>
{/if}
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.removePunctuationHypa} name={language.removePunctuationHypa}>
        <Help key="removePunctuationHypa"/>
    </Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.enableDevTools} name={language.enableDevTools}>
    </Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.dynamicAssets} name={language.dynamicAssets}>
        <Help key="dynamicAssets"/>
    </Check>
</div>
{#if DBState.db.dynamicAssets}
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.dynamicAssetsEditDisplay} name={language.dynamicAssetsEditDisplay}>
            <Help key="dynamicAssetsEditDisplay"/>
        </Check>
    </div>
{/if}
{#if DBState.db.showUnrecommended}
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.usePlainFetch} name={language.forcePlainFetch}> <Help key="forcePlainFetch" unrecommended/></Check>
    </div>
{/if}
<button
    onclick={async () => {
        alertMd(getRequestLog())
    }}
    class="drop-shadow-lg p-3 border-darkborderc border-solid mt-6 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm">
    {language.ShowLog}
</button>
{#if Capacitor.isNativePlatform()}
    <button
        onclick={async () => {
            estaStorage = await capStorageInvestigation()
        }}
        class="drop-shadow-lg p-3 border-darkborderc border-solid mt-6 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm">
        Investigate Storage
    </button>

    {#if estaStorage.length > 0}
        <div class="mt-4 flex flex-col w-full p-2">
            {#each estaStorage as item}
                <div class="flex p-2 rounded-md items-center justify-between">
                    <span class="text-textcolor">{item.key}</span>
                    <span class="text-textcolor ml-2">{item.size}</span>
                </div>
            {/each}
        </div>
    {/if}
{/if}
{#if DBState.db.tpo}
    <button
        onclick={async () => {
            installPython()
        }}
        class="drop-shadow-lg p-3 border-darkbutton border-solid mt-6 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm">
        Test Python
    </button>
{/if}
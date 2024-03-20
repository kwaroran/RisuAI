<script lang="ts">
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import { language } from "src/lang";
    import { DataBase } from "src/ts/storage/database";
    import { alertMd } from "src/ts/alert";
    import { getRequestLog, isTauri } from "src/ts/storage/globalApi";
    import NumberInput from "src/lib/UI/GUI/NumberInput.svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
  import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
  import Help from "src/lib/Others/Help.svelte";
  import { installPython } from "src/ts/process/models/local";

</script>
<h2 class="text-2xl font-bold mt-2">{language.advancedSettings}</h2>
<span class="text-draculared text-xs mb-2">{language.advancedSettingsWarn}</span>
<span class="text-textcolor mt-4 mb-2">{language.loreBookDepth}</span>
<NumberInput marginBottom={true} size={"sm"} min={0} max={20} bind:value={$DataBase.loreBookDepth}/>
<span class="text-textcolor">{language.loreBookToken}</span>
<NumberInput marginBottom={true} size={"sm"} min={0} max={4096} bind:value={$DataBase.loreBookToken}/>

<span class="text-textcolor">{language.additionalPrompt}</span>
<TextInput marginBottom={true} size={"sm"} bind:value={$DataBase.additionalPrompt}/>

<span class="text-textcolor">{language.descriptionPrefix}</span>
<TextInput marginBottom={true} size={"sm"} bind:value={$DataBase.descriptionPrefix}/>

<span class="text-textcolor">{language.emotionPrompt} <Help key="emotionPrompt"/></span>
<TextInput marginBottom={true} size={"sm"} bind:value={$DataBase.emotionPrompt2} placeholder="Leave it blank to use default"/>

<span class="text-textcolor">Kei Server URL</span>
<TextInput marginBottom={true} size={"sm"} bind:value={$DataBase.keiServerURL} placeholder="Leave it blank to use default"/>

<span class="text-textcolor">{language.requestretrys} <Help key="requestretrys"/></span>
<NumberInput marginBottom={true} size={"sm"} min={0} max={20} bind:value={$DataBase.requestRetrys}/>

<span class="text-textcolor">{language.genTimes} <Help key="genTimes"/></span>
<NumberInput marginBottom={true} size={"sm"} min={0} max={4096} bind:value={$DataBase.genTime}/>

<span class="text-textcolor mt-4">GPT Vision Quality <Help key="gptVisionQuality"/></span>
<SelectInput bind:value={$DataBase.gptVisionQuality}>
    <OptionInput value="low">Low</OptionInput>
    <OptionInput value="high">High</OptionInput>
</SelectInput>

<span class="text-textcolor mt-4">{language.heightMode}</span>
<SelectInput bind:value={$DataBase.heightMode}>
    <OptionInput value="normal">Normal</OptionInput>
    <OptionInput value="percent">Percent</OptionInput>
    <OptionInput value="vh">VH</OptionInput>
    <OptionInput value="dvh">DVH</OptionInput>
    <OptionInput value="svh">SVH</OptionInput>
    <OptionInput value="lvh">LVH</OptionInput>
</SelectInput>

<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.useSayNothing} name={language.sayNothing}> <Help key="sayNothing"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.showUnrecommended} name={language.showUnrecommended}> <Help key="showUnrecommended"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.imageCompression} name={language.imageCompression}> <Help key="imageCompression"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.useExperimental} name={language.useExperimental}> <Help key="useExperimental"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.forceProxyAsOpenAI} name={language.forceProxyAsOpenAI}> <Help key="forceProxyAsOpenAI"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.autofillRequestUrl} name={language.autoFillRequestURL}> <Help key="autoFillRequestURL"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.newOAIHandle} name={language.newOAIHandle}/>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.allowAllExtentionFiles} name="Allow all in file select"/>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.putUserOpen} name={language.oaiRandomUser}>
        <Help key="experimental"/><Help key="oaiRandomUser"/>
    </Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.automark} name={language.nativeAutomark}>
        <Help key="experimental"/>
    </Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.chainOfThought} name={language.cot}>
        <Help key="chainOfThought"/><Help key="experimental"/>
    </Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.removePunctuationHypa} name={language.removePunctuationHypa}>
        <Help key="removePunctuationHypa"/>
    </Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.usePlainFetch} name={language.forcePlainFetch}> <Help key="forcePlainFetch" unrecommended/></Check>
</div>
<div class="flex items-center mt-4">
    <Check check={$DataBase.tpo} name="Alpha DevMode" onChange={() => {
        // access code is "tendo"
        // I just put it on source code so it's not really a secret
        // well, if you are reading this, you are a developer, so you can use this feature
        // this is for testing 2.0 in real environment, but it's not ready yet

        const accessCode = 'tendo'
        $DataBase.tpo = $DataBase.tpo
        if(prompt("Access Code") === accessCode){
            $DataBase.tpo = !$DataBase.tpo
        }
    }}>
        <Help key="experimental"/>
    </Check>
</div>
<button
    on:click={async () => {
        alertMd(getRequestLog())
    }}
    class="drop-shadow-lg p-3 border-borderc border-solid mt-6 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm">
    {language.ShowLog}
</button>
{#if $DataBase.tpo}
    <button
        on:click={async () => {
            installPython()
        }}
        class="drop-shadow-lg p-3 border-borderc border-solid mt-6 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm">
        Test Python
    </button>
{/if}
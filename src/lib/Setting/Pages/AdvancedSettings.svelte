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

<span class="text-textcolor">{language.emotionPrompt}</span>
<TextInput marginBottom={true} size={"sm"} bind:value={$DataBase.emotionPrompt2} placeholder="Leave it blank to use default"/>

<span class="text-textcolor">{language.requestretrys}</span>
<NumberInput marginBottom={true} size={"sm"} min={0} max={20} bind:value={$DataBase.requestRetrys}/>

<span class="text-textcolor">Request Lib</span>
<SelectInput bind:value={$DataBase.requester}>
    <OptionInput value="new">Reqwest</OptionInput>
    <OptionInput value="old">Tauri</OptionInput>
</SelectInput>

<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.useSayNothing} name={language.sayNothing}/>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.showUnrecommended} name={language.showUnrecommended}/>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.imageCompression} name={language.imageCompression}/>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.useExperimental} name={language.useExperimental}/>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.forceProxyAsOpenAI} name={language.forceProxyAsOpenAI}/>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={$DataBase.usePlainFetch} name="Force Plain Fetch"/>
</div>
<button
    on:click={async () => {
        alertMd(getRequestLog())
    }}
    class="drop-shadow-lg p-3 border-borderc border-solid mt-6 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm">
    {language.ShowLog}
</button>

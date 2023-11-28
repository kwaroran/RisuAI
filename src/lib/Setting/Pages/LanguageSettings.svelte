<script lang="ts">
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import { changeLanguage, language } from "src/lang";
    import { DataBase } from "src/ts/storage/database";
    import { sleep } from "src/ts/util";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import { alertNormal } from "src/ts/alert";
    import { downloadFile, isTauri } from "src/ts/storage/globalApi";
    import { languageEnglish } from "src/lang/en";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
    let langChanged = false

</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.language}</h2>

<span class="text-textcolor mt-4">{language.UiLanguage}</span>
<SelectInput className="mt-2" bind:value={$DataBase.language} on:change={async () => {
    if($DataBase.language === 'translang'){
        downloadFile('lang.json', new TextEncoder().encode(JSON.stringify(languageEnglish, null, 4)))
        alertNormal("Downloaded JSON, translate it, and send it to the dev by discord DM and email. I will add it to the next version.")
        $DataBase.language = 'en'
    }
    await sleep(10)
    changeLanguage($DataBase.language)
    langChanged = true
}}>
    <OptionInput value="de" >Deutsch</OptionInput>
    <OptionInput value="en" >English</OptionInput>
    <OptionInput value="ko" >한국어</OptionInput>
    <OptionInput value="cn" >中文</OptionInput>
    <OptionInput value="vi" >Tiếng Việt</OptionInput>
    <OptionInput value="translang" >[Translate in your own language]</OptionInput>
</SelectInput>
{#if langChanged}
    <span class="bg-red-500 text-sm">Close the settings to take effect</span>
{/if}
<span class="text-textcolor mt-4">{language.translatorLanguage}</span>
<SelectInput className="mt-2 mb-4" bind:value={$DataBase.translator}>
    <OptionInput value="" >{language.disabled}</OptionInput>
    <OptionInput value="ko" >Korean</OptionInput>
    <OptionInput value="ru" >Russian</OptionInput>
    <OptionInput value="zh" >Chinese</OptionInput>
    <OptionInput value="ja" >Japanese</OptionInput>
    <OptionInput value="fr" >French</OptionInput>
    <OptionInput value="es" >Spanish</OptionInput>
    <OptionInput value="pt" >Portuguese</OptionInput>
    <OptionInput value="de" >German</OptionInput>
    <OptionInput value="id" >Indonesian</OptionInput>
    <OptionInput value="ms" >Malaysian</OptionInput>
    <OptionInput value="uk" >Ukranian</OptionInput>
</SelectInput>

{#if $DataBase.translator}
    <span class="text-textcolor mt-4">{language.translatorType}</span>
    <SelectInput className="mt-2 mb-4" bind:value={$DataBase.translatorType}>
        <OptionInput value="google" >Google</OptionInput>
        <OptionInput value="deepl" >DeepL</OptionInput>
        <OptionInput value="llm" >Ax. Model</OptionInput>
    </SelectInput>

    {#if $DataBase.translatorType === 'deepl'}
        {#if !isTauri}
            <span class="text-draculared text-xs ml-2">{language.webdeeplwarn}</span>
        {/if}
        <span class="text-textcolor mt-4">{language.deeplKey}</span>
        <TextInput bind:value={$DataBase.deeplOptions.key} />

        <div class="flex items-center mt-2">
            <Check bind:check={$DataBase.deeplOptions.freeApi} name={language.deeplFreeKey}/>
        </div>
    {/if}
    
    {#if $DataBase.translatorType === 'llm'}
        <span class="text-textcolor mt-4">{language.translationPrompt}</span>
        <TextAreaInput bind:value={$DataBase.translatorPrompt} placeholder={"You are a translator. translate the following html or text into {{slot}}. do not output anything other than the translation."}/>
    {/if}


    <div class="flex items-center mt-2">
        <Check bind:check={$DataBase.autoTranslate} name={language.autoTranslation}/>
    </div>
{/if}
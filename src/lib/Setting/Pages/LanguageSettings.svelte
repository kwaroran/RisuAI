<script lang="ts">
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import { changeLanguage, language } from "src/lang";
    import { DataBase } from "src/ts/storage/database";
    import { sleep } from "src/ts/util";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import NumberInput from "src/lib/UI/GUI/NumberInput.svelte";
    import { alertNormal, alertSelect, alertConfirm } from "src/ts/alert";
    import { downloadFile, isTauri } from "src/ts/storage/globalApi";
    import { languageEnglish } from "src/lang/en";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
    import Help from "src/lib/Others/Help.svelte";
    let langChanged = false

</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.language}</h2>

<span class="text-textcolor mt-4">{language.UiLanguage}</span>
<SelectInput className="mt-2" bind:value={$DataBase.language} on:change={async () => {
    if($DataBase.language === 'translang'){

        const j = await alertSelect([
            'Continue Translating Existing Language',
            'Make a new language'
        ])

        if(parseInt(j) === 0){
            const langs = [
                'de',
                'ko',
                'cn',
                'vi',
                'zh-Hant'
            ]
            const lang = parseInt(await alertSelect(langs))
            
            changeLanguage(langs[lang])
            
            downloadFile('lang.json', new TextEncoder().encode(JSON.stringify(language, null, 4)))
            alertNormal("Downloaded JSON, translate it, and send it to the dev by discord DM and email. I will add it to the next version.")
        }
        else{
            downloadFile('lang.json', new TextEncoder().encode(JSON.stringify(languageEnglish, null, 4)))
            alertNormal("Downloaded JSON, translate it, and send it to the dev by discord DM and email. I will add it to the next version.")
        }

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
    <OptionInput value="zh-Hant" >中文(繁體)</OptionInput>
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
    {#if $DataBase.translatorType === 'google'}
        <OptionInput value="zh-TW" >Chinese (Traditional)</OptionInput>
    {/if}
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
        <OptionInput value="deeplX" >DeepL X</OptionInput>
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

    {#if $DataBase.translatorType === 'deeplX'}
        <span class="text-textcolor mt-4" placeholder="http://localhost:1188">{language.deeplXUrl}</span>
        <TextInput bind:value={$DataBase.deeplXOptions.url} />
        
        <span class="text-textcolor mt-4">{language.deeplXToken}</span>
        <TextInput bind:value={$DataBase.deeplXOptions.token} />
    {/if}
    
    {#if $DataBase.translatorType === 'llm'}
        <span class="text-textcolor mt-4">{language.translationResponseSize}</span>
        <NumberInput min={0} max={2048} marginBottom={true} bind:value={$DataBase.translatorMaxResponse}/>
        <TextAreaInput bind:value={$DataBase.translatorPrompt} placeholder={"You are a translator. translate the following html or text into {{slot}}. do not output anything other than the translation."}/>
    {/if}


    <div class="flex items-center mt-2">
        <Check bind:check={$DataBase.autoTranslate} name={language.autoTranslation}/>
    </div>

    <div class="flex items-center mt-4">
        <Check bind:check={$DataBase.combineTranslation} name={language.combineTranslation}>
            <Help key="combineTranslation"/>
        </Check>
    </div>
{/if}
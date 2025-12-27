<script lang="ts">
    import { changeLanguage, language } from "src/lang";
    
    import { DBState } from 'src/ts/stores.svelte';
    import { sleep } from "src/ts/util";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import { alertNormal, alertSelect } from "src/ts/alert";
    import { downloadFile, isTauri } from "src/ts/globalApi.svelte";
    import { languageEnglish } from "src/lang/en";
    import SettingRenderer from "../SettingRenderer.svelte";
    import { 
        deeplSettingsItems, 
        deeplXSettingsItems, 
        llmTranslatorSettingsItems,
        bergamotSettingsItems,
        commonTranslatorSettingsItems,
        llmOnlySettingsItems,
        translatorTypeSettingItem,
        googleSourceLanguageSettingItem,
        translatorLanguageSettingItem,
        uiLanguageOptions
    } from "src/ts/setting/languageSettingsData";

    let langChanged = $state(false)

</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.language}</h2>

<!-- UI Language Select (complex onChange handler) -->
<span class="text-textcolor mt-4">{language.UiLanguage}</span>
<SelectInput className="mt-2" bind:value={DBState.db.language} onchange={async () => {
    if(DBState.db.language === 'translang'){

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

        DBState.db.language = 'en'
    }
    await sleep(10)
    changeLanguage(DBState.db.language)
    langChanged = true
}}>
    {#each uiLanguageOptions as opt}
        <OptionInput value={opt.value}>{opt.label}</OptionInput>
    {/each}
</SelectInput>
{#if langChanged}
    <span class="bg-red-500 text-sm">Close the settings to take effect</span>
{/if}

<!-- Translator Language Select -->
<SettingRenderer items={[translatorLanguageSettingItem]} checkSpacing="mt-4" />

{#if DBState.db.translator}
    <!-- Translator Type Select -->
    <SettingRenderer items={[translatorTypeSettingItem]} checkSpacing="mt-4" />

    <!-- DeepL Settings -->
    {#if DBState.db.translatorType === 'deepl'}
        {#if !isTauri}
            <span class="text-draculared text-xs ml-2 mb-4">{language.webdeeplwarn}</span>
        {/if}
        <SettingRenderer items={deeplSettingsItems} checkSpacing="mt-4" />
    {/if}

    <!-- DeepL X Settings -->
    {#if DBState.db.translatorType === 'deeplX'}
        <SettingRenderer items={deeplXSettingsItems} checkSpacing="mt-4" />
    {/if}
    
    <!-- LLM Translator Settings -->
    {#if DBState.db.translatorType === 'llm'}
        <SettingRenderer items={llmTranslatorSettingsItems} checkSpacing="mt-4" />
    {/if}

    <!-- Google Translator Settings (Source Language) -->
    {#if DBState.db.translatorType === 'google'}
        <SettingRenderer items={[googleSourceLanguageSettingItem]} checkSpacing="mt-4" />
    {/if}

    <!-- Bergamot Settings -->
    {#if DBState.db.translatorType === 'bergamot'}
        <SettingRenderer items={bergamotSettingsItems} checkSpacing="mt-4" />
    {/if}

    <!-- Common Translator Settings -->
    <SettingRenderer items={commonTranslatorSettingsItems} checkSpacing="mt-4" />

    <!-- LLM-only Additional Settings -->
    {#if DBState.db.translatorType === 'llm'}
        <SettingRenderer items={llmOnlySettingsItems} checkSpacing="mt-4" />
    {/if}
{/if}

<script lang="ts">
    import Check from "src/lib/Others/Check.svelte";
import { changeLanguage, language } from "src/lang";
    import { DataBase } from "src/ts/storage/database";
    import { sleep } from "src/ts/util";
    let langChanged = false
</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.language}</h2>

<span class="text-neutral-200 mt-4">{language.UiLanguage}</span>
<select class="bg-transparent input-text mt-2 text-gray-200 appearance-none text-sm" bind:value={$DataBase.language} on:change={async () => {
    await sleep(10)
    changeLanguage($DataBase.language)
    langChanged = true
}}>
    <option value="en" class="bg-darkbg appearance-none">English</option>
    <option value="ko" class="bg-darkbg appearance-none">한국어</option>
    <option value="cn" class="bg-darkbg appearance-none">中文</option>
</select>
{#if langChanged}
    <span class="bg-red-500 text-sm">Close the settings to take effect</span>
{/if}
<span class="text-neutral-200 mt-4">{language.translator}</span>
<select class="bg-transparent input-text mt-2 mb-4 text-gray-200 appearance-none text-sm" bind:value={$DataBase.translator}>
    <option value="" class="bg-darkbg appearance-none">{language.disabled}</option>
    <option value="ko" class="bg-darkbg appearance-none">Korean</option>
    <option value="ru" class="bg-darkbg appearance-none">Russian</option>
    <option value="zh" class="bg-darkbg appearance-none">Chinese</option>
    <option value="ja" class="bg-darkbg appearance-none">Japanese</option>
    <option value="fr" class="bg-darkbg appearance-none">French</option>
    <option value="es" class="bg-darkbg appearance-none">Spanish</option>
    <option value="pt" class="bg-darkbg appearance-none">Portuguese</option>
    <option value="de" class="bg-darkbg appearance-none">German</option>

</select>

{#if $DataBase.translator}
    <div class="flex items-center mt-2">
        <Check bind:check={$DataBase.autoTranslate} />
        <span>{language.autoTranslation}</span>
    </div>
{/if}
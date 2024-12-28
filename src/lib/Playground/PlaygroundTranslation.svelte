
<script lang="ts">
    import { language } from "src/lang";
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import { LLMCacheStorage, runTranslator } from "src/ts/translator/translator";
    import Button from "../UI/GUI/Button.svelte";
    import SelectInput from "../UI/GUI/SelectInput.svelte";
    import { getLanguageCodes } from "src/ts/globalApi.svelte";
    import OptionInput from "../UI/GUI/OptionInput.svelte";


    const userPreferedLang = navigator.language.split('-')[0]

    let r = $state('')
    let sourceLang = $state('en')
    let output = $state('')
    let outputLang = $state(userPreferedLang)
    let loading = $state(false)
</script>



<span>{language.sourceLanguage}</span>
<SelectInput bind:value={sourceLang}>
    {#each getLanguageCodes() as lang}
        <OptionInput value={lang.code}>{lang.name}</OptionInput>
    {/each}
</SelectInput>
<TextAreaInput bind:value={r} />

<span>{language.translatorLanguage}</span>
<SelectInput bind:value={outputLang}>
    {#each getLanguageCodes() as lang}
        <OptionInput value={lang.code}>{lang.name}</OptionInput>
    {/each}
</SelectInput>
<TextAreaInput value={output} />

<Button className="mt-4" onclick={async () => {
    try {
        if(loading){
            return
        }
        loading = true
        output = await runTranslator(r, false, sourceLang, outputLang)   
        loading = false
    } catch (error) {
        console.error(error)
        loading = false
    }
}}>
    {#if loading}
        Loading...
    {:else}
        Translate
    {/if}
</Button>
<Button className="mt-4" onclick={() => {
    LLMCacheStorage.clear()
}}>
    Clear Cache
</Button>
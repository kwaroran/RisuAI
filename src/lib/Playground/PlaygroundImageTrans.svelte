<script lang="ts">
    import { language } from "src/lang";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";

    let selLang = $state("en");
    let prompt = $state("");
</script>


<span class="text-textcolor text-lg mt-4">{language.destinationLanguage}</span>
<TextInput bind:value={selLang} />

<span class="text-textcolor text-lg mt-4">{language.prompt}</span>
<TextAreaInput bind:value={prompt} />

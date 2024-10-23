<script lang="ts">
    import { encode } from "src/ts/tokenizer";
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import { language } from 'src/lang';

    let input = $state("");
    let output = $state("");
    let outputLength = $state(0);
    const onInput = async () => {
        try {
            const tokenized = await encode(input);
            const tokenizedNumArray = Array.from(tokenized)
            outputLength = tokenizedNumArray.length;
            output = JSON.stringify(tokenizedNumArray);
        } catch (e) {
            output = `Error: ${e}`
        }
    }
</script>

<h2 class="text-4xl text-textcolor my-6 font-black relative">{language.tokenizer}</h2>

<span class="text-textcolor text-lg">Input</span>

<TextAreaInput onInput={onInput} bind:value={input} optimaizedInput={false} />

<span class="text-textcolor text-lg">Result</span>

<TextAreaInput value={output} />

<span class="text-textcolor2 text-lg">{outputLength} {language.tokens}</span>

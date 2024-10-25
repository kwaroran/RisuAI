<script lang="ts">
    import { ParseMarkdown } from "src/ts/parser.svelte";
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    let input = $state("");
    let output = $state("");
    const onInput = async () => {
        try {
            output = await ParseMarkdown(input)
        } catch (e) {
            output = `Error: ${e}`
        }
    }
</script>

<h2 class="text-4xl text-textcolor my-6 font-black relative">Full Parser</h2>

<span class="text-textcolor text-lg">Input</span>

<TextAreaInput onInput={onInput} bind:value={input} optimaizedInput={false} />

<span class="text-textcolor text-lg">Output HTML</span>

<TextAreaInput value={output} />
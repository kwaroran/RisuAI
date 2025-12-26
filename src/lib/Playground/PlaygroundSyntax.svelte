<script lang="ts">
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import { risuChatParser } from 'src/ts/parser.svelte';
    import { language } from 'src/lang';
    import { sleep } from 'src/ts/util';
    let input = $state("");
    let output = $state("");
    const onInput = async () => {
        try {
            await sleep(1)
            output = risuChatParser(input, {
                consistantChar: true,
            })
        } catch (e) {
            output = `Error: ${e}`
        }
    }
</script>

<h2 class="text-4xl text-textcolor my-6 font-black relative">{language.syntax}</h2>

<span class="text-textcolor text-lg">Input</span>

<TextAreaInput highlight onInput={onInput} bind:value={input} optimaizedInput={false} />

<span class="text-textcolor text-lg">Result</span>

<TextAreaInput value={output} />
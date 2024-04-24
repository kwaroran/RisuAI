<script lang="ts">
    import { Template } from '@huggingface/jinja';
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
  import { risuChatParser } from 'src/ts/parser';
    let input = "";
    let output = "";
    const onInput = async () => {
        try {
            output = risuChatParser(input, {
                consistantChar: true,
            })
        } catch (e) {
            output = `Error: ${e}`
        }
    }
</script>

<h2 class="text-4xl text-textcolor my-6 font-black relative">Jinja</h2>

<span class="text-textcolor text-lg">Input</span>

<TextAreaInput onInput={onInput} bind:value={input} height="32" />

<span class="text-textcolor text-lg">Result</span>

<TextAreaInput value={output} height="32" />
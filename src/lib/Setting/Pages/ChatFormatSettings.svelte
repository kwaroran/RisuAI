<script lang="ts">
    import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import { DataBase } from "src/ts/storage/database";
    import { language } from "src/lang";
</script>

<span class="text-textcolor">{language.chatFormating}</span>
<SelectInput bind:value={$DataBase.instructChatTemplate}>
    <OptionInput value="chatml">ChatML</OptionInput>
    <OptionInput value="llama3">Llama3</OptionInput>
    <OptionInput value="gpt2">GPT2</OptionInput>
    <OptionInput value="gemma">Gemma</OptionInput>
    <OptionInput value="mistral">Mistral</OptionInput>
    <OptionInput value="llama2">Llama2</OptionInput>
    <OptionInput value="vicuna">Vicuna</OptionInput>
    <OptionInput value="alpaca">Alpaca</OptionInput>
    <OptionInput value="jinja">Custom (Jinja)</OptionInput>
</SelectInput>

{#if $DataBase.instructChatTemplate === 'jinja'}
    <span class="text-textcolor">Jinja Template</span>
    <TextAreaInput fullwidth autocomplete="off" height={"24"} bind:value={$DataBase.JinjaTemplate} />
{/if}
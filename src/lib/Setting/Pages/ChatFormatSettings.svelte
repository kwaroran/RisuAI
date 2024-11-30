<script lang="ts">
    import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    
    import { DBState } from 'src/ts/stores.svelte';
    import { language } from "src/lang";
</script>

<span class="text-textcolor">{language.chatFormating}</span>
<SelectInput bind:value={DBState.db.instructChatTemplate}>
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

{#if DBState.db.instructChatTemplate === 'jinja'}
    <span class="text-textcolor">Jinja Template</span>
    <TextAreaInput fullwidth autocomplete="off" bind:value={DBState.db.JinjaTemplate} />
{/if}
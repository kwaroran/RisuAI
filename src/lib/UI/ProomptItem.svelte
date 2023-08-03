<script lang="ts">
    import type { Proompt } from "src/ts/process/proompt";
    import OptionInput from "./GUI/OptionInput.svelte";
    import TextAreaInput from "./GUI/TextAreaInput.svelte";
    import SelectInput from "./GUI/SelectInput.svelte";
    import { language } from "src/lang";
    import NumberInput from "./GUI/NumberInput.svelte";
    import CheckInput from "./GUI/CheckInput.svelte";
    import { XIcon } from "lucide-svelte";
    export let proompt:Proompt
    export let onRemove:() => void = () => {}
    
</script>

<div class="flex flex-col first:pt-0 first:mt-0 first:border-0 pt-2 mt-2 border-t border-t-selected">
    <span>{language.type}   <button class="float-right" on:click={onRemove}><XIcon /></button></span>
    <SelectInput bind:value={proompt.type} on:change={() => {
        if(proompt.type === 'plain' || proompt.type === 'jailbreak'){
            proompt.text = ""
            proompt.role = "bot"
        }
        if(proompt.type === 'chat'){
            proompt.rangeStart = 0
            proompt.rangeEnd = 'end'
        }
    }} >
        <OptionInput value="plain">{language.formating.plain}</OptionInput>
        <OptionInput value="jailbreak">{language.formating.jailbreak}</OptionInput>
        <OptionInput value="chat">{language.Chat}</OptionInput>
        <OptionInput value="persona">{language.formating.personaPrompt}</OptionInput>
        <OptionInput value="description">{language.formating.description}</OptionInput>
        <OptionInput value="authornote">{language.formating.authorNote}</OptionInput>
        <OptionInput value="lorebook">{language.formating.lorebook}</OptionInput>
    </SelectInput>

    {#if proompt.type === 'plain' || proompt.type === 'jailbreak'}
        <span>{language.type}2</span>
        <SelectInput bind:value={proompt.type2}>
            <OptionInput value="normal">{language.formating.plain}</OptionInput>
            <OptionInput value="main">{language.mainPrompt}</OptionInput>
            <OptionInput value="globalNote">{language.globalNote}</OptionInput>
        </SelectInput>
        <span>{language.prompt}</span>
        <TextAreaInput bind:value={proompt.text} />
        <span>{language.role}</span>
        <SelectInput bind:value={proompt.role}>
            <OptionInput value="user">{language.user}</OptionInput>
            <OptionInput value="bot">{language.character}</OptionInput>
            <OptionInput value="system">{language.systemPrompt}</OptionInput>
        </SelectInput>
    {/if}
    {#if proompt.type === 'chat'}
        <span>{language.rangeStart}</span>
        <NumberInput bind:value={proompt.rangeStart} />
        <span>{language.rangeEnd}</span>
        {#if proompt.rangeEnd === 'end'}
            <CheckInput name={language.untilChatEnd} check={true} onChange={() => {
                if(proompt.type === 'chat'){
                    proompt.rangeEnd = 0
                }
            }} />
        {:else}
            <NumberInput bind:value={proompt.rangeEnd} marginBottom />
            <CheckInput name={language.untilChatEnd} check={false} onChange={() => {
                if(proompt.type === 'chat'){
                    proompt.rangeEnd = 'end'
                }
            }} />
        {/if}
    {/if}
</div>
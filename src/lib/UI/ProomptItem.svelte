<script lang="ts">
    import type { Proompt } from "src/ts/process/proompt";
    import OptionInput from "./GUI/OptionInput.svelte";
    import TextAreaInput from "./GUI/TextAreaInput.svelte";
    import SelectInput from "./GUI/SelectInput.svelte";
    import { language } from "src/lang";
    import NumberInput from "./GUI/NumberInput.svelte";
    import CheckInput from "./GUI/CheckInput.svelte";
    import { ArrowDown, ArrowUp, XIcon } from "lucide-svelte";
  import TextInput from "./GUI/TextInput.svelte";
    export let proompt:Proompt
    export let onRemove:() => void = () => {}
    export let moveUp:() => void = () => {}
    export let moveDown:() => void = () => {}

</script>

<div class="flex flex-col first:mt-0 mt-2 border border-selected p-4 rounded-md bg-darkbg">
    <span class="mb-2">
        <button class="float-right" on:click={onRemove}><XIcon /></button>
        <button class="float-right" on:click={moveDown}><ArrowDown /></button>
        <button class="float-right" on:click={moveUp}><ArrowUp /></button>
    </span>
    <span>{language.type}
    </span>
    <SelectInput bind:value={proompt.type} on:change={() => {
        if(proompt.type === 'plain' || proompt.type === 'jailbreak'){
            proompt.text = ""
            proompt.role = "system"
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
        <span>{language.specialType}</span>
        <SelectInput bind:value={proompt.type2}>
            <OptionInput value="normal">{language.noSpecialType}</OptionInput>
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
    {#if proompt.type === 'persona' || proompt.type === 'description'}
        {#if !proompt.innerFormat}
            <CheckInput name={language.customInnerFormat} check={false} className="mt-2" onChange={() => {
                if(proompt.type === 'persona' || proompt.type === 'description'){
                    proompt.innerFormat = "{{slot}}"
                }
            }} />
        {:else}
            <span>{language.innerFormat}</span>
            <TextAreaInput bind:value={proompt.innerFormat}/>
            <CheckInput name={language.customInnerFormat} check={true} className="mt-2" onChange={() => {
                if(proompt.type === 'persona' || proompt.type === 'description'){
                    proompt.innerFormat = null
                }
            }} />
        {/if}
    {/if}
</div>
<script lang="ts">
    import type { PromptItem, PromptItemChat } from "src/ts/process/prompt";
    import OptionInput from "./GUI/OptionInput.svelte";
    import TextAreaInput from "./GUI/TextAreaInput.svelte";
    import SelectInput from "./GUI/SelectInput.svelte";
    import { language } from "src/lang";
    import NumberInput from "./GUI/NumberInput.svelte";
    import CheckInput from "./GUI/CheckInput.svelte";
    import { ArrowDown, ArrowUp, XIcon } from "lucide-svelte";
    import TextInput from "./GUI/TextInput.svelte";
    import { DataBase } from "src/ts/storage/database";
    export let promptItem:PromptItem
    export let onRemove:() => void = () => {}
    export let moveUp:() => void = () => {}
    export let moveDown:() => void = () => {}

    const chatPromptChange = () => {
        const currentprompt = promptItem as PromptItemChat
        if(currentprompt.rangeStart === -1000){
            currentprompt.rangeStart = 0
            currentprompt.rangeEnd = 'end'
        }else{
            currentprompt.rangeStart = -1000
            currentprompt.rangeEnd = 'end'
        }
        promptItem = currentprompt
    }

</script>

<div class="flex flex-col first:mt-0 mt-2 border border-selected p-4 rounded-md bg-darkbg">
    <span class="mb-2">
        <button class="float-right" on:click={onRemove}><XIcon /></button>
        <button class="float-right" on:click={moveDown}><ArrowDown /></button>
        <button class="float-right" on:click={moveUp}><ArrowUp /></button>
    </span>
    <span>{language.type}
    </span>
    <SelectInput bind:value={promptItem.type} on:change={() => {
        if(promptItem.type === 'plain' || promptItem.type === 'jailbreak' || promptItem.type === 'cot'){
            promptItem.text = ""
            promptItem.role = "system"
        }
        if(promptItem.type === 'chat'){
            promptItem.rangeStart = -1000
            promptItem.rangeEnd = 'end'
        }
    }} >
        <OptionInput value="plain">{language.formating.plain}</OptionInput>
        <OptionInput value="jailbreak">{language.formating.jailbreak}</OptionInput>
        <OptionInput value="chat">{language.Chat}</OptionInput>
        <OptionInput value="persona">{language.formating.personaPrompt}</OptionInput>
        <OptionInput value="description">{language.formating.description}</OptionInput>
        <OptionInput value="authornote">{language.formating.authorNote}</OptionInput>
        <OptionInput value="lorebook">{language.formating.lorebook}</OptionInput>
        <OptionInput value="memory">{language.formating.memory}</OptionInput>
        <OptionInput value="postEverything">{language.formating.postEverything}</OptionInput>
        {#if $DataBase.promptSettings.customChainOfThought}
            <OptionInput value="cot">{language.cot}</OptionInput>
        {/if}
    </SelectInput>

    {#if promptItem.type === 'plain' || promptItem.type === 'jailbreak' || promptItem.type === 'cot'}
        <span>{language.specialType}</span>
        <SelectInput bind:value={promptItem.type2}>
            <OptionInput value="normal">{language.noSpecialType}</OptionInput>
            <OptionInput value="main">{language.mainPrompt}</OptionInput>
            <OptionInput value="globalNote">{language.globalNote}</OptionInput>
        </SelectInput>
        <span>{language.prompt}</span>
        <TextAreaInput highlight bind:value={promptItem.text} />
        <span>{language.role}</span>
        <SelectInput bind:value={promptItem.role}>
            <OptionInput value="user">{language.user}</OptionInput>
            <OptionInput value="bot">{language.character}</OptionInput>
            <OptionInput value="system">{language.systemPrompt}</OptionInput>
        </SelectInput>
    {/if}
    {#if promptItem.type === 'chat'}
        {#if promptItem.rangeStart !== -1000}
            <span>{language.rangeStart}</span>
            <NumberInput bind:value={promptItem.rangeStart} />
            <span>{language.rangeEnd}</span>
            {#if promptItem.rangeEnd === 'end'}
                <NumberInput value={0} marginBottom  disabled/>
                <CheckInput name={language.untilChatEnd} check={true} onChange={() => {
                    if(promptItem.type === 'chat'){
                        promptItem.rangeEnd = 0
                    }
                }} />
            {:else}
                <NumberInput bind:value={promptItem.rangeEnd} marginBottom />
                <CheckInput name={language.untilChatEnd} check={false} onChange={() => {
                    if(promptItem.type === 'chat'){
                        promptItem.rangeEnd = 'end'
                    }
                }} />
            {/if}
            {#if $DataBase.promptSettings.sendChatAsSystem}
                <CheckInput name={language.chatAsOriginalOnSystem} bind:check={promptItem.chatAsOriginalOnSystem}/>
            {/if}
        {/if}
        <CheckInput name={language.advanced} check={promptItem.rangeStart !== -1000} onChange={chatPromptChange} className="my-2"/>
    {/if}
    {#if promptItem.type === 'authornote'}
        <span>{language.defaultPrompt}</span>
        <TextInput bind:value={promptItem.defaultText} />
    {/if}
    {#if promptItem.type === 'persona' || promptItem.type === 'description' || promptItem.type === 'authornote' || promptItem.type === 'memory'}
        {#if !promptItem.innerFormat}
            <CheckInput name={language.customInnerFormat} check={false} className="mt-2" onChange={() => {
                if(promptItem.type === 'persona' || promptItem.type === 'description' || promptItem.type === 'authornote' || promptItem.type === 'memory'){
                    promptItem.innerFormat = "{{slot}}"
                }
            }} />
        {:else}
            <span>{language.innerFormat}</span>
            <TextAreaInput highlight bind:value={promptItem.innerFormat}/>
            <CheckInput name={language.customInnerFormat} check={true} className="mt-2" onChange={() => {
                if(promptItem.type === 'persona' || promptItem.type === 'description' || promptItem.type === 'authornote' || promptItem.type === 'memory'){
                    promptItem.innerFormat = null
                }
            }} />
        {/if}
    {/if}
</div>
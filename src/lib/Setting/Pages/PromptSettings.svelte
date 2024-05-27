<script lang="ts">
    import { ArrowLeft, PlusIcon } from "lucide-svelte";
    import { language } from "src/lang";
    import PromptDataItem from "src/lib/UI/PromptDataItem.svelte";
    import { tokenizePreset, type PromptItem } from "src/ts/process/prompt";
    import { templateCheck } from "src/ts/process/templates/templateCheck";
    import { DataBase } from "src/ts/storage/database";
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import NumberInput from "src/lib/UI/GUI/NumberInput.svelte";
  import Help from "src/lib/Others/Help.svelte";
  import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";

    let sorted = 0
    let opened = 0
    let warns: string[] = []
    export let onGoBack: () => void = () => {}
    let tokens = 0
    let extokens = 0
    executeTokenize($DataBase.promptTemplate)
    let subMenu = 0

    async function executeTokenize(prest: PromptItem[]){
        tokens = await tokenizePreset(prest, true)
        extokens = await tokenizePreset(prest, false)
    }

    $: warns = templateCheck($DataBase)
    $: executeTokenize($DataBase.promptTemplate)
</script>

<h2 class="mb-2 text-2xl font-bold mt-2 items-center flex">
    <button class="mr-2 text-textcolor2 hover:text-textcolor" on:click={onGoBack}>
        <ArrowLeft />
    </button>
    {language.promptTemplate}
</h2>
<div class="flex w-full rounded-md border border-selected">
    <button on:click={() => {
        subMenu = 0
    }} class="p-2 flex-1" class:bg-selected={subMenu === 0}>
        <span>{language.template}</span>
    </button>
    <button on:click={() => {
        subMenu = 1
    }} class="p-2 flex-1" class:bg-selected={subMenu === 1}>
        <span>{language.settings}</span>
    </button>
</div>
{#if warns.length > 0}
    <div class="text-red-500 flex flex-col items-start p-2 rounded-md border-red-500 border">
        <h2 class="text-xl font-bold">Warning</h2>
        <div class="border-b border-b-red-500 mt-1 mb-2 w-full"></div>
        {#each warns as warn}
            <span class="ml-4">{warn}</span>
        {/each}
    </div>
{/if}

{#if subMenu === 0}
    <div class="contain w-full max-w-full mt-4 flex flex-col p-3 rounded-md">
        {#if $DataBase.promptTemplate.length === 0}
                <div class="text-textcolor2">No Format</div>
        {/if}
        {#key sorted}
            {#each $DataBase.promptTemplate as prompt, i}
                <PromptDataItem bind:promptItem={prompt} onRemove={() => {
                    let templates = $DataBase.promptTemplate
                    templates.splice(i, 1)
                    $DataBase.promptTemplate = templates
                }} moveDown={() => {
                    if(i === $DataBase.promptTemplate.length - 1){
                        return
                    }
                    let templates = $DataBase.promptTemplate
                    let temp = templates[i]
                    templates[i] = templates[i + 1]
                    templates[i + 1] = temp
                    $DataBase.promptTemplate = templates
                }} moveUp={() => {
                    if(i === 0){
                        return
                    }
                    let templates = $DataBase.promptTemplate
                    let temp = templates[i]
                    templates[i] = templates[i - 1]
                    templates[i - 1] = temp
                    $DataBase.promptTemplate = templates
                }} />
            {/each}
        {/key}
    </div>

    <button class="font-medium cursor-pointer hover:text-green-500" on:click={() => {
        let value = $DataBase.promptTemplate ?? []
        value.push({
            type: "plain",
            text: "",
            role: "system",
            type2: 'normal'
        })
        $DataBase.promptTemplate = value
    }}><PlusIcon /></button>

    <span class="text-textcolor2 text-sm mt-2">{tokens} {language.fixedTokens}</span>
    <span class="text-textcolor2 mb-6 text-sm mt-2">{extokens} {language.exactTokens}</span>
{:else}
    <span class="text-textcolor mt-4">{language.postEndInnerFormat}</span>
    <TextInput bind:value={$DataBase.promptSettings.postEndInnerFormat}/>

    <Check bind:check={$DataBase.promptSettings.sendChatAsSystem} name={language.sendChatAsSystem} className="mt-4"/>
    <Check bind:check={$DataBase.promptSettings.sendName} name={language.sendName} className="mt-4"/>
    <Check bind:check={$DataBase.promptSettings.utilOverride} name={language.utilOverride} className="mt-4"/>
    {#if $DataBase.showUnrecommended}
        <Check bind:check={$DataBase.promptSettings.customChainOfThought} name={language.customChainOfThought} className="mt-4">
            <Help unrecommended key='customChainOfThought' />
        </Check>
    {/if}
    <span class="text-textcolor mt-4">{language.maxThoughtTagDepth}</span>
    <NumberInput bind:value={$DataBase.promptSettings.maxThoughtTagDepth}/>
    <span class="text-textcolor mt-4">{language.customPromptTemplateToggle} <Help key='customPromptTemplateToggle' /></span>
    <TextAreaInput bind:value={$DataBase.customPromptTemplateToggle}/>
{/if}
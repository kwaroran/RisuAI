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
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";

    let sorted = 0
    let opened = 0
    let warns: string[] = $state([])
    let tokens = $state(0)
    let extokens = $state(0)
    executeTokenize($DataBase.promptTemplate)
  interface Props {
    onGoBack?: () => void;
    mode?: 'independent'|'inline';
    subMenu?: number;
  }

  let { onGoBack = () => {}, mode = 'independent', subMenu = $bindable(0) }: Props = $props();

    async function executeTokenize(prest: PromptItem[]){
        tokens = await tokenizePreset(prest, true)
        extokens = await tokenizePreset(prest, false)
    }

    $effect.pre(() => {
    warns = templateCheck($DataBase)
  });
  $effect.pre(() => {
    executeTokenize($DataBase.promptTemplate)
  });
</script>
{#if mode === 'independent'}
    <h2 class="mb-2 text-2xl font-bold mt-2 items-center flex">
        <button class="mr-2 text-textcolor2 hover:text-textcolor" onclick={onGoBack}>
            <ArrowLeft />
        </button>
        {language.promptTemplate}
    </h2>

    <div class="flex w-full rounded-md border border-selected">
        <button onclick={() => {
            subMenu = 0
        }} class="p-2 flex-1" class:bg-selected={subMenu === 0}>
            <span>{language.template}</span>
        </button>
        <button onclick={() => {
            subMenu = 1
        }} class="p-2 flex-1" class:bg-selected={subMenu === 1}>
            <span>{language.settings}</span>
        </button>
    </div>
{/if}
{#if warns.length > 0 && subMenu === 0}
    <div class="text-red-500 flex flex-col items-start p-2 rounded-md border-red-500 border mt-4">
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
                <PromptDataItem bind:promptItem={$DataBase.promptTemplate[i]} onRemove={() => {
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

    <button class="font-medium cursor-pointer hover:text-green-500" onclick={() => {
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
    <Check bind:check={$DataBase.promptSettings.sendName} name={language.formatGroupInSingle} className="mt-4"/>
    <Check bind:check={$DataBase.promptSettings.utilOverride} name={language.utilOverride} className="mt-4"/>
    <Check bind:check={$DataBase.jsonSchemaEnabled} name={language.enableJsonSchema} className="mt-4"/>
    <Check bind:check={$DataBase.strictJsonSchema} name={language.strictJsonSchema} className="mt-4"/>

    {#if $DataBase.showUnrecommended}
        <Check bind:check={$DataBase.promptSettings.customChainOfThought} name={language.customChainOfThought} className="mt-4">
            <Help unrecommended key='customChainOfThought' />
        </Check>
    {/if}
    <span class="text-textcolor mt-4">{language.maxThoughtTagDepth}</span>
    <NumberInput bind:value={$DataBase.promptSettings.maxThoughtTagDepth}/>
    <span class="text-textcolor mt-4">{language.groupOtherBotRole} <Help key="groupOtherBotRole"/></span>
    <SelectInput bind:value={$DataBase.groupOtherBotRole}>
        <OptionInput value="user">User</OptionInput>
        <OptionInput value="system">System</OptionInput>
        <OptionInput value="assistant">assistant</OptionInput>
    </SelectInput>
    <span class="text-textcolor mt-4">{language.customPromptTemplateToggle} <Help key='customPromptTemplateToggle' /></span>
    <TextAreaInput bind:value={$DataBase.customPromptTemplateToggle}/>
    <span class="text-textcolor mt-4">{language.defaultVariables} <Help key='defaultVariables' /></span>
    <TextAreaInput bind:value={$DataBase.templateDefaultVariables}/>
    <span class="text-textcolor mt-4">{language.groupInnerFormat} <Help key='groupInnerFormat' /></span>
    <TextAreaInput placeholder={`<{{char}}\'s Message>\n{{slot}}\n</{{char}}\'s Message>`} bind:value={$DataBase.groupTemplate}/>
    {#if $DataBase.jsonSchemaEnabled}
        <span class="text-textcolor mt-4">{language.jsonSchema} <Help key='jsonSchema' /></span>
        <TextAreaInput bind:value={$DataBase.jsonSchema}/>
        <span class="text-textcolor mt-4">{language.extractJson} <Help key='extractJson' /></span>
        <TextInput bind:value={$DataBase.extractJson}/>
    {/if}
{/if}
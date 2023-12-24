<script lang="ts">
    import { ArrowLeft, PlusIcon } from "lucide-svelte";
    import { language } from "src/lang";
    import ProomptItem from "src/lib/UI/ProomptItem.svelte";
    import { tokenizePreset, type Proompt } from "src/ts/process/proompt";
    import { templateCheck } from "src/ts/process/templates/templateCheck";
    import { DataBase } from "src/ts/storage/database";
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
  import TextInput from "src/lib/UI/GUI/TextInput.svelte";

    let sorted = 0
    let opened = 0
    let warns: string[] = []
    export let onGoBack: () => void = () => {}
    let tokens = 0
    let extokens = 0
    executeTokenize($DataBase.promptTemplate)
    let subMenu = 0

    async function executeTokenize(prest: Proompt[]){
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
            {#each $DataBase.promptTemplate as proompt, i}
                <ProomptItem bind:proompt={proompt} onRemove={() => {
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

    <!-- <span class="text-textcolor mt-4">{language.assistantPrefill}</span>
    <TextInput bind:value={$DataBase.proomptSettings.assistantPrefill}/> -->
    <span class="text-textcolor mt-4">{language.postEndInnerFormat}</span>
    <TextInput bind:value={$DataBase.proomptSettings.postEndInnerFormat}/>

    <Check bind:check={$DataBase.proomptSettings.sendChatAsSystem} name={language.sendChatAsSystem} className="mt-4"/>
    <!-- <Check bind:check={$DataBase.proomptSettings.sendName} name={language.sendName} className="mt-4"/> -->
    <Check bind:check={$DataBase.proomptSettings.utilOverride} name={language.utilOverride} className="mt-4"/>
{/if}
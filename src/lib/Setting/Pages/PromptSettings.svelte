<script lang="ts">
    import { ArrowLeft, PlusIcon } from "lucide-svelte";
    import { language } from "src/lang";
    import ProomptItem from "src/lib/UI/ProomptItem.svelte";
    import type { Proompt } from "src/ts/process/proompt";
    import { templateCheck } from "src/ts/process/templates/templateCheck";
    import { DataBase } from "src/ts/storage/database";

    let sorted = 0
    let opened = 0
    let warns: string[] = []
    export let onGoBack: () => void = () => {}

    $: warns = templateCheck($DataBase)
</script>

<h2 class="mb-2 text-2xl font-bold mt-2 items-center flex">
    <button class="mr-2 text-textcolor2 hover:text-textcolor" on:click={onGoBack}>
        <ArrowLeft />
    </button>
    {language.promptTemplate}
</h2>
{#if warns.length > 0}
    <div class="text-red-500 flex flex-col items-start p-2 rounded-md border-red-500 border">
        <h2 class="text-xl font-bold">Warning</h2>
        <div class="border-b border-b-red-500 mt-1 mb-2 w-full"></div>
        {#each warns as warn}
            <span class="ml-4">{warn}</span>
        {/each}
    </div>
{/if}
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
        role: "bot",
        type2: 'normal'
    })
    $DataBase.promptTemplate = value
}}><PlusIcon /></button>
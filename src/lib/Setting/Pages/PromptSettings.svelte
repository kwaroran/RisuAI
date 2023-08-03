<script lang="ts">
    import { PlusIcon } from "lucide-svelte";
    import { language } from "src/lang";
    import ProomptItem from "src/lib/UI/ProomptItem.svelte";
    import type { Proompt } from "src/ts/process/proompt";
  import { DataBase } from "src/ts/storage/database";

    let sorted = 0
    let opened = 0

    const onOpen = () => {
        opened += 1
    }
    const onClose = () => {
        opened -= 1
    }

</script>

<h2 class="mb-2 text-2xl font-bold mt-2">{language.prompt}</h2>
<div class="contain w-full max-w-full mt-4 flex flex-col p-3 border-selected border-1 bg-darkbg rounded-md">
    {#if $DataBase.promptTemplate.length === 0}
            <div class="text-textcolor2">No Format</div>
    {/if}
    {#key sorted}
        {#each $DataBase.promptTemplate as proompt, i}
            <ProomptItem bind:proompt={proompt} onRemove={() => {
                let templates = $DataBase.promptTemplate
                templates.splice(i, 1)
                $DataBase.promptTemplate = templates
            }}  />
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
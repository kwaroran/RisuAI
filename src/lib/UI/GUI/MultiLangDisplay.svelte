<script lang="ts">
  import { ParseMarkdown } from "src/ts/parser";
  import { parseMultilangString, toLangName } from "src/ts/util";

    export let value: string
    export let markdown: boolean = false
    let valueObject: {[code:string]:string} = parseMultilangString(value)
    let selectedLang = "en"
    if(valueObject["en"] === undefined){
        selectedLang = "xx"
    }
</script>

<div class="flex flex-col">
    <div class="flex flex-wrap max-w-fit p-1 gap-2">
        {#each Object.keys(valueObject) as lang}
            {#if lang !== 'xx' || Object.keys(valueObject).length === 1}
                <button class="bg-bgcolor py-2 rounded-lg px-4" class:ring-1={selectedLang === lang} on:click|stopPropagation={() => {
                    selectedLang = lang
                }}>{toLangName(lang)}</button>
            {/if}
        {/each}
    </div>
    {#if markdown}
        <div class="ml-2 max-w-full break-words text chat chattext prose prose-invert">
            {#await ParseMarkdown(valueObject[selectedLang]) then md} 
                {@html md}
            {/await}
        </div>
    {:else}
        <div class="ml-2 max-w-full break-words text chat chattext prose prose-invert">
            {valueObject[selectedLang]}
        </div>
    {/if}
</div>
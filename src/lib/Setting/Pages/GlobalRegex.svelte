<script lang="ts">
  import { PlusIcon } from "lucide-svelte";
  import { language } from "src/lang";
  import Help from "src/lib/Others/Help.svelte";
  import RegexData from "src/lib/SideBars/RegexData.svelte";
  import { DataBase } from "src/ts/database";
</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.globalRegexScript} <Help key="regexScript" /></h2>
<table class="contain w-full max-w-full tabler mt-4 flex flex-col p-2 gap-2 border-selected border-1">
    {#if $DataBase.globalscript.length === 0}
            <div class="text-gray-500">No Scripts</div>
    {/if}
    {#each $DataBase.globalscript as customscript, i}
        <RegexData bind:value={$DataBase.globalscript[i]}  onRemove={() => {
            let customscript = $DataBase.globalscript
            customscript.splice(i, 1)
            $DataBase.globalscript = customscript
        }}/>
    {/each}
</table>
<button class="font-medium cursor-pointer hover:text-green-500 mb-2" on:click={() => {
    let script = $DataBase.globalscript
    script.push({
        comment: "",
        in: "",
        out: "",
        type: "editinput"
    })
    $DataBase.globalscript = script
}}><PlusIcon /></button>
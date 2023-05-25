<script lang="ts">
  import { DownloadIcon, FolderUpIcon, PlusIcon } from "lucide-svelte";
  import { language } from "src/lang";
  import Help from "src/lib/Others/Help.svelte";
  import RegexData from "src/lib/SideBars/RegexData.svelte";
  import { DataBase } from "src/ts/database";
  import { exportRegex, importRegex } from "src/ts/process/scripts";
</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.globalRegexScript} <Help key="regexScript" /></h2>
<table class="contain w-full max-w-full tabler mt-4 flex flex-col p-2 gap-2 border-selected border-1 bg-darkbg">
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
<div class="text-gray-500 mt-2 flex gap-2">
    <button class="font-medium cursor-pointer hover:text-green-500" on:click={() => {
        let script = $DataBase.globalscript
        script.push({
            comment: "",
            in: "",
            out: "",
            type: "editinput"
        })
        $DataBase.globalscript = script
    }}><PlusIcon /></button>
    <button class="font-medium cursor-pointer hover:text-green-500" on:click={() => {
        exportRegex()
    }}><DownloadIcon /></button>
    <button class="font-medium cursor-pointer hover:text-green-500" on:click={() => {
        importRegex()
    }}><FolderUpIcon /></button>
</div>
<script lang="ts">
  import { DownloadIcon, FolderUpIcon, PlusIcon } from "lucide-svelte";
  import { language } from "src/lang";
  import Help from "src/lib/Others/Help.svelte";
  import { DataBase } from "src/ts/storage/database";
  import { exportRegex, importRegex } from "src/ts/process/scripts";
  import RegexList from "src/lib/SideBars/Scripts/RegexList.svelte";
</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.globalRegexScript} <Help key="regexScript" /></h2>
<RegexList bind:value={$DataBase.globalscript} />
<div class="text-textcolor2 mt-2 flex gap-2">
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
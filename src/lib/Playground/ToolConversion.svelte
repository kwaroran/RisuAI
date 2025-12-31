<script lang="ts">
    import { language } from "src/lang";
    import Button from "../UI/GUI/Button.svelte";
    import { selectMultipleFile } from "src/ts/util";
    import { detectPromptJSONType, promptConvertion } from "src/ts/process/prompt";

    let files: { name: string, content: string, type:string }[] = $state([])

    const addFile = async () => {
        const selFiles = await selectMultipleFile(['json'])

        for(let i = 0; i < selFiles.length; i++) {
            const file = selFiles[i]
            const text = new TextDecoder().decode(file.data)
            files.push({
                name: file.name,
                content: text,
                type: detectPromptJSONType(text),
            })
        }

        console.log(files)
        files = files

    }
</script>

<h2 class="text-4xl text-textcolor my-6 font-black relative">{language.promptConvertion}</h2>
<span class="text-textcolor2">{language.convertionStep1}</span>

<div class="border border-darkborderc flex flex-col rounded-md p-4 gap-2">
    {#each files as file, i}
        <div class="flex justify-between items-center">
            <div class="flex items-center justify-start">
                {#if file.type !== 'NOTSUPPORTED'}
                    <span class="bg-blue-500 rounded-md text-white mr-2 font-bold px-2 py-1">{file.type}</span>
                {:else}
                    <span class="bg-red-500 rounded-md text-white mr-2 font-bold px-2 py-1">NOTSUPPORTED</span>
                {/if}
                <span>{file.name}</span>
            </div>
            <Button>Delete</Button>
        </div>
    {/each}
    <Button onclick={addFile}>Add</Button>
</div>
<Button className="mt-6" onclick={() => {
    promptConvertion(files)
}}>Run</Button>
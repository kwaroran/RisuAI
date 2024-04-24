<script lang="ts">
    import { language } from "src/lang";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import OptionInput from "../UI/GUI/OptionInput.svelte";
    import SelectInput from "../UI/GUI/SelectInput.svelte";
    import Button from "../UI/GUI/Button.svelte";
    import { HypaProcesser } from "src/ts/process/memory/hypamemory";

    let query = "";
    let model = "MiniLM";
    let data:string[] = [];
    let dataresult:[string, number][] = [];
    let running = false;

    const run = async () => {
        if(running) return;
        running = true;
        const processer = new HypaProcesser(model as any);
        await processer.addText(data);
        console.log(processer.vectors)
        dataresult = await processer.similaritySearchScored(query);
        running = false;
    }
</script>
  
<h2 class="text-4xl text-textcolor my-6 font-black relative">{language.embedding}</h2>

<span class="text-textcolor text-lg">Model</span>
<SelectInput bind:value={model}>
    <OptionInput value="MiniLM">MiniLM L6 v2</OptionInput>
    <OptionInput value="nomic">Nomic Embed Text v1.5</OptionInput>
</SelectInput>

<span class="text-textcolor text-lg">Query</span>
<TextInput bind:value={query} size="lg" fullwidth />

<span class="text-textcolor text-lg mt-6">Data</span>
{#each data as item}
    <TextInput bind:value={item} size="lg" fullwidth marginBottom />
{/each}
<Button styled="outlined" on:click={() => {
    data.push("");
    data = data
}}>+</Button>

<span class="text-textcolor text-lg mt-6">Result</span>
{#if dataresult.length === 0}
    <span class="text-textcolor2 text-lg">No result</span>
{/if}
{#each dataresult as [item, score]}
    <div class="flex justify-between">
        <span>{item}</span>
        <span>{score.toFixed(2)}</span>
    </div>
{/each}

<Button className="mt-6 flex justify-center" size="lg" on:click={() => {
    run()
}}>
    {#if running}
        <div class="loadmove" />
    {:else}
        {language.run?.toLocaleUpperCase()}
    {/if}
</Button>
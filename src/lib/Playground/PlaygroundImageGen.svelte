<script lang="ts">
    import { language } from "src/lang";
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import Button from "../UI/GUI/Button.svelte";
    import { generateAIImage } from "src/ts/process/stableDiff";
    import { createBlankChar } from "src/ts/characters";

    let prompt = $state("");
    let negPrompt = $state("");
    let img = $state("");
    let generating = $state(false)

    const run = async () => {
        console.log('running')
        if(generating){
            return
        }
        generating = true
        const gen = await generateAIImage(prompt, createBlankChar(), negPrompt, 'inlay')
        generating = false
        if(gen){
            img = gen
        }
    }
</script>

<h2 class="text-4xl text-textcolor my-6 font-black relative">{language.imageGeneration}</h2>

<span class="text-textcolor text-lg">Prompt</span>

<TextAreaInput bind:value={prompt} />

<span class="text-textcolor text-lg">Neg. Prompt</span>

<TextAreaInput bind:value={negPrompt} />

{#if img}
    <span class="text-textcolor text-lg">Generated</span>

    <img src={img} class="max-w-full mt-4" alt="Generated"/>

{/if}
<Button className="mt-6" onclick={run}>
    {#if generating}
        <div class="loadmove"></div>
    {:else}
        Generate
    {/if}
</Button>
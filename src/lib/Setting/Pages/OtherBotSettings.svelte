<script lang="ts">
    import Check from "src/lib/Others/Check.svelte";
    import { language } from "src/lang";
    import Help from "src/lib/Others/Help.svelte";
    import { DataBase } from "src/ts/storage/database";
    import { isTauri } from "src/ts/storage/globalApi";

</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.otherBots}</h2>

<span class="text-neutral-200 mt-4 text-lg font-bold">{language.imageGeneration}</span>

<span class="text-neutral-200 mt-2">{language.provider} <Help key="sdProvider"/></span>
<select class="bg-transparent input-text mt-2 mb-4 text-gray-200 appearance-none text-sm" bind:value={$DataBase.sdProvider}>
    <option value="" class="bg-darkbg appearance-none">None</option>
    <option value="webui" class="bg-darkbg appearance-none">Stable Diffusion WebUI</option>
    <!-- TODO -->
    <!-- <option value="runpod" class="bg-darkbg appearance-none">Runpod Serverless</option> -->
</select>

{#if $DataBase.sdProvider === 'webui'}
<span class="text-draculared text-xs mb-2">You must use WebUI with --api flag</span>
    <span class="text-draculared text-xs mb-2">You must use WebUI without agpl license or use unmodified version with agpl license to observe the contents of the agpl license.</span>
    {#if !isTauri}
        <span class="text-draculared text-xs mb-2">You are using web version. you must use ngrok or other tunnels to use your local webui.</span>
    {/if}
    <span class="text-neutral-200 mt-2">WebUI {language.providerURL}</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" placeholder="https://..." bind:value={$DataBase.webUiUrl}>
    <span class="text-neutral-200">Steps</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="100" bind:value={$DataBase.sdSteps}>
    
    <span class="text-neutral-200">CFG Scale</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="20" bind:value={$DataBase.sdCFG}>

    <span class="text-neutral-200">Width</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="2048" bind:value={$DataBase.sdConfig.width}>
    <span class="text-neutral-200">Height</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="2048" bind:value={$DataBase.sdConfig.height}>
    <span class="text-neutral-200">Sampler</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={$DataBase.sdConfig.sampler_name}>
    
    <div class="flex items-center mt-2">
        <Check bind:check={$DataBase.sdConfig.enable_hr} name='Enable Hires'/>
    </div>
    {#if $DataBase.sdConfig.enable_hr === true}
        <span class="text-neutral-200">denoising_strength</span>
        <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="10" bind:value={$DataBase.sdConfig.denoising_strength}>
        <span class="text-neutral-200">hr_scale</span>
        <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="10" bind:value={$DataBase.sdConfig.hr_scale}>
        <span class="text-neutral-200">Upscaler</span>
        <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={$DataBase.sdConfig.hr_upscaler}>
    {/if}
{/if}


<span class="text-neutral-200 mt-4 text-lg font-bold">TTS</span>
<span class="text-neutral-200 mt-2">ElevenLabs API key</span>
<input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={$DataBase.elevenLabKey}>

<span class="text-neutral-200 mt-2">VOICEVOX URL</span>
<input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={$DataBase.voicevoxUrl}>

<span class="text-neutral-200 mt-4 text-lg font-bold">{language.SuperMemory} <Help key="superMemory" /></span>
<span class="text-neutral-200 mt-4">{language.SuperMemory} {language.model}</span>
<select class="bg-transparent input-text mt-2 mb-2 text-gray-200 appearance-none text-sm" bind:value={$DataBase.supaMemoryType}>
    <option value="none" class="bg-darkbg appearance-none">None</option>
    <option value="davinci" class="bg-darkbg appearance-none">OpenAI Davinci</option>
    <option value="curie" class="bg-darkbg appearance-none">OpenAI Curie</option>
    <option value="subModel" class="bg-darkbg appearance-none">{language.submodel} ({language.unrecommended})</option>
</select>
{#if $DataBase.supaMemoryType === 'davinci' || $DataBase.supaMemoryType === 'curie'}
    <span class="text-neutral-200">{language.SuperMemory} OpenAI Key</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={$DataBase.supaMemoryKey}>
{/if}
{#if $DataBase.supaMemoryType !== 'none'}
    <span class="text-neutral-200">{language.SuperMemory} Prompt</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm"bind:value={$DataBase.supaMemoryPrompt} placeholder="recommended to leave it blank to use default">
{/if}
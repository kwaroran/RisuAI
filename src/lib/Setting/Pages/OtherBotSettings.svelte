<script lang="ts">
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import { language } from "src/lang";
    import Help from "src/lib/Others/Help.svelte";
    import { DataBase } from "src/ts/storage/database";
    import { isTauri } from "src/ts/storage/globalApi";
    import NumberInput from "src/lib/UI/GUI/NumberInput.svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";

</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.otherBots}</h2>

<span class="text-textcolor mt-4 text-lg font-bold">{language.imageGeneration}</span>

<span class="text-textcolor mt-2">{language.provider} <Help key="sdProvider"/></span>
<SelectInput className="mt-2 mb-4" bind:value={$DataBase.sdProvider}>
    <OptionInput value="" >None</OptionInput>
    <OptionInput value="webui" >Stable Diffusion WebUI</OptionInput>
    <!-- TODO -->
    <!-- <OptionInput value="runpod" >Runpod Serverless</OptionInput> -->
</SelectInput>

{#if $DataBase.sdProvider === 'webui'}
<span class="text-draculared text-xs mb-2">You must use WebUI with --api flag</span>
    <span class="text-draculared text-xs mb-2">You must use WebUI without agpl license or use unmodified version with agpl license to observe the contents of the agpl license.</span>
    {#if !isTauri}
        <span class="text-draculared text-xs mb-2">You are using web version. you must use ngrok or other tunnels to use your local webui.</span>
    {/if}
    <span class="text-textcolor mt-2">WebUI {language.providerURL}</span>
    <TextInput size="sm" marginBottom placeholder="https://..." bind:value={$DataBase.webUiUrl}/>
    <span class="text-textcolor">Steps</span>
    <NumberInput size="sm" marginBottom min={0} max={100} bind:value={$DataBase.sdSteps}/>
    
    <span class="text-textcolor">CFG Scale</span>
    <NumberInput size="sm" marginBottom min={0} max={20} bind:value={$DataBase.sdCFG}/>

    <span class="text-textcolor">Width</span>
    <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={$DataBase.sdConfig.width}/>
    <span class="text-textcolor">Height</span>
    <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={$DataBase.sdConfig.height}/>
    <span class="text-textcolor">Sampler</span>
    <TextInput size="sm" marginBottom bind:value={$DataBase.sdConfig.sampler_name}/>
    
    <div class="flex items-center mt-2">
        <Check bind:check={$DataBase.sdConfig.enable_hr} name='Enable Hires'/>
    </div>
    {#if $DataBase.sdConfig.enable_hr === true}
        <span class="text-textcolor">denoising_strength</span>
        <NumberInput size="sm" marginBottom  min={0} max={10} bind:value={$DataBase.sdConfig.denoising_strength}/>
        <span class="text-textcolor">hr_scale</span>
        <NumberInput size="sm" marginBottom  min={0} max={10} bind:value={$DataBase.sdConfig.hr_scale}/>
        <span class="text-textcolor">Upscaler</span>
        <TextInput size="sm" marginBottom bind:value={$DataBase.sdConfig.hr_upscaler}/>
    {/if}
{/if}


<span class="text-textcolor mt-4 text-lg font-bold">TTS</span>
<span class="text-textcolor mt-2">ElevenLabs API key</span>
<TextInput size="sm" marginBottom bind:value={$DataBase.elevenLabKey}/>

<span class="text-textcolor mt-2">VOICEVOX URL</span>
<TextInput size="sm" marginBottom bind:value={$DataBase.voicevoxUrl}/>

<span class="text-textcolor mt-4 text-lg font-bold">{language.SuperMemory} <Help key="superMemory" /></span>
<span class="text-textcolor mt-4">{language.SuperMemory} {language.model}</span>
<SelectInput className="mt-2 mb-2" bind:value={$DataBase.supaMemoryType}>
    <OptionInput value="none" >None</OptionInput>
    <OptionInput value="davinci" >OpenAI Davinci</OptionInput>
    <OptionInput value="curie" >OpenAI Curie</OptionInput>
    <OptionInput value="subModel" >{language.submodel} ({language.unrecommended})</OptionInput>
</SelectInput>
{#if $DataBase.supaMemoryType === 'davinci' || $DataBase.supaMemoryType === 'curie'}
    <span class="text-textcolor">{language.SuperMemory} OpenAI Key</span>
    <TextInput size="sm" marginBottom bind:value={$DataBase.supaMemoryKey}/>
{/if}
{#if $DataBase.supaMemoryType !== 'none'}
    <span class="text-textcolor">{language.SuperMemory} Prompt</span>
    <TextInput size="sm" marginBottom bind:value={$DataBase.supaMemoryPrompt} placeholder="recommended to leave it blank to use default"/>
{/if}
{#if $DataBase.hypaMemory}
    <span class="text-textcolor">{language.HypaMemory} Model</span>
    <SelectInput className="mt-2 mb-2" bind:value={$DataBase.hypaModel}>
        <OptionInput value="MiniLM" >MiniLM-L6-v2 (Free / Local)</OptionInput>
        <OptionInput value="ada" >OpenAI Ada (Davinci / Curie Only)</OptionInput>
    </SelectInput>
{/if}
{#if $DataBase.useExperimental}
    <div class="flex">
        <Check bind:check={$DataBase.hypaMemory} name={language.able + ' ' + language.HypaMemory}/> <Help key="experimental" />
    </div>
{/if}
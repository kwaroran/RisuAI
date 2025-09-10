<script lang="ts">
    import { language } from "src/lang";
    import Arcodion from "src/lib/UI/Arcodion.svelte";
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    
    import { DBState } from 'src/ts/stores.svelte';
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import ChatFormatSettings from "./ChatFormatSettings.svelte";

    const openrouterProviders = [
        "AI21",
        "AionLabs",
        "Alibaba",
        "Amazon Bedrock",
        "Anthropic",
        "AtlasCloud",
        "Atoma",
        "Avian",
        "Azure",
        "BaseTen",
        "Cerebras",
        "Chutes",
        "Cloudflare",
        "Cohere",
        "CrofAI",
        "Crusoe",
        "DeepInfra",
        "DeepSeek",
        "Enfer",
        "Featherless",
        "Fireworks",
        "Friendli",
        "GMICloud",
        "Google",
        "Google AI Studio",
        "Groq",
        "Hyperbolic",
        "Inception",
        "InferenceNet",
        "Infermatic",
        "Inflection",
        "InoCloud",
        "Kluster",
        "Lambda",
        "Liquid",
        "Mancer 2",
        "Meta",
        "Minimax",
        "Mistral",
        "Moonshot AI",
        "Morph",
        "NCompass",
        "Nebius",
        "NextBit",
        "Nineteen",
        "Novita",
        "Nvidia",
        "OpenAI",
        "OpenInference",
        "Parasail",
        "Perplexity",
        "Phala",
        "SambaNova",
        "SiliconFlow",
        "Stealth",
        "Switchpoint",
        "Targon",
        "Together",
        "Ubicloud",
        "Venice",
        "WandB",
        "xAI",
        "Z.AI",
    ].sort((a, b) => a.localeCompare(b));
</script>

<Arcodion name="Openrouter Settings" styled>
    <div class="flex items-center mb-4">
        <Check bind:check={DBState.db.openrouterFallback} name={language.openrouterFallback}/>
    </div>
    <div class="flex items-center mb-4">
        <Check bind:check={DBState.db.openrouterMiddleOut} name={language.openrouterMiddleOut}/>
    </div>
    <div class="flex items-center mb-4">
        <Check bind:check={DBState.db.useInstructPrompt} name={language.useInstructPrompt}/>
    </div>
    <span class="mb-2 text-2xl font-bold mt-2">{language.provider}</span>
    <SelectInput bind:value={DBState.db.openrouterProvider}>
        <OptionInput value="">Auto (Default)</OptionInput>
        {#each openrouterProviders as provider}
            <OptionInput value={provider}>{provider}</OptionInput>
        {/each}
    </SelectInput>

    {#if DBState.db.useInstructPrompt}
        <ChatFormatSettings />
    {/if}
</Arcodion>

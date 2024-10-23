<script lang="ts">
    import { language } from "src/lang";
    import Arcodion from "src/lib/UI/Arcodion.svelte";
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import { DBState } from "src/ts/storage/database.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import ChatFormatSettings from "./ChatFormatSettings.svelte";

    const openrouterProviders = [
        "OpenAI",
        "Anthropic",
        "HuggingFace",
        "Google",
        "Mancer",
        "Mancer 2",
        "Together",
        "DeepInfra",
        "Azure",
        "Modal",
        "AnyScale",
        "Replicate",
        "Perplexity",
        "Recursal",
        "Fireworks",
        "Mistral",
        "Groq",
        "Cohere",
        "Lepton",
        "OctoAI",
        "Novita"
    ]
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
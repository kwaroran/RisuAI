<script lang="ts">
    import { language } from "src/lang";
    import Arcodion from "src/lib/UI/Arcodion.svelte";
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    
    import { DBState } from 'src/ts/stores.svelte';
    import ChatFormatSettings from "./ChatFormatSettings.svelte";
    import OpenrouterProviderList from "src/lib/UI/OpenrouterProviderList.svelte";
    import { PlusIcon, TrashIcon } from "@lucide/svelte";

    const openrouterProviders = [
        // An alphabetically separate set of very-dead providers is kept at the top of the list in the docs.
        // These do not appear outside the docs: Anyscale, Cent-ML, HuggingFace ... SF Compute, Together 2, 01.AI
        // As a visual check, AI21 is the topmost provider in the sidebar of https://openrouter.ai/models, thus we want to copy from this point and below.
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

    <Arcodion name={language.openrouterProviderOrder} help="openrouterProviderOrder" styled>
        {#each DBState.db.openrouterProvider.order as model, i}
            <span class="text-textcolor mt-4">
                {language.provider} {i + 1}
            </span>
            <OpenrouterProviderList bind:value={DBState.db.openrouterProvider.order[i]} options={openrouterProviders} />
        {/each}
        <div class="flex gap-2">
            <button class="bg-selected text-white p-2 rounded-md" onclick={() => {
                let value = DBState.db.openrouterProvider.order ?? []
                value.push('')
                DBState.db.openrouterProvider.order = value
        }}><PlusIcon /></button>
            <button class="bg-red-500 text-white p-2 rounded-md" onclick={() => {
                let value = DBState.db.openrouterProvider.order ?? []
                value.pop()
                DBState.db.openrouterProvider.order = value
        }}><TrashIcon /></button>
        </div>
    </Arcodion>

    <Arcodion name={language.openrouterProviderOnly} help="openrouterProviderOnly" styled>
        {#each DBState.db.openrouterProvider.only as model, i}
            <span class="text-textcolor mt-4">
                {language.provider} {i + 1}
            </span>
            <OpenrouterProviderList bind:value={DBState.db.openrouterProvider.only[i]} options={openrouterProviders} />
        {/each}
        <div class="flex gap-2">
            <button class="bg-selected text-white p-2 rounded-md" onclick={() => {
                let value = DBState.db.openrouterProvider.only ?? []
                value.push('')
                DBState.db.openrouterProvider.only = value
        }}><PlusIcon /></button>
            <button class="bg-red-500 text-white p-2 rounded-md" onclick={() => {
                let value = DBState.db.openrouterProvider.only ?? []
                value.pop()
                DBState.db.openrouterProvider.only = value
        }}><TrashIcon /></button>
        </div>
    </Arcodion>

    <Arcodion name={language.openrouterProviderIgnore} help="openrouterProviderIgnore" styled>
        {#each DBState.db.openrouterProvider.ignore as model, i}
            <span class="text-textcolor mt-4">
                {language.provider} {i + 1}
            </span>
            <OpenrouterProviderList bind:value={DBState.db.openrouterProvider.ignore[i]} options={openrouterProviders} />
        {/each}
        <div class="flex gap-2">
            <button class="bg-selected text-white p-2 rounded-md" onclick={() => {
                let value = DBState.db.openrouterProvider.ignore ?? []
                value.push('')
                DBState.db.openrouterProvider.ignore = value
        }}><PlusIcon /></button>
            <button class="bg-red-500 text-white p-2 rounded-md" onclick={() => {
                let value = DBState.db.openrouterProvider.ignore ?? []
                value.pop()
                DBState.db.openrouterProvider.ignore = value
        }}><TrashIcon /></button>
        </div>
    </Arcodion>

    {#if DBState.db.useInstructPrompt}
        <ChatFormatSettings />
    {/if}
</Arcodion>

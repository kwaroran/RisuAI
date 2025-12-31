<script lang="ts">
    import { DBState } from 'src/ts/stores.svelte';
    import { language } from "src/lang";
    import Button from "src/lib/UI/GUI/Button.svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import Arcodion from "src/lib/UI/Arcodion.svelte";
    import { PlusIcon, TrashIcon, ArrowUp, ArrowDown } from "@lucide/svelte";
    import { v4 } from "uuid";

    let openedModels = $state(new Set<string>());
</script>

{#snippet CustomFlagButton(index:number,name:string,flag:number)}
    <Button className="mt-2" onclick={(e) => {
        if(DBState.db.customModels[index].flags.includes(flag)){
            DBState.db.customModels[index].flags = DBState.db.customModels[index].flags.filter((f) => f !== flag)
        }
        else{
            DBState.db.customModels[index].flags.push(flag)
        }
    }} styled={DBState.db.customModels[index].flags.includes(flag) ? 'primary' : 'outlined'}>
        {name}
    </Button>
{/snippet}

<Arcodion styled name={language.customModels} className="overflow-x-auto">
    {#each DBState.db.customModels as model, index (model.id)}
        <div class="flex flex-col mt-2">
            <button class="hover:bg-selected px-6 py-2 text-lg rounded-t-md border-selected border flex justify-between items-center"
                class:bg-selected={openedModels.has(model.id)}
                class:rounded-b-md={!openedModels.has(model.id)}
                onclick={() => {
                    if (openedModels.has(model.id)) {
                        openedModels.delete(model.id)
                    } else {
                        openedModels.add(model.id)
                    }
                    openedModels = new Set(openedModels)
                }}
            >
                <span class="text-left">{model.name ?? "Unnamed"}</span>
                <div class="flex items-center gap-1">
                    <Button size="sm" styled="outlined" onclick={(e) => {
                        e.stopPropagation()
                        if(index === 0) return
                        let models = DBState.db.customModels
                        let temp = models[index]
                        models[index] = models[index - 1]
                        models[index - 1] = temp
                        DBState.db.customModels = models
                    }}>
                        <ArrowUp />
                    </Button>
                    <Button size="sm" styled="outlined" onclick={(e) => {
                        e.stopPropagation()
                        if(index === DBState.db.customModels.length - 1) return
                        let models = DBState.db.customModels
                        let temp = models[index]
                        models[index] = models[index + 1]
                        models[index + 1] = temp
                        DBState.db.customModels = models
                    }}>
                        <ArrowDown />
                    </Button>
                    <Button size="sm" styled="outlined" onclick={(e) => {
                        e.stopPropagation()
                        let models = DBState.db.customModels
                        models.splice(index, 1)
                        DBState.db.customModels = models
                        openedModels.delete(model.id)
                        openedModels = new Set(openedModels)
                    }}>
                        <TrashIcon />
                    </Button>
                </div>
            </button>
            {#if openedModels.has(model.id)}
                <div class="flex flex-col border border-selected p-2 rounded-b-md overflow-x-auto">
            <span class="text-textcolor">{language.name}</span>
            <TextInput size={"sm"} bind:value={DBState.db.customModels[index].name}/>
            <span class="text-textcolor">{language.proxyRequestModel}</span>
            <TextInput size={"sm"} bind:value={DBState.db.customModels[index].internalId}/>
            <span class="text-textcolor">URL</span>
            <TextInput size={"sm"} bind:value={DBState.db.customModels[index].url}/>
            <span class="text-textcolor">{language.tokenizer}</span>
            <SelectInput size={"sm"} value={DBState.db.customModels[index].tokenizer.toString()} onchange={(e) => {
                DBState.db.customModels[index].tokenizer = parseInt(e.currentTarget.value)
            }}>
                <OptionInput value="0">tiktokenCl100kBase</OptionInput>
                <OptionInput value="1">tiktokenO200Base</OptionInput>
                <OptionInput value="2">Mistral</OptionInput>
                <OptionInput value="3">Llama</OptionInput>
                <OptionInput value="4">NovelAI</OptionInput>
                <OptionInput value="5">Claude</OptionInput>
                <OptionInput value="6">NovelList</OptionInput>
                <OptionInput value="7">Llama3</OptionInput>
                <OptionInput value="8">Gemma</OptionInput>
                <OptionInput value="9">GoogleCloud</OptionInput>
                <OptionInput value="10">Cohere</OptionInput>
                <OptionInput value="12">DeepSeek</OptionInput>
            </SelectInput>
            <span class="text-textcolor">{language.format}</span>
            <SelectInput size={"sm"} value={DBState.db.customModels[index].format.toString()} onchange={(e) => {
                DBState.db.customModels[index].format = parseInt(e.currentTarget.value)
            }}>
                <OptionInput value="0">OpenAICompatible</OptionInput>
                <OptionInput value="1">OpenAILegacyInstruct</OptionInput>
                <OptionInput value="2">Anthropic</OptionInput>
                <OptionInput value="3">AnthropicLegacy</OptionInput>
                <OptionInput value="4">Mistral</OptionInput>
                <OptionInput value="5">GoogleCloud</OptionInput>
                <OptionInput value="6">VertexAIGemini</OptionInput>
                <OptionInput value="7">NovelList</OptionInput>
                <OptionInput value="8">Cohere</OptionInput>
                <OptionInput value="9">NovelAI</OptionInput>
                <OptionInput value="11">OobaLegacy</OptionInput>
                <OptionInput value="13">Ooba</OptionInput>
                <OptionInput value="14">Kobold</OptionInput>
                <OptionInput value="17">AWSBedrockClaude</OptionInput>
                <OptionInput value="18">OpenAIResponseAPI</OptionInput>
            </SelectInput>
            <span class="text-textcolor">{language.proxyAPIKey}</span>
            <TextInput size={"sm"} bind:value={DBState.db.customModels[index].key}/>
            <span class="text-textcolor">{language.additionalParams}</span>
            <TextInput size={"sm"} bind:value={DBState.db.customModels[index].params}/>
            <Arcodion styled name={language.flags}>
                {@render CustomFlagButton(index,'hasImageInput', 0)}
                {@render CustomFlagButton(index,'hasImageOutput', 1)}
                {@render CustomFlagButton(index,'hasAudioInput', 2)}
                {@render CustomFlagButton(index,'hasAudioOutput', 3)}
                {@render CustomFlagButton(index,'hasPrefill', 4)}
                {@render CustomFlagButton(index,'hasCache', 5)}
                {@render CustomFlagButton(index,'hasFullSystemPrompt', 6)}
                {@render CustomFlagButton(index,'hasFirstSystemPrompt', 7)}
                {@render CustomFlagButton(index,'hasStreaming', 8)}
                {@render CustomFlagButton(index,'requiresAlternateRole', 9)}
                {@render CustomFlagButton(index,'mustStartWithUserInput', 10)}
                {@render CustomFlagButton(index,'hasVideoInput', 12)}
                {@render CustomFlagButton(index,'OAICompletionTokens', 13)}
                {@render CustomFlagButton(index,'DeveloperRole', 14)}
                {@render CustomFlagButton(index,'geminiThinking', 15)}
                {@render CustomFlagButton(index,'geminiBlockOff', 16)}
                {@render CustomFlagButton(index,'deepSeekPrefix', 17)}
                {@render CustomFlagButton(index,'deepSeekThinkingInput', 18)}
                {@render CustomFlagButton(index,'deepSeekThinkingOutput', 19)}
            </Arcodion>
                </div>
            {/if}
        </div>
    {/each}
    <div class="flex flex-col mt-2">
        <button class="hover:bg-selected px-6 py-2 text-lg rounded-md border-selected border flex justify-center items-center cursor-pointer" onclick={() => {
            DBState.db.customModels.push({
                internalId: "",
                url: "",
                tokenizer: 0,
                format: 0,
                id: 'xcustom:::' + v4(),
                key: "",
                name: "",
                params: "",
                flags: [],
            })
        }}>
            <PlusIcon />
        </button>
    </div>
</Arcodion>

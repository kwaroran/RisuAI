<script lang="ts">
    import { DBState } from 'src/ts/stores.svelte';
    import { language } from "src/lang";
    import Button from "src/lib/UI/GUI/Button.svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import Accordion from "src/lib/UI/Accordion.svelte";
    import { PlusIcon, TrashIcon, ArrowUp, ArrowDown } from "@lucide/svelte";
    import type { LLMFlags, LLMFormat, LLMTokenizer } from "src/ts/model/types";
    import { v4 } from "uuid";

    let openedModels = $state(new Set<string>());

    let { noAccordion }:{
        noAccordion?: boolean,
    } = $props()
</script>

{#snippet CustomFlagButton(index:number,name:string,flag:LLMFlags)}
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

{#snippet mainBody()}
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
            <span class="text-textcolor mt-4">{language.name}</span>
            <TextInput size={"sm"} bind:value={DBState.db.customModels[index].name}/>
            <span class="text-textcolor mt-4">{language.proxyRequestModel}</span>
            <TextInput size={"sm"} bind:value={DBState.db.customModels[index].internalId}/>
            <span class="text-textcolor mt-4">URL</span>
            <TextInput size={"sm"} bind:value={DBState.db.customModels[index].url}/>
            <span class="text-textcolor mt-4">{language.tokenizer}</span>
            <SelectInput size={"sm"} value={DBState.db.customModels[index].tokenizer.toString()} onchange={(e) => {
                DBState.db.customModels[index].tokenizer = parseInt(e.currentTarget.value) as LLMTokenizer
            }}>
                <OptionInput value="0">Unknown</OptionInput>
                <OptionInput value="1">tiktokenCl100kBase</OptionInput>
                <OptionInput value="2">tiktokenO200Base</OptionInput>
                <OptionInput value="3">Mistral</OptionInput>
                <OptionInput value="4">Llama</OptionInput>
                <OptionInput value="5">NovelAI</OptionInput>
                <OptionInput value="6">Claude</OptionInput>
                <OptionInput value="7">NovelList</OptionInput>
                <OptionInput value="8">Llama3</OptionInput>
                <OptionInput value="9">Gemma</OptionInput>
                <OptionInput value="10">GoogleCloud</OptionInput>
                <OptionInput value="11">Cohere</OptionInput>
                <OptionInput value="13">DeepSeek</OptionInput>
                <OptionInput value="14">DeepSeek V4</OptionInput>
                <OptionInput value="15">GLM4</OptionInput>
                <OptionInput value="16">GLM5</OptionInput>
            </SelectInput>
            <span class="text-textcolor">{language.format}</span>
            <SelectInput size={"sm"} value={DBState.db.customModels[index].format.toString()} onchange={(e) => {
                DBState.db.customModels[index].format = parseInt(e.currentTarget.value) as LLMFormat
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
            <TextAreaInput bind:value={DBState.db.customModels[index].params} placeholder={`temperature=0.7
    max_tokens=2000
    reasoning_effort="high"
    header::anthropic-dangerous-direct-browser-access=true
    stop=json::["</s>", "\\n\\n"]
    frequency_penalty={{none}}`}/>
            <Accordion styled name={language.flags}>
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
                {@render CustomFlagButton(index,'noCivilIntegrity', 20)}
                {@render CustomFlagButton(index,'claudeThinking', 21)}
                {@render CustomFlagButton(index,'claudeAdaptiveThinking', 22)}
                {@render CustomFlagButton(index,'claudeXHighEffort', 23)}
                {@render CustomFlagButton(index,'deepSeekThinkingToggle', 24)}
                {@render CustomFlagButton(index,'kimiK3PreservedThinking', 27)}
            </Accordion>
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
    
{/snippet}


{#if noAccordion}
    {@render mainBody()}
{:else}
    <Accordion styled name={language.customModels} className="overflow-x-auto">
        {@render mainBody()}
    </Accordion>

{/if}

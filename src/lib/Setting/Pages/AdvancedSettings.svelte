<script lang="ts">
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import { language } from "src/lang";
    import Button from "src/lib/UI/GUI/Button.svelte";
    import { DBState } from 'src/ts/stores.svelte';
    import { alertMd, alertNormal } from "src/ts/alert";
    import { downloadFile, getRequestLog, isNodeServer, isTauri } from "src/ts/globalApi.svelte";
    import NumberInput from "src/lib/UI/GUI/NumberInput.svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import Help from "src/lib/Others/Help.svelte";
    import { Capacitor } from "@capacitor/core";
    import { capStorageInvestigation } from "src/ts/storage/mobileStorage";
    import Arcodion from "src/lib/UI/Arcodion.svelte";
  import { PlusIcon, TrashIcon, ArrowUp, ArrowDown } from "@lucide/svelte";
  import { v4 } from "uuid";
  import { getDatabase } from "src/ts/storage/database.svelte";

    let estaStorage:{
        key:string,
        size:string,
    }[] = $state([])

    let openedModels = $state(new Set<string>())

    const characterSets = [
        'Latn',
        'Hani',
        'Arab',
        'Deva',
        'Cyrl',
        'Beng',
        'Hira',
        'Kana',
        'Telu',
        'Hang',
        'Taml',
        'Thai',
        'Gujr',
        'Knda',
        'Ethi',
        'Khmr',
        'Grek',
        'Hebr',
    ]

    const characterSetsPreview = {
        'Latn': "ABC",
        'Hani': "汉漢",
        'Arab': "اعب",
        'Deva': "अआइ",
        'Cyrl': "АБВ",
        'Beng': "অআই",
        'Hira': "あい",
        'Kana': "アイ",
        'Telu': "అఆఇ",
        'Hang': "가나다",
        'Taml': "அஆஇ",
        'Thai': "กขค",
        'Gujr': "અઆઇ",
        'Knda': "ಅಆಇ",
        'Ethi': "ሀሁሂ",
        'Khmr': "កខគ",
        'Grek': "ΑΒΓ",
        'Hebr': "אבג",

    }
</script>
<h2 class="text-2xl font-bold mt-2">{language.advancedSettings}</h2>
<span class="text-draculared text-xs mb-2">{language.advancedSettingsWarn}</span>
<span class="text-textcolor mt-4 mb-2">{language.loreBookDepth}</span>
<NumberInput marginBottom={true} size={"sm"} min={0} max={20} bind:value={DBState.db.loreBookDepth}/>
<span class="text-textcolor">{language.loreBookToken}</span>
<NumberInput marginBottom={true} size={"sm"} min={0} max={4096} bind:value={DBState.db.loreBookToken}/>
<span class="text-textcolor">{language.autoContinueMinTokens}</span>
<NumberInput marginBottom={true} size={"sm"} min={0} bind:value={DBState.db.autoContinueMinTokens}/>

<span class="text-textcolor">{language.additionalPrompt} <Help key="additionalPrompt"/></span>
<TextInput marginBottom={true} size={"sm"} bind:value={DBState.db.additionalPrompt}/>

<span class="text-textcolor">{language.descriptionPrefix}</span>
<TextInput marginBottom={true} size={"sm"} bind:value={DBState.db.descriptionPrefix}/>

<span class="text-textcolor">{language.emotionPrompt} <Help key="emotionPrompt"/></span>
<TextInput marginBottom={true} size={"sm"} bind:value={DBState.db.emotionPrompt2} placeholder="Leave it blank to use default"/>

<span class="text-textcolor">Kei Server URL</span>
<TextInput marginBottom={true} size={"sm"} bind:value={DBState.db.keiServerURL} placeholder="Leave it blank to use default"/>

<span class="text-textcolor">{language.presetChain} <Help key="presetChain"/></span>
<TextInput marginBottom={true} size={"sm"} bind:value={DBState.db.presetChain} placeholder="Leave it blank to not use">
</TextInput>

<span class="text-textcolor">{language.requestretrys} <Help key="requestretrys"/></span>
<NumberInput marginBottom={true} size={"sm"} min={0} max={20} bind:value={DBState.db.requestRetrys}/>

<span class="text-textcolor">{language.genTimes} <Help key="genTimes"/></span>
<NumberInput marginBottom={true} size={"sm"} min={0} max={4096} bind:value={DBState.db.genTime}/>

<span class="text-textcolor">{language.assetMaxDifference}</span>
<NumberInput marginBottom={true} size={"sm"} bind:value={DBState.db.assetMaxDifference}/>

<span class="text-textcolor mt-4">Vision Quality <Help key="gptVisionQuality"/></span>
<SelectInput bind:value={DBState.db.gptVisionQuality}>
    <OptionInput value="low">Low</OptionInput>
    <OptionInput value="high">High</OptionInput>
</SelectInput>

<span class="text-textcolor mt-4">{language.heightMode}</span>
<SelectInput bind:value={DBState.db.heightMode}>
    <OptionInput value="normal">Normal</OptionInput>
    <OptionInput value="percent">Percent</OptionInput>
    <OptionInput value="vh">VH</OptionInput>
    <OptionInput value="dvh">DVH</OptionInput>
    <OptionInput value="svh">SVH</OptionInput>
    <OptionInput value="lvh">LVH</OptionInput>
</SelectInput>

{#if !isNodeServer && !isTauri}
    <span class="text-textcolor mt-4">{language.requestLocation}</span>
    <SelectInput bind:value={DBState.db.requestLocation}>
        <OptionInput value="">Default</OptionInput>
        <OptionInput value="eu">EU (GDPR)</OptionInput>
        <OptionInput value="fedramp">US (FedRAMP)</OptionInput>
    </SelectInput>
{/if}

<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.useSayNothing} name={language.sayNothing}> <Help key="sayNothing"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.showUnrecommended} name={language.showUnrecommended}> <Help key="showUnrecommended"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.imageCompression} name={language.imageCompression}> <Help key="imageCompression"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.useExperimental} name={language.useExperimental}> <Help key="useExperimental"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.sourcemapTranslate} name={language.sourcemapTranslate}> <Help key="sourcemapTranslate"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.forceProxyAsOpenAI} name={language.forceProxyAsOpenAI}> <Help key="forceProxyAsOpenAI"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.legacyMediaFindings} name={language.legacyMediaFindings}> <Help key="legacyMediaFindings"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.autofillRequestUrl} name={language.autoFillRequestURL}> <Help key="autoFillRequestURL"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.autoContinueChat} name={language.autoContinueChat}> <Help key="autoContinueChat"/></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.removeIncompleteResponse} name={language.removeIncompleteResponse}></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.newOAIHandle} name={language.newOAIHandle}/>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.noWaitForTranslate} name={language.noWaitForTranslate}/>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.newImageHandlingBeta} name={language.newImageHandlingBeta}/>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.allowAllExtentionFiles} name="Allow all in file select"/>
</div>
{#if DBState.db.useExperimental}
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.putUserOpen} name={language.oaiRandomUser}>
            <Help key="experimental"/><Help key="oaiRandomUser"/>
        </Check>
    </div>
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.googleClaudeTokenizing} name={language.googleCloudTokenization}>
            <Help key="experimental"/>
        </Check>
    </div>
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.automaticCachePoint} name={language.automaticCachePoint}>
            <Help key="automaticCachePoint"/><Help key="experimental"/>
        </Check>
    </div>

    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.chatCompression} name={language.experimentalChatCompression}>
            <Help key="experimentalChatCompressionDesc"/><Help key="experimental"/>
        </Check>
    </div>
{/if}
{#if DBState.db.showUnrecommended}
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.chainOfThought} name={language.cot}>
            <Help key="customChainOfThought" unrecommended/>
        </Check>
    </div>
{/if}
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.removePunctuationHypa} name={language.removePunctuationHypa}>
        <Help key="removePunctuationHypa"/>
    </Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.enableDevTools} name={language.enableDevTools}>
    </Check>
</div>
{#if isNodeServer || isTauri}
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.promptInfoInsideChat} name={language.promptInfoInsideChat}>
            <Help key="promptInfoInsideChatDesc"/>
        </Check>
    </div>
    {#if DBState.db.promptInfoInsideChat}
        <div class="flex items-center mt-4">
            <Check bind:check={DBState.db.promptTextInfoInsideChat} name={language.promptTextInfoInsideChat}>
            </Check>
        </div>
    {/if}
{/if}
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.dynamicAssets} name={language.dynamicAssets}>
        <Help key="dynamicAssets"/>
    </Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.checkCorruption} name={language.checkCorruption}>
    </Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.realmDirectOpen} name={language.realmDirectOpen}>
        <Help key="realmDirectOpen"/>
    </Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.returnCSSError} name={language.returnCSSError}>
    </Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.antiServerOverloads} name={language.antiServerOverload}>
    </Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.claude1HourCaching} name={language.claude1HourCaching}>
    </Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.claudeBatching} name={language.claudeBatching}>
        <Help key="experimental" />
    </Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.personaNote} name={language.personaNote}>
        <Help key="experimental" />
    </Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.rememberToolUsage} name={language.rememberToolUsage}></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.enableBookmark} name={language.bookmark}></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.simplifiedToolUse} name={language.simplifiedToolUse}></Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.useTokenizerCaching} name={language.useTokenizerCaching}>
    </Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.pluginDevelopMode} name={language.pluginDevelopMode}>
    </Check>
</div>
{#if DBState.db.useExperimental}
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.useExperimentalGoogleTranslator} name={"New Google Translate Experimental"}>
            <Help key="unrecommended" unrecommended/>
        </Check>
    </div>
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.claudeRetrivalCaching} name={language.claudeCachingRetrival}>
            <Help key="unrecommended" unrecommended/>
        </Check>
    </div>
{/if}
{#if DBState.db?.account?.useSync}
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.lightningRealmImport} name={"Lightning Realm Import"}>
            <Help key="experimental"/>
        </Check>
    </div>
{/if}
{#if DBState.db.dynamicAssets}
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.dynamicAssetsEditDisplay} name={language.dynamicAssetsEditDisplay}>
            <Help key="dynamicAssetsEditDisplay"/>
        </Check>
    </div>
{/if}
{#if DBState.db.showUnrecommended}
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.usePlainFetch} name={language.forcePlainFetch}> <Help key="forcePlainFetch" unrecommended/></Check>
    </div>
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.showDeprecatedTriggerV1} name={language.showDeprecatedTriggerV1}> <Help key='unrecommended' unrecommended/></Check>
    </div>
{/if}

<Arcodion styled name={language.banCharacterset}>
    {#each characterSets as set}
        <Button styled={DBState.db.banCharacterset.includes(set) ? 'primary' : "outlined"} onclick={(e) => {
            if (DBState.db.banCharacterset.includes(set)) {
                DBState.db.banCharacterset = DBState.db.banCharacterset.filter((item) => item !== set)
            } else {
                DBState.db.banCharacterset.push(set)
            }
        }}>
            {new Intl.DisplayNames([navigator.language,'en'], { type: 'script' }).of(set)} ({characterSetsPreview[set]})
        </Button>
    {/each}
</Arcodion>

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

<Button
    className="mt-4"
    onclick={async () => {
        alertMd(getRequestLog())
    }}
>
    {language.ShowLog}
</Button>
{#if Capacitor.isNativePlatform()}
    <Button
        className="mt-4"
        onclick={async () => {
            estaStorage = await capStorageInvestigation()
        }}
    >
        Investigate Storage
    </Button>

    {#if estaStorage.length > 0}
        <div class="mt-4 flex flex-col w-full p-2">
            {#each estaStorage as item}
                <div class="flex p-2 rounded-md items-center justify-between">
                    <span class="text-textcolor">{item.key}</span>
                    <span class="text-textcolor ml-2">{item.size}</span>
                </div>
            {/each}
        </div>
    {/if}
{/if}
<Button
    className="mt-4"
    onclick={async () => {
        let mdTable = "| Type | Value |\n| --- | --- |\n"
        const s = DBState.db.statics
        for (const key in s) {
            mdTable += `| ${key} | ${s[key]} |\n`
        }
        mdTable += `\n\n<small>${language.staticsDisclaimer}</small>`
        alertMd(mdTable)
    }}
>
Show Statistics
</Button>

<Button
    className="mt-4"
    onclick={async () => {
        const db = safeStructuredClone(getDatabase({
            snapshot: true
        }))

        const keyToRemove = [
            'characters', 'loreBook', 'plugins', 'account', 'personas', 'username', 'userIcon', 'userNote',
            'modules', 'enabledModules', 'botPresets', 'characterOrder', 'webUiUrl', 'characterOrder',
            'hordeConfig', 'novelai', 'koboldURL', 'ooba', 'ainconfig', 'personaPrompt', 'promptTemplate',
            'deeplOptions', 'google', 'customPromptTemplateToggle', 'globalChatVariables', 'comfyConfig',
            'comfyUiUrl', 'translatorPrompt', 'customModels', 'mcpURLs', 'authRefreshes'
        ]
        for(const key in db) {
            if(
                keyToRemove.includes(key) ||
                key.toLowerCase().includes('key') || key.toLowerCase().includes('proxy')
                || key.toLowerCase().includes('hypa')
            ) {
                delete db[key]
            }
        }

        const meta = {
            isTauri: isTauri,
            isNodeServer: isNodeServer,
            protocol: location.protocol,
            userAgent: navigator.userAgent
        }

        const json = JSON.stringify({ ...db, meta }, null, 2)
        await downloadFile('risuai-settings-report.json', new TextEncoder().encode(json))
        await navigator.clipboard.writeText(json)
        alertNormal(language.settingsExported)
        

    }}
>
Export Settings for Bug Report
</Button>

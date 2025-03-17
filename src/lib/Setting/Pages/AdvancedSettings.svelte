<script lang="ts">
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import { language } from "src/lang";
    import Button from "src/lib/UI/GUI/Button.svelte";
    import { DBState } from 'src/ts/stores.svelte';
    import { alertMd } from "src/ts/alert";
    import { getRequestLog, isNodeServer, isTauri } from "src/ts/globalApi.svelte";
    import NumberInput from "src/lib/UI/GUI/NumberInput.svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import Help from "src/lib/Others/Help.svelte";
    import { installPython } from "src/ts/process/models/local";
    import { Capacitor } from "@capacitor/core";
    import { capStorageInvestigation } from "src/ts/storage/mobileStorage";
    import Arcodion from "src/lib/UI/Arcodion.svelte";

    let estaStorage:{
        key:string,
        size:string,
    }[] = $state([])

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

<span class="text-textcolor">{language.additionalPrompt}</span>
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

<span class="text-textcolor mt-4">GPT Vision Quality <Help key="gptVisionQuality"/></span>
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
    <Check bind:check={DBState.db.returnCSSError} name={language.returnCSSError}>
    </Check>
</div>
<div class="flex items-center mt-4">
    <Check bind:check={DBState.db.antiServerOverloads} name={language.antiServerOverload}>
    </Check>
</div>
{#if DBState.db.useExperimental}
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.useExperimentalGoogleTranslator} name={"New Google Translate Experimental"}>
            <Help key="unrecommended" unrecommended/>
        </Check>
    </div>
    <div class="flex items-center mt-4">
        <Check bind:check={DBState.db.doNotChangeSeperateModels} name={language.doNotChangeSeperateModels}>
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
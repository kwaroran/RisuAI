<script lang="ts">
    import { run } from 'svelte/legacy';

    import { encodeMultilangString, languageCodes, parseMultilangString, toLangName } from "src/ts/util";
    import TextAreaInput from "./TextAreaInput.svelte";
    let addingLang = $state(false)
    let selectedLang = $state("en")
    interface Props {
        value: string;
        className?: string;
        onInput?: any;
    }

    let { value = $bindable(), className = "", onInput = () => {} }: Props = $props();
    let valueObject: {[code:string]:string} = $state(parseMultilangString(value))
    const updateValue = () => {
        for(let lang in valueObject){
            if(valueObject[lang] === "" && lang !== selectedLang && lang!=="en" ){
                delete valueObject[lang]
            }
        }
        if(valueObject.xx){
            delete valueObject.xx
        }
        if(valueObject.en === ""){
            valueObject.en = ' '
        }
        valueObject = valueObject // force update
        value = encodeMultilangString(valueObject)
    }
    if(valueObject["en"] === undefined){
        valueObject["en"] = valueObject["xx"]
        delete valueObject["xx"]
        updateValue()
    }
    run(() => {
        valueObject = parseMultilangString(value)
    });
</script>

<div class="flex flex-wrap max-w-fit p-1 gap-2">
    {#each Object.keys(valueObject) as lang}
        {#if lang !== 'xx'}
            <button class="bg-bgcolor py-2 rounded-lg px-4" class:ring-1={selectedLang === lang} onclick={() => {
                selectedLang = lang
                updateValue()
            }}>{toLangName(lang)}</button>
        {/if}
    {/each}
    <button class="text-nowrap bg-bgcolor py-2 rounded-lg px-4" class:ring-1={addingLang} onclick={() => {addingLang = !addingLang}}>+</button>
</div>
{#if addingLang}
    <div class="m-1 p-1 g-2 flex max-w-fit rounded-md border-t-bgcolor flex-wrap gap-1">
        {#each languageCodes as lang}
            {#if toLangName(lang).length !== 2}
                <button class="bg-bgcolor py-2 rounded-lg px-4 text-nowrap" onclick={() => {
                    valueObject[lang] = ""
                    selectedLang = lang
                    addingLang = false
                }}>{toLangName(lang)}</button>
            {/if}
        {/each}
    </div>
{/if}
<TextAreaInput autocomplete="off" bind:value={valueObject[selectedLang]} onInput={() => {
    updateValue()
    onInput()
}} className={className} />
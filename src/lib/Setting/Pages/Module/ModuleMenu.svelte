<script type="ts" lang="ts">
    import { language } from "src/lang";
    import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import LoreBookData from "src/lib/SideBars/LoreBook/LoreBookData.svelte";
    import type { RisuModule } from "src/ts/process/modules";
    import { PlusIcon } from "lucide-svelte";
    import { alertConfirm } from "src/ts/alert";
    import RegexList from "src/lib/SideBars/Scripts/RegexList.svelte";
    import TriggerList from "src/lib/SideBars/Scripts/TriggerList.svelte";


    export let currentModule:RisuModule


    async function toggleLorebook(){
        if(!Array.isArray(currentModule.lorebook)){
            currentModule.lorebook = []
        }
        else if(currentModule.lorebook.length > 0){
            const conf = await alertConfirm(language.confirmRemoveModuleFeature)
            if(conf){
                currentModule.lorebook = undefined
            }
        }
        else{
            currentModule.lorebook = undefined
        }
    }

    async function toggleRegex(){
        if(!Array.isArray(currentModule.regex)){
            currentModule.regex = []
        }
        else if(currentModule.regex.length > 0){
            const conf = await alertConfirm(language.confirmRemoveModuleFeature)
            if(conf){
                currentModule.regex = undefined
            }
        }
        else{
            currentModule.regex = undefined
        }
    }

    async function toggleTrigger(){
        if(!Array.isArray(currentModule.trigger)){
            currentModule.trigger = []
        }
        else if(currentModule.trigger.length > 0){
            const conf = await alertConfirm(language.confirmRemoveModuleFeature)
            if(conf){
                currentModule.trigger = undefined
            }
        }
        else{
            currentModule.trigger = undefined
        }
    }

    function addLorebook(){
        if(Array.isArray(currentModule.lorebook)){
            currentModule.lorebook.push({
                key: '',
                comment: `New Lore`,
                content: '',
                mode: 'normal',
                insertorder: 100,
                alwaysActive: false,
                secondkey: "",
                selective: false
            })

            currentModule.lorebook = currentModule.lorebook
        }
    }

    function addRegex(){
        if(Array.isArray(currentModule.regex)){
            currentModule.regex.push({
                comment: "",
                in: "",
                out: "",
                type: "editinput"
            })

            currentModule.regex = currentModule.regex
        }
    }

    function addTrigger(){
        if(Array.isArray(currentModule.trigger)){
            currentModule.trigger.push({
                conditions: [],
                type: 'start',
                comment: '',
                effect: []
            })

            currentModule.trigger = currentModule.trigger
        }
    }
</script>

<span class="mt-4 text-xl">{language.basicInfo}</span>
<TextInput bind:value={currentModule.name} additionalClass="mt-1" placeholder={language.name}/>
<TextInput bind:value={currentModule.description} additionalClass="mt-1" placeholder={language.description} size="sm"/>
<span class="mt-6 text-xl">{language.moduleContent}</span>
<div class="grid grid-cols-2 border-selected border rounded-md">
    <button class={(!Array.isArray(currentModule.lorebook)) ? 'p-4' : "p-4 bg-selected rounded-tl-md"} on:click={toggleLorebook}>
        {language.loreBook}
    </button>
    <button class={(!Array.isArray(currentModule.regex)) ? 'p-4' : "p-4 bg-selected rounded-tr-md"} on:click={toggleRegex}>
        {language.regexScript}
    </button>
    <button class={(!Array.isArray(currentModule.trigger)) ? 'p-4' : "p-4 bg-selected rounded-tr-md"} on:click={toggleTrigger}>
        {language.triggerScript}
    </button>
    <button class="p-4">
        
    </button>
</div>

{#if (Array.isArray(currentModule.lorebook))}
    <span class="mt-8 text-xl">{language.loreBook}</span>
    <div class="border border-selected p-2 flex flex-col rounded-md mt-2">
        {#each currentModule.lorebook as lore, i}
            <LoreBookData bind:value={currentModule.lorebook[i]} idx={i} onRemove={() => {
                currentModule.lorebook.splice(i, 1)
                currentModule.lorebook = currentModule.lorebook
            }}/>
        {/each}
    </div>
    <button on:click={() => {addLorebook()}} class="hover:text-textcolor cursor-pointer">
        <PlusIcon />
    </button>
{/if}

{#if (Array.isArray(currentModule.regex))}
    <span class="mt-8 text-xl">{language.regexScript}</span>
    <RegexList bind:value={currentModule.regex}/>
    <button on:click={() => {addRegex()}} class="hover:text-textcolor cursor-pointer">
        <PlusIcon />
    </button>
{/if}

{#if (Array.isArray(currentModule.trigger))}
    <span class="mt-8 text-xl">{language.triggerScript}</span>
    <TriggerList bind:value={currentModule.trigger}/>
    <button on:click={() => {addTrigger()}} class="hover:text-textcolor cursor-pointer">
        <PlusIcon />
    </button>
{/if}
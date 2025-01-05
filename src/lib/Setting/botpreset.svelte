<script lang="ts">
    import { alertCardExport, alertConfirm, alertError, alertMd, alertWait } from "../../ts/alert";
    import { language } from "../../lang";
    import { changeToPreset, copyPreset, downloadPreset, importPreset, getDatabase } from "../../ts/storage/database.svelte";
    import { DBState } from 'src/ts/stores.svelte';
    import { CopyIcon, Share2Icon, PencilIcon, FolderUpIcon, PlusIcon, TrashIcon, XIcon, GitCompare } from "lucide-svelte";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import { prebuiltPresets } from "src/ts/process/templates/templates";
    import { ShowRealmFrameStore } from "src/ts/stores.svelte";
    import type { PromptItem, PromptItemPlain, PromptItemChatML, PromptItemTyped, PromptItemAuthorNote, PromptItemChat } from "src/ts/process/prompt.ts";
    import { diffWordsWithSpace, diffLines } from 'diff';

    let editMode = $state(false)
    interface Props {
        close?: any;
    }

    let { close = () => {} }: Props = $props();

    let diffMode = false
    let selectedPrompts: string[] = []
    let selectedDiffPreset = $state(-1)

    function isPromptItemPlain(item: PromptItem): item is PromptItemPlain {
        return (
            item.type === 'plain' || item.type === 'jailbreak' || item.type === 'cot'
        );
    }

    function isPromptItemChatML(item: PromptItem): item is PromptItemChatML {
        return item.type === 'chatML'
    }

    function isPromptItemTyped(item: PromptItem): item is PromptItemTyped {
        return (
            item.type === 'persona' ||
            item.type === 'description' ||
            item.type === 'lorebook' ||
            item.type === 'postEverything' ||
            item.type === 'memory'
        )
    }

    function isPromptItemAuthorNote(item: PromptItem): item is PromptItemAuthorNote {
        return item.type === 'authornote'
    }

    function isPromptItemChat(item: PromptItem): item is PromptItemChat {
        return item.type === 'chat'
    }

    function escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\//g, '&#x2F;')
            .replace(/\\/g, '&#92;')
            .replace(/`/g, '&#96;')
            .replace(/ /g, ' \u200B')
            .replace(/\n/g, '<br>')
    }

    function getPrompt(id: number): string {
        const db = getDatabase()
        const formated = safeStructuredClone(db.botPresets[id].promptTemplate)
        let prompt = ''

        for(let i=0;i<formated.length;i++){
            const item = formated[i]

            switch (true) {
                case isPromptItemPlain(item):{
                    prompt += '## ' + (item.role ?? 'Unknown') + '; ' + item.type + '; ' + item.type2 + '\n'
                    prompt += '\n' + item.text.replaceAll('```', '\\`\\`\\`') + '\n\n'
                    break
                }

                case isPromptItemChatML(item):{
                    prompt += '## ' + item.type + '\n'
                    prompt += '\n' + item.text.replaceAll('```', '\\`\\`\\`') + '\n\n'
                    break
                }

                case isPromptItemTyped(item):{
                    prompt += '## ' + 'system' + '; ' + item.type + '\n'
                    if(item.innerFormat){
                        prompt += '\n' + item.innerFormat.replaceAll('```', '\\`\\`\\`') + '\n\n'
                    }
                    break
                }

                case isPromptItemAuthorNote(item):{
                    prompt += '## ' + 'system' + '; ' + item.type + '\n'
                    if(item.innerFormat){
                        prompt += '\n' + item.innerFormat.replaceAll('```', '\\`\\`\\`') + '\n\n'
                    }
                    break
                }

                case isPromptItemChat(item):{
                    prompt += '## ' + 'chat' + '; ' + item.type + '\n'
                    prompt += '\n' + item.rangeStart + ' - ' + item.rangeEnd + '\n\n'
                    break
                }
            }

        }

        return prompt
    }

    function checkDiff(prompt1: string, prompt2: string): string {
        const lineDiffs = diffLines(prompt1, prompt2)

        let resultHtml = '';

        for (let i = 0; i < lineDiffs.length; i++) {
            const linePart = lineDiffs[i]

            if(linePart.removed){
                const nextPart = lineDiffs[i + 1]
                if(nextPart?.added){
                    resultHtml += `<div style="border-left: 4px solid blue; padding-left: 8px;">${highlightChanges(linePart.value, nextPart.value)}</div>`
                    i++;
                }
                else{
                    resultHtml += `<div style="color: red; background-color: #ffe6e6; border-left: 4px solid red; padding-left: 8px;">${escapeHtml(linePart.value)}</div>`
                }
            }
            else if(linePart.added){
                resultHtml += `<div style="color: green; background-color: #e6ffe6; border-left: 4px solid green; padding-left: 8px;">${escapeHtml(linePart.value)}</div>`
            }
            else{
                resultHtml += `<div>${escapeHtml(linePart.value)}</div>`
            }
        }

        if(lineDiffs.length === 1 && !lineDiffs[0].added && !lineDiffs[0].removed) {
            resultHtml = `<div style="background-color: #4caf50; color: white; padding: 10px 20px; border-radius: 5px; text-align: center;">No differences detected.</div>` + resultHtml
        }
        else{
            resultHtml = `<div style="background-color: #ff9800; color: white; padding: 10px 20px; border-radius: 5px; text-align: center;">Differences detected. Please review the changes.</div>` + resultHtml
        }

        return resultHtml
    }

    function highlightChanges(string1: string, string2: string) {
        const charDiffs = diffWordsWithSpace(string1, string2)

        return charDiffs
            .map(charPart => {
                const escapedText = escapeHtml(charPart.value)

                if (charPart.added) {
                    return `<span style="color: green; background-color: #e6ffe6;">${escapedText}</span>`
                }
                else if(charPart.removed) {
                    return `<span style="color: red; background-color: #ffe6e6;">${escapedText}</span>`
                }
                else{
                    return escapedText
                }
            })
            .join('')
    }
    

    function handleDiffMode(id: number) {
        if (selectedDiffPreset === id) {
            selectedDiffPreset = -1
            selectedPrompts = []
            diffMode = !diffMode
            return
        } else {
            selectedDiffPreset = id
        }

        const prompt = getPrompt(id)

        if(!prompt){
            return
        }
        
        if(!diffMode){
            selectedPrompts = [prompt]
        }
        else if(selectedPrompts.length === 0){
            return
        }
        else{
            alertWait("Loading...")
            const result = checkDiff(selectedPrompts[0], prompt)
            alertMd(result)
            selectedDiffPreset = -1
            selectedPrompts = []
        }

        diffMode = !diffMode
    }

</script>

<div class="absolute w-full h-full z-40 bg-black bg-opacity-50 flex justify-center items-center">
    <div class="bg-darkbg p-4 break-any rounded-md flex flex-col max-w-3xl w-124 max-h-full overflow-y-auto">
        <div class="flex items-center text-textcolor mb-4">
            <h2 class="mt-0 mb-0">{language.presets}</h2>
            <div class="flex-grow flex justify-end">
                <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer items-center" onclick={close}>
                    <XIcon size={24}/>
                </button>
            </div>
        </div>
        {#each DBState.db.botPresets as preset, i}
            <button onclick={() => {
                if(!editMode){
                    changeToPreset(i)
                    close()
                }
            }} class="flex items-center text-textcolor border-t-1 border-solid border-0 border-darkborderc p-2 cursor-pointer" class:bg-selected={i === DBState.db.botPresetsId}>
                {#if editMode}
                    <TextInput bind:value={DBState.db.botPresets[i].name} placeholder="string" padding={false}/>
                {:else}
                    {#if i < 9}
                        <span class="w-2 text-center mr-2 text-textcolor2">{i + 1}</span>
                    {/if}
                    {#if preset.image}
                        <img src={preset.image} alt="icon" class="mr-2 min-w-6 min-h-6 w-6 h-6 rounded-md" decoding="async"/>

                    {/if}
                    <span>{preset.name}</span>
                {/if}
                <div class="flex-grow flex justify-end">
                    <div class="{selectedDiffPreset === i ? 'text-green-500' : 'text-textcolor2 hover:text-green-500'} cursor-pointer mr-2" role="button" tabindex="0" onclick={(e) => {
                        e.stopPropagation()
                        handleDiffMode(i)
                    }} onkeydown={(e) => {
                        if(e.key === 'Enter'){
                            e.currentTarget.click()
                        }
                    }}>
                        <GitCompare size={18}/>
                    </div>
                    <div class="text-textcolor2 hover:text-green-500 cursor-pointer mr-2" role="button" tabindex="0" onclick={(e) => {
                        e.stopPropagation()
                        copyPreset(i)
                    }} onkeydown={(e) => {
                        if(e.key === 'Enter'){
                            e.currentTarget.click()
                        }
                    }}>
                        <CopyIcon size={18}/>
                    </div>
                    <div class="text-textcolor2 hover:text-green-500 cursor-pointer mr-2" role="button" tabindex="0" onclick={async (e) => {
                        e.stopPropagation()
                        const data = await alertCardExport('preset')
                        console.log(data.type)
                        if(data.type === ''){
                            downloadPreset(i, 'risupreset')
                        }
                        if(data.type === 'realm'){
                            $ShowRealmFrameStore = `preset:${i}`
                        }
                    }} onkeydown={(e) => {
                        if(e.key === 'Enter'){
                            e.currentTarget.click()
                        }
                    }}>

                        <Share2Icon size={18} />
                    </div>
                    <div class="text-textcolor2 hover:text-green-500 cursor-pointer" role="button" tabindex="0" onclick={async (e) => {
                        e.stopPropagation()
                        if(DBState.db.botPresets.length === 1){
                            alertError(language.errors.onlyOneChat)
                            return
                        }
                        const d = await alertConfirm(`${language.removeConfirm}${preset.name}`)
                        if(d){
                            changeToPreset(0)
                            let botPresets = DBState.db.botPresets
                            botPresets.splice(i, 1)
                            DBState.db.botPresets = botPresets
                            changeToPreset(0, false)
                        }
                    }} onkeydown={(e) => {
                        if(e.key === 'Enter'){
                            e.currentTarget.click()
                        }
                    }}>
                        <TrashIcon size={18}/>
                    </div>
                </div>
            </button>
        {/each}
        <div class="flex mt-2 items-center">
            <button class="text-textcolor2 hover:text-green-500 cursor-pointer mr-1" onclick={() => {
                let botPresets = DBState.db.botPresets
                let newPreset = safeStructuredClone(prebuiltPresets.OAI2)
                newPreset.name = `New Preset`
                botPresets.push(newPreset)

                DBState.db.botPresets = botPresets
            }}>
                <PlusIcon/>
            </button>
            <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer" onclick={() => {
                importPreset()
            }}>
                <FolderUpIcon size={18}/>
            </button>
            <button class="text-textcolor2 hover:text-green-500 cursor-pointer" onclick={() => {
                editMode = !editMode
            }}>
                <PencilIcon size={18}/>
            </button>
        </div>
        <span class="text-textcolor2 text-sm">{language.quickPreset}</span>
    </div>
</div>

<style>
    .break-any{
        word-break: normal;
        overflow-wrap: anywhere;
    }
</style>
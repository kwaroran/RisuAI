<script lang="ts">
    import { alertCardExport, alertConfirm, alertError, alertMd, alertWait } from "../../ts/alert";
    import { language } from "../../lang";
    import { changeToPreset, copyPreset, downloadPreset, importPreset, getDatabase } from "../../ts/storage/database.svelte";
    import { DBState } from 'src/ts/stores.svelte';
    import { CopyIcon, Share2Icon, PencilIcon, HardDriveUploadIcon, PlusIcon, TrashIcon, XIcon, GitCompare } from "@lucide/svelte";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import { prebuiltPresets } from "src/ts/process/templates/templates";
    import { ShowRealmFrameStore } from "src/ts/stores.svelte";
    import type { PromptItem, PromptItemPlain, PromptItemChatML, PromptItemTyped, PromptItemAuthorNote, PromptItemChat } from "src/ts/process/prompt.ts";

    let editMode = $state(false)
    let isDragging = $state(false)
    let dragOverIndex = $state(-1)

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

    function movePreset(fromIndex: number, toIndex: number) {
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= DBState.db.botPresets.length || toIndex > DBState.db.botPresets.length) return;

        let botPresets = [...DBState.db.botPresets];
        const movedItem = botPresets.splice(fromIndex, 1)[0];
        if (!movedItem) return;

        const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
        botPresets.splice(adjustedToIndex, 0, movedItem);

        const currentId = DBState.db.botPresetsId;
        if (currentId === fromIndex) {
            DBState.db.botPresetsId = adjustedToIndex;
        } else if (fromIndex < currentId && adjustedToIndex >= currentId) {
            DBState.db.botPresetsId = currentId - 1;
        } else if (fromIndex > currentId && adjustedToIndex <= currentId) {
            DBState.db.botPresetsId = currentId + 1;
        }

        DBState.db.botPresets = botPresets;
    }

    function handlePresetDrop(targetIndex: number, e) {
        e.preventDefault();
        e.stopPropagation();
        const data = e.dataTransfer?.getData('text');
        if (data === 'preset') {
            const sourceIndex = parseInt(e.dataTransfer?.getData('presetIndex') || '0');
            movePreset(sourceIndex, targetIndex);
        }
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

    async function checkDiff(prompt1: string, prompt2: string): Promise<void> {
        const { diffLines } = await import('diff')
        const lineDiffs = diffLines(prompt1, prompt2)

        let resultHtml = '';
        let changedLines: string[] = []
        let modifiedLinesCount = 0
        let addedLinesCount = 0
        let removedLinesCount = 0

        const forTooltip = (line: string, idx: number): string => {
            return line.replace('<div', `<div class="prompt-diff-hover" data-line-id="prompt-diff-line-${idx}"`)
        }

        const withId = (line: string, idx: number): string => {
            return line.replace('<div', `<div id="prompt-diff-line-${idx}"`)
        }

        for (let i = 0; i < lineDiffs.length; i++) {
            const linePart = lineDiffs[i]

            if(linePart.removed){
                const nextPart = lineDiffs[i + 1]
                if(nextPart?.added){
                    const modifiedLine = `<div style="border-left: 4px solid blue; padding-left: 8px;">${await highlightChanges(linePart.value, nextPart.value)}</div>`
                    changedLines.push(forTooltip(modifiedLine, i))
                    resultHtml += withId(modifiedLine, i)
                    i++;
                    modifiedLinesCount += 1
                }
                else{
                    const removedLine = `<div style="color: red; background-color: #ffe6e6; border-left: 4px solid red; padding-left: 8px;">${escapeHtml(linePart.value)}</div>`
                    changedLines.push(forTooltip(removedLine, i))
                    resultHtml += withId(removedLine, i)
                    removedLinesCount += 1
                }
            }
            else if(linePart.added){
                const addedLine = `<div style="color: green; background-color: #e6ffe6; border-left: 4px solid green; padding-left: 8px;">${escapeHtml(linePart.value)}</div>`
                changedLines.push(forTooltip(addedLine, i))
                resultHtml += withId(addedLine, i)
                addedLinesCount += 1
            }
            else{
                resultHtml += `<div>${escapeHtml(linePart.value)}</div>`
            }
        }

        if(lineDiffs.length === 1 && !lineDiffs[0].added && !lineDiffs[0].removed) {
            const userResponse = await alertConfirm('The two prompts are identical. Would you like to review the content?')

            if(userResponse){
                resultHtml = `<div style="background-color: #4caf50; color: white; padding: 10px 20px; border-radius: 5px; text-align: center;">No differences detected.</div>` + resultHtml
                alertMd(resultHtml)
            }
        }
        else{
            const modifiedCount = `<span style="border-left: 4px solid blue; padding-left: 8px; padding-right: 8px;">${modifiedLinesCount}</span>`
            const addedCount = `<span style="border-left: 4px solid green; padding-left: 8px; padding-right: 8px;">${addedLinesCount}</span>`
            const removedCount = `<span style="border-left: 4px solid red; padding-left: 8px; padding-right: 8px;">${removedLinesCount}</span>`
            const diffCounts = `<div>${modifiedCount}${addedCount}${removedCount}</div>`

            resultHtml = `<div id="differences-detected" style="background-color: #ff9800; color: white; padding: 10px 20px; border-radius: 5px; text-align: center;">Differences detected. Please review the changes.${diffCounts}</div>` + resultHtml
            alertMd(resultHtml)

            setTimeout(() => {
                const differencesDetected = document.querySelector('#differences-detected');
                if (differencesDetected) {
                    differencesTooltip(changedLines)
                }
            }, 0)
        }
    }

    async function highlightChanges(string1: string, string2: string) {
        const { diffWordsWithSpace } = await import('diff')
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

    function differencesTooltip(changedLines: string[]) {
        const differencesDetected = document.querySelector('#differences-detected')
        if(!differencesDetected){
            return
        }

        const tooltip = document.createElement('div')
        tooltip.id = 'diff-tooltip'
        tooltip.style.display = 'none'
        tooltip.style.position = 'absolute'
        tooltip.style.backgroundColor = '#282a36'
        tooltip.style.padding = '10px'
        tooltip.style.borderRadius = '5px'
        tooltip.style.boxShadow = '0px 5px 5px rgba(0, 0, 0, 1)'
        tooltip.style.maxWidth = '500px'
        tooltip.style.overflowY = 'auto'
        tooltip.style.maxHeight = '300px'
        tooltip.style.textAlign = 'initial'

        differencesDetected.appendChild(tooltip)

        differencesDetected.addEventListener('mouseenter', () => {
            const tooltipContent = !changedLines.length ? '' : `<div><strong>Changed Lines</strong></div>
                <div>${changedLines.join('<br>')}</div>`

            tooltip.innerHTML = tooltipContent;
            tooltip.style.display = 'block'
        })

        tooltip.addEventListener('click', (e) => {
            const target = (e.target as HTMLElement).closest('.prompt-diff-hover')
            const lineId = target?.getAttribute('data-line-id')
            if(!lineId){
                return
            }

            const targetElement = document.getElementById(lineId)
            if(!targetElement){
                return
            }

            targetElement.classList.add('prompt-diff-highlight')
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })

            setTimeout(() => {
                targetElement.classList.remove('prompt-diff-highlight')
            }, 1000)
        })

        differencesDetected.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none'
        })
    }
    

    async function handleDiffMode(id: number) {
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
            await checkDiff(selectedPrompts[0], prompt)

            selectedDiffPreset = -1
            selectedPrompts = []
        }

        diffMode = !diffMode
    }

</script>

<div class="absolute w-full h-full z-40 bg-black/50 flex justify-center items-center">
    <div class="bg-darkbg p-4 break-any rounded-md flex flex-col max-w-3xl w-124 max-h-full overflow-y-auto">
        <div class="flex items-center text-textcolor mb-4">
            <h2 class="mt-0 mb-0">{language.presets}</h2>
            <div class="grow flex justify-end">
                <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer items-center" onclick={close}>
                    <XIcon size={24}/>
                </button>
            </div>
        </div>
        {#each DBState.db.botPresets as preset, i}
            <div class="w-full transition-all duration-200"
                class:h-0.5={!isDragging || dragOverIndex !== i}
                class:h-1={isDragging && dragOverIndex === i}
                class:bg-blue-500={isDragging && dragOverIndex === i}
                class:shadow-lg={isDragging && dragOverIndex === i}
                class:hover:bg-gray-600={!isDragging}
                role="listitem"
                ondragover={(e) => {
                    e.preventDefault()
                    dragOverIndex = i
                }}
                ondragleave={(e) => {
                    dragOverIndex = -1
                }}
                ondrop={(e) => {
                    handlePresetDrop(i, e)
                    dragOverIndex = -1
                }}>
            </div>
            
            <button onclick={() => {
                if(!editMode){
                    changeToPreset(i)
                    close()
                }
            }} 
            class="flex items-center text-textcolor border-t-1 border-solid border-0 border-darkborderc p-2 cursor-pointer" 
            class:bg-selected={i === DBState.db.botPresetsId}
            class:draggable-preset={!editMode}
            draggable={!editMode ? "true" : "false"}
            ondragstart={(e) => {
                if (editMode) {
                    e.preventDefault()
                    return
                }
                isDragging = true
                e.dataTransfer?.setData('text', 'preset')
                e.dataTransfer?.setData('presetIndex', i.toString())

                const dragElement = document.createElement('div')
                dragElement.textContent = preset?.name || 'Unnamed Preset'
                dragElement.className = 'absolute -top-96 -left-96 px-4 py-2 bg-darkbg text-textcolor2 rounded-sm text-sm whitespace-nowrap shadow-lg pointer-events-none z-50'
                document.body.appendChild(dragElement)
                e.dataTransfer?.setDragImage(dragElement, 10, 10)

                setTimeout(() => {
                    document.body.removeChild(dragElement)
                }, 0)
            }}
            ondragend={(e) => {
                isDragging = false
                dragOverIndex = -1
            }}
            ondragover={(e) => {
                e.preventDefault()
                const rect = e.currentTarget.getBoundingClientRect()
                const mouseY = e.clientY
                const elementCenter = rect.top + rect.height / 2

                if (mouseY < elementCenter) {
                    dragOverIndex = i
                } else {
                    dragOverIndex = i + 1
                }
            }}
            ondrop={(e) => {
                handlePresetDrop(dragOverIndex, e)
                dragOverIndex = -1
            }}>
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
                <div class="grow flex justify-end">
                    {#if DBState.db.showPromptComparison}
                        <div class="{selectedDiffPreset === i ? 'text-green-500' : 'text-textcolor2 hover:text-green-500'} cursor-pointer mr-2" role="button" tabindex="0" onclick={(e) => {
                            e.stopPropagation()
                            handleDiffMode(i)
                        }} onkeydown={(e) => {
                            if(e.key === 'Enter' && e.currentTarget instanceof HTMLElement){
                                e.currentTarget.click()
                            }
                        }}>
                            <GitCompare size={18}/>
                        </div>
                    {/if}
                    <div class="text-textcolor2 hover:text-green-500 cursor-pointer mr-2" role="button" tabindex="0" onclick={(e) => {
                        e.stopPropagation()
                        copyPreset(i)
                    }} onkeydown={(e) => {
                        if(e.key === 'Enter' && e.currentTarget instanceof HTMLElement){
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
                        if(e.key === 'Enter' && e.currentTarget instanceof HTMLElement){
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
                        if(e.key === 'Enter' && e.currentTarget instanceof HTMLElement){
                            e.currentTarget.click()
                        }
                    }}>
                        <TrashIcon size={18}/>
                    </div>
                </div>
            </button>
        {/each}

        <div class="w-full transition-all duration-200"
            class:h-0.5={!isDragging || dragOverIndex !== DBState.db.botPresets.length}
            class:h-1={isDragging && dragOverIndex === DBState.db.botPresets.length}
            class:bg-blue-500={isDragging && dragOverIndex === DBState.db.botPresets.length}
            class:shadow-lg={isDragging && dragOverIndex === DBState.db.botPresets.length}
            class:hover:bg-gray-600={!isDragging}
            role="listitem"
            ondragover={(e) => {
                e.preventDefault()
                dragOverIndex = DBState.db.botPresets.length
            }}
            ondragleave={(e) => {
                dragOverIndex = -1
            }}
            ondrop={(e) => {
                handlePresetDrop(DBState.db.botPresets.length, e)
                dragOverIndex = -1
            }}>
        </div>
        
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
                <HardDriveUploadIcon size={18}/>
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

    :global(.prompt-diff-hover){
        border-radius: 8px;
        box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    :global(.prompt-diff-hover:hover){
        transform: translateY(-4px);
        box-shadow: 0px 8px 12px rgba(0, 0, 0, 0.2);
    }

    :global(.prompt-diff-highlight){
        background-color: yellow !important;
    }

    /* Drag and drop styles */
    .draggable-preset:hover {
        cursor: grab;
    }

    .draggable-preset:active {
        cursor: grabbing;
    }

    .h-0\.5 {
        min-height: 2px;
        height: 2px;
    }

    .h-1 {
        min-height: 4px;
        height: 4px;
    }
</style>
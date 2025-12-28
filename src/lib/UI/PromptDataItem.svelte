<script lang="ts">
    import type { PromptItem, PromptItemChat } from "src/ts/process/prompt";
    import OptionInput from "./GUI/OptionInput.svelte";
    import TextAreaInput from "./GUI/TextAreaInput.svelte";
    import SelectInput from "./GUI/SelectInput.svelte";
    import { language } from "src/lang";
    import NumberInput from "./GUI/NumberInput.svelte";
    import CheckInput from "./GUI/CheckInput.svelte";
    import { ArrowDown, ArrowUp, XIcon } from "@lucide/svelte";
    import TextInput from "./GUI/TextInput.svelte";
    import { DBState } from 'src/ts/stores.svelte';
    
    interface Props {
        promptItem: PromptItem;
        onRemove?: () => void;
        moveUp?: () => void;
        moveDown?: () => void;
        onDrop?: () => void;
        isDragging?: boolean;
        isOpened?: boolean;
        draggedIndex?: number;
        dragOverIndex?: number;
        openedItemIndices?: Set<number>;
        currentIndex?: number;
        displayIndex?: number;
    }

    let {
        promptItem = $bindable(),
        onRemove = () => {},
        moveUp = () => {},
        moveDown = () => {},
        onDrop = () => {},
        isDragging = false,
        isOpened = false,
        draggedIndex = $bindable(-1),
        dragOverIndex = $bindable(-1),
        openedItemIndices = $bindable(new Set<number>()),
        currentIndex = -1,
        displayIndex = -1
    }: Props = $props();

    const chatPromptChange = () => {
        const currentprompt = promptItem as PromptItemChat
        if(currentprompt.rangeStart === -1000){
            currentprompt.rangeStart = 0
            currentprompt.rangeEnd = 'end'
        }else{
            currentprompt.rangeStart = -1000
            currentprompt.rangeEnd = 'end'
        }
        promptItem = currentprompt
    }

    function getName(promptItem:PromptItem){

        if(promptItem.name){
            return promptItem.name
        }

        if(promptItem.type === 'plain'){
            return language.formating.plain
        }
        if(promptItem.type === 'jailbreak'){
            return language.formating.jailbreak
        }
        if(promptItem.type === 'chat'){
            return language.Chat
        }
        if(promptItem.type === 'persona'){
            return language.formating.personaPrompt
        }
        if(promptItem.type === 'description'){
            return language.formating.description
        }
        if(promptItem.type === 'authornote'){
            return language.formating.authorNote
        }
        if(promptItem.type === 'lorebook'){
            return language.formating.lorebook
        }
        if(promptItem.type === 'memory'){
            return language.formating.memory
        }
        if(promptItem.type === 'postEverything'){
            return language.formating.postEverything
        }
        if(promptItem.type === 'cot'){
            return language.cot
        }
        if(promptItem.type === 'chatML'){
            return 'ChatML'
        }
        return ""
    }

    function replacePrompt(prompt:PromptItem){
        if(JSON.stringify(promptItem) === JSON.stringify(prompt)){
            return
        }

        const ind = DBState.db.promptTemplate.findIndex((item, index) => {
            return JSON.stringify(item) === JSON.stringify(prompt)
        })

        if(ind !== -1){
            DBState.db.promptTemplate.splice(ind, 1)
        }
        const myInd = DBState.db.promptTemplate.findIndex((item, index) => {
            return JSON.stringify(item) === JSON.stringify(promptItem)
        })
        DBState.db.promptTemplate.splice(myInd, 0, prompt)

    }

</script>

<div class="first:mt-0 w-full h-2" role="doc-pagebreak"
    ondrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        const data = e.dataTransfer.getData('text')
        if(data === 'prompt'){
            onDrop()
        }
    }}
    ondragover={(e) => {
        e.preventDefault()
    }}
    draggable="true"
    ondragstart={(e) => {
        e.dataTransfer.setData('text', 'prompt')
        e.dataTransfer.setData('prompt', JSON.stringify(promptItem))
    }}>

</div>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="flex flex-col border border-selected p-4 rounded-md bg-darkbg transition-all duration-200"
    class:opacity-50={isDragging}
    class:scale-95={isDragging}

    ondragover={(e) => {
        e.preventDefault()
        if(draggedIndex === -1 || draggedIndex === currentIndex) {
            return
        }

        const rect = e.currentTarget.getBoundingClientRect()
        const mouseY = e.clientY
        const elementCenter = rect.top + rect.height / 2

        if (mouseY < elementCenter) {
            dragOverIndex = currentIndex
        } else {
            dragOverIndex = currentIndex + 1
        }
    }}
    ondrop={(e) => {
        e.preventDefault()
        const data = e.dataTransfer.getData('text')
        if(data === 'prompt'){
            onDrop()
        }
    }}
>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        class="flex items-center w-full"
        draggable="true"
        style:cursor="grab"
        ondragstart={(e) => {
            draggedIndex = currentIndex
            e.dataTransfer.setData('text', 'prompt')
            e.dataTransfer.setData('prompt', JSON.stringify(promptItem))

            const dragElement = document.createElement('div')
            dragElement.textContent = getName(promptItem)
            dragElement.className = 'absolute -top-96 -left-96 px-4 py-2 bg-darkbg text-textcolor2 rounded-sm text-sm whitespace-nowrap shadow-lg pointer-events-none z-50'
            document.body.appendChild(dragElement)
            e.dataTransfer?.setDragImage(dragElement, 10, 10)

            setTimeout(() => {
                document.body.removeChild(dragElement)
            }, 0)
        }}
        ondragend={(e) => {
            draggedIndex = -1
            dragOverIndex = -1
        }}
        onclick={() => {
            const newIndices = new Set(openedItemIndices)
            if (isOpened) {
                newIndices.delete(currentIndex)
            } else {
                newIndices.add(currentIndex)
            }
            openedItemIndices = newIndices
        }}
    >
        <span>{getName(promptItem)}</span>
        <div class="flex flex-1 justify-end">
            <button onclick={(e) => {
                e.stopPropagation()
                onRemove()
            }}><XIcon /></button>
            <button onclick={(e) => {
                e.stopPropagation()
                moveDown()
            }}><ArrowDown /></button>
            <button onclick={(e) => {
                e.stopPropagation()
                moveUp()
            }}><ArrowUp /></button>
        </div>
    </div>
    {#if isOpened}

    
        <span class="mt-6">{language.name}</span>
        <TextInput bind:value={promptItem.name} />
        <span class="mt-2">{language.type} </span>
        <SelectInput bind:value={promptItem.type} onchange={() => {
            if(promptItem.type === 'plain' || promptItem.type === 'jailbreak' || promptItem.type === 'cot'){
                promptItem.text = ""
                promptItem.role = "system"
            }
            if(promptItem.type === 'cache'){
                promptItem.depth = 1
                promptItem.role = 'all'
            }
            if(promptItem.type === 'chat'){
                promptItem.rangeStart = -1000
                promptItem.rangeEnd = 'end'
            }
        }} >
            <OptionInput value="plain">{language.formating.plain}</OptionInput>
            <OptionInput value="jailbreak">{language.formating.jailbreak}</OptionInput>
            <OptionInput value="chat">{language.Chat}</OptionInput>
            <OptionInput value="persona">{language.formating.personaPrompt}</OptionInput>
            <OptionInput value="description">{language.formating.description}</OptionInput>
            <OptionInput value="authornote">{language.formating.authorNote}</OptionInput>
            <OptionInput value="lorebook">{language.formating.lorebook}</OptionInput>
            <OptionInput value="memory">{language.formating.memory}</OptionInput>
            <OptionInput value="postEverything">{language.formating.postEverything}</OptionInput>
            <OptionInput value="chatML">{"chatML"}</OptionInput>
            <OptionInput value="cache">{language.cachePoint}</OptionInput>

            {#if DBState.db.promptSettings.customChainOfThought}
                <OptionInput value="cot">{language.cot}</OptionInput>
            {/if}
        </SelectInput>

        {#if promptItem.type === 'plain' || promptItem.type === 'jailbreak' || promptItem.type === 'cot'}
            <span>{language.specialType}</span>
            <SelectInput bind:value={promptItem.type2}>
                <OptionInput value="normal">{language.noSpecialType}</OptionInput>
                <OptionInput value="main">{language.mainPrompt}</OptionInput>
                <OptionInput value="globalNote">{language.globalNote}</OptionInput>
            </SelectInput>
            <span>{language.prompt}</span>
            <TextAreaInput highlight bind:value={promptItem.text} />
            <span>{language.role}</span>
            <SelectInput bind:value={promptItem.role}>
                <OptionInput value="user">{language.user}</OptionInput>
                <OptionInput value="bot">{language.character}</OptionInput>
                <OptionInput value="system">{language.systemPrompt}</OptionInput>
            </SelectInput>
        {/if}
        {#if promptItem.type === 'chatML'}
            <span>{language.prompt}</span>
            <TextAreaInput highlight bind:value={promptItem.text} />
        {/if}
        {#if promptItem.type === 'cache'}
            <span>{language.depth}</span>
            <NumberInput bind:value={promptItem.depth} />
            <span>{language.role}</span>
            <SelectInput bind:value={promptItem.role}>
                <OptionInput value="all">{language.all}</OptionInput>
                <OptionInput value="user">{language.user}</OptionInput>
                <OptionInput value="bot">{language.character}</OptionInput>
                <OptionInput value="system">{language.systemPrompt}</OptionInput>
            </SelectInput>
        {/if}
        {#if promptItem.type === 'chat'}
            {#if promptItem.rangeStart !== -1000}
                <span>{language.rangeStart}</span>
                <NumberInput bind:value={promptItem.rangeStart} />
                <span>{language.rangeEnd}</span>
                {#if promptItem.rangeEnd === 'end'}
                    <NumberInput value={0} marginBottom  disabled/>
                    <CheckInput name={language.untilChatEnd} check={true} onChange={() => {
                        if(promptItem.type === 'chat'){
                            promptItem.rangeEnd = 0
                        }
                    }} />
                {:else}
                    <NumberInput bind:value={promptItem.rangeEnd} marginBottom />
                    <CheckInput name={language.untilChatEnd} check={false} onChange={() => {
                        if(promptItem.type === 'chat'){
                            promptItem.rangeEnd = 'end'
                        }
                    }} />
                {/if}
                {#if DBState.db.promptSettings.sendChatAsSystem}
                    <CheckInput name={language.chatAsOriginalOnSystem} bind:check={promptItem.chatAsOriginalOnSystem}/>
                {/if}
            {/if}
            <CheckInput name={language.advanced} check={promptItem.rangeStart !== -1000} onChange={chatPromptChange} className="my-2"/>
        {/if}
        {#if promptItem.type === 'authornote'}
            <span>{language.defaultPrompt}</span>
            <TextInput bind:value={promptItem.defaultText} />
        {/if}
        {#if promptItem.type === 'persona' || promptItem.type === 'description' || promptItem.type === 'authornote' || promptItem.type === 'memory'}
            {#if !promptItem.innerFormat}
                <CheckInput name={language.customInnerFormat} check={false} className="mt-2" onChange={() => {
                    if(promptItem.type === 'persona' || promptItem.type === 'description' || promptItem.type === 'authornote' || promptItem.type === 'memory'){
                        promptItem.innerFormat = "{{slot}}"
                    }
                }} />
            {:else}
                <span>{language.innerFormat}</span>
                <TextAreaInput highlight bind:value={promptItem.innerFormat}/>
                <CheckInput name={language.customInnerFormat} check={true} className="mt-2" onChange={() => {
                    if(promptItem.type === 'persona' || promptItem.type === 'description' || promptItem.type === 'authornote' || promptItem.type === 'memory'){
                        promptItem.innerFormat = null
                    }
                }} />
            {/if}
        {/if}
    {/if}
</div>
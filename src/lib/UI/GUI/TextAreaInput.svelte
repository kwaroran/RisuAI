<div 
    class={"border border-darkborderc relative n-scroll focus-within:border-borderc rounded-md shadow-xs text-textcolor bg-transparent focus-within:ring-borderc focus-within:ring-2 focus-within:outline-hidden transition-colors duration-200 z-20 focus-within:z-40" + ((className) ? (' ' + className) : '')} 
    class:text-sm={size === 'sm' || (size === 'default' && $textAreaTextSize === 1)}
    class:text-md={size === 'md' || (size === 'default' && $textAreaTextSize === 2)}
    class:text-lg={size === 'lg' || (size === 'default' && $textAreaTextSize === 3)}
    class:text-xl={size === 'xl'}
    class:text-xs={size === 'xs' || (size === 'default' && $textAreaTextSize === 0)}
    class:w-full={fullwidth}
    class:h-20={height === '20' || (height === 'default' && $textAreaSize === -5)}
    class:h-24={height === '24' || (height === 'default' && $textAreaSize === -4)}
    class:h-28={height === '28' || (height === 'default' && $textAreaSize === -3)}
    class:h-32={height === '32' || (height === 'default' && $textAreaSize === -2)}
    class:h-36={height === '36' || (height === 'default' && $textAreaSize === -1)}
    class:h-40={height === 'default' && $textAreaSize === 0}
    class:h-44={height === 'default' && $textAreaSize === 1}
    class:h-48={height === 'default' && $textAreaSize === 2}
    class:h-52={height === 'default' && $textAreaSize === 3}
    class:h-56={height === 'default' && $textAreaSize === 4}
    class:h-60={height === 'default' && $textAreaSize === 5}
    class:h-full={height === 'full'}
    class:min-h-20={height === '20' || (height === 'default' && $textAreaSize === -5)}
    class:min-h-24={height === '24' || (height === 'default' && $textAreaSize === -4)}
    class:min-h-28={height === '28' || (height === 'default' && $textAreaSize === -3)}
    class:min-h-32={height === '32' || (height === 'default' && $textAreaSize === -2)}
    class:min-h-36={height === '36' || (height === 'default' && $textAreaSize === -1)}
    class:min-h-40={height === 'default' && $textAreaSize === 0}
    class:min-h-48={height === 'default' && $textAreaSize === 1}
    class:min-h-56={height === 'default' && $textAreaSize === 2}
    class:min-h-64={height === 'default' && $textAreaSize === 3}
    class:min-h-72={height === 'default' && $textAreaSize === 4}
    class:min-h-80={height === 'default' && $textAreaSize === 5}
    class:mb-4={margin === 'bottom'}
    class:mb-2={margin === 'both'}
    class:mt-4={margin === 'top'}
    class:mt-2={margin === 'both'}
    bind:this={highlightDom}
    onfocusout={() => {
        hideAutoComplete()
    }}
>
    {#if !highlight || $disableHighlight}
        <textarea
            class="w-full h-full bg-transparent focus-within:outline-hidden resize-none absolute top-0 left-0 z-50 overflow-y-auto"
            class:px-4={padding}
            class:py-2={padding}
            {autocomplete}
            {placeholder}
            id={id}
            bind:value={value}
            oninput={(e) => {
                if(optimaizedInput){
                    if(inpa++ > 10){
                        value = e.currentTarget.value
                        inpa = 0
                        onInput()
                    }
                }
                else{
                    value = e.currentTarget.value
                    onInput()
                }
            }}
            onchange={(e) => {
                if(optimaizedInput){
                    value = e.currentTarget.value
                    onInput()
                }
                onchange()
            }}
></textarea>
{:else}
    <div
        class="w-full h-full bg-transparent focus-within:outline-hidden resize-none absolute top-0 left-0 z-50 overflow-y-auto px-4 py-2 wrap-break-word whitespace-pre-wrap"
        contenteditable="true"
        bind:textContent={value}
        onkeydown={(e) => {
            handleKeyDown(e)
            onInput()
        }}
        role="textbox"
        tabindex="0"
        oninput={(e) => {
            autoComplete()
        }}
        onchange={(e) => {
            onchange()
        }}
        bind:this={inputDom}
        translate="no"
    >{value ?? ''}</div>
{/if}
    <div class="hidden absolute z-100 bg-bgcolor border border-darkborderc p-2 flex-col" bind:this={autoCompleteDom}>
        {#each autocompleteContents as content, i}
            <button class="w-full text-left py-1 px-2 bg-bgcolor" class:text-blue-500={selectingAutoComplete === i} onclick={() => {
                insertContent(content)
            }}>{content}</button>
        {/each}
    </div>
</div>
<script lang="ts">
    import { textAreaSize, textAreaTextSize } from 'src/ts/gui/guisize'
    import { highlighter, getNewHighlightId, removeHighlight, AllCBS } from 'src/ts/gui/highlight'
    import { sleep } from 'src/ts/util';
    import { onDestroy, onMount } from 'svelte';
  import { disableHighlight } from 'src/ts/stores.svelte';
  import { isMobile } from 'src/ts/platform'
    interface Props {
        size?: 'xs'|'sm'|'md'|'lg'|'xl'|'default';
        autocomplete?: 'on'|'off';
        placeholder?: string;
        value: string;
        id?: string;
        padding?: boolean;
        margin?: "none"|"top"|"bottom"|"both";
        onInput?: any;
        fullwidth?: boolean;
        height?: '20'|'24'|'28'|'32'|'36'|'full'|'default';
        className?: string;
        optimaizedInput?: boolean;
        highlight?: boolean;
        onchange?: () => void;
    }

    let {
        size = 'default',
        autocomplete = 'off',
        placeholder = '',
        value = $bindable(),
        id = undefined,
        padding = true,
        margin = "none",
        onInput = () => {},
        fullwidth = false,
        height = 'default',
        className = '',
        optimaizedInput = true,
        highlight = false,
        onchange = () => {}
    }: Props = $props();
    let selectingAutoComplete = $state(0)
    // TODO: Review if highlight prop can change dynamically - if so, this needs to be reactive
    // svelte-ignore state_referenced_locally
    let highlightId = highlight ? getNewHighlightId() : 0
    let inpa = $state(0)
    let highlightDom: HTMLDivElement = $state()
    let optiValue = $state(value)
    let autoCompleteDom: HTMLDivElement = $state()
    let autocompleteContents:string[] = $state([])
    let inputDom: HTMLDivElement = $state()

    const autoComplete = () => {
        if(isMobile){
            return
        }
        //autocomplete
        selectingAutoComplete = 0
        const sel = window.getSelection()
        if(!sel){
            return
        }

        const range = sel.getRangeAt(0)

        if(range){
            const qValue = (range.startContainer).textContent
            const splited = qValue.substring(0, range.startOffset).split('{{')
            if(splited.length === 1){
                hideAutoComplete()
                return
            }
            const qText = splited.pop()
            let filtered = AllCBS.filter((cb) => cb.startsWith(qText))
            if(filtered.length === 0){
                hideAutoComplete()
                return
            }
            filtered = filtered.slice(0, 10)
            autocompleteContents = filtered
        }

        const hlRect = highlightDom.getBoundingClientRect()
        const rect = range.getBoundingClientRect()
        if(rect.top === 0 && rect.left === 0){
            hideAutoComplete()
            return
        }
        const top = rect.top - hlRect.top + 15
        const left = rect.left - hlRect.left
        autoCompleteDom.style.top = top + 'px'
        autoCompleteDom.style.left = left + 'px'
        autoCompleteDom.style.display = 'flex'
    }

    const insertContent = (insertContent:string, type:'autoComplete'|'paste' = 'autoComplete') => {
        console.log(insertContent)
        const sel = window.getSelection()
        if(sel){
            const range = sel.getRangeAt(0)
            let content = (range.startContainer).textContent
            let contentStart = content.substring(0, range.startOffset)
            let contentEnd = content.substring(range.startOffset)
            if(type === 'autoComplete'){
                contentStart = contentStart.substring(0, contentStart.lastIndexOf('{{'))
                if(insertContent.endsWith(':')){
                    insertContent = `{{${insertContent}:`
                }
                else if(insertContent.startsWith('#')){
                    insertContent = `{{${insertContent} `
                }
                else{
                    insertContent = `{{${insertContent}}}`
                }
            }

            const cons = contentStart + insertContent + contentEnd
            range.startContainer.textContent = cons
            hideAutoComplete()

            try {
                sel.collapse(range.startContainer, contentStart.length + insertContent.length)                
            } catch (error) {}
            //invoke onInput
            
            try {
                inputDom.dispatchEvent(new Event('input'))
                inputDom.dispatchEvent(new Event('change'))
            } catch (error) {}
        }
    }

    const hideAutoComplete = () => {
        autoCompleteDom.style.display = 'none'
        selectingAutoComplete = 0
        autocompleteContents = []
    }

    onMount(() => {
        highlighter(highlightDom, highlightId)
    })

    onDestroy(() => {
        removeHighlight(highlightId)
    })

    const highlightChange = async (value:string, highlightId:number) => {
        await sleep(1)
        highlighter(highlightDom, highlightId)
    }

    const handleKeyDown = (e:KeyboardEvent) => {
        if(autocompleteContents.length >= 1){
            switch(e.key){
                case 'ArrowDown':
                    selectingAutoComplete = Math.min(selectingAutoComplete + 1, autocompleteContents.length - 1)
                    e.preventDefault()
                    return
                case 'ArrowUp':
                    selectingAutoComplete = Math.max(selectingAutoComplete - 1, 0)
                    e.preventDefault()
                    return
                case 'Enter':
                case 'Tab':
                    e.preventDefault()
                    insertContent(autocompleteContents[selectingAutoComplete])
                    return
                case 'Escape':
                    hideAutoComplete()
                    return
            }
        }
        if(e.key === 'Enter'){
            e.stopPropagation()
            e.preventDefault()
            insertTextAtSelection('\n')
        }
    }

    function insertTextAtSelection(txt:string) {

        txt = txt.replace(/\r/g, '')

        let div = inputDom;
        let sel = window.getSelection();
        let text = div.textContent;
        let before = Math.min(sel.focusOffset, sel.anchorOffset);
        let after = Math.max(sel.focusOffset, sel.anchorOffset);
        let afterStr = text.substring(after);
        if (afterStr == "") afterStr = "\n";
        div.textContent = text.substring(0, before) + txt + afterStr;
        sel.removeAllRanges();
        let range = document.createRange();
        range.setStart(div.childNodes[0], before + txt.length);
        range.setEnd(div.childNodes[0], before + txt.length);
        sel.addRange(range);
        try {
            inputDom.dispatchEvent(new Event('input'))
            inputDom.dispatchEvent(new Event('change'))
        } catch (error) {}
    }
        
    $effect.pre(() => {
        optiValue = value
    });
    $effect.pre(() => {
        highlightChange(value, highlightId)
    });

</script>
<div 
    class={"border border-darkborderc relative z-20 n-scroll focus-within:border-borderc rounded-md shadow-sm text-textcolor bg-transparent focus-within:ring-borderc focus-within:ring-2 focus-within:outline-none transition-colors duration-200" + ((className) ? (' ' + className) : '')} 
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
>
    {#if !highlight || !CSS.highlights || isFirefox}
        <textarea
            class="w-full h-full bg-transparent focus-within:outline-none resize-none absolute top-0 left-0 z-10 overflow-y-auto"
            class:px-4={padding}
            class:py-2={padding}
            {autocomplete}
            {placeholder}
            id={id}
            bind:value={value}
            on:input={(e) => {
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
            on:change={(e) => {
                if(optimaizedInput){
                    value = e.currentTarget.value
                    onInput()
                }
            }}
        />
    {:else}
        <div
            class="w-full h-full bg-transparent focus-within:outline-none resize-none absolute top-0 left-0 z-10 overflow-y-auto px-4 py-2 break-words whitespace-pre-wrap"
            contenteditable="plaintext-only"
            bind:innerText={value}
            on:keydown={(e) => {
                onInput()
            }}
            translate="no"
            
        >{value ?? ''}</div>
    {/if}
</div>
<script lang="ts">
    import { textAreaSize, textAreaTextSize } from 'src/ts/gui/guisize'
    import { highlighter, getNewHighlightId, removeHighlight } from 'src/ts/gui/highlight'
    import { isFirefox, sleep } from 'src/ts/util';
    import { onDestroy, onMount } from 'svelte';
    export let size: 'xs'|'sm'|'md'|'lg'|'xl'|'default' = 'default'
    export let autocomplete: 'on'|'off' = 'off'
    export let placeholder: string = ''
    export let value:string
    export let id:string = undefined
    export let padding = true
    export let margin:"none"|"top"|"bottom"|"both" = "none"
    export let onInput = () => {}
    export let fullwidth = false
    export let height:'20'|'24'|'28'|'32'|'36'|'full'|'default' = 'default'
    export let className = ''
    export let optimaizedInput = true
    export let highlight = false
    let highlightId = highlight ? getNewHighlightId() : 0
    let inpa = 0
    let highlightDom: HTMLDivElement
    let optiValue = value

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
    
    $: optiValue = value
    $: highlightChange(value, highlightId)

</script>
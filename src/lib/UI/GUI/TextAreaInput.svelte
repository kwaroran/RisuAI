<textarea 
    class={"border border-darkborderc n-scroll focus:border-borderc resize-none rounded-md shadow-sm text-textcolor bg-transparent focus:ring-borderc focus:ring-2 focus:outline-none transition-colors duration-200" + ((className) ? (' ' + className) : '')} 
    class:text-sm={size === 'sm' || (size === 'default' && $textAreaTextSize === 1)}
    class:text-md={size === 'md' || (size === 'default' && $textAreaTextSize === 2)}
    class:text-lg={size === 'lg' || (size === 'default' && $textAreaTextSize === 3)}
    class:text-xl={size === 'xl'}
    class:text-xs={size === 'xs' || (size === 'default' && $textAreaTextSize === 0)}
    class:px-4={padding}
    class:py-2={padding}
    class:mb-4={margin === 'bottom'}
    class:mb-2={margin === 'both'}
    class:mt-4={margin === 'top'}
    class:mt-2={margin === 'both'}
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

<script lang="ts">
    import { textAreaSize, textAreaTextSize } from 'src/ts/gui/guisize'
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
    let inpa = 0

    let optiValue = value

    $: optiValue = value

</script>
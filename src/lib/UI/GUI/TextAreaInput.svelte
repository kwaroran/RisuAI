{#if optimaizedInput}
    <textarea 
        class={"border border-darkborderc n-scroll focus:border-borderc resize-none rounded-md shadow-sm text-textcolor bg-transparent focus:ring-borderc focus:ring-2 focus:outline-none transition-colors duration-200" + ((additionalClass) ? (' ' + additionalClass) : '')} 
        class:text-sm={size === 'sm'}
        class:text-md={size === 'md'}
        class:text-lg={size === 'lg'}
        class:text-xl={size === 'xl'}
        class:text-xs={size === 'xs'}
        class:px-4={padding}
        class:py-2={padding}
        class:mb-4={margin === 'bottom'}
        class:mb-2={margin === 'both'}
        class:mt-4={margin === 'top'}
        class:mt-2={margin === 'both'}
        class:w-full={fullwidth}
        class:h-20={height === '20'}
        class:h-24={height === '24'}
        class:h-32={height === '32'}
        class:h-full={height === 'full'}
        class:min-h-20={height === '20'}
        class:min-h-32={height === '32'}
        {autocomplete}
        {placeholder}
        id={id}
        bind:value={value}
        on:input={(e) => {
            if(inpa++ > 10){
                value = e.currentTarget.value
                inpa = 0
                onInput()
            }
        }}
        on:change={(e) => {
            value = e.currentTarget.value
            onInput()
        }}
    />
{:else}
    <textarea 
        class={"border border-darkborderc n-scroll focus:border-borderc resize-none rounded-md shadow-sm text-textcolor bg-transparent focus:ring-borderc focus:ring-2 focus:outline-none transition-colors duration-200" + ((additionalClass) ? (' ' + additionalClass) : '')} 
        class:text-sm={size === 'sm'}
        class:text-md={size === 'md'}
        class:text-lg={size === 'lg'}
        class:text-xl={size === 'xl'}
        class:text-xs={size === 'xs'}
        class:px-4={padding}
        class:py-2={padding}
        class:mb-4={margin === 'bottom'}
        class:mb-2={margin === 'both'}
        class:mt-4={margin === 'top'}
        class:mt-2={margin === 'both'}
        class:w-full={fullwidth}
        class:h-20={height === '20'}
        class:h-24={height === '24'}
        class:h-32={height === '32'}
        class:h-full={height === 'full'}
        class:min-h-20={height === '20'}
        class:min-h-32={height === '32'}
        {autocomplete}
        {placeholder}
        id={id}
        bind:value
        on:input={onInput}
    />
{/if}
<script lang="ts">
    export let size: 'xs'|'sm'|'md'|'lg'|'xl' = 'xs'
    export let autocomplete: 'on'|'off' = 'off'
    export let placeholder: string = ''
    export let value:string
    export let id:string = undefined
    export let padding = true
    export let margin:"none"|"top"|"bottom"|"both" = "none"
    export let onInput = () => {}
    export let fullwidth = false
    export let height:'20'|'24'|'32'|'full' = '20'
    export let additionalClass = ''
    export let optimaizedInput = true
    let inpa = 0

    let optiValue = value

    $: optiValue = value

</script>
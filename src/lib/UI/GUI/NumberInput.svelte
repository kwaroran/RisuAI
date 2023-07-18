<!-- <input
    class="text-neutral-200 bg-transparent input-text focus:bg-selected"
    class:text-sm={size === 'sm'}
    class:text-md={size === 'md'}
    class:text-lg={size === 'lg'}
    class:p-2={padding}
    class:mb-4={marginBottom}
    class:w-full={fullwidth}
    class:h-full={fullh}
    on:change={onChange}
    type="number"
    min={min}
    max={max}
    id={id}
    bind:value
> -->

<input 
    class={"border border-gray-600 focus:border-borderc rounded-md shadow-sm text-white bg-transparent numinput focus:ring-borderc focus:ring-2 focus:outline-none transition-colors duration-200" + ((additionalClass) ? (' ' + additionalClass) : '')} 
    class:text-sm={size === 'sm'}
    class:text-md={size === 'md'}
    class:text-lg={size === 'lg'}
    class:px-4={padding}
    class:py-2={padding}
    class:mb-4={marginBottom}
    class:w-full={fullwidth}
    class:h-full={fullh}
    type="number"
    min={min}
    max={max}
    id={id}
    bind:value
    on:change={onChange}
/>

<script lang="ts">
    export let min:number = undefined
    export let max:number = undefined
    export let size: 'sm'|'md'|'lg' = 'sm'
    export let value:number
    export let id:string = undefined
    export let padding = true
    export let marginBottom = false
    export let fullwidth = false
    export let fullh = false
    export let onChange = () => {}
    export let additionalClass = ''
</script>

<style>
    .numinput::-webkit-outer-spin-button,
    .numinput::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    /* Firefox */
    .numinput {
        -moz-appearance: textfield;
        appearance: textfield;
    }
</style>
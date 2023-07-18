<input 
    class={"border border-gray-600 focus:border-borderc rounded-md shadow-sm text-white bg-transparent focus:ring-borderc focus:ring-2 focus:outline-none transition-colors duration-200" + ((additionalClass) ? (' ' + additionalClass) : '')} 
    class:text-sm={size === 'sm'}
    class:text-md={size === 'md'}
    class:text-lg={size === 'lg'}
    class:text-xl={size === 'xl'}
    class:px-4={padding}
    class:py-2={padding}
    class:mb-4={marginBottom}
    class:w-full={fullwidth}
    class:h-full={fullh}
    {autocomplete}
    {placeholder}
    id={id}
    type="text"
    bind:value
    on:input={onInput}
/>


<script lang="ts">
    export let size: 'sm'|'md'|'lg'|'xl' = 'md'
    export let autocomplete: 'on'|'off' = 'off'
    export let placeholder: string = ''
    export let value:string
    export let id:string = undefined
    export let padding = true
    export let marginBottom = false
    export let onInput = () => {}
    export let fullwidth = false
    export let fullh = false
    export let additionalClass = ''
</script>
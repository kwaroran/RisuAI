<input
    class={"text-neutral-200 bg-transparent input-text focus:bg-selected" + ((additionalClass) ? (' ' + additionalClass) : '')}
    class:text-sm={size === 'sm'}
    class:text-md={size === 'md'}
    class:text-lg={size === 'lg'}
    class:text-xl={size === 'xl'}
    class:p-2={padding}
    class:mb-4={marginBottom}
    class:w-full={fullwidth}
    class:h-full={fullh}

    {autocomplete}
    {placeholder}
    id={id}
    type="text"
    bind:value
    on:input={onInput}
>


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
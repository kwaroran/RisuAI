<input
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
>


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

</script>
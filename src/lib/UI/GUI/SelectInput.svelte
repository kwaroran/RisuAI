<select
    class={"border border-darkborderc focus:border-borderc rounded-md shadow-sm text-textcolor bg-transparent focus:ring-borderc focus:ring-2 focus:outline-none transition-colors duration-200" + ((className) ? (' ' + className) : '')}
    class:text-sm={size === 'sm'}
    class:text-md={size === 'md'}
    class:text-lg={size === 'lg'}
    class:text-xl={size === 'xl'}
    class:px-4={size === 'md'}
    class:py-2={size === 'md'}
    class:px-2={size === 'sm'}
    class:py-1={size === 'sm'}
    class:px-6={size === 'lg'}
    class:py-3={size === 'lg'}
    bind:value
    on:change
>
    <slot></slot>
</select>
<script lang="ts">
    export let value:string
    export let className:string = ""
    export let size:'sm'|'md'|'lg'|'xl' = 'md'

</script>
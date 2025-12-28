<select
    class={"border border-darkborderc focus:border-borderc rounded-md shadow-xs text-textcolor bg-transparent focus:ring-borderc focus:ring-2 focus:outline-hidden transition-colors duration-200" + ((className) ? (' ' + className) : '')}
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
    onchange={onchange}
>
    {@render children?.()}
</select>
<script lang="ts">
    interface Props {
        value: string | number;
        className?: string;
        size?: 'sm'|'md'|'lg'|'xl';
        children?: import('svelte').Snippet;
        onchange?: (event: Event & {
            currentTarget: EventTarget & HTMLSelectElement;
        }) => any;
    }

    let {
        value = $bindable(),
        className = "",
        size = 'md',
        children,
        onchange
    }: Props = $props();

</script>
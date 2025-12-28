
<!-- Since svelte doesn't allow two-way binding for dynamic types, we use this -->

{#if hideText}
     <!-- new-password disables autofill -->
    <input 
        class={"border border-darkborderc peer focus:border-borderc rounded-md shadow-xs text-textcolor bg-transparent focus:ring-borderc focus:ring-2 focus:outline-hidden transition-colors duration-200" + ((className) ? (' ' + className) : '')} 
        class:text-sm={size === 'sm'}
        class:text-md={size === 'md'}
        class:text-lg={size === 'lg'}
        class:text-xl={size === 'xl'}

        class:px-4={size === 'md' && padding}
        class:py-2={size === 'md' && padding}
        class:px-2={size === 'sm' && padding}
        class:py-1={size === 'sm' && padding}
        class:px-6={size === 'lg' || size === 'xl' && padding}
        class:py-3={size === 'lg' || size === 'xl'&& padding}

        class:mb-4={marginBottom}
        class:mt-4={marginTop}
        class:w-full={fullwidth}
        class:h-full={fullh}
        class:text-textcolor2={disabled}

        autocomplete="new-password"
        {placeholder}
        id={id}
        type="password"
        bind:value
        disabled={disabled}
        oninput={oninput}
        onchange={onchange}
        list={list}
    />
{:else}

    <input 
        class={"border border-darkborderc peer focus:border-borderc rounded-md shadow-xs text-textcolor bg-transparent focus:ring-borderc focus:ring-2 focus:outline-hidden transition-colors duration-200" + ((className) ? (' ' + className) : '')} 
        list={list}
        class:text-sm={size === 'sm'}
        class:text-md={size === 'md'}
        class:text-lg={size === 'lg'}
        class:text-xl={size === 'xl'}

        class:px-4={size === 'md' && padding}
        class:py-2={size === 'md' && padding}
        class:px-2={size === 'sm' && padding}
        class:py-1={size === 'sm' && padding}
        class:px-6={size === 'lg' || size === 'xl' && padding}
        class:py-3={size === 'lg' || size === 'xl'&& padding}

        class:mb-4={marginBottom}
        class:mt-4={marginTop}
        class:w-full={fullwidth}
        class:h-full={fullh}
        class:text-textcolor2={disabled}

        {autocomplete}
        {placeholder}
        id={id}
        type="text"
        bind:value
        disabled={disabled}
        oninput={oninput}
        onchange={onchange}
    />
{/if}

<script lang="ts">
    type FormEventHandler<T extends EventTarget> = (event: Event & {
        currentTarget: EventTarget & T;
    }) => any

    interface Props {
        size?: 'sm'|'md'|'lg'|'xl';
        autocomplete?: 'on'|'off';
        placeholder?: string;
        value: string;
        id?: string;
        padding?: boolean;
        marginBottom?: boolean;
        marginTop?: boolean;
        oninput?: FormEventHandler<HTMLInputElement>
        onchange?: FormEventHandler<HTMLInputElement>;
        fullwidth?: boolean;
        fullh?: boolean;
        className?: string;
        disabled?: boolean;
        hideText?: boolean;
        list?: string;
    }

    let {
        size = 'md',
        autocomplete = 'off',
        placeholder = '',
        value = $bindable(),
        id = undefined,
        padding = true,
        marginBottom = false,
        marginTop = false,
        oninput,
        onchange,
        fullwidth = false,
        fullh = false,
        className = '',
        disabled = false,
        hideText = false,
        list = undefined
        
    }: Props = $props();
</script>

<style>
    .hide-text:not(:focus):not(:hover) {
        text-indent: -9999px;
    }
</style>
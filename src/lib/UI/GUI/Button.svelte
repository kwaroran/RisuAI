<button
    onclick={onclick}
    {disabled}
    class="{
        styled === 'primary' ? ((selected ? 'bg-bg-selected' : 'bg-darkbutton') + " hover:bg-selected focus:ring-selected border-darkborderc")
        : styled === 'outlined' ? 'bg-transparent hover:bg-darkbg focus:ring-selected border-darkborderc text-textcolor2'
        : ((selected ? 'bg-red-800' : 'bg-red-700') + ' hover:bg-red-500 focus:ring-red-600 border-red-600')
    } border text-textcolor rounded-md shadow-xs focus:outline-hidden focus:ring-2 transition-colors duration-200{className ? (" " + className) : ""}"
    class:opacity-50={disabled}
    class:cursor-not-allowed={disabled}
    class:px-4 = {size == "md"}
    class:px-2 = {size == "sm"}
    class:px-6 = {size == "lg"}
    class:py-2 = {size == "md"}
    class:py-1 = {size == "sm"}
    class:py-3 = {size == "lg"}
    class:text-md = {size == "md"}
    class:text-sm = {size == "sm"}
    class:text-lg = {size == "lg"}>
    {@render children?.()}
</button>
<script lang="ts">

    interface Props {
        selected?: boolean;
        styled?: 'primary'|'danger'|'outlined';
        className?: string;
        size?: "sm" | "md" | "lg";
        disabled?: boolean;
        children?: import('svelte').Snippet;
        onclick?: (event: MouseEvent & {
            currentTarget: EventTarget & HTMLButtonElement;
        }) => any
    }

    let {
        selected = false,
        styled = 'primary',
        className = "",
        size = "md",
        disabled = false,
        children,
        onclick
    }: Props = $props();
</script>
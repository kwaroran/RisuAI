<button
    on:click
    class="{
        styled === 'primary' ? ((selected ? 'bg-bg-selected' : 'bg-darkbutton') + " hover:bg-selected focus:ring-selected border-darkborderc")
        : styled === 'outlined' ? 'bg-transparent hover:bg-darkbg focus:ring-selected border-darkborderc text-textcolor2'
        : ((selected ? 'bg-red-800' : 'bg-red-700') + ' hover:bg-red-500 focus:ring-red-600 border-red-600')
    } border text-textcolor rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors duration-200{className ? (" " + className) : ""}"
    class:px-4 = {size == "md"}
    class:px-2 = {size == "sm"}
    class:px-6 = {size == "lg"}
    class:py-2 = {size == "md"}
    class:py-1 = {size == "sm"}
    class:py-3 = {size == "lg"}
    class:text-md = {size == "md"}
    class:text-sm = {size == "sm"}
    class:text-lg = {size == "lg"}>
    <slot></slot>
</button>
<script lang="ts">
    export let selected = false
    export let styled:'primary'|'danger'|'outlined' = 'primary'
    export let className = ""
    export let size: "sm" | "md" | "lg" = "md"
</script>
<button
    on:click
    class="{selected ? 'bg-borderc' : 'bg-darkbutton'} border border-darkborderc text-textcolor rounded-md shadow-sm hover:bg-borderc focus:outline-none focus:ring-2 focus:ring-borderc transition-colors duration-200{className ? (" " + className) : ""}"
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
    export let className = ""
    export let size: "sm" | "md" | "lg" = "md"
</script>
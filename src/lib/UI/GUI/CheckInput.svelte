<script lang="ts">
    import { CheckIcon } from "lucide-svelte";

    export let check = false
    export let onChange = (check) => {}
    export let margin = true
    export let name = ''
    export let hiddenName = false
    export let className = ""
</script>

<label 
    class={"flex items-center space-x-2 cursor-pointer text-textcolor" + (className ? " " + className : "")}
    class:mr-2={margin}
    aria-describedby="{name} {check ? 'abled' : 'disabled'}"
>
    <input 
        class="hidden" 
        type="checkbox" 
        alt={name}
        bind:checked={check}
        on:change={() => {
            onChange(check)
        }}
    />
    <span 
        class="w-5 h-5 min-w-5 min-h-5 rounded-md border-2 border-darkborderc flex justify-center items-center {check ? 'bg-borderc' : 'bg-darkbutton'} transition-colors duration-200"
        aria-hidden="true"
    >
        {#if check}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" class="w-3 h-3" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
        {/if}
    </span>
    {#if !hiddenName}
        <span>{name}</span>
    {/if}
</label>

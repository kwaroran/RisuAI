<script lang="ts">
    import { CurrentChat } from "src/ts/stores";
  import TextInput from "../UI/GUI/TextInput.svelte";
  import NumberInput from "../UI/GUI/NumberInput.svelte";

    
</script>

<span>Variables</span>
<div class="rounded-md border border-darkborderc grid grid-cols-2 gap-2 p-2">
    {#if $CurrentChat.scriptstate &&  Object.keys($CurrentChat.scriptstate).length > 0}
        {#each Object.keys($CurrentChat.scriptstate) as key}
            <span>{key}</span>
            {#if typeof $CurrentChat.scriptstate[key] === "object"}
                <div class="p-2 text-center">Object</div>
            {:else if typeof $CurrentChat.scriptstate[key] === "string"}
                <TextInput bind:value={$CurrentChat.scriptstate[key]} />
            {:else if typeof $CurrentChat.scriptstate[key] === "number"}
                <NumberInput bind:value={$CurrentChat.scriptstate[key]} />
            {/if}
        {/each}
    {:else}
        <div class="p-2 text-center">No variables</div>
    {/if}
</div>
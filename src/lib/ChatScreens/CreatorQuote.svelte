<div class="flex w-full justify-center mt-4 max-w-100vw">
    <div class="w-5/6 max-w-80vw bg-darkbg rounded-md p-3 text-textcolor text-sm">
        <h1 class="font-bold mb-2">{language.creatorNotes}
            <button class="float-right" on:click={onRemove}>
                <XIcon />
            </button>
        </h1>
        <div class="ml-2 max-w-full break-words text chat chattext prose prose-invert">
            {#await ParseMarkdown(quote) then md} 
                {@html md}
            {/await}
        </div>
    </div>
</div>
<script lang="ts">
    import { XIcon } from "lucide-svelte";
    import { language } from "src/lang";
    import { ParseMarkdown } from "src/ts/parser";

    export let onRemove: () => void
    export let quote:string
</script>
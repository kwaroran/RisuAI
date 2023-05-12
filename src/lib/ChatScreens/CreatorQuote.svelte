<div class="flex w-full justify-center">
    <div class="w-3xl max-w-80p bg-darkbg rounded-md p-3 text-white text-sm">
        <h1 class="text-xl font-bold mb-2">{language.creatorNotes}
            <button class="float-right" on:click={onRemove}>
                <XIcon />
            </button>
        </h1>
        <div class="ml-2 max-w-full break-words text chat chattext prose prose-invert">
            {@html ParseMarkdown(quote)}
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
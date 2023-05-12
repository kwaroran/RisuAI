<script lang="ts">
  import { XIcon } from "lucide-svelte";
  import { language } from "src/lang";
  import { ParseMarkdown } from "src/ts/parser";

  export let onRemove: () => void;
  export let quote: string;
</script>

<div class="mt-4 flex w-full max-w-100vw justify-center">
  <div class="w-5/6 max-w-80vw rounded-md bg-darkbg p-3 text-sm text-white">
    <h1 class="mb-2 font-bold">
      {language.creatorNotes}
      <button class="float-right" on:click={onRemove}>
        <XIcon />
      </button>
    </h1>
    <div
      class="text chat chattext prose prose-invert ml-2 max-w-full break-words"
    >
      {@html ParseMarkdown(quote)}
    </div>
  </div>
</div>

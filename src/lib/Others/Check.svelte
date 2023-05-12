<script lang="ts">
  import { CheckIcon } from "lucide-svelte";

  export let check = false;
  export let onChange = (check) => {};
</script>

<label class="mr-2">
  <input
    type="checkbox"
    class="hidden"
    bind:checked={check}
    on:change={() => {
      onChange(check);
    }}
  />
  {#if check}
    <div class="flex h-6 w-6 items-center justify-center bg-green-500 text-sm">
      <CheckIcon />
    </div>
  {:else}
    <div class="h-6 w-6 bg-selected" />
  {/if}
</label>

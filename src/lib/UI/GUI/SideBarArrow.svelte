<script lang="ts">
  import { ArrowLeft, ArrowRight } from "lucide-svelte";
  import { DynamicGUI, sideBarClosing, sideBarStore } from "src/ts/stores";

</script>

{#if $sideBarStore && !$DynamicGUI}
    <button on:click={() => {sideBarClosing.set(true)}} class="absolute top-3 left-0 h-12 w-12 border-r border-b border-t border-transparent  rounded-r-md bg-darkbg hover:border-neutral-200 transition-colors flex items-center justify-center text-textcolor z-20">
        <ArrowLeft />
    </button>
{:else}
    <button on:click={() => {
        sideBarClosing.set(false);
        sideBarStore.set(true)}
    } class="absolute top-3 left-0 h-12 w-12 border-r border-b border-t border-borderc rounded-r-md bg-darkbg hover:border-neutral-200 transition-colors flex items-center justify-center text-textcolor opacity-50 hover:opacity-90 z-20">
        <ArrowRight />
    </button>
{/if}
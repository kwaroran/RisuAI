<script lang="ts">
    import { ArrowLeft } from "lucide-svelte";
    import { language } from "src/lang";
    import { PlaygroundStore, SizeStore } from "src/ts/stores";
    import PlaygroundEmbedding from "./PlaygroundEmbedding.svelte";
    import PlaygroundTokenizer from "./PlaygroundTokenizer.svelte";
    import PlaygroundJinja from "./PlaygroundJinja.svelte";
    import PlaygroundSyntax from "./PlaygroundSyntax.svelte";
    import PlaygroundRegex from "./PlaygroundRegex.svelte";
</script>

<div class="h-full w-full flex flex-col overflow-y-auto items-center">
    {#if $PlaygroundStore === 1}
        <h2 class="text-4xl text-textcolor my-6 font-black relative">{language.playground}</h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 w-full max-w-4xl">
            <button class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow hover:ring-1" on:click={() => {
                PlaygroundStore.set(2)
            }}>
                <h1 class="text-2xl font-bold text-start">{language.Chat}</h1>
            </button>
            <button class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow hover:ring-1" on:click={() => {
                PlaygroundStore.set(3)
            }}>
                <h1 class="text-2xl font-bold text-start">{language.embedding}</h1>
            </button>
            <button class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow hover:ring-1" on:click={() => {
                PlaygroundStore.set(4)
            }}>
                <h1 class="text-2xl font-bold text-start">{language.tokenizer}</h1>
            </button>
            <button class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow hover:ring-1" on:click={() => {
                PlaygroundStore.set(5)
            }}>
                <h1 class="text-2xl font-bold text-start">{language.syntax}</h1>
            </button>
            <button class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow hover:ring-1" on:click={() => {
                PlaygroundStore.set(6)
            }}>
                <h1 class="text-2xl font-bold text-start">Jinja</h1>
            </button>
            <button class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow hover:ring-1" on:click={() => {
                PlaygroundStore.set(7)
            }}>
                <h1 class="text-2xl font-bold text-start">Regex</h1>
            </button>
        </div>
    {:else}
        {#if $SizeStore.w < 1024}
            <div class="mt-14"></div>
        {/if}
        <div class="w-full max-w-4xl flex flex-col">
            <div class="flex items-center mt-4">
                <button class="mr-2 text-textcolor2 hover:text-green-500" on:click={() => ($PlaygroundStore = 1)}>
                <ArrowLeft/>
                </button>
            </div>

            {#if $PlaygroundStore === 2}
                <!-- <PlaygroundChat/> -->
            {/if}
            {#if $PlaygroundStore === 3}
                <PlaygroundEmbedding/>
            {/if}
            {#if $PlaygroundStore === 4}
                <PlaygroundTokenizer/>
            {/if}
            {#if $PlaygroundStore === 5}
                <PlaygroundSyntax/>
            {/if}
            {#if $PlaygroundStore === 6}
                <PlaygroundJinja/>
            {/if}
            {#if $PlaygroundStore === 7}
                <PlaygroundRegex/>
            {/if}
        </div>
    {/if}
</div>
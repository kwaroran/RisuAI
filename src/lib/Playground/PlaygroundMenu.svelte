<script lang="ts">
    import { ArrowLeft } from "lucide-svelte";
    import { language } from "src/lang";
    import { PlaygroundStore, SizeStore, selectedCharID } from "src/ts/stores";
    import PlaygroundEmbedding from "./PlaygroundEmbedding.svelte";
    import PlaygroundTokenizer from "./PlaygroundTokenizer.svelte";
    import PlaygroundJinja from "./PlaygroundJinja.svelte";
    import PlaygroundSyntax from "./PlaygroundSyntax.svelte";
    import { findCharacterIndexbyId } from "src/ts/util";
    import { characterFormatUpdate, createBlankChar } from "src/ts/characters";
    import { get } from "svelte/store";
    import { DataBase, setDatabase, type character } from "src/ts/storage/database";
    import PlaygroundImageGen from "./PlaygroundImageGen.svelte";
    import PlaygroundParser from "./PlaygroundParser.svelte";
    import ToolConvertion from "./ToolConvertion.svelte";

    let easterEggTouch = 0

    const playgroundChat = () => {
        let db = get(DataBase)
        const charIndex = findCharacterIndexbyId('§playground')
        PlaygroundStore.set(2)

        if (charIndex !== -1) {

            const char = db.characters[charIndex] as character
            char.utilityBot = true
            char.name = 'assistant'
            char.firstMessage = '{{none}}'
            db.characters[charIndex] = char
            characterFormatUpdate(charIndex)

            selectedCharID.set(charIndex)
            return
        }

        const character = createBlankChar()
        character.chaId = '§playground'

        db.characters.push(character)
        setDatabase(db)

        playgroundChat()

    }
</script>

<div class="h-full w-full flex flex-col overflow-y-auto items-center">
    {#if $PlaygroundStore === 1}
        <h2 class="text-4xl text-textcolor my-6 font-black relative">{language.playground}</h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 w-full max-w-4xl p-2">
            <button class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow hover:ring-1 md:col-span-2" on:click={() => {
                playgroundChat()
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
                <h1 class="text-2xl font-bold text-start">{language.imageGeneration}</h1>
            </button>
            <button class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow hover:ring-1" on:click={() => {
                PlaygroundStore.set(8)
            }}>
                <h1 class="text-2xl font-bold text-start">Parser</h1>
            </button>
            <button class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow hover:ring-1" on:click={() => {
                PlaygroundStore.set(101)
            }}>
                <h1 class="text-2xl font-bold text-start">{language.promptConvertion}</h1>
            </button>
            <button class="bg-darkbg rounded-md p-6 flex flex-col transition-shadow hover:ring-1" on:click={() => {
                easterEggTouch += 1
            }}>
                <h1 class="text-2xl font-bold text-start">
                    {#if easterEggTouch <= 10}
                        🤗 Coming soon
                    {:else if easterEggTouch <= 30}
                        🤗 Still coming soon
                    {:else if easterEggTouch <= 50}
                        😇 Really soon
                    {/if}
                </h1>
            </button>
        </div>
    {:else}
        {#if $SizeStore.w < 1024}
            <div class="mt-14"></div>
        {/if}
        <div class="w-full max-w-4xl flex flex-col p-2">
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
                <PlaygroundImageGen/>
            {/if}  
            {#if $PlaygroundStore === 8}
                <PlaygroundParser/>
            {/if}  
            {#if $PlaygroundStore === 101}
                <ToolConvertion/>
            {/if}  
        </div>
    {/if}
</div>
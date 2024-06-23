<script lang="ts">
    import { getFileSrc } from "src/ts/storage/globalApi";
    import { CurrentCharacter } from "src/ts/storage/database";
    import { sleep } from "src/ts/util";
    import { onDestroy, onMount } from "svelte";

    const style:number = 1
    export let text:string = "Hello World, this is a test, so I can see if this works. I hope it does, because I don't want to have to rewrite this. I hope this is long enough to test the text wrapping. Lonnnnnng String "
    let renderedText = ''
    let alive = true

    export const forceRender = () => {
        renderedText = text
    }

    onMount(async () => {
        while(alive){
            if(renderedText.length >= text.length){
                if(renderedText !== text){
                    renderedText = ''
                }
                else{
                    renderedText = text
                }
            }
            if(renderedText.length < text.length){
                renderedText += text[renderedText.length]
            }
            await sleep(10)
        }
    })

    onDestroy(() => {
        renderedText = ''
        alive = false
    })
</script>

{#if $CurrentCharacter.type === 'character' && $CurrentCharacter.emotionImages[0]}
    {#await getFileSrc($CurrentCharacter.emotionImages[0][1]) then imglink}
        <div class="w-full absolute top-0 h-full bottom-0 justify-center flex">
            <img src={imglink} alt="character">
        </div>
    {/await}
{/if}
{#if style === 0}
    <div class="w-full flex justify-center absolute bottom-5">
        <div class="w-3xl max-w-full flex flex-col">

            <div class="bg-slate-700 h-12 rounded-lg border-slate-500 border-1 w-40 mb-2 bg-opacity-90 text-center flex items-center justify-center">
                <span class="font-bold p-2">{$CurrentCharacter.name}</span>
            </div>
            <div class="bg-slate-700 h-40 rounded-lg border-slate-500 border-1 w-full bg-opacity-90 text-justify p-4">
                Test
            </div>
        </div>
    </div>
{:else}
    <div class="w-full flex justify-center absolute bottom-5">
        <div class="w-3xl max-w-full flex flex-col text-black">

            <div class="bg-neutral-200 h-12 rounded-lg border-pink-900 border-1 w-48 mb-2 text-center relative top-6 left-4 text-lg">
                <div class="border-pink-300 border-4 h-full rounded-lg">
                    <div class="border-pink-900 border-1 text-justify h-full rounded-lg flex items-center justify-center">
                        <span class="font-bold p-2">{$CurrentCharacter.name}</span>
                    </div>
                </div>
            </div>
            <div class="bg-neutral-200 h-40 rounded-lg border-pink-900 border-1 w-full">
                <div class="border-pink-300 border-4 h-full rounded-lg">
                    <div class="border-pink-900 border-1 px-4 pt-6 pb-4 h-full rounded-lg tracking-normal text-clip">
                        {renderedText}
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}
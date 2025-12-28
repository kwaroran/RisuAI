<script lang="ts">

    import { type hubType } from "src/ts/characterCards";
    interface Props {
        card: hubType;
        onclick?: (event: MouseEvent & {
            currentTarget: EventTarget & HTMLButtonElement;
        }) => any
    }

    let { card, onclick }: Props = $props();
</script>

<button class="border p-4 flex hover:ring-2 rounded-md transition items-start justify-start" onclick={onclick}>
    <div class="bg-white rounded-md shadow-md p-4 relative w-32 h-48 min-w-32 min-h-48">
        {#key card.img}
            <img src={"https://sv.risuai.xyz/resource/" + card.img} alt={card.name} class="absolute inset-0 w-full h-full object-cover rounded-md">
        {/key}
    </div>
    <div class="ml-4 mt-4 flex flex-col items-start text-start">
        <h2 class="text-lg font-semibold break-all line-clamp-1">{card.name}</h2>
        {#if card.hidden}
            <span class="text-sm text-red-500 line-clamp-1 text-wrap max-w-full break-all whitespace-pre-wrap">Private</span>
        {:else if card.authorname}
            <span class="text-sm text-gray-500 line-clamp-1 text-wrap max-w-full break-all whitespace-pre-wrap">By {card.authorname}</span>
        {/if}
        <p class="text-xs text-gray-500 line-clamp-2 text-wrap max-w-full wrap-break-word whitespace-pre-wrap mt-2">{card.desc}</p>
        <div class="mt-2 w-full flex flex-wrap">
            {#each card.tags as tag}
                {#if tag}
                    <div class="bg-gray-200 text-gray-800 text-xs font-semibold rounded-full p-2 mt-2 ml-2">{tag}</div>
                {/if}
            {/each}
        </div>
    </div>
</button>
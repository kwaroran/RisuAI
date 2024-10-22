<script lang="ts">
    import { stopPropagation } from 'svelte/legacy';

    import { BookIcon, ImageIcon, SmileIcon } from "lucide-svelte";
    import { alertNormal } from "src/ts/alert";
    import { hubURL, type hubType } from "src/ts/characterCards";
    import { trimNonLatin } from "src/ts/storage/globalApi";
    import { parseMultilangString } from "src/ts/util";

    interface Props {
        onClick?: any;
        chara: hubType;
    }

    let { onClick = () => {}, chara }: Props = $props();

</script>


<button class="bg-darkbg rounded-lg p-4 flex flex-col hover:bg-selected transition-colors relative lg:w-96 w-full items-start" onclick={onClick}>
    <div class="flex gap-2 w-full">
    <img class="w-20 min-w-20 h-20 sm:h-28 sm:w-28 rounded-md object-top object-cover" alt={chara.name} src={`${hubURL}/resource/` + chara.img}>
    <div class="flex flex-col flex-grow min-w-0">
        <span class="text-textcolor text-lg min-w-0 max-w-full text-ellipsis whitespace-nowrap overflow-hidden text-start">{chara.name}</span>
        <span class="text-textcolor2 text-xs min-w-0 max-w-full text-ellipsis break-words max-h-8 whitespace-nowrap overflow-hidden text-start">{parseMultilangString(chara.desc).en ?? parseMultilangString(chara.desc).xx}</span>
        <div class="flex flex-wrap">
            {#each chara.tags as tag, i}
                {#if i < 4}
                    <div class="text-xs p-1 text-blue-400">{tag}</div>
                {:else if i === 4}
                    <div class="text-xs p-1 text-blue-400">...</div>
                {/if}
            {/each}
        </div>
        <div class="flex-grow"></div>
        <div class="flex flex-wrap w-full flex-row-reverse gap-1">
            {#if chara.hasEmotion}
                <button class="text-textcolor2 hover:text-green-500 transition-colors" onclick={stopPropagation(() => {alertNormal("This character includes emotion images")})}><SmileIcon /></button>
            {/if}
            {#if chara.hasAsset}
                <button class="text-textcolor2 hover:text-green-500 transition-colors" onclick={stopPropagation(() => {alertNormal("This character includes additional assets")})}><ImageIcon /></button>
            {/if}
            {#if chara.hasLore}
                <button class="text-textcolor2 hover:text-green-500 transition-colors" onclick={stopPropagation(() => {alertNormal("This character includes lorebook")})}><BookIcon /></button>
            {/if}
        </div>
    </div>
</div></button>
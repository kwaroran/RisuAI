<script lang="ts">
    import { BookIcon, ImageIcon, SmileIcon } from "@lucide/svelte";
    import { alertNormal } from "src/ts/alert";
    import { hubURL, type hubType } from "src/ts/characterCards";
    import { DBState } from "src/ts/stores.svelte";
    import { parseMultilangString } from "src/ts/util";

    interface Props {
        onClick?: any;
        chara: hubType;
    }

    let { onClick = () => {}, chara }: Props = $props();

</script>


<button class="bg-darkbg rounded-lg p-4 flex flex-col hover:bg-selected transition-colors relative lg:w-96 w-full items-start" onclick={onClick}>
    <div class="flex gap-2 w-full">
    {#if DBState.db.hideAllImages}
        <div class="w-20 min-w-20 h-20 sm:h-28 sm:w-28 rounded-md bg-darkbutton flex items-center justify-center text-textcolor2">
            <span class="text-4xl">?</span>
        </div>
    {:else}
        <img class="w-20 min-w-20 h-20 sm:h-28 sm:w-28 rounded-md object-top object-cover" alt={chara.name} src={`${hubURL}/resource/` + chara.img}>
    {/if}
    <div class="flex flex-col grow min-w-0">
        <span class="text-textcolor text-lg min-w-0 max-w-full text-ellipsis whitespace-nowrap overflow-hidden text-start">{chara.name}</span>
        <span class="text-textcolor2 text-xs min-w-0 max-w-full text-ellipsis wrap-break-word max-h-8 whitespace-nowrap overflow-hidden text-start">{parseMultilangString(chara.desc).en ?? parseMultilangString(chara.desc).xx}</span>
        <div class="flex flex-wrap">
            {#each chara.tags as tag, i}
                {#if i < 4}
                    <div class="text-xs p-1 text-blue-400">{tag}</div>
                {:else if i === 4}
                    <div class="text-xs p-1 text-blue-400">...</div>
                {/if}
            {/each}
        </div>
        <div class="grow"></div>
        <div class="flex flex-wrap w-full flex-row-reverse gap-1">
            {#if chara.hasEmotion}
                <div class="text-textcolor2 hover:text-green-500 transition-colors" role="button" tabindex="0" onclick={((e) => {
                    e.stopPropagation()
                    alertNormal("This character includes emotion images")
                })} onkeydown={(e) => {}}><SmileIcon /></div>
            {/if}
            {#if chara.hasAsset}
                <div class="text-textcolor2 hover:text-green-500 transition-colors" role="button" tabindex="0" onclick={((e) => {
                    e.stopPropagation()
                    alertNormal("This character includes additional assets")
                })} onkeydown={(e) => {}}><ImageIcon /></div>
            {/if}
            {#if chara.hasLore}
                <div class="text-textcolor2 hover:text-green-500 transition-colors" role="button" tabindex="0" onclick={((e) => {
                    e.stopPropagation()
                    alertNormal("This character includes lorebook")
                })} onkeydown={(e) => {}}><BookIcon /></div>
            {/if}
        </div>
    </div>
</div></button>
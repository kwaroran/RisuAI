<script lang="ts">
    import { XIcon } from '@lucide/svelte';
    import { getChatBranches } from 'src/ts/gui/branches';
    import { getCurrentCharacter } from 'src/ts/storage/database.svelte';
    import { alertStore } from 'src/ts/stores.svelte';

    let branchHover: null | {
        x: number;
        y: number;
        content: string;
    } = $state(null);
</script>

<div class="absolute z-50 flex h-full w-full items-center justify-center overflow-x-auto overflow-y-auto bg-black/80">
    {#if branchHover !== null}
        <div
            class="absolute z-30 rounded-md border border-darkborderc bg-darkbg p-4 whitespace-pre-wrap text-textcolor"
            style="top: {branchHover.y * 80 + 24}px; left: {(branchHover.x + 1) * 80 + 24}px"
        >
            {branchHover.content}
        </div>
    {/if}

    <div class="x-50 absolute top-2 right-2">
        <button
            class="rounded-md border border-darkborderc bg-darkbg p-2"
            onclick={() => {
                alertStore.set({
                    type: 'none',
                    msg: '',
                });
            }}
        >
            <XIcon />
        </button>
    </div>

    {#each getChatBranches() as obj}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
            role="table"
            class="peer absolute z-20 flex h-12 w-12 items-center justify-center overflow-y-auto rounded-full border border-darkborderc bg-bgcolor"
            style="top: {obj.y * 80 + 24}px; left: {obj.x * 80 + 24}px"
            onmouseenter={() => {
                if (branchHover === null) {
                    const char = getCurrentCharacter();
                    branchHover = {
                        x: obj.x,
                        y: obj.y,
                        content: char.chats[obj.chatId].message[obj.y - 1].data,
                    };
                }
            }}
            onclick={() => {
                if (branchHover === null) {
                    const char = getCurrentCharacter();
                    branchHover = {
                        x: obj.x,
                        y: obj.y,
                        content: char.chats[obj.chatId].message[obj.y - 1].data,
                    };
                }
            }}
            onmouseleave={() => {
                branchHover = null;
            }}
        >
        </div>
        {#if obj.connectX === obj.x}
            {#if obj.multiChild}
                <div class="absolute h-20 w-0 border-x border-x-red-500" style="top: {(obj.y - 1) * 80 + 24}px; left: {obj.x * 80 + 45}px">
                </div>
            {:else}
                <div class="absolute h-20 w-0 border-x border-x-blue-500" style="top: {(obj.y - 1) * 80 + 24}px; left: {obj.x * 80 + 45}px">
                </div>
            {/if}
        {:else if obj.connectX !== -1}
            <div class="absolute h-10 w-0 border-x border-x-red-500" style="top: {obj.y * 80}px; left: {obj.x * 80 + 45}px">
            </div>
            <div
                class="absolute h-0 border-y border-y-red-500"
                style="top: {obj.y * 80}px; left: {obj.connectX * 80 + 46}px"
                style:width={Math.abs((obj.x - obj.connectX) * 80) + 'px'}
            >
            </div>
        {/if}
    {/each}
</div>

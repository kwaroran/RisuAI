<script lang="ts">
    import { downloadRisuHub, getRisuHub } from "src/ts/characterCards";
    import LiteCardIcon from "./lib/LiteUI/LiteCardIcon.svelte";
  import { selectedCharID } from "./ts/stores";
  import DefaultChatScreen from "./lib/ChatScreens/DefaultChatScreen.svelte";
</script>

<div class="w-full h-full bg-white text-black flex flex-col overflow-y-auto">
    <div class="bg-blue-500 py-4">
        <div class="container mx-auto flex items-center justify-between">
            <h1 class="text-white text-2xl font-bold flex justify-center ml-4 sm:ml-0">
                <a href="/">Lite Test</a>
            </h1>
            <nav class="mr-4 sm:mr-0">
                <ul class="flex space-x-4">
                    <li><a class="text-white" href="/account">계정</a></li>
                    <!-- <li><a class="text-white">About</a></li>
                    <li><a class="text-white">Contact</a></li> -->
                </ul>
            </nav>
        </div>
    </div>
    {#if $selectedCharID === -1}
    <div class="flex w-full mt-2">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-2 mr-2 flex-1">
            {#await getRisuHub({
                search: '',
                page: 0,
                nsfw: false,
                sort: ''
            })}
                로딩중...
            {:then cards} 
                {#each cards as card}
                    <LiteCardIcon card={card} onclick={async () => {
                        await downloadRisuHub(card.id, {
                            forceRedirect: true
                        })
                    }} />
                {/each}
            {/await}
        </div>
    </div>
    {:else}
        <div class="w-full flex justify-center flex-1">
            <div class="h-full max-w-full" style:width="42rem">
                <DefaultChatScreen customStyle={`backdrop-filter: blur(4px);`}/>
            </div>
        </div>
    {/if}
</div>

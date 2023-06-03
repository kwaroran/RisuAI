<script lang="ts">
    import { downloadRisuHub, getRisuHub, hubURL } from "src/ts/characterCards";
    import Help from "../Others/Help.svelte";
    import { DownloadIcon, FlagIcon } from "lucide-svelte";

    let openedData:null|{
        name:string
        desc: string
        download: number,
        id: string,
        img: string
    } = null

</script>
<div class="w-full flex gap-4 p-2 flex-wrap">
    {#await getRisuHub() then charas}
        {#each charas as chara}
            <button class="bg-darkbg rounded-lg p-4 flex flex-col hover:bg-selected transition-colors relative sm:w-44 w-full items-center" on:click={() => {
                openedData = chara
            }}>
                <div class="flex flex-col">
                    <img class="h-36 w-36 rounded-md" alt={chara.name} src={`${hubURL}/resource/` + chara.img}>
                    <span class="text-white text-lg max-w-36 text-ellipsis whitespace-nowrap overflow-hidden">{chara.name}</span>
                    <span class="text-gray-400 text-xs max-w-36 text-ellipsis break-words max-h-8 whitespace-nowrap overflow-hidden">{chara.desc}</span>
                </div>
            </button>
        {/each}
    {/await}
</div>


{#if openedData}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="top-0 left-0 z-50 fixed w-full h-full bg-black bg-opacity-50 flex justify-center items-center" on:click={() => {
        openedData = null
    }}>
        <div class="p-6 max-w-full bg-darkbg rounded-md flex flex-col gap-4 w-2xl overflow-y-auto">
            <div class="w-full flex flex-wrap gap-4">
                <div class="flex flex-col">
                    <img class="h-36 w-36 rounded-md" alt={openedData.name} src={`${hubURL}/resource/` + openedData.img}>
                    <h1 class="text-2xl font-bold max-w-full overflow-hidden whitespace-nowrap text-ellipsis mt-4">{openedData.name}</h1>
                </div>
                <span class="text-gray-400 break-words text-base">{openedData.desc}</span>
            </div>
            <div class="flex flex-row-reverse gap-2">
                <button class="text-gray-400 hover:text-red-500">
                    <FlagIcon />
                </button>
                <button class="text-gray-400 hover:text-green-500" on:click={() => {
                    downloadRisuHub(openedData.id ,openedData.img)
                    openedData = null
                }}>
                    <DownloadIcon />
                </button>
            </div>
        </div>
    </div>

{/if}
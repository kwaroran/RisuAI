<script lang="ts">
    import { downloadRisuHub, getRisuHub, hubURL } from "src/ts/characterCards";
    import { ArrowLeft, ArrowRight, DownloadIcon, FlagIcon, MenuIcon, SearchIcon, XIcon } from "lucide-svelte";
    import { alertConfirm, alertInput, alertNormal } from "src/ts/alert";
  import { parseMarkdownSafe } from "src/ts/parser";
  import { language } from "src/lang";

    let openedData:null|{
        name:string
        desc: string
        download: number,
        id: string,
        img: string,
        tags: string[]
    } = null

    let charas:{
        name:string
        desc: string
        download: number,
        id: string,
        img: string
        tags: string[]
    }[] = []

    let page = 0
    let sort = ''

    let search = ''
    let menuOpen = false
    let nsfw = false

    async function getHub(){
        charas = await getRisuHub({
            search: search,
            page: page,
            nsfw: nsfw,
            sort: sort
        })
    }

    getHub()


</script>
<div class="w-full flex justify-center mt-4">
    <div class="flex w-2xl max-w-full items-center">
        <input class="flex-grow text-xl pl-3 pr-3 rounded-lg bg-darkbg h-16 min-w-0" placeholder="Search" bind:value={search}>
        <button class="bg-darkbg h-14 w-14 min-w-14 rounded-lg ml-2 flex justify-center items-center hover:ring transition-shadow" on:click={() => {
            page = 0
            getHub()
        }}>
            <SearchIcon />
        </button>
        <button class="bg-darkbg h-14 w-14 min-w-14 rounded-lg ml-2 flex justify-center items-center hover:ring transition-shadow" on:click={() => {
            menuOpen = true
        }}>
            <MenuIcon />
        </button>
    </div>
</div>
<div class="w-full mt-2 flex justify-center mb-3 items-center">
    <button class="bg-darkbg p-2 rounded-lg ml-2 flex justify-center items-center hover:bg-selected transition-shadow" class:ring={nsfw} on:click={() => {
        nsfw = !nsfw
        getHub()
    }}>
        {nsfw ? 'NSFW ON': 'NSFW OFF'}
    </button>
    <div class="ml-2 mr-2 h-full border-r border-r-selected"></div>
    <button class="bg-darkbg p-2 rounded-lg ml-2 flex justify-center items-center hover:bg-selected transition-shadow" class:ring={sort === ''} on:click={() => {
        sort = ''
        getHub()
    }}>
        {language.recent}
    </button>
    <button class="bg-darkbg p-2 rounded-lg ml-2 flex justify-center items-center hover:bg-selected transition-shadow" class:ring={sort === 'trending'} on:click={() => {
        sort = 'trending'
        getHub()
    }}>
        {language.trending}
    </button>
    <button class="bg-darkbg p-2 rounded-lg ml-2 flex justify-center items-center hover:bg-selected transition-shadow" class:ring={sort === 'downloads'} on:click={() => {
        sort = 'downloads'
        getHub()
    }}>
        {language.downloads}
    </button>
</div>
<div class="w-full flex gap-4 p-2 flex-wrap justify-center">
    {#key charas}
        {#each charas as chara}
            <button class="bg-darkbg rounded-lg p-4 flex flex-col hover:bg-selected transition-colors relative lg:w-96 w-full items-start" on:click={() => {
                openedData = chara
            }}>
                <div class="flex gap-2 w-full">
                    <img class="w-20 min-w-20 h-20 sm:h-28 sm:w-28 rounded-md object-top object-cover" alt={chara.name} src={`${hubURL}/resource/` + chara.img}>
                    <div class="flex flex-col flex-grow min-w-0">
                        <span class="text-white text-lg min-w-0 max-w-full text-ellipsis whitespace-nowrap overflow-hidden text-start">{chara.name}</span>
                        <span class="text-gray-400 text-xs min-w-0 max-w-full text-ellipsis break-words max-h-8 whitespace-nowrap overflow-hidden text-start">{chara.desc}</span>
                        <div class="flex flex-wrap">
                            {#each chara.tags as tag, i}
                                {#if i < 4}
                                    <div class="text-xs p-1 text-blue-400">{tag}</div>
                                {:else if i === 4}
                                    <div class="text-xs p-1 text-blue-400">...</div>
                                {/if}
                            {/each}
                        </div>
                    </div>
                </div>
            </button>
        {/each}
    {/key}
</div>
<div class="w-full flex justify-center">
    <div class="flex">
        <button class="bg-darkbg h-14 w-14 min-w-14 rounded-lg flex justify-center items-center hover:ring transition-shadow" on:click={() => {
            if(page > 0){
                page -= 1
                getHub()
            }
        }}>
            <ArrowLeft />
        </button>
        <button class="bg-darkbg h-14 w-14 min-w-14 rounded-lg ml-2 flex justify-center items-center transition-shadow">
            <span>{page + 1}</span>
        </button>
        <button class="bg-darkbg h-14 w-14 min-w-14 rounded-lg ml-2 flex justify-center items-center hover:ring transition-shadow" on:click={() => {
            page += 1
            getHub()
        }}>
            <ArrowRight />
        </button>
    </div>
</div>


{#if openedData}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="top-0 left-0 z-50 fixed w-full h-full bg-black bg-opacity-50 flex justify-center items-center" on:click={() => {
        openedData = null
    }}>
        <div class="p-6 max-w-full bg-darkbg rounded-md flex flex-col gap-4 w-2xl overflow-y-auto">
            <div class="w-full flex gap-4 flex-col">
                <h1 class="text-2xl font-bold max-w-full overflow-hidden whitespace-nowrap text-ellipsis">{openedData.name}</h1>
                <div class="flex justify-start gap-4">
                    <img class="h-36 w-36 rounded-md object-top object-cover" alt={openedData.name} src={`${hubURL}/resource/` + openedData.img}>
                    <span class="text-gray-400 break-words text-base chattext prose prose-invert">
                        {#await parseMarkdownSafe(openedData.desc) then msg}
                            {@html msg}                        
                        {/await}
                    </span>
                </div>
                <div class="flex justify-start gap-2">
                    {#each openedData.tags as tag, i}
                        <div class="text-xs p-1 text-blue-400">{tag}</div>
                    {/each}
                </div>
            </div>
            <div class="flex flex-row-reverse gap-2">
                <button class="text-gray-400 hover:text-red-500" on:click|stopPropagation={async () => {
                    const conf = await alertConfirm('Report this character?')
                    if(conf){
                        const report = await alertInput('Write a report text that would be sent to the admin')
                        const da = await fetch(hubURL + '/hub/report', {
                            method: "POST",
                            body: JSON.stringify({
                                id: openedData.id,
                                report: report
                            })
                        })
                        alertNormal(await da.text())
                    }
                }}>
                    <FlagIcon />
                </button>
                <button class="text-gray-400 hover:text-green-500" on:click={() => {
                    downloadRisuHub(openedData.id)
                    openedData = null
                }}>
                    <DownloadIcon />
                </button>
            </div>
        </div>
    </div>

{/if}

{#if menuOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="top-0 left-0 z-50 fixed w-full h-full bg-black bg-opacity-50 flex justify-center items-center" on:click={() => {
        menuOpen = false
    }}>
        <div class="max-w-full bg-darkbg rounded-md flex flex-col gap-4 overflow-y-auto p-4">
            <h1 class="font-bold text-2xl w-full">
                <span>
                    Menu
                </span>
                <button class="float-right text-gray-400 hover:text-green-500" on:click={() => {menuOpen = false}}>
                    <XIcon />
                </button>
            </h1>
            <div class=" mt-2 w-full border-t-2 border-t-bgcolor"></div>
            <button class="w-full hover:bg-selected p-4" on:click|stopPropagation={async () => {
                menuOpen = false
                const id = await alertInput('Import ID')
                downloadRisuHub(id)

            }}>Import Character from ID</button>
        </div>
    </div>
{/if}
<script lang="ts">
    import { downloadRisuHub, getRisuHub, hubURL, type hubType } from "src/ts/characterCards";
    import { ArrowLeft, ArrowRight, BookIcon, DownloadIcon, FlagIcon, MenuIcon, PaperclipIcon, SearchIcon, SmileIcon, TrashIcon, XIcon } from "lucide-svelte";
    import { alertConfirm, alertInput, alertNormal } from "src/ts/alert";
    import { parseMarkdownSafe } from "src/ts/parser";
    import { language } from "src/lang";
    import RisuHubIcon from "./RealmHubIcon.svelte";
    import { DataBase } from "src/ts/storage/database";
    import TextInput from "../GUI/TextInput.svelte";
    import RealmPopUp from "./RealmPopUp.svelte";

    let openedData:null|hubType = null

    let charas:hubType[] = []

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
        <TextInput size="xl" additionalClass="flex-grow" placeholder="Search" bind:value={search} />
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
            <RisuHubIcon onClick={() =>{openedData = chara}} chara={chara} />
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
    <RealmPopUp bind:openedData={openedData} />
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
                <button class="float-right text-textcolor2 hover:text-green-500" on:click={() => {menuOpen = false}}>
                    <XIcon />
                </button>
            </h1>
            <div class=" mt-2 w-full border-t-2 border-t-bgcolor"></div>
            <button class="w-full hover:bg-selected p-4" on:click|stopPropagation={async () => {
                menuOpen = false
                const input = await alertInput('Input URL or ID')
                if(input.startsWith("http")){
                    const url = new URL(input)
                    const id = url.searchParams.get("realm")
                    if(id){
                        downloadRisuHub(id)
                        return
                    }
                }
                const id = input.split("?").at(-1)
                downloadRisuHub(id)

            }}>Import Character from URL or ID</button>
        </div>
    </div>
{/if}
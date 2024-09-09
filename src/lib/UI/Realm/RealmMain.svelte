<script lang="ts">
    import { downloadRisuHub, getRisuHub, hubAdditionalHTML, type hubType } from "src/ts/characterCards";
    import { ArrowLeft, ArrowRight, MenuIcon, SearchIcon, XIcon } from "lucide-svelte";
    import { alertInput } from "src/ts/alert";
    import { language } from "src/lang";
    import RisuHubIcon from "./RealmHubIcon.svelte";
    import TextInput from "../GUI/TextInput.svelte";
    import { MobileGUI, SizeStore } from "src/ts/stores";
    import { Capacitor } from "@capacitor/core";
  import RealmPopUp from "./RealmPopUp.svelte";
  import { googleBuild } from "src/ts/storage/globalApi";
  import { split } from "lodash";

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
<div class="w-full flex justify-center mt-4 mb-2">
    <div class="flex items-stretch w-2xl max-w-full">
        <input bind:value={search} class="peer focus:border-textcolor transition-colors outline-none text-textcolor p-2 min-w-0 border border-r-0 bg-transparent rounded-md rounded-r-none input-text text-xl flex-grow ml-4 border-darkborderc resize-none overflow-y-hidden overflow-x-hidden max-w-full">
            <button
            on:click={() => {
                page = 0
                getHub()
            }}
            class="flex justify-center border-y border-darkborderc items-center text-gray-100 p-3 peer-focus:border-textcolor hover:bg-blue-500 transition-colors"
        >
            <SearchIcon />
        </button>
        <button
            on:click={(e) => {
                menuOpen = true
            }}
            class="peer-focus:border-textcolor mr-2 flex border-y border-r border-darkborderc justify-center items-center text-gray-100 p-3 rounded-r-md hover:bg-blue-500 transition-colors"
        >
            <MenuIcon />
        </button>
    </div>
</div>
{#if $MobileGUI}
<div class="ml-4 flex items-start ">
    <div class="p-2 flex mb-3 overflow-x-auto rounded-lg border-darkborderc border gap-2">
        <button on:click={() => {
            nsfw = !nsfw
            getHub()
        }}>
            {nsfw ? 'NSFW' : 'SFW'}
        </button>
        <div class="h-full border-r border-r-selected"></div>
        <button on:click={() => {
            switch(sort){
                case '':
                    sort = 'trending'
                    break
                case 'trending':
                    sort = 'downloads'
                    break
                case 'downloads':
                    sort = 'random'
                    break
                default:
                    sort = ''
                    break
            }
            getHub()
        }}>
            {
                sort === '' ? language.recent : 
                sort === 'trending' ? language.trending :
                sort === 'downloads' ? language.downloads :
                language.random
            }
        </button>
    </div>
</div>
{:else}
    <div class="w-full p-1 flex mb-3 overflow-x-auto sm:justify-center">
        <button class="bg-darkbg p-2 rounded-lg ml-2 flex justify-center items-center hover:bg-selected transition-shadow" class:ring={nsfw} on:click={() => {
            nsfw = !nsfw
            getHub()
        }}>
            NSFW
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
        <button class="bg-darkbg p-2 rounded-lg ml-2 flex justify-center items-center hover:bg-selected transition-shadow min-w-0 max-w-full" class:ring={sort === 'random'} on:click={() => {
            sort = 'random'
            getHub()
        }}>
            {language.random}
        </button>
    </div>
{/if}
{@html hubAdditionalHTML}
<div class="w-full flex gap-4 p-2 flex-wrap justify-center">
    {#key charas}
        {#each charas as chara}
            <RisuHubIcon onClick={() =>{openedData = chara}} chara={chara} />
        {/each}
    {/key}
</div>
{#if sort !== 'random'}
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
{/if}

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
                    const id = url.searchParams.get("realm") ?? url.searchParams.get("code") ?? input.split("/").at(-1)
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
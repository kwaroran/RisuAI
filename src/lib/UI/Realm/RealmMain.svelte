<script lang="ts">
    import { downloadRisuHub, getRisuHub, hubAdditionalHTML, type hubType } from "src/ts/characterCards";
    import { ArrowLeft, ArrowRight, MenuIcon, SearchIcon, XIcon } from "@lucide/svelte";
    import { alertInput } from "src/ts/alert";
    import { language } from "src/lang";
    import RisuHubIcon from "./RealmHubIcon.svelte";
    import { MobileGUI, RealmInitialOpenChar } from "src/ts/stores.svelte";
    import RealmPopUp from "./RealmPopUp.svelte";

    let openedData:null|hubType = $state(null)

    let charas:hubType[] = $state([])

    let page = $state(0)
    let sort = $state('recommended')

    let search = $state('')
    let menuOpen = $state(false)
    let nsfw = $state(false)

    async function getHub(){
        charas = await getRisuHub({
            search: search,
            page: page,
            nsfw: nsfw,
            sort: sort
        })
    }

    function changeSort(type:string) {
        if(sort === type){
            sort = 'recommended'
        }else{
            sort = type
        }
        page = 0
        return getHub()
    }

    getHub()



    $effect(() => {
        if($RealmInitialOpenChar){
            openedData = $RealmInitialOpenChar
            $RealmInitialOpenChar = null
        }
    })
</script>
<div class="w-full flex justify-center mt-4 mb-2">
    <div class="flex items-stretch w-2xl max-w-full">
        <input bind:value={search} class="peer focus:border-textcolor transition-colors outline-hidden text-textcolor p-2 min-w-0 border border-r-0 bg-transparent rounded-md rounded-r-none input-text text-xl grow ml-4 border-darkborderc resize-none overflow-y-hidden overflow-x-hidden max-w-full">
            <button
            onclick={() => {
                if(sort === 'random' || sort === 'recommended'){
                    sort = ''
                }
                page = 0
                getHub()
            }}
            class="flex justify-center border-y border-darkborderc items-center text-gray-100 p-3 peer-focus:border-textcolor hover:bg-blue-500 transition-colors"
        >
            <SearchIcon />
        </button>
        <button
            onclick={(e) => {
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
        <button onclick={() => {
            nsfw = !nsfw
            getHub()
        }}>
            {nsfw ? 'NSFW' : 'SFW'}
        </button>
        <div class="h-full border-r border-r-selected"></div>
        <button onclick={() => {
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
                sort === 'recommended' ? language.recommended :
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
        <button class="bg-darkbg p-2 rounded-lg ml-2 flex justify-center items-center hover:bg-selected transition-shadow" class:ring-3={nsfw} onclick={() => {
            nsfw = !nsfw
            getHub()
        }}>
            NSFW
        </button>
        <div class="ml-2 mr-2 h-full border-r border-r-selected"></div>
        <button class="bg-darkbg p-2 rounded-lg ml-2 flex justify-center items-center hover:bg-selected transition-shadow" class:ring-3={sort === ''} onclick={() => {
            changeSort('')
        }}>
            {language.recent}
        </button>
        <button class="bg-darkbg p-2 rounded-lg ml-2 flex justify-center items-center hover:bg-selected transition-shadow" class:ring-3={sort === 'trending'} onclick={() => {
            changeSort('trending')
        }}>
            {language.trending}
        </button>
        <button class="bg-darkbg p-2 rounded-lg ml-2 flex justify-center items-center hover:bg-selected transition-shadow" class:ring-3={sort === 'downloads'} onclick={() => {
            changeSort('downloads')
        }}>
            {language.downloads}
        </button>
        <button class="bg-darkbg p-2 rounded-lg ml-2 flex justify-center items-center hover:bg-selected transition-shadow min-w-0 max-w-full" class:ring-3={sort === 'random'} onclick={() => {
            changeSort('random')
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
{#if sort !== 'random' && sort !== 'recommended'}
    <div class="w-full flex justify-center">
        <div class="flex">
            <button class="bg-darkbg h-14 w-14 min-w-14 rounded-lg flex justify-center items-center hover:ring-3 transition-shadow" onclick={() => {
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
            <button class="bg-darkbg h-14 w-14 min-w-14 rounded-lg ml-2 flex justify-center items-center hover:ring-3 transition-shadow" onclick={() => {
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
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="top-0 left-0 z-50 fixed w-full h-full bg-black/50 flex justify-center items-center" role="button" tabindex="0" onclick={() => {
        menuOpen = false
    }}>
        <div class="max-w-full bg-darkbg rounded-md flex flex-col gap-4 overflow-y-auto p-4">
            <h1 class="font-bold text-2xl w-full">
                <span>
                    Menu
                </span>
                <button class="float-right text-textcolor2 hover:text-green-500" onclick={() => {menuOpen = false}}>
                    <XIcon />
                </button>
            </h1>
            <div class=" mt-2 w-full border-t-2 border-t-bgcolor"></div>
            <button class="w-full hover:bg-selected p-4" onclick={(async (e) => {
                e.stopPropagation()
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

            })}>Import Character from URL or ID</button>
        </div>
    </div>
{/if}
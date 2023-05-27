<script>
    import { alertConfirm, alertError } from "../../ts/alert";
    import { language } from "../../lang";
    import { DataBase } from "../../ts/storage/database";
    import { EditIcon, PlusIcon, TrashIcon, XIcon } from "lucide-svelte";
    let editMode = false
    export let close = () => {}
</script>

<div class="absolute w-full h-full z-40 bg-black bg-opacity-50 flex justify-center items-center">
    <div class="bg-darkbg p-4 break-any rounded-md flex flex-col max-w-3xl w-96 max-h-full overflow-y-auto">
        <div class="flex items-center text-neutral-200 mb-4">
            <h2 class="mt-0 mb-0">{language.loreBook}</h2>
            <div class="flex-grow flex justify-end">
                <button class="text-gray-500 hover:text-green-500 mr-2 cursor-pointer items-center" on:click={close}>
                    <XIcon size={24}/>
                </button>
            </div>
        </div>
        {#each $DataBase.loreBook as lore, ind}
            <button on:click={() => {
                if(!editMode){
                    $DataBase.loreBookPage = ind
                }
            }} class="flex items-center text-neutral-200 border-t-1 border-solid border-0 border-gray-600 p-2 cursor-pointer" class:bg-selected={ind === $DataBase.loreBookPage}>
                {#if editMode}
                    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" bind:value={$DataBase.loreBook[ind].name} placeholder="string">
                {:else}
                    <span>{lore.name}</span>
                {/if}
                <div class="flex-grow flex justify-end">
                    <button class="text-gray-500 hover:text-green-500 cursor-pointer" on:click={async (e) => {
                        e.stopPropagation()
                        if($DataBase.loreBook.length === 1){
                            return
                        }
                        const d = await alertConfirm(`${language.removeConfirm}${lore.name}`)
                        if(d){
                            $DataBase.loreBookPage = 0
                            let loreBook = $DataBase.loreBook
                            loreBook.splice(ind, 1)
                            $DataBase.loreBook = loreBook
                        }
                    }}>
                        <TrashIcon size={18}/>
                    </button>
                </div>
            </button>
        {/each}
        <div class="flex mt-2 items-center">
            <button class="text-gray-500 hover:text-green-500 cursor-pointer mr-1" on:click={() => {
                let loreBooks = $DataBase.loreBook
                let newLoreBook = {
                    name: `New LoreBook`,
                    data: []
                }
                loreBooks.push(newLoreBook)

                $DataBase.loreBook = loreBooks
            }}>
                <PlusIcon/>
            </button>
            <button class="text-gray-500 hover:text-green-500 cursor-pointer" on:click={() => {
                editMode = !editMode
            }}>
                <EditIcon size={18}/>
            </button>
        </div>
    </div>
</div>

<style>
    .break-any{
        word-break: normal;
        overflow-wrap: anywhere;
    }
</style>
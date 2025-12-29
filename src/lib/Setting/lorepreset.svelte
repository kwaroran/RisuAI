<script>
    import { alertConfirm } from "../../ts/alert";
    import { language } from "../../lang";
    
    import { DBState } from 'src/ts/stores.svelte';
    import { SquarePenIcon, PlusIcon, TrashIcon, XIcon } from "@lucide/svelte";
    import TextInput from "../UI/GUI/TextInput.svelte";
    let editMode = $state(false)
    /** @type {{close?: any}} */
    let { close = () => {} } = $props();
</script>

<div class="absolute w-full h-full z-40 bg-black/50 flex justify-center items-center">
    <div class="bg-darkbg p-4 break-any rounded-md flex flex-col max-w-3xl w-96 max-h-full overflow-y-auto">
        <div class="flex items-center text-textcolor mb-4">
            <h2 class="mt-0 mb-0">{language.loreBook}</h2>
            <div class="grow flex justify-end">
                <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer items-center" onclick={close}>
                    <XIcon size={24}/>
                </button>
            </div>
        </div>
        {#each DBState.db.loreBook as lore, ind}
            <button onclick={() => {
                if(!editMode){
                    DBState.db.loreBookPage = ind
                }
            }} class="flex items-center text-textcolor border-t-1 border-solid border-0 border-darkborderc p-2 cursor-pointer" class:bg-selected={ind === DBState.db.loreBookPage}>
                {#if editMode}
                    <TextInput bind:value={DBState.db.loreBook[ind].name} placeholder="string" padding={false}/>
                {:else}
                    <span>{lore.name}</span>
                {/if}
                <div class="grow flex justify-end">
                    <div class="text-textcolor2 hover:text-green-500 cursor-pointer" role="button" tabindex="0" onclick={async (e) => {
                        e.stopPropagation()
                        if(DBState.db.loreBook.length === 1){
                            return
                        }
                        const d = await alertConfirm(`${language.removeConfirm}${lore.name}`)
                        if(d){
                            DBState.db.loreBookPage = 0
                            let loreBook = DBState.db.loreBook
                            loreBook.splice(ind, 1)
                            DBState.db.loreBook = loreBook
                        }
                    }} onkeydown={(e) => {
                        if(e.key === 'Enter'){
                            e.currentTarget.click()
                        }
                    }}>
                        <TrashIcon size={18}/>
                    </div>
                </div>
            </button>
        {/each}
        <div class="flex mt-2 items-center">
            <button class="text-textcolor2 hover:text-green-500 cursor-pointer mr-1" onclick={() => {
                let loreBooks = DBState.db.loreBook
                let newLoreBook = {
                    name: `New LoreBook`,
                    data: []
                }
                loreBooks.push(newLoreBook)

                DBState.db.loreBook = loreBooks
            }}>
                <PlusIcon/>
            </button>
            <button class="text-textcolor2 hover:text-green-500 cursor-pointer" onclick={() => {
                editMode = !editMode
            }}>
                <SquarePenIcon size={18}/>
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
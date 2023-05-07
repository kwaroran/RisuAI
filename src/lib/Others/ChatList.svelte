<script>
    import { alertConfirm, alertError } from "../../ts/alert";
    import { language } from "../../lang";
    import { DataBase } from "../../ts/database";
    import { selectedCharID } from "../../ts/stores";
    import { DownloadIcon, EditIcon, FolderUpIcon, PlusIcon, TrashIcon, XIcon } from "lucide-svelte";
    import { exportChat, importChat } from "../../ts/characters";
    import { findCharacterbyId } from "../../ts/util";

    let editMode = false
    export let close = () => {}
</script>

<div class="absolute w-full h-full z-40 bg-black bg-opacity-50 flex justify-center items-center">
    <div class="bg-darkbg p-4 break-any rounded-md flex flex-col max-w-3xl w-72">
        <div class="flex items-center text-neutral-200 mb-4">
            <h2 class="mt-0 mb-0">{language.chatList}</h2>
            <div class="flex-grow flex justify-end">
                <button class="text-gray-500 hover:text-green-500 mr-2 cursor-pointer items-center" on:click={close}>
                    <XIcon size={24}/>
                </button>
            </div>
        </div>
        {#each $DataBase.characters[$selectedCharID].chats as chat, i}
            <button on:click={() => {
                if(!editMode){
                    $DataBase.characters[$selectedCharID].chatPage = i
                     close()
                }
            }} class="flex items-center text-neutral-200 border-t-1 border-solid border-0 border-gray-600 p-2 cursor-pointer" class:bg-selected={i === $DataBase.characters[$selectedCharID].chatPage}>
                {#if editMode}
                    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" bind:value={$DataBase.characters[$selectedCharID].chats[i].name} placeholder="string">
                {:else}
                    <span>{chat.name}</span>
                {/if}
                <div class="flex-grow flex justify-end">
                    <button class="text-gray-500 hover:text-green-500 mr-2 cursor-pointer" on:click={async (e) => {
                        e.stopPropagation()
                        exportChat(i)
                    }}>
                        <DownloadIcon size={18}/>
                    </button>
                    <button class="text-gray-500 hover:text-green-500 cursor-pointer" on:click={async (e) => {
                        e.stopPropagation()
                        if($DataBase.characters[$selectedCharID].chats.length === 1){
                            alertError(language.errors.onlyOneChat)
                            return
                        }
                        const d = await alertConfirm(`${language.removeConfirm}${chat.name}`)
                        if(d){
                            $DataBase.characters[$selectedCharID].chatPage = 0
                            let chats = $DataBase.characters[$selectedCharID].chats
                            chats.splice(i, 1)
                            $DataBase.characters[$selectedCharID].chats = chats
                        }
                    }}>
                        <TrashIcon size={18}/>
                    </button>
                </div>
            </button>
        {/each}
        <div class="flex mt-2 items-center">
            <button class="text-gray-500 hover:text-green-500 cursor-pointer mr-1" on:click={() => {
                const cha = $DataBase.characters[$selectedCharID]
                const len = $DataBase.characters[$selectedCharID].chats.length
                let chats = $DataBase.characters[$selectedCharID].chats
                chats.push({
                    message:[], note:'', name:`New Chat ${len + 1}`, localLore:[]
                })
                if(cha.type === 'group'){
                    cha.characters.map((c) => {
                        chats[len].message.push({
                            saying: c,
                            role: 'char',
                            data: findCharacterbyId(c).firstMessage
                        })
                    })
                }
                $DataBase.characters[$selectedCharID].chats = chats
                $DataBase.characters[$selectedCharID].chatPage = len
                close()
            }}>
                <PlusIcon/>
            </button>
            <button class="text-gray-500 hover:text-green-500 mr-2 cursor-pointer" on:click={() => {
                importChat()
            }}>
                <FolderUpIcon size={18}/>
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
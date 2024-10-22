<script>
    import { alertConfirm, alertError } from "../../ts/alert";
    import { language } from "../../lang";
    import { DataBase } from "../../ts/storage/database";
    import { ReloadGUIPointer, selectedCharID } from "../../ts/stores";
    import { DownloadIcon, EditIcon, FolderUpIcon, PlusIcon, TrashIcon, XIcon } from "lucide-svelte";
    import { exportChat, importChat } from "../../ts/characters";
    import { findCharacterbyId } from "../../ts/util";
    import TextInput from "../UI/GUI/TextInput.svelte";

    let editMode = $state(false)
    /** @type {{close?: any}} */
    let { close = () => {} } = $props();
</script>

<div class="absolute w-full h-full z-40 bg-black bg-opacity-50 flex justify-center items-center">
    <div class="bg-darkbg p-4 break-any rounded-md flex flex-col max-w-3xl w-72 max-h-full overflow-y-auto">
        <div class="flex items-center text-textcolor mb-4">
            <h2 class="mt-0 mb-0">{language.chatList}</h2>
            <div class="flex-grow flex justify-end">
                <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer items-center" onclick={close}>
                    <XIcon size={24}/>
                </button>
            </div>
        </div>
        {#each $DataBase.characters[$selectedCharID].chats as chat, i}
            <button onclick={() => {
                if(!editMode){
                    $DataBase.characters[$selectedCharID].chatPage = i
                     close()
                }
            }} class="flex items-center text-textcolor border-t-1 border-solid border-0 border-darkborderc p-2 cursor-pointer" class:bg-selected={i === $DataBase.characters[$selectedCharID].chatPage}>
                {#if editMode}
                    <TextInput bind:value={$DataBase.characters[$selectedCharID].chats[i].name} padding={false}/>
                {:else}
                    <span>{chat.name}</span>
                {/if}
                <div class="flex-grow flex justify-end">
                    <div class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer" onclick={async (e) => {
                        e.stopPropagation()
                        exportChat(i)
                    }}>
                        <DownloadIcon size={18}/>
                    </div>
                    <div class="text-textcolor2 hover:text-green-500 cursor-pointer" onclick={async (e) => {
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
                    </div>
                </div>
            </button>
        {/each}
        <div class="flex mt-2 items-center">
            <button class="text-textcolor2 hover:text-green-500 cursor-pointer mr-1" onclick={() => {
                const cha = $DataBase.characters[$selectedCharID]
                const len = $DataBase.characters[$selectedCharID].chats.length
                let chats = $DataBase.characters[$selectedCharID].chats
                chats.unshift({
                    message:[], note:'', name:`New Chat ${len + 1}`, localLore:[], fmIndex: -1
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
                $ReloadGUIPointer += 1
                $DataBase.characters[$selectedCharID].chatPage = len
                close()
            }}>
                <PlusIcon/>
            </button>
            <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer" onclick={() => {
                importChat()
            }}>
                <FolderUpIcon size={18}/>
            </button>
            <button class="text-textcolor2 hover:text-green-500 cursor-pointer" onclick={() => {
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
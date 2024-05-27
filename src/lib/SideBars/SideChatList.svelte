<script lang="ts">
    import type { character, groupChat } from "src/ts/storage/database";
    import { DataBase } from "src/ts/storage/database";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import { DownloadIcon, PencilIcon, FolderUpIcon, MenuIcon, TrashIcon } from "lucide-svelte";
    import { exportChat, importChat } from "src/ts/characters";
    import { alertConfirm, alertError, alertSelect } from "src/ts/alert";
    import { language } from "src/lang";
    import Button from "../UI/GUI/Button.svelte";
    import { findCharacterbyId, parseKeyValue } from "src/ts/util";
    import CheckInput from "../UI/GUI/CheckInput.svelte";
    import { createMultiuserRoom } from "src/ts/sync/multiuser";
    import { CurrentCharacter } from "src/ts/stores";
    export let chara:character|groupChat
    let editMode = false
</script>
<div class="flex flex-col w-full h-[calc(100%-2rem)] max-h-[calc(100%-2rem)]">

    <Button className="relative bottom-2" on:click={() => {
        const cha = chara
        const len = chara.chats.length
        let chats = chara.chats
        chats.unshift({
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
        chara.chats = chats
        chara.chatPage = 0
    }}>New Chat</Button>
    <div class="flex flex-col w-full mt-2 overflow-y-auto flex-grow">
    
        {#each chara.chats as chat, i}
        <button on:click={() => {
            if(!editMode){
                chara.chatPage = i
            }
        }} class="flex items-center text-textcolor  border-solid border-0 border-darkborderc p-2 cursor-pointer rounded-md"class:bg-selected={i === chara.chatPage}>
            {#if editMode}
                <TextInput bind:value={chara.chats[i].name} className="flex-grow min-w-0" padding={false}/>
            {:else}
                <span>{chat.name}</span>
            {/if}
            <div class="flex-grow flex justify-end">
                {#if $DataBase.tpo}
                    <button class="text-textcolor2 hover:text-green-500 mr-1 cursor-pointer" on:click={async () => {
                        const multiuser = parseInt(await alertSelect(["Open Multiuser Room"]))
                        if(multiuser === 0){
                            createMultiuserRoom()
                        }
                    }}>
                        <MenuIcon size={18}/>
                    </button>
                {/if}
                <button class="text-textcolor2 hover:text-green-500 mr-1 cursor-pointer" on:click={() => {
                    editMode = !editMode
                }}>
                    <PencilIcon size={18}/>
                </button>
                <button class="text-textcolor2 hover:text-green-500 mr-1 cursor-pointer" on:click={async (e) => {
                    e.stopPropagation()
                    exportChat(i)
                }}>
                    <DownloadIcon size={18}/>
                </button>
                <button class="text-textcolor2 hover:text-green-500 cursor-pointer" on:click={async (e) => {
                    e.stopPropagation()
                    if(chara.chats.length === 1){
                        alertError(language.errors.onlyOneChat)
                        return
                    }
                    const d = await alertConfirm(`${language.removeConfirm}${chat.name}`)
                    if(d){
                        chara.chatPage = 0
                        let chats = chara.chats
                        chats.splice(i, 1)
                        chara.chats = chats
                    }
                }}>
                    <TrashIcon size={18}/>
                </button>
            </div>
        </button>
    {/each}
    </div>
    
    <div class="border-t border-selected mt-2">
        <div class="flex mt-2 ml-2 items-center">
            <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer" on:click={() => {
                importChat()
            }}>
                <FolderUpIcon size={18}/>
            </button>
            <button class="text-textcolor2 hover:text-green-500 cursor-pointer" on:click={() => {
                editMode = !editMode
            }}>
                <PencilIcon size={18}/>
            </button>
        </div>

        {#if $CurrentCharacter?.chaId !== '§playground'}
            <div class="flex mt-2 items-center">
                <CheckInput bind:check={$DataBase.jailbreakToggle} name={language.jailbreakToggle}/>
            </div>
            
            {#each parseKeyValue($DataBase.customPromptTemplateToggle) as toggle}
                <div class="flex mt-2 items-center">
                    <CheckInput check={$DataBase.globalChatVariables[`toggle_${toggle[0]}`] === '1'} name={toggle[1]} onChange={() => {
                        $DataBase.globalChatVariables[`toggle_${toggle[0]}`] = $DataBase.globalChatVariables[`toggle_${toggle[0]}`] === '1' ? '0' : '1'
                    }} />
                </div>
            {/each}

            {#if $DataBase.supaMemoryType !== 'none' || $DataBase.hanuraiEnable}
                {#if $DataBase.hanuraiEnable}
                    <div class="flex mt-2 items-center">
                        <CheckInput bind:check={chara.supaMemory} name={ language.hanuraiMemory}/>
                    </div>
                {:else if $DataBase.hypaMemory}
                    <div class="flex mt-2 items-center">
                        <CheckInput bind:check={chara.supaMemory} name={language.ToggleHypaMemory}/>
                    </div>
                {:else}
                    <div class="flex mt-2 items-center">
                        <CheckInput bind:check={chara.supaMemory} name={language.ToggleSuperMemory}/>
                    </div>
                {/if}
            {/if}
        {/if}
    </div>

    {#if chara.type === 'group'}
        <div class="flex mt-2 items-center">
            <CheckInput bind:check={chara.orderByOrder} name={language.orderByOrder}/>
        </div>
    {/if}
</div>
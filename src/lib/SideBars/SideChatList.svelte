<script lang="ts">
    import type { character, groupChat } from "src/ts/storage/database";
    import { DataBase } from "src/ts/storage/database";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import { DownloadIcon, EditIcon, TrashIcon } from "lucide-svelte";
    import { exportChat } from "src/ts/characters";
    import { alertConfirm, alertError } from "src/ts/alert";
    import { language } from "src/lang";
    import Button from "../UI/GUI/Button.svelte";
    import { findCharacterbyId } from "src/ts/util";
    import CheckInput from "../UI/GUI/CheckInput.svelte";
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
                <TextInput bind:value={chara.chats[i].name} additionalClass="flex-grow min-w-0" padding={false}/>
            {:else}
                <span>{chat.name}</span>
            {/if}
            <div class="flex-grow flex justify-end">
                <button class="text-textcolor2 hover:text-green-500 mr-1 cursor-pointer" on:click={() => {
                    editMode = !editMode
                }}>
                    <EditIcon size={18}/>
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
        <div class="flex mt-2 items-center">
            <CheckInput bind:check={$DataBase.jailbreakToggle} name={language.jailbreakToggle}/>
        </div>
        
        {#if $DataBase.supaMemoryType !== 'none'}
            {#if $DataBase.hypaMemory}
                <div class="flex mt-2 items-center">
                    <CheckInput bind:check={chara.supaMemory} name={language.ToggleHypaMemory}/>
                </div>
            {:else}
                <div class="flex mt-2 items-center">
                    <CheckInput bind:check={chara.supaMemory} name={language.ToggleSuperMemory}/>
                </div>
            {/if}
        {/if}
    </div>

    {#if chara.type === 'group'}
        <div class="flex mt-2 items-center">
            <CheckInput bind:check={chara.orderByOrder} name={language.orderByOrder}/>
        </div>
    {/if}
</div>
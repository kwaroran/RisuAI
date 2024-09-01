<script lang="ts">
    import { CurrentCharacter, CurrentChat, selectedCharID } from "src/ts/stores";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import NumberInput from "../UI/GUI/NumberInput.svelte";
    import Button from "../UI/GUI/Button.svelte";
    import { getRequestLog } from "src/ts/storage/globalApi";
    import { alertMd } from "src/ts/alert";
    import Arcodion from "../UI/Arcodion.svelte";
    import { getCharToken, getChatToken } from "src/ts/tokenizer";
    import { tokenizePreset } from "src/ts/process/prompt";
    import { DataBase, setDatabase } from "src/ts/storage/database";
  import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
  import { FolderUpIcon, PlusIcon, TrashIcon } from "lucide-svelte";
  import { selectSingleFile } from "src/ts/util";
  import { file } from "jszip";
  import { doingChat, sendChat } from "src/ts/process";

    
    let autopilot = []
</script>

<Arcodion styled name={"Variables"}>
    <div class="rounded-md border border-darkborderc grid grid-cols-2 gap-2 p-2">
        {#if $CurrentChat.scriptstate &&  Object.keys($CurrentChat.scriptstate).length > 0}
            {#each Object.keys($CurrentChat.scriptstate) as key}
                <span>{key}</span>
                {#if typeof $CurrentChat.scriptstate[key] === "object"}
                    <div class="p-2 text-center">Object</div>
                {:else if typeof $CurrentChat.scriptstate[key] === "string"}
                    <TextInput bind:value={$CurrentChat.scriptstate[key]} />
                {:else if typeof $CurrentChat.scriptstate[key] === "number"}
                    <NumberInput bind:value={$CurrentChat.scriptstate[key]} />
                {/if}
            {/each}
        {:else}
            <div class="p-2 text-center">No variables</div>
        {/if}
    </div>
</Arcodion>

<Arcodion styled name={"Tokens"}>
    <div class="rounded-md border border-darkborderc grid grid-cols-2 gap-2 p-2">
        {#await getCharToken($CurrentCharacter)}
            <span>Character Persistant</span>
            <div class="p-2 text-center">Loading...</div>
            <span>Character Dynamic</span>
            <div class="p-2 text-center">Loading...</div>
        {:then token}
            <span>Character Persistant</span>
            <div class="p-2 text-center">{token.persistant} Tokens</div>
            <span>Character Dynamic</span>
            <div class="p-2 text-center">{token.dynamic} Tokens</div>
        {/await}
        {#await getChatToken($CurrentChat)}
            <span>Current Chat</span>
            <div class="p-2 text-center">Loading...</div>
        {:then token}
            <span>Current Chat</span>
            <div class="p-2 text-center">{token} Tokens</div>
        {/await}
        {#if $DataBase.promptTemplate}
            {#await tokenizePreset($DataBase.promptTemplate)}
                <span>Prompt Template</span>
                <div class="p-2 text-center">Loading...</div>
            {:then token}
                <span>Prompt Template</span>
                <div class="p-2 text-center">{token} Tokens</div>
            {/await}
        {/if}
    </div>
    <span class="text-sm text-textcolor2">This is a estimate. The actual token count may be different.</span>
</Arcodion>

<Arcodion styled name={"Autopilot"}>
    <div class="flex flex-col p-2 border border-darkborderc rounded-md">
        {#each autopilot as text}
            <TextAreaInput bind:value={text} />
        {/each}
    </div>
    <div class="flex justify-end">
        <button class="text-textcolor2 hover:text-textcolor" on:click={() => {
            autopilot.pop()
            autopilot = autopilot
        }}>
            <TrashIcon />
        </button>

        <button class="text-textcolor2 hover:text-textcolor" on:click={() => {
            autopilot.push('')
            autopilot = autopilot
        }}>
            <PlusIcon />
        </button>

        <button class="text-textcolor2 hover:text-textcolor" on:click={async () => {
            const selected = await selectSingleFile([
                'txt', 'csv', 'json'
            ])
            if(!selected){
                return
            }
            const file = new TextDecoder().decode(selected.data)
            if(selected.name.endsWith('.json')){
                const parsed = JSON.parse(file)
                if(Array.isArray(parsed)){
                    autopilot = parsed
                }
            }
            if(selected.name.endsWith('.csv')){
                autopilot = file.split('\n').map(x => {
                    return x.replace(/\r/g, '')
                        .replace(/\\n/g, '\n')
                        .replace(/\\t/g, '\t')
                        .replace(/\\r/g, '\r')
                })
            }
            if(selected.name.endsWith('.txt')){
                autopilot = file.split('\n')
            }
        }}>
            <FolderUpIcon />
        </button>
    </div>
    <Button className="mt-2" on:click={async () => {
        if($doingChat){
            return
        }
        for(let i=0;i<autopilot.length;i++){
            const db = ($DataBase)
            let currentChar = db.characters[$selectedCharID]
            let currentChat = currentChar.chats[currentChar.chatPage]
            currentChat.message.push({
                role: 'user',
                data: autopilot[i]
            })
            currentChar.chats[currentChar.chatPage] = currentChat
            db.characters[$selectedCharID] = currentChar
            if($doingChat){
                return
            }
            currentChar.chats[currentChar.chatPage] = currentChat
            db.characters[$selectedCharID] = currentChar
            doingChat.set(false)
            await sendChat(i);
            currentChar = db.characters[$selectedCharID]
            currentChat = currentChar.chats[currentChar.chatPage]
        }
        doingChat.set(false)
    }}>Run</Button>
</Arcodion>
<Button className="mt-2" on:click={() => {
    alertMd(getRequestLog())
}}>Request Log</Button>
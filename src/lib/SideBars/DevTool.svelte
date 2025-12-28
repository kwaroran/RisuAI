<script lang="ts">
    import { selectedCharID } from "src/ts/stores.svelte";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import NumberInput from "../UI/GUI/NumberInput.svelte";
    import Button from "../UI/GUI/Button.svelte";
    import { getRequestLog } from "src/ts/globalApi.svelte";
    import { alertMd, alertWait } from "src/ts/alert";
    import Arcodion from "../UI/Arcodion.svelte";
    import { getCharToken, getChatToken } from "src/ts/tokenizer";
    import { tokenizePreset } from "src/ts/process/prompt";
    
    import { DBState } from 'src/ts/stores.svelte';
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import { HardDriveUploadIcon, PlusIcon, TrashIcon } from "@lucide/svelte";
    import { selectSingleFile } from "src/ts/util";
    import { doingChat, previewFormated, previewBody, sendChat } from "src/ts/process/index.svelte";
    import SelectInput from "../UI/GUI/SelectInput.svelte";
    import { applyChatTemplate, chatTemplates } from "src/ts/process/templates/chatTemplate";
    import OptionInput from "../UI/GUI/OptionInput.svelte";
  import { loadLoreBookV3Prompt } from "src/ts/process/lorebook.svelte";
  import { getModules } from "src/ts/process/modules";

    let previewMode = $state('chat')
    let previewJoin = $state('yes')
    let instructType = $state('chatml')
    let instructCustom = $state('')

    const preview = async () => {
        if($doingChat){
            return false
        }
        alertWait("Loading...")
        await sendChat(-1, {
            preview: previewJoin !== 'prompt',
            previewPrompt: previewJoin === 'prompt'
        })

        let md = ''
        const styledRole = {
            "function": "📐 Function",
            "user": "😐 User",
            "system": "⚙️ System",
            "assistant": "✨ Assistant",
        }

        if(previewJoin === 'prompt'){
            md += '### Prompt\n'
            md += '```json\n' + JSON.stringify(JSON.parse(previewBody), null, 2).replaceAll('```', '\\`\\`\\`') + '\n```\n'
            $doingChat = false
            alertMd(md)
            return
        }

        let formated = safeStructuredClone(previewFormated)

        if(previewJoin === 'yes'){
            let newFormated = []
            let latestRole = ''

            for(let i=0;i<formated.length;i++){
                if(formated[i].role === latestRole){
                    newFormated[newFormated.length - 1].content += '\n' + formated[i].content
                }else{
                    newFormated.push(formated[i])
                    latestRole = formated[i].role
                }
            }

            formated = newFormated
        }

        if(previewMode === 'instruct'){
            const instructed = applyChatTemplate(formated, {
                type: instructType,
                custom: instructCustom
            })

            md += '### Instruction\n'
            md += '```\n' + instructed.replaceAll('```', '\\`\\`\\`') + '\n```\n'
            $doingChat = false
            alertMd(md)
            return
        }

        for(let i=0;i<formated.length;i++){
            
            md += '### ' + (styledRole[formated[i].role] ?? '🤔 Unknown role') + '\n'
            const modals = formated[i].multimodals

            if(modals && modals.length > 0){
                md += `> ${modals.length} non-text content(s) included\n` 
            }

            if(formated[i].thoughts && formated[i].thoughts.length > 0){
                md += `> ${formated[i].thoughts.length} thought(s) included\n`
            }

            if(formated[i].cachePoint){
                md += `> Cache point\n`
            }

            md += '```\n' + formated[i].content.replaceAll('```', '\\`\\`\\`') + '\n```\n'
        }
        $doingChat = false
        alertMd(md)
    }
    
    let autopilot = $state([])
</script>

<Arcodion styled name={"Variables"}>
    <div class="rounded-md border border-darkborderc grid grid-cols-2 gap-2 p-2">
        {#if DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate &&  Object.keys(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate).length > 0}
            {#each Object.keys(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate) as key}
                <span>{key}</span>
                {#if typeof DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate[key] === "object"}
                    <div class="p-2 text-center">Object</div>
                {:else if typeof DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate[key] === "string"}
                    <TextInput bind:value={DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate[key] as string} />
                {:else if typeof DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate[key] === "number"}
                    <NumberInput bind:value={DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate[key] as number} />
                {/if}
            {/each}
        {:else}
            <div class="p-2 text-center">No variables</div>
        {/if}
    </div>
</Arcodion>

<Arcodion styled name={"Tokens"}>
    <div class="rounded-md border border-darkborderc grid grid-cols-2 gap-2 p-2">
        {#await getCharToken(DBState.db.characters[$selectedCharID])}
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
        {#await getChatToken(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage])}
            <span>Current Chat</span>
            <div class="p-2 text-center">Loading...</div>
        {:then token}
            <span>Current Chat</span>
            <div class="p-2 text-center">{token} Tokens</div>
        {/await}
        {#if DBState.db.promptTemplate}
            {#await tokenizePreset(DBState.db.promptTemplate)}
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
        {#each autopilot as text, i}
            <TextAreaInput bind:value={autopilot[i]} />
        {/each}
    </div>
    <div class="flex justify-end">
        <button class="text-textcolor2 hover:text-textcolor" onclick={() => {
            autopilot.pop()
            autopilot = autopilot
        }}>
            <TrashIcon />
        </button>

        <button class="text-textcolor2 hover:text-textcolor" onclick={() => {
            autopilot.push('')
            autopilot = autopilot
        }}>
            <PlusIcon />
        </button>

        <button class="text-textcolor2 hover:text-textcolor" onclick={async () => {
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
            <HardDriveUploadIcon />
        </button>
    </div>
    <Button className="mt-2" onclick={async () => {
        if($doingChat){
            return
        }
        for(let i=0;i<autopilot.length;i++){
            const db = (DBState.db)
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


<Arcodion styled name={"Preview Prompt"}>
    <span>Type</span>
    <SelectInput bind:value={previewMode}>
        <OptionInput value="chat">Chat</OptionInput>
        <OptionInput value="instruct">Instruct</OptionInput>
    </SelectInput>
    {#if previewMode === 'instruct'}
        <span>Instruction Type</span>
        <SelectInput bind:value={instructType}>
            {#each Object.keys(chatTemplates) as template}
                <OptionInput value={template}>{template}</OptionInput>
            {/each}
            <OptionInput value="jinja">Custom Jinja</OptionInput>
        </SelectInput>
        {#if instructType === 'jinja'}
            <span>Custom Jinja</span>
            <TextAreaInput bind:value={instructCustom} />
        {/if}
    {/if}
    <span>Join</span>
    <SelectInput bind:value={previewJoin}>
        <OptionInput value="yes">With Join</OptionInput>
        <OptionInput value="no">Without Join</OptionInput>
        <OptionInput value="prompt">As Request</OptionInput>
    </SelectInput>
    <Button className="mt-2" onclick={() => {preview()}}>Run</Button>
</Arcodion>

<Arcodion styled name={"Preview Lorebook"}>
    <Button className="mt-2" onclick={async () => {
        const lorebookResult = await loadLoreBookV3Prompt()
        const html = `
        ${lorebookResult.actives.map((v) => {
            return `## ${v.source}\n\n\`\`\`\n${v.prompt}\n\`\`\`\n`
        }).join('\n')}
        `.trim()
        alertMd(html)
    }}>Test Lore</Button>
    <Button className="mt-2" onclick={async () => {
        const lorebookResult = await loadLoreBookV3Prompt()
        const html = `
        <table>
            <thead>
                <tr>
                    <th>Key</th>
                    <th>Source</th>
                </tr>
            </thead>
            <tbody>
                ${lorebookResult.matchLog.map((v) => {
                    return `<tr>
                        <td><pre>${v.activated.trim()}</pre></td>
                        <td><pre>${v.source.trim()}</pre></td>
                    </tr>`
                }).join('\n')}
            </tbody>
        </table>
        `.trim()
        alertMd(html)
    }}>Match Sources</Button>
</Arcodion>

<Button className="mt-2" onclick={() => {
    const modules = getModules()
    const html = `
    ${modules.map((v) => {
        return `## ${v.name}\n\n\`\`\`\n${v.description}\n\`\`\`\n`
    }).join('\n')}
    `.trim()
    alertMd(html)
}}>Preview Module</Button>

<Button className="mt-2" onclick={() => {
    alertMd(getRequestLog())
}}>Request Log</Button>
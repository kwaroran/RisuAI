<script lang="ts">
    import { selectedCharID } from "src/ts/stores.svelte";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import NumberInput from "../UI/GUI/NumberInput.svelte";
    import Button from "../UI/GUI/Button.svelte";
    import { getRequestLog } from "src/ts/globalApi.svelte";
    import { alertMd, alertWait, alertInput, alertSelect, alertError } from "src/ts/alert";
    import Arcodion from "../UI/Arcodion.svelte";
    import { getCharToken, getChatToken } from "src/ts/tokenizer";
    import { tokenizePreset } from "src/ts/process/prompt";
    
    import { DBState } from 'src/ts/stores.svelte';
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import { HardDriveUploadIcon, PlusIcon, TrashIcon } from "lucide-svelte";
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

    const addVariable = async () => {
        try {
            // Get variable name
            const variableName = await alertInput("Enter variable name:");
            if (!variableName || variableName.trim() === "") {
                return;
            }

            const trimmedName = variableName.trim();
            
            // Check for duplicate variable names
            const currentVariables = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate || {};
            if (currentVariables.hasOwnProperty('$' + trimmedName)) {
                alertError(`Variable "${trimmedName}" already exists!`);
                return;
            }

            // Get variable type
            const typeOptions = ['text', 'number', 'boolean'];
            const selectedIndex = await alertSelect(typeOptions, "Select variable type:");
            if (selectedIndex === null || selectedIndex === undefined) {
                return;
            }

            const variableType = typeOptions[selectedIndex];

            // Set default value based on type
            let defaultValue: string | number | boolean;
            switch (variableType) {
                case 'text':
                    defaultValue = "";
                    break;
                case 'number':
                    defaultValue = 0;
                    break;
                case 'boolean':
                    defaultValue = true;
                    break;
                default:
                    console.log("Unknown type, defaulting to empty string:", variableType);
                    defaultValue = "";
            }

            // Initialize scriptstate if it doesn't exist
            if (!DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate) {
                DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate = {};
            }

            // Add the new variable
            DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate['$' + trimmedName] = defaultValue;

            // Force reactive update
            DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate = 
                {...DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate};

        } catch (error) {
            console.error("Error adding variable:", error);
        }
    }
</script>

<Arcodion styled name={"Variables"}>
    <div class="rounded-md border border-darkborderc p-2">
        {#if DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate &&  Object.keys(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate).length > 0}
            <div class="grid grid-cols-1 gap-2">
                {#each Object.keys(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate) as key}
                    {@const value = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate[key]}
                    <div class="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
                        <span class="font-medium">{key}</span>
                        {#if value === null}
                            <div class="p-2 text-center bg-red-900/20 text-red-300 rounded border border-darkborderc">null</div>
                        {:else if Array.isArray(value)}
                            <div class="p-2 text-center bg-blue-900/20 text-blue-300 rounded border border-darkborderc">Array [{value.length}]</div>
                        {:else if typeof value === "object"}
                            <div class="p-2 text-center bg-green-900/20 text-green-300 rounded border border-darkborderc">Object</div>
                        {:else if typeof value === "string"}
                            <TextInput bind:value={DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate[key] as string} />
                        {:else if typeof value === "number"}
                            <NumberInput bind:value={DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate[key] as number} />
                        {:else if typeof value === "boolean"}
                            {#if value}
                                <Button onclick={() => {
                                    DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate[key] = false
                                }}>true</Button>
                            {:else}
                                <Button onclick={() => {
                                    DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate[key] = true
                                }}>false</Button>
                            {/if}
                        {:else}
                            <div class="p-2 text-center bg-yellow-900/20 text-yellow-300 rounded">Unknown ({typeof value})</div>
                        {/if}
                        <button 
                            class="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-900/20 transition-colors"
                            onclick={() => {
                                delete DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate[key];
                                // Force reactive update
                                DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate = 
                                    {...DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].scriptstate};
                            }}
                            title="Delete variable"
                        >
                            <TrashIcon size={18} />
                        </button>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="p-2 text-center text-textcolor2">No variables</div>
        {/if}
    </div>
    <div class="flex justify-end mt-2">
        <button 
            class="text-textcolor2 hover:text-textcolor rounded"
            onclick={addVariable}
            title="Add new variable"
        >
            <PlusIcon size={24} />
        </button>
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
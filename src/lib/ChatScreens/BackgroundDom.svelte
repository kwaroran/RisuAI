<script lang="ts">
    import { ParseMarkdown, risuChatParser } from "src/ts/parser.svelte";
    import { type character, type groupChat, getCurrentCharacter, getCurrentChat, setCurrentChat } from "src/ts/storage/database.svelte";
    import { DBState, CurrentTriggerIdStore } from 'src/ts/stores.svelte';
    import { moduleBackgroundEmbedding, ReloadGUIPointer, selIdState } from "src/ts/stores.svelte";
    import { runTrigger } from 'src/ts/process/triggers';
    import { runLuaButtonTrigger } from 'src/ts/process/scriptings';

    let backgroundHTML = $derived(DBState.db?.characters?.[selIdState.selId]?.backgroundHTML)
    let currentChar:character|groupChat = $derived(DBState.db?.characters?.[selIdState.selId])

    async function handleBackgroundButtonTrigger(event: UIEvent) {
        const currentChar = getCurrentCharacter()
        if(currentChar.type === 'group'){
            return
        }

        const target = event.target as HTMLElement
        const origin = target.closest('[risu-trigger], [risu-btn]')
        if (!origin) {
            return
        }

        const triggerName = origin.getAttribute('risu-trigger')
        const triggerId = origin.getAttribute('risu-id')
        const btnEvent = origin.getAttribute('risu-btn')

        const triggerResult =
            triggerName ?
                await runTrigger(currentChar, 'manual', {
                    chat: getCurrentChat(),
                    manualName: triggerName,
                    triggerId: triggerId || undefined,
                }) :
            btnEvent ?
                await runLuaButtonTrigger(currentChar, btnEvent) :
            null

        if(triggerResult) {
            setCurrentChat(triggerResult.chat)
        }
        
        if(triggerName && triggerId) {
            setTimeout(() => {
                CurrentTriggerIdStore.set(null)
            }, 100)
        }
    }
</script>

{#if backgroundHTML || $moduleBackgroundEmbedding}
    {#if selIdState.selId > -1}
        {#key $ReloadGUIPointer}
            <div class="absolute top-0 left-0 w-full h-full chattext" 
                 onclickcapture={handleBackgroundButtonTrigger}>
                {#await ParseMarkdown(risuChatParser((backgroundHTML || '') + '\n' + ($moduleBackgroundEmbedding || ''), {chara:currentChar}), currentChar, 'back') then md} 
                    {@html md}
                {/await}
            </div>
        {/key}
    {/if}
{/if}
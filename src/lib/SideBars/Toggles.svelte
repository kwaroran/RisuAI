<script lang="ts">
    import { getModuleToggles } from "src/ts/process/modules";
    import { DBState, MobileGUI } from "src/ts/stores.svelte";
    import { parseToggleSyntax } from "src/ts/util";
    import CheckInput from "../UI/GUI/CheckInput.svelte";
    import { language } from "src/lang";
    import type { character, groupChat } from "src/ts/storage/database.svelte";
  import SelectInput from "../UI/GUI/SelectInput.svelte";
  import OptionInput from "../UI/GUI/OptionInput.svelte";
  import TextInput from "../UI/GUI/TextInput.svelte";

    interface Props {
        chara?: character|groupChat
        noContainer?: boolean
    }

    let { chara = $bindable(), noContainer }: Props = $props();

    let parsedKv = $derived(parseToggleSyntax(DBState.db.customPromptTemplateToggle + getModuleToggles()))

</script>

{#snippet toggles()}
    {#each parsedKv as toggle}
        {#if toggle.type === 'select'}
            <div class="flex mt-2 items-center">
                <span class="mr-2">{toggle.value}</span>

                <SelectInput bind:value={DBState.db.globalChatVariables[`toggle_${toggle.key}`]}>
                    {#each toggle.options as option, i}
                        <OptionInput value={i.toString()}>{option}</OptionInput>
                    {/each}
                </SelectInput>
            </div>
        {:else if toggle.type === 'text'}
            <div class="flex mt-2 items-center">
                <span class="mr-2">{toggle.value}</span>
                <TextInput bind:value={DBState.db.globalChatVariables[`toggle_${toggle.key}`]} />
            </div>
        {:else}
            <div class="flex mt-2 items-center">
                <CheckInput check={DBState.db.globalChatVariables[`toggle_${toggle.key}`] === '1'} reverse name={toggle.value} onChange={() => {
                    DBState.db.globalChatVariables[`toggle_${toggle.value}`] = DBState.db.globalChatVariables[`toggle_${toggle.value}`] === '1' ? '0' : '1'
                }} />
            </div>
        {/if}
    {/each}
{/snippet}

{#if !noContainer && parsedKv.length > 4}
    <div class="h-48 border-darkborderc p-2 border rounded flex flex-col items-start mt-2 overflow-y-auto">
        <div class="flex mt-2 items-center w-full" class:justify-end={$MobileGUI}>
            <CheckInput bind:check={DBState.db.jailbreakToggle} name={language.jailbreakToggle} reverse />
        </div>
        {@render toggles()}
        {#if DBState.db.supaModelType !== 'none' || DBState.db.hanuraiEnable}
            <div class="flex mt-2 items-center w-full" class:justify-end={$MobileGUI}>
                <CheckInput bind:check={chara.supaMemory} reverse name={DBState.db.hanuraiEnable ? language.hanuraiMemory : DBState.db.hypaMemory ? language.ToggleHypaMemory : language.ToggleSuperMemory}/>
            </div>
        {/if}
    </div>
{:else}
    <div class="flex mt-2 items-center">
        <CheckInput bind:check={DBState.db.jailbreakToggle} name={language.jailbreakToggle}/>
    </div>
    {@render toggles()}
    {#if DBState.db.supaModelType !== 'none' || DBState.db.hanuraiEnable}
        <div class="flex mt-2 items-center">
            <CheckInput bind:check={chara.supaMemory} name={DBState.db.hanuraiEnable ? language.hanuraiMemory : DBState.db.hypaMemory ? language.ToggleHypaMemory : language.ToggleSuperMemory}/>
        </div>
    {/if}
{/if}
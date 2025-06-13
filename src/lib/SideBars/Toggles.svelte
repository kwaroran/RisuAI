<script lang="ts">
    import { getModuleToggles } from "src/ts/process/modules";
    import { DBState, MobileGUI } from "src/ts/stores.svelte";
    import { parseToggleSyntax, type sidebarToggle, type sidebarToggleGroup } from "src/ts/util";
    import { language } from "src/lang";
    import type { character, groupChat } from "src/ts/storage/database.svelte";
    import Arcodion from '../UI/Arcodion.svelte'
    import CheckInput from "../UI/GUI/CheckInput.svelte";
    import SelectInput from "../UI/GUI/SelectInput.svelte";
    import OptionInput from "../UI/GUI/OptionInput.svelte";
    import TextInput from "../UI/GUI/TextInput.svelte";

    interface Props {
        chara?: character|groupChat
        noContainer?: boolean
    }

    let { chara = $bindable(), noContainer }: Props = $props();

    let groupedToggles = $derived.by(() => {
        const ungrouped = parseToggleSyntax(DBState.db.customPromptTemplateToggle + getModuleToggles())

        let groupOpen = false
        // group toggles together between group ... groupEnd
        return ungrouped.reduce<sidebarToggle[]>((acc, toggle) => {
            if (toggle.type === 'group') {
                groupOpen = true
                acc.push(toggle)
            } else if (toggle.type === 'groupEnd') {
                groupOpen = false
            } else if (groupOpen) {
                (acc.at(-1) as sidebarToggleGroup).children.push(toggle)
            } else {
                acc.push(toggle)
            }
            return acc
        }, [])
    })
</script>

{#snippet toggles(items: sidebarToggle[], reverse: boolean = false)}
    {#each items as toggle, index}
        {#if toggle.type === 'group' && toggle.children.length > 0}
            <div class="w-full">
                <Arcodion styled name={toggle.value}>
                    {@render toggles((toggle as sidebarToggleGroup).children, reverse)}
                </Arcodion>
            </div>
        {:else if toggle.type === 'select'}
            <div class="flex items-center w-full gap-2 mt-2" class:justify-end={$MobileGUI} >
                <span>{toggle.value}</span>
                <SelectInput className="w-32" bind:value={DBState.db.globalChatVariables[`toggle_${toggle.key}`]}>
                    {#each toggle.options as option, i}
                        <OptionInput value={i.toString()}>{option}</OptionInput>
                    {/each}
                </SelectInput>
            </div>
        {:else if toggle.type === 'text'}
            <div class="flex items-center w-full gap-2 mt-2" class:justify-end={$MobileGUI}>
                <span>{toggle.value}</span>
                <TextInput className="w-32" bind:value={DBState.db.globalChatVariables[`toggle_${toggle.key}`]} />
            </div>
        {:else if toggle.type === 'divider'}
            <!-- Prevent multiple dividers appearing in a row -->
            {#if index === 0 || items[index - 1]?.type !== 'divider' || items[index - 1]?.value !== toggle.value}
                <div class="flex items-center w-full gap-2 mt-2 min-h-5" class:justify-end={!reverse}>
                    {#if toggle.value}
                        <span class="shrink-0">{toggle.value}</span>
                    {/if}
                    <hr class="flex-grow m-0 border-t border-darkborderc" />
                </div>
            {/if}
        {:else}
            <div class="flex items-center w-full mt-2" class:justify-end={$MobileGUI}>
                <CheckInput check={DBState.db.globalChatVariables[`toggle_${toggle.key}`] === '1'} reverse={reverse} name={toggle.value} onChange={() => {
                    DBState.db.globalChatVariables[`toggle_${toggle.key}`] = DBState.db.globalChatVariables[`toggle_${toggle.key}`] === '1' ? '0' : '1'
                }} />
            </div>
        {/if}
    {/each}
{/snippet}

{#if !noContainer && groupedToggles.length > 4}
    <div class="flex flex-col items-start h-48 p-2 mt-2 overflow-y-auto border rounded border-darkborderc">
        <div class="flex items-center w-full mt-2" class:justify-end={$MobileGUI}>
            <CheckInput bind:check={DBState.db.jailbreakToggle} name={language.jailbreakToggle} reverse />
        </div>
        {@render toggles(groupedToggles, true)}
        {#if DBState.db.supaModelType !== 'none' || DBState.db.hanuraiEnable || DBState.db.hypaV3 || DBState.db.useUlariMemory}
            <div class="flex items-center w-full mt-2" class:justify-end={$MobileGUI}>
                <CheckInput 
                    bind:check={chara.supaMemory} 
                    reverse 
                    name={DBState.db.hypaV3 || DBState.db.useUlariMemory || DBState.db.hypaMemory
                        ? language.ToggleHypaMemory
                        : DBState.db.hanuraiEnable 
                            ? language.hanuraiMemory
                            : language.ToggleSuperMemory}
                />
            </div>
        {/if}
    </div>
{:else}
    <div class="flex items-center mt-2">
        <CheckInput bind:check={DBState.db.jailbreakToggle} name={language.jailbreakToggle}/>
    </div>
    {@render toggles(groupedToggles)}
    {#if DBState.db.supaModelType !== 'none' || DBState.db.hanuraiEnable || DBState.db.hypaV3 || DBState.db.useUlariMemory}
        <div class="flex items-center mt-2">
            <CheckInput
                bind:check={chara.supaMemory}
                name={DBState.db.hypaV3 || DBState.db.useUlariMemory || DBState.db.hypaMemory
                    ? language.ToggleHypaMemory
                    : DBState.db.hanuraiEnable 
                        ? language.hanuraiMemory
                        : language.ToggleSuperMemory}
            />
        </div>
    {/if}
{/if}
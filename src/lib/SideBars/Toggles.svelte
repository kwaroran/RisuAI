<script lang="ts">
    import { getModuleToggles } from "src/ts/process/modules";
    import { DBState, MobileGUI } from "src/ts/stores.svelte";
    import { parseToggleSyntax, type sidebarToggle, type sidebarToggleGroup } from "src/ts/util";
    import { language } from "src/lang";
    import type { character, groupChat } from "src/ts/storage/database.svelte";
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
            <details class="mt-3 mb-1 w-full border border-darkborderc rounded">
                <summary class="-m-px p-2 bg-darkbutton border border-darkborderc rounded text-xs cursor-pointer select-none hover:bg-selected transition-colors duration-190">{toggle.value}</summary>
                <div class="flex flex-col px-2 py-4 pt-0">
                    {@render toggles((toggle as sidebarToggleGroup).children, reverse)}
                </div>
            </details>
        {:else if toggle.type === 'select'}
            <div class="flex gap-2 mt-2 items-center" class:flex-row-reverse={!reverse} class:justify-end={!reverse}>
                <span>{toggle.value}</span>
                <SelectInput className="w-32" bind:value={DBState.db.globalChatVariables[`toggle_${toggle.key}`]}>
                    {#each toggle.options as option, i}
                        <OptionInput value={i.toString()}>{option}</OptionInput>
                    {/each}
                </SelectInput>
            </div>
        {:else if toggle.type === 'text'}
            <div class="flex gap-2 mt-2 items-center" class:flex-row-reverse={!reverse} class:justify-end={!reverse}>
                <span>{toggle.value}</span>
                <TextInput className="w-32" bind:value={DBState.db.globalChatVariables[`toggle_${toggle.key}`]} />
            </div>
        {:else if toggle.type === 'divider'}
            {@const prevToggle = groupedToggles[index - 1]}
            <!-- Prevent multiple dividers appearing in a row -->
            {#if index === 0 || prevToggle.type !== 'divider' || prevToggle.value !== toggle.value}
                <div class="flex gap-2 mt-2 w-full min-h-5 items-center" class:flex-row-reverse={!reverse} class:justify-end={!reverse}>
                    {#if toggle.value}
                        <span>{toggle.value}</span>
                    {/if}
                    <hr class="border-t border-darkborderc m-0 min-w-32 flex-grow" />
                </div>
            {/if}
        {:else}
            <div class="flex mt-2 items-center">
                <CheckInput check={DBState.db.globalChatVariables[`toggle_${toggle.key}`] === '1'} reverse={reverse} name={toggle.value} onChange={() => {
                    DBState.db.globalChatVariables[`toggle_${toggle.key}`] = DBState.db.globalChatVariables[`toggle_${toggle.key}`] === '1' ? '0' : '1'
                }} />
            </div>
        {/if}
    {/each}
{/snippet}

{#if !noContainer && groupedToggles.length > 4}
    <div class="h-48 border-darkborderc p-2 border rounded flex flex-col items-start mt-2 overflow-y-auto">
        <div class="flex mt-2 items-center w-full" class:justify-end={$MobileGUI}>
            <CheckInput bind:check={DBState.db.jailbreakToggle} name={language.jailbreakToggle} reverse />
        </div>
        {@render toggles(groupedToggles, true)}
        {#if DBState.db.supaModelType !== 'none' || DBState.db.hanuraiEnable || DBState.db.hypaV3}
            <div class="flex mt-2 items-center w-full" class:justify-end={$MobileGUI}>
                <CheckInput bind:check={chara.supaMemory} reverse name={DBState.db.hypaV3 ? language.ToggleHypaMemory : DBState.db.hanuraiEnable ? language.hanuraiMemory : DBState.db.hypaMemory ? language.ToggleHypaMemory : language.ToggleSuperMemory}/>
            </div>
        {/if}
    </div>
{:else}
    <div class="flex mt-2 items-center">
        <CheckInput bind:check={DBState.db.jailbreakToggle} name={language.jailbreakToggle}/>
    </div>
    {@render toggles(groupedToggles)}
    {#if DBState.db.supaModelType !== 'none' || DBState.db.hanuraiEnable || DBState.db.hypaV3}
        <div class="flex mt-2 items-center">
            <CheckInput bind:check={chara.supaMemory} name={DBState.db.hypaV3 ? language.ToggleHypaMemory : DBState.db.hanuraiEnable ? language.hanuraiMemory : DBState.db.hypaMemory ? language.ToggleHypaMemory : language.ToggleSuperMemory}/>
        </div>
    {/if}
{/if}
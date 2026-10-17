<script lang="ts">
    import { ArrowDown, ArrowUp, EyeIcon, PlusIcon, TrashIcon, XIcon } from "@lucide/svelte";
    import { language } from "src/lang";
    import { DBState, selectedCharID } from "src/ts/stores.svelte";
    import type { character } from "src/ts/storage/database.svelte";
    import { createOnboarding, createOnboardingQuestion } from "src/ts/onboarding";
    import Help from "../Others/Help.svelte";
    import OnboardingModal from "../Others/OnboardingModal.svelte";
    import CheckInput from "../UI/GUI/CheckInput.svelte";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import SelectInput from "../UI/GUI/SelectInput.svelte";
    import OptionInput from "../UI/GUI/OptionInput.svelte";
    import SegmentedControl from "../UI/GUI/SegmentedControl.svelte";
    import Button from "../UI/GUI/Button.svelte";

    const char = $derived(DBState.db.characters[$selectedCharID] as character)
    let showPreview = $state(false)

    const modeOptions = [
        { value: 'form', label: language.onboardingModeForm },
        { value: 'html', label: language.onboardingModeHTML },
    ]

    function moveQuestion(index: number, direction: -1 | 1){
        const questions = char.onboarding.questions
        const target = index + direction
        if(target < 0 || target >= questions.length){
            return
        }
        const [question] = questions.splice(index, 1)
        questions.splice(target, 0, question)
    }
</script>

<span class="text-textcolor mt-4">{language.onboarding} <Help key="onboarding" /></span>
<CheckInput
    check={!!char.onboarding?.enabled}
    name={language.onboardingEnable}
    onChange={(check) => {
        if(check && !char.onboarding){
            char.onboarding = createOnboarding()
            return
        }
        if(char.onboarding){
            char.onboarding.enabled = check
        }
    }}
/>

{#if char.onboarding?.enabled}
    <div class="flex flex-col gap-2 mt-2 p-3 rounded-md border border-darkborderc">
        <div class="flex items-center gap-2 flex-wrap">
            <SegmentedControl bind:value={char.onboarding.mode} options={modeOptions} size="sm" />
            <div class="flex-1"></div>
            <Button size="sm" styled="outlined" onclick={() => { showPreview = true }}>
                <span class="flex items-center gap-1.5"><EyeIcon size={14} />{language.preview}</span>
            </Button>
        </div>

        <CheckInput bind:check={char.onboarding.floatingButton} name={language.onboardingFloatingButton} margin={false} />

        <span class="text-textcolor2 text-sm">{language.onboardingTitle}</span>
        <TextInput size="sm" fullwidth bind:value={char.onboarding.title} placeholder={char.name} />

        {#if char.onboarding.mode === 'html'}
            <span class="text-textcolor2 text-sm">HTML</span>
            <TextAreaInput highlight margin="none" autocomplete="off" bind:value={char.onboarding.html} placeholder={'<button risu-change-var-name="route" risu-change-var-value="a">A</button>'} />
            <span class="text-xs text-textcolor2">{language.onboardingHTMLHint}</span>
        {:else}
            <span class="text-textcolor2 text-sm">{language.description}</span>
            <TextAreaInput margin="none" autocomplete="off" bind:value={char.onboarding.description} />

            {#each char.onboarding.questions as question, i (question.id)}
                <div class="flex flex-col gap-2 mt-2 p-3 rounded-md bg-darkbg border border-darkborderc">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-medium uppercase tracking-wider text-textcolor2">{language.onboardingQuestion} {i + 1}</span>
                        <div class="flex-1"></div>
                        <button class="text-textcolor2 hover:text-textcolor transition-colors disabled:opacity-30" disabled={i === 0} onclick={() => moveQuestion(i, -1)}>
                            <ArrowUp size={16} />
                        </button>
                        <button class="text-textcolor2 hover:text-textcolor transition-colors disabled:opacity-30" disabled={i === char.onboarding.questions.length - 1} onclick={() => moveQuestion(i, 1)}>
                            <ArrowDown size={16} />
                        </button>
                        <button class="text-textcolor2 hover:text-draculared transition-colors" onclick={() => { char.onboarding.questions.splice(i, 1) }}>
                            <TrashIcon size={16} />
                        </button>
                    </div>

                    <TextInput size="sm" fullwidth bind:value={question.title} placeholder={language.onboardingQuestion} />
                    <TextInput size="sm" fullwidth bind:value={question.description} placeholder={language.description} />

                    <div class="flex gap-2 flex-wrap">
                        <div class="flex flex-col flex-1 min-w-32">
                            <span class="text-xs text-textcolor2 mb-1">{language.onboardingVarName}</span>
                            <TextInput size="sm" fullwidth bind:value={question.varName} placeholder="varname" />
                        </div>
                        <div class="flex flex-col flex-1 min-w-32">
                            <span class="text-xs text-textcolor2 mb-1">{language.type}</span>
                            <SelectInput size="sm" bind:value={question.type}>
                                <OptionInput value="single">{language.onboardingTypeSingle}</OptionInput>
                                <OptionInput value="multiple">{language.onboardingTypeMultiple}</OptionInput>
                                <OptionInput value="text">{language.onboardingTypeText}</OptionInput>
                            </SelectInput>
                        </div>
                    </div>
                    {#if !question.varName}
                        <span class="text-xs text-draculared">{language.onboardingVarNameMissing}</span>
                    {/if}

                    {#if question.type === 'text'}
                        <TextInput size="sm" fullwidth bind:value={question.placeholder} placeholder={language.onboardingPlaceholder} />
                    {:else}
                        <div class="flex flex-col gap-1.5">
                            {#each question.options as option, j}
                                <div class="flex items-center gap-2">
                                    <TextInput size="sm" className="flex-1 min-w-0" bind:value={option.label} placeholder={language.onboardingOptionLabel} />
                                    <TextInput size="sm" className="flex-1 min-w-0" bind:value={option.value} placeholder={option.label || language.onboardingOptionValue} />
                                    <button class="shrink-0 text-textcolor2 hover:text-draculared transition-colors" onclick={() => { question.options.splice(j, 1) }}>
                                        <XIcon size={16} />
                                    </button>
                                </div>
                            {/each}
                            <button class="self-start flex items-center gap-1 text-sm text-textcolor2 hover:text-green-500 transition-colors" onclick={() => { question.options.push({ label: '', value: '' }) }}>
                                <PlusIcon size={14} />{language.onboardingAddOption}
                            </button>
                        </div>
                    {/if}

                    <CheckInput bind:check={question.required} name={language.onboardingRequired} margin={false} />
                </div>
            {/each}

            <button class="mt-2 flex items-center justify-center gap-1 w-full py-2 rounded-md border border-dashed border-darkborderc text-sm text-textcolor2 hover:text-green-500 hover:border-green-500 transition-colors" onclick={() => { char.onboarding.questions.push(createOnboardingQuestion()) }}>
                <PlusIcon size={16} />{language.onboardingAddQuestion}
            </button>
        {/if}
    </div>
{/if}

{#if showPreview}
    <OnboardingModal preview onclose={() => { showPreview = false }} />
{/if}

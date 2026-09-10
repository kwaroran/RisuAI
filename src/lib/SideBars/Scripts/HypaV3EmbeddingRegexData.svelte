<script lang="ts">
    import { XIcon } from "@lucide/svelte";
    import { language } from "src/lang";
    import { alertConfirm } from "src/ts/alert";
    import type { EmbeddingRegex } from "src/ts/process/memory/embeddingRegex";
    import Check from "../../UI/GUI/CheckInput.svelte";
    import TextInput from "../../UI/GUI/TextInput.svelte";
    import TextAreaInput from "../../UI/GUI/TextAreaInput.svelte";
    import SelectInput from "../../UI/GUI/SelectInput.svelte";
    import OptionInput from "../../UI/GUI/OptionInput.svelte";
    import Accordion from "src/lib/UI/Accordion.svelte";

    interface Props {
        value: EmbeddingRegex;
        onRemove?: () => void;
        onClose?: () => void;
        onOpen?: () => void;
        idx: number;
    }

    let {
        value = $bindable(),
        onRemove = () => {},
        onClose = () => {},
        onOpen = () => {},
        idx
    }: Props = $props();

    const checkFlagContain = (flag: string, matchFlag: string) => {
        if (flag.length === 1) {
            matchFlag = (value.flag ?? '')
        }
        return matchFlag.includes(flag)
    }

    const toggleFlag = (flag: string) => {
        const current = value.flag ?? ''
        if (checkFlagContain(flag, current)) {
            value.flag = current.replace(flag, '')
        } else {
            value.flag = current + flag
        }
    }

    const flags = [
        ['Global (g)', 'g'],
        ['Case Insensitive (i)', 'i'],
        ['Multi Line (m)', 'm'],
        ['Unicode (u)', 'u'],
        ['Dot All (s)', 's'],
    ]

    let open = $state(false)
</script>

<div class="w-full flex flex-col pt-2 mt-2 border-t border-t-selected first:pt-0 first:mt-0 first:border-0" data-risu-idx={idx}>
    <div class="flex items-center transition-colors w-full ">
        <button class="endflex valuer border-borderc" onclick={() => {
            open = !open
            if(open){
                onOpen()
            }
            else{
                onClose()
            }
        }}>
            <span>{value.comment.length === 0 ? 'Unnamed Script' : value.comment}</span>
        </button>
        <button class="valuer" onclick={async () => {
            const d = await alertConfirm(language.removeConfirm + value.comment)
            if(d){
                if(open){
                    onClose()
                }
                onRemove()
            }
        }}>
            <XIcon />
        </button>
    </div>
    {#if open}
        <div class="seperator p-2">
            <span class="text-textcolor mt-6">{language.name}</span>
            <TextInput size="sm" bind:value={value.comment} />
            <span class="text-textcolor mt-4">Modification Type</span>
            <SelectInput bind:value={value.type}>
                <OptionInput value="disabled">{language.disabled}</OptionInput>
                <OptionInput value="editembedding">{language.hypaV3Settings.editEmbeddingRequestData}</OptionInput>
            </SelectInput>
            <span class="text-textcolor mt-6">IN:</span>
            <TextInput size="sm" bind:value={value.in} />
            <span class="text-textcolor mt-6">OUT:</span>
            <TextAreaInput highlight autocomplete="off" size="sm" bind:value={value.out} />
            {#if value.ableFlag}
                <Accordion styled name="FLAGS">
                    <span class="text-textcolor mt-3">Normal Flag</span>
                    <div class="grid w-full grid-cols-2 rounded-md border border-darkborderc">
                        {#each flags as flag, i}
                            <button class="w-full bg-darkbg border-darkborderc text-sm py-1"
                                class:border-r-1={i % 2 === 0}
                                class:border-b-1={i < flags.length - 1}
                                class:text-textcolor2={!checkFlagContain(flag[1], value.flag ?? '')}
                                class:text-textcolor={checkFlagContain(flag[1], value.flag ?? '')}
                                onclick={() => {
                                    toggleFlag(flag[1])
                                }}
                            >
                                <span>{flag[0]}</span>
                                </button>
                        {/each}
                        <div class="w-full bg-darkbg text-sm py-1"></div>
                    </div>
                </Accordion>
            {/if}
            <div class="flex items-center mt-4">
                <Check bind:check={value.ableFlag} onChange={() => {
                    if(!value.flag){
                        value.flag = 'g'
                    }
                }}/>
                <span>Custom Flag</span>
            </div>
       </div>
    {/if}
</div>

<style>
    .valuer:hover{
        color: rgba(16, 185, 129, 1);
        cursor: pointer;
    }

    .endflex{
        display: flex;
        flex-grow: 1;
        cursor: pointer;
    }

    .seperator{
        border: none;
        outline: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        margin-bottom: 0.5rem;
    }
</style>

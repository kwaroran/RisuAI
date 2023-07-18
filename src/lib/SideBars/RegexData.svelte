<script lang="ts">
    import { XIcon } from "lucide-svelte";
    import { language } from "src/lang";
    import { alertConfirm } from "src/ts/alert";
    import type { customscript } from "src/ts/storage/database";
    import Check from "../Others/Check.svelte";
  import TextInput from "../UI/GUI/TextInput.svelte";

    export let value:customscript
    export let onRemove: () => void = () => {}
    let open = false
</script>

<div class="w-full flex flex-col">
    <div class="flex items-center transition-colors w-full ">
        <button class="endflex valuer border-borderc" on:click={() => {
            open = !open
        }}>
            <span>{value.comment.length === 0 ? 'Unnamed Script' : value.comment}</span>
        </button>
        <button class="valuer" on:click={async () => {
            const d = await alertConfirm(language.removeConfirm + value.comment)
            if(d){
                onRemove()
            }
        }}>
            <XIcon />
        </button>
    </div>
    {#if open}
        <div class="seperator p-2">
            <span class="text-neutral-200 mt-6">{language.name}</span>
            <TextInput size="sm" bind:value={value.comment} />
            <span class="text-neutral-200 mt-4">Modification Type</span>
            <select class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={value.type}>
                <option value="editinput">{language.editInput}</option>
                <option value="editoutput">{language.editOutput}</option>
                <option value="editprocess">{language.editProcess}</option>
                <option value="editdisplay">{language.editDisplay}</option>
            </select>
            <span class="text-neutral-200 mt-6">IN:</span>
            <TextInput size="sm" bind:value={value.in} />
            <span class="text-neutral-200 mt-6">OUT:</span>
            <TextInput size="sm" bind:value={value.out} />
            {#if value.ableFlag}
                <span class="text-neutral-200 mt-6">FLAG:</span>
                <TextInput size="sm" bind:value={value.flag} />
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
        margin-top: 0.5rem;
        display: flex;
        flex-direction: column;
        margin-bottom: 0.5rem;
        background-color: #282a36;
    }
    
</style>
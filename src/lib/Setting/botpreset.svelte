<script>
    import { alertConfirm, alertError } from "../../ts/alert";
    import { language } from "../../lang";
    import { DataBase, changeToPreset, copyPreset, downloadPreset, importPreset, presetTemplate } from "../../ts/storage/database";
    import { CopyIcon, DownloadIcon, EditIcon, FolderUpIcon, PlusIcon, TrashIcon, XIcon } from "lucide-svelte";
  import { cloneDeep } from "lodash";
  import TextInput from "../UI/GUI/TextInput.svelte";

    let editMode = false
    export let close = () => {}

</script>

<div class="absolute w-full h-full z-40 bg-black bg-opacity-50 flex justify-center items-center">
    <div class="bg-darkbg p-4 break-any rounded-md flex flex-col max-w-3xl w-96 max-h-full overflow-y-auto">
        <div class="flex items-center text-textcolor mb-4">
            <h2 class="mt-0 mb-0">{language.presets}</h2>
            <div class="flex-grow flex justify-end">
                <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer items-center" on:click={close}>
                    <XIcon size={24}/>
                </button>
            </div>
        </div>
        {#each $DataBase.botPresets as presets, i}
            <button on:click={() => {
                if(!editMode){
                    changeToPreset(i)
                    close()
                }
            }} class="flex items-center text-textcolor border-t-1 border-solid border-0 border-darkborderc p-2 cursor-pointer" class:bg-selected={i === $DataBase.botPresetsId}>
                {#if editMode}
                    <TextInput bind:value={$DataBase.botPresets[i].name} placeholder="string" padding={false}/>
                {:else}
                    {#if i < 9}
                    <span class="w-2 text-center mr-2 text-textcolor2">{i + 1}</span>
                    {/if}
                    <span>{presets.name}</span>
                {/if}
                <div class="flex-grow flex justify-end">
                    <button class="text-textcolor2 hover:text-green-500 cursor-pointer mr-2" on:click={(e) => {
                        e.stopPropagation()
                        copyPreset(i)
                    }}>
                        <CopyIcon size={18}/>
                    </button>
                    <button class="text-textcolor2 hover:text-green-500 cursor-pointer mr-2" on:click={(e) => {
                        e.stopPropagation()
                        downloadPreset(i)
                    }}>

                        <DownloadIcon size={18} />
                    </button>
                    <button class="text-textcolor2 hover:text-green-500 cursor-pointer" on:click={async (e) => {
                        e.stopPropagation()
                        if($DataBase.botPresets.length === 1){
                            alertError(language.errors.onlyOneChat)
                            return
                        }
                        const d = await alertConfirm(`${language.removeConfirm}${presets.name}`)
                        if(d){
                            changeToPreset(0)
                            let botPresets = $DataBase.botPresets
                            console.log(botPresets)
                            botPresets.splice(i, 1)
                            $DataBase.botPresets = botPresets
                            changeToPreset(0, false)
                        }
                    }}>
                        <TrashIcon size={18}/>
                    </button>
                </div>
            </button>
        {/each}
        <div class="flex mt-2 items-center">
            <button class="text-textcolor2 hover:text-green-500 cursor-pointer mr-1" on:click={() => {
                let botPresets = $DataBase.botPresets
                let newPreset = cloneDeep(presetTemplate)
                newPreset.name = `New Preset`
                botPresets.push(newPreset)

                $DataBase.botPresets = botPresets
            }}>
                <PlusIcon/>
            </button>
            <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer" on:click={() => {
                importPreset()
            }}>
                <FolderUpIcon size={18}/>
            </button>
            <button class="text-textcolor2 hover:text-green-500 cursor-pointer" on:click={() => {
                editMode = !editMode
            }}>
                <EditIcon size={18}/>
            </button>
        </div>
        <span class="text-textcolor2 text-sm">{language.quickPreset}</span>
    </div>
</div>

<style>
    .break-any{
        word-break: normal;
        overflow-wrap: anywhere;
    }
</style>
<script>
    import { alertConfirm, alertError } from "../../ts/alert";
    import { language } from "../../lang";
    import { DataBase, changeToPreset, copyPreset, downloadPreset, importPreset, presetTemplate } from "../../ts/storage/database";
    import { CopyIcon, DownloadIcon, EditIcon, FolderUpIcon, PlusIcon, TrashIcon, XIcon } from "lucide-svelte";
  import { cloneDeep } from "lodash";

    let editMode = false
    export let close = () => {}

</script>

<div class="absolute w-full h-full z-40 bg-black bg-opacity-50 flex justify-center items-center">
    <div class="bg-darkbg p-4 break-any rounded-md flex flex-col max-w-3xl w-96 max-h-full overflow-y-auto">
        <div class="flex items-center text-neutral-200 mb-4">
            <h2 class="mt-0 mb-0">{language.presets}</h2>
            <div class="flex-grow flex justify-end">
                <button class="text-gray-500 hover:text-green-500 mr-2 cursor-pointer items-center" on:click={close}>
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
            }} class="flex items-center text-neutral-200 border-t-1 border-solid border-0 border-gray-600 p-2 cursor-pointer" class:bg-selected={i === $DataBase.botPresetsId}>
                {#if editMode}
                    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" bind:value={$DataBase.botPresets[i].name} placeholder="string">
                {:else}
                    {#if i < 9}
                    <span class="w-2 text-center mr-2 text-gray-400">{i + 1}</span>
                    {/if}
                    <span>{presets.name}</span>
                {/if}
                <div class="flex-grow flex justify-end">
                    <button class="text-gray-500 hover:text-green-500 cursor-pointer mr-2" on:click={(e) => {
                        e.stopPropagation()
                        copyPreset(i)
                    }}>
                        <CopyIcon size={18}/>
                    </button>
                    <button class="text-gray-500 hover:text-green-500 cursor-pointer mr-2" on:click={(e) => {
                        e.stopPropagation()
                        downloadPreset(i)
                    }}>

                        <DownloadIcon size={18} />
                    </button>
                    <button class="text-gray-500 hover:text-green-500 cursor-pointer" on:click={async (e) => {
                        e.stopPropagation()
                        if($DataBase.botPresets.length === 1){
                            alertError(language.errors.onlyOneChat)
                            return
                        }
                        const d = await alertConfirm(`${language.removeConfirm}${presets.name}`)
                        if(d){
                            changeToPreset(0)
                            let botPresets = $DataBase.botPresets
                            botPresets.splice(i, 1)
                            $DataBase.botPresets = botPresets
                        }
                    }}>
                        <TrashIcon size={18}/>
                    </button>
                </div>
            </button>
        {/each}
        <div class="flex mt-2 items-center">
            <button class="text-gray-500 hover:text-green-500 cursor-pointer mr-1" on:click={() => {
                let botPresets = $DataBase.botPresets
                let newPreset = cloneDeep(presetTemplate)
                newPreset.name = `New Preset`
                botPresets.push(newPreset)

                $DataBase.botPresets = botPresets
            }}>
                <PlusIcon/>
            </button>
            <button class="text-gray-500 hover:text-green-500 mr-2 cursor-pointer" on:click={() => {
                importPreset()
            }}>
                <FolderUpIcon size={18}/>
            </button>
            <button class="text-gray-500 hover:text-green-500 cursor-pointer" on:click={() => {
                editMode = !editMode
            }}>
                <EditIcon size={18}/>
            </button>
        </div>
        <span class="text-gray-400 text-sm">{language.quickPreset}</span>
    </div>
</div>

<style>
    .break-any{
        word-break: normal;
        overflow-wrap: anywhere;
    }
</style>
<script lang="ts">
    import { language } from "src/lang";
    import { DataBase } from "src/ts/storage/database";
    import Button from "src/lib/UI/GUI/Button.svelte";
    import ModuleMenu from "src/lib/Setting/Pages/Module/ModuleMenu.svelte";
    import { exportModule, importModule, type RisuModule } from "src/ts/process/modules";
    import { DownloadIcon, Edit, TrashIcon, Globe, Share2Icon } from "lucide-svelte";
    import { v4 } from "uuid";
    import { tooltip } from "src/ts/gui/tooltip";
    import { alertCardExport, alertConfirm, alertError } from "src/ts/alert";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
  import { ShowRealmFrameStore } from "src/ts/stores";
    let tempModule:RisuModule = {
        name: '',
        description: '',
        id: v4(),
    }
    let mode = 0
    let editModuleIndex = -1
    let moduleSearch = ''

    function sortModules(modules:RisuModule[], search:string){
        const db = $DataBase
        return modules.filter((v) => {
            if(search === '') return true
            return v.name.toLowerCase().includes(search.toLowerCase())
        
        }).sort((a, b) => {
            let score = a.name.toLowerCase().localeCompare(b.name.toLowerCase())
            return score
        })
    }
</script>
{#if mode === 0}
    <h2 class="mb-2 text-2xl font-bold mt-2">{language.modules}</h2>

    <TextInput className="mt-4" placeholder={language.search} bind:value={moduleSearch} />

    <div class="contain w-full max-w-full mt-4 flex flex-col border-selected border-1 rounded-md flex-1 overflow-y-auto">
        {#if $DataBase.modules.length === 0}
            <div class="text-textcolor2 p-3">{language.noModules}</div>
        {:else}
            {#each sortModules($DataBase.modules, moduleSearch) as rmodule, i}
                {#if i !== 0}
                    <div class="border-t-1 border-selected"></div>
                {/if}

                <div class="pl-3 pt-3 text-left flex">
                    <span class="text-lg">{rmodule.name}</span>
                    <div class="flex-grow flex justify-end">
                        <button class={(!$DataBase.enabledModules.includes(rmodule.id)) ?
                                "text-textcolor2 hover:text-green-500 mr-2 cursor-pointer" :
                                "mr-2 cursor-pointer text-blue-500"
                            } use:tooltip={language.enableGlobal} on:click={async (e) => {
                            e.stopPropagation()
                            if($DataBase.enabledModules.includes(rmodule.id)){
                                $DataBase.enabledModules.splice($DataBase.enabledModules.indexOf(rmodule.id), 1)
                            }
                            else{
                                $DataBase.enabledModules.push(rmodule.id)
                            }
                            $DataBase.enabledModules = $DataBase.enabledModules
                        }}>
                            <Globe size={18}/>
                        </button>
                        <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer" use:tooltip={language.download} on:click={async (e) => {
                            e.stopPropagation()
                            const data = await alertCardExport('module')
                            if(data.type === ''){
                                exportModule(rmodule)
                            }
                            if(data.type === 'realm'){
                                const index = $DataBase.modules.findIndex((v) => v.id === rmodule.id)
                                $ShowRealmFrameStore = `module:${index}`
                            }
                        }}>
                            <Share2Icon size={18}/>
                        </button>
                        <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer" use:tooltip={language.edit} on:click={async (e) => {
                            e.stopPropagation()
                            const index = $DataBase.modules.findIndex((v) => v.id === rmodule.id)
                            tempModule = rmodule
                            editModuleIndex = index
                            mode = 2
                        }}>
                            <Edit size={18}/>
                        </button>
                        <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer" use:tooltip={language.remove} on:click={async (e) => {
                            e.stopPropagation()
                            const d = await alertConfirm(`${language.removeConfirm}` + rmodule.name)
                            if(d){
                                const index = $DataBase.modules.findIndex((v) => v.id === rmodule.id)
                                $DataBase.modules.splice(index, 1)
                                $DataBase.modules = $DataBase.modules
                            }
                        }}>
                            <TrashIcon size={18}/>
                        </button>
                    </div>
                </div>
                <div class="mt-1 mb-3 pl-3">
                    <span class="text-sm text-textcolor2">{rmodule.description || 'No description provided'}</span>
                </div>
            {/each}
        {/if}
    </div>
    <Button className="mt-2" on:click={() => {
        tempModule = {
            name: '',
            description: '',
            id: v4(),
        }
        mode = 1
    }}>{language.createModule}</Button>
    <Button className="mt-2" on:click={importModule}>{language.importModule}</Button>
{:else if mode === 1}
    <h2 class="mb-2 text-2xl font-bold mt-2">{language.createModule}</h2>
    <ModuleMenu bind:currentModule={tempModule}/>
    <Button className="mt-6" on:click={() => {
        $DataBase.modules.push(tempModule)
        mode = 0
    }}>{language.createModule}</Button>
{:else if mode === 2}
    <h2 class="mb-2 text-2xl font-bold mt-2">{language.editModule}</h2>
    <ModuleMenu bind:currentModule={tempModule}/>
    {#if tempModule.name !== ''}
        <Button className="mt-6" on:click={() => {
            $DataBase.modules[editModuleIndex] = tempModule
            mode = 0
        }}>{language.editModule}</Button>
    {/if}
{/if}
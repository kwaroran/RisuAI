<script lang="ts">
    import { language } from "src/lang";
    
    import { DBState } from 'src/ts/stores.svelte';
    import Button from "src/lib/UI/GUI/Button.svelte";
    import ModuleMenu from "src/lib/Setting/Pages/Module/ModuleMenu.svelte";
    import { exportModule, importModule, refreshModules, type RisuModule } from "src/ts/process/modules";
    import { DownloadIcon, Edit, TrashIcon, Globe, Share2Icon, PlusIcon, HardDriveUpload, Waypoints, ChevronUp, ChevronDown, ArrowDownAZ, FolderPlus, ChevronRight, FolderOpen, Folder } from "lucide-svelte";
    import { v4 } from "uuid";
    import { tooltip } from "src/ts/gui/tooltip";
    import { alertCardExport, alertConfirm, alertError, alertInput } from "src/ts/alert";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import { ShowRealmFrameStore } from "src/ts/stores.svelte";
    import { onDestroy } from "svelte";
    import { importMCPModule } from "src/ts/process/mcp/mcp";
    import type { ModuleFolder } from "src/ts/storage/database.svelte";
    let tempModule:RisuModule = $state({
        name: '',
        description: '',
        id: v4(),
    })
    let mode = $state(0)
    let editModuleIndex = $state(-1)
    let moduleSearch = $state('')
    let draggedModuleId = $state<string|null>(null)
    let dragOverFolderId = $state<string|null>(null)

    type ModuleOrFolder =
        | { type: 'module', data: RisuModule }
        | { type: 'folder', data: ModuleFolder }

    function sortModules(modules:RisuModule[], search:string):ModuleOrFolder[] {
        const filtered = modules.filter((v) => {
            if(search === '') return true
            return v.name.toLowerCase().includes(search.toLowerCase())
        })

        const folders = DBState.db.modulesFolders ?? []
        const result: ModuleOrFolder[] = []

        if(DBState.db.moduleCustomSort){
            const customOrder = DBState.db.modulesCustomOrder ?? []
            const sorted = filtered.sort((a, b) => {
                const indexA = customOrder.indexOf(a.id)
                const indexB = customOrder.indexOf(b.id)

                // Both not in custom order - keep original relative order
                if(indexA === -1 && indexB === -1) return 0

                // New modules (not in order array) appear at top
                if(indexA === -1) return -1
                if(indexB === -1) return 1

                // Both in custom order - sort by position
                return indexA - indexB
            })

            // Group by folder
            for (const folder of folders) {
                const folderModules = sorted.filter(m => m.folderId === folder.id)
                if (folderModules.length > 0 || !search) {
                    result.push({ type: 'folder', data: folder })
                    if (!folder.folded) {
                        folderModules.forEach(m => result.push({ type: 'module', data: m }))
                    }
                }
            }

            // Add modules without folder
            const modulesWithoutFolder = sorted.filter(m => !m.folderId)
            modulesWithoutFolder.forEach(m => result.push({ type: 'module', data: m }))

            return result
        }
        else{
            const sorted = filtered.sort((a, b) => {
                let score = a.name.toLowerCase().localeCompare(b.name.toLowerCase())
                return score
            })
            return sorted.map(m => ({ type: 'module' as const, data: m }))
        }
    }

    function moveModule(moduleId: string, direction: 'up' | 'down') {
        const currentIndex = DBState.db.modulesCustomOrder.indexOf(moduleId)
        if (currentIndex === -1) return

        const newOrder = [...DBState.db.modulesCustomOrder]

        if (direction === 'up' && currentIndex > 0) {
            // Swap with previous
            const temp = newOrder[currentIndex - 1]
            newOrder[currentIndex - 1] = moduleId
            newOrder[currentIndex] = temp
            DBState.db.modulesCustomOrder = newOrder
        } else if (direction === 'down' && currentIndex < newOrder.length - 1) {
            // Swap with next
            const temp = newOrder[currentIndex + 1]
            newOrder[currentIndex + 1] = moduleId
            newOrder[currentIndex] = temp
            DBState.db.modulesCustomOrder = newOrder
        }
    }

    function onDragStart(e: DragEvent, moduleId: string) {
        e.stopPropagation()
        draggedModuleId = moduleId
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', moduleId)
        }
    }

    function onDragOver(e: DragEvent) {
        e.preventDefault()
        e.stopPropagation()
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move'
        }
    }

    function onDrop(e: DragEvent, targetModuleId: string) {
        e.preventDefault()
        e.stopPropagation()

        if (!draggedModuleId || draggedModuleId === targetModuleId) {
            draggedModuleId = null
            dragOverFolderId = null
            return
        }

        const draggedIndex = DBState.db.modulesCustomOrder.indexOf(draggedModuleId)
        const targetIndex = DBState.db.modulesCustomOrder.indexOf(targetModuleId)

        if (draggedIndex === -1 || targetIndex === -1) {
            draggedModuleId = null
            dragOverFolderId = null
            return
        }

        // Create new array to ensure reactivity
        const newOrder = [...DBState.db.modulesCustomOrder]
        // Remove from old position
        newOrder.splice(draggedIndex, 1)
        // Insert at new position
        newOrder.splice(targetIndex, 0, draggedModuleId)

        // Update database
        DBState.db.modulesCustomOrder = newOrder
        draggedModuleId = null
        dragOverFolderId = null
    }

    function onDropOnFolder(e: DragEvent, folderId: string) {
        e.preventDefault()
        e.stopPropagation()

        if (!draggedModuleId) {
            dragOverFolderId = null
            return
        }

        // Find the dragged module and update its folderId
        const module = DBState.db.modules.find(m => m.id === draggedModuleId)
        if (module) {
            module.folderId = folderId
            DBState.db.modules = [...DBState.db.modules]
        }

        draggedModuleId = null
        dragOverFolderId = null
    }

    function onDragOverFolder(e: DragEvent, folderId: string) {
        e.preventDefault()
        e.stopPropagation()
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move'
        }
        dragOverFolderId = folderId
    }

    function onDragLeaveFolder(e: DragEvent) {
        e.stopPropagation()
        dragOverFolderId = null
    }

    function removeFromFolder(moduleId: string) {
        const module = DBState.db.modules.find(m => m.id === moduleId)
        if (module) {
            module.folderId = undefined
            DBState.db.modules = [...DBState.db.modules]
        }
    }

    function resetModuleOrder() {
        const sortedModules = [...DBState.db.modules].sort((a, b) =>
            a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        )
        DBState.db.modulesCustomOrder = sortedModules.map(m => m.id)
    }

    async function createFolder() {
        const name = await alertInput(language.folderName)
        if(!name) return

        const newFolder: ModuleFolder = {
            id: v4(),
            name: name,
            folded: false
        }
        DBState.db.modulesFolders = [...(DBState.db.modulesFolders ?? []), newFolder]
    }

    function toggleFolder(folderId: string) {
        const folders = DBState.db.modulesFolders ?? []
        const folder = folders.find(f => f.id === folderId)
        if(folder) {
            folder.folded = !folder.folded
            DBState.db.modulesFolders = [...folders]
        }
    }

    async function deleteFolder(folderId: string) {
        const confirmed = await alertConfirm(language.removeFolderConfirm)
        if(!confirmed) return

        // Remove folderId from all modules in this folder
        DBState.db.modules = DBState.db.modules.map(m => {
            if(m.folderId === folderId) {
                return {...m, folderId: undefined}
            }
            return m
        })

        // Remove folder
        DBState.db.modulesFolders = (DBState.db.modulesFolders ?? []).filter(f => f.id !== folderId)
    }

    async function renameFolder(folderId: string) {
        const folders = DBState.db.modulesFolders ?? []
        const folder = folders.find(f => f.id === folderId)
        if(!folder) return

        const newName = await alertInput(language.folderName, folder.name)
        if(!newName) return

        folder.name = newName
        DBState.db.modulesFolders = [...folders]
    }

    onDestroy(() => {
        refreshModules()
    })
</script>
{#if mode === 0}
    <h2 class="mb-2 text-2xl font-bold mt-2">{language.modules}</h2>

    <TextInput className="mt-4" placeholder={language.search} bind:value={moduleSearch} />

    {#if DBState.db.moduleCustomSort}
        <button
            class="mt-2 text-textcolor2 hover:text-green-500 cursor-pointer flex items-center gap-1"
            onclick={resetModuleOrder}
            use:tooltip={"Reset to alphabetical order"}
        >
            <ArrowDownAZ size={18} />
            <span class="text-sm">Reset to Name Order</span>
        </button>
    {/if}

    <div class="contain w-full max-w-full mt-4 flex flex-col border-selected border-1 rounded-md flex-1 overflow-y-auto">
        {#if DBState.db.modules.length === 0}
            <div class="text-textcolor2 p-3">{language.noModules}</div>
        {:else}
            {#each sortModules(DBState.db.modules, moduleSearch) as item, i}
                {#if i !== 0}
                    <div class="border-t-1 border-selected"></div>
                {/if}

                {#if item.type === 'folder'}
                    <div
                        class="pl-3 pt-3 pb-3 text-left flex items-center hover:bg-selected/20 {dragOverFolderId === item.data.id ? 'bg-green-500/20' : ''}"
                        ondragover={(e) => onDragOverFolder(e, item.data.id)}
                        ondragleave={onDragLeaveFolder}
                        ondrop={(e) => onDropOnFolder(e, item.data.id)}
                    >
                        <button
                            class="text-textcolor2 hover:text-green-500 cursor-pointer mr-2"
                            onclick={() => toggleFolder(item.data.id)}
                        >
                            {#if item.data.folded}
                                <ChevronRight size={18}/>
                            {:else}
                                <ChevronDown size={18}/>
                            {/if}
                        </button>
                        {#if item.data.folded}
                            <FolderOpen size={18} class="mr-2" />
                        {:else}
                            <Folder size={18} class="mr-2" />
                        {/if}
                        <span class="text-lg font-semibold">{item.data.name}</span>
                        <div class="flex-grow flex justify-end">
                            <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer" use:tooltip={"Rename Folder"} onclick={() => renameFolder(item.data.id)}>
                                <Edit size={18}/>
                            </button>
                            <button class="text-textcolor2 hover:text-red-500 mr-2 cursor-pointer" use:tooltip={"Delete Folder"} onclick={() => deleteFolder(item.data.id)}>
                                <TrashIcon size={18}/>
                            </button>
                        </div>
                    </div>
                {:else}
                    {@const rmodule = item.data}
                    <div
                        draggable={DBState.db.moduleCustomSort}
                        ondragstart={(e) => onDragStart(e, rmodule.id)}
                        ondragover={onDragOver}
                        ondrop={(e) => onDrop(e, rmodule.id)}
                        class={DBState.db.moduleCustomSort ? 'cursor-move' : ''}
                        style={rmodule.folderId ? 'padding-left: 2rem;' : ''}
                    >
                        <div class="pl-3 pt-3 text-left flex items-center">
                    {#if DBState.db.moduleCustomSort}
                        <div class="flex flex-col mr-2">
                            <button
                                class="text-textcolor2 hover:text-green-500 cursor-pointer"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    moveModule(rmodule.id, 'up')
                                }}
                            >
                                <ChevronUp size={16}/>
                            </button>
                            <button
                                class="text-textcolor2 hover:text-green-500 cursor-pointer"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    moveModule(rmodule.id, 'down')
                                }}
                            >
                                <ChevronDown size={16}/>
                            </button>
                        </div>
                    {/if}
                    {#if rmodule.folderId}
                        <button
                            class="text-textcolor2 hover:text-yellow-500 mr-2 cursor-pointer"
                            use:tooltip={"Remove from Folder"}
                            onclick={(e) => {
                                e.stopPropagation()
                                removeFromFolder(rmodule.id)
                            }}
                        >
                            <FolderOpen size={18}/>
                        </button>
                    {/if}
                    {#if rmodule.mcp}
                        <Waypoints size={18} class="mr-2" />
                    {/if}
                    <span class="text-lg">{rmodule.name}</span>
                    <div class="flex-grow flex justify-end">
                        <button class={(DBState.db.enabledModules.includes(rmodule.id)) ?
                                "mr-2 cursor-pointer text-blue-500" :
                                rmodule.namespace &&
                                DBState.db.moduleIntergration?.split(',').map((s) => s.trim()).includes(rmodule.namespace) ?
                                "text-amber-500 hover:text-green-500 mr-2 cursor-pointer" :
                                "text-textcolor2 hover:text-green-500 mr-2 cursor-pointer"
                            } use:tooltip={language.enableGlobal} onclick={async (e) => {
                            e.stopPropagation()
                            if(DBState.db.enabledModules.includes(rmodule.id)){
                                DBState.db.enabledModules = DBState.db.enabledModules.filter(id => id !== rmodule.id)
                            }
                            else{
                                DBState.db.enabledModules = [...DBState.db.enabledModules, rmodule.id]
                            }
                        }}>
                            <Globe size={18}/>
                        </button>
                        {#if !rmodule.mcp}
                            <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer" use:tooltip={language.download} onclick={async (e) => {
                                e.stopPropagation()
                                exportModule(rmodule)
                            }}>
                                <Share2Icon size={18}/>
                            </button>
                            <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer" use:tooltip={language.edit} onclick={async (e) => {
                                e.stopPropagation()
                                const index = DBState.db.modules.findIndex((v) => v.id === rmodule.id)
                                tempModule = rmodule
                                editModuleIndex = index
                                mode = 2
                            }}>
                                <Edit size={18}/>
                            </button>
                        {:else}
                            <button class="text-textcolor2 mr-2 cursor-not-allowed">
                                <Share2Icon size={18}/>
                            </button>
                            <button class="text-textcolor2 mr-2 cursor-not-allowed">
                                <Edit size={18}/>
                            </button>
                        {/if}
                        <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer" use:tooltip={language.remove} onclick={async (e) => {
                            e.stopPropagation()
                            const d = await alertConfirm(`${language.removeConfirm}` + rmodule.name)
                            if(d){
                                // Remove from enabled modules
                                if(DBState.db.enabledModules.includes(rmodule.id)){
                                    DBState.db.enabledModules = DBState.db.enabledModules.filter(id => id !== rmodule.id)
                                }
                                // Remove from modules list
                                DBState.db.modules = DBState.db.modules.filter(m => m.id !== rmodule.id)
                                // Remove from custom order array
                                DBState.db.modulesCustomOrder = DBState.db.modulesCustomOrder.filter(id => id !== rmodule.id)
                            }
                        }}>
                            <TrashIcon size={18}/>
                        </button>
                    </div>
                </div>
                        <div class="mt-1 mb-3 pl-3">
                            <span class="text-sm text-textcolor2">{rmodule.description || 'No description provided'}</span>
                        </div>
                    </div>
                {/if}
            {/each}
        {/if}
    </div>

    <div class="flex mr-2 mt-4">
        <button class="text-textcolor2 hover:text-blue-500 mr-2 cursor-pointer" use:tooltip={"Create Module"} onclick={async () => {
            tempModule = {
                name: '',
                description: '',
                id: v4(),
            }
            DBState.db.modules.push(tempModule)
            DBState.db.modulesCustomOrder.unshift(tempModule.id)
            mode = 1
        }}>
            <PlusIcon />
        </button>
        {#if DBState.db.moduleCustomSort}
            <button class="text-textcolor2 hover:text-blue-500 mr-2 cursor-pointer" use:tooltip={"Create Folder"} onclick={createFolder}>
                <FolderPlus />
            </button>
        {/if}
        <button class="text-textcolor2 hover:text-blue-500 mr-2 cursor-pointer" use:tooltip={"Import MCP Module"} onclick={async () => {
            importMCPModule()
        }}>
            <Waypoints />
        </button>
        <button class="text-textcolor2 hover:text-blue-500 mr-2 cursor-pointer" use:tooltip={"Import Module"} onclick={async () => {
            importModule()
        }}>
            <HardDriveUpload  />
        </button>
    </div>
{:else if mode === 1}
    <h2 class="mb-2 text-2xl font-bold mt-2">{language.createModule}</h2>
    <ModuleMenu bind:currentModule={tempModule}/>
    <Button className="mt-6" onclick={() => {
        DBState.db.modules.push(tempModule)
        mode = 0
    }}>{language.createModule}</Button>
{:else if mode === 2}
    <h2 class="mb-2 text-2xl font-bold mt-2">{language.editModule}</h2>
    <ModuleMenu bind:currentModule={tempModule}/>
    {#if tempModule.name !== ''}
        <Button className="mt-6" onclick={() => {
            DBState.db.modules[editModuleIndex] = tempModule
            mode = 0
        }}>{language.editModule}</Button>
    {/if}
{/if}
<script lang="ts">
    import { language } from "src/lang";
    
    import { DBState } from 'src/ts/stores.svelte';
    import Button from "src/lib/UI/GUI/Button.svelte";
    import ModuleMenu from "src/lib/Setting/Pages/Module/ModuleMenu.svelte";
    import { exportModule, importModule, refreshModules, type RisuModule } from "src/ts/process/modules";
    import { DownloadIcon, Edit, TrashIcon, Globe, Share2Icon, PlusIcon, HardDriveUpload, Waypoints, ChevronUp, ChevronDown, ArrowDownAZ, FolderPlus, ChevronRight, FolderOpen, Folder } from "lucide-svelte";
    import { v4 } from "uuid";
    import { tooltip } from "src/ts/gui/tooltip";
    import { alertCardExport, alertConfirm, alertError, alertInput, alertSelect } from "src/ts/alert";
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
    let draggedFolderId = $state<string|null>(null)

    type ModuleOrFolder =
        | { type: 'module', data: RisuModule }
        | { type: 'folder', data: ModuleFolder }

    // Helper: Get modules in a folder that match the filter
    function getFolderModules(folder: ModuleFolder, filteredModules: RisuModule[]): RisuModule[] {
        return (folder.moduleOrder ?? [])
            .map(moduleId => filteredModules.find(m => m.id === moduleId))
            .filter(m => m !== undefined) as RisuModule[]
    }

    // Helper: Swap two items in an array by their indices
    function swapArrayItems(array: string[], index1: number, index2: number): string[] {
        const newArray = [...array]
        const temp = newArray[index2]
        newArray[index2] = newArray[index1]
        newArray[index1] = temp
        return newArray
    }

    function sortModules(modules:RisuModule[], search:string):ModuleOrFolder[] {
        const filtered = modules.filter((v) => {
            if(search === '') return true
            return v.name.toLowerCase().includes(search.toLowerCase())
        })

        const folders = DBState.db.modulesFolders ?? []

        if(DBState.db.moduleCustomSort){
            const customOrder = DBState.db.modulesCustomOrder ?? []
            const items: ModuleOrFolder[] = []

            for (const id of customOrder) {
                // Check if it's a folder
                const folder = folders.find(f => f.id === id)
                if (folder) {
                    const folderModules = getFolderModules(folder, filtered)

                    if (folderModules.length > 0 || !search) {
                        items.push({ type: 'folder', data: folder })
                        if (!folder.folded) {
                            // Add modules in order from folder's moduleOrder
                            folderModules.forEach(m => items.push({ type: 'module', data: m }))
                        }
                    }
                } else {
                    // It's a module ID - find the module (should not have folderId)
                    const module = filtered.find(m => m.id === id && !m.folderId)
                    if (module) {
                        items.push({ type: 'module', data: module })
                    }
                }
            }

            // Add any new items not in customOrder
            for (const folder of folders) {
                if (!customOrder.includes(folder.id)) {
                    const folderModules = getFolderModules(folder, filtered)

                    if (folderModules.length > 0 || !search) {
                        items.unshift({ type: 'folder', data: folder })
                    }
                }
            }

            for (const module of filtered) {
                if (!module.folderId && !customOrder.includes(module.id)) {
                    items.unshift({ type: 'module', data: module })
                }
            }

            return items
        }
        else{
            const sorted = filtered.sort((a, b) =>
                a.name.toLowerCase().localeCompare(b.name.toLowerCase())
            )
            return sorted.map(m => ({ type: 'module' as const, data: m }))
        }
    }

    // Move either module or folder within their respective list
    function moveItem(itemId: string, direction: 'up' | 'down') {
        const folders = DBState.db.modulesFolders ?? []
        const isFolder = folders.some(f => f.id === itemId)

        if (isFolder) {
            // Move folder within modulesCustomOrder
            const currentIndex = DBState.db.modulesCustomOrder.indexOf(itemId)
            if (currentIndex === -1) return

            const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
            if (targetIndex < 0 || targetIndex >= DBState.db.modulesCustomOrder.length) return

            DBState.db.modulesCustomOrder = swapArrayItems(DBState.db.modulesCustomOrder, currentIndex, targetIndex)
        } else {
            // It's a module - find which list it's in
            const module = DBState.db.modules.find(m => m.id === itemId)
            if (!module) return

            if (module.folderId) {
                // Module is in a folder - move within that folder's moduleOrder
                const folder = folders.find(f => f.id === module.folderId)
                if (!folder) return

                const moduleOrder = folder.moduleOrder ?? []
                const currentIndex = moduleOrder.indexOf(itemId)
                if (currentIndex === -1) return

                const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
                if (targetIndex < 0 || targetIndex >= moduleOrder.length) return

                folder.moduleOrder = swapArrayItems(moduleOrder, currentIndex, targetIndex)
                DBState.db.modulesFolders = [...folders]
            } else {
                // Module is not in a folder - move within modulesCustomOrder
                const currentIndex = DBState.db.modulesCustomOrder.indexOf(itemId)
                if (currentIndex === -1) return

                const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
                if (targetIndex < 0 || targetIndex >= DBState.db.modulesCustomOrder.length) return

                DBState.db.modulesCustomOrder = swapArrayItems(DBState.db.modulesCustomOrder, currentIndex, targetIndex)
            }
        }
    }

    // Helper to reorder items by moving dragged item to target position
    function reorderItems(draggedId: string, targetId: string) {
        // Determine which list they're in
        const draggedModule = DBState.db.modules.find(m => m.id === draggedId)

        const folders = DBState.db.modulesFolders ?? []
        const draggedIsFolder = folders.some(f => f.id === draggedId)

        // Folders or modules without folderId use modulesCustomOrder
        if (draggedIsFolder || !draggedModule?.folderId) {
            const draggedIndex = DBState.db.modulesCustomOrder.indexOf(draggedId)
            const targetIndex = DBState.db.modulesCustomOrder.indexOf(targetId)

            if (draggedIndex === -1 || targetIndex === -1) return false

            const newOrder = [...DBState.db.modulesCustomOrder]
            newOrder.splice(draggedIndex, 1)
            newOrder.splice(targetIndex, 0, draggedId)
            DBState.db.modulesCustomOrder = newOrder
            return true
        } else if (draggedModule.folderId) {
            // Reorder within folder's moduleOrder
            const folder = folders.find(f => f.id === draggedModule.folderId)
            if (!folder) return false

            const moduleOrder = folder.moduleOrder ?? []
            const draggedIndex = moduleOrder.indexOf(draggedId)
            const targetIndex = moduleOrder.indexOf(targetId)

            if (draggedIndex === -1 || targetIndex === -1) return false

            const newOrder = [...moduleOrder]
            newOrder.splice(draggedIndex, 1)
            newOrder.splice(targetIndex, 0, draggedId)
            folder.moduleOrder = newOrder
            DBState.db.modulesFolders = [...folders]
            return true
        }

        return false
    }

    // Helper to update module's folderId and manage moduleOrder arrays
    function updateModuleFolderId(moduleId: string, folderId: string | undefined) {
        const module = DBState.db.modules.find(m => m.id === moduleId)
        if (!module) return

        const folders = DBState.db.modulesFolders ?? []
        const oldFolderId = module.folderId

        // If moving from one folder/location to another
        if (oldFolderId !== folderId) {
            // Remove from old location
            if (oldFolderId) {
                // Remove from old folder's moduleOrder
                const oldFolder = folders.find(f => f.id === oldFolderId)
                if (oldFolder) {
                    oldFolder.moduleOrder = (oldFolder.moduleOrder ?? []).filter(id => id !== moduleId)
                }
            } else {
                // Remove from modulesCustomOrder
                DBState.db.modulesCustomOrder = DBState.db.modulesCustomOrder.filter(id => id !== moduleId)
            }

            // Add to new location
            if (folderId) {
                // Add to new folder's moduleOrder
                const newFolder = folders.find(f => f.id === folderId)
                if (newFolder) {
                    newFolder.moduleOrder = [...(newFolder.moduleOrder ?? []), moduleId]
                }
            } else {
                // Add to modulesCustomOrder
                DBState.db.modulesCustomOrder = [...DBState.db.modulesCustomOrder, moduleId]
            }

            // Update module's folderId
            module.folderId = folderId

            // Trigger reactivity
            DBState.db.modules = [...DBState.db.modules]
            DBState.db.modulesFolders = [...folders]
        }
    }

    // Helper to clear all drag states
    function clearDragState() {
        draggedModuleId = null
        draggedFolderId = null
        dragOverFolderId = null
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

        // Handle folder being dragged onto module (reorder)
        if (draggedFolderId) {
            reorderItems(draggedFolderId, targetModuleId)
            clearDragState()
            return
        }

        // Handle module being dragged onto module
        if (!draggedModuleId || draggedModuleId === targetModuleId) {
            clearDragState()
            return
        }

        // Set the dragged module's folderId to match the target module's folderId
        // If target has folderId, dragged goes into that folder
        // If target has no folderId, dragged goes out of folder
        const targetModule = DBState.db.modules.find(m => m.id === targetModuleId)
        if (targetModule) {
            updateModuleFolderId(draggedModuleId, targetModule.folderId)
        }

        // Reorder in custom order
        reorderItems(draggedModuleId, targetModuleId)

        clearDragState()
    }

    function onDropOnFolder(e: DragEvent, folderId: string) {
        e.preventDefault()
        e.stopPropagation()

        if (!draggedModuleId) {
            clearDragState()
            return
        }

        // Update the dragged module's folderId
        updateModuleFolderId(draggedModuleId, folderId)

        clearDragState()
    }

    function onDragLeaveFolder(e: DragEvent) {
        e.stopPropagation()
        dragOverFolderId = null
    }

    function removeFromFolder(moduleId: string) {
        updateModuleFolderId(moduleId, undefined)
    }

    async function moveModuleToFolder(moduleId: string) {
        const folders = DBState.db.modulesFolders ?? []
        if (folders.length === 0) {
            alertError('No folders available')
            return
        }

        const folderNames = folders.map(f => f.name)
        const selectedIndexStr = await alertSelect(folderNames)
        if (!selectedIndexStr) return

        const selectedIndex = parseInt(selectedIndexStr)
        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= folders.length) return

        const selectedFolder = folders[selectedIndex]
        updateModuleFolderId(moduleId, selectedFolder.id)
    }

    function resetModuleOrder() {
        const folders = DBState.db.modulesFolders ?? []
        const modules = DBState.db.modules

        // Sort each folder's modules by name
        folders.forEach(folder => {
            const folderModules = modules
                .filter(m => m.folderId === folder.id)
                .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
            folder.moduleOrder = folderModules.map(m => m.id)
        })

        // Get modules without folder
        const modulesWithoutFolder = modules.filter(m => !m.folderId)

        // Combine and sort all top-level items (folders + modules without folder) by name
        const combined: { id: string, name: string }[] = [
            ...folders.map(f => ({ id: f.id, name: f.name })),
            ...modulesWithoutFolder.map(m => ({ id: m.id, name: m.name }))
        ].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))

        DBState.db.modulesCustomOrder = combined.map(item => item.id)
        DBState.db.modulesFolders = [...folders]
    }

    async function createFolder() {
        const name = await alertInput(language.folderName)
        if(!name) return

        // Check for duplicate folder name
        const folders = DBState.db.modulesFolders ?? []
        if (folders.some(f => f.name === name)) {
            alertError('Folder with this name already exists')
            return
        }

        const newFolder: ModuleFolder = {
            id: v4(),
            name: name,
            folded: false
        }
        DBState.db.modulesFolders = [...folders, newFolder]
        // Add to order
        DBState.db.modulesCustomOrder = [newFolder.id, ...DBState.db.modulesCustomOrder]
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

        const folder = (DBState.db.modulesFolders ?? []).find(f => f.id === folderId)
        if (!folder) return

        // Add all modules from folder back to modulesCustomOrder
        const modulesToMove = folder.moduleOrder ?? []
        DBState.db.modulesCustomOrder = [...DBState.db.modulesCustomOrder, ...modulesToMove]

        // Remove folderId from all modules in this folder
        DBState.db.modules = DBState.db.modules.map(m => {
            if(m.folderId === folderId) {
                return {...m, folderId: undefined}
            }
            return m
        })

        // Remove folder
        DBState.db.modulesFolders = (DBState.db.modulesFolders ?? []).filter(f => f.id !== folderId)
        // Remove from order
        DBState.db.modulesCustomOrder = DBState.db.modulesCustomOrder.filter(id => id !== folderId)
    }

    async function renameFolder(folderId: string) {
        const folders = DBState.db.modulesFolders ?? []
        const folder = folders.find(f => f.id === folderId)
        if(!folder) return

        const newName = await alertInput(`${language.folderName}: ${folder.name}`)
        if(!newName) return

        // Check for duplicate folder name (excluding current folder)
        if (folders.some(f => f.id !== folderId && f.name === newName)) {
            alertError('Folder with this name already exists')
            return
        }

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
            class="mt-2 text-textcolor2 hover:text-green-500 cursor-pointer inline-flex items-center gap-1 w-fit"
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
                        role="listitem"
                        draggable={DBState.db.moduleCustomSort}
                        ondragstart={(e) => {
                            e.stopPropagation()
                            draggedFolderId = item.data.id
                            if (e.dataTransfer) {
                                e.dataTransfer.effectAllowed = 'move'
                                e.dataTransfer.setData('text/plain', item.data.id)
                            }
                        }}
                        class="pl-3 pt-3 pb-3 text-left flex items-center hover:bg-selected/20 {dragOverFolderId === item.data.id ? 'bg-green-500/20' : ''} {DBState.db.moduleCustomSort ? 'cursor-move' : ''}"
                        ondragover={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (e.dataTransfer) {
                                e.dataTransfer.dropEffect = 'move'
                            }
                            if (draggedModuleId) {
                                dragOverFolderId = item.data.id
                            }
                        }}
                        ondragleave={onDragLeaveFolder}
                        ondrop={(e) => {
                            e.preventDefault()
                            e.stopPropagation()

                            // If dropping a module on folder
                            if (draggedModuleId) {
                                onDropOnFolder(e, item.data.id)
                                return
                            }

                            // If dropping a folder on folder (reorder)
                            if (draggedFolderId && draggedFolderId !== item.data.id) {
                                reorderItems(draggedFolderId, item.data.id)
                                clearDragState()
                            }
                        }}
                    >
                        {#if DBState.db.moduleCustomSort}
                            <div class="flex flex-col mr-2">
                                <button
                                    class="text-textcolor2 hover:text-green-500 cursor-pointer"
                                    onclick={(e) => {
                                        e.stopPropagation()
                                        moveItem(item.data.id, 'up')
                                    }}
                                >
                                    <ChevronUp size={16}/>
                                </button>
                                <button
                                    class="text-textcolor2 hover:text-green-500 cursor-pointer"
                                    onclick={(e) => {
                                        e.stopPropagation()
                                        moveItem(item.data.id, 'down')
                                    }}
                                >
                                    <ChevronDown size={16}/>
                                </button>
                            </div>
                        {/if}
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
                        {#if !item.data.folded}
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
                        role="listitem"
                        draggable={DBState.db.moduleCustomSort}
                        ondragstart={(e) => onDragStart(e, rmodule.id)}
                        ondragover={onDragOver}
                        ondrop={(e) => onDrop(e, rmodule.id)}
                        class="{DBState.db.moduleCustomSort ? 'cursor-move' : ''} {rmodule.folderId && DBState.db.moduleCustomSort ? 'border-l-4 border-selected pl-2' : ''}"
                    >
                        <div class="pl-3 pt-3 text-left flex items-center">
                    {#if DBState.db.moduleCustomSort}
                        <div class="flex flex-col mr-2">
                            <button
                                class="text-textcolor2 hover:text-green-500 cursor-pointer"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    moveItem(rmodule.id, 'up')
                                }}
                            >
                                <ChevronUp size={16}/>
                            </button>
                            <button
                                class="text-textcolor2 hover:text-green-500 cursor-pointer"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    moveItem(rmodule.id, 'down')
                                }}
                            >
                                <ChevronDown size={16}/>
                            </button>
                        </div>
                    {/if}
                    {#if rmodule.mcp}
                        <Waypoints size={18} class="mr-2" />
                    {/if}
                    <span class="text-lg">{rmodule.name}</span>
                    <div class="flex-grow flex justify-end">
                        {#if rmodule.folderId && DBState.db.moduleCustomSort}
                            <button
                                class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer"
                                use:tooltip={"Remove from Folder"}
                                onclick={(e) => {
                                    e.stopPropagation()
                                    removeFromFolder(rmodule.id)
                                }}
                            >
                                <FolderOpen size={18}/>
                            </button>
                        {/if}
                        {#if DBState.db.moduleCustomSort && !rmodule.folderId}
                            <button
                                class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer"
                                use:tooltip={"Move to Folder"}
                                onclick={(e) => {
                                    e.stopPropagation()
                                    moveModuleToFolder(rmodule.id)
                                }}
                            >
                                <FolderPlus size={18}/>
                            </button>
                        {/if}
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
                                // If module is in a folder, remove from folder's moduleOrder
                                if(rmodule.folderId){
                                    const folders = DBState.db.modulesFolders ?? []
                                    const folder = folders.find(f => f.id === rmodule.folderId)
                                    if(folder && folder.moduleOrder){
                                        folder.moduleOrder = folder.moduleOrder.filter(id => id !== rmodule.id)
                                    }
                                    DBState.db.modulesFolders = [...folders]
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
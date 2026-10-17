<script lang="ts" module>
    const FILE_DROP_CONTEXT = Symbol('fileDrop')

    export type FileDropTarget = 'module'

    type FileDropContext = {
        register: (target: FileDropTarget) => () => void
    }
</script>

<script lang="ts">
    import { getContext, setContext, type Snippet } from 'svelte'
    import { language } from 'src/lang'
    import { alertNormal } from 'src/ts/alert'
    import { importCharacterProcess } from 'src/ts/characterCards'
    import { RISU_APP_INTERNAL_DRAG_TYPE, RISU_SIDEBAR_DRAG_TYPE } from 'src/ts/dragTypes'
    import { checkCharOrder } from 'src/ts/globalApi.svelte'
    import { importModuleFile } from 'src/ts/process/modules'
    import { importPreset } from 'src/ts/storage/database.svelte'

    /**
     * Without a parent zone, the zone owns the drop handlers and imports by file extension.
     * Inside a parent zone, it renders no element and while mounted with `target: 'module'`, makes the parent import `.charx` as a module.
     */
    let { children, target }: { children: Snippet, target?: FileDropTarget } = $props()

    const parent = getContext<FileDropContext | undefined>(FILE_DROP_CONTEXT)
    const targets: FileDropTarget[] = []

    if (parent) {
        $effect(() => {
            if (target) {
                return parent.register(target)
            }
        })
    } else {
        setContext<FileDropContext>(FILE_DROP_CONTEXT, {
            register: (registered) => {
                targets.push(registered)
                return () => {
                    targets.splice(targets.lastIndexOf(registered), 1)
                }
            },
        })
    }

    const internalDrag = (e: DragEvent) => {
        const types = Array.from(e.dataTransfer?.types ?? [])
        return types.includes(RISU_SIDEBAR_DRAG_TYPE) || types.includes(RISU_APP_INTERNAL_DRAG_TYPE)
    }

    const importFile = async (file: File) => {
        const name = file.name.toLowerCase()
        const moduleTarget = targets.includes('module')

        if (name.endsWith('.risup')) {
            const data = new Uint8Array(await file.arrayBuffer())
            await importPreset({ name: file.name, data })
            alertNormal(language.successImport)
        } else if (name.endsWith('.risum') || (moduleTarget && name.endsWith('.charx'))) {
            const data = new Uint8Array(await file.arrayBuffer())
            await importModuleFile({ name: file.name, data })
        } else {
            await importCharacterProcess({ name: file.name, data: file })
            checkCharOrder()
        }
    }
</script>

{#if parent}
    {@render children()}
{:else}
    <div
        class="contents"
        role="presentation"
        ondragover={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = !internalDrag(e) && e.dataTransfer.types.includes('Files') ? 'copy' : 'none'
        }}
        ondragstart={(e) => {
            e.dataTransfer?.setData(RISU_APP_INTERNAL_DRAG_TYPE, 'true')
        }}
        ondrop={async (e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (internalDrag(e) || !file) {
                return
            }
            await importFile(file)
        }}
    >
        {@render children()}
    </div>
{/if}

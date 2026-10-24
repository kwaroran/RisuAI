<script lang="ts" module>
    const FILE_DROP_CONTEXT = Symbol('fileDrop')

    export type FileDropTarget = 'auto' | 'module' | 'plugin'

    type FileDropContext = {
        register: (target: FileDropTarget) => () => void
    }
</script>

<script lang="ts">
    import { DownloadIcon } from '@lucide/svelte'
    import { getContext, setContext, type Snippet } from 'svelte'
    import { language } from 'src/lang'
    import { alertNormal } from 'src/ts/alert'
    import { importCharacterProcess } from 'src/ts/characterCards'
    import { RISU_APP_INTERNAL_DRAG_TYPE, RISU_SIDEBAR_DRAG_TYPE } from 'src/ts/dragTypes'
    import { checkCharOrder } from 'src/ts/globalApi.svelte'
    import { importPlugin } from 'src/ts/plugins/plugins.svelte'
    import { importModuleFile } from 'src/ts/process/modules'
    import { importPreset } from 'src/ts/storage/database.svelte'

    /**
     * Without a parent zone, the zone owns the viewport-wide drop handlers and accepts files only while a child zone is mounted.
     * Inside a parent zone, it renders no element and registers `target` while mounted.
     * `'auto'` imports `.risup` as a preset, `.risum` as a module, and others as a character.
     * Other targets take precedence over `'auto'`.
     * `'module'` imports only `.charx` and `.risum`, as modules.
     * `'plugin'` installs only `.js` and `.ts` plugins.
     */
    let { children, target }: { children: Snippet, target?: FileDropTarget } = $props()

    const parent = getContext<FileDropContext | undefined>(FILE_DROP_CONTEXT)
    const targets: FileDropTarget[] = []
    let dragDepth = $state(0)
    let overlayTarget = $state<FileDropTarget | undefined>()

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

    const fileDrag = (e: DragEvent) => {
        return !internalDrag(e) && Array.from(e.dataTransfer?.types ?? []).includes('Files')
    }

    const activeTarget = (): FileDropTarget | undefined => {
        return targets.findLast((target) => target !== 'auto') ?? targets.at(-1)
    }

    const overlayLabelKeys = {
        auto: 'dropToImport',
        module: 'dropToImportModule',
        plugin: 'dropToImportPlugin',
    } as const satisfies Record<FileDropTarget, keyof typeof language>

    const resetOverlay = () => {
        dragDepth = 0
    }

    const importFile = async (file: File) => {
        const name = file.name.toLowerCase()
        const target = activeTarget()

        if (target === 'module') {
            if (name.endsWith('.charx') || name.endsWith('.risum')) {
                const data = new Uint8Array(await file.arrayBuffer())
                await importModuleFile({ name: file.name, data })
            }
        } else if (target === 'plugin') {
            if (name.endsWith('.js') || name.endsWith('.ts')) {
                const code = (await file.text()).replace(/^\uFEFF/gm, '')
                await importPlugin(code, { isTypescript: name.endsWith('.ts') })
            }
        } else if (!target) {
            return
        } else if (name.endsWith('.risup')) {
            const data = new Uint8Array(await file.arrayBuffer())
            await importPreset({ name: file.name, data })
            alertNormal(language.successImport)
        } else if (name.endsWith('.risum')) {
            const data = new Uint8Array(await file.arrayBuffer())
            await importModuleFile({ name: file.name, data })
        } else {
            await importCharacterProcess({ name: file.name, data: file })
            checkCharOrder()
        }
    }
</script>

<svelte:window ondragendcapture={resetOverlay} ondropcapture={resetOverlay} />

{#if parent}
    {@render children()}
{:else}
    <div
        class="contents"
        role="presentation"
        ondragover={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = fileDrag(e) && activeTarget() ? 'copy' : 'none'
        }}
        ondragenter={(e) => {
            if (!fileDrag(e)) {
                return
            }
            if (dragDepth === 0) {
                overlayTarget = activeTarget()
            }
            dragDepth++
        }}
        ondragleave={(e) => {
            if (!fileDrag(e) || dragDepth === 0) {
                return
            }
            dragDepth--
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
        {#if dragDepth > 0 && overlayTarget}
            <div class="fixed inset-0 z-50 p-4 bg-bgcolor/80 pointer-events-none">
                <div class="w-full h-full flex flex-col gap-3 justify-center items-center rounded-lg border-2 border-dashed border-textcolor/30 text-textcolor text-xl">
                    <DownloadIcon size={40} />
                    <span>{language[overlayLabelKeys[overlayTarget]]}</span>
                </div>
            </div>
        {/if}
    </div>
{/if}

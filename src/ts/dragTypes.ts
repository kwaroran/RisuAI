/**
 * Drag-and-drop type constants.
 *
 * Each type is a custom MIME set via setData() on dragstart and validated
 * by drop targets before reacting. Pattern per type:
 *   dragstart: setData(type, payload)
 *   dragover:  if (!types.includes(type)) return (no preventDefault)
 *              preventDefault() + stopPropagation() + dropEffect = 'move'
 *   drop:      if (!types.includes(type)) return
 *              preventDefault() + stopPropagation() + handle payload
 *
 * Safety rule: if your drag handler calls stopPropagation(), the event
 * never reaches the root FileDropZone file-import handler — no changes to
 * FileDropZone needed. If the drag CAN reach the root zone visually (sidebar
 * drags crossing the main area, or in-app element drags that browsers report
 * as Files), add the type to internalDrag() in FileDropZone.svelte too.
 *
 * When implementing a new drag feature, search existing drag types in
 * this file first and follow the same pattern for consistency.
 */

/** Blocks in-app element drags from file-import path */
export const RISU_APP_INTERNAL_DRAG_TYPE = 'application/x-risu-app-internal-drag'

/** TriggerV2 effect reorder */
export const RISU_EFFECT_DRAG_TYPE = 'application/x-risu-effect-drag'

/** Bot preset reorder */
export const RISU_PRESET_DRAG_TYPE = 'application/x-risu-preset-drag'

/** Prompt template reorder */
export const RISU_PROMPT_DRAG_TYPE = 'application/x-risu-prompt-drag'

/** Sidebar character/folder reorder — also checked in FileDropZone.svelte, hotkey.ts */
export const RISU_SIDEBAR_DRAG_TYPE = 'application/x-risu-sidebar-drag'

/** TriggerV2 trigger reorder */
export const RISU_TRIGGER_DRAG_TYPE = 'application/x-risu-trigger-drag'

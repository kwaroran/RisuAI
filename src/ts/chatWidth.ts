import { DBState } from "./storage/databaseState.svelte"

export enum ChatWidthPreset {
    Unlimited = -1,
    Small = 0,
    Normal = 1,
    Huge = 2,
}

interface ChatWidthPresetInfo {
    label: string
    maxWidth: string
}

export const CHAT_WIDTH_PRESET_INFO: Record<ChatWidthPreset, ChatWidthPresetInfo> = {
    [ChatWidthPreset.Unlimited]: {
        label: 'Unlimited',
        maxWidth: '100%',
    },
    [ChatWidthPreset.Small]: {
        label: 'Small',
        maxWidth: '600px'
    },
    [ChatWidthPreset.Normal]: {
        label: 'Normal',
        maxWidth: '800px'
    },
    [ChatWidthPreset.Huge]: {
        label: 'Huge',
        maxWidth: '1200px'
    }
}

export function getMaxWidth(): string {
    return CHAT_WIDTH_PRESET_INFO[DBState.db.chatLimitSize].maxWidth
}
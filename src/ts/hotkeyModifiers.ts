import type { Hotkey } from './defaulthotkeys'
import { isMacOS } from './platform'

type HotkeyModifiers = Pick<Hotkey, 'ctrl' | 'alt' | 'shift'>
type HotkeyModifierEvent = Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>

export interface HotkeyModifierOptions {
    macOS?: boolean
    useLegacyMacOSCtrlHotkeys?: boolean
}

function usesAppleHotkeyModifiers(options: HotkeyModifierOptions = {}): boolean {
    return (options.macOS ?? isMacOS()) && !options.useLegacyMacOSCtrlHotkeys
}

export function isPrimaryHotkeyModifierPressed(ev: HotkeyModifierEvent, options: HotkeyModifierOptions = {}): boolean {
    return usesAppleHotkeyModifiers(options) ? ev.metaKey : ev.ctrlKey
}

export function hasAnyHotkeyModifier(ev: HotkeyModifierEvent, options: HotkeyModifierOptions = {}): boolean {
    return isPrimaryHotkeyModifierPressed(ev, options) || ev.altKey || ev.shiftKey
}

export function hotkeyModifiersMatch(hotkey: HotkeyModifiers, ev: HotkeyModifierEvent, options: HotkeyModifierOptions = {}): boolean {
    const macOS = options.macOS ?? isMacOS()
    const useAppleHotkeyModifiers = macOS && !options.useLegacyMacOSCtrlHotkeys

    if (useAppleHotkeyModifiers ? ev.ctrlKey : macOS && ev.metaKey) {
        return false
    }

    if ((hotkey.ctrl ?? false) !== isPrimaryHotkeyModifierPressed(ev, options)) {
        return false
    }

    if ((hotkey.alt ?? false) !== ev.altKey) {
        return false
    }

    if ((hotkey.shift ?? false) !== ev.shiftKey) {
        return false
    }

    return true
}

export function getHotkeyModifierLabels(options: HotkeyModifierOptions = {}) {
    const macOS = options.macOS ?? isMacOS()

    if (macOS) {
        if (options.useLegacyMacOSCtrlHotkeys) {
            return {
                ctrl: 'Ctrl',
                ctrlName: 'Control',
                shift: 'Shift',
                alt: '⌥',
                altName: 'Option',
            }
        }

        return {
            ctrl: '⌘',
            ctrlName: 'Command',
            shift: 'Shift',
            alt: '⌥',
            altName: 'Option',
        }
    }

    return {
        ctrl: 'Ctrl',
        ctrlName: 'Ctrl',
        shift: 'Shift',
        alt: 'Alt',
        altName: 'Alt',
    }
}

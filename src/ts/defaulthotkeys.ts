
export interface Hotkey{
    key: string
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    action: string
}

export const defaultHotkeys: Hotkey[] = [
    {
        key: 'r',
        ctrl: true,
        alt: true,
        action: 'reroll'
    },
    {
        key: 'f',
        ctrl: true,
        alt: true,
        action: 'unreroll'
    },
    {
        key: 't',
        ctrl: true,
        alt: true,
        action: 'translate'
    },
    {
        key: 'd',
        ctrl: true,
        alt: true,
        action: 'remove'
    },
    {
        key: 'e',
        ctrl: true,
        alt: true,
        action: 'edit'
    },
    {
        key: 'c',
        ctrl: true,
        alt: true,
        action: 'copy'
    },
    {
        key: 'Enter',
        ctrl: true,
        alt: true,
        action: 'send'
    },
    {
        key: 's',
        ctrl: true,
        action: 'settings'
    },
    {
        key: 'h',
        ctrl: true,
        action: 'home'
    },
    {
        key: 'p',
        ctrl: true,
        action: 'presets'
    },
    {
        key: 'e',
        ctrl: true,
        action: 'persona'
    },
    {
        key: 'm',
        ctrl: true,
        action: 'modelSelect'
    },
    {
        key: '.',
        ctrl: true,
        action: 'toggleCSS'
    },

    //Needs to implement after this


    {
        key: '[',
        ctrl: true,
        action: 'prevChar'
    },
    {
        key: ']',
        ctrl: true,
        action: 'nextChar'
    },
    {
        key: '`',
        ctrl: true,
        action: 'quickMenu'
    },
    {
        key: 'q',
        ctrl: true,
        action: 'quickSettings'
    },
    {
        key: 'v',
        ctrl: true,
        action: 'toggleVoice'
    },
    {
        key: 'l',
        ctrl: true,
        action: 'toggleLog'
    },
    {
        key: 'u',
        ctrl: true,
        action: 'previewRequest'
    },
    {
        key: 'w',
        ctrl: true,
        action: 'webcam'
    },
    {
        key: ' ',
        action: 'focusInput'
    },
]
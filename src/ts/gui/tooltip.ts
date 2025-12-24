import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/translucent.css';

export function tooltip(node:HTMLElement, tip:string) {
    const instance = tippy(node, {
        content: tip,
        animation: 'fade',
        arrow: true,
        theme: 'translucent',
    })
    return {
        update(newTip: string) {
            instance.setContent(newTip)
        },
        destroy() {
            instance.destroy()
        }
    };
}

export function tooltipRight(node:HTMLElement, tip:string) {
    const instance = tippy(node, {
        content: tip,
        animation: 'fade',
        arrow: true,
        placement: 'right',
        theme: 'translucent',
    })
    return {
        update(newTip: string) {
            instance.setContent(newTip)
        },
        destroy() {
            instance.destroy()
        }
    };
}
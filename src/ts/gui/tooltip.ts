import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css';

export function tooltip(node:HTMLElement, tip:string) {
    const instance = tippy(node, {
        content: tip,
        animation: 'fade',
        arrow: true,
    })
    return {
        destroy() {
            instance.destroy()
        }
    };
}
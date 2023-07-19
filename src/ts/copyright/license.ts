import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css';

export const CCLicenseData = {
    "CC BY 4.0": ["by", "Requires Attribution"],
    "CC BY-NC 4.0": ["by-nc", "Requires Attribution and Non Commercial"],
    "CC BY-NC-SA 4.0": ["by-nc-sa", "Requires Attribution, Non Commercial and Share Alike"],
    "CC BY-SA 4.0": ["by-sa", "Requires Attribution and Share Alike"],
    "CC BY-ND 4.0": ["by-nd", "Requires Attribution and No Derivatives"],
    "CC BY-NC-ND 4.0": ["by-nc-nd", "Requires Attribution, Non Commercial and No Derivatives"],
}

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
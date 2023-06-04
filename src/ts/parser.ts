import DOMPurify from 'isomorphic-dompurify';
import showdown from 'showdown';
import type { character, groupChat } from './storage/database';
import { getFileSrc } from './storage/globalApi';
import { processScript } from './process/scripts';

const convertor = new showdown.Converter({
    simpleLineBreaks: true,
    strikethrough: true,
    tables: true
})

const safeConvertor = new showdown.Converter({
    simpleLineBreaks: true,
    strikethrough: true,
    tables: true,
    backslashEscapesHTMLTags: true
})

DOMPurify.addHook("uponSanitizeElement", (node: HTMLElement, data) => {
    if (data.tagName === "iframe") {
       const src = node.getAttribute("src") || "";
       if (!src.startsWith("https://www.youtube.com/embed/")) {
          return node.parentNode.removeChild(node);
       }
    }
});

export async function ParseMarkdown(data:string, char:(character | groupChat) = null) {
    if(char && char.type !== 'group'){
        if(char.customscript){
            data = processScript(char, data, 'editdisplay')
        }
        if(char.additionalAssets){
            for(const asset of char.additionalAssets){
                const assetPath = await getFileSrc(asset[1])
                data = data.replaceAll(`{{raw::${asset[0]}}}`, assetPath).replaceAll(`{{img::${asset[0]}}}`,`<img src="${assetPath}" />`)
            }
        }
    }
    return DOMPurify.sanitize(convertor.makeHtml(data), {
        ADD_TAGS: ["iframe"],
        ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling"],
    })
}

export function parseMarkdownSafe(data:string) {
    return DOMPurify.sanitize(safeConvertor.makeHtml(data), {
        FORBID_TAGS: ["a", "style"]
    })
}

export async function hasher(data:Uint8Array){
    return Buffer.from(await crypto.subtle.digest("SHA-256", data)).toString('hex');
}
import DOMPurify from 'isomorphic-dompurify';
import showdown from 'showdown';

const convertor = new showdown.Converter({
    simpleLineBreaks: true,
    strikethrough: true,
    tables: true
})


DOMPurify.addHook("uponSanitizeElement", (node: HTMLElement, data) => {
    if (data.tagName === "iframe") {
       const src = node.getAttribute("src") || "";
       if (!src.startsWith("https://www.youtube.com/embed/")) {
          return node.parentNode.removeChild(node);
       }
    }
});

export function ParseMarkdown(data:string) {
    return DOMPurify.sanitize(convertor.makeHtml(data), {
        ADD_TAGS: ["iframe"],
        ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling"],
    })
}

export async function hasher(data:Uint8Array){
    return Buffer.from(await crypto.subtle.digest("SHA-256", data)).toString('hex');
}
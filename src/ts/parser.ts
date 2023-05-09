import DOMPurify from 'isomorphic-dompurify';
import showdown from 'showdown';

const convertor = new showdown.Converter()
convertor.setOption('simpleLineBreaks', true);

export function ParseMarkdown(data:string) {
    return DOMPurify.sanitize(convertor.makeHtml(data), {
        FORBID_TAGS: []
    })
}

export async function hasher(data:Uint8Array){
    return Buffer.from(await crypto.subtle.digest("SHA-256", data)).toString('hex');
}
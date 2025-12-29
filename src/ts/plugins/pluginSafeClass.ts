import { toGetter } from "../globalApi.svelte";

export class SafeLocalStorage {
    getItem(key: string): string | null {
        return localStorage.getItem(`safe_plugin_${key}`);
    }
    setItem(key: string, value: string): void {
        localStorage.setItem(`safe_plugin_${key}`, value);
    }
    removeItem(key: string): void {
        localStorage.removeItem(`safe_plugin_${key}`);
    }
    //not a standard localStorage method, but useful
    keys(): string[] {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('safe_plugin_')) {
                keys.push(key.substring('safe_plugin_'.length));
            }
        }
        return keys;
    }

    key(index: number): string | null {
        const safeKeys = this.keys();
        return safeKeys[index] || null;
    }

    clear(): void {
        const keys = this.keys();
        for (const key of keys) {
            this.removeItem(key);
        }
    }

    get length(): number {
        return this.keys().length;
    }


}

export const SafeIdbFactory = {
    databases: async (): Promise<{ name: string; version: number }[]> => {
        if ('databases' in indexedDB) {
            const r = await indexedDB.databases();
            return r.filter(db => db.name && db.name.startsWith('safe_plugin_')).map(db => ({
                name: db.name!.substring('safe_plugin_'.length),
                version: db.version
            }));
        } else {
            return [];
        }
    },
    deleteDatabase: async (name: string): Promise<IDBOpenDBRequest> => {
        return indexedDB.deleteDatabase(`safe_plugin_${name}`);
    },
    open: (name: string, version?: number): IDBOpenDBRequest => {
        return indexedDB.open(`safe_plugin_${name}`, version);
    },
    cmp: (first: string, second: string): number => {
        //well, we don't need to prefix here, as the comparison is the same
        return indexedDB.cmp(first, second);
    }
}

export const tagWhitelist = [
    'a',
    'abbr',
    'acronym',
    'address',
    'area',
    'article',
    'aside',
    'audio',
    'b',
    'bdi',
    'bdo',
    'big',
    'blink',
    'blockquote',
    'body',
    'br',
    'button',
    'canvas',
    'caption',
    'center',
    'cite',
    'code',
    'col',
    'colgroup',
    'content',
    'data',
    'datalist',
    'dd',
    'decorator',
    'del',
    'details',
    'dfn',
    'dialog',
    'dir',
    'div',
    'dl',
    'dt',
    'element',
    'em',
    'fieldset',
    'figcaption',
    'figure',
    'font',
    'footer',
    'form',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'head',
    'header',
    'hgroup',
    'hr',
    'html',
    'i',
    'img',
    'input',
    'ins',
    'kbd',
    'label',
    'legend',
    'li',
    'main',
    'map',
    'mark',
    'marquee',
    'menu',
    'menuitem',
    'meter',
    'nav',
    'nobr',
    'ol',
    'optgroup',
    'option',
    'output',
    'p',
    'picture',
    'pre',
    'progress',
    'q',
    'rp',
    'rt',
    'ruby',
    's',
    'samp',
    'search',
    'section',
    'select',
    'shadow',
    'slot',
    'small',
    'source',
    'spacer',
    'span',
    'strike',
    'strong',
    'style',
    'sub',
    'summary',
    'sup',
    'table',
    'tbody',
    'td',
    'template',
    'textarea',
    'tfoot',
    'th',
    'thead',
    'time',
    'tr',
    'track',
    'tt',
    'u',
    'ul',
    'var',
    'video',
    'wbr',
    'svg',
    'a',
    'altglyph',
    'altglyphdef',
    'altglyphitem',
    'animatecolor',
    'animatemotion',
    'animatetransform',
    'circle',
    'clippath',
    'defs',
    'desc',
    'ellipse',
    'enterkeyhint',
    'exportparts',
    'filter',
    'font',
    'g',
    'glyph',
    'glyphref',
    'hkern',
    'image',
    'inputmode',
    'line',
    'lineargradient',
    'marker',
    'mask',
    'metadata',
    'mpath',
    'part',
    'path',
    'pattern',
    'polygon',
    'polyline',
    'radialgradient',
    'rect',
    'stop',
    'style',
    'switch',
    'symbol',
    'text',
    'textpath',
    'title',
    'tref',
    'tspan',
    'view',
    'vkern',
];

const restrictElement = <T extends Node>(element: T): T => {
    //since we already trimed out, just return the element
    return element;
}

const restrictNodeList = <T extends Element, Q extends NodeListOf<T>|HTMLCollectionOf<T> >(nodeList: Q): Q => {
    return nodeList;
}

export const SafeDocument = {
    body: document.body,
    characterSet: document.characterSet,
    doctype: document.doctype,
    documentElement: document.documentElement,
    documentURI: document.documentURI,
    location: document.location,
    readyState: document.readyState,
    title: document.title,
    head: document.head,
    createElement: (tagName: string): HTMLElement => {
        console.log('Creating element:', tagName);
        tagName = tagName.toLowerCase().trim();
        if (!tagWhitelist.includes(tagName.toLowerCase())) {
            throw new Error(`Creation of <${tagName}> elements is not allowed in plugin context.`);
        }
        if(tagName.toLowerCase() === 'a'){
            console.error(`
                Creation of <a> elements is restricted. due to potential security risks. Creating a <div> instead.
                Use document.createAnchorElement(href: string) from the plugin API to create safe anchor elements.
            `);
            return restrictElement(document.createElement('div')) as HTMLElement;
        }
        return restrictElement(document.createElement(tagName));
    },
    createTextNode: (data: string): Text => {
        return restrictElement(document.createTextNode(data));
    },
    createElementNS: (namespaceURI: string, qualifiedName: string): Element => {
        console.log('Creating namespaced element:', qualifiedName);
        qualifiedName = qualifiedName.toLowerCase().trim();
        if (!tagWhitelist.includes(qualifiedName.toLowerCase())) {
            throw new Error(`Creation of <${qualifiedName}> elements is not allowed in plugin context.`);
        }
        if(qualifiedName.toLowerCase() === 'a'){
            console.error(`
                Creation of <a> elements is restricted. due to potential security risks. Creating a <div> instead.
                Use document.createAnchorElement(href: string) from the plugin API to create safe anchor elements.
            `);
            return restrictElement(document.createElementNS(namespaceURI, 'div'));
        }
        return restrictElement(document.createElementNS(namespaceURI, qualifiedName));
    },
    createAnchorElement: (href: string): HTMLAnchorElement => {
        const anchor = document.createElement('a');

        try {
            const hrefURL = new URL(href, document.baseURI);
            if(hrefURL.protocol !== 'http:' && hrefURL.protocol !== 'https:'){
                throw new Error(`Only http and https links are allowed for anchor elements in plugin context.`);
            }
            new URL(href);
        } catch {
            throw new Error(`Invalid URL provided for anchor element in plugin context.`);
        }

        anchor.href = href;
        return toGetter(() => anchor, {
            restrictChildren: [
                'ownerDocument',
                'href',
                'download',
                'hash',
                'host',
                'hostname',
                'hreflang',
                'origin',
                'password',
                'pathname',
                'ping',
                'port',
                'protocol',
                'referrerPolicy',
                'rel',
                'relList',
                'search',
                'target',
                'text',
                'type',
                'username'
            ]
        }) as HTMLAnchorElement;
    },

    //add safe methods as needed
    createRange: (): Range => {
        return (document.createRange());
    },
    createDocumentFragment: (): DocumentFragment => {
        return restrictElement(document.createDocumentFragment());
    },
    querySelector: (selectors: string): Element | null => {
        return restrictElement(document.querySelector(selectors));
    },
    querySelectorAll: (selectors: string): NodeListOf<Element> => {
        return restrictNodeList(document.querySelectorAll(selectors));
    },
    getElementById: (elementId: string): HTMLElement | null => {
        return restrictElement(document.getElementById(elementId));
    },
    getElementsByClassName: (classNames: string): HTMLCollectionOf<Element> => {
        return restrictNodeList(document.getElementsByClassName(classNames))
    },
    getElementsByTagName: (qualifiedName: string): HTMLCollectionOf<Element> => {
        return restrictNodeList(document.getElementsByTagName(qualifiedName));
    },
    getElementsByName: (elementName: string): NodeListOf<Element> => {
        return restrictNodeList(document.getElementsByName(elementName));
    },
    createComment: (data: string): Comment => {
        return restrictElement(document.createComment(data));
    },
    elementFromPoint: (x: number, y: number): Element | null => {
        return restrictElement(document.elementFromPoint(x, y));
    },
    elementsFromPoint: (x: number, y: number): Element[] => {
        return document.elementsFromPoint(x, y).map(el => restrictElement(el));
    },
    hasFocus: (): boolean => {
        return document.hasFocus();
    },
    addEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void => {
        const allowedEvents = ['click', 'keydown', 'keyup', 'input', 'change', 'submit', 'focus', 'blur', 'mouseover', 'mouseout', 'mousemove', 'mousedown', 'mouseup'];
        if(!allowedEvents.includes(type)) {
            console.warn(`Event type '${type}' is not allowed in plugin context.`);
            return;
        }
        document.addEventListener(type, listener, options);
    },
    removeEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void => {
        const allowedEvents = ['click', 'keydown', 'keyup', 'input', 'change', 'submit', 'focus', 'blur', 'mouseover', 'mouseout', 'mousemove', 'mousedown', 'mouseup'];
        if(!allowedEvents.includes(type)) {
            console.warn(`Event type '${type}' is not allowed in plugin context.`);
            return;
        }
        document.removeEventListener(type, listener, options);
    }
}
import { fetchNative, globalFetch } from "src/ts/globalApi.svelte";
import { getV2PluginAPIs, type RisuPlugin } from "../plugins";
import { SandboxHost } from "./factory";
import { getDatabase } from "src/ts/storage/database.svelte";
import { tagWhitelist } from "../pluginSafeClass";
import DOMPurify from 'dompurify';
import { additionalFloatingActionButtons, additionalSettingsMenu } from "src/ts/stores.svelte";
import { v4 } from "uuid";


class SafeElement {
    #element: HTMLElement;

    constructor(element: HTMLElement) {
        if(element.getAttribute('freezed')){
            throw new Error("This element cannot be accessed by SafeELement")
        }
        this.#element = element;
    }

    public appendChild(child: SafeElement) {
        this.#element.appendChild(child.#element);
    }

    public removeChild(child: SafeElement) {
        this.#element.removeChild(child.#element);
    }

    public replaceChild(newChild: SafeElement, oldChild: SafeElement) {
        this.#element.replaceChild(newChild.#element, oldChild.#element);
    }

    public replaceWith(newElement: SafeElement) {
        this.#element.replaceWith(newElement.#element);
    }

    public cloneNode(deep: boolean = false): SafeElement {
        const cloned = this.#element.cloneNode(deep);
        return new SafeElement(cloned as HTMLElement);
    }

    public prepend(child: SafeElement) {
        this.#element.prepend(child.#element);
    }

    public remove() {
        this.#element.remove();
    }

    public innerText(): string {
        return this.#element.innerText;
    }

    public textContent(): string | null {
        return this.#element.textContent;
    }

    public setTextContent(value: string) {
        this.#element.textContent = value;
    }

    public setInnerText(value: string) {
        this.#element.innerText = value;
    }


    public setAttribute(name: string, value: string) {
        if(!name.startsWith('x-')){
            throw new Error("Can only set attributes starting with 'x-' for security reasons. for other attributes, use dedicated methods.");
        }
        this.#element.setAttribute(name, value);
    }
    public getAttribute(name: string): string | null {
        if(!name.startsWith('x-')){
            throw new Error("Can only get attributes starting with 'x-' for security reasons. for other attributes, use dedicated methods.");
        }
        return this.#element.getAttribute(name);
    }
    public setStyle(property: string, value: string) {
        (this.#element.style as any)[property] = value;
    }
    public getStyle(property: string): string {
        return (this.#element.style as any)[property];
    }
    public getStyleAttribute(): string {
        return this.#element.getAttribute('style') || '';
    }
    public setStyleAttribute(value: string) {
        this.#element.setAttribute('style', value);
    }
    public addClass(className: string) {
        // 
        this.#element.classList.add(className);
    }
    public removeClass(className: string) {
        // 
        this.#element.classList.remove(className);
    }
    public setClassName(className: string){
        this.#element.className = className
    }
    public getClassName(){
        return this.#element.className
    }
    public hasClass(className: string): boolean {
        //We don't need to check the className here since we're just checking
        return this.#element.classList.contains(className);
    }
    public focus() {
        this.#element.focus();
    }
    public getChildren(): SafeElement[] {
        const children: SafeElement[] = [];
        this.#element.childNodes.forEach(node => {
            if(node instanceof HTMLElement) {
                children.push(new SafeElement(node));
            }
        });
        return children;
    }
    public getParent(): SafeElement | null {
        if(this.#element.parentElement) {
            return new SafeElement(this.#element.parentElement);
        }
        return null;
    }
    public getInnerHTML(): string {
        return this.#element.innerHTML;
    }
    public getOuterHTML(): string {
        return this.#element.outerHTML;
    }
    public clientHeight(): number {
        return this.#element.clientHeight;
    }
    public clientWidth(): number {
        return this.#element.clientWidth;
    }
    public clientTop(): number {
        return this.#element.clientTop;
    }
    public clientLeft(): number {
        return this.#element.clientLeft;
    }
    public nodeName(): string {
        return this.#element.nodeName;
    }
    public nodeType(): number {
        return this.#element.nodeType;
    }
    public querySelectorAll(selector: string): SafeElement[] {
        const nodeList = this.#element.querySelectorAll(selector);
        const elements: SafeElement[] = [];
        nodeList.forEach(node => {
            if(node instanceof HTMLElement) {
                elements.push(new SafeElement(node));
            }
        });
        return elements;
    }
    public querySelector(selector: string): SafeElement | null {
        const element = this.#element.querySelector(selector);
        if(element instanceof HTMLElement) {
            return new SafeElement(element);
        }
        return null;
    }
    public getElementById(id: string): SafeElement | null {
        const element = this.querySelector('#' + id);
        return element;
    }
    public getElementsByClassName(className: string): SafeElement[] {
        const nodeList = this.querySelectorAll('.' + className);
        return nodeList;
    }
    public getClientRects(): DOMRectList {
        return this.#element.getClientRects();
    }
    public getBoundingClientRect(): DOMRect {
        return this.#element.getBoundingClientRect();
    }
    public setInnerHTML(value: string) {
        const san = DOMPurify.sanitize(value);
        this.#element.innerHTML = san;
    }
    public setOuterHTML(value: string) {
        const san = DOMPurify.sanitize(value);
        this.#element.outerHTML = san;
    }

    #eventIdMap = new Map<string, Function>()

    public async addEventListener(type:string, listener: (event: any) => void, options?: boolean | AddEventListenerOptions):Promise<string> {
        const realOptions = typeof options === 'boolean' ? { capture: options } : options || {};

        //allowed with unlimited
        const allowedDocumentEventListeners = [
            'click',
            'dblclick',
            'contextmenu',
            'mousedown',
            'mouseup',
            'mousemove',
            'mouseover',
            'mouseleave',
            'pointercancel',
            'pointerdown',
            'pointerenter',
            'pointerleave',
            'pointermove',
            'pointerout',
            'pointerover',
            'pointerup',
            'scroll',
            'scrollend'
        ]

        //allowed, but it has fingerprinting issues,
        //so it will be delayed random ms.
        const allowedDelayedEventListeners = [
            'keydown',
            'keyup',
            'keypress'
        ]

        const id = v4()

        if(allowedDocumentEventListeners.includes(type)){
            const modifiedListener = (event: any) => {
                listener(event)
            }
            this.#eventIdMap.set(id, modifiedListener)
            document.addEventListener(type, modifiedListener, realOptions)
        }
        else if(allowedDelayedEventListeners.includes(type)){
            const modifiedListener = (event: any) => {
                let delay = 0;
                try {
                    delay = crypto.getRandomValues(new Uint32Array(1))[0];                    
                } catch (error) {}
                setTimeout(() => {
                    listener(event);
                }, delay);
            }
            this.#eventIdMap.set(id, modifiedListener)
            document.addEventListener(type, modifiedListener, realOptions);
        }

        throw new Error(`Event listener of type '${type}' is not allowed for security reasons.`);
        
    }

    removeEventListener(type:string, id:string, options?: boolean | EventListenerOptions) {
        const listener = this.#eventIdMap.get(id);
        if(listener){
            const realOptions = typeof options === 'boolean' ? { capture: options } : options || {};
            document.removeEventListener(type, listener as EventListenerOrEventListenerObject, realOptions);
            this.#eventIdMap.delete(id);
        }
    }

    matches: (selector: string) => boolean = (selector: string) => {
        return this.#element.matches(selector);
    }
}

class SafeDocument extends SafeElement {
    constructor(document: Document) {
        super(document.documentElement);
    }
    createElement(tagName: string): SafeElement {
        if(!tagWhitelist.includes(tagName.toLowerCase())) {
            console.warn(`Creation of <${tagName}> elements is restricted. Creating a <div> instead.`);
            tagName = 'div';
        }
        if(tagName.toLowerCase() === 'a'){
            console.warn(`<a> can be created but href attribute cannot be set directly for security reasons. Use .createAnchorElement(href: string) to create safe anchor elements.`);
        }
        const element = document.createElement(tagName);
        return new SafeElement(element);
    }
    createAnchorElement(href: string): SafeElement {
        const anchor = document.createElement('a');
        try {
            const url = new URL(href);
            if(url.protocol !== 'http:' && url.protocol !== 'https:'){
                throw new Error("Invalid protocol");
            }
            anchor.setAttribute('href', url.toString());
        } catch (error) {
            console.warn(`Invalid URL provided for anchor element: ${href}. Setting href to '#' instead.`);
            anchor.setAttribute('href', '#');
        }
        return new SafeElement(anchor);
    }
}

type SafeMutationRecord = {
    type: string;
    target: SafeElement;
    addedNodes: SafeElement[];
}

type SafeMutationCallback = (mutations: SafeMutationRecord[]) => void;

class SafeMutationObserver {
    #observer: MutationObserver;
    constructor(callback: SafeMutationCallback) {
        this.#observer = new MutationObserver((mutations) => {
            const safeMutations: SafeMutationRecord[] = mutations.map(mutation => {

                const elementMapHelper = (nodeList: NodeList): SafeElement[] => {
                    const elements: SafeElement[] = [];
                    nodeList.forEach(node => {
                        if(node instanceof HTMLElement) {
                            elements.push(new SafeElement(node));
                        }
                    })
                    return elements;
                }

                return {
                    type: mutation.type,
                    target: new SafeElement(mutation.target as HTMLElement),
                    addedNodes: elementMapHelper(mutation.addedNodes),
                    removedNodes: elementMapHelper(mutation.removedNodes)
                    
                }
            })

            callback(safeMutations);
        });
    }

    observe(element:SafeElement, options: MutationObserverInit) {
        const identifier = v4();
        element.setAttribute('x-identifier', identifier);
        const rawElement = document.querySelector(`[x-identifier="${identifier}"]`) as HTMLElement;
        if(rawElement){
            this.#observer.observe(rawElement, options);
            element.setAttribute('x-identifier', '');
        }
    }

}

const makeRisuaiAPIV3 = (iframe:HTMLIFrameElement,plugin:RisuPlugin) => {
    
    const oldApis = getV2PluginAPIs();
    return {

        //Old APIs from v2.1
        risuFetch: oldApis.risuFetch,
        nativeFetch: oldApis.nativeFetch,
        getChar: oldApis.getChar,
        setChar: oldApis.setChar,
        addProvider: oldApis.addProvider,
        addRisuScriptHandler: oldApis.addRisuScriptHandler,
        removeRisuScriptHandler: oldApis.removeRisuScriptHandler,
        addRisuReplacer: oldApis.addRisuReplacer,
        removeRisuReplacer: oldApis.removeRisuReplacer,
        safeLocalStorage: oldApis.safeLocalStorage,
        apiVersion: "3.0",
        apiVersionCompatibleWith: ["3.0"],
        getDatabase: oldApis.getDatabase,
        pluginStorage: oldApis.pluginStorage,
        setDatabaseLite: oldApis.setDatabaseLite,
        setDatabase: oldApis.setDatabase,
        loadPlugins: oldApis.loadPlugins,
        readImage: oldApis.readImage,
        saveAsset: oldApis.saveAsset,
        


        //Deprecated APIs from v2.1

        //Unload never fires. plugin cleanup is handled only on program shutdown now.
        onUnload: oldApis.onUnload,

        //Use getArgument / setArgument instead if possible
        getArg: oldApis.getArg,
        setArg: oldApis.setArg,

        //New APIs for v3
        getArgument: async (key:string) => {
            const db = getDatabase()
            for (const p of db.plugins) {
                if (p.name === plugin.name) {
                    return p.realArg[key];
                }
            }
        },
        setArgument: async (key:string, value:string) => {
            const db = getDatabase();
            for (const plugin of db.plugins) {
                if (plugin.name === plugin.name) {
                    plugin.realArg[key] = value;
                }
            }
        },

        //New names for character APIs, to match API naming conventions
        getCharacter: oldApis.getChar,
        setCharacter: oldApis.setChar,

        showContainer: (
            //more types may be added in future
            type: 'fullscreen' = 'fullscreen'
        ) => {
            iframe.style.display = "block";
            
            switch(type) {
                case 'fullscreen': {
                    //move iframe to body if not already there
                    if(iframe.parentElement !== document.body) {
                        document.body.appendChild(iframe);
                    }

                    //Make iframe cover whole screen
                    iframe.style.position = "fixed";
                    iframe.style.top = "0";
                    iframe.style.left = "0";
                    iframe.style.width = "100%";
                    iframe.style.height = "100%";
                    iframe.style.border = "none";
                    iframe.style.zIndex = "1000";
                    break;
                }
                default: {
                    return
                }
            }
        },
        hideContainer: () => {
            iframe.style.display = "none";
        },
        getRootDocument: () => {
            return new SafeDocument(document);
        },
        registerSetting: (
            name:string,
            callback: any,
            icon:string = '',
            iconType:'html'|'img'|'none' = 'none'
        ) => {
            if(iconType !== 'html' && iconType !== 'img' && iconType !== 'none'){
                throw new Error("iconType must be 'html', 'img' or 'none'");
            }
            if(typeof name !== 'string' || name.trim() === ''){
                throw new Error("name must be a non-empty string");
            }
            additionalSettingsMenu.push({
                name,
                icon,
                iconType,
                callback
            })
        },
        registerActionButton: (
            arg: {
                name: string,
                icon: string,
                iconType: 'html'|'img'|'none',
                callback: () => void
                location?: 'topright'
            }
        ) => {
            let { name, icon, iconType, callback, location } = arg;
            location = location || 'topright';
            //Reserved for future use
            if(iconType !== 'html' && iconType !== 'img' && iconType !== 'none'){
                throw new Error("iconType must be 'html', 'img' or 'none'");
            }
            if(typeof name !== 'string' || name.trim() === ''){
                throw new Error("name must be a non-empty string");
            }
            if(location !== 'topright'){
                throw new Error("Currently only 'topright' location is supported");
            }
            if(typeof icon !== 'string'){
                throw new Error("icon must be a string");
            }
            additionalFloatingActionButtons.push({
                name,
                icon,
                iconType,
                callback,
                location
            })
        },
        log: (message:string) => {
            console.log(`[RisuAI Plugin: ${plugin.name}] ${message}`);
        },
        createMutationObserver(callback: SafeMutationCallback): SafeMutationObserver {
            return new SafeMutationObserver(callback)
        },
        _getOldKeys: () => {
            return Object.keys(oldApis)
        }
    }
}

export async function loadV3Plugins(plugins:RisuPlugin[]){
    const loadPromises = plugins.map(plugin => executePluginV3(plugin));
    await Promise.all(loadPromises);
}

export async function executePluginV3(plugin:RisuPlugin){
    const iframe = document.createElement('iframe');
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const host = new SandboxHost(makeRisuaiAPIV3(iframe, plugin));
    host.run(iframe, plugin.script);
    console.log(`[RisuAI Plugin: ${plugin.name}] Loaded API V3 plugin.`);
}

import { getV2PluginAPIs, type RisuPlugin } from "../plugins";
import { SandboxHost } from "./factory";
import { getDatabase } from "src/ts/storage/database.svelte";
import { tagWhitelist } from "../pluginSafeClass";
import DOMPurify from 'dompurify';
import { additionalChatMenu, additionalFloatingActionButtons, additionalHamburgerMenu, additionalSettingsMenu, type MenuDef } from "src/ts/stores.svelte";
import { v4 } from "uuid";
import { sleep } from "src/ts/util";
import { alertConfirm } from "src/ts/alert";
import { language } from "src/lang";

/*
    V3 API for RisuAI Plugins

    Before adding new APIs here, please check the limitations

    - APIs must be a functions
        - If you want nested objects, first add as a plain function, `_getPluginStorage` for example
            And add it too _getAliases function ({'pluginStorage':{'getItem': '_getPluginStorage', ... }})
            This will make pluginStorage.getItem() work in plugins
        - If you need constants, use _getPropertiesForInitialization to set them up
            For example apiVersion and apiVersionCompatibleWith are set this way,
            Accessable in plugins as risuai.apiVersion
    - APIs must return, or accept as parameters, only the following types:
        - Serializable data (string, number, boolean, null, array, object)
        - Class instances marked with __classType = 'REMOTE_REQUIRED'
        - Callback functions (only as parameters)
        - Note that Class or Callbacks inside arrays or objects are not supported
*/


class SafeElement {
    #element: HTMLElement;
    __classType = 'REMOTE_REQUIRED' as const;

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

    public addEventListener(type:string, listener: (event: any) => void, options?: boolean | AddEventListenerOptions):string {
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
    __classType = 'REMOTE_REQUIRED' as const;
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

type SafeMutationRecordObject = {
    type: string;
    target: SafeElement;
    addedNodes: SafeElement[];
}

class SafeClassArray<T> {
    #items: T[];
    __classType = 'REMOTE_REQUIRED' as const;
    constructor(items: T[] = []) {
        this.#items = items;
    }
    at(index: number): T {
        return this.#items.at(index);
    }
    length(): number {
        return this.#items.length;
    }
    push(item: T) {
        this.#items.push(item);
    }
}

class SafeMutationRecord{
    __classType = 'REMOTE_REQUIRED' as const;
    #type: string;
    #target: SafeElement;
    #addedNodes: SafeClassArray<SafeElement>;
    constructor(type: string, target: SafeElement, addedNodes: SafeElement[]) {
        this.#type = type;
        this.#target = target;
        this.#addedNodes = new SafeClassArray<SafeElement>(addedNodes);
    }
    getType(): string {
        return this.#type;
    }
    getTarget(): SafeElement {
        return this.#target;
    }
    getAddedNodes(): SafeClassArray<SafeElement> {
        return this.#addedNodes;
    }
}

type SafeMutationCallback = (mutations: SafeClassArray<SafeMutationRecord>) => void;

class SafeMutationObserver {
    #observer: MutationObserver;
    __classType = 'REMOTE_REQUIRED' as const;
    constructor(callback: SafeMutationCallback) {
        this.#observer = new MutationObserver((mutations) => {
            const safeMutations: SafeMutationRecordObject[] = mutations.map(mutation => {

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

            const safeClassed = new SafeClassArray<SafeMutationRecord>([]);
            for(const record of safeMutations){
                safeClassed.push(new SafeMutationRecord(
                    record.type,
                    record.target,
                    record.addedNodes
                ));
            }
            callback(safeClassed);
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

const pluginUnloadCallbacks: Map<string, Function[]> = new Map();

const addPluginUnloadCallback = (pluginName: string, callback: Function) => {
    if(!pluginUnloadCallbacks.has(pluginName)){
        pluginUnloadCallbacks.set(pluginName, []);
    }
    pluginUnloadCallbacks.get(pluginName)?.push(callback);
}

const makeMenuUnloadCallback = (menuId:string, menuStore: MenuDef[]) =>{
    return () => {
        const index = menuStore.findIndex(item => item.id === menuId);
        if(index !== -1){
            menuStore.splice(index, 1);
        }
    }
}

const unloadV3Plugin = async (pluginName: string) => {
    const callbacks = pluginUnloadCallbacks.get(pluginName);
    const instance = v3PluginInstances.find(p => p.name === pluginName);
    if(instance){
        const index = v3PluginInstances.findIndex(p => p.name === pluginName);
        if(index !== -1){
            v3PluginInstances.splice(index, 1);
        }
    }
    if(callbacks){
        pluginUnloadCallbacks.delete(pluginName); 
        let promises: Promise<void>[] = [];
        for(const callback of callbacks){
            const result = callback();
            if(result instanceof Promise){
                promises.push(result);
            }
        }

        await Promise.any([
            Promise.all(promises),
            sleep(1000) //timeout after 1 second
        ])
    }
    instance.host.terminate();
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
        getDatabase: oldApis.getDatabase,
        setDatabaseLite: oldApis.setDatabaseLite,
        setDatabase: oldApis.setDatabase,
        loadPlugins: oldApis.loadPlugins,
        readImage: oldApis.readImage,
        saveAsset: oldApis.saveAsset,
        
        //Deprecated APIs from v2.1


        //Use getArgument / setArgument instead if possible
        getArg: oldApis.getArg,
        setArg: oldApis.setArg,

        //New APIs for v3
        getArgument: (key:string) => {
            const db = getDatabase()
            for (const p of db.plugins) {
                if (p.name === plugin.name) {
                    return p.realArg[key];
                }
            }
        },
        setArgument: (key:string, value:string) => {
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
            const id = v4()
            additionalSettingsMenu.push({
                id,
                name,
                icon,
                iconType,
                callback
            })
            addPluginUnloadCallback(
                plugin.name,
                makeMenuUnloadCallback(id, additionalSettingsMenu)
            )
        },
        registerButton: (
            arg: {
                name: string,
                icon: string,
                iconType: 'html'|'img'|'none',
                location?: 'action'|'chat'|'hamburger'
            },
            callback: () => void
        ) => {
            let { name, icon, iconType, location } = arg;
            location = location || 'action';
            //Reserved for future use
            if(iconType !== 'html' && iconType !== 'img' && iconType !== 'none'){
                throw new Error("iconType must be 'html', 'img' or 'none'");
            }
            if(typeof name !== 'string' || name.trim() === ''){
                throw new Error("name must be a non-empty string");
            }
            if(typeof icon !== 'string'){
                throw new Error("icon must be a string");
            }
            const id = v4()
            const menuDef:MenuDef = {
                name,
                icon,
                iconType,
                callback,
                id
            }

            switch(location){
                case 'action':{
                    additionalFloatingActionButtons.push(menuDef)
                    addPluginUnloadCallback(
                        plugin.name,
                        makeMenuUnloadCallback(menuDef.id, additionalFloatingActionButtons)
                    )
                    break
                }
                case 'hamburger':{
                    additionalHamburgerMenu.push(menuDef)
                    addPluginUnloadCallback(
                        plugin.name,
                        makeMenuUnloadCallback(menuDef.id, additionalHamburgerMenu)
                    )
                    break
                }
                case 'chat':{
                    additionalChatMenu.push(menuDef)
                    addPluginUnloadCallback(
                        plugin.name,
                        makeMenuUnloadCallback(menuDef.id, additionalChatMenu)
                    )
                    break
                }
                default:{
                    throw new Error("Invalid location for button")
                }
            }
        },
        log: (message:string) => {
            console.log(`[RisuAI Plugin: ${plugin.name}] ${message}`);
        },
        createMutationObserver(callback: SafeMutationCallback): SafeMutationObserver {
            return new SafeMutationObserver(callback)
        },
        onUnload: (callback: () => void) => {
            addPluginUnloadCallback(plugin.name, callback);
        },
        _getOldKeys: () => {
            return Object.keys(oldApis)
        },
        _getPropertiesForInitialization: () => {
            const v = {
                apiVersion: "3.0",
                apiVersionCompatibleWith: ["3.0"],
            } as any;

            v.list = Object.keys(v);
            
            return v;
        },
        _getPluginStorage: oldApis.pluginStorage.getItem,
        _setPluginStorage: oldApis.pluginStorage.setItem,
        _removePluginStorage: oldApis.pluginStorage.removeItem,
        _clearPluginStorage: oldApis.pluginStorage.clear,
        _keyPluginStorage: oldApis.pluginStorage.key,
        _keysPluginStorage: oldApis.pluginStorage.keys,
        _lengthPluginStorage: oldApis.pluginStorage.length,
        _getSafeLocalStorage: oldApis.safeLocalStorage.getItem,
        _setSafeLocalStorage: oldApis.safeLocalStorage.setItem,
        _removeSafeLocalStorage: oldApis.safeLocalStorage.removeItem,
        _clearSafeLocalStorage: oldApis.safeLocalStorage.clear,
        _keySafeLocalStorage: oldApis.safeLocalStorage.key,
        _keysSafeLocalStorage: oldApis.safeLocalStorage.keys,
        _getAliases: () => {
            return {
                'pluginStorage':{
                    'getItem': '_getPluginStorage',
                    'setItem': '_setPluginStorage',
                    'removeItem': '_removePluginStorage',
                    'clear': '_clearPluginStorage',
                    'key': '_keyPluginStorage',
                    'keys': '_keysPluginStorage',
                    'length': '_lengthPluginStorage',
                },
                'safeLocalStorage':{
                    'getItem': '_getSafeLocalStorage',
                    'setItem': '_setSafeLocalStorage',
                    'removeItem': '_removeSafeLocalStorage',
                    'clear': '_clearSafeLocalStorage',
                    'key': '_keySafeLocalStorage',
                    'keys': '_keysSafeLocalStorage',
                }
            }
        }
    }
}

type V3PluginInstance = {
    name: string;
    host: SandboxHost;
}

const v3PluginInstances: V3PluginInstance[] = [];

export async function loadV3Plugins(plugins:RisuPlugin[]){
    await Promise.all(v3PluginInstances.map(async (instance) => {
        await unloadV3Plugin(instance.name);
    }));
    const loadPromises = plugins.map(plugin => executePluginV3(plugin));
    await Promise.all(loadPromises);
}

export function executePluginV3(plugin:RisuPlugin){
    const iframe = document.createElement('iframe');
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const host = new SandboxHost(makeRisuaiAPIV3(iframe, plugin));
    v3PluginInstances.push({
        name: plugin.name,
        host
    });
    host.run(iframe, plugin.script);
    console.log(`[RisuAI Plugin: ${plugin.name}] Loaded API V3 plugin.`);
}

export function getV3PluginInstance(name: string) {
    return v3PluginInstances.find(p => p.name === name);
}

globalThis.__debugV3Plugin = (code: string|Function) => {
    if(code instanceof Function){
        code = `(${code.toString()})()`;
    }
    return v3PluginInstances[0].host.executeInIframe(code);
};

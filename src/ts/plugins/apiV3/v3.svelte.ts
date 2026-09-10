import { allowedDbKeys, customProviderStore, dbArrayIdField, getV2PluginAPIs, handlePluginInstallViaPlugin, pluginV2, type PluginV2ProviderArgument, type PluginV2ProviderOptions, type RisuPlugin } from "../plugins.svelte";
import { SandboxHost } from "./factory";
import { getDatabase } from "src/ts/storage/database.svelte";
import { SafeLocalPluginStorage, tagWhitelist } from "../pluginSafeClass";
import DOMPurify from 'dompurify';
import { additionalChatMenu, additionalFloatingActionButtons, additionalHamburgerMenu, additionalSettingsMenu, bodyIntercepterStore, chatPanelStore, DBState, selectedCharID, type MenuDef } from "src/ts/stores.svelte";
import { v4 } from "uuid";
import { sleep } from "src/ts/util";
import { alertConfirm, alertError, alertNormal } from "src/ts/alert";
import { language } from "src/lang";
import { checkCharOrder, forageStorage, getFetchLogs } from "src/ts/globalApi.svelte";
import { changeColorScheme, updateColorScheme, updateTextThemeAndCSS, type ColorScheme } from "src/ts/gui/colorscheme";
import { isNodeServer, isTauri } from "src/ts/platform";
import { get } from "svelte/store";
import { registerMCPModule, unregisterMCPModule } from "src/ts/process/mcp/pluginmcp";
import { getColdStorageItem, setColdStorageItem } from "src/ts/process/coldstorage.svelte";
import { getInlayAsset } from "src/ts/process/files/inlays";
import { getLLMCache, searchLLMCache } from "src/ts/translator/translator";
import { hasher, risuChatParser, type CbsConditions } from "src/ts/parser/parser.svelte";
import localforage from "localforage";
import { LLMFlags, LLMFormat, LLMProvider, LLMTokenizer, type LLMModel } from "src/ts/model/types";
import { sendChat as processSendChat, doingChat } from "src/ts/process/index.svelte";
import { processScriptFull } from "src/ts/process/scripts";
import { getModelInfo } from "src/ts/model/modellist";
import type { ModelModeExtended } from "src/ts/process/request/shared";
import { requestChatDataMain } from "src/ts/process/request/request";
import { getModuleLorebooks } from "src/ts/process/modules";
import {
    registerTTSPreprocessor,
    unregisterTTSPreprocessor,
    registerTTSPostprocessor,
    unregisterTTSPostprocessor,
    type BeforeTTSContext,
    type BeforeTTSResult,
    type AfterTTSContext,
    type AfterTTSResult,
    type TTSHookFn,
} from "src/ts/process/ttsHooks";

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

const pluginChannel = new Map<string, Function>();
const documentEventListeners: Array<{type: string, listener: EventListenerOrEventListenerObject, options: any}> = [];

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
    public getChildren(): SafeClassArray<SafeElement> {
        const children: SafeElement[] = [];
        this.#element.childNodes.forEach(node => {
            if(node instanceof HTMLElement) {
                children.push(new SafeElement(node));
            }
        });
        return new SafeClassArray<SafeElement>(children);
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
    public querySelectorAll(selector: string): SafeClassArray<SafeElement> {
        const nodeList = this.#element.querySelectorAll(selector);
        const elements: SafeElement[] = [];
        nodeList.forEach(node => {
            if(node instanceof HTMLElement) {
                elements.push(new SafeElement(node));
            }
        });
        return new SafeClassArray<SafeElement>(elements);
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
    public getElementsByClassName(className: string): SafeClassArray<SafeElement> {
        return this.querySelectorAll('.' + className);
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
    public scrollIntoView(options?: boolean | ScrollIntoViewOptions) {
        this.#element.scrollIntoView(options);
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

        const trimEvent = (event: MouseEvent | KeyboardEvent | Event) => {
            if(event instanceof MouseEvent){
                return {
                    type: event.type,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    button: event.button,
                    buttons: event.buttons,
                    altKey: event.altKey,
                    ctrlKey: event.ctrlKey,
                    shiftKey: event.shiftKey,
                    metaKey: event.metaKey,
                }
            }
            else if(event instanceof KeyboardEvent){
                return {
                    type: event.type,
                    key: event.key,
                    code: event.code,
                    repeat: event.repeat,
                    altKey: event.altKey,
                    ctrlKey: event.ctrlKey,
                    shiftKey: event.shiftKey,
                    metaKey: event.metaKey,
                }
            }
            else{
                return {
                    type: event.type
                }
            }

        }

        if(allowedDocumentEventListeners.includes(type)){
            const modifiedListener = (event: any) => {
                listener(trimEvent(event))
            }
            this.#eventIdMap.set(id, modifiedListener)
            documentEventListeners.push({type, listener: modifiedListener as EventListenerOrEventListenerObject, options: realOptions})
            document.addEventListener(type, modifiedListener, realOptions)
            return id;
        }
        else if(allowedDelayedEventListeners.includes(type)){
            const modifiedListener = (event: any) => {
                let delay = 0;
                try {
                    delay = (crypto.getRandomValues(new Uint32Array(1))[0] / 100) % 100; //0-99 ms              
                } catch (error) {}
                setTimeout(() => {
                    listener(trimEvent(event));
                }, delay);
            }
            this.#eventIdMap.set(id, modifiedListener)
            documentEventListeners.push({type, listener: modifiedListener as EventListenerOrEventListenerObject, options: realOptions})
            document.addEventListener(type, modifiedListener, realOptions);
            return id;
        }
        else{
            throw new Error(`Event listener of type '${type}' is not allowed for security reasons.`);
        }        
    }

    public removeEventListener(type:string, id:string, options?: boolean | EventListenerOptions) {
        const listener = this.#eventIdMap.get(id);
        if(listener){
            const realOptions = typeof options === 'boolean' ? { capture: options } : options || {};
            document.removeEventListener(type, listener as EventListenerOrEventListenerObject, realOptions);
            const idx = documentEventListeners.findIndex(e => e.listener === listener);
            if(idx !== -1) documentEventListeners.splice(idx, 1);
            this.#eventIdMap.delete(id);
        }
    }

    public matches (selector: string): boolean {
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

    disconnect() {
        this.#observer.disconnect();
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

const removeChatPanel = (id: string) => {
    const index = chatPanelStore.findIndex(item => item.id === id);
    if(index !== -1){
        chatPanelStore.splice(index, 1);
    }
}

const removePluginChatPanels = (pluginName: string) => {
    for(let i = chatPanelStore.length - 1; i >= 0; i--){
        if(chatPanelStore[i].pluginName === pluginName){
            chatPanelStore.splice(i, 1);
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
    try {
        instance?.host?.terminate();        
    } catch (error) {
        console.error(`Error terminating plugin ${pluginName}:`, error);
    }
}

const permissionGivenPlugins: Set<string> = new Set();
const permissionDeniedPlugins: Set<string> = new Set();
const permissionForage = localforage.createInstance({
    name: 'plugin_permissions',
    storeName: 'plugin_permissions'
});

type PluginV3ProviderOptions = PluginV2ProviderOptions & {
    model?: LLMModel
}

export const customV3ProviderMetaStore:LLMModel[] = []

const getPluginPermission = async (pluginName: string, permissionDesc: 'fetchLogs'|'db'|'mainDom'|'replacer'|'provider'|'sendChat'|'inlay', reconfirm: boolean|'periodically' = false) => {
    if(permissionGivenPlugins.has(pluginName)){
        return true;
    }
    if(permissionDeniedPlugins.has(pluginName)){
        return false;
    }

    let pluginHash = ''

    let requiresReconfirm = false;

    if(reconfirm === 'periodically'){
        const lastGrantTime:number = await permissionForage.getItem(pluginName + '_' + permissionDesc + '_lastGrantTime');
        const now = Date.now();
        if(!lastGrantTime || now - lastGrantTime > 3 * 24 * 60 * 60 * 1000){ //3 days
            requiresReconfirm = true;
        }
    }
    else if(reconfirm === true){
        requiresReconfirm = true;
    }

    pluginHash = await hasher(
        new TextEncoder().encode(
            DBState.db.plugins.find(p => p.name === pluginName)?.script
        )
    ) + `_${permissionDesc}`;

    if(!requiresReconfirm &&await permissionForage.getItem(pluginHash)){
        permissionGivenPlugins.add(pluginName);
        return true;
    }   
    

    let alertTitle =
        permissionDesc === 'fetchLogs' ? language.fetchLogConsent.replace("{}", pluginName)
        : permissionDesc === 'db' ? language.getFullDatabaseConsent.replace("{}", pluginName)
        : permissionDesc === 'mainDom' ? language.mainDomAccessConsent.replace("{}", pluginName)
        : permissionDesc === 'replacer' ? language.replacerPermissionConsent.replace("{}", pluginName)
        : permissionDesc === 'provider' ? language.providerPermissionConsent.replace("{}", pluginName)
        : permissionDesc === 'sendChat' ? language.sendChatConsent.replace("{}", pluginName)
        : permissionDesc === 'inlay' ? language.inlayPermissionConsent.replace("{}", pluginName)
        : `Error`
    if(alertTitle === 'Error'){
        return false;
    }
    const conf = await alertConfirm(alertTitle)
    if(conf && pluginHash){
        permissionGivenPlugins.add(pluginName);
        await permissionForage.setItem(pluginHash, true);
        if(reconfirm === 'periodically'){
            await permissionForage.setItem(pluginName + '_' + permissionDesc + '_lastGrantTime', Date.now());
        }
        return true;
    }
    permissionDeniedPlugins.add(pluginName);
    return false;
}

const urlBlacklist = [
    'risuai.xyz',
    'risuai.net',
    'sionyw.com',
]

const authorizationHeaders = [
    'x-api-key',
    'authorization',
    'proxy-authorization',
]

const makeRisuaiAPIV3 = (iframe:HTMLIFrameElement,plugin:RisuPlugin) => {

    const oldApis = getV2PluginAPIs();
    return {

        //Old APIs from v2.1
        risuFetch: (url, options) => {
            console.error(`[DEPRECATION WARNING] risuFetch is deprecated and will be removed in future versions. Please use nativeFetch instead.`)
            for(const blocked of urlBlacklist){
                if(url.toLowerCase().includes(blocked)){
                    throw new Error(`Requests to ${blocked} are blocked for security reasons.`);
                }
            }

            //scan headers
            const headers = options?.headers || {};
            for(const headerName in headers){
                if(authorizationHeaders.includes(headerName.toLowerCase())){
                    console.warn(`Request contains potentially sensitive header '${headerName}'. handling of such headers may be changed to only work with nativeFetch.`);
                }
            }
            return oldApis.risuFetch(url, options);
        },
        nativeFetch: (url, options) => {
            for(const blocked of urlBlacklist){
                if(url.toLowerCase().includes(blocked)){
                    throw new Error(`Requests to ${blocked} are blocked for security reasons.`);
                }
            }

            //scan headers
            const headers = options?.headers || {};
            for(const headerName in headers){
                if(authorizationHeaders.includes(headerName.toLowerCase())){
                    console.warn(`Request contains potentially sensitive header '${headerName}'. handling of such headers may be changed to use server-side approch with write-only api access in the future for better security.`);
                }
            }
            return oldApis.nativeFetch(url, options);
        },
        getChar: oldApis.getChar,
        setChar: oldApis.setChar,
        addProvider: (name: string, func: (arg: PluginV2ProviderArgument, abortSignal?: AbortSignal) => Promise<{ success: boolean, content: string | ReadableStream<string> }>, options?: PluginV3ProviderOptions) => {
            console.warn(`[WARN] addProvider is a powerful API that can potentially be unsafe if used incorrectly. addProvider's functionality might be limited or changed in future updates to ensure security. please use other APIs if possible.`);
            let provs = get(customProviderStore)
            provs.push(name)
            pluginV2.providers.set(name, async (arg, abortSignal) => {
               await getPluginPermission(plugin.name, 'provider', 'periodically');
               //mode is overridden to v3, due to vulnerabilities using mode.
               //Alternative to mode will be added in future
               arg.mode = 'v3'
               return await func(arg, abortSignal);
            }),
            pluginV2.providerOptions.set(name, options ?? {})
            customProviderStore.set(provs)

            const modelData:LLMModel = {
                id: `pluginmodel:::${name}`,
                name: options?.model?.name ?? name,
                shortName: options?.model?.shortName ?? name,
                fullName: options?.model?.fullName ?? name,
                internalID: options?.model?.internalID ?? `pluginmodel:::${name}`,
                provider: LLMProvider.AsIs,
                format: LLMFormat.Plugin,
                flags: options?.model?.flags ?? [LLMFlags.hasFullSystemPrompt],
                parameters: options?.model?.parameters ?? ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty', 'repetition_penalty', 'min_p', 'top_a', 'top_k', 'thinking_tokens'],
                tokenizer:options?.model?.tokenizer ??  LLMTokenizer.Unknown
            }
            customV3ProviderMetaStore.push(modelData);
        },
        addTTSPreprocessor: async (
            func: TTSHookFn<BeforeTTSContext, BeforeTTSResult>,
        ) => {
            registerTTSPreprocessor(func);
            addPluginUnloadCallback(plugin.name, () => unregisterTTSPreprocessor(func));
        },
        addTTSPostprocessor: async (
            func: TTSHookFn<AfterTTSContext, AfterTTSResult>,
        ) => {
            registerTTSPostprocessor(func);
            addPluginUnloadCallback(plugin.name, () => unregisterTTSPostprocessor(func));
        },
        addRisuScriptHandler: oldApis.addRisuScriptHandler,
        removeRisuScriptHandler: oldApis.removeRisuScriptHandler,
        addRisuReplacer: async (name:string,func:Function) => {
            //permission check for replacer
            const conf = await getPluginPermission(plugin.name, 'replacer', 'periodically');
            if(!conf){
                return;
            }
            oldApis.addRisuReplacer(name, func as any);
        },
        removeRisuReplacer: oldApis.removeRisuReplacer,
        addRisuChatListener: async (mode:'output', func:Function) => {
            //permission check, lets use same as replacer
            const conf = await getPluginPermission(plugin.name, 'replacer', 'periodically');
            if(!conf){
                return;
            }
            oldApis.addRisuChatListener(mode, func as any);
            addPluginUnloadCallback(plugin.name, () => oldApis.removeRisuChatListener(mode, func as any));
        },
        removeRisuChatListener: oldApis.removeRisuChatListener,
        setDatabaseLite: oldApis.setDatabaseLite,
        setDatabase: oldApis.setDatabase,
        loadPlugins: oldApis.loadPlugins,
        readImage: oldApis.readImage,
        readInlay: async (id: string) => {
            const conf = await getPluginPermission(plugin.name, 'inlay', 'periodically');
            if(!conf){
                return null;
            }
            return await getInlayAsset(id);
        },
        saveAsset: oldApis.saveAsset,
        //Same functionality, but new implementation
        getDatabase: async (includeOnly:string[]|'all' = 'all', options?:{exclude?: Record<string, string[]>, include?: Record<string, string[]>}) => {
            const conf = await getPluginPermission(plugin.name, 'db', 'periodically');
            if(!conf){
                return null;
            }
            const db = DBState.db
            let liteDB:any = {}
            const partialKeys:string[] = []
            for(const key of allowedDbKeys){
                if(includeOnly !== 'all' && !includeOnly.includes(key)){
                    continue;
                }
                const includeFields = options?.include?.[key];
                const excludeFields = options?.exclude?.[key];
                const hasInclude = includeFields && includeFields.length > 0;
                const hasExclude = excludeFields && excludeFields.length > 0;
                const value = (db as any)[key];
                if((hasInclude || hasExclude) && value && typeof value === 'object'){
                    let filtered:any;
                    if(Array.isArray(value)){
                        // always retain the merge id so a filtered result stays safely writable back
                        const idField = dbArrayIdField(key);
                        filtered = value.map((item:any) => {
                            if(!item || typeof item !== 'object') return $state.snapshot(item);
                            const obj:any = {};
                            if(hasInclude){
                                for(const k of includeFields){
                                    if(k in item) obj[k] = $state.snapshot(item[k]);
                                }
                            } else {
                                for(const k of Object.keys(item)){
                                    if(!excludeFields.includes(k)){
                                        obj[k] = $state.snapshot(item[k]);
                                    }
                                }
                            }
                            if(idField in item && !(idField in obj)) obj[idField] = $state.snapshot(item[idField]);
                            return obj;
                        });
                    } else {
                        filtered = {};
                        if(hasInclude){
                            for(const k of includeFields){
                                if(k in value) filtered[k] = $state.snapshot(value[k]);
                            }
                        } else {
                            for(const k of Object.keys(value)){
                                if(!excludeFields.includes(k)){
                                    filtered[k] = $state.snapshot(value[k]);
                                }
                            }
                        }
                    }
                    liteDB[key] = filtered;
                    partialKeys.push(key);
                } else {
                    liteDB[key] = $state.snapshot((db as any)[key]);
                }
            }
            // tag partially-read keys so setDatabase merges them back instead of replacing (which would drop omitted fields)
            if(partialKeys.length){ liteDB.__partialKeys = partialKeys; }
            return liteDB;
        },

        installPlugin: handlePluginInstallViaPlugin,

        // --- Color Scheme APIs ---
        changeColorScheme: (name: string) => {
            changeColorScheme(name)
        },
        setColorScheme: (scheme: ColorScheme) => {
            const requiredKeys = ['bgcolor','darkbg','borderc','selected','draculared','textcolor','textcolor2','darkBorderc','darkbutton','type'] as const
            for (const key of requiredKeys) {
                if (typeof (scheme as any)[key] !== 'string') {
                    throw new Error(`Invalid color scheme: missing or invalid '${key}'`)
                }
            }
            if (scheme.type !== 'light' && scheme.type !== 'dark') {
                throw new Error('Invalid color scheme type: must be "light" or "dark"')
            }
            const db = DBState.db
            db.colorSchemeName = 'custom'
            db.customColorScheme = scheme
            db.colorScheme = scheme
            updateColorScheme()
        },
        getColorScheme: () => {
            const db = DBState.db
            return {
                name: db.colorSchemeName,
                scheme: $state.snapshot(db.colorScheme)
            }
        },

        // --- Text Theme APIs ---
        changeTextTheme: (name: string) => {
            if (!['standard','highcontrast'].includes(name)) {
                throw new Error(`Invalid text theme: ${name}`)
            }
            const db = DBState.db
            db.textTheme = name
            updateTextThemeAndCSS()
        },
        setCustomTextTheme: (theme: {
            FontColorStandard: string,
            FontColorBold: string,
            FontColorItalic: string,
            FontColorItalicBold: string,
            FontColorQuote1: string,
            FontColorQuote2: string
        }) => {
            const requiredKeys = ['FontColorStandard','FontColorBold','FontColorItalic','FontColorItalicBold','FontColorQuote1','FontColorQuote2'] as const
            for (const key of requiredKeys) {
                if (typeof (theme as any)[key] !== 'string') {
                    throw new Error(`Invalid text theme: missing or invalid '${key}'`)
                }
            }
            const db = DBState.db
            db.textTheme = 'custom'
            db.customTextTheme = theme
            updateTextThemeAndCSS()
        },
        getTextTheme: () => {
            const db = DBState.db
            return {
                name: db.textTheme,
                customTheme: $state.snapshot(db.customTextTheme)
            }
        },

        //Deprecated APIs from v2.1
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
            for (const p of db.plugins) {
                if (p.name === plugin.name) {
                    p.realArg[key] = value;
                }
            }
        },
        getCharacterFromIndex: (index:number) => {
            const db = DBState.db
            const charIds = Object.keys(db.characters);
            const charId = charIds[index];
            if(charId){
                return $state.snapshot(db.characters[charId]);
            }
            return null;
        },
        setCharacterToIndex: (index:number, char:any) => {
            const db = DBState.db
            const charIds = Object.keys(db.characters);
            const charId = charIds[index];
            if(charId){
                DBState.db.characters[charId] = char
            }
        },
        getChatFromIndex: (characterIndex:number, chatIndex:number) => {
            const db = DBState.db
            const charIds = Object.keys(db.characters);
            const charId = charIds[characterIndex];
            if(charId){
                const chats = db.characters[charId].chats;
                if(chats && chats[chatIndex]){
                    return $state.snapshot(chats[chatIndex]);
                }
            }
            return null;
        },
        parseRisuChat: async (text:string, options?:{
            messageIndex?: number
            role?: string
            processRegex?: boolean
            runVar?: boolean
            rmVar?: boolean
            tokenizeAccurate?: boolean
            cbsConditions?: CbsConditions
        }) => {
            const db = DBState.db
            const char = db.characters[get(selectedCharID)];
            if(!char){
                throw new Error('No character selected');
            }
            const chat = char.chats?.[char.chatPage];
            if(!chat){
                throw new Error('No active chat found');
            }
            const chatID = options?.messageIndex ?? -1;
            if(!Number.isInteger(chatID) || chatID < -1 || chatID >= chat.message.length){
                throw new Error(`Invalid messageIndex: ${chatID}`);
            }
            const role = options?.role;
            const cbsConditions:CbsConditions = {
                ...(role ? { chatRole: role } : {}),
                ...(options?.cbsConditions ?? {}),
            };
            const parsed = risuChatParser(text ?? '', {
                chara: char,
                chatID,
                role,
                runVar: options?.runVar,
                rmVar: options?.rmVar,
                tokenizeAccurate: options?.tokenizeAccurate,
                cbsConditions,
            });

            if(!options?.processRegex){
                return parsed;
            }

            return (await processScriptFull(char, parsed, 'editprocess', chatID, cbsConditions)).data;
        },
        setChatToIndex: (characterIndex:number, chatIndex:number, chat:any) => {
            const db = DBState.db
            const charIds = Object.keys(db.characters);
            const charId = charIds[characterIndex];
            if(charId){
                const chats = db.characters[charId].chats;
                if(chats && chats[chatIndex]){
                    DBState.db.characters[charId].chats[chatIndex] = chat
                }
            }
        },
        getCurrentCharacterIndex: () => {
            return get(selectedCharID)
        },
        getCurrentChatIndex: () => {
            const db = DBState.db
            const charId = get(selectedCharID)
            return db.characters[charId].chatPage
        },
        getCurrentLorebookEntries: () => {
            const charId = get(selectedCharID)
            const char = DBState.db.characters[charId]
            if(!char){
                return []
            }
            const page = char.chatPage
            const characterLore = char.globalLore ?? []
            const chatLore = char.chats?.[page]?.localLore ?? []
            const moduleLore = getModuleLorebooks()
            return $state.snapshot(characterLore.concat(chatLore).concat(moduleLore))
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
        getRootDocument: async () => {
            const conf = await getPluginPermission(plugin.name, 'mainDom');
            if(!conf){
                return null;
            }
            return new SafeDocument(document);
        },
        registerSetting: (
            name:string,
            callback: any,
            icon:string = '',
            iconType:'html'|'img'|'none' = 'none',
            id?:string
        ) => {
            if(iconType !== 'html' && iconType !== 'img' && iconType !== 'none'){
                throw new Error("iconType must be 'html', 'img' or 'none'");
            }
            if(typeof name !== 'string' || name.trim() === ''){
                throw new Error("name must be a non-empty string");
            }
            const menuId = id || v4()
            const menuDef:MenuDef = {
                id: menuId,
                name,
                icon,
                iconType,
                callback
            }
            const existingIndex = additionalSettingsMenu.findIndex(item => item.id === menuId)
            if(existingIndex !== -1){
                additionalSettingsMenu[existingIndex] = menuDef
                addPluginUnloadCallback(
                    plugin.name,
                    makeMenuUnloadCallback(menuId, additionalSettingsMenu)
                )
                return {id: menuId}
            }
            additionalSettingsMenu.push(menuDef)
            addPluginUnloadCallback(
                plugin.name,
                makeMenuUnloadCallback(menuId, additionalSettingsMenu)
            )
            return {id: menuId};
        },
        registerBodyIntercepter: async (callback: (body: any, type: string) => any) => {

            if(await getPluginPermission(plugin.name, 'replacer') === false){
                return null;
            }
            
            const id = v4();
            bodyIntercepterStore.push({
                id,
                callback
            })
            addPluginUnloadCallback(plugin.name, () => {
                const index = bodyIntercepterStore.findIndex(item => item.id === id);
                if(index !== -1){
                    bodyIntercepterStore.splice(index, 1);
                }
            })
            return {id:id};
        },
        
        unregisterBodyIntercepter: (id: string) => {
            const index = bodyIntercepterStore.findIndex(item => item.id === id);
            if(index !== -1){
                bodyIntercepterStore.splice(index, 1);
            }
        },
            
        registerButton: (
            arg: {
                name: string,
                icon: string,
                iconType: 'html'|'img'|'none',
                location?: 'action'|'chat'|'hamburger',
                id?: string
            },
            callback: () => void
        ) => {
            let { name, icon, iconType, location, id: providedId } = arg;
            location = location || 'action';
            if(iconType !== 'html' && iconType !== 'img' && iconType !== 'none'){
                throw new Error("iconType must be 'html', 'img' or 'none'");
            }
            if(typeof name !== 'string' || name.trim() === ''){
                throw new Error("name must be a non-empty string");
            }
            if(typeof icon !== 'string'){
                throw new Error("icon must be a string");
            }
            const id = providedId || v4()
            const menuDef:MenuDef = {
                name,
                icon,
                iconType,
                callback,
                id
            }

            const buttonStores = [additionalFloatingActionButtons, additionalHamburgerMenu, additionalChatMenu]
            for(const store of buttonStores){
                const existingIndex = store.findIndex(item => item.id === id)
                if(existingIndex !== -1){
                    store[existingIndex] = menuDef
                    addPluginUnloadCallback(
                        plugin.name,
                        makeMenuUnloadCallback(id, store)
                    )
                    return {id}
                }
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
            return {id};
        },
        setChatPanel: (
            content: string | null,
            options: {
                id?: string,
                className?: string,
            } = {}
        ) => {
            const id = options.id || `${plugin.name}:default`;

            if(content === null || content === ''){
                removeChatPanel(id);
                return {id};
            }

            if(typeof content !== 'string'){
                throw new Error("content must be a string or null");
            }

            const panel = {
                id,
                pluginName: plugin.name,
                html: DOMPurify.sanitize(content),
                className: typeof options.className === 'string'
                    ? DOMPurify.sanitize(options.className, {ALLOWED_TAGS: [], ALLOWED_ATTR: []})
                    : undefined,
            }

            const existingIndex = chatPanelStore.findIndex(item => item.id === id);
            if(existingIndex !== -1){
                chatPanelStore[existingIndex] = panel;
            }
            else{
                chatPanelStore.push(panel);
            }
            addPluginUnloadCallback(plugin.name, () => removePluginChatPanels(plugin.name));
            return {id};
        },
        registerMCP: registerMCPModule,
        unregisterMCP: unregisterMCPModule,
        unregisterUIPart: (id: string) => {
            const removeFromMenuStore = (menuStore: MenuDef[]) => {
                const index = menuStore.findIndex(item => item.id === id);
                if(index !== -1){
                    menuStore.splice(index, 1);
                }
            }

            removeFromMenuStore(additionalSettingsMenu);
            removeFromMenuStore(additionalFloatingActionButtons);
            removeFromMenuStore(additionalHamburgerMenu);
            removeFromMenuStore(additionalChatMenu);
            removeChatPanel(id);
        },
        log: (message:string) => {
            console.log(`[RisuAI Plugin: ${plugin.name}] ${message}`);
        },
        createMutationObserver(callback: SafeMutationCallback): SafeMutationObserver {
            const observer = new SafeMutationObserver(callback)
            addPluginUnloadCallback(plugin.name, () => {
                observer.disconnect()
            })
            return observer
        },
        onUnload: (callback: () => void) => {
            addPluginUnloadCallback(plugin.name, callback);
        },
        getFetchLogs: async () => {
            const unsafeFetchLog = getFetchLogs()
            const conf = await getPluginPermission(plugin.name, 'fetchLogs');
            if(!conf){
                return null;
            }
            return unsafeFetchLog.map(log => {

                const url = new URL(log.url);
                return {
                    url: url.origin + url.pathname,
                    body: log.body,
                    status: log.status,
                    response: log.response,
                }
            })
        },

        alert: (msg:string) => {
            return alertNormal(msg)
        },
        alertConfirm: (msg:string) => {
            return alertConfirm(msg)
        },
        alertError: (msg:string) => {
            return alertError(msg)
        },
        getRuntimeInfo: () => {
            return {
                apiVersion: "3.0",
                platform: 
                    isNodeServer ? 'node' :
                    isTauri ? 'tauri' :
                    'web',
                saveMethod:
                    isTauri ? 'tauri' :
                    forageStorage.isAccount ? 'account' :
                    'local',
            }
        },
        getLocalPluginStorage: () => {
            return new SafeLocalPluginStorage()
        },
        checkCharOrder: checkCharOrder,
        requestPluginPermission: (permission:string) => {
            return getPluginPermission(plugin.name, permission as any);
        },
        //Internal use APIs
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
        //pluginStorage is coldstorage-backed for v3: values live in cold storage,
        //db.pluginCustomStorage._coldplugin only keeps the key -> coldstorage id map
        _getPluginStorage: async (key: string) => {
            const db = getDatabase()
            const coldId = db.pluginCustomStorage?._coldplugin?.[key]
            if(!coldId){
                return null
            }
            const value = await getColdStorageItem(coldId)
            return value ?? null
        },
        _setPluginStorage: async (key: string, value: any) => {
            const db = getDatabase()
            db.pluginCustomStorage ??= {}
            db.pluginCustomStorage._coldplugin ??= {}
            let coldId: string = db.pluginCustomStorage._coldplugin[key]
            if(!coldId){
                coldId = v4()
                db.pluginCustomStorage._coldplugin[key] = coldId
            }
            await setColdStorageItem(coldId, value)
        },
        _removePluginStorage: async (key: string) => {
            const db = getDatabase()
            if(db.pluginCustomStorage?._coldplugin){
                delete db.pluginCustomStorage._coldplugin[key]
            }
        },
        _clearPluginStorage: async () => {
            const db = getDatabase()
            db.pluginCustomStorage ??= {}
            db.pluginCustomStorage._coldplugin = {}
        },
        _keyPluginStorage: async (index: number) => {
            const db = getDatabase()
            const keys = Object.keys(db.pluginCustomStorage?._coldplugin ?? {})
            return keys[index] ?? null
        },
        _keysPluginStorage: async () => {
            const db = getDatabase()
            return Object.keys(db.pluginCustomStorage?._coldplugin ?? {})
        },
        _lengthPluginStorage: async () => {
            const db = getDatabase()
            return Object.keys(db.pluginCustomStorage?._coldplugin ?? {}).length
        },
        _getSafeLocalStorage: oldApis.safeLocalStorage.getItem,
        _setSafeLocalStorage: oldApis.safeLocalStorage.setItem,
        _removeSafeLocalStorage: oldApis.safeLocalStorage.removeItem,
        _clearSafeLocalStorage: oldApis.safeLocalStorage.clear,
        _keySafeLocalStorage: oldApis.safeLocalStorage.key,
        _keysSafeLocalStorage: oldApis.safeLocalStorage.keys,
        searchTranslationCache: async (partialKey: string) => {
            return searchLLMCache(partialKey)
        },
        getTranslationCache: async (key: string) => {
            return getLLMCache(key)
        },
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
        },
        runLLMModel: async (options: {
            mode: ModelModeExtended
            messages: OpenAIChat[]
            staticModel?: string
            allowPlugins?: boolean
        }) => {
            return requestChatDataMain({
                formated: options.messages,
                bias: {},
                staticModel: options.staticModel,

                // Calls into plugin-provided models are blocked by default to
                // guard against accidental IPC loops between provider plugins.
                // Plugin authors who need to reach the user's plugin-supplied
                // main or auxiliary model (e.g. a TTS preprocessor that
                // rewrites text with the configured otherAx model) can opt in
                // explicitly with `allowPlugins: true`, accepting responsibility
                // for avoiding provider-to-provider call loops.
                blockPlugins: !options.allowPlugins,
            }, options.mode)
        },
        sendChat: async (message: string) => {
            const conf = await getPluginPermission(plugin.name, 'sendChat');
            if(!conf){
                return false;
            }

            if(typeof message !== 'string'){
                throw new Error("Message must be a string");
            }

            if(get(doingChat)){
                throw new Error("A chat is already in progress");
            }

            if(getModelInfo(DBState.db.aiModel).id.startsWith('pluginmodel:::')){
                // Executing plugin provider is block because it can be used for loopholes for ipc right now.
                throw new Error("Sending chat with plugin-based model is currently blocked");
            }

            const charId = get(selectedCharID);
            const char = DBState.db.characters[charId];
            if(!char){
                throw new Error("No character selected");
            }

            const chat = char.chats[char.chatPage];
            if(!chat){
                throw new Error("No active chat found");
            }

            if(message){
                chat.message.push({
                    role: 'user',
                    data: message,
                    time: Date.now(),
                });
            }

            try {
                await processSendChat(-1, {});
            } finally {
                // Plugin API path does not pass through the UI unlock logic,
                // so release doingChat here on both success and failure.
                doingChat.set(false);
            }

            return true;
        },
        addPluginChannelListener: (channelName: string, callback: Function) => {
            pluginChannel.set(plugin.name + channelName, callback);
            addPluginUnloadCallback(plugin.name, () => {
                pluginChannel.delete(plugin.name + channelName);
            })
        },
        postPluginChannelMessage: (pluginName: string, channelName: string, message: any) => {

            const currentPluginName = plugin.name;
            const receiverPlugin = DBState.db.plugins.find(p => p.name === pluginName);

            if(!receiverPlugin){
                console.warn(`[RisuAI Plugin: ${currentPluginName}] Attempted to send message to non-existent plugin '${pluginName}' on channel '${channelName}'.`);
                return;
            }

            if(!receiverPlugin.allowedIPC?.includes(currentPluginName)){
                console.warn(`[RisuAI Plugin: ${currentPluginName}] Attempted to send message to plugin '${pluginName}' but receiver plugin does not allow IPC communication from this plugin. declare //@allowed-ipc ${currentPluginName} in the reciver plugin script to allow IPC communication.`);
                return;
            }

            if(!plugin.allowedIPC?.includes(receiverPlugin.name)){
                console.warn(`[RisuAI Plugin: ${currentPluginName}] Attempted to send message to plugin '${pluginName}' but the sender plugin does not allow IPC communication to this plugin. declare //@allowed-ipc ${receiverPlugin.name} in the sender plugin script to allow IPC communication.`);
                return;
            }


            const callback = pluginChannel.get(pluginName + channelName);
            if(callback){
                callback(message, {
                    sender: currentPluginName,
                    channel: channelName
                });
            }
        },
        saveSecretHeader: async (key: string, value: string|string[]) => {
            //TODO: Implement server-side secret storage with write-only access for plugins, to enhance security when handling sensitive information like API keys.
            //This will have rate-limit, to prevent saving it publicly and writing as secret every time before using it.
            console.warn(`[RisuAI Plugin: ${plugin.name}] saveServerSecret is not implemented yet. This API is intended for securely storing sensitive information like API keys with write-only access for plugins. Please avoid using this API until it is implemented.`);
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

    for(const entry of documentEventListeners){
        document.removeEventListener(entry.type, entry.listener, entry.options);
    }
    documentEventListeners.length = 0;

    const loadPromises = plugins.map(plugin => executePluginV3(plugin));
    await Promise.all(loadPromises);
}

export async function executePluginV3(plugin:RisuPlugin){

    const alreadyRunning = v3PluginInstances.find(p => p.name === plugin.name);
    if(alreadyRunning){
        console.log(`[RisuAI Plugin: ${plugin.name}] Plugin is already running. Skipping load.`);
        return;
    }

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

globalThis.__debugV3Plugin = (code: string|Function, pluginName: string = '') => {
    if(code instanceof Function){
        code = `(${code.toString()})()`;
    }
    if(pluginName === ''){
        return v3PluginInstances[0].host.executeInIframe(code);
    }
    const instance = v3PluginInstances.find(p => p.name === pluginName);
    if(!instance){
        throw new Error(`Plugin ${pluginName} not found.`);
    }
    return instance.host.executeInIframe(code);
};

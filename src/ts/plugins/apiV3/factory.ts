type MsgType =
    | 'CALL_ROOT'
    | 'CALL_INSTANCE'
    | 'INVOKE_CALLBACK'
    | 'CALLBACK_RETURN'
    | 'RESPONSE'
    | 'RELEASE_INSTANCE'
    | 'ABORT_SIGNAL';

interface RpcMessage {
    type: MsgType;
    reqId?: string;
    id?: string;
    ids?: string[];
    method?: string;
    args?: any[];
    result?: any;
    error?: string;
    abortId?: string;
}

interface RemoteRef {
    __type: 'REMOTE_REF';
    id: string;
}

interface CallbackRef {
    __type: 'CALLBACK_REF';
    id: string;
}

interface AbortSignalRef {
    __type: 'ABORT_SIGNAL_REF';
    abortId: string;
    aborted: boolean;
}


const GUEST_BRIDGE_SCRIPT = `
await (async function() {
    const pendingRequests = new Map();
    const callbackRegistry = new Map();
    const callbackIdByFunction = new WeakMap();
    const proxyRefRegistry = new WeakMap();
    const releaseBuffer = [];
    const flushReleases = () => {
        if (releaseBuffer.length === 0) return;
        const ids = releaseBuffer.splice(0);
        try {
            send({ type: 'RELEASE_INSTANCE', ids: ids });
        } catch (_) {
            // Frame is tearing down; host clears its registry anyway
        }
    };
    const releaseRegistry = new FinalizationRegistry((id) => {
        // Schedule one flush per burst: first push arms the microtask.
        if (releaseBuffer.length === 0) queueMicrotask(flushReleases);
        releaseBuffer.push(id);
    });
    const abortControllers = new Map();

    function serializeArg(arg) {
        if (typeof arg === 'function') {
            const existingId = callbackIdByFunction.get(arg);
            if (existingId) {
                return { __type: 'CALLBACK_REF', id: existingId };
            }
            const id = 'cb_' + Math.random().toString(36).substring(2);
            callbackRegistry.set(id, arg);
            callbackIdByFunction.set(arg, id);
            return { __type: 'CALLBACK_REF', id: id };
        }
        if (arg && typeof arg === 'object') {
            const refId = proxyRefRegistry.get(arg);
            if (refId) {
                return { __type: 'REMOTE_REF', id: refId };
            }
            if (arg.constructor === Object) {
                let out = null;
                for (const [key, val] of Object.entries(arg)) {
                    if (val instanceof AbortSignal) {
                        if (!out) out = { ...arg };
                        const abortId = 'abort_' + Math.random().toString(36).substring(2);

                        if (!val.aborted) {
                            val.addEventListener('abort', () => {
                                send({ type: 'ABORT_SIGNAL', abortId });
                            }, { once: true });
                        }

                        out[key] = { __type: 'ABORT_SIGNAL_REF', abortId, aborted: val.aborted };
                    }
                }
                if (out) return out;
            }
        }
        return arg;
    }

    function deserializeResult(val) {
        if (val && typeof val === 'object' && val.__type === 'REMOTE_REF') {
            const proxy = new Proxy({}, {
                get: (target, prop) => {
                    if (prop === 'then') return undefined;
                    if (prop === 'release') {
                        return () => send({ type: 'RELEASE_INSTANCE', id: val.id });
                    }
                    return (...args) => {
                        // Extracted methods must pin their owning proxy:
                        // without this reference the proxy could be
                        // collected (and auto-released) while this
                        // function is still callable.
                        void proxy;
                        return sendRequest('CALL_INSTANCE', {
                            id: val.id,
                            method: prop,
                            args: args
                        });
                    };
                }
            });
            // Store the mapping so we can serialize it back
            proxyRefRegistry.set(proxy, val.id);
            // Held value must be the id string, never the proxy itself:
            // the registry holds it strongly until cleanup fires.
            releaseRegistry.register(proxy, val.id);
            return proxy;
        }
        if (val && typeof val === 'object' && val.__type === 'CALLBACK_STREAMS') {
            //specialType, one of
            // - Response
            // - none
            const specialType = val.__specialType;
            if (specialType === 'Response') {
                return new Response(val.value, val.init);
            }
            return val.value;
        }
        return val;
    }

    function collectTransferables(obj, transferables = []) {
        if (!obj || typeof obj !== 'object') return transferables;

        if (obj instanceof ArrayBuffer ||
            obj instanceof MessagePort ||
            obj instanceof ImageBitmap ||
            (typeof OffscreenCanvas !== 'undefined' && obj instanceof OffscreenCanvas)) {
            transferables.push(obj);
        }
        else if (ArrayBuffer.isView(obj) && obj.buffer instanceof ArrayBuffer) {
            transferables.push(obj.buffer);
        }
        else if (Array.isArray(obj)) {
            obj.forEach(item => collectTransferables(item, transferables));
        }
        else if (obj.constructor === Object) {
            Object.values(obj).forEach(value => collectTransferables(value, transferables));
        }

        return transferables;
    }

    function replaceStreamsWithPorts(obj) {
        const ports = [];
        const cleanups = [];
        if (!obj || typeof obj !== 'object') return { result: obj, ports, cleanups };

        function replace(val) {
            if (!(val instanceof ReadableStream)) return val;

            const ch = new MessageChannel();
            ports.push(ch.port2);

            const reader = val.getReader();
            let credits = 0;
            let reading = false;
            let finished = false;

            function finish() {
                finished = true;
                ch.port1.onmessage = null;
                ch.port1.close();
            }

            cleanups.push(() => {
                reader.cancel().catch(() => {});
                finish();
            });

            async function pump() {
                if (reading || finished) return;
                reading = true;
                try {
                    while (credits > 0 && !finished) {
                        credits--;
                        const { done, value } = await reader.read();
                        if (finished) return;
                        if (done) { ch.port1.postMessage({ done: true }); finish(); return; }
                        ch.port1.postMessage({ done: false, value });
                    }
                } catch (e) {
                    try { ch.port1.postMessage({ done: true, error: e.message }); } catch(_) {}
                    finish();
                } finally {
                    reading = false;
                }
            }

            ch.port1.onmessage = (e) => {
                if (e.data?.cancel) {
                    reader.cancel();
                    finish();
                } else if (e.data?.pull) {
                    credits++;
                    pump();
                }
            };

            return { __type: 'STREAM_PORT', portIndex: ports.length - 1 };
        }

        if (obj instanceof ReadableStream) return { result: replace(obj), ports, cleanups };
        if (obj.constructor === Object) {
            const out = {};
            for (const k of Object.keys(obj)) out[k] = replace(obj[k]);
            return { result: out, ports, cleanups };
        }

        return { result: obj, ports, cleanups };
    }

    function reconstructStreamsFromPorts(obj, ports) {
        if (!obj || typeof obj !== 'object') return obj;

        function reconstruct(val) {
            if (!val || val.__type !== 'STREAM_PORT' || typeof val.portIndex !== 'number') return val;

            const port = ports[val.portIndex];
            if (!port) throw new Error('Stream port at index ' + val.portIndex + ' not received');

            return new ReadableStream({
                start(controller) {
                    port.onmessage = (e) => {
                        if (e.data.done) {
                            if (e.data.error) controller.error(new Error(e.data.error));
                            else controller.close();
                            port.onmessage = null;
                            port.close();
                        } else {
                            controller.enqueue(e.data.value);
                        }
                    };
                },
                pull() {
                    port.postMessage({ pull: true });
                },
                cancel() {
                    port.postMessage({ cancel: true });
                    port.onmessage = null;
                    port.close();
                }
            });
        }

        if (obj.__type === 'STREAM_PORT') return reconstruct(obj);
        if (obj.constructor === Object) {
            const out = {};
            for (const k of Object.keys(obj)) out[k] = reconstruct(obj[k]);
            return out;
        }

        return obj;
    }

    function send(payload, transferables = []) {
        window.parent.postMessage(payload, '*', transferables);
    }

    function sendRequest(type, payload) {
        return new Promise((resolve, reject) => {
            const reqId = Math.random().toString(36).substring(7);
            pendingRequests.set(reqId, { resolve, reject });


            if (payload.args) {
                payload.args = payload.args.map(serializeArg);
            }

            const message = { type: type, reqId: reqId, ...payload };
            const transferables = collectTransferables(message);
            send(message, transferables);
        });
    }

    
    
    
    window.addEventListener('message', async (event) => {
        const data = event.data;
        if (!data) return;


        if (data.type === 'RESPONSE' && data.reqId) {
            const req = pendingRequests.get(data.reqId);
            if (req) {
                if (data.error) req.reject(new Error(data.error));
                else {
                    try {
                        req.resolve(deserializeResult(reconstructStreamsFromPorts(data.result, event.ports)));
                    } catch (e) {
                        req.reject(e);
                    }
                }
                pendingRequests.delete(data.reqId);
            }
        }

        else if (data.type === 'EXECUTE_CODE' && data.reqId) {
            const response = { type: 'EXEC_RESULT', reqId: data.reqId };
            try {
                const result = await eval('(async () => {' + data.code + '})()');
                response.result = result;
            } catch (e) {
                response.error = e.message || String(e);
            }
            send(response);
        }

        else if (data.type === 'ABORT_SIGNAL' && data.abortId) {
            const controller = abortControllers.get(data.abortId);
            if (controller) {
                controller.abort();
                abortControllers.delete(data.abortId);
            }
        }

        else if (data.type === 'INVOKE_CALLBACK' && data.id) {
            const fn = callbackRegistry.get(data.id);
            const response = { type: 'CALLBACK_RETURN', reqId: data.reqId };
            const usedAbortIds = [];
            let transferables = [];
            let streamCleanups = [];

            const rollbackStreams = () => {
                for (const cleanup of streamCleanups) {
                    try { cleanup(); } catch(_) {}
                }
                streamCleanups = [];
            };

            try {
                if (!fn) throw new Error("Callback not found or released");
                const deserializedArgs = (data.args || []).map(function(a) {
                    if (a && typeof a === 'object' && a.__type === 'ABORT_SIGNAL_REF') {
                        const controller = new AbortController();
                        abortControllers.set(a.abortId, controller);
                        usedAbortIds.push(a.abortId);
                        if (a.aborted) { controller.abort(); }
                        return controller.signal;
                    }
                    return deserializeResult(a);
                });
                const result = await fn(...deserializedArgs);
                response.result = result;
                const { result: streamResult, ports: streamPorts, cleanups } = replaceStreamsWithPorts(response.result);
                response.result = streamResult;
                streamCleanups = cleanups;
                transferables = collectTransferables(response, streamPorts);
            } catch (e) {
                rollbackStreams();
                delete response.result;
                response.error = (e && e.message) || String(e || "Guest callback error");
            }
            // Clean up abort controllers after callback completes
            for (const id of usedAbortIds) {
                abortControllers.delete(id);
            }
            try {
                send(response, transferables);
            } catch (e) {
                rollbackStreams();
                try {
                    send({
                        type: 'CALLBACK_RETURN',
                        reqId: data.reqId,
                        error: 'Failed to post message to parent: ' + ((e && e.message) || String(e || "Unknown error"))
                    });
                } catch(_) {}
            }
        }
    });





    const propertyCache = new Map();

    window.risuai = new Proxy({}, {
        get: (target, prop) => {
            if (propertyCache.has(prop)) {
                return propertyCache.get(prop);
            }
            return (...args) => sendRequest('CALL_ROOT', { method: prop, args: args });
        }
    });
    window.Risuai = window.risuai;

    try {
        // Initialize cached properties
        const propsToInit = await window.risuai._getPropertiesForInitialization();
        console.log('Initializing risuai properties:', JSON.stringify(propsToInit.list));
        for (let i = 0; i < propsToInit.list.length; i++) {
            const key = propsToInit.list[i];
            const value = propsToInit[key];
            propertyCache.set(key, value);
        }

        // Initialize aliases
        const aliases = await window.risuai._getAliases();
        const aliasKeys = Object.keys(aliases);
        for (let i = 0; i < aliasKeys.length; i++) {
            const aliasKey = aliasKeys[i];
            const childrens = Object.keys(aliases[aliasKey]);
            const aliasObj = {};
            for (let j = 0; j < childrens.length; j++) {
                const childKey = childrens[j];
                aliasObj[childKey] = risuai[aliases[aliasKey][childKey]];
            }
            propertyCache.set(aliasKey, aliasObj);
        }

        // Initialize helper functions defined in the guest

        propertyCache.set('unwarpSafeArray', async (safeArray) => {
            const length = await safeArray.length();
            const result = [];
            for (let i = 0; i < length; i++) {
                const item = await safeArray.at(i);
                result.push(item);
            }
            return result;
        });
    } catch (e) {
        console.error('Failed to initialize risuai properties:', e);
    }

    window.initOldApiGlobal = () => {
        const keys = risuai._getOldKeys()
        for(const key of keys){
            window[key] = risuai[key];
        }
    }

    Object.freeze(window.postMessage);
})();
`;

export class SandboxHost {
    private iframe: HTMLIFrameElement;
    private apiFactory: any;
    private nonce = crypto.randomUUID();
    private csp = `connect-src 'none'; script-src 'nonce-${this.nonce}' 'wasm-unsafe-eval'; frame-src 'none'; object-src 'none'; style-src * 'unsafe-inline'; default-src 'none'; img-src * data: blob:; font-src * data: blob:; media-src * data: blob:; base-uri 'none';`;

    private instanceRegistry = new Map<string, any>();
    private refIdCounter = 0;
    private abortControllers = new Map<string, AbortController>();
    private messageHandlerRef: ((event: MessageEvent) => void) | null = null;
    private callbackWrapperCache = new Map<string, Function>();

    private pendingCallbacks = new Map<string, { resolve: Function, reject: Function }>();

    // Teardown hooks for streams bridged over MessagePort. MessagePort has no
    // 'close' event in stable browsers, so without these the other side of an
    // active stream would wait forever once the iframe is gone.
    private activeStreamCleanups = new Set<() => void>();

    constructor(apiFactory: any) {
        this.apiFactory = apiFactory;
    }

    public executeInIframe(code: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const reqId = 'exec_' + Math.random().toString(36).substring(2);

            const handler = (event: MessageEvent) => {
                if (event.source !== this.iframe.contentWindow) return;
                const data = event.data;

                if (data.type === 'EXEC_RESULT' && data.reqId === reqId) {
                    window.removeEventListener('message', handler);
                    if (data.error) {
                        reject(new Error(data.error));
                    } else {
                        resolve(data.result);
                    }
                }
            };

            window.addEventListener('message', handler);

            this.iframe.contentWindow?.postMessage({
                type: 'EXECUTE_CODE',
                reqId,
                code
            }, '*');
        });
    }

    private collectTransferables(obj: any, transferables: Transferable[] = []): Transferable[] {
        if (!obj || typeof obj !== 'object') return transferables;

        if (obj instanceof ArrayBuffer ||
            obj instanceof MessagePort ||
            obj instanceof ImageBitmap ||
            obj instanceof WritableStream ||
            obj instanceof TransformStream ||
            (typeof OffscreenCanvas !== 'undefined' && obj instanceof OffscreenCanvas)) {
            transferables.push(obj);
        }
        else if (ArrayBuffer.isView(obj) && obj.buffer instanceof ArrayBuffer) {
            transferables.push(obj.buffer);
        }
        else if (Array.isArray(obj)) {
            obj.forEach(item => this.collectTransferables(item, transferables));
        }
        else if (obj.constructor === Object) {
            Object.values(obj).forEach(value => this.collectTransferables(value, transferables));
        }

        return transferables;
    }


    private serialize(val: any): any {
        if (
            val &&
            (typeof val === 'object' || typeof val === 'function') &&
            val.__classType === 'REMOTE_REQUIRED'
        ) {
            if (val === null) return null;
            if (Array.isArray(val)) return val;


            const id = 'ref_' + (++this.refIdCounter);
            this.instanceRegistry.set(id, val);
            return { __type: 'REMOTE_REF', id } as RemoteRef;
        }

        if(val instanceof Response) {
            return {
                __type: 'CALLBACK_STREAMS',
                __specialType: 'Response',
                value: val.body,
                init: {
                    status: val.status,
                    statusText: val.statusText,
                    headers: Array.from(val.headers.entries())
                }
            };
        }

        if(
            val instanceof WritableStream
            || val instanceof TransformStream
        ) {
            return {
                __type: 'CALLBACK_STREAMS',
                __specialType: 'none',
                value: val
            };
        }
        return val;
    }


    private deserializeArgs(args: any[], usedAbortIds?: string[]) {
        return args.map(arg => {
            if (arg && arg.__type === 'CALLBACK_REF') {
                const cbRef = arg as CallbackRef;

                const cached = this.callbackWrapperCache.get(cbRef.id);
                if (cached) return cached;

                const wrapper = async (...innerArgs: any[]) => {
                    return new Promise((resolve, reject) => {
                        const reqId = 'cb_req_' + Math.random().toString(36).substring(2);
                        this.pendingCallbacks.set(reqId, { resolve, reject });

                        // AbortSignal cannot be structured-cloned for postMessage.
                        // Convert to a serializable ref and forward abort events
                        // via a separate ABORT_SIGNAL message.
                        const sanitizedArgs = innerArgs.map(arg => {
                            if (arg instanceof AbortSignal) {
                                const abortId = 'abort_' + Math.random().toString(36).substring(2);
                                const ref: AbortSignalRef = {
                                    __type: 'ABORT_SIGNAL_REF',
                                    abortId,
                                    aborted: arg.aborted
                                };
                                if (!arg.aborted) {
                                    arg.addEventListener('abort', () => {
                                        try {
                                            this.iframe.contentWindow?.postMessage({
                                                type: 'ABORT_SIGNAL',
                                                abortId
                                            } as RpcMessage, '*');
                                        } catch (_) { /* iframe already removed */ }
                                    }, { once: true });
                                }
                                return ref;
                            }
                            return this.serialize(arg);
                        });

                        const message = {
                            type: 'INVOKE_CALLBACK',
                            id: cbRef.id,
                            reqId,
                            args: sanitizedArgs
                        };
                        const transferables = this.collectTransferables(message);
                        this.iframe.contentWindow?.postMessage(message, '*', transferables);
                    });
                };
                this.callbackWrapperCache.set(cbRef.id, wrapper);
                return wrapper;
            }
            if (arg && arg.__type === 'REMOTE_REF') {
                const remoteRef = arg as RemoteRef;
                const instance = this.instanceRegistry.get(remoteRef.id);
                if (instance) {
                    return instance;
                }
                throw new Error("Instance not found or released");
            }
            if (arg && typeof arg === 'object' && arg.constructor === Object) {
                let out: any = null;
                for (const [key, val] of Object.entries<any>(arg)) {
                    if (val && val.__type === 'ABORT_SIGNAL_REF') {
                        if (!out) out = { ...arg };
                        const abortRef = val as AbortSignalRef, controller = new AbortController();

                        if (abortRef.aborted) controller.abort();
                        else this.abortControllers.set(abortRef.abortId, controller);

                        usedAbortIds?.push(abortRef.abortId);
                        out[key] = controller.signal;
                    }
                }
                if (out) return out;
            }
            return arg;
        });
    }

    private replaceStreamsWithPorts(obj: any): { result: any, ports: MessagePort[], cleanups: (() => void)[] } {
        const ports: MessagePort[] = [];
        const cleanups: (() => void)[] = [];
        if (!obj || typeof obj !== 'object') return { result: obj, ports, cleanups };

        const replace = (val: any): any => {
            if (!(val instanceof ReadableStream)) return val;

            const ch = new MessageChannel();
            ports.push(ch.port2);

            const reader = val.getReader();
            let credits = 0;
            let reading = false;
            let finished = false;

            const finish = () => {
                finished = true;
                ch.port1.onmessage = null;
                ch.port1.close();
                this.activeStreamCleanups.delete(cleanup);
            };

            const cleanup = () => {
                reader.cancel().catch(() => {});
                finish();
            };
            this.activeStreamCleanups.add(cleanup);
            cleanups.push(cleanup);

            const pump = async () => {
                if (reading || finished) return;
                reading = true;
                try {
                    while (credits > 0 && !finished) {
                        credits--;
                        const { done, value } = await reader.read();
                        if (finished) return;
                        if (done) { ch.port1.postMessage({ done: true }); finish(); return; }
                        ch.port1.postMessage({ done: false, value });
                    }
                } catch (e: any) {
                    try { ch.port1.postMessage({ done: true, error: e.message }); } catch(_) {}
                    finish();
                } finally {
                    reading = false;
                }
            };

            ch.port1.onmessage = (e: MessageEvent) => {
                if (e.data?.cancel) {
                    reader.cancel();
                    finish();
                } else if (e.data?.pull) {
                    credits++;
                    pump();
                }
            };

            return { __type: 'STREAM_PORT', portIndex: ports.length - 1 };
        };

        if (obj instanceof ReadableStream) return { result: replace(obj), ports, cleanups };
        if (obj.constructor === Object) {
            const out: any = {};
            for (const k of Object.keys(obj)) out[k] = replace(obj[k]);
            return { result: out, ports, cleanups };
        }

        return { result: obj, ports, cleanups };
    }

    private reconstructStreamsFromPorts(obj: any, ports: readonly MessagePort[]): any {
        if (!obj || typeof obj !== 'object') return obj;

        const reconstruct = (val: any): any => {
            if (val?.__type !== 'STREAM_PORT' || typeof val.portIndex !== 'number') return val;

            const port = ports[val.portIndex];
            if (!port) throw new Error(`Stream port at index ${val.portIndex} not received`);

            const cleanups = this.activeStreamCleanups;
            let cleanup: (() => void) | null = null;
            const unregister = () => {
                if (cleanup) {
                    cleanups.delete(cleanup);
                    cleanup = null;
                }
            };

            return new ReadableStream({
                start(controller) {
                    port.onmessage = (e: MessageEvent) => {
                        if (e.data.done) {
                            if (e.data.error) controller.error(new Error(e.data.error));
                            else controller.close();
                            port.onmessage = null;
                            port.close();
                            unregister();
                        } else {
                            controller.enqueue(e.data.value);
                        }
                    };
                    cleanup = () => {
                        controller.error(new Error('Sandbox terminated'));
                        port.onmessage = null;
                        port.close();
                    };
                    cleanups.add(cleanup);
                },
                pull() {
                    port.postMessage({ pull: true });
                },
                cancel() {
                    port.postMessage({ cancel: true });
                    port.onmessage = null;
                    port.close();
                    unregister();
                }
            });
        };

        if (obj.__type === 'STREAM_PORT') return reconstruct(obj);
        if (obj.constructor === Object) {
            const out: any = {};
            for (const k of Object.keys(obj)) out[k] = reconstruct(obj[k]);
            return out;
        }

        return obj;
    }

    private closeActiveStreams() {
        for (const cleanup of [...this.activeStreamCleanups]) {
            try { cleanup(); } catch(_) {}
        }
        this.activeStreamCleanups.clear();
    }

    public run(container: HTMLElement|HTMLIFrameElement, userCode: string) {
        if(container instanceof HTMLIFrameElement) {
            this.iframe = container;
        } else {
            this.iframe = document.createElement('iframe');
            container.appendChild(this.iframe);
        }

        this.iframe.style.width = "100%";
        this.iframe.style.height = "100%";
        this.iframe.style.border = "none";

        this.iframe.style.backgroundColor = "transparent";
        this.iframe.setAttribute('allowTransparency', 'true');

        this.iframe.sandbox.add('allow-scripts');
        this.iframe.sandbox.add('allow-modals')
        this.iframe.sandbox.add('allow-downloads')

        this.iframe.setAttribute('csp', this.csp);

        const messageHandler = async (event: MessageEvent) => {
            if (event.source !== this.iframe.contentWindow) return;
            const data = event.data as RpcMessage;


            if (data.type === 'CALLBACK_RETURN') {
                const req = this.pendingCallbacks.get(data.reqId!);
                if (req) {
                    if (data.error) req.reject(new Error(data.error));
                    else {
                        try {
                            req.resolve(this.reconstructStreamsFromPorts(data.result, event.ports));
                        } catch (e) {
                            req.reject(e);
                        }
                    }
                    this.pendingCallbacks.delete(data.reqId!);
                }
                return;
            }

            if (data.type === 'ABORT_SIGNAL') {
                const controller = this.abortControllers.get(data.abortId!);
                if (controller) {
                    controller.abort();
                    this.abortControllers.delete(data.abortId!);
                }
                return;
            }


            if (data.type === 'RELEASE_INSTANCE') {
                if (data.id) this.instanceRegistry.delete(data.id!);
                if (Array.isArray(data.ids)) for (const id of data.ids) this.instanceRegistry.delete(id);
                return;
            }


            if (data.type === 'CALL_ROOT' || data.type === 'CALL_INSTANCE') {
                const response: RpcMessage = { type: 'RESPONSE', reqId: data.reqId };
                const usedAbortIds: string[] = [];
                let transferables: Transferable[] = [];
                let streamCleanups: (() => void)[] = [];

                const rollbackStreams = () => {
                    for (const cleanup of streamCleanups) {
                        try { cleanup(); } catch(_) {}
                    }
                    streamCleanups = [];
                };

                try {

                    const args = this.deserializeArgs(data.args || [], usedAbortIds);
                    let result: any;


                    if (data.type === 'CALL_ROOT') {
                        const fn = this.apiFactory[data.method!];
                        if (typeof fn !== 'function') throw new Error(`API method ${data.method} not found`);
                        result = await fn(...args);
                    } else {
                        const instance = this.instanceRegistry.get(data.id!);
                        if (!instance) throw new Error("Instance not found or released");
                        if (typeof instance[data.method!] !== 'function') throw new Error(`Method ${data.method} missing on instance`);
                        result = await instance[data.method!](...args);
                    }


                    response.result = this.serialize(result);
                    const { result: streamResult, ports: streamPorts, cleanups } = this.replaceStreamsWithPorts(response.result);
                    response.result = streamResult;
                    streamCleanups = cleanups;
                    transferables = this.collectTransferables(response, streamPorts);

                } catch (err: any) {
                    rollbackStreams();
                    delete response.result;
                    response.error = err?.message || String(err || "Host execution error");
                } finally {
                    for (const id of usedAbortIds) this.abortControllers.delete(id);
                }

                console.log("Original request:", data);
                console.log('Original response:', response, transferables);
                try {
                    this.iframe.contentWindow?.postMessage(response, '*', transferables);
                } catch (error) {
                    rollbackStreams();
                    try {
                        this.iframe.contentWindow?.postMessage({
                            type: 'RESPONSE',
                            reqId: data.reqId,
                            error: 'Failed to post message to iframe: ' + ((error as any)?.message || String(error || "Unknown error"))
                        }, '*');
                    } catch(_) {}
                    console.error('Failed to post message to iframe:', error);
                }
            }
        };

        this.messageHandlerRef = messageHandler;
        window.addEventListener('message', this.messageHandlerRef);


        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="${this.csp}" id="csp-meta">
      </head>
      <body>
        <style>
            body {
                background-color: transparent;
            }
        </style>
        <script nonce="${this.nonce}">
            document.querySelector('meta#csp-meta')?.remove();
            (async () => {
                ${GUEST_BRIDGE_SCRIPT}
                    
                (async () => {
                    ${userCode}
                })()
            })();
        </script>
      </body>
      </html>
    `;

        this.iframe.srcdoc = html;

        return () => {
            this.terminate();
        };
    }

    public terminate() {
        if (this.messageHandlerRef) {
            window.removeEventListener('message', this.messageHandlerRef);
            this.messageHandlerRef = null;
        }
        if (this.iframe) {
            this.iframe.remove();
        }
        this.closeActiveStreams();
        this.instanceRegistry.clear();
        this.pendingCallbacks.clear();
        this.abortControllers.clear();
        this.callbackWrapperCache.clear();
    }
}

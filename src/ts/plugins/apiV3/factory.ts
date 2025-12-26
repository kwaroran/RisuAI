/**
 * ==========================================
 * PART 1: SHARED TYPE DEFINITIONS
 * ==========================================
 */

type MsgType =
    | 'CALL_ROOT'
    | 'CALL_INSTANCE'
    | 'INVOKE_CALLBACK'
    | 'CALLBACK_RETURN'
    | 'RESPONSE'
    | 'RELEASE_INSTANCE';

interface RpcMessage {
    type: MsgType;
    reqId?: string;
    id?: string;
    method?: string;
    args?: any[];
    result?: any;
    error?: string;
}

interface RemoteRef {
    __type: 'REMOTE_REF';
    id: string;
}

interface CallbackRef {
    __type: 'CALLBACK_REF';
    id: string;
}


const GUEST_BRIDGE_SCRIPT = `
(function() {
    const pendingRequests = new Map(); 
    const callbackRegistry = new Map(); 
    
    function serializeArg(arg) {
        if (typeof arg === 'function') {
            const id = 'cb_' + Math.random().toString(36).substr(2);
            callbackRegistry.set(id, arg);
            return { __type: 'CALLBACK_REF', id: id };
        }
        return arg;
    }
    
    function deserializeResult(val) {
        if (val && typeof val === 'object' && val.__type === 'REMOTE_REF') {
            
            return new Proxy({}, {
                get: (target, prop) => {
                    if (prop === 'then') return undefined; 
                    if (prop === 'release') {
                        return () => send({ type: 'RELEASE_INSTANCE', id: val.id });
                    }
                    return (...args) => sendRequest('CALL_INSTANCE', { 
                        id: val.id, 
                        method: prop, 
                        args: args 
                    });
                }
            });
        }
        return val;
    }

    function send(payload) {
        window.parent.postMessage(payload, '*');
    }

    function sendRequest(type, payload) {
        return new Promise((resolve, reject) => {
            const reqId = Math.random().toString(36).substring(7);
            pendingRequests.set(reqId, { resolve, reject });
            
            
            if (payload.args) {
                payload.args = payload.args.map(serializeArg);
            }

            send({ type: type, reqId: reqId, ...payload });
        });
    }

    
    
    
    window.addEventListener('message', async (event) => {
        const data = event.data;
        if (!data) return;

        
        if (data.type === 'RESPONSE' && data.reqId) {
            const req = pendingRequests.get(data.reqId);
            if (req) {
                if (data.error) req.reject(new Error(data.error));
                else req.resolve(deserializeResult(data.result));
                pendingRequests.delete(data.reqId);
            }
        }

        
        else if (data.type === 'INVOKE_CALLBACK' && data.id) {
            const fn = callbackRegistry.get(data.id);
            const response = { type: 'CALLBACK_RETURN', reqId: data.reqId };
            
            try {
                if (!fn) throw new Error("Callback not found or released");
                const result = await fn(...(data.args || []));
                response.result = result;
            } catch (e) {
                response.error = e.message || "Guest callback error";
            }
            send(response);
        }
    });

    
    
    
    window.risuai = new Proxy({}, {
        get: (target, prop) => {
            return (...args) => sendRequest('CALL_ROOT', { method: prop, args: args });
        }
    });
    window.Risuai = window.risuai;

    window.initOldApiGlobal = () => {
        const keys = risuai._getOldKeys()
        for(const key of keys){
            window[key] = risuai[key];
        }
    }
})();
`;

export class SandboxHost {
    private iframe: HTMLIFrameElement;
    private apiFactory: any;


    private instanceRegistry = new Map<string, any>();


    private pendingCallbacks = new Map<string, { resolve: Function, reject: Function }>();

    constructor(apiFactory: any) {
        this.apiFactory = apiFactory;
    }


    private serialize(val: any): any {
        if (val && (typeof val === 'object' || typeof val === 'function')) {

            if (val === null) return null;
            if (Array.isArray(val)) return val;


            const id = 'ref_' + Math.random().toString(36).substring(2);
            this.instanceRegistry.set(id, val);
            return { __type: 'REMOTE_REF', id } as RemoteRef;
        }
        return val;
    }


    private deserializeArgs(args: any[]) {
        return args.map(arg => {
            if (arg && arg.__type === 'CALLBACK_REF') {
                const cbRef = arg as CallbackRef;

                return async (...innerArgs: any[]) => {
                    return new Promise((resolve, reject) => {
                        const reqId = 'cb_req_' + Math.random().toString(36).substr(2);
                        this.pendingCallbacks.set(reqId, { resolve, reject });

                        this.iframe.contentWindow?.postMessage({
                            type: 'INVOKE_CALLBACK',
                            id: cbRef.id,
                            reqId,
                            args: innerArgs
                        }, '*');
                    });
                };
            }
            return arg;
        });
    }

    public run(container: HTMLElement|HTMLIFrameElement, userCode: string) {
        if(container instanceof HTMLIFrameElement) {
            this.iframe = container;
        } else {
            this.iframe = document.createElement('iframe');
            this.iframe.style.width = "100%";
            this.iframe.style.height = "100%";
            this.iframe.style.border = "none";
            container.appendChild(this.iframe);
        }

        this.iframe.sandbox.add('allow-scripts');
        this.iframe.sandbox.add('allow-modals')
        this.iframe.sandbox.add('allow-downloads')

        const messageHandler = async (event: MessageEvent) => {
            if (event.source !== this.iframe.contentWindow) return;
            const data = event.data as RpcMessage;


            if (data.type === 'CALLBACK_RETURN') {
                const req = this.pendingCallbacks.get(data.reqId!);
                if (req) {
                    if (data.error) req.reject(new Error(data.error));
                    else req.resolve(data.result);
                    this.pendingCallbacks.delete(data.reqId!);
                }
                return;
            }


            if (data.type === 'RELEASE_INSTANCE') {
                this.instanceRegistry.delete(data.id!);
                return;
            }


            if (data.type === 'CALL_ROOT' || data.type === 'CALL_INSTANCE') {
                const response: RpcMessage = { type: 'RESPONSE', reqId: data.reqId };

                try {

                    const args = this.deserializeArgs(data.args || []);
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

                } catch (err: any) {
                    response.error = err.message || "Host execution error";
                }

                this.iframe.contentWindow?.postMessage(response, '*');
            }
        };

        window.addEventListener('message', messageHandler);


        const html = `
      <!DOCTYPE html>
      <html>
      <body>
        <script>
          ${GUEST_BRIDGE_SCRIPT}
          
          (async () => {
             try {
                ${userCode}
             } catch(e) {
                log("Runtime Error: " + e.message);
             }
          })();
        </script>
      </body>
      </html>
    `;

        this.iframe.srcdoc = html;

        return () => {
            window.removeEventListener('message', messageHandler);
            this.iframe.remove();
            this.instanceRegistry.clear();
            this.pendingCallbacks.clear();
        };
    }

    public terminate() {
        if (this.iframe) {
            this.iframe.remove();
        }
        this.instanceRegistry.clear();
        this.pendingCallbacks.clear();
    }
}
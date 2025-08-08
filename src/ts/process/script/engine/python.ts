import type { PythonScriptingEngineState } from ".";

export class PyodideContext {
    worker: Worker;
    apis: Record<string, (...args: any[]) => any> = {};
    inited: boolean = false;
    constructor() {
        this.worker = new Worker(new URL('src/ts/process/pyworker.ts', import.meta.url), {
            type: 'module'
        })
        this.worker.onmessage = (event: MessageEvent) => {
            if (event.data.type === 'call') {
                const { function: func, args, callId } = event.data;
                if (this.apis[func]) {
                    this.apis[func](...args).then((result) => {
                        this.worker.postMessage({
                            type: 'functionResult',
                            callId: callId,
                            result: result
                        });
                    }).catch((error) => {
                        this.worker.postMessage({
                            type: 'error',
                            error: error.message,
                            id: callId
                        });
                    });
                } else {
                    this.worker.postMessage({
                        type: 'error',
                        error: `Function ${func} not found`,
                        id: callId
                    });
                }
            }
        }
    }
    async declareAPI(name: string, func: (...args: any[]) => any) {
        this.apis[name] = func;
    }
    async init(code: string) {
        if (this.inited) {
            return;
        }
        const id = crypto.randomUUID();
        return new Promise<void>((resolve, reject) => {
            this.worker.onmessage = (event: MessageEvent) => {
                if (event.data.id !== id) {
                    return
                }

                if (event.data.type === 'init') {
                    this.inited = true;
                    resolve();
                } else if (event.data.type === 'error') {
                    reject(new Error(event.data.error));
                }
            };
            this.worker.postMessage({
                type: 'init',
                code: code,
                id: id,
                moduleFunctions: Object.keys(this.apis)
            });
        });
    }
    async python(call: string) {
        const id = crypto.randomUUID();
        return new Promise<any>((resolve, reject) => {
            this.worker.onmessage = (event: MessageEvent) => {
                if (event.data.id !== id) {
                    return
                }

                if (event.data.type === 'python') {
                    resolve(event.data.call);
                } else if (event.data.type === 'error') {
                    reject(new Error(event.data.error));
                }
            };
            this.worker.postMessage({
                type: 'python',
                call: call,
                id: id
            });
        });
    }
    async close() {
        this.worker.terminate();
    }
}

export async function runPythonCode(
    ScriptingEngineState: PythonScriptingEngineState,
    mode: string,
    accessKey: string,
    data: any,
    meta: any
) {
    let res: any
    switch (mode) {
        case 'input': {
            res = await ScriptingEngineState.pyodide?.python(`onInput('${accessKey}')`)
            break
        }
        case 'output': {
            res = await ScriptingEngineState.pyodide?.python(`onOutput('${accessKey}')`)
            break
        }
        case 'start': {
            res = await ScriptingEngineState.pyodide?.python(`onStart('${accessKey}')`)
            break
        }
        case 'onButtonClick': {
            res = await ScriptingEngineState.pyodide?.python(`onButtonClick('${accessKey}', '${data}')`)
            break
        }
        case 'editRequest':
        case 'editDisplay':
        case 'editInput':
        case 'editOutput': {
            res = await ScriptingEngineState.pyodide?.python(`callListenMain('${mode}', '${accessKey}', '${JSON.stringify(data)}', '${JSON.stringify(meta)}')`)
            res = JSON.parse(res)
            break
        }
        default: {
            res = await ScriptingEngineState.pyodide?.python(`${mode}('${accessKey}')`)
            break
        }
    }
    return { stopSending: false, res }
}

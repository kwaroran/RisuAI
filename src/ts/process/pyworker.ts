//This is a web worker that runs Python code using Pyodide.

import { loadPyodide, version as pyodideVersion, type PyodideInterface } from "pyodide";

type InitMessage = {
    type: "init";
    id: string;
    moduleFunctions: string[];
    code: string;
}

type FunctionResultMessage = {
    type: "functionResult";
    callId: string;
    result: any;
}

type PythonMessage = {
    type: 'python';
    call: string;
    id: string;
}

type PyWorkerMessage = InitMessage | FunctionResultMessage | PythonMessage;

let py: PyodideInterface;

async function initPyodide() {
    if(py){
        return py;
    }
    py = await loadPyodide({
        indexURL: `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`
    });
    return py;
}

self.onmessage = async (event:MessageEvent<PyWorkerMessage>) => {
    await initPyodide()
    const { type } = event.data;
    switch(type) {
        case 'init':{
            const { id, moduleFunctions, code } = event.data as InitMessage;
            let md: Record<string, any> = {};
            for(const func of moduleFunctions) {
                md[func] = (...args: any[]) => {

                    return new Promise((resolve, reject) => {
                        const callid = crypto.randomUUID();
                        self.postMessage({
                            type: "call",
                            function: func,
                            args,
                            callId: callid
                        });

                        const callee = (e: CustomEvent) => {
                            if(e.detail.callId === callid) {
                                globalThis.removeEventListener("x-function-call", callee);
                                resolve(e.detail.result);
                            }
                        }
                        
                        globalThis.addEventListener("x-function-call", callee);
                    })
                }
            }
            py.unregisterJsModule('js')
            py.registerJsModule('risuai', md)
            py.FS.writeFile('./cd.py', code);
            self.postMessage({
                type: "init",
                id,
                version: pyodideVersion
            });
            break
        }
        case 'functionResult': {
            const { callId, result } = event.data as FunctionResultMessage;
            globalThis.dispatchEvent(new CustomEvent("x-function-call", {
                detail: {
                    callId,
                    result
                }
            }));
            break;
        }
        case 'python': {
            const { call, id } = event.data as PythonMessage;
            try {
                const result = await py.pyimport('cd')?.[call]?.() || null;
                self.postMessage({
                    type: "pythonResult",
                    result,
                    id
                });
            } catch (error) {
                console.error("Error executing Python code:", error);
                self.postMessage({
                    type: "pythonResult",
                    result: error,
                    id
                });
            }
            break;
        }

    }
};
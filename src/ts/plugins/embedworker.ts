let globaly = globalThis

const whitelist = [
    "Array",
    "ArrayBuffer",
    "BigInt",
    "BigInt64Array",
    "BigUint64Array",
    "Boolean",
    "DataView",
    "Date",
    "Error",
    "EvalError",
    "Float32Array",
    "Float64Array",
    "Function",
    "Infinity",
    "Int16Array",
    "Int32Array",
    "Int8Array",
    "JSON",
    "Map",
    "Math",
    "NaN",
    "Number",
    "Object",
    "Promise",
    "Proxy",
    "RangeError",
    "ReferenceError",
    "Reflect",
    "RegExp",
    "Set",
    "SharedArrayBuffer",
    "String",
    "Symbol",
    "SyntaxError",
    "TypeError",
    "URIError",
    "Uint16Array",
    "Uint32Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "WeakMap",
    "WeakSet",
    "console",
    "decodeURI",
    "decodeURIComponent",
    "encodeURI",
    "encodeURIComponent",
    "escape",
    "globalThis",
    "isFinite",
    "isNaN",
    "null",
    "parseFloat",
    "parseInt",
    "undefined",
    "unescape",
    "queueMicrotask",
    "setTimeout",
    "clearTimeout",
    "setInterval",
    "clearInterval",
    "setImmediate",
    "clearImmediate",
    "atob",
    "btoa",
    "Headers",
    "Request",
    "Response",
    "Blob",
    "postMessage",
    "Node",
    "Element",
    "Text",
    "Comment",
]

const evaluation = globaly.eval

const prop = Object.getOwnPropertyNames( globaly ).concat( Object.getOwnPropertyNames( this ))
prop.push(
    //unsafe apis
    'open',
    'close',
    'alert',
    'confirm',
    'prompt',
    'print',
    'fetch',
    'navigator',
    'Worker',
    'WebSocket',
    'XMLHttpRequest',
    'localStorage',
    'sessionStorage',
    'importScripts',
    'indexedDB',
    'crypto',
    'WebAssembly',
    'WebSqlDatabase',
)

prop.forEach( function( prop ) {
    if( (!whitelist.includes(prop)) && (!prop.startsWith('HTML')) ) {
        try {
            Object.defineProperty( globaly, prop, {
                get : function() {
                    throw "Security Exception: cannot access "+prop;
                    return 1;
                }, 
                configurable : false
            });     
        } catch (error) {
        }  
        try {
            Object.defineProperty( this, prop, {
                get : function() {
                    throw "Security Exception: cannot access "+prop;
                    return 1;
                }, 
                configurable : false
            });     
        } catch (error) {
        }  
    }
    else{
    }
});

let workerResults:{
    id: string,
    result: any
}[] = []


self.onmessage = async (event) => {
    const da = event.data
    if(da.type === 'result'){
        workerResults.push(da)
        return
    }
    if(da.type === 'api'){
        //add api
        Object.defineProperty( globaly, da.name, {
            get : function() {
                return function (...args:any[]) {
                    return new Promise((resolve)=>{
                        const functionCallID = `id${Math.random()}`.replace('.','')
                        self.postMessage({
                            type: 'api',
                            name: da.name,
                            id: functionCallID,
                            args
                        })
                        const interval = setInterval(()=>{
                            const result = workerResults.find(r=>r.id === functionCallID)
                            if(result){
                                clearInterval(interval)
                                resolve(result.result)
                            }
                        },10)
                    })
                }
            }
        });
        return
    }
    try{
        const d = await evaluation(da.code)
        self.postMessage({
            id: da.id,
            result: d
        })
    }
    catch(e){
        console.error(e)
        self.postMessage({
            id: da.id,
            result: e
        })
    }
}
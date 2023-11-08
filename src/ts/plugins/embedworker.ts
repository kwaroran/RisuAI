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
    "WebAssembly",
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
    "postMessage"
]

const evaluation = global.eval

Object.getOwnPropertyNames( global ).forEach( function( prop ) {
    if( !whitelist.includes(prop) ) {
        Object.defineProperty( global, prop, {
            get : function() {
                throw "Security Exception: cannot access "+prop;
                return 1;
            }, 
            configurable : false
        });    
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
        Object.defineProperty( global, da.name, {
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
                        },100)
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
(() => {
    interface risuPlugin{
        providers: {name:string, func:(arg:providerArgument) => Promise<{success:boolean,content:string}>}[]
        fetchResponseQueue:{id:string,data:any}[]
    }
    
    let __risuPlugin__:risuPlugin = {
        providers: [],
        fetchResponseQueue: []
    }
    
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    
    interface OpenAIChat{
        role: 'system'|'user'|'assistant'
        content: string
    }
    
    interface providerArgument{
        prompt_chat?: OpenAIChat,
        temperature?: number,
        max_tokens?: number,
        presence_penalty?: number
        frequency_penalty?: number
        bias?: {[key:string]:string}
    }

    async function transferDataAsync(type:string,body:any) {
        const id = `${Date.now()}_${Math.random()}`
        postMessage({
            type: 'fetch',
            body: {id: id, ...body}
        })
        while(true){
            await sleep(50)
            for(let i=0;i<__risuPlugin__.fetchResponseQueue.length;i++){
                const q = __risuPlugin__.fetchResponseQueue[i]
                if(q.id === id){
                    __risuPlugin__.fetchResponseQueue.splice(i, 1)
                    return q.data
                }
            }
        }
    }
    
    async function risuFetch(url:string, arg:{body:any,headers?:{[key:string]:string}}){
        const id = `${Date.now()}_${Math.random()}`
        postMessage({
            type: 'fetch',
            body: {
                id: id,
                url: url,
                arg: arg
            }
        })
        while(true){
            await sleep(50)
            for(let i=0;i<__risuPlugin__.fetchResponseQueue.length;i++){
                const q = __risuPlugin__.fetchResponseQueue[i]
                if(q.id === id){
    
                    __risuPlugin__.fetchResponseQueue.splice(i, 1)
                    return q.data as {
                        ok: boolean;
                        data: any;
                    }
                }
            }
        }
    }
    
    async function getArg(arg:string){
        const id = `${Date.now()}_${Math.random()}`
        postMessage({
            type: 'getArg',
            body: {
                id: id,
                arg: arg
            }
        })
        while(true){
            await sleep(50)
            for(let i=0;i<__risuPlugin__.fetchResponseQueue.length;i++){
                const q = __risuPlugin__.fetchResponseQueue[i]
                if(q.id === id){
                    __risuPlugin__.fetchResponseQueue.splice(i, 1)
                    return q.data as (string|number|null)
                }
            }
        }
    }
    
    function addProvider(name:string, func:(arg:providerArgument) => Promise<{success:boolean,content:string}>){
        postMessage({
            type: 'addProvider',
            body: name
        })
        __risuPlugin__.providers.push({
            name: name,
            func: func
        })
    }
    
    function printLog(data:any){
        postMessage({
            type: 'log',
            body: data
        })
    }


    function getChar(){
        return transferDataAsync('getChar', '')
    }

    function setChar(char:any){
        postMessage({
            type: 'setChar',
            body: char
        })
    }
    
    async function handleOnmessage(data:{type:string,body:any}) {
        if(!data.type){
            return
        }
        switch(data.type){
            case "requestProvider":{
                const body:{key:string,arg:providerArgument} = data.body
                const providers = __risuPlugin__.providers
                let providerfunc:((arg:providerArgument) => Promise<{success:boolean,content:string}>)|null= null
                for(const provider of providers){
                    if(provider.name === body.key){
                        providerfunc = provider.func
                    }
                }
                if(!providerfunc){
                    postMessage({
                        type: 'resProvider',
                        body: {
                            'success': false,
                            'content': 'unknown provider'
                        }
                    })
                }
                else{
                    try {
                        postMessage({
                            type: 'resProvider',
                            body: await providerfunc(body.arg)
                        })   
                    } catch (error) {
                        postMessage({
                            type: 'resProvider',
                            body: {
                                'success': false,
                                'content': `providerError: ${error}`
                            }
                        })
                    }
                }
                break
            }
            case "fetchData":{
                __risuPlugin__.fetchResponseQueue.push(data.body)
                break
            }
        }
    }
    
    onmessage = (ev) => {
        handleOnmessage(ev.data)
        const data:{type:string,body:any} = ev.data
    }

    {
        const __risuPlugin__ = null
        const transferDataAsync = null
        //{{placeholder}}
    }
})()
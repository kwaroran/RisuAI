import { v4 } from "uuid"
import { fetchNative } from "../globalApi.svelte"
import { DBState } from "../stores.svelte";
import { message } from "@tauri-apps/plugin-dialog";

type MCPPrompt = {
    name: string;              // Unique identifier for the prompt
    description?: string;      // Human-readable description
    arguments?:{               // Optional list of arguments
        name: string;          // Argument identifier
        description?: string;  // Argument description
        required?: boolean;    // Whether argument is required
    }[]
    url?:string
}

type RPCRequestResult = {
    jsonrpc: "2.0",
    id: number | string,
    result?: any,
    error?: {
      code: number,
      message: string,
      data?: any
    }
}

let requestId = ''

async function MPCClientRequest(url:string|null, method:string, params?:any):Promise<RPCRequestResult>{

    const body = {
        jsonrpc: "2.0",
        id: requestId,
        method: method,
        params: params
    }

    if(!params){
        delete body.params
    }

    try {

        const response = await fetchNative(url, {
            body: JSON.stringify(body),
            method: "POST"
        })
        const d:RPCRequestResult = await response.json() 
        return d  
    } catch (error) {
        return {
            jsonrpc: "2.0",
            id: requestId,
            error: {
                code: 400,
                message: "None"
            }
        }
    }
}

async function getMCPPromptList(){
    let prompts:MCPPrompt[] = []
    for(let i=0;i<DBState.db.mcpURLs.length;i++){
        const url = DBState.db.mcpURLs[i]
        await MCPHandshake(url)
        const res = await MPCClientRequest(url, 'prompts/list');
        if(res.error){
            console.error(res.error)
        }
        if(res?.result?.prompts){
            const rPrompts:MCPPrompt[] = res?.result?.prompts
            for(let i =0;i<rPrompts.length;i++){
                const part = rPrompts[i]
                part.url = url
                prompts.push(part)
            }
        }
    }

    return prompts

}

async function loadMCPPrompt(mcpPrompt:MCPPrompt){
    await MCPHandshake(mcpPrompt.url)
    const d = await MPCClientRequest(mcpPrompt.url, "prompts/get", {
        name: mcpPrompt.name
    })

    return d
}

async function MCPHandshake(url:string, arg:{
    forceReload?:boolean,
} = {}){

    if(!requestId || arg.forceReload){
        requestId = v4()
    }

    const d = await MPCClientRequest(url, 'initialize', {
        "protocolVersion": "2025-03-26",
        "capabilities": {},
        "clientInfo": {
            name: "RS-MCP-CLIENT",
            version: "1.0.0"
        }
    })
    if(d?.result?.serverInfo){
        const serverInfo:{
            name:string,
            version:string,
            warnings:string[]
        } = d.result.serverInfo

        await fetchNative(url, {
            body: JSON.stringify({
                "jsonrpc": "2.0",
                "method": "notifications/initialized"
            }),
            method: "POST"
        })
        
        if(d?.result?.protocolVersion !== "2025-03-26"){
            serverInfo.warnings.push(`Protocol version is ${d?.result?.protocolVersion}, expected "2025-03-26"`)
        }

        return serverInfo
    }
    else{
        throw "MCP Handshake Failed"
    }
}
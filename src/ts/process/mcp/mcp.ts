import { getDatabase } from "src/ts/storage/database.svelte";
import { MCPClient, type JsonRPC, type MCPTool, type RPCToolCallContent } from "./mcplib";
import { DBState } from "src/ts/stores.svelte";
import { getModuleMcps } from "../modules";
import { alertError, alertInput, alertNormal } from "src/ts/alert";
import { v4 } from "uuid";
import type { MCPClientLike } from "./internalmcp";
import localforage from "localforage";
import { isTauri } from "src/ts/platform"
import { sleep } from "src/ts/util";

export type MCPToolWithURL = MCPTool & {
    mcpURL: string;
};

export const MCPs:Record<string,MCPClient|MCPClientLike> = {};

export async function initializeMCPs(additionalMCPs?:string[]) {
    const db = getDatabase()
    const mcpUrls = getModuleMcps()
    if(additionalMCPs && additionalMCPs.length > 0) {
        for(const mcp of additionalMCPs) {
            if(!mcpUrls.includes(mcp)) {
                mcpUrls.push(mcp);
            }
        }
    }
    for(const mcp of mcpUrls) {
        if(!MCPs[mcp]) {

            let mcpUrl = mcp;

            if(mcp.startsWith('internal:')) {
                switch(mcp) {
                    case 'internal:fs':{
                        const { FileSystemClient } = await import('./filesystemclient');
                        MCPs[mcp] = new FileSystemClient();
                        break;
                    }
                    case 'internal:risuai':{
                        const { RisuAccessClient } = await import('./risuaccess');
                        MCPs[mcp] = new RisuAccessClient();
                        break;
                    }
                    case 'internal:aiaccess':{
                        const { AIAccessClient } = await import('./aiaccess');
                        MCPs[mcp] = new AIAccessClient();
                        break;
                    }
                    case 'internal:googlesearch': {
                        const { GoogleSearchClient } = await import('./googlesearchclient');
                        MCPs[mcp] = new GoogleSearchClient();
                        break;
                    }
                }

                await MCPs[mcp].checkHandshake();
                continue;
            }

            if(mcp.startsWith('stdio:')){
                const MCPJSON = mcp.slice('stdio:'.length);
                try {
                    const MCPData = JSON.parse(MCPJSON);
                    if(MCPData.url) {
                        mcpUrl = MCPData.url;
                    }
                    else if(MCPData.command && MCPData.args) {
                        const command = MCPData.command as string;
                        const args: string[] = Array.isArray(MCPData.args) ? MCPData.args : [MCPData.args];
                        const env: Record<string, string> = MCPData.env || {};

                        if(!isTauri){
                            throw new Error('stdio MCPs are only supported in Local Version');
                        }

                        const { Command } = await import('@tauri-apps/plugin-shell');
                        const listeners = new Set<(message: JsonRPC) => void | Promise<void>>();
                        const cmd = Command.create(command, args, {
                            env: env
                        })
                        let gotPong = false;
                        let pingIds: string[] = [];
                        cmd.stdout.on('data', ((line) => {
                            console.log('MCP JSON:', line);
                            try {
                                const data = JSON.parse(line);
                                if(pingIds.includes(data.id)){
                                    gotPong = true
                                    return
                                }
                                for(const listener of listeners) {
                                    listener(data);
                                }
                            } catch (error) {
                                console.error('Failed to parse MCP JSON:', error);
                            }
                        }))
                        const child = await cmd.spawn();

                        const client = new MCPClient(mcp);
                        client.customTransport = {
                            send: async (data) => {
                                console.log('Sending data to MCP:', data);
                                await child.write(JSON.stringify(data))
                            },
                            addListener: (callback) => {
                                listeners.add(callback);
                            },
                            removeListener: (callback) => {
                                listeners.delete(callback);
                            },
                        }

                        client.onDestroy = () => {
                            child.kill();
                            for(const listener of listeners) {
                                client.customTransport?.removeListener(listener);
                            }
                        }

                        //ping-pong before handshake, ensure MCP is ready
                        for(let i=0;i<10;i++){
                            const pingId = v4();
                            pingIds.push(pingId);
                            console.log('Sending ping to MCP:', pingId);
                            await child.write(JSON.stringify({
                                jsonrpc: "2.0",
                                id: pingId,
                                method: "ping"
                            }))
                            await sleep(1000)
                            if(gotPong){
                                break;
                            }
                        }

                        if(!gotPong){
                            throw new Error('MCP did not respond');
                        }

                        await client.checkHandshake();
                        MCPs[mcp] = client;
                        continue
                    }
                    else {
                        throw new Error('MCP JSON does not contain a valid URL');
                    }
                }                   
                catch (error) {
                    throw new Error(`Failed to parse MCP JSON: ${error}`);
                }
            }

            const registerRefresh:typeof MCPClient.prototype.registerRefreshToken = (arg) => {
                DBState.db.authRefreshes.push({
                    url: mcp,
                    ...arg
                })
            }

            const getRefresh:typeof MCPClient.prototype.getRefreshToken = async () => {
                return DBState.db.authRefreshes.find(refresh => refresh.url === mcp);
            }

            const mcpClient = new MCPClient(mcpUrl);
            mcpClient.registerRefreshToken = registerRefresh;
            mcpClient.getRefreshToken = getRefresh;
            await mcpClient.checkHandshake()
            MCPs[mcp] = mcpClient;
        }
    }

    for(const key of Object.keys(MCPs)) {
        if(!mcpUrls.includes(key)) {
            MCPs[key].destroy()
            delete MCPs[key];
        }
    }
}

export async function getMCPTools(additionalMCPs?:string[]) {
    await initializeMCPs(additionalMCPs);
    const tools:MCPToolWithURL[] = [];
    for(const key of Object.keys(MCPs)) {
        const t = (await MCPs[key].getToolList()).map(tool => {
            return {
                ...tool,
                mcpURL: key
            }
        })

        tools.push(...t);
    }
    return tools;
}

export async function getMCPMeta(additionalMCPs?:string[]) {
    await initializeMCPs(additionalMCPs);
    const meta:Record<string, typeof MCPClient.prototype.serverInfo> = {};
    for(const key of Object.keys(MCPs)) {
        meta[key] = MCPs[key].serverInfo
    }
    return meta;
}

export async function callMCPTool(methodName:string, args:any):Promise<RPCToolCallContent[]> {
    await initializeMCPs();
    for(const key of Object.keys(MCPs)) {
        const tools = await MCPs[key].getToolList();
        const tool = tools.find(t => t.name === methodName);
        if(tool) {
            return await MCPs[key].callTool(methodName, args);
        }
    }
    return  [{
        type: 'text',
        text: `Tool ${methodName} not found on any MCP`
    }]
}

//Currently just a wrapper for getMCPTools, but can be extended later for more than MCPs
export async function getTools(){
    return await getMCPTools();
}

//Currently just a wrapper for callMCPTool, but can be extended later for more than MCPs
export async function callTool(methodName:string, args:any) {
    return await callMCPTool(methodName, args);
}

export async function importMCPModule(){
    const x = await alertInput('Please enter the URL of the MCP module to import:', [
        ['internal:aiaccess', 'LLM Call Client (internal:aiaccess)'],
        ['internal:risuai', 'Risu Access Client (internal:risuai)'],
        ['internal:fs', 'File System Client (internal:fs)'],
        ['internal:googlesearch', 'Google Search Client (internal:googlesearch)'],
        ['https://mcp.paypal.com/sse', 'PayPal MCP (https://mcp.paypal.com/sse)'],
        ['https://mcp.linear.app/sse', 'Linear MCP (https://mcp.linear.app/sse)'],
        ['https://rag-mcp-2.whatsmcp.workers.dev/sse', 'OneContext MCP (https://rag-mcp-2.whatsmcp.workers.dev/sse)'],
        ['https://browser.mcp.cloudflare.com/sse', 'Cloudflare Browser MCP (https://browser.mcp.cloudflare.com/sse)'],
        ['https://mcp.deepwiki.com/mcp', 'DeepWiki MCP (https://mcp.deepwiki.com/mcp)'],
    ])

    if(
        !x.startsWith('http://localhost') &&
        !x.startsWith('http://127') &&
        !x.startsWith('https:') &&
        !x.startsWith('internal:') &&
        !x.startsWith('stdio:')
    ){
        alertError('Invalid URL');
        return;
    }
    try {
        const metas = (await getMCPMeta([x]))
        console.log(metas)
        const meta = metas[x];
        if(!meta) {
            alertError('MCP module not found or invalid URL');
            return;
        }
        const db = getDatabase();
        db.modules.push({
            name: meta.serverInfo.name,
            description: "MCP from " + x,
            mcp: {
                url: x
            },
            id: v4(),
            lorebook: [{
                comment: "MCP Info",
                content: `@@mcp\n\n<MCP Info>Name:${meta.serverInfo.name}\nVersion:${meta.serverInfo.version}\nInst:${meta.instructions ?? 'None'}</MCP Info>`,
                key: '',
                alwaysActive: true,
                secondkey: "",
                insertorder: 0,
                mode: "normal",
                selective: false
            }]
        })
        alertNormal(`MCP module imported successfully!\nName: ${meta.serverInfo.name}`);

    } catch (error) {
        alertError(error)
    }
}

export type toolCallData = {
    call: {
        id: string,
        name: string,
        arg: any
    },
    response: RPCToolCallContent[],
}

const inst = localforage.createInstance({
    name: 'mcp-tool-calls',
    storeName: 'mcp-tool-calls'
});

export async function encodeToolCall(call:toolCallData){
    call.call.id = call.call.id || v4();
    await inst.setItem(call.call.id, call)
    return `<tool_call>${call.call.id}\uf100${call.call.name}</tool_call>\n\n`;
}

export async function decodeToolCall(text:string):Promise<toolCallData|undefined> {
    text = text.trim();
    if(text.startsWith('<tool_call>')){
        text = text.slice('<tool_call>'.length, 0).trim();
    }
    if(text.endsWith('</tool_call>')){
        text = text.slice(0, -'</tool_call>'.length).trim();
    }
    const [callId, callName] = text.split('\uf100');
    if(!callId) {
        return undefined;
    }
    const call = await inst.getItem<toolCallData>(callId);
    if(!call) {
        return undefined;
    }
    return call;
}
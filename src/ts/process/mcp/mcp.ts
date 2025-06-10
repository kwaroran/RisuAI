import { getDatabase } from "src/ts/storage/database.svelte";
import { MCPClient, type MCPTool, type RPCToolCallContent } from "./mcplib";
import { DBState } from "src/ts/stores.svelte";
import { getModuleMcps } from "../modules";
import { alertError, alertInput, alertNormal } from "src/ts/alert";
import { v4 } from "uuid";
import type { MCPClientLike } from "./internalmcp";

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
                }

                await MCPs[mcp].checkHandshake();
                continue;
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

            const mcpClient = new MCPClient(mcp);
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
        ['internal:aiaccess', 'AI Access Client (internal:aiaccess)'],
        ['internal:risuai', 'Risu Access Client (internal:risuai)'],
        ['internal:fs', 'File System Client (internal:fs)'],
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
        !x.startsWith('internal:'))
    {
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
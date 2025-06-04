import { getDatabase } from "src/ts/storage/database.svelte";
import { MCPClient, type MCPTool, type RPCToolCallContent } from "./mcplib";
import { DBState } from "src/ts/stores.svelte";

export type MCPToolWithURL = MCPTool & {
    mcpURL: string;
};

export const MCPs:Record<string,MCPClient> = {};

export async function initializeMCPs() {
    const db = getDatabase()
    for(const mcp of db.mcpURLs) {
        if(!MCPs[mcp]) {
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
        if(!db.mcpURLs.includes(key)) {
            MCPs[key].destroy()
            delete MCPs[key];
        }
    }
}

export async function getMCPTools() {
    await initializeMCPs();
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

export async function getMCPMeta() {
    await initializeMCPs();
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
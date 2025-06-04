import { getDatabase } from "src/ts/storage/database.svelte";
import { MCPClient, type MCPTool } from "./mcplib";
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

export async function callMCPTool(mcpURL:string, methodName:string, args:any) {
    await initializeMCPs();
    if(!MCPs[mcpURL]) {
        throw new Error(`MCP ${mcpURL} not initialized`);
    }
    return await MCPs[mcpURL].callTool(methodName, args);
}

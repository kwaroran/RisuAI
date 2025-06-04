import { getDatabase } from "src/ts/storage/database.svelte";
import { MCPClient, type MCPTool } from "./mcplib";

export const MCPs:Record<string,MCPClient> = {};

export async function initializeMCPs() {
    const db = getDatabase()
    for(const mcp of db.mcpURLs) {
        if(!MCPs[mcp]) {
            const mcpClient = new MCPClient(mcp);
            await mcpClient.checkHandshake()
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
    const tools:MCPTool[] = [];
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

export async function callMCPTool(mcpURL:string, methodName:string, args:any) {
    await initializeMCPs();
    if(!MCPs[mcpURL]) {
        throw new Error(`MCP ${mcpURL} not initialized`);
    }
    return await MCPs[mcpURL].callTool(methodName, args);
}

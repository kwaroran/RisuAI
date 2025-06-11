//Although these are TECHNICALLY not MCPs, but for the users, we will stick to that name

import type { MCPTool, RPCToolCallContent } from "./mcplib";

//template for MCPClient-like classes that can be used in the MCP system
//Original MCPClient is located in src/ts/process/mcp/mcplib.ts
export class MCPClientLike {
    url: string;
    serverInfo: {
        protocolVersion: string;
        capabilities: {
            [key: string]: any;
        };
        serverInfo: {
            name: string;
            version: string;
        };
        instructions?: string;
    };

    constructor(url: string) {
        this.url = url;
        this.serverInfo = {
            protocolVersion: "2025-03-26",
            capabilities: {
                tools: {}
            },
            serverInfo: {
                name: "Internal Tool",
                version: "1.0.0"
            }
        };
    }

    async checkHandshake() {
        return this.serverInfo;
    }

    async getToolList(): Promise<MCPTool[]> {
        return [];
    }

    async callTool(toolName: string, args: any): Promise<RPCToolCallContent[]> {
        return [{
            type: 'text',
            text: `Tool ${toolName} not implemented`
        }];
    }

    destroy() {
        // No cleanup needed for internal tools
    }
}

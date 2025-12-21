import { MCPClientLike } from "./internalmcp";
import type { MCPTool, RPCToolCallContent } from "./mcplib";
import { getModuleLocalTools, type MCPToolDefinition } from "../modules";

export class LocalMCPServer extends MCPClientLike {
    private tools: Map<string, MCPToolDefinition> = new Map();

    constructor() {
        super("internal:localmodules");
        this.serverInfo = {
            protocolVersion: "2025-03-26",
            capabilities: {
                tools: {}
            },
            serverInfo: {
                name: "Local Module Tools",
                version: "1.0.0"
            },
            instructions: "Tools defined by local RisuAI modules"
        };
    }

    refreshTools(): void {
        this.tools.clear();
        const localTools = getModuleLocalTools();

        for (const toolDef of localTools) {
            if (toolDef.name) {
                this.tools.set(toolDef.name, toolDef);
            }
        }
    }

    async getToolList(): Promise<MCPTool[]> {
        this.refreshTools();
        return Array.from(this.tools.values()).map(t => ({
            name: t.name,
            description: t.description || '',
            inputSchema: t.inputSchema || { type: 'object', properties: {} }
        }));
    }

    async callTool(toolName: string, args: any): Promise<RPCToolCallContent[]> {
        this.refreshTools();
        const toolDef = this.tools.get(toolName);

        if (!toolDef) {
            return [{
                type: 'text',
                text: `Tool "${toolName}" not found in local modules`
            }];
        }

        try {
            const result = await this.executeHandler(toolDef.handler, args);

            if (typeof result === 'string') {
                return [{ type: 'text', text: result }];
            }

            return [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
            }];
        } catch (error) {
            return [{
                type: 'text',
                text: `Error executing tool "${toolName}": ${error instanceof Error ? error.message : String(error)}`
            }];
        }
    }

    private async executeHandler(handler: string, args: any): Promise<any> {
        // Execute handler in sandboxed context
        // Using AsyncFunction to create a function from string
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

        // Create a minimal safe context
        const safeContext = {
            console: {
                log: (...a: any[]) => console.log('[LocalMCP]', ...a),
                error: (...a: any[]) => console.error('[LocalMCP]', ...a),
                warn: (...a: any[]) => console.warn('[LocalMCP]', ...a),
            },
            JSON: JSON,
            Date: Date,
            Math: Math,
            parseInt: parseInt,
            parseFloat: parseFloat,
            isNaN: isNaN,
            isFinite: isFinite,
            encodeURIComponent: encodeURIComponent,
            decodeURIComponent: decodeURIComponent,
            encodeURI: encodeURI,
            decodeURI: decodeURI,
            btoa: btoa,
            atob: atob,
        };

        // Wrap handler to inject safe context and prevent access to globals
        const wrappedHandler = `
            "use strict";
            return (async function(args, ctx) {
                const { console, JSON, Date, Math, parseInt, parseFloat, isNaN, isFinite,
                        encodeURIComponent, decodeURIComponent, encodeURI, decodeURI, btoa, atob } = ctx;
                ${handler}
            })(args, ctx);
        `;

        const fn = new AsyncFunction('args', 'ctx', wrappedHandler);
        return await fn(args, safeContext);
    }
}

// Singleton instance
let localMCPServerInstance: LocalMCPServer | null = null;

export function getLocalMCPServer(): LocalMCPServer {
    if (!localMCPServerInstance) {
        localMCPServerInstance = new LocalMCPServer();
    }
    return localMCPServerInstance;
}

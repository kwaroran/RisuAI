

import { requestChatData } from "../request/request";
import { MCPClientLike } from "./internalmcp";
import type { MCPTool, RPCToolCallContent } from "./mcplib";

export class AIAccessClient extends MCPClientLike {
    private directoryHandle: FileSystemDirectoryHandle | null = null;
    private initialized: boolean = false;

    constructor() {
        super("internal:aiaccess");
        this.serverInfo.serverInfo.name = "AI Access Client";
        this.serverInfo.instructions = "Client for accessing AI services and tools.";
    }
    async getToolList(): Promise<MCPTool[]> {
        return [{
            name: 'runLLM',
            description: 'Run a large language model (LLM) with specified parameters.',
            inputSchema: {
                type: 'object',
                properties: {
                    model: {
                        type: 'string',
                        description: 'The type of the LLM to use. "normal" for full model, "lite" for a smaller, faster model.',
                        enum: ['normal','lite']
                    },
                    messages: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                role: {
                                    type: 'string',
                                    enum: ['user', 'assistant', 'system'],
                                    description: 'The role of the message sender.'
                                },
                                content: {
                                    type: 'string',
                                    description: 'The content of the message.'
                                }
                            },
                            required: ['role', 'content']
                        },
                        description: 'Messages to send to the LLM.'
                    }
                },
                required: ['model', 'messages']
            }
        }]
    }

    async callTool(methodName: string, args: any): Promise<RPCToolCallContent[]> {
        if (methodName === 'runLLM') {
            const { model, messages } = args;
            if (!model || !messages || !Array.isArray(messages)) {
                return [{
                    type: 'text',
                    text: 'Invalid arguments for runLLM. Please provide a valid model and messages.'
                }];
            }
            const r = await requestChatData({
                formated: messages.map((msg: any) => ({
                    role: msg.role,
                    content: msg.content
                })),
                bias: {}
            }, model === 'lite' ? 'otherAx' : 'model')

            return [{
                type: 'text',
                text: JSON.stringify({
                    success: r.type === 'success',
                    message: r.result
                })
            }]
        }
        return [{
            type: 'text',
            text: `Method ${methodName} not found.`
        }];
    }

}
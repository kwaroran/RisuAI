import { getCurrentCharacter, type character, type groupChat } from "src/ts/storage/database.svelte";
import { MCPClientLike } from "./internalmcp";
import type { MCPTool, RPCToolCallContent } from "./mcplib";
import { DBState } from "src/ts/stores.svelte";


export class RisuAccessClient extends MCPClientLike {
    constructor(){
        super('internal:risuai');
        this.serverInfo.serverInfo.name = "Risuai Access MCP";
        this.serverInfo.serverInfo.version = "1.0.0";
        this.serverInfo.instructions = "Risuai Access MCP provides access to Risuai's features and tools, which is the software currently running on. Use the available tools to interact with Risuai's functionalities.";
    }

    async getToolList(): Promise<MCPTool[]> {
        return [
            {
                name: "risu-get-character-info",
                description: "Get basic information about a Risuai character",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            description: "The ID or name of the Risuai character. This can be a character name or ID. if its blank string, it will use the current character."
                        },
                        fields: {
                            type: "array",
                            items: {
                                type: "string",
                                enum: ["name", "greeting", "description", "id", "replaceGlobalNote", "alternateGreetings"],
                            },
                            description: "The fields to retrieve from the character."
                        }
                    },
                    required: ["id"],
                }
            },
            {
                name: 'risu-get-character-lorebook',
                description: 'Get the lorebook of a Risuai character',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The ID or name of the Risuai character. This can be a character name or ID. if its blank string, it will use the current character.'
                        },
                        count: {
                            type: 'integer',
                            description: 'The number of lorebook entries to retrieve. maximum and default is 100.',
                            default: 100,
                        },
                        offset: {
                            type: 'integer',
                            description: 'The offset to start retrieving lorebook entries from. This is useful for pagination.',
                        }
                        
                    },
                    required: ['id'],
                }
            },
            {
                name: 'risu-get-chat-history',
                description: 'Get the chat history with user and a Risuai character. ordered by time, newest first.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The ID or name of the Risuai character. This can be a character name or ID. if its blank string, it will use the current character.'
                        },
                        count: {
                            type: 'integer',
                            description: 'The number of chat history entries to retrieve. maximum and default is 20.',
                            default: 20,
                        },
                        offset: {
                            type: 'integer',
                            description: 'The offset to start retrieving chat history entries from. This is useful for pagination.',
                        }
                    },
                    required: ['id'],
                }
            }
        ];
    }

    async callTool(toolName: string, args: any): Promise<RPCToolCallContent[]>{
        try {
            switch (toolName) {
                case 'risu-get-character-info':
                    return await this.getCharacterInfo(args.id, args.fields);
                case 'risu-get-character-lorebook':
                    return await this.getCharacterLorebook(args.id, args.count, args.offset);
                case 'risu-get-chat-history':
                    return await this.getChatHistory(args.id, args.count, args.offset);
            }
        } catch (error) {
            return [{
                type: 'text',
                text: `Error: ${error.message}`
            }];
        }

        return [{
            type: 'text',
            text: `Tool ${toolName} not found.`
        }];
    }


    private getCharacter(id: string): character|groupChat {
        return id ? DBState.db.characters.find(c => (c.chaId === id || c.name === id)) : getCurrentCharacter();
    }

    async getCharacterInfo(id: string, fields: string[]): Promise<RPCToolCallContent[]> {
        const char:character|groupChat = this.getCharacter(id);
        if (!char) {
            return [{
                type: 'text',
                text: `Error: Character with ID ${id} not found.`
            }];
        }
        if(char.type === 'group'){
            return [{
                type: 'text',
                text: `Error: The id pointed to a group chat, not a character.`
            }];
        }

        let response:Record<string, any> = {}

        const fieldRemap = {
            'name': 'name',
            'greeting': 'firstMessage',
            'description': 'desc',
            'id': 'chaId',
            'replaceGlobalNote': 'replaceGlobalNote',
            'alternateGreetings': 'alternateGreetings',
        } as const

        for(const field of fields) {
            if (fieldRemap[field]) {
                const realField = fieldRemap[field];
                response[field] = char[realField];
            } else {
                return [{
                    type: 'text',
                    text: `Error: Field ${field} does not exist on character ${char.chaId} or it isn't allowed to be accessed.`
                }];
            }
        }
    }

    async getCharacterLorebook(id: string, count: number = 100, offset: number = 0): Promise<RPCToolCallContent[]> {
        const char:character|groupChat = this.getCharacter(id);
        if (!char) {
            return [{
                type: 'text',
                text: `Error: Character with ID ${id} not found.`
            }];
        }
        if(char.type === 'group'){
            return [{
                type: 'text',
                text: `Error: The id pointed to a group chat, not a character.`
            }];
        }

        if(count > 100) {
            count = 100;
        }
        if(count < 1) {
            count = 1;
        }
        if(offset < 0) {
            offset = 0;
        }

        const lorebook = char.globalLore.slice(offset, offset + count);
        const organized = lorebook.map((entry) => {
            return {
                content: entry.content,
                keys: entry.alwaysActive ? 'alwaysActive' : entry.key,
                name: entry.comment || 'Unnamed'
            }
        })

        return [{
            type: 'text',
            text: JSON.stringify(organized)
        }]
    }

    async getChatHistory(id: string, count: number = 20, offset: number = 0): Promise<RPCToolCallContent[]> {
        const char:character|groupChat = this.getCharacter(id);
        if (!char) {
            return [{
                type: 'text',
                text: `Error: Character with ID ${id} not found.`
            }];
        }
        if(char.type === 'group'){
            return [{
                type: 'text',
                text: `Error: The id pointed to a group chat, not a character.`
            }];
        }

        if(count > 100) {
            count = 100;
        }
        if(count < 1) {
            count = 1;
        }
        if(offset < 0) {
            offset = 0;
        }

        const history = char.chats[char.chatPage].message.slice(offset, offset + count);
        
        const ordered =  history.map((entry) => ({
            type: 'text',
            text: `${entry.role === 'char' ? char.name : 'User'}: ${entry.data}`
        }));

        return [{
            type: 'text',
            text: JSON.stringify(ordered)
        }]
    }
}
import { getCurrentCharacter, type character, type groupChat, type loreBook } from "src/ts/storage/database.svelte";
import { MCPClientLike } from "./internalmcp";
import type { MCPTool, RPCToolCallContent } from "./mcplib";
import { DBState } from "src/ts/stores.svelte";
import { pickHashRand } from "src/ts/util";
import { alertConfirm } from "src/ts/alert";
import { language } from "src/lang";


export class RisuAccessClient extends MCPClientLike {
    constructor(){
        const additionalServerInfo = `
<About Risuai Features>
Regex Scripts are used to replace text in the chat based on regex patterns. Each script has the following fields:
- 'type': The type of the script. One of:
  - 'editinput': Modifies the user's input text.
  - 'editoutput': Modifies the character's output text.
  - 'editprocess': Modifies the text before sending the HTTP request.
  - 'editdisplay': Modifies the text before displaying it in the chat.
  - 'edittrans': Modifies the text after translation.
- 'in': The regex pattern to match, without the leading and trailing slashes and flags. Should be a valid ECMAScript regex.
- 'out': The replacement text for the matches. It can use $1, $2, or $<name> (for named capture groups) to refer to the captured groups.
    - Note: It can accept markdown and HTML, even <style> tags. One can use regex scripts for decoration with 'editdisplay' type.
    - Note: All class names will be prefixed with 'x-risu-' to avoid conflicts with the platform styles.
- 'flag': The regex flags to use. Should be valid ECMAScript regex flags, like 'g', 'i', 'm', etc. Multiple flags can also be used like 'gi' or 'gm'.
- 'ableFlag': A boolean value indicating whether the flag settings are enabled. If false, the script will use default flags of 'g'.
- 'comment': A name of the script. This is used to identify the script in the list.

Lorebooks are texts containing various information about the character with conditional activation based on chat history. Each entry has the following fields:
- 'key': The key that will activate this lorebook. Multiple keys can be specified separated by commas. If one of the keys is in the chat history, the entry will be included in the next prompt.
- 'content': The content of the entry.
- 'comment': Name of the lorebook. Used for identifying the entry in the list.
- 'alwaysActive': A boolean value indicating whether the entry is always active or not. If true, the entry will be included even if all of its keys are not in the chat history.

Characters are the AI personas that Risuai chats with. Each character has the following fields:
- 'name': The name of the character.
- 'greeting': The greeting message of the character. This is the first message that the character will send when the chat starts.
- 'description': The description of the character. This is used to describe the character in the chat.
- 'replaceGlobalNote': A note that is used to put instructions to AI models (but not you).
- 'alternateGreetings': An array of alternate greetings that the character can use.
- 'backgroundEmbedding': A string that contains the HTML code for the background embedding of the character. This is mostly used for visual purposes like using HTML background and CSS to style.
`
        super('internal:risuai');
        this.serverInfo.serverInfo.name = "Risuai Access MCP";
        this.serverInfo.serverInfo.version = "1.0.0";
        this.serverInfo.instructions = "Risuai Access MCP provides access to Risuai's features and tools, which is the software currently running on. Use the available tools to interact with Risuai's functionalities." + additionalServerInfo;      
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
                                enum: ["name", "greeting", "description", "id", "replaceGlobalNote", "alternateGreetings", "backgroundEmbedding"],
                            },
                            description: "The fields to retrieve from the character."
                        }
                    },
                    required: ["id"],
                }
            },
            {
                name: 'risu-get-character-lorebooks',
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
            },
            {
                name: 'risu-set-character-info',
                description: 'Set basic information about a Risuai character',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The ID or name of the Risuai character. This can be a character name or ID. if its blank string, it will use the current character.'
                        },
                        data: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                greeting: { type: 'string' },
                                description: { type: 'string' },
                                replaceGlobalNote: { type: 'string' },
                                alternateGreetings: { 
                                    type: 'array',
                                    items: { type: 'string' }
                                },
                                backgroundEmbedding: { type: 'string' }
                            },
                            description: 'The character data to update'
                        }
                    },
                    required: ['id', 'data']
                }
            },
            {
                name: 'risu-add-character-lorebook',
                description: 'Add a new lorebook entry to a Risuai character',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The ID or name of the Risuai character. This can be a character name or ID. if its blank string, it will use the current character.'
                        },
                        content: {
                            type: 'string',
                            description: 'The content of the lorebook entry'
                        },
                        keys: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'The keys that trigger this lorebook entry'
                        },
                        name: {
                            type: 'string',
                            description: 'Optional name/comment for the lorebook entry'
                        },
                        alwaysActive: {
                            type: 'boolean',
                            description: 'Whether this lorebook entry is always active',
                            default: false
                        }
                    },
                    required: ['id', 'content', 'keys']
                }
            },
            {
                name: 'risu-set-character-lorebook',
                description: 'Update an existing lorebook entry of a Risuai character',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The ID or name of the Risuai character. This can be a character name or ID. if its blank string, it will use the current character.'
                        },
                        entryName: {
                            type: 'string',
                            description: 'The name/comment of the lorebook entry to update'
                        },
                        content: {
                            type: 'string',
                            description: 'The new content of the lorebook entry'
                        },
                        keys: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'The new keys that trigger this lorebook entry'
                        },
                        name: {
                            type: 'string',
                            description: 'Optional new name/comment for the lorebook entry'
                        },
                        alwaysActive: {
                            type: 'boolean',
                            description: 'Whether this lorebook entry is always active'
                        }
                    },
                    required: ['id', 'entryName']
                }
            },
            {
                name: 'risu-delete-character-lorebook',
                description: 'Delete a lorebook entry from a Risuai character',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The ID or name of the Risuai character. This can be a character name or ID. if its blank string, it will use the current character.'
                        },
                        entryName: {
                            type: 'string',
                            description: 'The name/comment of the lorebook entry to delete'
                        }
                    },
                    required: ['id', 'entryName']
                }
            },
            {
                name: 'risu-get-character-regex-scripts',
                description: 'Get regex scripts from a Risuai character',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The ID or name of the Risuai character. This can be a character name or ID. if its blank string, it will use the current character.'
                        }
                    },
                    required: ['id']
                }
            },
            {
                name: 'risu-set-character-regex-scripts',
                description: 'Update a regex script in a Risuai character',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The ID or name of the Risuai character. This can be a character name or ID. if its blank string, it will use the current character.'
                        },
                        scriptName: {
                            type: 'string',
                            description: 'The comment/name of the regex script to update'
                        },
                        comment: {
                            type: 'string',
                            description: 'New comment for the script'
                        },
                        regIn: {
                            type: 'string',
                            description: 'New input regex pattern'
                        },
                        regOut: {
                            type: 'string',
                            description: 'New output replacement'
                        },
                        type: {
                            type: 'string',
                            description: 'New script type'
                        },
                        flag: {
                            type: 'string',
                            description: 'New regex flags'
                        },
                        ableFlag: {
                            type: 'boolean',
                            description: 'Whether the script is enabled'
                        }
                    },
                    required: ['id', 'scriptName']
                }
            },
            {
                name: 'risu-add-character-regex-scripts',
                description: 'Add a new regex script to a Risuai character',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The ID or name of the Risuai character. This can be a character name or ID. if its blank string, it will use the current character.'
                        },
                        comment: {
                            type: 'string',
                            description: 'Comment for the script'
                        },
                        regIn: {
                            type: 'string',
                            description: 'Input regex pattern'
                        },
                        regOut: {
                            type: 'string',
                            description: 'Output replacement'
                        },
                        type: {
                            type: 'string',
                            description: 'Script type'
                        },
                        flag: {
                            type: 'string',
                            description: 'Regex flags'
                        },
                        ableFlag: {
                            type: 'boolean',
                            description: 'Whether the script is enabled',
                            default: true
                        }
                    },
                    required: ['id', 'comment', 'regIn', 'regOut', 'type']
                }
            },
            {
                name: 'risu-delete-character-regex-scripts',
                description: 'Delete a regex script from a Risuai character',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The ID or name of the Risuai character. This can be a character name or ID. if its blank string, it will use the current character.'
                        },
                        scriptName: {
                            type: 'string',
                            description: 'The comment/name of the regex script to delete'
                        }
                    },
                    required: ['id', 'scriptName']
                }
            },
            {
                name: 'risu-get-character-additional-assets',
                description: 'Get additional assets from a Risuai character',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The ID or name of the Risuai character. This can be a character name or ID. if its blank string, it will use the current character.'
                        }
                    },
                    required: ['id']
                }
            },
            {
                name: 'risu-delete-character-additional-assets',
                description: 'Delete an additional asset from a Risuai character',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The ID or name of the Risuai character. This can be a character name or ID. if its blank string, it will use the current character.'
                        },
                        assetName: {
                            type: 'string',
                            description: 'The name of the asset to delete'
                        }
                    },
                    required: ['id', 'assetName']
                }
            },
            {
                name: 'risu-list-characters',
                description: 'List all Risuai characters',
                inputSchema: {
                    type: 'object',
                    properties: {
                        count: {
                            type: 'integer',
                            description: 'The number of characters to retrieve. maximum and default is 100.',
                            default: 100,
                        },
                        offset: {
                            type: 'integer',
                            description: 'The offset to start retrieving characters from. This is useful for pagination.',
                        }
                    },
                    required: []
                }
            }
        ];
    }

    async callTool(toolName: string, args: any): Promise<RPCToolCallContent[]>{
        try {
            switch (toolName) {
                case 'risu-get-character-info':
                    return await this.getCharacterInfo(args.id, args.fields);
                case 'risu-get-character-lorebooks':
                    return await this.getCharacterLorebooks(args.id, args.count, args.offset);
                case 'risu-get-chat-history':
                    return await this.getChatHistory(args.id, args.count, args.offset);
                case 'risu-set-character-info':
                    return await this.setCharacterInfo(args.id, args.data);
                case 'risu-add-character-lorebook':
                    return await this.addCharacterLorebook(args.id, args.content, args.keys, args.name, args.alwaysActive);
                case 'risu-set-character-lorebook':
                    return await this.setCharacterLorebook(args.id, args.entryName, args.content, args.keys, args.name, args.alwaysActive);
                case 'risu-delete-character-lorebook':
                    return await this.deleteCharacterLorebook(args.id, args.entryName);
                case 'risu-get-character-regex-scripts':
                    return await this.getCharacterRegexScripts(args.id);
                case 'risu-set-character-regex-scripts':
                    return await this.setCharacterRegexScripts(args.id, args.scriptName, args.comment, args.regIn, args.regOut, args.type, args.flag, args.ableFlag);
                case 'risu-add-character-regex-scripts':
                    return await this.addCharacterRegexScripts(args.id, args.comment, args.regIn, args.regOut, args.type, args.flag, args.ableFlag);
                case 'risu-delete-character-regex-scripts':
                    return await this.deleteCharacterRegexScripts(args.id, args.scriptName);
                case 'risu-get-character-additional-assets':
                    return await this.getCharacterAdditionalAssets(args.id);
                case 'risu-delete-character-additional-assets':
                    return await this.deleteCharacterAdditionalAssets(args.id, args.assetName);
                case 'risu-list-characters':
                    return await this.listCharacters(args.count, args.offset);
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
            'backgroundEmbedding': 'backgroundHTML'
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

        return [{
            type: 'text',
            text: JSON.stringify(response)
        }];
    }

    async getCharacterLorebooks(id: string, count: number = 100, offset: number = 0): Promise<RPCToolCallContent[]> {
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
                name: entry.comment || 'Unnamed ' + pickHashRand(5515, entry.content),
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

        // To get "newest first", we must reverse the array.
        const reversedMessages = [...char.chats[char.chatPage].message].reverse();
    
        // Now that the array is sorted from newest to oldest, we can slice it
        const history = reversedMessages.slice(offset, offset + count);
    
        const ordered =  history.map((entry) => ({
            type: 'text',
            text: `${entry.role === 'char' ? char.name : 'User'}: ${entry.data}`
        }));

        return [{
            type: 'text',
            text: JSON.stringify(ordered)
        }]
    }

    async setCharacterInfo(id: string, data: any): Promise<RPCToolCallContent[]> {
        if (!(await this.promptAccess('risu-set-character-info', 'modify character information'))) {
            return [{
                type: 'text',
                text: 'Access denied by user.'
            }];
        }

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

        const fieldRemap = {
            'name': 'name',
            'greeting': 'firstMessage',
            'description': 'desc',
            'replaceGlobalNote': 'replaceGlobalNote',
            'alternateGreetings': 'alternateGreetings',
            'backgroundEmbedding': 'backgroundHTML'
        } as const

        for (const [field, value] of Object.entries(data)) {
            if (fieldRemap[field]) {
                const realField = fieldRemap[field];
                char[realField] = value;
            } else {
                return [{
                    type: 'text',
                    text: `Error: Field ${field} does not exist on character ${char.chaId} or it isn't allowed to be modified.`
                }];
            }
        }

        return [{
            type: 'text',
            text: `Successfully updated character ${char.name || char.chaId}`
        }];
    }

    private promptAccess(tool:string, action:string){
        return alertConfirm(language.mcpAccessPrompt.replace('{{tool}}', tool).replace('{{action}}', action))
    }

    async addCharacterLorebook(id: string, content: string, keys: string[], name?: string, alwaysActive: boolean = false): Promise<RPCToolCallContent[]> {
        if (!(await this.promptAccess('risu-add-character-lorebook', 'add lorebook entry'))) {
            return [{
                type: 'text',
                text: 'Access denied by user.'
            }];
        }

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

        const newEntry:loreBook = {
            key: alwaysActive ? '' : keys.join(','),
            content: content,
            comment: name || '',
            alwaysActive: alwaysActive,
            secondkey: '',
            selective: false,
            insertorder: 100,
            mode: "normal"
        };

        char.globalLore.push(newEntry);

        return [{
            type: 'text',
            text: `Successfully added lorebook entry to character ${char.name || char.chaId}. Entry index: ${char.globalLore.length - 1}`
        }];
    }

    async setCharacterLorebook(id: string, entryName: string, content?: string, keys?: string[], name?: string, alwaysActive?: boolean): Promise<RPCToolCallContent[]> {
        if (!(await this.promptAccess('risu-set-character-lorebook', 'modify lorebook entry'))) {
            return [{
                type: 'text',
                text: 'Access denied by user.'
            }];
        }

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

        const entryIndex = char.globalLore.findIndex(entry => {
            const displayName = entry.comment || 'Unnamed ' + pickHashRand(5515, entry.content);
            return displayName === entryName;
        });
        if (entryIndex === -1) {
            return [{
                type: 'text',
                text: `Error: Lorebook entry with name "${entryName}" not found.`
            }];
        }

        const entry = char.globalLore[entryIndex];

        if (content !== undefined) {
            entry.content = content;
        }
        if (keys !== undefined) {
            entry.key = alwaysActive ? '' : keys.join(',');
        }
        if (name !== undefined) {
            entry.comment = name;
        }
        if (alwaysActive !== undefined) {
            entry.alwaysActive = alwaysActive;
            if (alwaysActive) {
                entry.key = '';
            }
        }

        return [{
            type: 'text',
            text: `Successfully updated lorebook entry "${entryName}" for character ${char.name || char.chaId}`
        }];
    }

    async deleteCharacterLorebook(id: string, entryName: string): Promise<RPCToolCallContent[]> {
        if (!(await this.promptAccess('risu-delete-character-lorebook', 'delete lorebook entry'))) {
            return [{
                type: 'text',
                text: 'Access denied by user.'
            }];
        }

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

        const entryIndex = char.globalLore.findIndex(entry => {
            const displayName = entry.comment || 'Unnamed ' + pickHashRand(5515, entry.content);
            return displayName === entryName;
        });
        if (entryIndex === -1) {
            return [{
                type: 'text',
                text: `Error: Lorebook entry with name "${entryName}" not found.`
            }];
        }

        char.globalLore.splice(entryIndex, 1);

        return [{
            type: 'text',
            text: `Successfully deleted lorebook entry "${entryName}" from character ${char.name || char.chaId}`
        }];
    }

    async getCharacterRegexScripts(id: string): Promise<RPCToolCallContent[]> {
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

        const organized = (char.customscript || []).map((script) => {
            return {
                comment: script.comment || 'Unnamed ' + pickHashRand(5515, script.in + script.out),
                in: script.in,
                out: script.out,
                type: script.type,
                flag: script.flag,
                ableFlag: script.ableFlag
            }
        });

        return [{
            type: 'text',
            text: JSON.stringify(organized)
        }];
    }

    async setCharacterRegexScripts(id: string, scriptName: string, comment?: string, input?: string, output?: string, type?: string, flag?: string, ableFlag?: boolean): Promise<RPCToolCallContent[]> {
        if (!(await this.promptAccess('risu-set-character-regex-scripts', 'modify regex script'))) {
            return [{
                type: 'text',
                text: 'Access denied by user.'
            }];
        }

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

        if (!char.customscript) {
            char.customscript = [];
        }

        const scriptIndex = char.customscript.findIndex(script => {
            const displayName = script.comment || 'Unnamed ' + pickHashRand(5515, script.in + script.out);
            return displayName === scriptName;
        });
        if (scriptIndex === -1) {
            return [{
                type: 'text',
                text: `Error: Regex script with name "${scriptName}" not found.`
            }];
        }

        const script = char.customscript[scriptIndex];

        if (comment !== undefined) script.comment = comment;
        if (input !== undefined) script.in = input;
        if (output !== undefined) script.out = output;
        if (type !== undefined) script.type = type;
        if (flag !== undefined) script.flag = flag;
        if (ableFlag !== undefined) script.ableFlag = ableFlag;

        return [{
            type: 'text',
            text: `Successfully updated regex script "${scriptName}" for character ${char.name || char.chaId}`
        }];
    }

    async addCharacterRegexScripts(id: string, comment: string, input: string, output: string, type: string, flag?: string, ableFlag: boolean = true): Promise<RPCToolCallContent[]> {
        if (!(await this.promptAccess('risu-add-character-regex-scripts', 'add regex script'))) {
            return [{
                type: 'text',
                text: 'Access denied by user.'
            }];
        }

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

        if (!char.customscript) {
            char.customscript = [];
        }

        const newScript = {
            comment: comment,
            in: input,
            out: output,
            type: type,
            flag: flag || '',
            ableFlag: ableFlag
        };

        char.customscript.push(newScript);

        return [{
            type: 'text',
            text: `Successfully added regex script to character ${char.name || char.chaId}. Script index: ${char.customscript.length - 1}`
        }];
    }

    async deleteCharacterRegexScripts(id: string, scriptName: string): Promise<RPCToolCallContent[]> {
        if (!(await this.promptAccess('risu-delete-character-regex-scripts', 'delete regex script'))) {
            return [{
                type: 'text',
                text: 'Access denied by user.'
            }];
        }

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

        if (!char.customscript) {
            char.customscript = [];
        }

        const scriptIndex = char.customscript.findIndex(script => {
            const displayName = script.comment || 'Unnamed ' + pickHashRand(5515, script.in + script.out);
            return displayName === scriptName;
        });
        if (scriptIndex === -1) {
            return [{
                type: 'text',
                text: `Error: Regex script with name "${scriptName}" not found.`
            }];
        }

        char.customscript.splice(scriptIndex, 1);

        return [{
            type: 'text',
            text: `Successfully deleted regex script "${scriptName}" from character ${char.name || char.chaId}`
        }];
    }

    async getCharacterAdditionalAssets(id: string): Promise<RPCToolCallContent[]> {
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

        const assets = (char.additionalAssets || []).map(asset => ({
            name: asset[0] || 'Unnamed ' + pickHashRand(5515, asset[1] + asset[2]),
            path: asset[1], 
            ext: asset[2]
        }));

        return [{
            type: 'text',
            text: JSON.stringify(assets)
        }];
    }

    async deleteCharacterAdditionalAssets(id: string, assetName: string): Promise<RPCToolCallContent[]> {
        if (!(await this.promptAccess('risu-delete-character-additional-assets', 'delete additional asset'))) {
            return [{
                type: 'text',
                text: 'Access denied by user.'
            }];
        }

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

        if (!char.additionalAssets) {
            char.additionalAssets = [];
        }

        const assetIndex = char.additionalAssets.findIndex(asset => {
            const displayName = asset[0] || 'Unnamed ' + pickHashRand(5515, asset[1] + asset[2]);
            return displayName === assetName;
        });
        if (assetIndex === -1) {
            return [{
                type: 'text',
                text: `Error: Additional asset with name "${assetName}" not found.`
            }];
        }

        char.additionalAssets.splice(assetIndex, 1);

        return [{
            type: 'text',
            text: `Successfully deleted additional asset "${assetName}" from character ${char.name || char.chaId}`
        }];
    }

    async listCharacters(count: number = 100, offset: number = 0): Promise<RPCToolCallContent[]> {

        if(count > 100) {
            count = 100;
        }
        if(count < 1) {
            count = 1;
        }
        if(offset < 0) {
            offset = 0;
        }

        const characters = DBState.db.characters.slice(offset, offset + count).map(char => ({
            id: char.chaId,
            name: char.name || 'Unnamed',
            type: char.type,
        }));

        return [{
            type: 'text',
            text: JSON.stringify(characters)
        }];
    }

}

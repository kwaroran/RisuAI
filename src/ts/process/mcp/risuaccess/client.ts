import { MCPClientLike } from '../internalmcp'
import type { MCPTool, MCPToolHandler, RPCToolCallContent } from '../mcplib'
import { CharacterHandler } from './characters'
import { ChatHandler } from './chats'
import { ModuleHandler } from './modules'

export class RisuAccessClient extends MCPClientLike {
  private handlers: MCPToolHandler[]

  constructor() {
    const additionalServerInfo = `
<About Risuai Features>
Characters are the AI personas that Risuai users chat with. Fields:
- 'name': The name of the character.
- 'greeting': The greeting message of the character. This is the first message that the character will send when the chat starts.
- 'description': The description of the character. This is used to describe the character in the chat.
- 'replaceGlobalNote': A note used to provide instructions to AI models (but not you).
- 'alternateGreetings': An array of alternate greetings that the character can use.
- 'backgroundEmbedding': See below.

Modules are independant packages of lorebooks and scripts. Fields:
- 'name': The name of the module.
- 'description': The description.
- 'regex': Array of regex scripts.
- 'trigger': Array of trigger scripts.
- 'backgroundEmbedding': See below.
- 'mcp': Optional MCP server URL.
- 'lowLevelAccess': Must be true to allow LLM or network requests in Lua scripts.
- 'customModuleToggle': User settings configuration. Format: key=label=type=options
  - Types:
    - (omit): Checkbox, '0'|'1'.
    - select: Dropdown. Index of the selected option.
    - text: Text input. User typed text.
    - group, groupEnd: Collapsible group start and end. Keyless.
    - divider. Keyless.
  - Examples:
    - booleanValue=Check Me
    - selectValue=Select Me=select=opt1,opt2,opt3
    - textValue=Type Me=text
    - =Collapsible Group=groupStart
    - =Optional Label=divider
    - ==groupEnd

Regex Scripts are used to replace text in the chat based on regex patterns. Fields:
- 'type': The type of the script. One of:
  - 'editinput': Modifies the user's input text.
  - 'editoutput': Modifies the character's output text.
  - 'editprocess': Modifies the text before sending the HTTP request.
  - 'editdisplay': Modifies the text before displaying it in the chat.
  - 'edittrans': Modifies the text after translation.
- 'in': The regex pattern to match, without the leading and trailing slashes and flags. Should be a valid ECMAScript regex.
- 'out': The replacement text for the matches. It can use $1, $2, or $<name> (for named capture groups) to refer to the captured groups.
  - Note: It can accept Markdown and HTML, even <style> tags which gets deduplicated. One can use regex scripts for decoration with 'editdisplay' type. Same restriction as backgroundEmbedding applies; see below.
- 'flag': The regex flags to use. Should be valid ECMAScript regex flags, like 'g', 'i', 'm', etc. Multiple flags can also be used like 'gi' or 'gm'.
- 'ableFlag': A boolean value indicating whether the flag settings are enabled. If false, the script will use default flags of 'g'.
- 'comment': The name of the script. This is used to identify the script in the list.

Lorebooks are texts containing various information about the character with conditional activation based on chat history. Fields:
- 'key': The key that will activate this lorebook. Multiple keys can be specified separated by commas. If one of the keys is in the chat history, the entry will be included in the next prompt.
- 'content': The content of the entry.
- 'comment': The name of the lorebook. Used for identifying the entry in the list.
- 'alwaysActive': A boolean value indicating whether the entry is always active. If true, the entry will be included even if all of its keys are not in the chat history.

backgroundEmbedding is an HTML string mainly for custom styling. It can include <style> tags with CSS. Note that all selectors will be prefixed with '.chattext ' so they cannot escape the chat boundary - No html, body, :root access.
`
    super('internal:risuai')
    this.serverInfo.serverInfo.name = 'Risuai Access MCP'
    this.serverInfo.serverInfo.version = '1.0.0'
    this.serverInfo.instructions =
      "Risuai Access MCP provides access to Risuai's features and tools, which is the software currently running on. Use the available tools to interact with Risuai's functionalities." +
      additionalServerInfo

    this.handlers = [new CharacterHandler(), new ChatHandler(), new ModuleHandler()]
  }

  async getToolList(): Promise<MCPTool[]> {
    let tools: MCPTool[] = []
    for (const handler of this.handlers) {
      tools = tools.concat(handler.getTools())
    }
    return tools
  }

  async callTool(toolName: string, args: any): Promise<RPCToolCallContent[]> {
    try {
      for (const handler of this.handlers) {
        const result = await handler.handle(toolName, args)
        if (result) {
          return result
        }
      }
    } catch (error) {
      return [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ]
    }

    return [
      {
        type: 'text',
        text: `Tool ${toolName} not found.`,
      },
    ]
  }
}

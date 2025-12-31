import { type MCPTool, MCPToolHandler, type RPCToolCallContent } from '../mcplib'
import { DBState } from 'src/ts/stores.svelte'
import { pickHashRand } from 'src/ts/util'
import { alertConfirm } from 'src/ts/alert'
import { language } from 'src/lang'

export class ModuleHandler extends MCPToolHandler {
  private promptAccess(tool: string, action: string) {
    return alertConfirm(language.mcpAccessPrompt.replace('{{tool}}', tool).replace('{{action}}', action))
  }

  getTools(): MCPTool[] {
    return [
      {
        description: 'List installed Risuai modules (excluding MCP modules).',
        inputSchema: {
          properties: {
            count: {
              default: 100,
              description: 'The maximum number of modules to return.',
              maximum: 100,
              type: 'integer',
            },
            offset: {
              description: 'The number of modules to skip for pagination.',
              type: 'integer',
            },
          },
          required: [],
          type: 'object',
        },
        name: 'risu-list-modules',
      },
      {
        description: 'Get information about a specific Risuai module.',
        inputSchema: {
          properties: {
            fields: {
              description: 'Specific fields to include in the result.',
              items: {
                enum: [
                  'backgroundEmbedding',
                  'customModuleToggle',
                  'description',
                  'enabled',
                  'id',
                  'lowLevelAccess',
                  'name',
                ],
                type: 'string',
              },
              type: 'array',
            },
            id: {
              description: 'The ID of the module.',
              type: 'string',
            },
          },
          required: ['id'],
          type: 'object',
        },
        name: 'risu-get-module-info',
      },
      {
        description: 'Set information about a specific Risuai module.',
        inputSchema: {
          properties: {
            data: {
              description: 'A map of fields to their new values.',
              properties: {
                backgroundEmbedding: { type: 'string' },
                customModuleToggle: { type: 'string' },
                description: { type: 'string' },
                enabled: { type: 'boolean' },
                lowLevelAccess: { type: 'boolean' },
                name: { type: 'string' },
              },
              type: 'object',
            },
            id: {
              description: 'The ID of the module.',
              type: 'string',
            },
          },
          required: ['data', 'id'],
          type: 'object',
        },
        name: 'risu-set-module-info',
      },
      {
        description: 'Get the lorebooks of a Risuai module.',
        inputSchema: {
          properties: {
            count: {
              default: 100,
              description: 'The maximum number of lorebook entries to return.',
              maximum: 100,
              type: 'integer',
            },
            id: {
              description: 'The ID of the Risuai module.',
              type: 'string',
            },
            offset: {
              description: 'The number of entries to skip for pagination.',
              type: 'integer',
            },
          },
          required: ['id'],
          type: 'object',
        },
        name: 'risu-get-module-lorebooks',
      },
      {
        description: 'Update an existing lorebook entry in a Risuai module, or create a new one if it does not exist.',
        inputSchema: {
          properties: {
            alwaysActive: {
              default: false,
              description: 'If true, the entry is always active regardless of keywords.',
              type: 'boolean',
            },
            content: {
              description: 'The text content to be inserted into the context.',
              type: 'string',
            },
            id: {
              description: 'The ID of the Risuai module.',
              type: 'string',
            },
            keys: {
              description: 'An array of keywords that activate this lorebook.',
              items: { type: 'string' },
              type: 'array',
            },
            name: {
              description: 'The unique name of the lorebook to update.',
              type: 'string',
            },
          },
          required: ['content', 'id', 'keys', 'name'],
          type: 'object',
        },
        name: 'risu-set-module-lorebook',
      },
      {
        description: 'Get regex scripts from a Risuai module.',
        inputSchema: {
          properties: {
            id: {
              description: 'The ID of the Risuai module.',
              type: 'string',
            },
          },
          required: ['id'],
          type: 'object',
        },
        name: 'risu-get-module-regex-scripts',
      },
      {
        description: 'Update an existing regex script in a Risuai module, or create a new one if it does not exist.',
        inputSchema: {
          properties: {
            ableFlag: {
              default: false,
              description: 'Set to true to use the custom "flag" string.',
              type: 'boolean',
            },
            flag: {
              description: 'Regex flags (e.g., "g", "i", "m") used when "ableFlag" is true.',
              type: 'string',
            },
            id: {
              description: 'The ID of the Risuai module.',
              type: 'string',
            },
            in: {
              description: 'The regex pattern to match.',
              type: 'string',
            },
            name: {
              description: 'The unique name of the script to update.',
              type: 'string',
            },
            out: {
              description: 'The string to replace matches with.',
              type: 'string',
            },
            type: {
              description: 'The hook where the regex is applied.',
              enum: ['editdisplay', 'editinput', 'editoutput', 'editprocess'],
              type: 'string',
            },
          },
          required: ['id', 'in', 'name', 'out', 'type'],
          type: 'object',
        },
        name: 'risu-set-module-regex-script',
      },
      {
        description: 'Get the Lua script from a Risuai module trigger.',
        inputSchema: {
          properties: {
            id: {
              description: 'The ID of the Risuai module.',
              type: 'string',
            },
          },
          required: ['id'],
          type: 'object',
        },
        name: 'risu-get-module-lua-script',
      },
      {
        description: 'Update the Lua script of a Risuai module.',
        inputSchema: {
          properties: {
            code: {
              description: 'The new Lua code.',
              type: 'string',
            },
            id: {
              description: 'The ID of the Risuai module.',
              type: 'string',
            },
          },
          required: ['code', 'id'],
          type: 'object',
        },
        name: 'risu-set-module-lua-script',
      },
    ]
  }

  async handle(toolName: string, args: any): Promise<RPCToolCallContent[] | null> {
    switch (toolName) {
      case 'risu-list-modules':
        return await this.listModules(args.count, args.offset)
      case 'risu-get-module-info':
        return await this.getModuleInfo(args.id, args.fields)
      case 'risu-set-module-info':
        return await this.setModuleInfo(args.id, args.data)
      case 'risu-get-module-lorebooks':
        return await this.getModuleLorebooks(args.id, args.count, args.offset)
      case 'risu-set-module-lorebook':
        return await this.setModuleLorebook(args.id, args.name, args.content, args.keys, args.alwaysActive)
      case 'risu-get-module-regex-scripts':
        return await this.getModuleRegexScripts(args.id)
      case 'risu-set-module-regex-script':
        return await this.setModuleRegexScript(
          args.id,
          args.name,
          args.in,
          args.out,
          args.type,
          args.flag,
          args.ableFlag
        )
      case 'risu-get-module-lua-script':
        return await this.getModuleLuaScript(args.id)
      case 'risu-set-module-lua-script':
        return await this.setModuleLuaScript(args.id, args.code)
    }
    return null
  }

  async listModules(count: number = 100, offset: number = 0): Promise<RPCToolCallContent[]> {
    if (count > 100) count = 100
    if (count < 1) count = 1
    if (offset < 0) offset = 0

    const modules = DBState.db.modules.filter((m) => !m.mcp)
    const enabledModules = new Set(DBState.db.enabledModules || [])

    const slicedModules = modules.slice(offset, offset + count)

    const result = slicedModules.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      enabled: enabledModules.has(m.id),
    }))

    return [
      {
        type: 'text',
        text: JSON.stringify(result),
      },
    ]
  }

  async getModuleInfo(id: string, fields?: string[]): Promise<RPCToolCallContent[]> {
    const module = DBState.db.modules.find((m) => m.id === id)

    if (!module || module.mcp) {
      return [
        {
          type: 'text',
          text: `Error: Module with ID ${id} not found.`,
        },
      ]
    }

    const enabledModules = new Set(DBState.db.enabledModules || [])
    const defaultFields = ['name', 'description', 'id', 'enabled']
    const targetFields = fields && fields.length > 0 ? fields : defaultFields

    const allowedFields = new Set([
      'name',
      'description',
      'id',
      'enabled',
      'lowLevelAccess',
      'backgroundEmbedding',
      'customModuleToggle',
    ])

    const obj: any = {}
    for (const field of targetFields) {
      if (!allowedFields.has(field)) continue

      if (field === 'enabled') {
        obj.enabled = enabledModules.has(module.id)
      } else {
        const val = module[field]
        if (val !== undefined) {
          obj[field] = val
        }
      }
    }

    return [
      {
        type: 'text',
        text: JSON.stringify(obj),
      },
    ]
  }

  async setModuleInfo(id: string, data: any): Promise<RPCToolCallContent[]> {
    const module = DBState.db.modules.find((m) => m.id === id)
    if (!module || module.mcp) {
      return [
        {
          type: 'text',
          text: `Error: Module with ID ${id} not found.`,
        },
      ]
    }

    if (!(await this.promptAccess('risu-set-module-info', `modify module (${module.name}) information`))) {
      return [
        {
          type: 'text',
          text: 'Access denied by user.',
        },
      ]
    }

    const allowedFields = [
      'name',
      'description',
      'enabled',
      'lowLevelAccess',
      'backgroundEmbedding',
      'customModuleToggle',
    ]

    for (const [key, value] of Object.entries(data)) {
      if (!allowedFields.includes(key)) continue

      if (key === 'enabled') {
        const enabledModules = new Set(DBState.db.enabledModules || [])
        if (value) {
          enabledModules.add(id)
        } else {
          enabledModules.delete(id)
        }
        DBState.db.enabledModules = Array.from(enabledModules)
      } else {
        // @ts-ignore
        module[key] = value
      }
    }

    return [
      {
        type: 'text',
        text: `Successfully updated module ${module.name || id}`,
      },
    ]
  }

  async getModuleLorebooks(id: string, count: number = 100, offset: number = 0): Promise<RPCToolCallContent[]> {
    const module = DBState.db.modules.find((m) => m.id === id)

    if (!module || module.mcp) {
      return [
        {
          type: 'text',
          text: `Error: Module with ID ${id} not found.`,
        },
      ]
    }

    if (count > 100) count = 100
    if (count < 1) count = 1
    if (offset < 0) offset = 0

    const lorebook = (module.lorebook || []).slice(offset, offset + count)
    const organized = lorebook.map((entry) => {
      return {
        content: entry.content,
        keys: entry.alwaysActive ? 'alwaysActive' : entry.key,
        name: entry.comment || 'Unnamed ' + pickHashRand(5515, entry.content),
      }
    })

    return [
      {
        type: 'text',
        text: JSON.stringify(organized),
      },
    ]
  }

  async setModuleLorebook(
    id: string,
    name: string,
    content: string,
    keys: string[],
    alwaysActive: boolean = false
  ): Promise<RPCToolCallContent[]> {
    const module = DBState.db.modules.find((m) => m.id === id)
    if (!module || module.mcp) {
      return [
        {
          type: 'text',
          text: `Error: Module with ID ${id} not found.`,
        },
      ]
    }

    if (!(await this.promptAccess('risu-set-module-lorebook', `add/modify module (${module.name}) lorebook (${name})`))) {
      return [
        {
          type: 'text',
          text: 'Access denied by user.',
        },
      ]
    }

    if (!module.lorebook) {
      module.lorebook = []
    }

    const index = module.lorebook.findIndex((l) => l.comment === name)
    const entryData = {
      key: alwaysActive ? '' : keys.join(','),
      content: content,
      comment: name,
      alwaysActive: alwaysActive,
      secondkey: '',
      selective: false,
      insertorder: 100,
      mode: 'normal' as const,
    }

    if (index >= 0) {
      module.lorebook[index] = { ...module.lorebook[index], ...entryData }
      return [
        {
          type: 'text',
          text: `Successfully updated lorebook entry "${name}" in module ${module.name}`,
        },
      ]
    } else {
      module.lorebook.push(entryData)
      return [
        {
          type: 'text',
          text: `Successfully added lorebook entry "${name}" to module ${module.name}`,
        },
      ]
    }
  }

  async getModuleRegexScripts(id: string): Promise<RPCToolCallContent[]> {
    const module = DBState.db.modules.find((m) => m.id === id)

    if (!module || module.mcp) {
      return [
        {
          type: 'text',
          text: `Error: Module with ID ${id} not found.`,
        },
      ]
    }

    const organized = (module.regex || []).map((script) => {
      return {
        comment: script.comment || 'Unnamed ' + pickHashRand(5515, script.in + script.out),
        in: script.in,
        out: script.out,
        type: script.type,
        flag: script.flag,
        ableFlag: script.ableFlag,
      }
    })

    return [
      {
        type: 'text',
        text: JSON.stringify(organized),
      },
    ]
  }

  async setModuleRegexScript(
    id: string,
    name: string,
    regexIn: string,
    regexOut: string,
    type: string,
    flag?: string,
    ableFlag: boolean = true
  ): Promise<RPCToolCallContent[]> {
    const module = DBState.db.modules.find((m) => m.id === id)
    if (!module || module.mcp) {
      return [
        {
          type: 'text',
          text: `Error: Module with ID ${id} not found.`,
        },
      ]
    }

    if (!(await this.promptAccess('risu-set-module-regex-script', `add/modify module (${module.name}) regex script`))) {
      return [
        {
          type: 'text',
          text: 'Access denied by user.',
        },
      ]
    }

    if (!module.regex) {
      module.regex = []
    }

    const index = module.regex.findIndex((r) => r.comment === name)
    const scriptData = {
      comment: name,
      in: regexIn,
      out: regexOut,
      type: type,
      flag: flag || '',
      ableFlag: ableFlag,
    }

    if (index >= 0) {
      module.regex[index] = { ...module.regex[index], ...scriptData }
      return [
        {
          type: 'text',
          text: `Successfully updated regex script "${name}" in module ${module.name}`,
        },
      ]
    } else {
      module.regex.push(scriptData)
      return [
        {
          type: 'text',
          text: `Successfully added regex script "${name}" to module ${module.name}`,
        },
      ]
    }
  }

  async getModuleLuaScript(id: string): Promise<RPCToolCallContent[]> {
    const module = DBState.db.modules.find((m) => m.id === id)

    if (!module || module.mcp) {
      return [
        {
          type: 'text',
          text: `Error: Module with ID ${id} not found.`,
        },
      ]
    }

    const firstTrigger = module.trigger?.[0]
    if (firstTrigger?.effect?.[0]?.type === 'triggerlua' && firstTrigger.effect[0].code.trim().length > 0) {
      return [
        {
          type: 'text',
          text: firstTrigger.effect[0].code,
        },
      ]
    }

    return [
      {
        type: 'text',
        text: 'Error: This module does not contain a Lua trigger.',
      },
    ]
  }

  async setModuleLuaScript(id: string, code: string): Promise<RPCToolCallContent[]> {
    const module = DBState.db.modules.find((m) => m.id === id)
    if (!module || module.mcp) {
      return [
        {
          type: 'text',
          text: `Error: Module with ID ${id} not found.`,
        },
      ]
    }

    if (!(await this.promptAccess('risu-set-module-lua-script', `modify module (${module.name}) lua script`))) {
      return [
        {
          type: 'text',
          text: 'Access denied by user.',
        },
      ]
    }

    const firstTrigger = module.trigger?.[0]
    if (firstTrigger?.effect?.[0]?.type === 'triggerlua') {
      // @ts-ignore
      firstTrigger.effect[0].code = code
      return [
        {
          type: 'text',
          text: `Successfully updated Lua script for module ${module.name}`,
        },
      ]
    }

    return [
      {
        type: 'text',
        text: 'Error: User must first change the trigger type to Lua manually.',
      },
    ]
  }
}

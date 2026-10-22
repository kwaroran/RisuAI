import type { MultiModal, OpenAIChat } from '../../index.svelte'

export interface ResponseInputItem {
    content: (
        | {
              type: 'input_text'
              text: string
              prompt_cache_breakpoint?: {
                  mode: 'explicit'
              }
          }
        | {
              detail: 'high' | 'low' | 'auto'
              type: 'input_image'
              image_url: string
              prompt_cache_breakpoint?: {
                  mode: 'explicit'
              }
          }
        | {
              type: 'input_file'
              file_data: string
              filename?: string
              prompt_cache_breakpoint?: {
                  mode: 'explicit'
              }
          }
    )[]
    role: 'user' | 'system' | 'developer'
}

export type ResponseOutputContent =
    | {
        type: 'output_text'
        text: string
        annotations: unknown[]
    }
    | {
        type: 'refusal'
        refusal: string
    }

export interface ResponseOutputItem {
    content: ResponseOutputContent[]
    type: 'message'
    status: 'in_progress' | 'completed' | 'incomplete'
    role: 'assistant'
}

export interface ResponseFunctionCallItem {
    type: 'function_call'
    id?: string
    call_id: string
    name: string
    arguments: string
    status?: string
}

export interface ResponseFunctionCallOutputItem {
    type: 'function_call_output'
    call_id: string
    output: string
}

export interface ResponseReasoningItem {
    type: 'reasoning'
    id?: string
    status?: string
    summary?: unknown
    content?: unknown
    text?: string
    summary_text?: string
    reasoning_text?: string
    reasoning?: string
}

export type ResponseItem = ResponseInputItem | ResponseOutputItem | ResponseFunctionCallItem | ResponseFunctionCallOutputItem | ResponseReasoningItem

interface TextContents {
    type: 'text'
    text: string
    prompt_cache_breakpoint?: {
        mode: 'explicit'
    }
}

interface ImageContents {
    type: 'image' | 'image_url'
    image_url: {
        url: string
        detail: string
    }
    prompt_cache_breakpoint?: {
        mode: 'explicit'
    }
}

export type Contents = TextContents | ImageContents

export interface ToolCall {
    function: {
        name: string
        arguments: string
    }
    id: string
    type: 'function'
}

export interface OpenAIChatFull extends OpenAIChat {
    function_call?: {
        name: string
        arguments: string
    }
    tool_calls?: ToolCall[]
}

export interface OpenAIChatExtra {
    role: 'system' | 'user' | 'assistant' | 'function' | 'developer' | 'tool'
    content: string | Contents[]
    memo?: string
    name?: string
    removable?: boolean
    attr?: string[]
    multimodals?: MultiModal[]
    thoughts?: string[]
    prefix?: boolean
    reasoning_content?: string
    cachePoint?: boolean
    function?: {
        name: string
        description?: string
        parameters: any
        strict: boolean
    }
    tool_call_id?: string
    tool_calls?: ToolCall[]
}

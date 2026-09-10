const explicitCacheBreakpoint = {
    mode: 'explicit',
} as const

export function isGPT56Model(model:string):boolean{
    return model === 'gpt-5.6' || model.startsWith('gpt-5.6-')
}

export function addPromptCacheBreakpoint<T extends { type?: string }>(
    content:T[],
    supportedTypes:ReadonlySet<string>
):T[]{
    let breakpointIndex = -1
    for(let index = content.length - 1; index >= 0; index--){
        const type = content[index].type
        if(type && supportedTypes.has(type)){
            breakpointIndex = index
            break
        }
    }
    if(breakpointIndex === -1){
        return content
    }

    return content.map((block, index) => index === breakpointIndex
        ? {
            ...block,
            prompt_cache_breakpoint: explicitCacheBreakpoint,
        }
        : block
    )
}

const chatCacheableContentTypes = new Set([
    'text',
    'image_url',
    'input_audio',
    'file',
    'refusal',
])

export function applyGPT56ChatCachePoints<T extends {
    cachePoint?: boolean
    content?: unknown
}>(messages:T[], model:string):Omit<T, 'cachePoint'>[]{
    return messages.map((message) => {
        const { cachePoint, ...requestMessage } = message
        if(!isGPT56Model(model) || !cachePoint){
            return requestMessage
        }

        if(typeof requestMessage.content === 'string'){
            return {
                ...requestMessage,
                content: [{
                    type: 'text',
                    text: requestMessage.content,
                    prompt_cache_breakpoint: explicitCacheBreakpoint,
                }],
            }
        }
        if(Array.isArray(requestMessage.content)){
            return {
                ...requestMessage,
                content: addPromptCacheBreakpoint(requestMessage.content, chatCacheableContentTypes),
            }
        }
        return requestMessage
    })
}

export const responsesCacheableContentTypes = new Set([
    'input_text',
    'input_image',
    'input_file',
])

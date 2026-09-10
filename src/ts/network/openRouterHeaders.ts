const openRouterHostname = 'openrouter.ai'
const openRouterAttributionApplied = Symbol('openRouterAttributionApplied')
const openRouterTitleHeaders = new Set(['x-title', 'x-openrouter-title'])

type ProcessedOpenRouterHeaders = Record<string, string> & {
    [openRouterAttributionApplied]?: true
}

function toHeaderRecord(currentHeaders: HeadersInit): Record<string, string> {
    if(typeof Headers !== 'undefined' && currentHeaders instanceof Headers){
        return Object.fromEntries(currentHeaders.entries())
    }
    if(Array.isArray(currentHeaders)){
        if(typeof Headers !== 'undefined'){
            return Object.fromEntries(new Headers(currentHeaders).entries())
        }

        const headers: Record<string, string> = {}
        for(const [name, value] of currentHeaders){
            headers[name] = headers[name] ? `${headers[name]}, ${value}` : value
        }
        return headers
    }
    return { ...(currentHeaders as Record<string, string>) }
}

export function isOpenRouterUrl(url: string): boolean {
    try {
        const hostname = new URL(url).hostname.toLowerCase()
        return hostname === openRouterHostname || hostname.endsWith(`.${openRouterHostname}`)
    } catch {
        return false
    }
}

export function applyOpenRouterHeaderOverride(
    headers: Record<string, string>,
    name: string,
    value?: string,
): boolean {
    if(!(headers as ProcessedOpenRouterHeaders)[openRouterAttributionApplied]){
        return false
    }

    const normalizedName = name.toLowerCase()
    const matchingNames = openRouterTitleHeaders.has(normalizedName)
        ? openRouterTitleHeaders
        : new Set([normalizedName])

    for(const existingName of Object.keys(headers)){
        if(matchingNames.has(existingName.toLowerCase())){
            delete headers[existingName]
        }
    }

    if(value !== undefined){
        headers[name] = value
    }
    return true
}

export function withOpenRouterAttributionHeaders(
    url: string,
    currentHeaders?: Record<string, string>,
): Record<string, string>
export function withOpenRouterAttributionHeaders(
    url: string,
    currentHeaders: HeadersInit,
): HeadersInit
export function withOpenRouterAttributionHeaders(
    url: string,
    currentHeaders: HeadersInit = {},
): HeadersInit {
    if(!isOpenRouterUrl(url)){
        return currentHeaders
    }

    if((currentHeaders as ProcessedOpenRouterHeaders)[openRouterAttributionApplied]){
        return currentHeaders
    }

    const headers = toHeaderRecord(currentHeaders) as ProcessedOpenRouterHeaders
    const headerNames = new Set(Object.keys(headers).map((name) => name.toLowerCase()))

    if(!headerNames.has('http-referer')){
        headers['HTTP-Referer'] = 'https://risuai.xyz'
    }
    if(!headerNames.has('x-openrouter-title') && !headerNames.has('x-title')){
        headers['X-OpenRouter-Title'] = 'Risuai'
    }

    Object.defineProperty(headers, openRouterAttributionApplied, { value: true })

    return headers
}

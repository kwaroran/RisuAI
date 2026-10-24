export type EmbeddingRegexType = 'disabled' | 'editembedding'

export interface EmbeddingRegex {
    comment: string
    in: string
    out: string
    type: EmbeddingRegexType
    flag?: string
    ableFlag?: boolean
}

const ALLOWED_FLAGS = /[^gimus]/g

function normalizeFlag(raw: string | undefined, ableFlag: boolean | undefined): string {
    if (!ableFlag) return 'g'
    const cleaned = (raw ?? '').replace(ALLOWED_FLAGS, '')
    const deduped = Array.from(new Set(cleaned)).join('')
    return deduped.length > 0 ? deduped : 'g'
}

export function applyEmbeddingRegex(text: string, scripts: EmbeddingRegex[]): string {
    let result = text
    for (const script of scripts) {
        if (script.type !== 'editembedding') continue
        if (!script.in) continue
        try {
            const reg = new RegExp(script.in, normalizeFlag(script.flag, script.ableFlag))
            result = result.replace(reg, script.out ?? '')
        } catch {
        }
    }
    return result
}

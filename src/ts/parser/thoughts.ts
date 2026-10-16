const OPEN = '<Thoughts>'
const CLOSE = '</Thoughts>'

/**
 * Matches the balanced <Thoughts> block starting at openIdx.
 * Handles nested <Thoughts> tags via depth counting.
 * Falls back to the first closing tag when the block is unbalanced
 * (e.g. a nested opening tag is a plain-text mention), and returns
 * null when no closing tag exists at all (unclosed block).
 */
function matchThoughtBlock(data: string, openIdx: number): { end: number; content: string } | null {
    let depth = 1
    let j = openIdx + OPEN.length
    while (j < data.length) {
        const no = data.indexOf(OPEN, j)
        const nc = data.indexOf(CLOSE, j)
        if (nc === -1) {
            break
        }
        if (no !== -1 && no < nc) {
            depth++
            j = no + OPEN.length
        }
        else {
            depth--
            j = nc + CLOSE.length
            if (depth === 0) {
                return { end: j, content: data.substring(openIdx + OPEN.length, nc) }
            }
        }
    }
    const firstClose = data.indexOf(CLOSE, openIdx + OPEN.length)
    if (firstClose === -1) {
        return null
    }
    return { end: firstClose + CLOSE.length, content: data.substring(openIdx + OPEN.length, firstClose) }
}

/**
 * Replaces every <Thoughts>...</Thoughts> block in `data` via `replacer(content)`.
 * Handles nested tags, multiple sequential blocks, and leaves unclosed blocks as-is.
 * indexOf-based, no regex backtracking. Linear for balanced input; an
 * unbalanced block rescans to the end before falling back.
 *
 * With `opts.stripTrailingNewlines`, the newlines immediately following each
 * closing tag are consumed along with the block (as the old `\n*` in the
 * OpenAI tool-stream regex did), so removed blocks leave no blank lines.
 */
export function replaceThoughtBlocks(data: string, replacer: (content: string) => string, opts: { stripTrailingNewlines?: boolean } = {}): string {
    let out = ''
    let cursor = 0
    while (true) {
        const openIdx = data.indexOf(OPEN, cursor)
        if (openIdx === -1) {
            out += data.substring(cursor)
            break
        }
        const m = matchThoughtBlock(data, openIdx)
        if (m === null) {
            out += data.substring(cursor)
            break
        }
        let end = m.end
        if (opts.stripTrailingNewlines) {
            while (end < data.length && data.charCodeAt(end) === 10) end++
        }
        out += data.substring(cursor, openIdx) + replacer(m.content)
        cursor = end
    }
    return out
}

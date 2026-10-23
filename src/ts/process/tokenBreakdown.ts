import { tokenize } from "../tokenizer"
import type { PromptTokenBreakdown, PromptTokenSource } from "../storage/database.svelte"

// editRequest can add, remove, reorder or rewrite messages. Messages left exactly as they were are matched back
// to their sources by role and content, in order; rewritten or new messages can't be traced, so they count as other.
export function matchSourcesAfterEdit(before:{role:string, content:string}[], sources:{source:PromptTokenSource, content:string}[][], after:{role:string, content:string}[]){
    const sourcesByMessage = new Map<string, {source:PromptTokenSource, content:string}[][]>()
    for(let i=0;i<before.length;i++){
        const key = before[i].role + '\0' + before[i].content
        if(!sourcesByMessage.has(key)){
            sourcesByMessage.set(key, [])
        }
        sourcesByMessage.get(key).push(sources[i])
    }
    return after.map((chat) => {
        return sourcesByMessage.get(chat.role + '\0' + chat.content)?.shift() ?? [{source: 'other' as const, content: chat.content}]
    })
}

// Splits each sent message's token count across the prompt blocks it was built from.
// Messages merged from several blocks are split by each block's own token count, so the total always equals inputTokens.
export async function getPromptTokenBreakdown(sources:{source:PromptTokenSource, content:string}[][], chatTokenCounts:number[]){
    const breakdown:PromptTokenBreakdown = {}
    const add = (source:PromptTokenSource, tokens:number) => {
        if(tokens > 0){
            breakdown[source] = (breakdown[source] ?? 0) + tokens
        }
    }

    for(let i=0;i<chatTokenCounts.length;i++){
        const count = chatTokenCounts[i]
        const parts = sources[i]
        if(count === 0){
            continue
        }
        if(!parts || parts.length === 0){
            add('other', count)
            continue
        }
        if(parts.every((part) => part.source === parts[0].source)){
            add(parts[0].source, count)
            continue
        }

        const partTokens:number[] = []
        for(const part of parts){
            // the sent message is trimmed as a whole, so padding inside a block would skew the split
            partTokens.push(await tokenize(part.content.trim()))
        }
        const partTotal = partTokens.reduce((a, b) => a + b, 0)
        if(partTotal === 0){
            add(parts[0].source, count)
            continue
        }
        let assigned = 0
        let largest = 0
        const shares = partTokens.map((tokens, j) => {
            const share = Math.floor(count * tokens / partTotal)
            assigned += share
            if(tokens > partTokens[largest]){
                largest = j
            }
            return share
        })
        shares[largest] += count - assigned
        for(let j=0;j<parts.length;j++){
            add(parts[j].source, shares[j])
        }
    }

    return breakdown
}

<script lang="ts">
    import { XIcon } from "@lucide/svelte"
    import { getDatabase, type PromptDiffPrefs } from "../../ts/storage/database.svelte"
    import type { PromptItem, PromptItemPlain, PromptItemChatML, PromptItemTyped, PromptItemAuthorNote, PromptItemChat } from "src/ts/process/prompt.ts";

    interface Props {
        firstPresetId: number;
        secondPresetId: number;
        onClose?: () => void;
    }
    let { firstPresetId, secondPresetId, onClose = () => {} }: Props = $props();


// Types
// -----------------------------------------------------------------------------
    type DiffCounts = { modifiedCount: number; addedCount: number; removedCount: number }
    type PromptKind = 'plain' | 'chatml' | 'typed' | 'authorNote' | 'chat'
    type SimpleDiff = 'same' | 'add' | 'remove'

    type PromptCard = {
        kind: PromptKind
        role?: 'system' | 'bot' | 'user' | 'unknown'
        header: string
        name: string
        body: string | null
    }

    type PromptLine = {
        kind: PromptKind
        header: string
        name: string
        id: number
        lineRole: 'name' | 'header' | 'body'
        text: string
    }
    
    type WordToken = { t: SimpleDiff, v: string }

    type CardDiffSummaryPart = 
        | { k: SimpleDiff, card: PromptCard }
        | { k: 'modify'; left: PromptCard; right: PromptCard }

    type CardDiffSummary = {
        parts: CardDiffSummaryPart[]
        counts: DiffCounts
    }

    type CardBodyDiff =
        | { k: 'add' | 'remove'; bodyLines: DiffResult }
        | { k: 'same'; bodyLines: DiffResult }
        | { k: 'modify'; left: PromptCard; right: PromptCard; bodyLines: DiffResult }

    type CardDiffResult = { parts: CardBodyDiff[]; counts: DiffCounts; cardCounts: DiffCounts }
    
    type DiffPart =
        | { k: SimpleDiff; src: 'flattext'; v: string }
        | { k: SimpleDiff; src: 'linebyline'; line: PromptLine }
        | { k: 'modify'; src: 'flattext'; left: string; right: string; tokens: WordToken[] }
        | { k: 'modify'; src: 'linebyline'; left: PromptLine; right: PromptLine; tokens: WordToken[] }

    type DiffResult = { parts: DiffPart[]; counts: DiffCounts }

    type ModifyPart = Extract<DiffPart, { k: 'modify' }>

    type SplitLineRole = 'name' | 'header' | 'body' | null

    type SplitCell =
        | { kind: 'empty'; role: SplitLineRole }
        | { kind: 'part'; side: Side; part: DiffPart; role: SplitLineRole }

    type SplitRow =
        | { kind: 'divider'; seg: Extract<DiffSegment, { kind: 'divider' }>; scope: string, key: string }
        | { kind: 'row'; left: SplitCell; right: SplitCell; key: string }

    type Side = 'left' | 'right'

    type RenderLine =
        | { kind: 'simple'; part: DiffPart }
        | { kind: 'modifyGroup'; parts: ModifyPart[] }

    type DiffSegment =
        | { kind: 'context' | 'changes'; parts: DiffPart[] }
        | { kind: 'divider'; pos: 'start' | 'between' | 'end'; omitted: number; id: string; from: number; to: number }

    type ExpandedRange = { scope: string; from: number; to: number }
    type SegmentOptions = {
        showOnlyChanges: boolean
        contextRadius: number
        scope: string
        expandedRanges: ExpandedRange[]
    }

    type NonModifyPart = Exclude<DiffPart, { k: 'modify' }>
    type TokenClassPack = {add: string; remove: string; same: string}

    type DiffStyle = 'line' | 'intraline'
    type FormatStyle = 'raw' | 'card'
    type ViewStyle = 'unified' | 'split'
    
// UI state
// -----------------------------------------------------------------------------
    const DEFAULT_PROMPT_DIFF_PREFS: PromptDiffPrefs = {
        diffStyle: 'intraline',
        formatStyle: 'raw',
        viewStyle: 'unified',
        isGrouped: false,
        showOnlyChanges: false,
        contextRadius: 3,
    }

    const db = getDatabase()
    const prefs = db.promptDiffPrefs

    let diffStyle = $state<DiffStyle>(prefs?.diffStyle ?? DEFAULT_PROMPT_DIFF_PREFS.diffStyle)
    let formatStyle = $state<FormatStyle>(prefs?.formatStyle ?? DEFAULT_PROMPT_DIFF_PREFS.formatStyle)
    let viewStyle = $state<ViewStyle>(prefs?.viewStyle ?? DEFAULT_PROMPT_DIFF_PREFS.viewStyle)
    let isFlatText = $state(false) // legacy: not persisted on purpose
    let isGrouped = $state(prefs?.isGrouped ?? DEFAULT_PROMPT_DIFF_PREFS.isGrouped)
    let showOnlyChanges = $state(prefs?.showOnlyChanges ?? DEFAULT_PROMPT_DIFF_PREFS.showOnlyChanges)
    let contextRadius = $state(prefs?.contextRadius ?? DEFAULT_PROMPT_DIFF_PREFS.contextRadius)

    let diffResult = $state<DiffResult | null>(null)
    let cardDiffResult = $state<CardDiffResult | null>(null)
    let expandedRanges = $state<ExpandedRange[]>([])

    function savePrefsToDB() {
        const db = getDatabase()
        const normalizedGrouped = !isFlatText && diffStyle === 'line' ? isGrouped : DEFAULT_PROMPT_DIFF_PREFS.isGrouped
        const normalizedFormat = isFlatText ? DEFAULT_PROMPT_DIFF_PREFS.formatStyle : formatStyle
        const normalizedShowOnlyChanges = isFlatText ? DEFAULT_PROMPT_DIFF_PREFS.showOnlyChanges : showOnlyChanges

        db.promptDiffPrefs = {
            ...DEFAULT_PROMPT_DIFF_PREFS,
            diffStyle,
            formatStyle: normalizedFormat,
            viewStyle,
            isGrouped: normalizedGrouped,
            showOnlyChanges: normalizedShowOnlyChanges,
            contextRadius,
        }
    }

    function handleClose() {
        savePrefsToDB()
        onClose()
    }


// Derived values
// -----------------------------------------------------------------------------
    const cardlineFlatResult = $derived.by<DiffResult | null>(() => {
        if (!cardDiffResult) return null

        const parts: DiffPart[] = []

        for (const cardPart of cardDiffResult.parts) {
            parts.push(...cardPart.bodyLines.parts)
        }

        return {
          parts,
          counts: cardDiffResult.counts,
        }
    })

    const currentFlatResult = $derived.by<DiffResult | null>(() => {
        if (!isFlatText && formatStyle === 'raw') return cardlineFlatResult
        if (isFlatText) return diffResult
        return null
    })

    const visibleCardParts = $derived.by<CardBodyDiff[]>(() => {
        if (!cardDiffResult) return []
        if (!showOnlyChanges) return cardDiffResult.parts

        return cardDiffResult.parts.filter((p) => {
            const c = p.bodyLines.counts
            return c.modifiedCount + c.addedCount + c.removedCount > 0
        })
    })

// UI option lists
// -----------------------------------------------------------------------------
     const diffOptions = [
        { value: 'line', label: 'Line' },
        { value: 'intraline', label: 'Intraline' },
    ] as const

    const formatOptions = [
        { value: 'raw', label: 'Raw' },
        { value: 'card', label: 'Card' },
    ] as const

    const viewOptions = [
        { value: 'unified', label: 'Unified' },
        { value: 'split', label: 'Split' },
    ] as const

// Inputs
// -----------------------------------------------------------------------------
    const firstCards  = $derived.by(() => getPromptCards(firstPresetId))
    const secondCards = $derived.by(() => getPromptCards(secondPresetId))

// Effects (state invariants + diff recompute)
// -----------------------------------------------------------------------------
    $effect(() => {
        if (diffStyle !== 'line' && isGrouped) {
            isGrouped = false
        }
    })

    $effect(() => {
        if (!firstCards || !secondCards) return
        diffStyle
        isFlatText
        expandedRanges = []
        void recomputeDiff(firstCards, secondCards)
    })

    $effect(() => {
        showOnlyChanges
        contextRadius
        expandedRanges = []
    })
 
// Style helpers (classnames)
// -----------------------------------------------------------------------------
    const pillBase = 'px-2 py-1 text-xs cursor-pointer select-none'
    const pillActive = 'text-black bg-white'
    const pillInactive = 'text-textcolor2 bg-transparent'
    const diffLineBase = 'whitespace-pre-wrap'
    const diffLineCommon = 'border-l-4 rounded pl-2'

    const diffSameClass = 'text-textcolor'
    const diffAddClass = `${diffLineCommon} bg-green-500/10 border-green-500 text-green-400`
    const diffRemoveClass = `${diffLineCommon} bg-red-500/10 border-red-500 text-red-400`

    const tokenAddClass = 'text-green-400 bg-green-500/15 rounded px-0.5'
    const tokenRemoveClass = 'text-red-400 bg-red-500/15 rounded px-0.5'
    const tokenSameClass = 'text-textcolor'

    const lineRemoveClass = 'pl-2 border-l-4 border-red-500 bg-red-500/10 text-red-400 rounded'
    const lineAddClass    = 'pl-2 border-l-4 border-green-500 bg-green-500/10 text-green-400 rounded'
    const lineModifyClass = 'pl-2 border-l-4 border-blue-500 bg-blue-500/10 rounded'

    const nameHeaderTagClass = 'shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-white/15 text-textcolor2 bg-black/20'

    const splitEmptyLineClass = `${diffLineBase} ${diffLineCommon} ` +
        'border-white/10 text-transparent select-none ' +
        'bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0,rgba(255,255,255,0.06)_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)] ' +
        'bg-[length:20px_20px]'

    const tokenPackLineAdd: TokenClassPack = {
      add: 'bg-green-500/20 rounded px-0.5',
      remove: '',
      same: 'text-green-200/90',
    }

    const tokenPackLineRemove: TokenClassPack = {
      add: '',
      remove: 'bg-red-500/20 rounded px-0.5',
      same: 'text-red-200/90',
    }

    const tokenPackIntraline: TokenClassPack = {
      add: tokenAddClass,
      remove: tokenRemoveClass,
      same: tokenSameClass,
    }

    function lineClassOf(part: NonModifyPart) {
        if (part.k === 'same') return `${diffLineBase} ${diffSameClass}`
        if (part.k === 'add')  return `${diffLineBase} ${diffAddClass}`
        return `${diffLineBase} ${diffRemoveClass}`
    }

    function lineTextOf(part: NonModifyPart) {
        return part.src === 'flattext' ? part.v : part.line.text
    }

    function isLineby(part: DiffPart): part is Extract<DiffPart, { src: 'linebyline' }> {
        return part.src === 'linebyline'
    }

    function isNameLine(part: DiffPart) {
        return part.src === 'linebyline' && part.k !== 'modify' && part.line.lineRole === 'name'
    }

    function isHeaderLine(part: DiffPart) {
        return part.src === 'linebyline' && part.k !== 'modify' && part.line.lineRole === 'header'
    }

    function tagText(part: ModifyPart): string | null {
        if ((part.src === 'linebyline') && (part.right.lineRole === 'name' || part.right.lineRole === 'header')) {
            return part.right.lineRole === 'name' ? 'NAME' : 'TYPE'
        }
        return null
    }

  

// Data shaping (prompt → cards/lines/raw)
// -----------------------------------------------------------------------------
    function getPromptCards(id: number): PromptCard[] {
        const isPromptItemPlain = (item: PromptItem): item is PromptItemPlain =>
            item.type === 'plain' || item.type === 'jailbreak' || item.type === 'cot'
       
        const isPromptItemChatML = (item: PromptItem): item is PromptItemChatML =>
            item.type === 'chatML'
        
        const isPromptItemTyped = (item: PromptItem): item is PromptItemTyped =>
            item.type === 'persona' ||
            item.type === 'description' ||
            item.type === 'lorebook' ||
            item.type === 'postEverything' ||
            item.type === 'memory'
        
        const isPromptItemAuthorNote = (item: PromptItem): item is PromptItemAuthorNote =>
            item.type === 'authornote'
        
        const isPromptItemChat = (item: PromptItem): item is PromptItemChat =>
            item.type === 'chat'
        
        const db = getDatabase()
        const formated = safeStructuredClone(db.botPresets[id].promptTemplate)
        const cards: PromptCard[] = []

        for(let i=0;i<formated.length;i++){
            const item = formated[i]

            switch (true) {
                case isPromptItemPlain(item):{
                    cards.push({
                        kind: 'plain',
                        name: item.name ?? `${item.type.toUpperCase()} Prompt`,
                        role: item.role ?? 'unknown',
                        header: `${item.type}; ${item.type2}`,
                        body: item.text ? item.text : null,
                    })
                    break
                }

                case isPromptItemChatML(item):{
                    cards.push({
                        kind: 'chatml',
                        name: item.name ?? item.type.toUpperCase(),
                        header: `${item.type}`,
                        body: item.text ? item.text : null,
                    })
                    break
                }

                case isPromptItemTyped(item):{
                    cards.push({
                        kind: 'typed',
                        name: item.name ?? item.type.toUpperCase(),
                        header: `${item.type}`,
                        body: item.innerFormat ? item.innerFormat : null,
                    })
                    break
                }

                case isPromptItemAuthorNote(item):{
                    cards.push({
                        kind: 'authorNote',
                        name: item.name ?? item.type.toUpperCase(),
                        header: `${item.type}`,
                        body: item.innerFormat ? item.innerFormat : null,
                    })
                    break
                }

                case isPromptItemChat(item):{
                    cards.push({
                        kind: 'chat',
                        name: item.name ?? item.type.toUpperCase(),
                        header: `${item.type}`,
                        body: `${item.rangeStart} - ${item.rangeEnd}`,
                    })
                    break
                }
            }

        }

        return cards
    }

    function cardsToLines(cards: PromptCard[]): PromptLine[] {
        const out: PromptLine[] = []

        for (const [id, c] of cards.entries()) {
            const meta = {
                kind: c.kind,
                header: c.header,
                name: c.name,
                id,
            }
            out.push({ ...meta, lineRole: 'name', text: c.name })
            out.push({ ...meta, lineRole: 'header', text: c.header })

            if (c.body != null) {
                for (const line of c.body.split('\n')) {
                    out.push({ ...meta, lineRole: 'body', text: line })
                }
            }
        }

        return out
    }

    function renderRaw(cards: PromptCard[]): string {
        const lines: string[] = []
        for (const card of cards) {
            lines.push(`# ${card.name}`)
            lines.push(`## ${card.header}\n`)
            if (card.body) lines.push(...card.body.split('\n'))
            lines.push('')
        }
        while (lines.length && lines[lines.length - 1] === '') lines.pop()
        return lines.join('\n') + '\n'
    }

// Diff core
// -----------------------------------------------------------------------------
    let diffRunId = 0

    async function recomputeDiff(firstCards: PromptCard[], secondCards: PromptCard[]) {
        if (!firstCards || !secondCards) return
        const runId = ++diffRunId

        if (isFlatText) {
            const r = await computeDiffFlat(renderRaw(firstCards), renderRaw(secondCards), diffStyle)
            if (runId !== diffRunId) return
            diffResult = r
            cardDiffResult = null
            return
        }

        const cr = await computeCardViewDiff(firstCards, secondCards, diffStyle)
        if (runId !== diffRunId) return
        cardDiffResult = cr
        diffResult = null
    }

    async function computeCardViewDiff(prompt1: PromptCard[], prompt2: PromptCard[], style: DiffStyle): Promise<CardDiffResult> {
        const summary = await computeDiffCardLine(prompt1, prompt2, style)
        const out: CardBodyDiff[] = []

        let modifiedCount = 0
        let addedCount = 0
        let removedCount = 0

        for (const part of summary.parts) {
            if (part.k === 'same') {
                const lines = cardsToLines([part.card])
                const bodyLines: DiffResult = {
                  parts: lines.map((line) => ({
                    k: 'same' as const,
                    src: 'linebyline',
                    line,
                  })),
                  counts: { modifiedCount: 0, addedCount: 0, removedCount: 0 },
                }
                out.push({ k: 'same', bodyLines })
                continue
            }
            if (part.k === 'add') {
                const cardLines = cardsToLines([part.card])
                const bodyLines = await computeDiffLineByLine(
                  [],
                  cardLines,
                  style
                )
                out.push({ k: 'add', bodyLines })

                modifiedCount += bodyLines.counts.modifiedCount
                addedCount += bodyLines.counts.addedCount
                removedCount += bodyLines.counts.removedCount
                continue
            }
            if (part.k === 'remove') {
                const cardLines = cardsToLines([part.card])
                const bodyLines = await computeDiffLineByLine(
                  cardLines,
                  [],
                  style
                )
                out.push({ k: 'remove', bodyLines })

                modifiedCount += bodyLines.counts.modifiedCount
                addedCount += bodyLines.counts.addedCount
                removedCount += bodyLines.counts.removedCount
                continue
            }
            if (part.k === 'modify') {
                const leftLines = cardsToLines([part.left])
                const rightLines = cardsToLines([part.right])
                const bodyLines = await computeDiffLineByLine(leftLines, rightLines, style)

                out.push({ k: 'modify', left: part.left, right: part.right, bodyLines })

                modifiedCount += bodyLines.counts.modifiedCount
                addedCount += bodyLines.counts.addedCount
                removedCount += bodyLines.counts.removedCount
            }
        }

        return {
            parts: out,
            counts: { modifiedCount, addedCount, removedCount },
            cardCounts: summary.counts,
        }
    }

    async function computeDiffCardLine(prompt1: PromptCard[], prompt2: PromptCard[], style: DiffStyle): Promise<CardDiffSummary> {
        const { diffArrays } = await import('diff')
        const arrayDiffs = diffArrays(prompt1, prompt2, {
            comparator: (x, y) => x.body === y.body && x.header === y.header && x.kind === y.kind && x.name === y.name
        })

        const parts: CardDiffSummaryPart[] = []
        let modifiedCount = 0, addedCount = 0, removedCount = 0

        for (let i = 0; i < arrayDiffs.length; i++) {
            const cardPart = arrayDiffs[i]

            if (cardPart.removed) {
                const nextPart = arrayDiffs[i + 1]

                if (nextPart?.added) {
                    const leftParts = cardPart.value
                    const rightParts = nextPart.value
                    const n = Math.min(leftParts.length, rightParts.length)

                    for (let j = 0; j < n; j++) {
                        const left = leftParts[j]
                        const right = rightParts[j]
                        if (left.header === right.header) {
                            parts.push({ k: 'modify', left, right })
                            modifiedCount++
                        }
                        else {
                            parts.push({ k: 'remove', card: left })
                            parts.push({ k: 'add', card: right })
                            removedCount++
                            addedCount++
                        }
                    }
                    for (let j = n; j < leftParts.length; j++) {
                        parts.push({ k: 'remove', card: leftParts[j]})
                        removedCount++
                    }
                    for (let j = n; j < rightParts.length; j++) {
                        parts.push({ k: 'add', card: rightParts[j]})
                        addedCount++
                    }
                    i++
                    continue
                }

                for (const card of cardPart.value) {
                    parts.push({ k: 'remove', card })
                    removedCount++
                }
                
                continue
            }

            if (cardPart.added) {
                for (const card of cardPart.value) {
                    parts.push({ k: 'add', card })
                    addedCount++
                }
                continue
            }

            for (const card of cardPart.value) {
                parts.push({ k: 'same', card })
            }
        }

        return { parts, counts: { modifiedCount, addedCount, removedCount }}
    }

    async function computeDiffLineByLine(prompt1: PromptLine[], prompt2: PromptLine[], style: DiffStyle): Promise<DiffResult> {
        const { diffArrays } = await import('diff')
        const arrayDiffs = diffArrays(prompt1, prompt2, {
            comparator: (x, y) => x.text === y.text && x.lineRole === y.lineRole
        })

        const parts: DiffPart[] = []
        let modifiedCount = 0, addedCount = 0, removedCount = 0

        for (let i = 0; i < arrayDiffs.length; i++) {
            const linePart = arrayDiffs[i]

            if (linePart.removed) {
                const nextPart = arrayDiffs[i + 1]
                
                if (nextPart?.added) {
                    const leftLines = linePart.value
                    const rightLines = nextPart.value
                    const n = Math.min(leftLines.length, rightLines.length)

                    for (let j = 0; j < n; j++) {
                        const left = leftLines[j]
                        const right = rightLines[j]
                        const tokens = await diffIntralineTokens(left.text, right.text)
                        parts.push({ k: 'modify', src: 'linebyline', left, right, tokens })
                        
                        if (style === 'intraline') {
                            modifiedCount++
                        } else {
                            removedCount++
                            addedCount++       
                        }
                    }
                    for (let j = n; j < leftLines.length; j++) {
                        parts.push({ k: 'remove', src: 'linebyline', line: leftLines[j] })
                        removedCount++
                    }
                    for (let j = n; j < rightLines.length; j++) {
                        parts.push({ k: 'add', src: 'linebyline', line: rightLines[j] })
                        addedCount++
                    }

                    i++
                    continue
                }

                for (const line of linePart.value) {
                    parts.push({ k: 'remove', src: 'linebyline', line })
                    removedCount++
                }
                
                continue
            }

            if (linePart.added) {
                for (const line of linePart.value) {
                    parts.push({ k: 'add', src: 'linebyline', line: line })
                    addedCount++
                }
                continue
            }

            for (const line of linePart.value) {
                parts.push({ k: 'same', src: 'linebyline', line })
            }
        }

        return { parts, counts: { modifiedCount, addedCount, removedCount }}

    }

    async function computeDiffFlat(prompt1: string, prompt2: string, style: DiffStyle): Promise<DiffResult> {
        const { diffLines } = await import('diff')
        const lineDiffs = diffLines(prompt1, prompt2)

        const parts: DiffPart[] = []
        let modifiedCount = 0, addedCount = 0, removedCount = 0

        for (let i = 0; i < lineDiffs.length; i++) {
            const linePart = lineDiffs[i]

            if (linePart.removed) {
                const nextPart = lineDiffs[i + 1]
                
                if (nextPart?.added) {
                    if (style === 'intraline') {
                        const tokens = await diffIntralineTokens(linePart.value, nextPart.value)
                        parts.push({ k: 'modify', src: 'flattext', left: linePart.value, right: nextPart.value, tokens })
                        modifiedCount++
                        i++
                        continue
                    }
                    const tokens = await diffIntralineTokens(linePart.value, nextPart.value)
                    parts.push({ k: 'modify', src: 'flattext', left: linePart.value, right: nextPart.value, tokens })

                    removedCount++
                    addedCount++
                    i++
                    continue
                }

                parts.push({ k: 'remove', src: 'flattext', v: linePart.value })
                removedCount++
                continue
            }

            if (linePart.added) {
                parts.push({ k: 'add', src: 'flattext', v: linePart.value })
                addedCount++
                continue
            }

            parts.push({ k: 'same', src: 'flattext', v: linePart.value })
        }

        return { parts, counts: { modifiedCount, addedCount, removedCount }}
    }

    async function diffIntralineTokens(string1: string, string2: string): Promise<WordToken[]> {
        const { diffWordsWithSpace } = await import('diff')
        const charDiffs = diffWordsWithSpace(string1, string2)

        return charDiffs.map(charPart => {
            if (charPart.added) return { t: 'add', v: charPart.value }
            if (charPart.removed) return { t: 'remove', v: charPart.value }
            return { t: 'same', v: charPart.value }
        })
    }

// View helpers
// -----------------------------------------------------------------------------
    function buildSegments(parts: DiffPart[], opts: SegmentOptions): DiffSegment[] {
        const { showOnlyChanges, contextRadius, scope, expandedRanges } = opts
        const len = parts.length
        if (len === 0) return []

        const segs: DiffSegment[] = []
        let current: DiffSegment | null = null

        const isContext = (part: DiffPart) => part.k === 'same'
        const keep = new Array<boolean>(len).fill(!showOnlyChanges)

        if (showOnlyChanges) {
            for (let i = 0; i < len; i++) {
                if (isContext(parts[i])) continue

                const from = Math.max(0, i - contextRadius)
                const to   = Math.min(len - 1, i + contextRadius)

                for (let j = from; j <= to; j++) {
                    keep[j] = true
                }
            }
            if (!keep.some(Boolean)) return []
        }

        if (showOnlyChanges) {
            for (const r of expandedRanges) {
                if (r.scope !== scope) continue
                const from = Math.max(0, r.from)
                const to   = Math.min(len - 1, r.to)
                for (let j = from; j <= to; j++) keep[j] = true
            }
        }

        const flushCurrent = () => {
            if (current) {
                segs.push(current)
                current = null
            }
        }

        const pushDivider = (pos: 'start' | 'between' | 'end', from: number, to: number) => {
            if (from > to) {
                if (pos === 'start' || pos === 'end') {
                    segs.push({ kind: 'divider', pos, id: `${scope}-${pos}`, from, to, omitted: 0 })
                }
                return
            }
            segs.push({ kind: 'divider', pos, id: `${scope}:${from}-${to}`, from, to, omitted: to - from + 1 })
        }

        let inKeptRun = false
        let lastKeptIndex = -1
        let lastRunEnd = -1 

        for (let i = 0; i < len; i++) {
            if (!keep[i]) {
                if (inKeptRun) {
                    flushCurrent()
                    inKeptRun = false
                    lastRunEnd = i - 1
                }
            continue
            }
            
            lastKeptIndex = i

            const part = parts[i]
            const ctx = isContext(part)
            if (!inKeptRun) {
                if (showOnlyChanges) {
                    if (lastRunEnd >= 0) pushDivider('between', lastRunEnd + 1, i - 1)
                    else pushDivider('start', 0, i - 1)
                }
                inKeptRun = true
            }

            if (!current) {
                current = { kind: ctx ? 'context' : 'changes', parts: [part] }
                continue
            }

            if (ctx && current.kind === 'context') {
                current.parts.push(part)
                continue
            }

            if (!ctx && current.kind === 'changes') {
                current.parts.push(part)
                continue
            }

            flushCurrent()
            current = { kind: ctx ? 'context' : 'changes', parts: [part] }
        }

        flushCurrent()

        if (showOnlyChanges) {
            pushDivider('end', lastKeptIndex + 1, len - 1)
        }

        return segs
    }

    function buildLines(parts: DiffPart[]): RenderLine[] {
        if (!isGrouped) return parts.map((part) => ({ kind: 'simple', part}))

        const lines: RenderLine[] = []
        let buffer: ModifyPart[] = []

        const flushBuffer = () => {
            if (!buffer.length) return
            if (buffer.length === 1) {
                lines.push({ kind: 'simple', part: buffer[0] })
            }
            else {
                lines.push({ kind: 'modifyGroup', parts: buffer })
            }
            buffer = []
        }
        for (const part of parts) {
            if (part.k === 'modify') {
                buffer.push(part)
            }
            else {
                flushBuffer()
                lines.push({ kind: 'simple', part })
            }
        }
        flushBuffer()

        return lines
    }

    function toSplitRows(segments: DiffSegment[], scope: string): SplitRow[] {
        const roleOfPart = (part: DiffPart, side: Side): SplitLineRole => {
            if (part.src !== 'linebyline') return null
            if (part.k === 'modify') return side === 'left' ? part.left.lineRole : part.right.lineRole
            return part.line.lineRole
        }
        const rows: SplitRow[] = []
        let idx = 0

        for (const seg of segments) {
            if (seg.kind === 'divider') {
                rows.push({ kind: 'divider', seg, scope, key: seg.id })
                continue
            }

            for (const part of seg.parts) {
                if (part.k === 'same') {
                    rows.push({
                        kind: 'row',
                        key: `${scope}:r${idx++}`,
                        left: { kind: 'part', side: 'left', part, role: roleOfPart(part, 'left') },
                        right: { kind: 'part', side: 'right', part, role: roleOfPart(part, 'right') },
                    })
                } else if (part.k === 'remove') {
                    rows.push({
                        kind: 'row',
                        key: `${scope}:r${idx++}`,
                        left: { kind: 'part', side: 'left', part, role: roleOfPart(part, 'left') },
                        right: { kind: 'empty', role: roleOfPart(part, 'right') },
                    })
                } else if (part.k === 'add') {
                    rows.push({
                        kind: 'row',
                        key: `${scope}:r${idx++}`,
                        left: { kind: 'empty', role: roleOfPart(part, 'left') },
                        right: { kind: 'part', side: 'right', part, role: roleOfPart(part, 'right') },
                    })
                } else {
                    rows.push({
                        kind: 'row',
                        key: `${scope}:r${idx++}`,
                        left: { kind: 'part', side: 'left', part, role: roleOfPart(part, 'left') },
                        right: { kind: 'part', side: 'right', part, role: roleOfPart(part, 'right') },
                    })
                }
            }
        }

        return rows
    }

    function expandRange(scope: string, from: number, to: number) {
        if (from > to) return
        if (expandedRanges.some(r => r.scope === scope && r.from === from && r.to === to)) return
        expandedRanges = [...expandedRanges, { scope, from, to }]
    }

</script>

{#snippet pillRadioGroup(label: string, name: string, options: readonly { value: string; label: string }[], value: string, setValue: (v: string) => void, disabled = false)}
  <div class="flex items-center gap-2">
    <span class="text-xs text-textcolor2">{label}</span>
    <div class="flex rounded-md border border-darkborderc overflow-hidden">
      {#each options as opt (opt.value)}
        <label
          class={`${pillBase} ${value === opt.value ? pillActive : pillInactive} ${
                  disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
          }`}
        >
          <input
            class="hidden"
            type="radio"
            {name}
            value={opt.value}
            {disabled}
            checked={value === opt.value}
            onchange={() => {
                if (disabled) return
                setValue(opt.value)}
            }
          />
          {opt.label}
        </label>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet checkboxToggle(label: string, checked: boolean, setChecked: (v: boolean) => void, disabled = false, dimWhenDisabled = false)}
  <div class="flex items-center gap-2">
    <label
      class={`flex items-center gap-1 text-xs cursor-pointer select-none ${
        disabled && dimWhenDisabled ? 'text-textcolor2/50' : 'text-textcolor2'
      }`}
    >
      <input
        type="checkbox"
        class="accent-green-500"
        {disabled}
        checked={checked}
        onchange={(e) => setChecked((e.currentTarget as HTMLInputElement).checked)}
      />
      {label}
    </label>
  </div>
{/snippet}

{#snippet rangeControl(label: string, value: number, setValue: (v: number) => void, min = 0, max = 5, disabled = false)}
  <div class="flex items-center gap-2">
    <span class={`text-xs ${disabled ? 'text-textcolor2/50' : 'text-textcolor2'}`}>
      {label}
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step="1"
      value={value}
      class="w-24 accent-green-500 disabled:opacity-40"
      {disabled}
      oninput={(e) => {
        if (disabled) return
        const target = e.currentTarget as HTMLInputElement
        setValue(parseInt(target.value, 10))
      }}
    />
    <span
      class={`text-[11px] w-4 text-right ${
        disabled ? 'text-textcolor2/40' : 'text-textcolor2/80'
      }`}
    >
      {value}
    </span>
  </div>
{/snippet}

{#snippet renderCounts(counts: DiffCounts)}
  <div class="flex flex-wrap gap-3 text-xs text-textcolor2 mb-3">
    <span class="inline-flex items-center gap-2">
      <span class="inline-block w-1 h-4 rounded bg-blue-500"></span>
      {counts.modifiedCount}
    </span>
    <span class="inline-flex items-center gap-2">
      <span class="inline-block w-1 h-4 rounded bg-green-500"></span>
      {counts.addedCount}
    </span>
    <span class="inline-flex items-center gap-2">
      <span class="inline-block w-1 h-4 rounded bg-red-500"></span>
      {counts.removedCount}
    </span>
  </div>
{/snippet}

{#snippet renderSimpleLine(part: NonModifyPart)}
  <div
    class={lineClassOf(part)}
    class:mt-5={isNameLine(part)}
    class:mb-5={isHeaderLine(part)}
  >
    {#if isLineby(part) && part.line.lineRole === 'body' && part.line.text === ''}
      <br />
    {:else}
      {lineTextOf(part)}{#if isLineby(part) && (part.line.lineRole === 'name' || part.line.lineRole === 'header')}
        <span class={nameHeaderTagClass}>
          {part.line.lineRole === 'name' ? 'NAME' : 'TYPE'}
        </span>
      {/if}
    {/if}
  </div>
{/snippet}

{#snippet renderTokens(tokens: WordToken[], skip: SimpleDiff | null, pack: TokenClassPack)}
  {#each tokens as tok, j (j)}
    {#if skip === null || tok.t !== skip}
      <span class={tok.t === 'add' ? pack.add : tok.t === 'remove' ? pack.remove : pack.same}>
        {tok.v}
      </span>
    {/if}
  {/each}
{/snippet}

{#snippet renderModify(part: ModifyPart, idx: number)}
  {@const tag = tagText(part)}
  {#if diffStyle === 'line'}
    <!-- line diff -->
    <div
      class={`whitespace-pre-wrap ${lineRemoveClass}`}
      class:mt-5={isLineby(part) && part.right.lineRole === 'name' && idx > 0}
    >
      {@render renderTokens(part.tokens, 'add', tokenPackLineRemove)}{#if tag}<span class={nameHeaderTagClass}>{tag}</span>{/if}
    </div>

    <div
      class={`whitespace-pre-wrap ${lineAddClass}`}
      class:mb-5={isLineby(part) && part.right.lineRole === 'header'}
    >
      {#if part.src === 'linebyline' && part.right.text === ''}
        <span class="text-textcolor2/60 italic">[empty line]</span>
      {:else}
        {@render renderTokens(part.tokens, 'remove', tokenPackLineAdd)}{#if tag}<span class={nameHeaderTagClass}>{tag}</span>{/if}
      {/if}
    </div>

  {:else} <!-- intraline diff -->
    <div
      class={`whitespace-pre-wrap ${lineModifyClass}`}
      class:mt-5={isLineby(part) && part.right.lineRole === 'name' && idx > 0}
      class:mb-5={isLineby(part) && part.right.lineRole === 'header'}
    >
      {@render renderTokens(part.tokens, null, tokenPackIntraline)}{#if tag}<span class={nameHeaderTagClass}>{tag}</span>{/if}
    </div>
  {/if}
{/snippet}

{#snippet renderModifyGroup(parts: ModifyPart[])}
  {#if diffStyle === 'line'}
    <!-- grouped + line diff -->
    <div class={`whitespace-pre-wrap ${lineRemoveClass}`}>
    {#each parts as part, i (i)}
      {@render renderTokens(part.tokens, 'add', tokenPackLineRemove)}{#if tagText(part)}<span class={nameHeaderTagClass}>{tagText(part)}</span>{/if}

      {#if i < parts.length - 1}
        {'\n'}
      {/if}
    {/each}
    </div>

    <div class={`whitespace-pre-wrap ${lineAddClass}`}>
    {#each parts as part, i (i)}
      {#if part.src === 'linebyline' && part.right.text === ''}
        <span class="text-textcolor2/60 italic">[empty line]</span>
      {:else}
        {@render renderTokens(part.tokens, 'remove', tokenPackLineAdd)}{#if tagText(part)}<span class={nameHeaderTagClass}>{tagText(part)}</span>{/if}
      {/if}

      {#if i < parts.length - 1}
        {'\n'}
      {/if}
    {/each}
    </div>
  {/if}
{/snippet}

{#snippet renderCardMeta(part: DiffPart, type: string, side: Side | null)}
  <div class="flex flex-col gap-1">
    <span class="text-[10px] uppercase tracking-wide text-textcolor2">{type}</span>

    {#if part && part.src === 'linebyline'}
      {#if part.k === 'modify'}
        {#if diffStyle === 'line'}
          <!-- line diff -->
          {#if side === null}
            <!-- unified -->
            <div class="whitespace-pre-wrap text-red-400">
              {@render renderTokens(part.tokens, 'add', tokenPackLineRemove)}
            </div>
            <div class="whitespace-pre-wrap text-green-400">
              {@render renderTokens(part.tokens, 'remove', tokenPackLineAdd)}
            </div>
          {:else} <!-- split -->
            <div class={`whitespace-pre-wrap ${side === 'left' ? 'text-red-400' : 'text-green-400'}`}>
              {@render renderTokens(
                part.tokens,
                side === 'left' ? 'add' : 'remove',
                side === 'left' ? tokenPackLineRemove : tokenPackLineAdd
              )}
            </div>
          {/if}

        {:else}
          <!-- intraline diff -->
          {#if side === null}
            <!-- unified intraline -->
            <div class="whitespace-pre-wrap">
              {@render renderTokens(part.tokens, null, tokenPackIntraline)}
            </div>
          {:else}
            <!-- split intraline: -->
            <div class={`whitespace-pre-wrap ${side === 'left' ? 'text-red-300' : 'text-green-300'}`}>
              {@render renderTokens(
                part.tokens,
                side === 'left' ? 'add' : 'remove',
                tokenPackIntraline
              )}
            </div>
          {/if}
        {/if}

      {:else}
        <!-- same/add/remove -->
        <div
          class={`whitespace-pre-wrap ${
            part.k === 'same'
              ? 'text-textcolor'
              : part.k === 'add'
              ? 'text-green-400'
              : 'text-red-400'
          }`}
        >
          {part.line.text}
        </div>
      {/if}
    {:else}
      <div class="text-xs text-textcolor2 italic">No {type}</div>
    {/if}
  </div>
{/snippet}

{#snippet renderDivider(d: Extract<DiffSegment, { kind: 'divider' }>, scope: string)}
  <div class="my-3 flex items-center gap-3 text-xs text-textcolor2/70">
    <div class="h-px flex-1 bg-white/10"></div>
    <button
      type="button"
      class={`px-2 py-0.5 rounded border border-darkborderc bg-darkbg shadow-md
        ${d.omitted > 0 ? 'hover:border-white/40 hover:text-textcolor hover:shadow-lg cursor-pointer' : 'text-textcolor2/50 cursor-default'}`}
      disabled={d.omitted === 0}
      onclick={() => expandRange(scope, d.from, d.to)}
      title={d.omitted > 0 ? 'Click to expand hidden lines' : ''}
    >
      {#if d.pos === 'start'}
        {#if d.omitted > 0}
          … {d.omitted} lines above not shown (click to expand) …
        {:else}
          BOF
        {/if}

      {:else if d.pos === 'between'}
        … {d.omitted} lines skipped (click to expand) …

      {:else} <!-- end -->
        {#if d.omitted > 0}
          … {d.omitted} lines below not shown (click to expand) …
        {:else}
          EOF
        {/if}
      {/if}
    </button>

    <div class="h-px flex-1 bg-white/10"></div>
  </div>
{/snippet}

{#snippet renderSplitCell(cell: SplitCell, idx: number)}
  {@const role = cell.role}
    {#if cell.kind === 'empty'}
      <div
        class={splitEmptyLineClass}
        class:mt-5={role === 'name' && idx > 0}
        class:mb-5={role === 'header'}
      >
        &nbsp;
      </div>

  {:else}
    {@const part = cell.part}
    {@const side = cell.side}
    {@const isLeft = side === 'left'}

    {#if part.k !== 'modify'}
      {@render renderSimpleLine(part)}

    {:else}
      {@const tag = tagText(part)}
      {@const sideText =
        isLineby(part) ? (isLeft ? part.left.text : part.right.text) : null}

      <div
        class={`whitespace-pre-wrap ${isLeft ? lineRemoveClass : lineAddClass}`}
        class:mt-5={role === 'name' && idx > 0}
        class:mb-5={role === 'header'}
      >
        {#if isLineby(part) && sideText === ''}
          <span class="text-textcolor2/60 italic">[empty line]</span>
        {:else}
          {@render renderTokens(part.tokens, isLeft ? 'add' : 'remove', diffStyle === 'line' ? (isLeft ? tokenPackLineRemove : tokenPackLineAdd) : tokenPackIntraline)}
        {/if}

        {#if tag}
          <span class={nameHeaderTagClass}>{tag}</span>
        {/if}
      </div>
    {/if}
  {/if}
{/snippet}

{#snippet renderCardStatus(cardPart: CardBodyDiff)}
  {@const c = cardPart.bodyLines?.counts ?? ({ modifiedCount: 0, addedCount: 0, removedCount: 0 })}
  {@const cardChangeCount = (c.modifiedCount ?? 0) + (c.addedCount ?? 0) + (c.removedCount ?? 0)}

  {@const statusLabel =
    cardPart.k === 'modify' ? 'Modified'
    : cardPart.k === 'add'  ? 'Added'
    : cardPart.k === 'remove' ? 'Removed'
    : 'Unchanged'}

  {@const statusClass =
    cardPart.k === 'modify' ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
    : cardPart.k === 'add'  ? 'bg-green-500/15 text-green-300 border-green-500/40'
    : cardPart.k === 'remove' ? 'bg-red-500/15 text-red-300 border-red-500/40'
    : 'bg-zinc-700/40 text-textcolor2 border-zinc-600/60'}

  <div class="flex flex-col items-end gap-1 shrink-0">
    <span class={`text-[11px] px-2 py-0.5 rounded-full border ${statusClass}`}>
      {statusLabel}
    </span>
    <span class="text-[11px] text-textcolor2">
      {cardChangeCount} change{cardChangeCount === 1 ? '' : 's'}
    </span>
    <span class="text-[11px] text-textcolor2">
      ~{c.modifiedCount ?? 0} / +{c.addedCount ?? 0} / -{c.removedCount ?? 0}
    </span>
  </div>
{/snippet}


<div class="absolute inset-0 z-50 bg-black bg-opacity-60 flex justify-center items-center p-4">
  <div class="bg-darkbg rounded-md w-full max-w-4xl max-h-full overflow-hidden flex flex-col">
    
    <div class="flex items-center justify-between px-4 py-3 border-b border-darkborderc">
      <div class="flex items-center gap-4 flex-wrap">
        {@render pillRadioGroup('Diff', 'diffStyle', diffOptions, diffStyle, (v) => (diffStyle = v as DiffStyle))}
        {@render pillRadioGroup('Format', 'formatStyle', formatOptions, formatStyle, (v) => (formatStyle = v as FormatStyle), isFlatText)}
        {@render pillRadioGroup('View', 'viewStyle', viewOptions, viewStyle, (v) => (viewStyle = v as ViewStyle))}        
        {@render checkboxToggle('Legacy', isFlatText, (v) => (isFlatText = v))}
        {@render checkboxToggle( 'Grouped', isGrouped, (v) => (isGrouped = v), isFlatText || diffStyle !== 'line' || viewStyle === 'split', true)}
        {@render checkboxToggle('Only changes', showOnlyChanges, (v) => (showOnlyChanges = v), isFlatText, true)}
        {#if showOnlyChanges}
          {@render rangeControl('Context', contextRadius, (v) => (contextRadius = v), 0, 5)}
        {/if}
      </div>

      <button class="text-textcolor2 hover:text-green-500" onclick={(e) => {handleClose()}}>
        <XIcon size={20}/>
      </button>
    </div>

    <div class="p-4 overflow-y-auto">
      <!-- card view -->
      {#if !isFlatText && formatStyle === 'card'}
        {#if cardDiffResult}
          {@const cardChangedTotal = cardDiffResult.cardCounts.modifiedCount + cardDiffResult.cardCounts.addedCount + cardDiffResult.cardCounts.removedCount}

          <div class="flex items-center justify-between mb-3 text-xs text-textcolor2">
            {@render renderCounts(cardDiffResult.counts)}
            <div class="text-xs text-textcolor2 flex items-center gap-2 flex-wrap">
              <span class="text-textcolor2">Cards changed:</span>
              <span class="text-textcolor">{cardChangedTotal}</span>
              <span class="text-textcolor2/60">/</span>
              <span class="text-textcolor2">compared {cardDiffResult.parts.length}</span>
              <span class="text-textcolor2/60">·</span>
              <span class="text-textcolor2">total {firstCards.length} → {secondCards.length}</span>
              <span class="text-textcolor2/60">·</span>
              <span class="inline-flex items-center gap-1 text-blue-300">
                ~{cardDiffResult.cardCounts.modifiedCount}
              </span>
              <span class="text-textcolor2/60">/</span>
              <span class="inline-flex items-center gap-1 text-green-300">
                +{cardDiffResult.cardCounts.addedCount}
              </span>
              <span class="text-textcolor2/60">/</span>
              <span class="inline-flex items-center gap-1 text-red-300">
                -{cardDiffResult.cardCounts.removedCount}
              </span>
            </div>
          </div>

          <div class="grid gap-3">
            {#each visibleCardParts as cardPart, idx (idx)}
              {#if viewStyle === 'unified'}
              {@const lines = cardPart.bodyLines.parts}
              {@const namePart = lines[0]}
              {@const headerPart = lines[1]}
              {@const bodyParts = lines.slice(2)}

              <div class="prompt-diff-hover bg-black/40 border border-darkborderc rounded-xl p-3 flex flex-col gap-2">
                <!-- name / header / card diff -->
                <div class="flex items-start justify-between gap-2">
                  <div class="flex flex-col gap-2 min-w-0">
                    {@render renderCardMeta(namePart, 'name', null)}
                    {@render renderCardMeta(headerPart, 'type', null)}
                  </div>

                  <!-- card diff -->
                  {@render renderCardStatus(cardPart)}
                </div>

                <!-- body -->
                <div class="mt-2 border-t border-darkborderc pt-2 font-mono text-sm leading-5">
                  {#if bodyParts.length === 0}
                    <div class="text-textcolor2 italic">No body content</div>
                  {:else}
                    {@const segments = buildSegments(bodyParts, { showOnlyChanges, contextRadius, scope: `card-${idx}`, expandedRanges })}
                    {#each segments as seg, sIdx (sIdx)}
                      {#if seg.kind === 'divider'}
                        {@render renderDivider(seg, `card-${idx}`)}
                      {:else if seg.kind === 'context'}
                        {#each seg.parts as part, idx (idx)}
                          {#if part.k !== 'modify'}
                            {@render renderSimpleLine(part)}
                          {/if}
                        {/each}
                      {:else} <!-- change segment -->
                        {@const lines = buildLines(seg.parts)}
                        {#each lines as line, idx (idx)}
                          {#if line.kind === 'simple'}
                          {@const part = line.part}
                            {#if part.k !== 'modify'}
                              {@render renderSimpleLine(part)}
                            {:else} <!-- modify -->
                              {@render renderModify(part, idx)}
                            {/if}
                          {:else} <!-- modifyGroup -->
                            {@render renderModifyGroup(line.parts)}
                          {/if}
                        {/each}
                      {/if}
                    {/each}
                  {/if}
                </div>
              </div>
              {:else} <!-- split view -->
                {@const scope = `card-${idx}`}
                {@const lines = cardPart.bodyLines?.parts ?? []}
                {@const namePart = lines[0] ?? null}
                {@const headerPart = lines[1] ?? null}
                {@const bodyParts = lines.slice(2)}

                {@const leftExists = cardPart.k !== 'add'}
                {@const rightExists = cardPart.k !== 'remove'}

                {@const segments = buildSegments(bodyParts, { showOnlyChanges, contextRadius, scope, expandedRanges })}
                {@const rows = toSplitRows(segments, scope)}

                <div class="relative">
                  <div class="absolute inset-0 grid grid-cols-2 gap-x-3 pointer-events-none">
                    <div class="bg-black/40 border border-darkborderc rounded-xl"></div>
                    <div class="bg-black/40 border border-darkborderc rounded-xl"></div>
                  </div>

                  <div class="relative z-10 grid grid-cols-2 gap-x-3 p-px">
                    <!-- left header -->
                    <div class="p-3">
                      {#if leftExists && namePart && headerPart}
                        <div class="flex items-start justify-between gap-2">
                          <div class="flex flex-col gap-2 min-w-0">
                            {@render renderCardMeta(namePart, 'name', 'left')}
                            {@render renderCardMeta(headerPart, 'type', 'left')}
                          </div>
                          {@render renderCardStatus(cardPart)}
                        </div>
                      {:else}
                        <div class="h-[70px] rounded-lg border border-dashed border-white/10 bg-black/10 flex items-center justify-center">
                          <span class="text-textcolor2/60 italic text-xs select-none">-</span>
                        </div>
                      {/if}
                    </div>

                    <!-- right header -->
                    <div class="p-3">
                      {#if rightExists && namePart && headerPart}
                        <div class="flex items-start justify-between gap-2">
                          <div class="flex flex-col gap-2 min-w-0">
                            {@render renderCardMeta(namePart, 'name', 'right')}
                            {@render renderCardMeta(headerPart, 'type', 'right')}
                          </div>
                          {@render renderCardStatus(cardPart)}
                        </div>
                      {:else}
                        <div class="h-[70px] rounded-lg border border-dashed border-white/10 bg-black/10 flex items-center justify-center">
                          <span class="text-textcolor2/60 italic text-xs select-none">-</span>
                        </div>
                      {/if}
                    </div>

                    <div class="h-px bg-white/10 mx-3"></div>
                    <div class="h-px bg-white/10 mx-3"></div>

                    <!-- body rows -->
                    {#each rows as r, rIdx (r.key)}
                      {#if r.kind === 'divider'}
                        <div class="col-span-2 px-2">
                          {@render renderDivider(r.seg, r.scope)}
                        </div>
                      {:else}
                        <div class="contents group">
                        <div class="px-3 py-0.5 font-mono text-sm leading-5 group-hover:bg-white/10 group-hover:outline group-hover:outline-1 group-hover:outline-white/15">
                          {@render renderSplitCell(leftExists ? r.left : { kind: 'empty', role: r.left.role }, rIdx)}
                        </div>
                        <div class="px-3 py-0.5 font-mono text-sm leading-5 group-hover:bg-white/10 group-hover:outline group-hover:outline-1 group-hover:outline-white/15">
                          {@render renderSplitCell(rightExists ? r.right : { kind: 'empty', role: r.right.role }, rIdx)}
                        </div>
                        </div>
                      {/if}
                    {/each}
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        {:else}
          <div class="text-textcolor2 text-sm">No diff computed yet.</div>
        {/if}
      {:else}<!-- raw view -->
        {#if currentFlatResult}
          {@const segments = buildSegments(currentFlatResult.parts, { showOnlyChanges, contextRadius, scope: 'raw', expandedRanges })}
          {@render renderCounts(currentFlatResult.counts)}

          {#if showOnlyChanges && segments.length === 0}
            <div class="flex items-center justify-center py-10">
              <div class="flex items-center gap-2 px-3 py-2 rounded-lg border border-darkborderc bg-black/30 text-textcolor2">
                <span class="inline-block w-2 h-2 rounded-full bg-green-500/70"></span>
                <span class="text-sm">No changes</span>
              </div>
            </div>
          {:else if viewStyle === 'unified'}
          <div class="font-mono text-sm leading-5">
            {#each segments as seg, sIdx (sIdx)}
              {#if seg.kind === 'divider'}
                {@render renderDivider(seg, 'raw')}
              {:else if seg.kind === 'context'}
                {#each seg.parts as part, idx (idx)}
                  {#if part.k !== 'modify'}
                    {@render renderSimpleLine(part)}
                  {/if}
                {/each}
              {:else} <!-- change segment -->
                {@const lines = buildLines(seg.parts)}
                {#each lines as line, idx (idx)}
                  {#if line.kind === 'simple'}
                    {@const part = line.part}
                    {#if part.k !== 'modify'}
                      {@render renderSimpleLine(part)}
                    {:else} <!-- modify -->
                      {@render renderModify(part, idx)}
                    {/if}
                  {:else} <!-- modifyGroup -->
                    {@render renderModifyGroup(line.parts)}
                  {/if}
                {/each}
              {/if}
            {/each}
          </div>
          {:else} <!-- split view -->
            {@const rows = toSplitRows(segments, 'raw')}
            <div class="rounded-xl border border-darkborderc bg-black/30 overflow-hidden">
              <div class="grid grid-cols-[1fr_auto_1fr] gap-0 font-mono text-sm leading-5">
                {#each rows as r, idx (r.key)}
                  {#if r.kind === 'divider'}
                    <div class="col-span-3 px-2">
                      {@render renderDivider(r.seg, r.scope)}
                    </div>
                  {:else}
                    <div class="contents group">
                    <div class="px-3 py-0.5 bg-black/10 group-hover:bg-white/10 group-hover:outline group-hover:outline-1 group-hover:outline-white/15">
                      {@render renderSplitCell(r.left, idx)}
                    </div>
                    <div class="w-px bg-white/10"></div>
                    <div class="px-3 py-0.5 bg-black/10 group-hover:bg-white/10 group-hover:outline group-hover:outline-1 group-hover:outline-white/15">
                      {@render renderSplitCell(r.right, idx)}
                    </div>
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}
        {:else}
          <div class="text-textcolor2 text-sm">No diff computed yet.</div>
        {/if}
      {/if}
    </div>

  </div>
</div>

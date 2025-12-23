<script lang="ts">
    import { XIcon } from "lucide-svelte"
    import { getDatabase } from "../../ts/storage/database.svelte"
    import type { PromptItem, PromptItemPlain, PromptItemChatML, PromptItemTyped, PromptItemAuthorNote, PromptItemChat } from "src/ts/process/prompt.ts";

    interface Props {
        firstPresetId: number;
        secondPresetId: number;
        onClose?: () => void;
    }
    let { firstPresetId, secondPresetId, onClose = () => {} }: Props = $props();


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

    type DiffStyle = 'line' | 'intraline'
    type ViewStyle = 'raw' | 'card'
    type GroupingStyle = 'flattext' | 'linebyline' | 'cardline'
    
    let diffStyle = $state<DiffStyle>('intraline')
    let viewStyle = $state<ViewStyle>('raw')
    let groupingStyle = $state<GroupingStyle>('flattext')

    let diffResult = $state<DiffResult | null>(null)
    let cardDiffResult = $state<CardDiffResult | null>(null)
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

    const diffOptions = [
        { value: 'line', label: 'Line' },
        { value: 'intraline', label: 'Intraline' },
    ] as const

    const viewOptions = [
        { value: 'raw', label: 'Raw' },
        { value: 'card', label: 'Card' },
    ] as const

    const groupingOptions = [
        { value: 'flattext', label: 'Flat text' },
        { value: 'linebyline', label: 'Line-by-line' },
        { value: 'cardline', label: 'Card Line' },
    ] as const

    const firstCards = getPromptCards(firstPresetId)
    const secondCards = getPromptCards(secondPresetId)

    $effect(() => {
        if (!firstCards || !secondCards) return
        diffStyle
        groupingStyle
        viewStyle
        void recomputeDiff(firstCards, secondCards)
    })

    // --- style helper --- //
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


    function isNameLine(part: DiffPart, idx: number) {
        return part.src === 'linebyline' && part.k !== 'modify' && part.line.lineRole === 'name' && idx > 0
    }

    function isHeaderLine(part: DiffPart) {
        return part.src === 'linebyline' && part.k !== 'modify' && part.line.lineRole === 'header'
    }

    // ------------------ //


    function isPromptItemPlain(item: PromptItem): item is PromptItemPlain {
        return (
            item.type === 'plain' || item.type === 'jailbreak' || item.type === 'cot'
        );
    }

    function isPromptItemChatML(item: PromptItem): item is PromptItemChatML {
        return item.type === 'chatML'
    }

    function isPromptItemTyped(item: PromptItem): item is PromptItemTyped {
        return (
            item.type === 'persona' ||
            item.type === 'description' ||
            item.type === 'lorebook' ||
            item.type === 'postEverything' ||
            item.type === 'memory'
        )
    }

    function isPromptItemAuthorNote(item: PromptItem): item is PromptItemAuthorNote {
        return item.type === 'authornote'
    }

    function isPromptItemChat(item: PromptItem): item is PromptItemChat {
        return item.type === 'chat'
    }
    
    function getPromptCards(id: number): PromptCard[] {
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

    async function computeDiff(prompt1: PromptCard[], prompt2: PromptCard[], opts: { style: DiffStyle; grouping: 'flattext' | 'linebyline' }): Promise<DiffResult> {
        switch (opts.grouping) {
            case 'flattext':
            return computeDiffFlat(renderRaw(prompt1), renderRaw(prompt2), opts.style)
            case 'linebyline':
            return computeDiffLineByLine(cardsToLines(prompt1), cardsToLines(prompt2), opts.style)
        }
    }

    async function recomputeDiff(firstCards: PromptCard[], secondCards: PromptCard[]) {
        if (!firstCards || !secondCards) return

        if (groupingStyle === 'flattext' || groupingStyle === 'linebyline') {
            diffResult = await computeDiff(firstCards, secondCards, {
            style: diffStyle,
            grouping: groupingStyle,
            })
            cardDiffResult = null
        } else if (groupingStyle === 'cardline') {
            cardDiffResult = await computeCardViewDiff(firstCards, secondCards, diffStyle)
            diffResult = null
        }
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
            comparator: (x, y) => x.body === y.body && x.header === y.header && x.kind === y.kind
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
                            if (style === 'intraline') {
                                modifiedCount++
                            }
                            else {
                                addedCount++
                                removedCount++
                            }
                        }
                        else {
                            parts.push({ k: 'remove', card: left })
                            parts.push({ k: 'add', card: right })
                        }
                    }
                    for (let j = n; j < leftParts.length; j++) {
                        parts.push({ k: 'remove', card: leftParts[j]})
                    }
                    for (let j = n; j < rightParts.length; j++) {
                        parts.push({ k: 'add', card: rightParts[j]})
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

</script>


<div class="absolute inset-0 z-50 bg-black bg-opacity-60 flex justify-center items-center p-4">
  <div class="bg-darkbg rounded-md w-full max-w-4xl max-h-full overflow-hidden flex flex-col">
    
    <div class="flex items-center justify-between px-4 py-3 border-b border-darkborderc">
      <div class="flex items-center gap-4 flex-wrap">

        <div class="flex items-center gap-2">
          <span class="text-xs text-textcolor2">Diff</span>
          <div class="flex rounded-md border border-darkborderc overflow-hidden">
            {#each diffOptions as opt (opt.value)}
              <label class={`${pillBase} ${diffStyle === opt.value ? pillActive : pillInactive}`}>
                <input
                  class="hidden"
                  type="radio"
                  name="diffStyle"
                  value={opt.value}
                  bind:group={diffStyle}
                />
                  {opt.label}
              </label>
            {/each}
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-textcolor2">View</span>
          <div class="flex rounded-md border border-darkborderc overflow-hidden">
            {#each viewOptions as opt (opt.value)}
              <label class={`${pillBase} ${viewStyle === opt.value ? pillActive : pillInactive}`}>
                <input
                  class="hidden"
                  type="radio"
                  name="viewStyle"
                  value={opt.value}
                  bind:group={viewStyle}
                />
                  {opt.label}
              </label>
            {/each}
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-textcolor2">Mode</span>
          <div class="flex rounded-md border border-darkborderc overflow-hidden">
            {#each groupingOptions as opt (opt.value)}
              <label class={`${pillBase} ${groupingStyle === opt.value ? pillActive : pillInactive}`}>
                <input
                  class="hidden"
                  type="radio"
                  name="groupingStyle"
                  value={opt.value}
                  bind:group={groupingStyle}
                />
                  {opt.label}
              </label>
            {/each}
          </div>
        </div>

      </div>

      <button class="text-textcolor2 hover:text-green-500" onclick={(e) => {onClose()}}>
        <XIcon size={20}/>
      </button>
    </div>


    <div class="p-4 overflow-y-auto">
      <!-- card view -->
      {#if groupingStyle === 'cardline' && viewStyle === 'card'}
        {#if cardDiffResult}
          {@const cardChangedTotal =
            cardDiffResult.cardCounts.modifiedCount
            + cardDiffResult.cardCounts.addedCount
            + cardDiffResult.cardCounts.removedCount}

          <div class="flex items-center justify-between mb-3 text-xs text-textcolor2">
            <div class="flex flex-wrap gap-3">
              <span class="inline-flex items-center gap-2">
                <span class="inline-block w-1 h-4 rounded bg-blue-500"></span>
                {cardDiffResult.counts.modifiedCount}
              </span>
              <span class="inline-flex items-center gap-2">
                <span class="inline-block w-1 h-4 rounded bg-green-500"></span>
                {cardDiffResult.counts.addedCount}
              </span>
              <span class="inline-flex items-center gap-2">
                <span class="inline-block w-1 h-4 rounded bg-red-500"></span>
                {cardDiffResult.counts.removedCount}
              </span>
            </div>

            <div class="text-xs text-textcolor2">
              Cards changed: {cardChangedTotal} / {cardDiffResult.parts.length}
            </div>
          </div>

          <div class="grid gap-3">
            {#each cardDiffResult.parts as cardPart, idx (idx)}
              {@const lines = cardPart.bodyLines.parts}
              {@const namePart = lines[0]}
              {@const headerPart = lines[1]}
              {@const bodyParts = lines.slice(2)}
              {@const c = cardPart.bodyLines.counts}
              {@const cardChangeCount = c.modifiedCount + c.addedCount + c.removedCount}

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

              <div class="prompt-diff-hover bg-black/40 border border-darkborderc rounded-xl p-3 flex flex-col gap-2">
                <!-- name / header / card diff -->
                <div class="flex items-start justify-between gap-2">
                  <div class="flex flex-col gap-2 min-w-0">
                    <!-- Name -->
                    <div class="flex flex-col gap-1">
                      <span class="text-[10px] uppercase tracking-wide text-textcolor2">Name</span>

                      {#if namePart && namePart.src === 'linebyline'}
                        {#if namePart.k === 'modify'}
                          {#if diffStyle === 'line'}
                            <!-- name: line diff -->
                            <div class="whitespace-pre-wrap text-red-400">
                              {#each namePart.tokens as tok, j (j)}
                                {#if tok.t !== 'add'}
                                  <span class={tok.t === 'remove' ? 'bg-red-500/20 rounded px-0.5' : 'text-red-200/90'}>
                                    {tok.v}
                                  </span>
                                {/if}
                              {/each}
                            </div>
                            <div class="whitespace-pre-wrap text-green-400">
                              {#each namePart.tokens as tok, j (j)}
                                {#if tok.t !== 'remove'}
                                  <span class={tok.t === 'add' ? 'bg-green-500/20 rounded px-0.5' : 'text-green-200/90'}>
                                    {tok.v}
                                  </span>
                                {/if}
                              {/each}
                            </div>
                          {:else}
                            <!-- name: intraline diff -->
                            <div class="whitespace-pre-wrap">
                              {#each namePart.tokens as tok, j (j)}
                                <span
                                  class={tok.t === 'add'
                                    ? tokenAddClass
                                    : tok.t === 'remove'
                                      ? tokenRemoveClass
                                      : tokenSameClass}
                                >
                                  {tok.v}
                                </span>
                              {/each}
                            </div>
                          {/if}
                        {:else}
                          <!-- same/add/remove -->
                          <div
                            class={`whitespace-pre-wrap ${
                              namePart.k === 'same'
                                ? 'text-textcolor'
                                : namePart.k === 'add'
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            {namePart.line.text}
                          </div>
                        {/if}
                      {:else}
                        <div class="text-xs text-textcolor2 italic">No name</div>
                      {/if}
                    </div>

                    <!-- Header / Type -->
                    <div class="flex flex-col gap-1">
                      <span class="text-[10px] uppercase tracking-wide text-textcolor2">TYPE</span>

                      {#if headerPart && headerPart.src === 'linebyline'}
                        {#if headerPart.k === 'modify'}
                          {#if diffStyle === 'line'}
                            <div class="whitespace-pre-wrap text-red-400">
                              {#each headerPart.tokens as tok, j (j)}
                                {#if tok.t !== 'add'}
                                  <span class={tok.t === 'remove' ? 'bg-red-500/20 rounded px-0.5' : 'text-red-200/90'}>
                                    {tok.v}
                                  </span>
                                {/if}
                              {/each}
                            </div>
                            <div class="whitespace-pre-wrap text-green-400">
                              {#each headerPart.tokens as tok, j (j)}
                                {#if tok.t !== 'remove'}
                                  <span class={tok.t === 'add' ? 'bg-green-500/20 rounded px-0.5' : 'text-green-200/90'}>
                                    {tok.v}
                                  </span>
                                {/if}
                              {/each}
                            </div>
                          {:else}
                            <div class="whitespace-pre-wrap">
                              {#each headerPart.tokens as tok, j (j)}
                                <span
                                  class={tok.t === 'add'
                                    ? tokenAddClass
                                    : tok.t === 'remove'
                                      ? tokenRemoveClass
                                      : tokenSameClass}
                                >
                                  {tok.v}
                                </span>
                              {/each}
                            </div>
                          {/if}
                        {:else}
                          <div
                            class={`whitespace-pre-wrap ${
                              headerPart.k === 'same'
                                ? 'text-textcolor2'
                                : headerPart.k === 'add'
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            {headerPart.line.text}
                          </div>
                        {/if}
                      {:else}
                        <div class="text-xs text-textcolor2 italic">No header</div>
                      {/if}
                    </div>
                  </div>

                  <!-- card diff -->
                  <div class="flex flex-col items-end gap-1 shrink-0">
                    <span class={`text-[11px] px-2 py-0.5 rounded-full border ${statusClass}`}>
                      {statusLabel}
                    </span>
                    <span class="text-[11px] text-textcolor2">
                      {cardChangeCount} change{cardChangeCount === 1 ? '' : 's'}
                    </span>
                    <span class="text-[11px] text-textcolor2">
                      +{c.addedCount} / ~{c.modifiedCount} / -{c.removedCount}
                    </span>
                  </div>
                </div>

                <!-- body -->
                <div class="mt-2 border-t border-darkborderc pt-2 font-mono text-sm leading-5">
                  {#if bodyParts.length === 0}
                    <div class="text-textcolor2 italic">No body content</div>
                  {:else}
                    {#each bodyParts as part, i (i)}
                      {@const isModify = part.k === 'modify'}

                      {#if !isModify}
                        {@const lineClass =
                          part.k === 'same'
                            ? `${diffLineBase} ${diffSameClass}`
                            : part.k === 'add'
                            ? `${diffLineBase} ${diffAddClass}`
                            : `${diffLineBase} ${diffRemoveClass}`}

                        <div class={lineClass}>
                          {#if part.src === 'linebyline' && part.line.text === ''}
                            <br />
                          {:else}
                            {#if part.src === 'flattext'}
                              {part.v}
                            {:else}
                              {part.line.text}
                            {/if}
                          {/if}
                        </div>
                      {:else}
                        {#if diffStyle === 'line'}
                          <div class={`whitespace-pre-wrap ${lineRemoveClass}`}>
                            {#each part.tokens as tok, j (j)}
                              {#if tok.t !== 'add'}
                                <span class={tok.t === 'remove' ? 'bg-red-500/20 rounded px-0.5' : 'text-red-200/90'}>
                                  {tok.v}
                                </span>
                              {/if}
                            {/each}
                          </div>
                          <div class={`whitespace-pre-wrap ${lineAddClass}`}>
                            {#each part.tokens as tok, j (j)}
                              {#if tok.t !== 'remove'}
                                <span class={tok.t === 'add' ? 'bg-green-500/20 rounded px-0.5' : 'text-green-200/90'}>
                                  {tok.v}
                                </span>
                              {/if}
                            {/each}
                          </div>
                        {:else}
                          <div class={`whitespace-pre-wrap ${lineModifyClass}`}>
                            {#each part.tokens as tok, j (j)}
                              <span
                                class={tok.t === 'add'
                                  ? tokenAddClass
                                  : tok.t === 'remove'
                                    ? tokenRemoveClass
                                    : tokenSameClass}
                              >
                                {tok.v}
                              </span>
                            {/each}
                          </div>
                        {/if}
                      {/if}
                    {/each}
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-textcolor2 text-sm">No diff computed yet.</div>
        {/if}
      {:else}<!-- raw view -->
        {#if (groupingStyle === 'cardline' && viewStyle === 'raw' && cardlineFlatResult)
          || (groupingStyle !== 'cardline' && diffResult)}
          {@const result =
            groupingStyle === 'cardline' && viewStyle === 'raw'
              ? cardlineFlatResult
              : diffResult}

          <div class="flex flex-wrap gap-3 text-xs text-textcolor2 mb-3">
            <span class="inline-flex items-center gap-2">
              <span class="inline-block w-1 h-4 rounded bg-blue-500"></span>
              {result!.counts.modifiedCount}
            </span>
            <span class="inline-flex items-center gap-2">
              <span class="inline-block w-1 h-4 rounded bg-green-500"></span>
              {result!.counts.addedCount}
            </span>
            <span class="inline-flex items-center gap-2">
              <span class="inline-block w-1 h-4 rounded bg-red-500"></span>
              {result!.counts.removedCount}
            </span>
          </div>

          <div class="font-mono text-sm leading-5">
            {#each result!.parts as part, idx (idx)}
              {@const isModify   = part.k === 'modify'}
              {@const isFlattext = part.src === 'flattext'}
              {@const isLineby   = part.src === 'linebyline'}

              {#if !isModify}
                {@const lineClass =
                  part.k === 'same'
                    ? `${diffLineBase} ${diffSameClass}`
                    : part.k === 'add'
                    ? `${diffLineBase} ${diffAddClass}`
                    : `${diffLineBase} ${diffRemoveClass}`}

                <div
                  class={lineClass}
                  class:mt-5={isNameLine(part, idx)}
                  class:mb-5={isHeaderLine(part)}
                >
                  {#if isLineby && part.line.lineRole === 'body' && part.line.text === ''}
                    <br />
                  {:else}
                    {#if isFlattext}
                      {part.v}
                    {:else}
                      {part.line.text}
                      {#if isLineby && (part.line.lineRole === 'name' || part.line.lineRole === 'header')}
                        <span class={nameHeaderTagClass}>
                          {part.line.lineRole === 'name' ? 'NAME' : 'TYPE'}
                        </span>
                      {/if}
                    {/if}
                  {/if}
                </div>
              {:else} <!-- modify -->
                {#if diffStyle === 'line'}
                  <!-- line diff -->
                  <div
                    class={`whitespace-pre-wrap ${lineRemoveClass}`}
                    class:mt-5={isLineby && part.right.lineRole === 'name' && idx > 0}
                  >
                    {#each part.tokens as tok, j (j)}
                      {#if tok.t !== 'add'}
                        <span class={tok.t === 'remove' ? 'bg-red-500/20 rounded px-0.5' : 'text-red-200/90'}>
                          {tok.v}
                        </span>
                      {/if}
                    {/each}{#if isLineby && (part.right.lineRole === 'name' || part.right.lineRole === 'header')}
                      <span class={nameHeaderTagClass}>
                        {part.right.lineRole === 'name' ? 'NAME' : 'TYPE'}
                      </span>
                    {/if}
                  </div>

                  <div
                    class={`whitespace-pre-wrap ${lineAddClass}`}
                    class:mb-5={isLineby && part.right.lineRole === 'header'}
                  >
                    {#each part.tokens as tok, j (j)}
                      {#if tok.t !== 'remove'}
                        <span class={tok.t === 'add' ? 'bg-green-500/20 rounded px-0.5' : 'text-green-200/90'}>
                          {tok.v}
                        </span>
                      {/if}
                    {/each}{#if isLineby && (part.right.lineRole === 'name' || part.right.lineRole === 'header')}
                      <span class={nameHeaderTagClass}>
                        {part.right.lineRole === 'name' ? 'NAME' : 'TYPE'}
                      </span>
                    {/if}
                  </div>

                {:else} <!-- intraline diff -->
                  <div
                    class={`whitespace-pre-wrap ${lineModifyClass}`}
                    class:mt-5={isLineby && part.right.lineRole === 'name' && idx > 0}
                    class:mb-5={isLineby && part.right.lineRole === 'header'}
                  >
                    {#each part.tokens as tok, j (j)}
                      <span
                        class={tok.t === 'add'
                          ? tokenAddClass
                          : tok.t === 'remove'
                            ? tokenRemoveClass
                            : tokenSameClass}
                      >
                        {tok.v}
                      </span>
                    {/each}{#if isLineby && (part.right.lineRole === 'name' || part.right.lineRole === 'header')}
                      <span class={nameHeaderTagClass}>
                        {part.right.lineRole === 'name' ? 'NAME' : 'TYPE'}
                      </span>
                    {/if}
                  </div>
                {/if}
              {/if}
            {/each}
          </div>
        {:else}
          <div class="text-textcolor2 text-sm">No diff computed yet.</div>
        {/if}
      {/if}
    </div>

  </div>
</div>

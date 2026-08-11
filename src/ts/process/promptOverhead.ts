import { getDatabase, getCurrentCharacter } from '../storage/database.svelte'
import type { character, Chat, loreBook } from '../storage/database.svelte'
import { ChatTokenizer } from '../tokenizer'
import { risuChatParser } from './scripts'
import { parseChatML } from '../parser/chatML'
import { exampleMessage } from './exampleMessages'
import { getModuleLorebooks } from './modules'
import { findCharacterbyId, getAuthorNoteDefaultText, getPersonaPrompt, getUserName, prebuiltAssetCommand } from '../util'
import { getCurrentHypaV3Preset } from './memory/hypav3'

export type OverheadKey = 'promptTemplate' | 'description' | 'persona' | 'authorNote' | 'lorebook' | 'exampleMessages' | 'postExtras' | 'slack' | 'recentChats'

export interface OverheadItem {
    key: OverheadKey
    tokens: number
}

export interface PromptOverhead {
    items: OverheadItem[]
    total: number
}

export interface HypaV3RatioEstimate extends PromptOverhead {
    maxMemoryRatio: number
}

const positionRegex = /{{position::(.+?)}}/g

const cotInstruction = `<instruction> - before respond everything, Think step by step as a ai assistant how would you respond inside <Thoughts> xml tag. this must be less than 5 paragraphs.</instruction>`

const convertPromptRole = {
    system: 'system',
    user: 'user',
    bot: 'assistant',
} as const

const defaultUtilityTemplate = [
    { type: 'plain', text: '', role: 'system', type2: 'main' },
    { type: 'description' },
    { type: 'lorebook' },
    { type: 'chat', rangeStart: 0, rangeEnd: 'end' },
    { type: 'plain', text: '', role: 'system', type2: 'globalNote' },
    { type: 'postEverything' },
] as any[]

function worstCaseAdditionalText(chara: character): string {
    if (!chara.additionalText) {
        return ''
    }
    return chara.additionalText
        .split('\n\n')
        .sort((a, b) => b.length - a.length)
        .slice(0, 3)
        .join('\n\n')
}

async function estimateCharOverhead(chara: character, chat: Chat, isGroup: boolean): Promise<PromptOverhead> {
    const db = getDatabase()
    const tokenizer = new ChatTokenizer(
        db.aiModel.startsWith('gpt') ? 5 : 3,
        db.aiModel.startsWith('gpt') ? 'noName' : 'name'
    )
    type TokenizeEntry = {
        bucket: Exclude<OverheadKey, 'recentChats' | 'slack'>
        role: 'system' | 'user' | 'assistant' | 'function'
        content: string
        name?: string
    }
    const counts: Record<Exclude<OverheadKey, 'recentChats'>, number> = {
        promptTemplate: 0,
        description: 0,
        persona: 0,
        authorNote: 0,
        lorebook: 0,
        exampleMessages: 0,
        postExtras: 0,
        slack: 50,
    }
    const entries: TokenizeEntry[] = []
    const repeatedPostExtraEntries = new Set<TokenizeEntry>()
    const addRepeatedPostExtra = (content: string) => {
        const entry: TokenizeEntry = { bucket: 'postExtras', role: 'system', content }
        entries.push(entry)
        repeatedPostExtraEntries.add(entry)
    }
    const parse = (text: string) => risuChatParser((text ?? '').replace(positionRegex, ''), { chara })

    let description = parse((db.promptPreprocess ? db.descriptionPrefix : '') + chara.desc)
    const additionalInfo = worstCaseAdditionalText(chara)
    if (additionalInfo) {
        description += '\n\n' + parse(additionalInfo)
    }
    if (chara.personality) {
        description += parse('\n\nDescription of {{char}}: ' + chara.personality)
    }
    if (chara.scenario) {
        description += parse('\n\nCircumstances and context of the dialogue: ' + chara.scenario)
    }

    const personaContent = db.personaPrompt ? parse(getPersonaPrompt()) : ''
    const authorNoteSource = chat.note || getAuthorNoteDefaultText()
    const authorNoteContent = authorNoteSource ? parse(authorNoteSource) : ''

    const allLore: loreBook[] = [
        ...(chara.globalLore ?? []),
        ...(chat.localLore ?? []),
        ...getModuleLorebooks(),
    ]
    for (const lore of allLore) {
        const content = (lore.content ?? '')
            .split('\n')
            .filter((line) => line !== '' && !line.startsWith('@@'))
            .join('\n')
        if (content.length > 0) {
            entries.push({ bucket: 'lorebook', role: 'system', content: parse(content) })
        }
    }
    const loreBudget = chara.loreSettings?.tokenBudget ?? db.loreBookToken

    for (const example of exampleMessage(chara, getUserName())) {
        entries.push({
            bucket: 'exampleMessages',
            role: example.role,
            content: example.content,
            name: example.name,
        })
    }

    const usingPromptTemplate = !!db.promptTemplate
    let template = db.promptTemplate ?? null
    if (chara.utilityBot && !(usingPromptTemplate && db.promptSettings?.utilOverride)) {
        template = defaultUtilityTemplate
    }
    let postEverythingCardCount = 1

    if (template) {
        let hasPostEverything = false
        postEverythingCardCount = Math.max(template.filter((card) => card.type === 'postEverything').length, 1)
        for (const card of template) {
            switch (card.type) {
                case 'persona': {
                    if (!personaContent) {
                        break
                    }
                    const content = card.innerFormat
                        ? parse(card.innerFormat).replace('{{slot}}', personaContent)
                        : personaContent
                    entries.push({ bucket: 'persona', role: 'system', content })
                    break
                }
                case 'description': {
                    const content = card.innerFormat
                        ? parse(card.innerFormat).replace('{{slot}}', description)
                        : description
                    entries.push({ bucket: 'description', role: 'system', content })
                    break
                }
                case 'authornote': {
                    if (!authorNoteContent) {
                        break
                    }
                    const content = card.innerFormat
                        ? parse(card.innerFormat).replace('{{slot}}', authorNoteContent)
                        : authorNoteContent
                    entries.push({ bucket: 'authorNote', role: 'system', content })
                    break
                }
                case 'postEverything': {
                    hasPostEverything = true
                    if (usingPromptTemplate && db.promptSettings?.postEndInnerFormat) {
                        entries.push({
                            bucket: 'postExtras',
                            role: 'system',
                            content: db.promptSettings.postEndInnerFormat,
                        })
                    }
                    break
                }
                case 'plain':
                case 'jailbreak':
                case 'cot': {
                    if (card.type === 'jailbreak' && !db.jailbreakToggle) {
                        break
                    }
                    if (card.type === 'cot' && !db.chainOfThought) {
                        break
                    }
                    const originalContent = card.text ?? ''
                    let content = originalContent
                    if (card.type2 === 'globalNote') {
                        if (chara.replaceGlobalNote) {
                            content = chara.replaceGlobalNote.replaceAll('{{original}}', content)
                        }
                        if (chara.prebuiltAssetCommand && !originalContent.includes('{{//@customimageinstruction}}')) {
                            content += prebuiltAssetCommand
                        }
                    }
                    entries.push({
                        bucket: 'promptTemplate',
                        role: convertPromptRole[card.role] ?? 'system',
                        content: risuChatParser(content.replace(positionRegex, ''), { chara, role: card.role }),
                    })
                    break
                }
                case 'chatML': {
                    for (const message of parseChatML(card.text ?? '') ?? []) {
                        entries.push({
                            bucket: 'promptTemplate',
                            role: message.role,
                            content: message.content,
                            name: message.name,
                        })
                    }
                    break
                }
                default: {
                    break
                }
            }
        }
        if (usingPromptTemplate && !hasPostEverything && db.promptSettings?.postEndInnerFormat) {
            entries.push({
                bucket: 'postExtras',
                role: 'system',
                content: db.promptSettings.postEndInnerFormat,
            })
        }
    } else {
        const mainPrompt = chara.systemPrompt?.replaceAll('{{original}}', db.mainPrompt) || db.mainPrompt
        const additional = db.additionalPrompt === '' || !db.promptPreprocess ? '' : '\n' + db.additionalPrompt
        entries.push({ bucket: 'promptTemplate', role: 'system', content: parse(mainPrompt + additional) })
        if (db.jailbreakToggle) {
            entries.push({ bucket: 'promptTemplate', role: 'system', content: parse(db.jailbreak) })
        }
        const globalNote = chara.replaceGlobalNote?.replaceAll('{{original}}', db.globalNote) || db.globalNote
        entries.push({ bucket: 'promptTemplate', role: 'system', content: parse(globalNote) })
        entries.push({ bucket: 'description', role: 'system', content: description })
        if (personaContent) {
            entries.push({ bucket: 'persona', role: 'system', content: personaContent })
        }
        if (authorNoteContent) {
            entries.push({ bucket: 'authorNote', role: 'system', content: authorNoteContent })
        }
    }

    if (db.chainOfThought && !(usingPromptTemplate && db.promptSettings?.customChainOfThought)) {
        addRepeatedPostExtra(cotInstruction)
    }
    if (isGroup) {
        addRepeatedPostExtra(`[Write the next reply only as ${chara.name}]`)
    }
    if (chara.inlayViewScreen) {
        if (chara.viewScreen === 'emotion') {
            addRepeatedPostExtra(
                chara.newGenData.emotionInstructions.replaceAll('{{slot}}', chara.emotionImages.map((v) => v[0]).join(', '))
            )
        }
        if (chara.viewScreen === 'imggen') {
            addRepeatedPostExtra(chara.newGenData.instructions)
        }
    }

    let repeatedPostExtrasTokens = 0
    for (const entry of entries) {
        const tokens = await tokenizer.tokenizeChat(entry)
        if (repeatedPostExtraEntries.has(entry)) {
            repeatedPostExtrasTokens += tokens
        } else {
            counts[entry.bucket] += tokens
        }
    }
    counts.postExtras += repeatedPostExtrasTokens * postEverythingCardCount
    counts.lorebook = Math.min(counts.lorebook, loreBudget)

    const items = (Object.entries(counts) as [OverheadKey, number][]).map(([key, tokens]) => ({ key, tokens }))
    const total = items.reduce((sum, item) => sum + item.tokens, 0)

    return { items, total }
}

export async function estimatePromptOverhead(): Promise<PromptOverhead> {
    const room = getCurrentCharacter()

    if (room.type === 'group') {
        const chat = room.chats[room.chatPage]
        let worst: PromptOverhead | null = null
        for (const memberId of room.characters) {
            const member = findCharacterbyId(memberId)
            const estimate = await estimateCharOverhead(member, chat, true)
            if (!worst || estimate.total > worst.total) {
                worst = estimate
            }
        }
        if (!worst) {
            throw new Error('Group has no members')
        }
        return worst
    }

    const chat = room.chats[room.chatPage]
    return estimateCharOverhead(room, chat, false)
}

export async function estimateHypaV3MaxMemoryRatio(): Promise<HypaV3RatioEstimate> {
    const db = getDatabase()
    const settings = getCurrentHypaV3Preset().settings
    const queryChatCount = settings.queryChatCount
    const maxResponse = db.maxResponse
    const maxContext = db.maxContext
    const overhead = await estimatePromptOverhead()
    const recentChats = queryChatCount * maxResponse
    const items = [...overhead.items, { key: 'recentChats' as const, tokens: recentChats }]
    const total = overhead.total + recentChats

    if (maxContext === 0) {
        return { items, total, maxMemoryRatio: 0 }
    }

    return { items, total, maxMemoryRatio: Math.max((maxContext - total) / maxContext, 0) }
}

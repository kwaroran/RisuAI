import { getDatabase, getCurrentCharacter } from '../storage/database.svelte'
import type { character, Chat, loreBook, Message } from '../storage/database.svelte'
import { untrack } from 'svelte'
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

const inlayRegex = /{{(inlay|inlayed|inlayeddata)::(.+?)}}/g

const defaultGroupTemplate = `<{{char}}'s Message>\n{{slot}}\n</{{char}}'s Message>`

type TokenizeEntry = {
    bucket: Exclude<OverheadKey, 'slack'>
    role: 'system' | 'user' | 'assistant' | 'function'
    content: string
    name?: string
}

function collectEnabledMessages(chat: Chat): { messages: Message[]; reset: boolean } {
    const messages: Message[] = []
    for (let i = chat.message.length - 1; i >= 0; i--) {
        const msg = chat.message[i]
        if (msg.disabled === true) {
            continue
        }
        if (msg.disabled === 'allBefore') {
            return { messages, reset: true }
        }
        messages.unshift(msg)
    }
    return { messages, reset: false }
}

function buildRecentChatEntries(chara: character, chat: Chat, isGroup: boolean, count: number): TokenizeEntry[] {
    const db = getDatabase()
    const sendName = !!db.promptTemplate && !!db.promptSettings?.sendName
    const { messages, reset } = collectEnabledMessages(chat)
    const entries: TokenizeEntry[] = []

    if (!db.aiModel.startsWith('novelai') && !db.promptSettings?.trimStartNewChat) {
        entries.push({ bucket: 'recentChats', role: 'system', content: '[Start a new chat]' })
    }

    if (!isGroup && !reset) {
        const firstMsg = chat.fmIndex === -1 ? chara.firstMessage : chara.alternateGreetings[chat.fmIndex]
        let content = risuChatParser(firstMsg, { chara })
        if (sendName) {
            content = `${chara.name}: ${content}`
        }
        entries.push({ bucket: 'recentChats', role: 'assistant', content })
    }

    for (const msg of messages.slice(-count)) {
        let content = risuChatParser(msg.data, { chara, role: msg.role }).replace(inlayRegex, '')
        const speaker = findCharacterbyId(msg.saying)
        if ((isGroup && speaker.chaId !== chara.chaId) || (isGroup && db.groupOtherBotRole === 'assistant') || sendName) {
            const form = db.groupTemplate || defaultGroupTemplate
            content = risuChatParser(form, { chara: speaker.name }).replace('{{slot}}', content)
        }
        entries.push({
            bucket: 'recentChats',
            role: msg.role === 'user' ? 'user' : 'assistant',
            content,
        })
    }

    return entries.slice(-count)
}

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

async function estimateCharOverhead(chara: character, chat: Chat, isGroup: boolean, recentChatCount?: number): Promise<PromptOverhead> {
    const db = getDatabase()
    const tokenizer = new ChatTokenizer(
        db.aiModel.startsWith('gpt') ? 5 : 3,
        db.aiModel.startsWith('gpt') ? 'noName' : 'name'
    )
    const counts: Record<OverheadKey, number> = {
        promptTemplate: 0,
        description: 0,
        persona: 0,
        authorNote: 0,
        lorebook: 0,
        exampleMessages: 0,
        postExtras: 0,
        slack: 50,
        recentChats: 0,
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

    let recentChatEntryCount = 0
    if (recentChatCount !== undefined) {
        const recentChatEntries = untrack(() => buildRecentChatEntries(chara, chat, isGroup, recentChatCount))
        recentChatEntryCount = recentChatEntries.length
        entries.push(...recentChatEntries)
    }
    const maxResponse = db.maxResponse

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
    if (recentChatCount !== undefined) {
        counts.recentChats += Math.max(recentChatCount - recentChatEntryCount, 0) * maxResponse
    }

    const items = (Object.entries(counts) as [OverheadKey, number][]).map(([key, tokens]) => ({ key, tokens }))
    const total = items.reduce((sum, item) => sum + item.tokens, 0)

    return { items, total }
}

export async function estimatePromptOverhead(options: { recentChatCount?: number } = {}): Promise<PromptOverhead> {
    const room = getCurrentCharacter()

    if (room.type === 'group') {
        const chat = room.chats[room.chatPage]
        let worst: PromptOverhead | null = null
        for (const memberId of room.characters) {
            const member = findCharacterbyId(memberId)
            const estimate = await estimateCharOverhead(member, chat, true, options.recentChatCount)
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
    return estimateCharOverhead(room, chat, false, options.recentChatCount)
}

export async function estimateHypaV3MaxMemoryRatio(): Promise<HypaV3RatioEstimate> {
    const db = getDatabase()
    const settings = getCurrentHypaV3Preset().settings
    const maxContext = db.maxContext
    const overhead = await estimatePromptOverhead({ recentChatCount: settings.queryChatCount })

    if (maxContext === 0) {
        return { ...overhead, maxMemoryRatio: 0 }
    }

    return { ...overhead, maxMemoryRatio: Math.max((maxContext - overhead.total) / maxContext, 0) }
}

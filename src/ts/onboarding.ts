import { v4 } from 'uuid'
import type { character, CharacterOnboarding, Chat, groupChat, OnboardingQuestion } from './storage/database.svelte'
import { getChatVar, setChatVar } from './parser/chatVar.svelte'

export const onboardingVarNameAttr = 'risu-change-var-name'
export const onboardingVarValueAttr = 'risu-change-var-value'

export function createOnboarding(): CharacterOnboarding {
    return {
        enabled: true,
        mode: 'form',
        title: '',
        description: '',
        questions: [],
        html: '',
    }
}

export function createOnboardingQuestion(): OnboardingQuestion {
    return {
        id: v4(),
        title: '',
        description: '',
        type: 'single',
        varName: '',
        required: false,
        options: [{ label: '', value: '' }],
    }
}

/** The character's onboarding, or null when it is disabled or has nothing to show. */
export function getActiveOnboarding(char: character | groupChat | undefined): CharacterOnboarding | null {
    if (!char || char.type === 'group') {
        return null
    }
    const onboarding = char.onboarding
    if (!onboarding?.enabled) {
        return null
    }
    if (onboarding.mode === 'html') {
        return onboarding.html?.trim() ? onboarding : null
    }
    return onboarding.questions?.length > 0 ? onboarding : null
}

export function isOnboardingPending(char: character | groupChat | undefined, chat: Chat | undefined): boolean {
    return !!chat && !chat.onboardingDone && getActiveOnboarding(char) !== null
}

/** Reads the current value of a chat variable, or undefined when it is unset. */
export function readOnboardingVar(varName: string): string | undefined {
    const value = getChatVar(varName)
    return value === 'null' ? undefined : value
}

/** Multiple-choice answers are stored as a JSON array, the same format CBS array functions use. */
export function parseMultipleValue(value: string | undefined): string[] {
    if (!value) {
        return []
    }
    try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) {
            return parsed.map((v) => String(v))
        }
    } catch {}
    return [value]
}

export function stringifyMultipleValue(values: string[]): string {
    return JSON.stringify(values)
}

export function getOptionValue(option: { label: string, value: string }): string {
    return option.value !== '' ? option.value : option.label
}

export function readFormAnswers(questions: OnboardingQuestion[]): Record<string, string> {
    const answers: Record<string, string> = {}
    for (const question of questions) {
        if (!question.varName) {
            continue
        }
        const value = readOnboardingVar(question.varName)
        if (value !== undefined) {
            answers[question.varName] = value
        }
    }
    return answers
}

export function isQuestionAnswered(question: OnboardingQuestion, answers: Record<string, string>): boolean {
    const value = answers[question.varName]
    if (question.type === 'multiple') {
        return parseMultipleValue(value).length > 0
    }
    return !!value && value.trim() !== ''
}

/** Writes the answers to the current chat's variables and marks its onboarding as done. */
export function applyOnboardingAnswers(chat: Chat, answers: Record<string, string>) {
    for (const [varName, value] of Object.entries(answers)) {
        if (varName) {
            setChatVar(varName, value)
        }
    }
    chat.onboardingDone = true
}

/** Coerces onboarding data from an imported card into a well-formed shape, or undefined. */
export function normalizeOnboarding(raw: unknown): CharacterOnboarding | undefined {
    if (!raw || typeof raw !== 'object') {
        return undefined
    }
    const data = raw as Partial<CharacterOnboarding>
    const str = (v: unknown) => (typeof v === 'string' ? v : '')
    const questions = Array.isArray(data.questions) ? data.questions : []
    return {
        enabled: data.enabled === true,
        mode: data.mode === 'html' ? 'html' : 'form',
        title: str(data.title),
        description: str(data.description),
        html: str(data.html),
        floatingButton: data.floatingButton === true,
        questions: questions.filter((q) => q && typeof q === 'object').map((q) => ({
            id: str(q.id) || v4(),
            title: str(q.title),
            description: str(q.description),
            type: q.type === 'multiple' || q.type === 'text' ? q.type : 'single',
            varName: str(q.varName),
            required: q.required === true,
            placeholder: str(q.placeholder),
            options: (Array.isArray(q.options) ? q.options : [])
                .filter((o) => o && typeof o === 'object')
                .map((o) => ({ label: str(o.label), value: str(o.value) })),
        })),
    }
}

import type { ModelModeExtended } from '../process/request/shared'

/** What a request was made for (main chat, memory, translation...). */
export type UsagePurpose = ModelModeExtended

export const usagePurposes: UsagePurpose[] = ['model', 'submodel', 'memory', 'translate', 'emotion', 'otherAx']

/**
 * Token counts of a single API response, as reported by the provider.
 * A missing field means the provider did not report it.
 *
 * Prompt tokens are split so that `input + cacheRead + cacheWrite` is the whole prompt,
 * which lets each part be priced on its own.
 */
export interface TokenUsage {
    /** Prompt tokens billed at the normal input price. */
    input?: number
    /** Prompt tokens served from the provider's prompt cache. */
    cacheRead?: number
    /** Prompt tokens written to the provider's prompt cache. */
    cacheWrite?: number
    /** Generated tokens, including reasoning. */
    output?: number
    /** Reasoning tokens. Already part of `output`. */
    reasoning?: number
}

/** Usage summed over many requests. Same token fields as {@link TokenUsage}, but always present. */
export interface UsageCounters {
    requests: number
    input: number
    cacheRead: number
    cacheWrite: number
    output: number
    reasoning: number
    /** How many of the requests had token counts estimated with the local tokenizer. */
    estimated: number
}

/** Usage is grouped by these three things. The same model behind two providers is two buckets. */
export interface UsageBucket {
    provider: string
    model: string
    purpose: UsagePurpose
}

/** Usage by day ("YYYY-MM-DD", local time), then by {@link bucketKey}. */
export type UsageDays = Record<string, Record<string, UsageCounters>>

/** The stored form of one month of usage. One document per month keeps every write small. */
export interface UsageMonth {
    version: 1
    days: UsageDays
}

const keySeparator = '\u001f'

export function bucketKey(bucket: UsageBucket): string {
    return [bucket.provider, bucket.model, bucket.purpose].join(keySeparator)
}

export function parseBucketKey(key: string): UsageBucket {
    const [provider = '', model = '', purpose = 'model'] = key.split(keySeparator)
    return { provider, model, purpose: purpose as UsagePurpose }
}

export function emptyCounters(): UsageCounters {
    return { requests: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, reasoning: 0, estimated: 0 }
}

export function addCounters(target: UsageCounters, add: UsageCounters): UsageCounters {
    target.requests += add.requests
    target.input += add.input
    target.cacheRead += add.cacheRead
    target.cacheWrite += add.cacheWrite
    target.output += add.output
    target.reasoning += add.reasoning
    target.estimated += add.estimated
    return target
}

export function totalTokens(counters: UsageCounters): number {
    return counters.input + counters.cacheRead + counters.cacheWrite + counters.output
}

/** Adds `counters` to `days[day][key]`, creating entries as needed. */
export function addToDays(days: UsageDays, day: string, key: string, counters: UsageCounters) {
    days[day] ??= {}
    days[day][key] ??= emptyCounters()
    addCounters(days[day][key], counters)
}

export function mergeDays(target: UsageDays, source: UsageDays): UsageDays {
    for(const [day, buckets] of Object.entries(source)){
        for(const [key, counters] of Object.entries(buckets)){
            addToDays(target, day, key, counters)
        }
    }
    return target
}

function pad(n: number): string {
    return n.toString().padStart(2, '0')
}

/** "YYYY-MM-DD" in local time. */
export function toDayKey(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromDayKey(day: string): Date {
    const [year, month, date] = day.split('-').map(Number)
    return new Date(year, month - 1, date)
}

/** "YYYY-MM" of a day key. */
export function monthOfDay(day: string): string {
    return day.slice(0, 7)
}

import { describe, expect, it } from 'vitest'

import {
    addToDays,
    bucketKey,
    emptyCounters,
    fromDayKey,
    mergeDays,
    parseBucketKey,
    toDayKey,
    totalTokens,
    type UsageDays,
} from '../types'

describe('bucketKey', () => {
    it('round-trips model names that contain slashes and colons', () => {
        const bucket = { provider: 'openrouter', model: 'anthropic/claude-sonnet-4.5:beta', purpose: 'memory' as const }
        expect(parseBucketKey(bucketKey(bucket))).toEqual(bucket)
    })

    it('keeps the same model behind two providers apart', () => {
        const direct = bucketKey({ provider: 'anthropic', model: 'claude-sonnet-4-5', purpose: 'model' })
        const proxied = bucketKey({ provider: 'api.example.com', model: 'claude-sonnet-4-5', purpose: 'model' })
        expect(direct).not.toBe(proxied)
    })
})

describe('day keys', () => {
    it('formats local dates with zero padding', () => {
        expect(toDayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    })

    it('round-trips through fromDayKey', () => {
        expect(toDayKey(fromDayKey('2024-02-29'))).toBe('2024-02-29')
    })
})

describe('mergeDays', () => {
    it('adds counters of the same day and bucket', () => {
        const counters = { ...emptyCounters(), requests: 1, input: 100, output: 20 }
        const target: UsageDays = {}
        addToDays(target, '2026-10-01', 'a', counters)

        mergeDays(target, { '2026-10-01': { a: counters, b: counters }, '2026-10-02': { a: counters } })

        expect(target['2026-10-01'].a.requests).toBe(2)
        expect(totalTokens(target['2026-10-01'].a)).toBe(240)
        expect(target['2026-10-01'].b.input).toBe(100)
        expect(target['2026-10-02'].a.output).toBe(20)
    })

    it('does not share counter objects with the source', () => {
        const source: UsageDays = { '2026-10-01': { a: { ...emptyCounters(), input: 1 } } }
        const target = mergeDays({}, source)
        target['2026-10-01'].a.input += 1
        expect(source['2026-10-01'].a.input).toBe(1)
    })
})

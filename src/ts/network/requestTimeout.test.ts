import { describe, expect, it } from 'vitest'
import {
    DEFAULT_API_REQUEST_TIMEOUT_SEC,
    MAX_API_REQUEST_TIMEOUT_SEC,
    normalizeApiRequestTimeoutSec,
} from './requestTimeout'

describe('normalizeApiRequestTimeoutSec', () => {
    it('uses the default for missing or invalid values', () => {
        expect(normalizeApiRequestTimeoutSec(undefined)).toBe(DEFAULT_API_REQUEST_TIMEOUT_SEC)
        expect(normalizeApiRequestTimeoutSec(Number.NaN)).toBe(DEFAULT_API_REQUEST_TIMEOUT_SEC)
        expect(normalizeApiRequestTimeoutSec(0)).toBe(DEFAULT_API_REQUEST_TIMEOUT_SEC)
    })

    it('normalizes configured values to supported whole seconds', () => {
        expect(normalizeApiRequestTimeoutSec(120.9)).toBe(120)
        expect(normalizeApiRequestTimeoutSec(MAX_API_REQUEST_TIMEOUT_SEC + 1)).toBe(MAX_API_REQUEST_TIMEOUT_SEC)
    })
})

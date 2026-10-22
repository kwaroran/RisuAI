export const DEFAULT_API_REQUEST_TIMEOUT_SEC = 600
export const MAX_API_REQUEST_TIMEOUT_SEC = 10800

export function normalizeApiRequestTimeoutSec(value: unknown) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        return DEFAULT_API_REQUEST_TIMEOUT_SEC
    }

    return Math.min(MAX_API_REQUEST_TIMEOUT_SEC, Math.max(1, Math.floor(value)))
}

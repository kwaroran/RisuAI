import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkCodeSafety, type CheckResult } from './pluginSafety'

vi.mock(import('../parser/parser.svelte'), () => ({
    hasher: async () => 'import-options',
}))

describe('plugin safety import options', () => {
    afterEach(() => {
        localStorage.clear()
    })

    it('rechecks cached code and visits restricted identifiers in import options', async () => {
        const code = 'import("plugin", { with: { type: cookieStore } });'
        const cached: CheckResult = {
            isSafe: false,
            errors: [
                {
                    message:
                        'Code passed safety checks but may still be unsafe due to limitations in static analysis.',
                    userAlertKey: 'errorInVerification',
                },
            ],
            checkerVersion: 3,
            modifiedCode: code,
        }
        localStorage.setItem('safety-import-options', JSON.stringify(cached))

        const result = await checkCodeSafety(code)

        expect(result.isSafe).toBe(false)
        expect(result.errors).toContainEqual({
            message: 'Access to "cookieStore" is forbidden.',
            userAlertKey: 'storageAccess',
        })
        expect(
            JSON.parse(localStorage.getItem('safety-import-options')!)
        ).toEqual(result)
    })
})

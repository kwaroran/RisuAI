import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDatabase = vi.hoisted(() => ({
    seperateParametersEnabled: false,
    seperateParametersByModel: false,
    reasoningEffort: 0,
}))

vi.mock('src/ts/storage/database.svelte', () => ({
    getDatabase: () => mockDatabase,
}))

import { applyParameters, type LLMParameter } from '../shared'

const baseArgs = {
    modelId: 'gpt-5.6',
}

describe('applyParameters reasoning effort capabilities', () => {
    beforeEach(() => {
        mockDatabase.reasoningEffort = 0
    })

    it('maps GPT-5.6 max effort for Responses API requests', () => {
        mockDatabase.reasoningEffort = 4
        const parameters: LLMParameter[] = [
            'reasoning_effort',
            'reasoning_effort_none',
            'reasoning_effort_xhigh',
            'reasoning_effort_max',
        ]

        expect(applyParameters({}, parameters, {
            reasoning_effort: 'reasoning.effort',
        }, 'model', baseArgs)).toEqual({
            reasoning: {
                effort: 'max',
            },
        })
    })

    it('falls back to xhigh when the selected model does not support max', () => {
        mockDatabase.reasoningEffort = 4
        const parameters: LLMParameter[] = [
            'reasoning_effort',
            'reasoning_effort_none',
            'reasoning_effort_xhigh',
        ]

        expect(applyParameters({}, parameters, {}, 'model', baseArgs)).toEqual({
            reasoning_effort: 'xhigh',
        })
    })
})

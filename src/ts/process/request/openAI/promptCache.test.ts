import { describe, expect, it } from 'vitest'

import { addPromptCacheBreakpoint, applyGPT56ChatCachePoints, responsesCacheableContentTypes } from './promptCache'

describe('OpenAI GPT-5.6 explicit prompt caching', () => {
    it('converts a GPT-5.6 chat cache point into a text content breakpoint', () => {
        expect(applyGPT56ChatCachePoints([
            { role: 'system', content: 'Stable instructions', cachePoint: true },
            { role: 'user', content: 'Changing request' },
        ], 'gpt-5.6-sol')).toEqual([
            {
                role: 'system',
                content: [{
                    type: 'text',
                    text: 'Stable instructions',
                    prompt_cache_breakpoint: { mode: 'explicit' },
                }],
            },
            { role: 'user', content: 'Changing request' },
        ])
    })

    it('places a multimodal chat breakpoint on the final cacheable block', () => {
        expect(applyGPT56ChatCachePoints([{
            role: 'user',
            cachePoint: true,
            content: [
                { type: 'image_url', image_url: { url: 'image', detail: 'auto' } },
                { type: 'text', text: 'Stable caption' },
            ],
        }], 'gpt-5.6')[0].content).toEqual([
            { type: 'image_url', image_url: { url: 'image', detail: 'auto' } },
            {
                type: 'text',
                text: 'Stable caption',
                prompt_cache_breakpoint: { mode: 'explicit' },
            },
        ])
    })

    it('strips internal cache points from models before GPT-5.6', () => {
        expect(applyGPT56ChatCachePoints([
            { role: 'system', content: 'Stable instructions', cachePoint: true },
        ], 'gpt-5.5')).toEqual([
            { role: 'system', content: 'Stable instructions' },
        ])
    })

    it('supports OpenAI-compatible custom models using a GPT-5.6 request model', () => {
        expect(applyGPT56ChatCachePoints([
            { role: 'system', content: 'Stable instructions', cachePoint: true },
        ], 'gpt-5.6-luna')).toEqual([
            {
                role: 'system',
                content: [{
                    type: 'text',
                    text: 'Stable instructions',
                    prompt_cache_breakpoint: { mode: 'explicit' },
                }],
            },
        ])
    })

    it('places a Responses breakpoint on the final supported input block', () => {
        expect(addPromptCacheBreakpoint([
            { type: 'input_text', text: 'Stable instructions' },
            { type: 'input_file', file_data: 'file' },
        ], responsesCacheableContentTypes)).toEqual([
            { type: 'input_text', text: 'Stable instructions' },
            {
                type: 'input_file',
                file_data: 'file',
                prompt_cache_breakpoint: { mode: 'explicit' },
            },
        ])
    })
})

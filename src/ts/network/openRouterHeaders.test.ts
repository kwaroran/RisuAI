import { describe, expect, it } from 'vitest'

import { withOpenRouterAttributionHeaders } from './openRouterHeaders'

describe('withOpenRouterAttributionHeaders', () => {
    it('adds attribution headers for OpenRouter and its subdomains', () => {
        expect(withOpenRouterAttributionHeaders('https://openrouter.ai/api/v1/chat/completions')).toEqual({
            'HTTP-Referer': 'https://risuai.xyz',
            'X-OpenRouter-Title': 'Risuai',
        })
        expect(withOpenRouterAttributionHeaders('https://api.openrouter.ai/v1/models')).toEqual({
            'HTTP-Referer': 'https://risuai.xyz',
            'X-OpenRouter-Title': 'Risuai',
        })
    })

    it('does not modify requests to other or misleading hosts', () => {
        const headers = { Authorization: 'Bearer test-key' }

        expect(withOpenRouterAttributionHeaders('https://example.com/v1/chat', headers)).toBe(headers)
        expect(withOpenRouterAttributionHeaders('https://openrouter.ai.example.com/v1/chat', headers)).toBe(headers)
        expect(withOpenRouterAttributionHeaders('not-a-url', headers)).toBe(headers)
    })

    it('preserves custom attribution headers without regard to casing', () => {
        const headers = {
            Authorization: 'Bearer test-key',
            'http-referer': 'https://plugin.example',
            'x-openrouter-title': 'Plugin App',
        }

        expect(withOpenRouterAttributionHeaders('https://openrouter.ai/api/v1/chat/completions', headers)).toEqual(headers)
        expect(headers).toEqual({
            Authorization: 'Bearer test-key',
            'http-referer': 'https://plugin.example',
            'x-openrouter-title': 'Plugin App',
        })
    })

    it('treats the legacy X-Title header as a custom title', () => {
        const result = withOpenRouterAttributionHeaders('https://openrouter.ai/api/v1/chat/completions', {
            'X-Title': 'Legacy Plugin App',
        })

        expect(result).toEqual({
            'X-Title': 'Legacy Plugin App',
            'HTTP-Referer': 'https://risuai.xyz',
        })
        expect(result).not.toHaveProperty('X-OpenRouter-Title')
    })

    it('preserves Headers instances from plugin RequestInit options', () => {
        const input = new Headers({ Authorization: 'Bearer plugin-key' })
        const result = new Headers(withOpenRouterAttributionHeaders(
            'https://openrouter.ai/api/v1/chat/completions',
            input,
        ))

        expect(result.get('Authorization')).toBe('Bearer plugin-key')
        expect(result.get('HTTP-Referer')).toBe('https://risuai.xyz')
        expect(result.get('X-OpenRouter-Title')).toBe('Risuai')
        expect(input.has('HTTP-Referer')).toBe(false)
    })

    it('preserves tuple-array headers from plugin RequestInit options', () => {
        const input: [string, string][] = [['Authorization', 'Bearer plugin-key']]
        const result = new Headers(withOpenRouterAttributionHeaders(
            'https://openrouter.ai/api/v1/chat/completions',
            input,
        ))

        expect(result.get('Authorization')).toBe('Bearer plugin-key')
        expect(result.get('HTTP-Referer')).toBe('https://risuai.xyz')
        expect(result.get('X-OpenRouter-Title')).toBe('Risuai')
        expect(input).toEqual([['Authorization', 'Bearer plugin-key']])
    })

    it('joins repeated tuple-array header values like the Headers API', () => {
        const result = new Headers(withOpenRouterAttributionHeaders(
            'https://openrouter.ai/api/v1/chat/completions',
            [['X-Plugin-Value', 'one'], ['x-plugin-value', 'two']],
        ))

        expect(result.get('X-Plugin-Value')).toBe('one, two')
    })

    it('does not restore attribution headers explicitly removed after applying defaults', () => {
        const headers = withOpenRouterAttributionHeaders('https://openrouter.ai/api/v1/chat/completions')
        delete headers['HTTP-Referer']
        delete headers['X-OpenRouter-Title']

        expect(withOpenRouterAttributionHeaders('https://openrouter.ai/api/v1/chat/completions', headers)).toBe(headers)
        expect(headers).not.toHaveProperty('HTTP-Referer')
        expect(headers).not.toHaveProperty('X-OpenRouter-Title')
    })
})

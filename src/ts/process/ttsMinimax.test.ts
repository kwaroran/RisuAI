import { describe, expect, it } from 'vitest'
import {
    buildMinimaxTTSRequest,
    decodeMinimaxTTSAudio,
    defaultMinimaxTTSConfig,
    minimaxTTSDefaultModel,
    minimaxTTSEndpoint,
    minimaxTTSMimeType,
    minimaxTTSModels,
    minimaxTTSRegions,
} from './ttsMinimax'

describe('minimax speech models and endpoints', () => {
    it('exposes the current speech models with the HD default', () => {
        expect([...minimaxTTSModels]).toEqual([
            'speech-2.8-hd',
            'speech-2.8-turbo',
            'speech-2.6-hd',
            'speech-2.6-turbo',
            'speech-02-hd',
            'speech-02-turbo',
            'speech-01-hd',
            'speech-01-turbo',
        ])
        expect(minimaxTTSDefaultModel).toBe('speech-2.8-hd')
    })

    it('exposes the global and CN endpoints', () => {
        expect(minimaxTTSRegions.map((region) => region.id)).toEqual(['global_en', 'cn_zh'])
        expect(minimaxTTSEndpoint('global_en')).toBe('https://api.minimax.io/v1/t2a_v2')
        expect(minimaxTTSEndpoint('cn_zh')).toBe('https://api.minimaxi.com/v1/t2a_v2')
    })

    it('falls back to the global endpoint for an unknown region', () => {
        expect(minimaxTTSEndpoint(undefined)).toBe('https://api.minimax.io/v1/t2a_v2')
        expect(minimaxTTSEndpoint('somewhere-else')).toBe('https://api.minimax.io/v1/t2a_v2')
    })

    it('maps audio formats to playable mime types', () => {
        expect(minimaxTTSMimeType('mp3')).toBe('audio/mpeg')
        expect(minimaxTTSMimeType('wav')).toBe('audio/wav')
        expect(minimaxTTSMimeType('flac')).toBe('audio/flac')
        expect(minimaxTTSMimeType(undefined)).toBe('audio/mpeg')
        expect(minimaxTTSMimeType('not-a-format')).toBe('audio/mpeg')
    })

    it('produces a usable default config', () => {
        const config = defaultMinimaxTTSConfig()
        expect(config.region).toBe('global_en')
        expect(config.model).toBe(minimaxTTSDefaultModel)
        expect(config.format).toBe('mp3')
        expect(config.speed).toBe(1)
        expect(config.vol).toBe(1)
        expect(config.pitch).toBe(0)
    })
})

describe('buildMinimaxTTSRequest', () => {
    it('builds a hex request against the selected regional endpoint', () => {
        const request = buildMinimaxTTSRequest('hello there', {
            region: 'cn_zh',
            model: 'speech-2.6-turbo',
            voiceId: 'my-voice',
            format: 'wav',
        })

        expect(request.url).toBe('https://api.minimaxi.com/v1/t2a_v2')
        expect(request.body).toEqual({
            model: 'speech-2.6-turbo',
            text: 'hello there',
            stream: false,
            output_format: 'hex',
            voice_setting: {
                voice_id: 'my-voice',
                speed: 1,
                vol: 1,
                pitch: 0,
            },
            audio_setting: { format: 'wav' },
        })
    })

    it('applies model and format defaults', () => {
        const request = buildMinimaxTTSRequest('hi', { voiceId: 'v' })

        expect(request.url).toBe('https://api.minimax.io/v1/t2a_v2')
        expect(request.body.model).toBe(minimaxTTSDefaultModel)
        expect(request.body.audio_setting.format).toBe('mp3')
    })

    it('falls back to mp3 for an unsupported format', () => {
        const request = buildMinimaxTTSRequest('hi', { voiceId: 'v', format: 'ogg' as never })

        expect(request.body.audio_setting.format).toBe('mp3')
    })

    it('clamps voice settings into the accepted ranges', () => {
        const tooHigh = buildMinimaxTTSRequest('hi', { voiceId: 'v', speed: 9, vol: 50, pitch: 40 })
        expect(tooHigh.body.voice_setting.speed).toBe(2)
        expect(tooHigh.body.voice_setting.vol).toBe(10)
        expect(tooHigh.body.voice_setting.pitch).toBe(12)

        const tooLow = buildMinimaxTTSRequest('hi', { voiceId: 'v', speed: 0, vol: 0, pitch: -40 })
        expect(tooLow.body.voice_setting.speed).toBe(0.5)
        expect(tooLow.body.voice_setting.vol).toBe(0.1)
        expect(tooLow.body.voice_setting.pitch).toBe(-12)
    })

    it('rounds pitch to a whole step and ignores non numeric settings', () => {
        const request = buildMinimaxTTSRequest('hi', {
            voiceId: 'v',
            pitch: 3.6,
            speed: Number.NaN,
            vol: undefined,
        })

        expect(request.body.voice_setting.pitch).toBe(4)
        expect(request.body.voice_setting.speed).toBe(1)
        expect(request.body.voice_setting.vol).toBe(1)
    })

    it('omits optional fields when they are empty', () => {
        const request = buildMinimaxTTSRequest('hi', { voiceId: 'v', emotion: '', languageBoost: '   ' })

        expect(request.body.voice_setting.emotion).toBeUndefined()
        expect(request.body.language_boost).toBeUndefined()
    })

    it('passes the emotion and language hint through when set', () => {
        const request = buildMinimaxTTSRequest('hi', { voiceId: 'v', emotion: 'happy', languageBoost: 'English' })

        expect(request.body.voice_setting.emotion).toBe('happy')
        expect(request.body.language_boost).toBe('English')
    })

    it('refuses a missing voice id or empty text', () => {
        expect(() => buildMinimaxTTSRequest('hi', { voiceId: '  ' })).toThrow(/voice ID is not set/)
        expect(() => buildMinimaxTTSRequest('hi', {})).toThrow(/voice ID is not set/)
        expect(() => buildMinimaxTTSRequest('   ', { voiceId: 'v' })).toThrow(/text is empty/)
    })
})

describe('decodeMinimaxTTSAudio', () => {
    it('decodes the hex encoded audio payload', () => {
        const audio = decodeMinimaxTTSAudio({
            data: { audio: '00ff102A', status: 2 },
            base_resp: { status_code: 0, status_msg: 'success' },
        })

        expect(Array.from(new Uint8Array(audio))).toEqual([0, 255, 16, 42])
        expect(audio.byteLength).toBe(4)
    })

    it('accepts a response without a base_resp envelope', () => {
        const audio = decodeMinimaxTTSAudio({ data: { audio: 'abcd' } })

        expect(Array.from(new Uint8Array(audio))).toEqual([171, 205])
    })

    it('reports a failure carried in base_resp', () => {
        expect(() => decodeMinimaxTTSAudio({
            data: null,
            base_resp: { status_code: 1004, status_msg: 'authentication failed' },
        })).toThrow(/1004.*authentication failed/)
    })

    it('reports a failure without a status message', () => {
        expect(() => decodeMinimaxTTSAudio({ base_resp: { status_code: 1002 } })).toThrow(/1002.*unknown error/)
    })

    it('rejects a response without audio', () => {
        expect(() => decodeMinimaxTTSAudio({ data: null })).toThrow(/did not contain audio data/)
        expect(() => decodeMinimaxTTSAudio({ data: { audio: '' } })).toThrow(/did not contain audio data/)
        expect(() => decodeMinimaxTTSAudio({})).toThrow(/did not contain audio data/)
    })

    it('rejects malformed hex audio', () => {
        expect(() => decodeMinimaxTTSAudio({ data: { audio: 'abc' } })).toThrow(/malformed audio data/)
        expect(() => decodeMinimaxTTSAudio({ data: { audio: 'zzzz' } })).toThrow(/malformed audio data/)
    })

    it('rejects a non object response', () => {
        expect(() => decodeMinimaxTTSAudio('not json')).toThrow(/not valid JSON/)
        expect(() => decodeMinimaxTTSAudio(null)).toThrow(/not valid JSON/)
    })
})

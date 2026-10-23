/**
 * MiniMax native text-to-speech support.
 *
 * The synchronous speech endpoint takes a JSON body and answers with a JSON
 * envelope instead of raw audio bytes: the rendered audio arrives as a hex
 * string in `data.audio`, and transport level failures are reported inside
 * `base_resp` while the HTTP status stays 200. Request building and response
 * decoding therefore live here as dependency free pure functions so the
 * provider case in tts.ts stays a thin wiring layer and both halves can be
 * unit tested without an AudioContext.
 */

/** Regional variants of the same speech endpoint. */
export const minimaxTTSRegions = [
    { id: 'global_en', name: 'Global', url: 'https://api.minimax.io/v1/t2a_v2' },
    { id: 'cn_zh', name: 'Mainland China', url: 'https://api.minimaxi.com/v1/t2a_v2' },
] as const

export type MinimaxTTSRegion = (typeof minimaxTTSRegions)[number]['id']

export const minimaxTTSDefaultRegion: MinimaxTTSRegion = 'global_en'

/** Speech models accepted by the endpoint, newest first. */
export const minimaxTTSModels = [
    'speech-2.8-hd',
    'speech-2.8-turbo',
    'speech-2.6-hd',
    'speech-2.6-turbo',
    'speech-02-hd',
    'speech-02-turbo',
    'speech-01-hd',
    'speech-01-turbo',
] as const

export type MinimaxTTSModel = (typeof minimaxTTSModels)[number]

export const minimaxTTSDefaultModel: MinimaxTTSModel = 'speech-2.8-hd'

export const minimaxTTSFormats = ['mp3', 'wav', 'flac', 'pcm'] as const

export type MinimaxTTSFormat = (typeof minimaxTTSFormats)[number]

export const minimaxTTSDefaultFormat: MinimaxTTSFormat = 'mp3'

/** Emotions the voice setting accepts; an empty value leaves the choice to the model. */
export const minimaxTTSEmotions = [
    'happy',
    'sad',
    'angry',
    'fearful',
    'disgusted',
    'surprised',
    'calm',
] as const

export type MinimaxTTSEmotion = (typeof minimaxTTSEmotions)[number]

/**
 * Bounds documented for the voice setting fields. Values are clamped instead of
 * rejected so a stale character card cannot make every request fail with an
 * invalid parameter error.
 */
export const minimaxTTSVoiceLimits = {
    speed: { min: 0.5, max: 2, default: 1 },
    vol: { min: 0.1, max: 10, default: 1 },
    pitch: { min: -12, max: 12, default: 0 },
} as const

/** Per character MiniMax speech settings. Every field falls back to a documented default. */
export interface MinimaxTTSConfig {
    /** Regional endpoint to call. Falls back to the global endpoint. */
    region?: MinimaxTTSRegion
    /** Speech model id. Falls back to the newest HD model. */
    model?: string
    /** Voice id to render with. Required by the endpoint, so an empty value is refused early. */
    voiceId?: string
    /** Playback rate, clamped to the documented range. */
    speed?: number
    /** Loudness multiplier, clamped to the documented range. */
    vol?: number
    /** Pitch offset in semitones, clamped and rounded to a whole step. */
    pitch?: number
    /** Optional emotion hint; an empty value omits the field. */
    emotion?: string
    /** Container of the returned audio. Falls back to mp3. */
    format?: MinimaxTTSFormat
    /** Optional language hint passed straight through, e.g. 'English' or 'auto'. */
    languageBoost?: string
}

/** Shape of the request body the speech endpoint expects. */
export interface MinimaxTTSRequestBody {
    model: string
    text: string
    stream: false
    output_format: 'hex'
    voice_setting: {
        voice_id: string
        speed: number
        vol: number
        pitch: number
        emotion?: string
    }
    audio_setting: {
        format: MinimaxTTSFormat
    }
    language_boost?: string
}

export interface MinimaxTTSRequest {
    url: string
    body: MinimaxTTSRequestBody
}

/**
 * Raw PCM is offered because the endpoint renders it, but it has no container,
 * so only the framed formats can be handed to AudioContext.decodeAudioData.
 */
const minimaxTTSMimeTypes: Record<MinimaxTTSFormat, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    pcm: 'audio/L16',
}

export function minimaxTTSMimeType(format?: string): string {
    return minimaxTTSMimeTypes[format as MinimaxTTSFormat] ?? minimaxTTSMimeTypes[minimaxTTSDefaultFormat]
}

/** Resolve a stored region id to its endpoint URL, falling back to the global one. */
export function minimaxTTSEndpoint(region?: string): string {
    const found = minimaxTTSRegions.find((candidate) => candidate.id === region)
    return (found ?? minimaxTTSRegions[0]).url
}

function clamp(value: number | undefined, limit: { min: number; max: number; default: number }): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return limit.default
    }
    return Math.min(limit.max, Math.max(limit.min, value))
}

/** Default config used when a character has no MiniMax speech settings yet. */
export function defaultMinimaxTTSConfig(): MinimaxTTSConfig {
    return {
        region: minimaxTTSDefaultRegion,
        model: minimaxTTSDefaultModel,
        voiceId: '',
        speed: minimaxTTSVoiceLimits.speed.default,
        vol: minimaxTTSVoiceLimits.vol.default,
        pitch: minimaxTTSVoiceLimits.pitch.default,
        emotion: '',
        format: minimaxTTSDefaultFormat,
        languageBoost: '',
    }
}

/**
 * Build the endpoint URL and request body for one utterance.
 *
 * Throws when the text or the voice id is missing, because the endpoint rejects
 * both and a thrown error surfaces as a readable TTS alert.
 */
export function buildMinimaxTTSRequest(text: string, config: MinimaxTTSConfig = {}): MinimaxTTSRequest {
    if (!text || text.trim() === '') {
        throw new Error('MiniMax TTS text is empty')
    }

    const voiceId = (config.voiceId ?? '').trim()
    if (voiceId === '') {
        throw new Error('MiniMax TTS voice ID is not set')
    }

    const format = minimaxTTSFormats.includes(config.format as MinimaxTTSFormat)
        ? (config.format as MinimaxTTSFormat)
        : minimaxTTSDefaultFormat

    const voiceSetting: MinimaxTTSRequestBody['voice_setting'] = {
        voice_id: voiceId,
        speed: clamp(config.speed, minimaxTTSVoiceLimits.speed),
        vol: clamp(config.vol, minimaxTTSVoiceLimits.vol),
        pitch: Math.round(clamp(config.pitch, minimaxTTSVoiceLimits.pitch)),
    }

    const emotion = (config.emotion ?? '').trim()
    if (emotion !== '') {
        voiceSetting.emotion = emotion
    }

    const body: MinimaxTTSRequestBody = {
        model: (config.model ?? '').trim() || minimaxTTSDefaultModel,
        text,
        // Hex output keeps the response a single JSON envelope, which is what
        // decodeMinimaxTTSAudio below is written against.
        stream: false,
        output_format: 'hex',
        voice_setting: voiceSetting,
        audio_setting: { format },
    }

    const languageBoost = (config.languageBoost ?? '').trim()
    if (languageBoost !== '') {
        body.language_boost = languageBoost
    }

    return { url: minimaxTTSEndpoint(config.region), body }
}

function hexToAudioBuffer(hex: string): ArrayBuffer {
    const cleaned = hex.trim()
    if (cleaned === '') {
        throw new Error('MiniMax TTS response contained empty audio data')
    }
    if (cleaned.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(cleaned)) {
        throw new Error('MiniMax TTS response contained malformed audio data')
    }

    // The buffer is allocated at its exact size so it can be handed to the
    // audio pipeline without an extra slice.
    const buffer = new ArrayBuffer(cleaned.length / 2)
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16)
    }
    return buffer
}

/**
 * Turn a decoded JSON response into playable audio bytes.
 *
 * The endpoint answers with HTTP 200 even for authentication or quota failures
 * and reports them through `base_resp.status_code`, so that envelope is checked
 * before the audio field is read. `data` itself may be null on failure.
 */
export function decodeMinimaxTTSAudio(response: unknown): ArrayBuffer {
    if (!response || typeof response !== 'object') {
        throw new Error('MiniMax TTS response was not valid JSON')
    }

    const envelope = response as {
        data?: { audio?: unknown } | null
        base_resp?: { status_code?: unknown; status_msg?: unknown } | null
    }

    const statusCode = envelope.base_resp?.status_code
    if (typeof statusCode === 'number' && statusCode !== 0) {
        const statusMessage = typeof envelope.base_resp?.status_msg === 'string' && envelope.base_resp.status_msg !== ''
            ? envelope.base_resp.status_msg
            : 'unknown error'
        throw new Error(`MiniMax TTS request failed (${statusCode}): ${statusMessage}`)
    }

    const audio = envelope.data?.audio
    if (typeof audio !== 'string' || audio === '') {
        throw new Error('MiniMax TTS response did not contain audio data')
    }

    return hexToAudioBuffer(audio)
}

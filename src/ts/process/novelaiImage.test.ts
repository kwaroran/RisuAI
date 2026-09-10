import { describe, expect, it } from 'vitest'
import {
    applyNovelAiImg2Img,
    buildNovelAiRequestBody,
    fitNaiGenerationResolution,
    formatNovelAiPrompt,
    isNovelAiV5Model,
    novelAiModelCapabilities,
    type NovelAiGenerationConfig,
} from './novelaiImage'

const baseConfig: NovelAiGenerationConfig = {
    prompt: '1girl, portrait',
    negativePrompt: 'blurry',
    model: 'nai-diffusion-4-5-full',
    width: 1024,
    height: 1024,
    sampler: 'k_euler_ancestral',
    steps: 28,
    scale: 5,
    cfgRescale: 0,
    noiseSchedule: 'native',
    seed: 123,
    extraNoiseSeed: 456,
    decrisp: false,
    sm: false,
    smDyn: false,
    legacyUc: false,
    varietyPlus: false,
}

describe('NovelAI model capabilities', () => {
    it('recognizes V5 and disables unsupported legacy features', () => {
        expect(isNovelAiV5Model('nai-diffusion-5-curated')).toBe(true)
        expect(isNovelAiV5Model('nai-diffusion-4-5-full')).toBe(false)
        expect(novelAiModelCapabilities('nai-diffusion-5-full')).toEqual({
            vibes: false,
            characterReferences: false,
            variety: false,
            noiseScheduleSelection: false,
            transparency: true,
            maxCharacters: 32,
        })
    })
})

describe('NovelAI resolution fitting', () => {
    it('snaps dimensions to multiples of 64', () => {
        expect(fitNaiGenerationResolution(1000, 1000)).toEqual({ width: 1024, height: 1024 })
    })

    it('preserves the last-edited dimension under the 3 Mi pixel limit', () => {
        expect(fitNaiGenerationResolution(2560, 1440, 'height')).toEqual({
            width: 2112,
            height: 1472,
        })
        expect(fitNaiGenerationResolution(2560, 1440, 'width')).toEqual({
            width: 2560,
            height: 1216,
        })
    })

    it('allows dimensions above 2048 when their total area is valid', () => {
        expect(fitNaiGenerationResolution(3200, 768, 'width')).toEqual({
            width: 3200,
            height: 768,
        })
    })
})

describe('NovelAI prompt formatting', () => {
    it('keeps escaped parentheses and converts emphasis parentheses', () => {
        expect(formatNovelAiPrompt('girl, (smile), \\(literal\\)')).toBe(
            'girl, {smile}, (literal)'
        )
    })
})

describe('NovelAI payload building', () => {
    it('preserves the existing V4.5 request contract', () => {
        const body = buildNovelAiRequestBody(baseConfig)

        expect(body).toMatchObject({
            action: 'generate',
            input: '1girl, portrait',
            model: 'nai-diffusion-4-5-full',
            parameters: {
                params_version: 3,
                width: 1024,
                height: 1024,
                negative_prompt: 'blurry',
                noise_schedule: 'native',
                ucPreset: 3,
                qualityToggle: false,
                legacy_uc: false,
                reference_image_multiple: [],
                reference_strength_multiple: [],
                skip_cfg_above_sigma: null,
            },
        })
        expect(body.parameters).not.toHaveProperty('tag_hint_qt')
        expect(body.parameters).not.toHaveProperty('characterPrompts')
    })

    it('uses the V5 payload version, hints, fixed noise schedule, and no legacy capabilities', () => {
        const body = buildNovelAiRequestBody({
            ...baseConfig,
            model: 'nai-diffusion-5-curated',
            varietyPlus: true,
        })

        expect(body).toMatchObject({
            model: 'nai-diffusion-5-curated',
            parameters: {
                params_version: 4,
                noise_schedule: 'karras',
                tag_hint_qt: 0,
                tag_hint_uc_preset: 4,
                image_format: 'png',
                characterPrompts: [],
            },
        })
        expect(body.parameters).not.toHaveProperty('legacy_uc')
        expect(body.parameters).not.toHaveProperty('reference_image_multiple')
        expect(body.parameters).not.toHaveProperty('director_reference_images')
        expect(body.parameters).not.toHaveProperty('skip_cfg_above_sigma')
        expect(body.parameters).not.toHaveProperty('extra_noise_seed')
    })

    it('merges V5 presets and keeps all character coordinate representations aligned', () => {
        const body = buildNovelAiRequestBody({
            ...baseConfig,
            model: 'nai-diffusion-5-full',
            prompt: '1girl\n# local note',
            qualityPreset: 'light',
            ucPreset: 4,
            useCoords: true,
            characterPrompts: [
                {
                    prompt: 'blue hair',
                    negativePrompt: 'hat',
                    center: { x: 0.17, y: 0.81 },
                },
                { prompt: '   ', center: { x: 0, y: 0 } },
            ],
        })

        expect(body.input).toBe('1girl, very aesthetic, amazing quality, no text')
        expect(body.parameters.negative_prompt).toBe('blurry')
        expect(body.parameters.v4_prompt.caption.char_captions[0].centers[0]).toEqual({
            x: 0.17,
            y: 0.81,
        })
        expect(body.parameters.v4_negative_prompt.caption.char_captions[0].centers[0]).toEqual(
            { x: 0.17, y: 0.81 }
        )
        expect(body.parameters.characterPrompts[0].center).toEqual({ x: 0.17, y: 0.81 })
        expect(body.parameters.characterPrompts).toHaveLength(1)
    })

    it('adds the V5 transparent-background prompt and alpha hints only when enabled', () => {
        const body = buildNovelAiRequestBody({
            ...baseConfig,
            model: 'nai-diffusion-5-curated',
            transparentBackground: true,
        })

        expect(body.input).toBe('1girl, portrait, transparent background')
        expect(body.parameters.straight_alpha).toBe(true)
        expect(body.parameters.tag_hint_transparent_background).toBe(true)
    })

    it('clamps character coordinates and limits V5 to 32 active characters', () => {
        const body = buildNovelAiRequestBody({
            ...baseConfig,
            model: 'nai-diffusion-5-curated',
            useCoords: true,
            characterPrompts: Array.from({ length: 33 }, (_, index) => ({
                prompt: `character ${index}`,
                center: { x: -1, y: 2 },
            })),
        })

        expect(body.parameters.characterPrompts).toHaveLength(32)
        expect(body.parameters.characterPrompts[0].center).toEqual({ x: 0, y: 1 })
    })

    it('adds the V5 img2img fields without changing the legacy text-to-image contract', () => {
        const body = applyNovelAiImg2Img(
            buildNovelAiRequestBody({
                ...baseConfig,
                model: 'nai-diffusion-5-curated',
            }),
            {
                imageBase64: 'source-image',
                strength: 0.7,
                noise: 0.1,
                extraNoiseSeed: 789,
            }
        )

        expect(body.action).toBe('img2img')
        expect(body.parameters).toMatchObject({
            image: 'source-image',
            strength: 0.7,
            noise: 0.1,
            extra_noise_seed: 789,
            color_correct: false,
        })
    })
})

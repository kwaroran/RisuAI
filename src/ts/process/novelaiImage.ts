export const NAI_V5_CURATED = 'nai-diffusion-5-curated'

export const NAI_RESOLUTION_STEP = 64
export const NAI_MIN_RESOLUTION = 64
export const NAI_MAX_GENERATION_PIXELS = 3 * 1024 * 1024

export type NaiUcPreset = 0 | 1 | 3 | 4
export type NaiQualityPreset = 'none' | 'standard' | 'light'
export type NaiResolutionDimension = 'width' | 'height'

export interface NaiCharacterPrompt {
    prompt: string
    negativePrompt?: string
    enabled?: boolean
    center?: {
        x: number
        y: number
    }
}

export interface NovelAiGenerationConfig {
    prompt: string
    negativePrompt: string
    model: string
    width: number
    height: number
    sampler: string
    steps: number
    scale: number
    cfgRescale: number
    noiseSchedule: string
    seed: number
    extraNoiseSeed: number
    decrisp: boolean
    sm: boolean
    smDyn: boolean
    legacyUc: boolean
    varietyPlus: boolean
    qualityPreset?: NaiQualityPreset
    ucPreset?: NaiUcPreset
    transparentBackground?: boolean
    characterPrompts?: NaiCharacterPrompt[]
    useCoords?: boolean
}

export interface NovelAiRequestBody {
    action: 'generate' | 'img2img'
    input: string
    model: string
    parameters: Record<string, any>
}

export interface NovelAiImg2ImgOptions {
    imageBase64: string
    strength: number
    noise: number
    extraNoiseSeed: number
}

export interface NaiModelCapabilities {
    vibes: boolean
    characterReferences: boolean
    variety: boolean
    noiseScheduleSelection: boolean
    transparency: boolean
    maxCharacters: number
}

const QUALITY_SUFFIX_STANDARD = ', very aesthetic, masterpiece, no text'
const QUALITY_SUFFIX_LIGHT = ', very aesthetic, amazing quality, no text'

const UC_HEAVY =
    'nsfw, lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page'
const V5_UC_HEAVY = UC_HEAVY.replace(/^nsfw, /, '')

const V5_UC_PRESETS: Record<NaiUcPreset, string> = {
    0: V5_UC_HEAVY,
    1: 'lowres, bad hands, bad anatomy, artistic error, sepia, white haze, worst quality, very displeasing, jpeg artifacts, 0::ai-generated::',
    3: V5_UC_HEAVY + ', @_@, mismatched pupils, glowing eyes, bad anatomy',
    4: '',
}

const QUALITY_HINT: Record<NaiQualityPreset, number> = {
    none: 0,
    standard: 1,
    light: 3,
}

const UC_HINT: Record<NaiUcPreset, number> = {
    0: 2,
    1: 3,
    3: 4,
    4: 0,
}

export function isNovelAiV5Model(model: string): boolean {
    return model.startsWith('nai-diffusion-5-')
}

export function novelAiModelCapabilities(model: string): NaiModelCapabilities {
    if (isNovelAiV5Model(model)) {
        return {
            vibes: false,
            characterReferences: false,
            variety: false,
            noiseScheduleSelection: false,
            transparency: true,
            maxCharacters: 32,
        }
    }

    return {
        vibes: true,
        characterReferences: true,
        variety: true,
        noiseScheduleSelection: true,
        transparency: false,
        maxCharacters: 6,
    }
}

export function snapNaiDimension(value: number): number {
    if (!Number.isFinite(value)) {
        return Number.NaN
    }
    return Math.max(NAI_MIN_RESOLUTION, Math.round(value / NAI_RESOLUTION_STEP) * NAI_RESOLUTION_STEP)
}

export function fitNaiGenerationResolution(
    inputWidth: number,
    inputHeight: number,
    preservedDimension: NaiResolutionDimension = 'height'
): { width: number; height: number } | null {
    let width = snapNaiDimension(inputWidth)
    let height = snapNaiDimension(inputHeight)
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
        return null
    }
    if (width * height <= NAI_MAX_GENERATION_PIXELS) {
        return { width, height }
    }

    const maxPreservedDimension = NAI_MAX_GENERATION_PIXELS / NAI_MIN_RESOLUTION
    if (preservedDimension === 'width') {
        width = Math.min(width, maxPreservedDimension)
        height = Math.max(
            NAI_MIN_RESOLUTION,
            Math.floor(NAI_MAX_GENERATION_PIXELS / width / NAI_RESOLUTION_STEP) * NAI_RESOLUTION_STEP
        )
    } else {
        height = Math.min(height, maxPreservedDimension)
        width = Math.max(
            NAI_MIN_RESOLUTION,
            Math.floor(NAI_MAX_GENERATION_PIXELS / height / NAI_RESOLUTION_STEP) * NAI_RESOLUTION_STEP
        )
    }

    return { width, height }
}

export function formatNovelAiPrompt(prompt: string): string {
    return prompt
        .replaceAll('\\(', '♧')
        .replaceAll('\\)', '♤')
        .replaceAll('(', '{')
        .replaceAll(')', '}')
        .replaceAll('♧', '(')
        .replaceAll('♤', ')')
}

export function removeNovelAiPromptComments(prompt: string): string {
    return prompt
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('#'))
        .join('\n')
}

function applyQualityPreset(prompt: string, preset: NaiQualityPreset): string {
    if (preset === 'standard') {
        return prompt + QUALITY_SUFFIX_STANDARD
    }
    if (preset === 'light') {
        return prompt + QUALITY_SUFFIX_LIGHT
    }
    return prompt
}

function applyV5UcPreset(negativePrompt: string, preset: NaiUcPreset): string {
    const presetText = V5_UC_PRESETS[preset]
    return presetText
        ? negativePrompt
            ? `${presetText}, ${negativePrompt}`
            : presetText
        : negativePrompt
}

function normalizeCenter(center: NaiCharacterPrompt['center']): { x: number; y: number } {
    const x = Number.isFinite(center?.x) ? center!.x : 0.5
    const y = Number.isFinite(center?.y) ? center!.y : 0.5
    return {
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
    }
}

function activeCharacterPrompts(config: NovelAiGenerationConfig): Array<Required<NaiCharacterPrompt>> {
    const maxCharacters = novelAiModelCapabilities(config.model).maxCharacters
    return (config.characterPrompts ?? [])
        .map((character) => ({
            prompt: removeNovelAiPromptComments(character.prompt),
            negativePrompt: removeNovelAiPromptComments(character.negativePrompt ?? ''),
            enabled: character.enabled ?? true,
            center: normalizeCenter(character.center),
        }))
        .filter((character) => character.enabled && character.prompt.trim())
        .slice(0, maxCharacters)
}

function varietySigma(config: NovelAiGenerationConfig): number | null {
    if (!config.varietyPlus) {
        return null
    }
    if (config.model.includes('nai-diffusion-4-5')) {
        return Math.sqrt(config.width * config.height) * 0.05766
    }
    if (
        config.model.includes('nai-diffusion-4-full') ||
        config.model.includes('nai-diffusion-4-curated') ||
        config.model.includes('nai-diffusion-3') ||
        config.model.includes('nai-diffusion-furry-3')
    ) {
        return Math.sqrt(config.width * config.height) * 0.01889
    }
    return null
}

export function buildNovelAiRequestBody(config: NovelAiGenerationConfig): NovelAiRequestBody {
    const v5 = isNovelAiV5Model(config.model)
    const capabilities = novelAiModelCapabilities(config.model)
    const qualityPreset = config.qualityPreset ?? 'none'
    const ucPreset = config.ucPreset ?? 3
    const useCoords = config.useCoords ?? false
    const formattedPrompt = formatNovelAiPrompt(config.prompt)
    const formattedNegative = formatNovelAiPrompt(config.negativePrompt)
    const userPrompt = v5 ? removeNovelAiPromptComments(formattedPrompt) : formattedPrompt
    const transparentPrompt =
        v5 && config.transparentBackground
            ? userPrompt
                ? `${userPrompt}, transparent background`
                : 'transparent background'
            : userPrompt
    const prompt = v5 ? applyQualityPreset(transparentPrompt, qualityPreset) : userPrompt
    const negativePrompt = v5
        ? applyV5UcPreset(removeNovelAiPromptComments(formattedNegative), ucPreset)
        : formattedNegative
    const resolution = v5
        ? (fitNaiGenerationResolution(config.width, config.height) ?? {
              width: NAI_MIN_RESOLUTION,
              height: NAI_MIN_RESOLUTION,
          })
        : { width: config.width, height: config.height }
    const characters = activeCharacterPrompts(config)
    const center = (character: Required<NaiCharacterPrompt>) =>
        useCoords ? character.center : { x: 0.5, y: 0.5 }

    const parameters: Record<string, any> = {
        params_version: v5 ? 4 : 3,
        add_original_image: true,
        cfg_rescale: config.cfgRescale,
        controlnet_strength: 1,
        dynamic_thresholding: v5
            ? false
            : config.model.includes('nai-diffusion-3') ||
                config.model.includes('nai-diffusion-furry-3') ||
                config.model.includes('nai-diffusion-2')
              ? config.decrisp
              : false,
        n_samples: 1,
        width: resolution.width,
        height: resolution.height,
        sampler: config.sampler,
        steps: config.steps,
        scale: config.scale,
        negative_prompt: negativePrompt,
        noise_schedule: v5 ? 'karras' : config.noiseSchedule,
        normalize_reference_strength_multiple: true,
        ucPreset,
        qualityToggle: qualityPreset !== 'none',
        legacy_v3_extend: false,
        legacy: false,
        autoSmea: false,
        use_coords: useCoords,
        seed: config.seed,
        prefer_brownian: true,
        deliberate_euler_ancestral_bug: false,
        v4_prompt: {
            caption: {
                base_caption: prompt,
                char_captions: characters.map((character) => ({
                    char_caption: character.prompt,
                    centers: [center(character)],
                })),
            },
            use_coords: useCoords,
            use_order: true,
        },
        v4_negative_prompt: {
            caption: {
                base_caption: negativePrompt,
                char_captions: characters.map((character) => ({
                    char_caption: character.negativePrompt,
                    centers: [center(character)],
                })),
            },
        },
    }

    if (v5) {
        parameters.tag_hint_qt = QUALITY_HINT[qualityPreset]
        parameters.tag_hint_uc_preset = UC_HINT[ucPreset]
        parameters.inpaintImg2ImgStrength = 1
        parameters.characterPrompts = characters.map((character) => ({
            prompt: character.prompt,
            uc: character.negativePrompt,
            center: center(character),
            enabled: true,
        }))
        parameters.image_format = 'png'
        if (config.transparentBackground) {
            parameters.straight_alpha = true
            parameters.tag_hint_transparent_background = true
        }
    } else {
        parameters.extra_noise_seed = config.extraNoiseSeed
        parameters.sm =
            config.model.includes('nai-diffusion-3') ||
            config.model.includes('nai-diffusion-furry-3') ||
            config.model.includes('nai-diffusion-2')
                ? config.sm
                : undefined
        parameters.sm_dyn =
            config.model.includes('nai-diffusion-3') ||
            config.model.includes('nai-diffusion-furry-3')
                ? config.smDyn
                : undefined
        parameters.uncond_scale = 1
        parameters.legacy_uc = config.legacyUc
        parameters.v4_negative_prompt.legacy_uc = config.legacyUc
        parameters.reference_image_multiple = []
        parameters.reference_strength_multiple = []
        parameters.image = undefined
        parameters.strength = undefined
        parameters.noise = undefined
        parameters.skip_cfg_above_sigma = capabilities.variety ? varietySigma(config) : null
        parameters.director_reference_images = []
        parameters.director_reference_descriptions = []
        parameters.director_reference_information_extracted = []
        parameters.director_reference_strength_values = []
        if (characters.length) {
            parameters.characterPrompts = characters.map((character) => ({
                prompt: character.prompt,
                uc: character.negativePrompt,
                center: center(character),
                enabled: true,
            }))
        }
    }

    return {
        action: 'generate',
        input: prompt,
        model: config.model,
        parameters,
    }
}

export function applyNovelAiImg2Img(
    body: NovelAiRequestBody,
    options: NovelAiImg2ImgOptions
): NovelAiRequestBody {
    body.action = 'img2img'
    body.parameters.image = options.imageBase64
    body.parameters.strength = options.strength
    body.parameters.noise = options.noise

    if (isNovelAiV5Model(body.model)) {
        body.parameters.extra_noise_seed = options.extraNoiseSeed
        body.parameters.color_correct = false
    }

    return body
}

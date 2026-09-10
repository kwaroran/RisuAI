/** NAI clamps character centers to 0~0.9, and treats (0, 0) as automatic placement. */
const NAI_POSITION_MIN = 0
const NAI_POSITION_MAX = 0.9

export interface NAICharacterPrompt{
    /** Positive prompt for this character */
    prompt: string
    /** Optional negative prompt for this character */
    negative?: string
    /** Optional horizontal position (0~0.9). 0 or omitted means automatic placement */
    x?: number
    /** Optional vertical position (0~0.9). 0 or omitted means automatic placement */
    y?: number
}

export interface NAIImageGenOptions{
    /** Per-character prompts for NAI v4/v4.5 multi-character prompting */
    characters?: NAICharacterPrompt[]
    /** Force coordinate-based placement. Defaults to true when any character supplies a non-zero x/y */
    use_coords?: boolean
}

const naiPosition = (value:unknown):number => {
    if(typeof value !== 'number' || !Number.isFinite(value)){
        return NAI_POSITION_MIN
    }
    return Math.min(NAI_POSITION_MAX, Math.max(NAI_POSITION_MIN, value))
}

/** Convert SD-style () emphasis to NAI-style {} emphasis, preserving escaped \( \) */
export const naiEmphasis = (s:string) => s
    .replaceAll('\\(', "♧")
    .replaceAll('\\)', "♤")
    .replaceAll('(','{')
    .replaceAll(')','}')
    .replaceAll('♧','(')
    .replaceAll('♤',')')

/**
 * Builds the NAI v4/v4.5 multi-character fields from options supplied by modules via Lua.
 * Kept out of stableDiff.ts so the shape can be asserted without pulling in the app's stores.
 */
export function buildNAICharacterPrompts(naiOptions?:NAIImageGenOptions){
    const naiCharacters = naiOptions?.characters ?? []
    const charCenter = (c:NAICharacterPrompt) => ({
        x: naiPosition(c?.x),
        y: naiPosition(c?.y)
    })
    // (0, 0) is NAI's "auto" center, so coordinates only kick in once one of them is placed.
    // Only an actual boolean overrides that, so a wrong-typed option falls back to auto-detection.
    const useCoords = typeof naiOptions?.use_coords === 'boolean'
        ? naiOptions.use_coords
        : naiCharacters.some(c => charCenter(c).x !== NAI_POSITION_MIN || charCenter(c).y !== NAI_POSITION_MIN)

    return {
        useCoords,
        posCharCaptions: naiCharacters.map((c) => ({
            char_caption: naiEmphasis(c?.prompt ?? ''),
            centers: [charCenter(c)]
        })),
        negCharCaptions: naiCharacters.map((c) => ({
            char_caption: c?.negative ?? '',
            centers: [charCenter(c)]
        })),
        // The web client and novelai-python both send characterPrompts alongside v4_prompt.
        // Left undefined without characters so the request stays identical to a plain generation.
        characterPrompts: naiCharacters.length > 0 ? naiCharacters.map((c) => ({
            prompt: naiEmphasis(c?.prompt ?? ''),
            uc: c?.negative ?? '',
            center: charCenter(c),
            enabled: true
        })) : undefined,
    }
}

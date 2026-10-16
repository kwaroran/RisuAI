import { describe, expect, it } from "vitest";

import { buildNAICharacterPrompts, type NAIImageGenOptions } from "../naiCharacterPrompts";

// Modules hand these options over as a JSON string through the Lua bridge, so the
// parsed value is only guaranteed to be an object. Anything else has to degrade
// to a documented default rather than corrupt the request.
const fromLua = (json: string) => JSON.parse(json) as NAIImageGenOptions;

describe("buildNAICharacterPrompts", () => {
    it("leaves the request untouched when no options are supplied", () => {
        expect(buildNAICharacterPrompts()).toEqual({
            useCoords: false,
            posCharCaptions: [],
            negCharCaptions: [],
            characterPrompts: undefined,
        });
    });

    it("builds char_captions and characterPrompts for multiple characters", () => {
        const built = buildNAICharacterPrompts(
            fromLua('{"characters":[{"prompt":"1girl","negative":"blurry"},{"prompt":"1boy"}]}')
        );

        expect(built.posCharCaptions).toEqual([
            { char_caption: "1girl", centers: [{ x: 0, y: 0 }] },
            { char_caption: "1boy", centers: [{ x: 0, y: 0 }] },
        ]);
        expect(built.negCharCaptions).toEqual([
            { char_caption: "blurry", centers: [{ x: 0, y: 0 }] },
            { char_caption: "", centers: [{ x: 0, y: 0 }] },
        ]);
        expect(built.characterPrompts).toEqual([
            { prompt: "1girl", uc: "blurry", center: { x: 0, y: 0 }, enabled: true },
            { prompt: "1boy", uc: "", center: { x: 0, y: 0 }, enabled: true },
        ]);
    });

    it("converts SD-style emphasis in character prompts, preserving escaped parens", () => {
        const built = buildNAICharacterPrompts(
            fromLua('{"characters":[{"prompt":"(smile), artist \\\\(name\\\\)"}]}')
        );

        expect(built.posCharCaptions[0].char_caption).toBe("{smile}, artist (name)");
    });

    describe("coordinate placement", () => {
        it("stays off while every character is on NAI's auto center", () => {
            expect(buildNAICharacterPrompts(fromLua('{"characters":[{"prompt":"a"}]}')).useCoords).toBe(false);
        });

        it("turns on as soon as one character is actually placed", () => {
            const built = buildNAICharacterPrompts(
                fromLua('{"characters":[{"prompt":"1girl","x":0.3,"y":0.5},{"prompt":"1boy","x":0.7,"y":0.5}]}')
            );

            expect(built.useCoords).toBe(true);
            expect(built.posCharCaptions.map((c) => c.centers[0])).toEqual([
                { x: 0.3, y: 0.5 },
                { x: 0.7, y: 0.5 },
            ]);
        });

        it("clamps centers into NAI's 0~0.9 range", () => {
            const built = buildNAICharacterPrompts(
                fromLua('{"characters":[{"prompt":"a","x":1,"y":-5}]}')
            );

            expect(built.posCharCaptions[0].centers[0]).toEqual({ x: 0.9, y: 0 });
        });

        it("honours an explicit use_coords over the auto-detection", () => {
            expect(buildNAICharacterPrompts(fromLua('{"use_coords":true,"characters":[{"prompt":"a"}]}')).useCoords).toBe(true);
            expect(buildNAICharacterPrompts(fromLua('{"use_coords":false,"characters":[{"prompt":"a","x":0.3}]}')).useCoords).toBe(false);
        });
    });

    describe("malformed options", () => {
        it("ignores a non-boolean use_coords instead of treating it as truthy", () => {
            // "false" is a truthy string, so a plain ?? would enable coordinates here
            expect(buildNAICharacterPrompts(fromLua('{"use_coords":"false","characters":[{"prompt":"a"}]}')).useCoords).toBe(false);
        });

        it("falls back to the auto center for non-numeric positions", () => {
            const built = buildNAICharacterPrompts(
                fromLua('{"characters":[{"prompt":"a","x":"0.3","y":null}]}')
            );

            expect(built.posCharCaptions[0].centers[0]).toEqual({ x: 0, y: 0 });
            expect(built.useCoords).toBe(false);
        });

        it("treats a missing prompt as an empty caption", () => {
            const built = buildNAICharacterPrompts(fromLua('{"characters":[null]}'));

            expect(built.posCharCaptions).toEqual([{ char_caption: "", centers: [{ x: 0, y: 0 }] }]);
        });
    });
});

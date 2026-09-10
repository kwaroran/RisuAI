import { describe, expect, it } from "vitest";
import { applyEmbeddingRegex, type EmbeddingRegex } from "./embeddingRegex";

describe("applyEmbeddingRegex", () => {
    it("applies enabled embedding regex scripts in order", () => {
        const scripts: EmbeddingRegex[] = [
            {
                comment: "",
                in: "secret",
                out: "public",
                type: "editembedding",
                flag: "g",
                ableFlag: true,
            },
            {
                comment: "",
                in: "public",
                out: "visible",
                type: "editembedding",
                flag: "g",
                ableFlag: true,
            },
        ];

        expect(applyEmbeddingRegex("secret note", scripts)).toBe("visible note");
    });

    it("ignores disabled scripts and invalid patterns", () => {
        const scripts: EmbeddingRegex[] = [
            {
                comment: "",
                in: "secret",
                out: "public",
                type: "disabled",
            },
            {
                comment: "",
                in: "[",
                out: "",
                type: "editembedding",
                flag: "g",
                ableFlag: true,
            },
        ];

        expect(applyEmbeddingRegex("secret note", scripts)).toBe("secret note");
    });

    it("defaults to global replacement when custom flags are disabled", () => {
        const scripts: EmbeddingRegex[] = [
            {
                comment: "",
                in: "secret",
                out: "public",
                type: "editembedding",
                flag: "i",
                ableFlag: false,
            },
        ];

        expect(applyEmbeddingRegex("secret secret SECRET", scripts)).toBe(
            "public public SECRET"
        );
    });
});

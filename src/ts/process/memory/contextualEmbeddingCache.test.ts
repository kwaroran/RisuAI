import { describe, expect, it } from "vitest";
import {
    createContextualChunkCacheKey,
    mapContextualChunkEmbeddings,
} from "./contextualEmbeddingCache";

describe("mapContextualChunkEmbeddings", () => {
    it("keeps identical text associated with distinct chunk objects", () => {
        const firstChunk = { text: "He closed the door.", summaryId: "first" };
        const secondChunk = { text: "He closed the door.", summaryId: "second" };

        const vectors = mapContextualChunkEmbeddings(
            [firstChunk, secondChunk],
            [[1, 0], [0, 1]]
        );

        expect(vectors.get(firstChunk)?.embedding).toEqual([1, 0]);
        expect(vectors.get(secondChunk)?.embedding).toEqual([0, 1]);
        expect(vectors.size).toBe(2);
    });

    it("rejects provider responses with a mismatched embedding count", () => {
        const chunks = [{ text: "first" }, { text: "second" }];

        expect(() => mapContextualChunkEmbeddings(chunks, [[1, 0]])).toThrow(
            "Contextual embedding count mismatch: expected 2, received 1"
        );
    });
});

describe("createContextualChunkCacheKey", () => {
    it("distinguishes repeated text by its position in the context group", () => {
        const suffix = "|voyageContext3|ctx:example";

        const first = createContextualChunkCacheKey("Repeated line", suffix, 0);
        const second = createContextualChunkCacheKey("Repeated line", suffix, 1);

        expect(first).not.toBe(second);
    });

    it("distinguishes the same text and position across different contexts", () => {
        const first = createContextualChunkCacheKey(
            "Repeated line",
            "|voyageContext3|ctx:first",
            0
        );
        const second = createContextualChunkCacheKey(
            "Repeated line",
            "|voyageContext3|ctx:second",
            0
        );

        expect(first).not.toBe(second);
    });

    it("is stable for the same text, context, and position", () => {
        const args = ["Repeated line", "|voyageContext3|ctx:example", 3] as const;

        expect(createContextualChunkCacheKey(...args)).toBe(
            createContextualChunkCacheKey(...args)
        );
    });

    it("rejects invalid chunk positions", () => {
        expect(() =>
            createContextualChunkCacheKey("text", "|voyageContext3", -1)
        ).toThrow("Invalid contextual chunk index: -1");
    });
});

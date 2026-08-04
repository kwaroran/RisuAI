export interface ContextualChunkLike {
    text: string;
}

export interface ContextualMemoryVector {
    content: string;
    embedding: number[] | Float32Array;
}

/**
 * Associates contextual embeddings with the exact chunk objects that produced
 * them. Chunk identity must be preserved because identical text can receive
 * different embeddings in different contexts.
 */
export function mapContextualChunkEmbeddings<TChunk extends ContextualChunkLike>(
    chunks: readonly TChunk[],
    embeddings: readonly (number[] | Float32Array)[]
): Map<TChunk, ContextualMemoryVector> {
    if (chunks.length !== embeddings.length) {
        throw new Error(
            `Contextual embedding count mismatch: expected ${chunks.length}, received ${embeddings.length}`
        );
    }

    const vectors = new Map<TChunk, ContextualMemoryVector>();
    for (let index = 0; index < chunks.length; index++) {
        const chunk = chunks[index];
        vectors.set(chunk, {
            content: chunk.text,
            embedding: embeddings[index],
        });
    }

    return vectors;
}

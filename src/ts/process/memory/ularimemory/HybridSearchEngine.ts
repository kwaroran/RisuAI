import MiniSearch, { type SearchResult as KeywordSearchResult } from "minisearch";
import type { EmbeddingResult, EmbeddingText, EmbeddingVector } from "./processor";

export type SearchResult<TMetadata> = EmbeddingResult<TMetadata> & {
  score: number;
}

export type SearchEngineOptions = {
  hybridWeights?: {
    keyword?: number;
    vector?: number;
  }
}

export type HybridSearchOptions = {
  limit?: number;
} & SearchEngineOptions

const segmenter = Intl.Segmenter && new Intl.Segmenter("ko-KR", { granularity: "word" });

/**
 * Morphological analyzer (형태소 분석) is necessary for Korean text to tokenize it properly,
 * but it's pretty heavy to run in a browser environment.
 * So we opt for a simple word segmentation using Intl.Segmenter.
 */
function tokenize(text: string): string[] {
  if (segmenter) {
    const segments = segmenter.segment(text);

    const tokens: string[] = [];
    for (const segment of segments) {
      if (segment.isWordLike) {
        tokens.push(segment.segment);
      }
    }

    return tokens;
  } else {
    // Fallback to default tokenization (regex-based, check MiniSearch's docs)
    return MiniSearch.getDefault("tokenize")
  }
}

class VectorMapEngine<TMetadata> {
  protected readonly vectors: Map<string, EmbeddingResult<TMetadata>> = new Map<string, EmbeddingResult<TMetadata>>();

  public hasVector(chunkId: string): boolean {
    return this.vectors.has(chunkId);
  }

  public getVector(chunkId: string): EmbeddingResult<TMetadata> | undefined {
    return this.vectors.get(chunkId);
  }

  public setVector(embedding: EmbeddingResult<TMetadata>): void {
    this.vectors.set(embedding.chunkId, embedding);
  }

  public getAllVectors(): EmbeddingResult<TMetadata>[] {
    return Array.from(this.vectors.values());
  }
}


export class HybridSearchEngine<TMetadata> extends VectorMapEngine<TMetadata> {
  public readonly options: SearchEngineOptions;

  private keywordEngine: MiniSearch<EmbeddingText<TMetadata>>;

  public constructor(options?: SearchEngineOptions) {
    super();

    this.options = options || {};
    this.options.hybridWeights = this.options.hybridWeights || {
      keyword: 0.5,
      vector: 0.5,
    };

    this.keywordEngine = new MiniSearch({
      fields: ["content"],
      storeFields: ["content", "metadata"],
      idField: "chunkId",
      tokenize
    })
  }

  public indexAll(embeddings: EmbeddingResult<TMetadata>[]): void {
    this.keywordEngine.addAll(embeddings)
  }

  public index(embedding: EmbeddingResult<TMetadata>): void {
    this.keywordEngine.add(embedding);
  }

  /**
   * @param query search term
   * @param queryVector embedding vector
   * @param limit topK
   */
  public search(
    query: string,
    queryVector: EmbeddingVector,
    searchOptions: HybridSearchOptions = {},
  ): SearchResult<TMetadata>[] {
    const options: HybridSearchOptions = {
      limit: 10,
      hybridWeights: {
        keyword: 0.5,
        vector: 0.5,
        ...(this.options.hybridWeights || {}),
        ...(searchOptions.hybridWeights || {}),
      },
      ...searchOptions,
    }

    console.log("[HybridSearchEngine] Searching with options:", options);

    const keywordSearchResults = this.keywordSearch(query)
    // Get more results from vector search to ensure we have enough to fuse
    const vectorSearchResults = this.vectorSearch(queryVector, options.limit * 2);

    return this.fuseResults(
      keywordSearchResults,
      vectorSearchResults,
      options,
    )
  }

  public keywordSearch(...args: Parameters<MiniSearch<EmbeddingText<TMetadata>>["search"]>) {
    return this.keywordEngine.search(...args);
  }

  public vectorSearch(
    queryVector: EmbeddingVector,
    limit: number = 10
  ): SearchResult<TMetadata>[] {
    return this.getAllVectors()
      .map((chunk) => ({
        ...chunk,
        score: this.calculateVectorSimilarity(queryVector, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  public fuseResults(
    keywordResults: KeywordSearchResult[],
    vectorResults: SearchResult<TMetadata>[],
    options: HybridSearchOptions = {},
  ): SearchResult<TMetadata>[] {
    const fusedScores: Map<string, number> = new Map<string, number>();
    const k = 60; // RRF constant

    keywordResults.forEach((result, rank) => {
      const rrfScore = 1 / (k + rank + 1);
      const previousScore = fusedScores.get(result.id) || 0;

      fusedScores.set(result.id, previousScore + rrfScore * options.hybridWeights.keyword);
    });

    vectorResults.forEach((result, rank) => {
      const rrfScore = 1 / (k + rank + 1);
      const previousScore = (fusedScores.get(result.chunkId) || 0)

      fusedScores.set(result.chunkId, previousScore + rrfScore * options.hybridWeights.vector);
    });

    const rankedResults = Array.from(fusedScores.entries())
      // Sorting by comparison due to floating point error
      .sort(([, scoreA], [, scoreB]) => {
        if (scoreA === scoreB) {
          return 0;
        }

        return scoreA > scoreB ? -1 : 1;
      })
      .slice(0, options.limit)
      .map(([id, score]) => {
        const originalResult = this.getVector(id);

        return {
          ...originalResult,
          score: score,
        }
      });

    return rankedResults
  }

  public calculateVectorSimilarity(
    a: EmbeddingVector,
    b: EmbeddingVector
  ): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }
}

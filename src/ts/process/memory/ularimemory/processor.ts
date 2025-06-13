import localforage from "localforage";
import { getDatabase } from "src/ts/storage/database.svelte";
import { type HypaModel } from "../hypamemory";
import { TaskCanceledError, TaskRateLimiter } from "../taskRateLimiter";
import { EmbeddingClient } from "./EmbeddingClient"
import { HybridSearchEngine, type SearchEngineOptions, type SearchResult } from "./HybridSearchEngine";
import { chunkArray, generateUniqueId } from "../utils";

export interface UlariProcessorOptions {
  model?: HypaModel;
  customEmbeddingUrl?: string;
  oaiKey?: string;
  rateLimiter?: TaskRateLimiter;
  hybridWeights?: SearchEngineOptions["hybridWeights"];
}

export interface EmbeddingText<TMetadata> {
  id: string;
  chunkId: string;
  content: string;
  metadata?: TMetadata;
}

export interface EmbeddingResult<TMetadata> extends EmbeddingText<TMetadata> {
  embedding: EmbeddingVector;
}

export interface SimilaritySearchResult<TMetadata> extends EmbeddingResult<TMetadata> {
  score: number;
}

export type EmbeddingVector = number[] | Float32Array;

const HYBRID_SEARCH_DEFAULT_WEIGHTS: SearchEngineOptions["hybridWeights"] = {
  keyword: 0.4,
  vector: 0.6,
};

export class UlariProcessor<TMetadata> {
  // Re-use the same cache of HypaMemory v3 vectors as the structure didn't change
  private static readonly ULARI_VECTOR_CACHE_NAME = "hypaVector";

  private forage: LocalForage = localforage.createInstance({
    name: UlariProcessor.ULARI_VECTOR_CACHE_NAME,
  });

  protected embeddingClient: EmbeddingClient;
  protected engine: HybridSearchEngine<TMetadata>

  // compatibility
  public progressCallback: (queuedCount: number) => void = null;
  public readonly options: UlariProcessorOptions
  public rateLimiter: TaskRateLimiter;

  public constructor(options?: UlariProcessorOptions) {
    const db = getDatabase()

    this.options = {
      model: db.hypaModel || "MiniLM",
      customEmbeddingUrl: db.hypaCustomSettings?.url?.trim() || "",
      oaiKey: db.supaMemoryKey?.trim() || "",
      ...options,
    }

    this.rateLimiter = this.options?.rateLimiter || new TaskRateLimiter()
    this.embeddingClient = new EmbeddingClient(this.options)
    this.engine = new HybridSearchEngine<TMetadata>({
      hybridWeights: {
        keyword: this.options.hybridWeights?.keyword || HYBRID_SEARCH_DEFAULT_WEIGHTS.keyword,
        vector: this.options.hybridWeights?.vector || HYBRID_SEARCH_DEFAULT_WEIGHTS.vector,
      }
    })
  }

  public async addTexts(ebdTexts: EmbeddingText<TMetadata>[]): Promise<void> {
    const embeddedResults = await this.indexSummaries(ebdTexts);

    this.engine.indexAll(embeddedResults);
  }

  public async hybridSearchQueries(
    queries: string[],
    topK: number = 10
  ): Promise<SearchResult<TMetadata>[][]> {
    if (queries.length === 0) return [];

    const uniqueQueries = [...new Set(queries)];
    const embeddedQueries = await this.processQueries(uniqueQueries);

    const finalResults: SearchResult<TMetadata>[][] = [];

    for (let i = 0; i < uniqueQueries.length; i++) {
      const query = uniqueQueries[i];
      const queryEmbedding = embeddedQueries[i];

      const rankedResults = this.engine.search(
        query,
        queryEmbedding.embedding,
        { limit: topK }
      );

      const recencyWeights = Array.from({ length: queries.length }, (_, i) =>
        Math.max(0.2, 1.0 - (i * (1 / queries.length)))
      ).reverse();

      /**
       * The older the chat input, the lower the weight proportionally
       * (TODO: to be tested / tuned / improved in the future after initial release)
       * Might not work as expected with RP, as the ongoing story in the context is often more important than the last user input
       */
      const weightedResults = rankedResults.map((result) => ({
        ...result,
        score: result.score * recencyWeights[i],
      }))

      finalResults.push(weightedResults);
    }

    const resultMap = new Map(uniqueQueries.map((q, i) => [q, finalResults[i]]));
    return queries.map((query) => resultMap.get(query) || []);
  }

  /**
 * 메모용) 배포 전 제거
 * 요약본 임베딩
 * 인메모리 요약본 벡터 캐시 -> read, write
 * localForage 캐시 -> read, write
 */
  private async indexSummaries(
    embeddingTexts: EmbeddingText<TMetadata>[]
  ): Promise<EmbeddingResult<TMetadata>[]> {
    return this.getEmbeddings(embeddingTexts, { indexed: true });
  }

  /**
   * 메모용) 배포 전 제거
   * 컨텍스트 내에 존재하는 유저 인풋 임베딩
   * 인메모리 벡터 캐시 -> read X, write X
   * localForage 벡터 캐시 -> read, write
   */
  private async processQueries(
    queries: string[]
  ): Promise<EmbeddingResult<TMetadata>[]> {
    const embeddingTexts: EmbeddingText<TMetadata>[] = queries.map((query) => (
      this.buildEmbeddingTextFromQuery(query)
    ));

    return this.getEmbeddings(embeddingTexts, { indexed: false });
  }

  private async getEmbeddings(
    embeddingTexts: EmbeddingText<TMetadata>[],
    options: { indexed: boolean }
  ) {
    const pendingForEmbedding: EmbeddingText<TMetadata>[] = [];
    const resultMap = new Map<string, EmbeddingResult<TMetadata>>();

    const cacheTasks = embeddingTexts.map(async (item) => {
      if (options.indexed && this.engine.hasVector(item.chunkId)) {
        resultMap.set(item.chunkId, this.engine.getVector(item.chunkId));
        return;
      }

      try {
        const cached = await this.forage.getItem<EmbeddingResult<TMetadata>>(
          this.getCacheKey(item.content)
        );

        if (cached) {
          cached.id = item.id;
          cached.chunkId = item.chunkId;
          cached.metadata = item.metadata;

          if (options.indexed) {
            this.engine.setVector(cached);
          }

          resultMap.set(item.chunkId, cached);
        } else {
          pendingForEmbedding.push(item);
        }
      } catch (error) {
        pendingForEmbedding.push(item);
      }
    });

    await Promise.all(cacheTasks);

    if (pendingForEmbedding.length === 0) {
      return embeddingTexts.map((item) => resultMap.get(item.chunkId));
    }

    const embeddedResults = await this.fetchEmbeddings(pendingForEmbedding);

    await Promise.all(
      embeddedResults.map(async (result) => {
        if (options.indexed) {
          this.engine.setVector(result);
        }

        if (!result) {
          debugger
        }

        await this.forage.setItem(
          this.getCacheKey(result.content),
          {
            content: result.content,
            embedding: result.embedding,
          }
        );

        resultMap.set(result.chunkId, result);
      })
    );

    return embeddingTexts.map((item) => resultMap.get(item.chunkId));
  }

  private async fetchEmbeddings(
    embeddingTexts: EmbeddingText<TMetadata>[],
  ): Promise<EmbeddingResult<TMetadata>[]> {
    if (embeddingTexts.length === 0) return [];

    const resultMap = new Map<string, EmbeddingResult<TMetadata>>();
    const chunkSize = this.getOptimalChunkSize();
    const chunks = chunkArray(embeddingTexts, chunkSize);

    const processChunk = async (chunk: EmbeddingText<TMetadata>[], embeddings: EmbeddingVector[]) => {
      chunk.forEach((item, i) => {
        const embedding = embeddings[i];
        if (!embedding) {
          return
        }

        const result: EmbeddingResult<TMetadata> = {
          ...item,
          embedding,
        };

        resultMap.set(item.chunkId, result);
      })
    }

    if (this.embeddingClient.isLocalModel) {
      // sequential processing for local models
      for (let i = 0; i < chunks.length; i++) {
        this.progressCallback?.(chunks.length - i - 1);
        const chunk = chunks[i];
        const embeddings = await this.embeddingClient.getLocalEmbeddedData(
          chunk.map((item) => item.content)
        );

        await processChunk(chunk, embeddings);
      }
    } else {
      // parallel processing for API models, original code at @see ../hypamemoryv3.ts

      const embeddingTasks = chunks.map((chunk) => () => this.embeddingClient.fetchEmbeddedData(chunk.map((item) => item.content)));
      const batchResult = await this.rateLimiter.executeBatch<EmbeddingVector[]>(embeddingTasks);

      this.rateLimiter.taskQueueChangeCallback = this.progressCallback;

      const errors: Error[] = [];
      const processPromises = batchResult.results.map(async (result, i) => {
        if (!result.success || !result.data) {
          errors.push(result.error || new Error("No embeddings found in the response."));
          return;
        }

        await processChunk(chunks[i], result.data);
      });

      await Promise.all(processPromises);

      if (errors.length > 0) {
        const majorError = errors.find((error) => !(error instanceof TaskCanceledError)) || errors[0];
        throw majorError;
      }
    }

    return embeddingTexts.map(item => resultMap.get(item.chunkId))
  }

  private buildEmbeddingTextFromQuery(query: string) {
    // moke datas, as they aren't actually used 
    const id = generateUniqueId();
    const chunkId = `${id}-${query}`;

    return {
      id,
      chunkId,
      content: query,
    };
  }

  private getCacheKey(content: string): string {
    const db = getDatabase();
    const suffix =
      this.options.model === "custom" && db.hypaCustomSettings?.model?.trim()
        ? `-${db.hypaCustomSettings.model.trim()}`
        : "";

    return `${content}|${this.options.model}${suffix}`;
  }

  private getOptimalChunkSize(): number {
    // API
    if (!this.embeddingClient.isLocalModel) {
      return 50;
    }

    const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(
      navigator.userAgent
    );

    // WebGPU
    if ("gpu" in navigator) {
      return isMobile ? 5 : 10;
    }

    // WASM
    const cpuCores = navigator.hardwareConcurrency || 4;
    const baseChunkSize = isMobile ? Math.floor(cpuCores / 2) : cpuCores;

    return Math.min(baseChunkSize, 10);
  }
}

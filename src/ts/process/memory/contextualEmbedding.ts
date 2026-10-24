import { globalFetch } from "src/ts/globalApi.svelte";
import { getDatabase } from "src/ts/storage/database.svelte";
import { contextHash, type VectorArray } from "./hypamemory";

export interface ContextualEmbeddingProvider {
  readonly modelId: string;
  embedDocumentGroups(groups: string[][]): Promise<VectorArray[][]>;
  embedQueries(queries: string[]): Promise<VectorArray[]>;
  getCacheKeySuffix(contextTexts?: string[]): string;
}

type VoyageContextModel = 'voyageContext3' | 'voyageContext4';

interface VoyageContextModelConfig {
  readonly apiModelId: string;
  readonly displayName: string;
  readonly cacheKeySuffix: string;
  readonly outputDimension?: number;
  readonly outputDtype?: 'float';
}

const VOYAGE_CONTEXT_MODELS: Record<VoyageContextModel, VoyageContextModelConfig> = {
  voyageContext3: {
    apiModelId: 'voyage-context-3',
    displayName: 'Voyage Context 3',
    cacheKeySuffix: 'voyageContext3'
  },
  voyageContext4: {
    apiModelId: 'voyage-context-4',
    displayName: 'Voyage Context 4',
    cacheKeySuffix: 'voyageContext4|dim:2048',
    outputDimension: 2048,
    outputDtype: 'float'
  }
};

export function isContextModel(model: string): boolean {
  return Object.prototype.hasOwnProperty.call(VOYAGE_CONTEXT_MODELS, model);
}

export function getContextProvider(model: string): ContextualEmbeddingProvider | null {
  if (!isContextModel(model)) {
    return null;
  }

  return new VoyageContextProvider(VOYAGE_CONTEXT_MODELS[model as VoyageContextModel]);
}

const VOYAGE_API_URL = "https://api.voyageai.com/v1/contextualizedembeddings";
const MAX_CHUNKS_PER_REQUEST = 16000;
const MAX_INPUTS_PER_REQUEST = 1000;

class VoyageContextProvider implements ContextualEmbeddingProvider {
  readonly modelId: string;

  constructor(private readonly config: VoyageContextModelConfig) {
    this.modelId = config.apiModelId;
  }

  private getApiKey(): string {
    const db = getDatabase();
    const apiKey = db.voyageApiKey?.trim();
    if (!apiKey) {
      throw new Error(`${this.config.displayName} requires a Voyage API Key`);
    }
    return apiKey;
  }

  async embedDocumentGroups(groups: string[][]): Promise<VectorArray[][]> {
    const apiKey = this.getApiKey();
    const batches = this.batchGroups(groups);
    const allResults: VectorArray[][] = new Array(groups.length);

    let groupOffset = 0;
    for (const batch of batches) {
      const response = await globalFetch(VOYAGE_API_URL, {
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json"
        },
        body: {
          "model": this.config.apiModelId,
          "inputs": batch,
          "input_type": "document",
          ...this.getOutputOptions()
        }
      });

      if (!response.ok || !response.data.data) {
        throw new Error(JSON.stringify(response.data));
      }

      for (let i = 0; i < batch.length; i++) {
        const groupEmbeddings: VectorArray[] = response.data.data[i].data.map(
          (item: { embedding: VectorArray }) => item.embedding
        );
        allResults[groupOffset + i] = groupEmbeddings;
      }

      groupOffset += batch.length;
    }

    return allResults;
  }

  async embedQueries(queries: string[]): Promise<VectorArray[]> {
    const apiKey = this.getApiKey();
    const response = await globalFetch(VOYAGE_API_URL, {
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: {
        "inputs": queries.map(s => [s]),
        "model": this.config.apiModelId,
        "input_type": "query",
        ...this.getOutputOptions()
      }
    });

    if (!response.ok || !response.data.data) {
      throw new Error(JSON.stringify(response.data));
    }

    return response.data.data.map(
      (group: { data: { embedding: VectorArray }[] }) => group.data[0].embedding
    );
  }

  getCacheKeySuffix(contextTexts?: string[]): string {
    const ctxPart = contextTexts && contextTexts.length > 1
      ? `|ctx:${contextHash(contextTexts)}`
      : '';
    return `|${this.config.cacheKeySuffix}${ctxPart}`;
  }

  private getOutputOptions(): { output_dimension?: number; output_dtype?: 'float' } {
    return {
      ...(this.config.outputDimension ? { output_dimension: this.config.outputDimension } : {}),
      ...(this.config.outputDtype ? { output_dtype: this.config.outputDtype } : {})
    };
  }

  private batchGroups(groups: string[][]): string[][][] {
    const batches: string[][][] = [];
    let currentBatch: string[][] = [];
    let currentChunkCount = 0;

    for (const group of groups) {
      if (
        currentBatch.length > 0 &&
        (currentBatch.length + 1 > MAX_INPUTS_PER_REQUEST ||
         currentChunkCount + group.length > MAX_CHUNKS_PER_REQUEST)
      ) {
        batches.push(currentBatch);
        currentBatch = [];
        currentChunkCount = 0;
      }
      currentBatch.push(group);
      currentChunkCount += group.length;
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }
}

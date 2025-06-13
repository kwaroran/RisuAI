import { globalFetch } from "src/ts/globalApi.svelte";
import { getDatabase } from "src/ts/storage/database.svelte";
import { appendLastPath } from "src/ts/util";
import { runEmbedding } from "../../transformers";
import { localModels } from "../hypamemory";
import type { EmbeddingVector, UlariProcessorOptions } from "./processor"

// GlobalFetchArgs isn't exported by globalApi.svelte
type GlobalFetchArgs = Parameters<typeof globalFetch>[1]

export class EmbeddingClient {
  private readonly db = getDatabase();

  public readonly options: UlariProcessorOptions;

  constructor(options?: UlariProcessorOptions) {
    this.options = options;

    this.validateOptions();
  }

  public get isLocalModel(): boolean {
    return Object.keys(localModels.models).includes(this.options.model);
  }

  protected validateOptions() {
    if (!this.options.model) {
      throw new Error("Model is required for embedding client.");
    }

    if (this.options.model === "custom" && !this.options.customEmbeddingUrl) {
      throw new Error("Custom model requires a Custom Server URL");
    }

    if (
      ["ada", "openai3small", "openai3large"].includes(this.options.model) &&
      !this.options.oaiKey
    ) {
      throw new Error("OpenAI key is required for OpenAI models.");
    }
  }

  /**
   * Constructs the request options for the embedding API.
   */
  protected getRequestOptions(contents: string[]): GlobalFetchArgs & { url: string } {
    const replaceUrl = this.options.customEmbeddingUrl?.endsWith("/embeddings")
      ? this.options.customEmbeddingUrl
      : appendLastPath(this.options.customEmbeddingUrl, "embeddings");

    const options: GlobalFetchArgs & { url: string } = {
      url: replaceUrl,
      body: {
        input: contents,
      }
    }

    const OpenAIEmbeddingModels = {
      ada: "text-embedding-ada-002",
      openai3small: "text-embedding-3-small",
      openai3large: "text-embedding-3-large",
    };

    let authorizationKey
    switch (this.options.model) {
      case "custom":
        authorizationKey = this.db.hypaCustomSettings?.key?.trim();

        const customModel = this.db.hypaCustomSettings?.model?.trim();

        if (customModel) {
          options.body.model = customModel;
        }

        break;
      case "ada":
      case "openai3small":
      case "openai3large":
        authorizationKey = this.options.oaiKey || this.db.supaMemoryKey?.trim();

        options.body.model = OpenAIEmbeddingModels[this.options.model];
        break;
      default:
        throw new Error(`Unsupported model: ${this.options.model}`);
    }

    if (authorizationKey) {
      options.headers = {
        Authorization: `Bearer ${authorizationKey}`,
      };
    }

    return options;
  }

  /**
   * Fetches text embeddings from the configured external embedding API.
   */
  public async fetchEmbeddedData(contents: string[]): Promise<EmbeddingVector[]> {
    const { url, ...options } = this.getRequestOptions(contents);
    const response = await globalFetch(url, options);

    if (!response.ok || !response.data.data) {
      throw new Error(JSON.stringify(response.data));
    }

    const { data } = response.data as { data: { embedding: EmbeddingVector }[] };

    const embeddings: EmbeddingVector[] = data.map(
      (item) => {
        if (!item.embedding) {
          throw new Error("No embeddings found in the response.");
        }

        return item.embedding;
      }
    );

    return embeddings;
  }

  /**
   * Fetches text embeddings using a local model (in-browser).
   */
  public async getLocalEmbeddedData(contents: string[]): Promise<EmbeddingVector[]> {
    const results: Float32Array[] = await runEmbedding(
      contents,
      localModels.models[this.options.model],
      localModels.gpuModels.includes(this.options.model) ? "webgpu" : "wasm"
    );

    return results;
  }
}

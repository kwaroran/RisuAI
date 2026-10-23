import type { ModelGridSource } from "./modelGrid"
import { nanoGPTModelSource } from "./nanogpt"
import { ollamaCloudModelSource } from "./ollama"
import { openRouterModelSource } from "./openrouter"

/** Providers whose request model is picked with ModelGridPicker, keyed by aiModel id */
export const modelGridSources = {
    openrouter: openRouterModelSource,
    nanogpt: nanoGPTModelSource,
    'ollama-cloud': ollamaCloudModelSource,
} satisfies Record<string, ModelGridSource>

export type ModelGridSourceId = keyof typeof modelGridSources

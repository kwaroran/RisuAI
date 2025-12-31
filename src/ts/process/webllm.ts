import type {
  ChatCompletionMessageParam,
  ChatCompletionRequestNonStreaming,
  MLCEngine
} from "@mlc-ai/web-llm";

let engine: MLCEngine = null;
let lastModel: string = null;

export async function chatCompletion(
  messages: { role: string; content: string }[],
  model: string,
  config: Record<string, any>
): Promise<string> {
  try {
    if (!engine || lastModel !== model) {
      if (engine) await engine.unload();

      const initProgressCallback = (progress) => {
        console.log("[WebLLM]", progress);
      };

      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");

      engine = await CreateMLCEngine(
        model,
        {
          initProgressCallback,
        },
        { context_window_size: 16384 }
      );

      lastModel = model;
    }

    const request: ChatCompletionRequestNonStreaming = {
      messages: messages as ChatCompletionMessageParam[],
      temperature: 0,
      max_tokens: 4096,
      ...config,
    };
    const completion = await engine.chat.completions.create(request);
    const content = completion.choices[0].message.content;

    return content;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(JSON.stringify(error));
  }
}

export async function unloadEngine(): Promise<void> {
  if (!engine) return;

  await engine.unload();
  engine = null;
  lastModel = null;
}

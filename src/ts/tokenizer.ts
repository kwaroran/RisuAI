import type { Tiktoken } from "@dqbd/tiktoken";
import type { character } from "./database";

async function encode(data: string): Promise<number[] | Uint32Array> {
  return await tikJS(data);
}

let tikParser: Tiktoken = null;

async function tikJS(text: string) {
  if (!tikParser) {
    const { Tiktoken } = await import("@dqbd/tiktoken");
    const cl100k_base = await import(
      "@dqbd/tiktoken/encoders/cl100k_base.json"
    );

    tikParser = new Tiktoken(
      cl100k_base.bpe_ranks,
      cl100k_base.special_tokens,
      cl100k_base.pat_str
    );
  }
  return tikParser.encode(text);
}

export async function tokenizerChar(char: character) {
  const encoded = await encode(
    char.name + "\n" + char.firstMessage + "\n" + char.desc
  );
  return encoded.length;
}

export async function tokenize(data: string) {
  const encoded = await encode(data);
  return encoded.length;
}

export async function tokenizeNum(data: string) {
  const encoded = await encode(data);
  return encoded;
}

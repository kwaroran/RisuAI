import { getDatabase } from "src/ts/storage/database.svelte";
import type { OpenAIChat } from "../index.svelte";
import type { HypaV3Data, HypaV3Settings, SerializableHypaV3Data } from "./hypav3";
import { isSubset } from "./utils";
import { parseChatML } from "src/ts/parser.svelte";
import { requestChatData } from "../request/request";
import { chatCompletion } from "../webllm";

// Uses HypaV3 types as default for compatibility; type casting in UlariMemory

const logPrefix = "[CoreMemory]";

export function toSerializableMemoryData(data: HypaV3Data): SerializableHypaV3Data {
  return {
    ...data,
    summaries: data.summaries.map((summary) => ({
      ...summary,
      chatMemos: [...summary.chatMemos],
    })),
  };
}

export function cleanOrphanedSummary(chats: OpenAIChat[], data: HypaV3Data): void {
  // Collect all memos from current chats
  const currentChatMemos = new Set(chats.map((chat) => chat.memo));
  const originalLength = data.summaries.length;

  // Filter summaries - keep only those whose chatMemos are subset of current chat memos
  data.summaries = data.summaries.filter((summary) => {
    return isSubset(summary.chatMemos, currentChatMemos);
  });

  const removedCount = originalLength - data.summaries.length;

  if (removedCount > 0) {
    console.log(logPrefix, `Cleaned ${removedCount} orphaned summaries.`);
  }
}

export function toMemoryData(serialData: SerializableHypaV3Data): HypaV3Data {
  // Remove legacy property
  const { lastSelectedSummaries, ...restData } = serialData;

  return {
    ...restData,
    summaries: serialData.summaries.map((summary) => ({
      ...summary,
      // Convert null back to undefined (JSON serialization converts undefined to null)
      chatMemos: new Set(
        summary.chatMemos.map((memo) => (memo === null ? undefined : memo))
      ),
    })),
  };
}

export async function summarize(oaiMessages: OpenAIChat[], settings: HypaV3Settings): Promise<string> {
  const db = getDatabase();

  const strMessages = oaiMessages
    .map((chat) => `${chat.role}: ${chat.content}`)
    .join("\n");

  const summarizationPrompt =
    settings.summarizationPrompt.trim() === ""
      ? "[Summarize the ongoing role story, It must also remove redundancy and unnecessary text and content from the output.]"
      : settings.summarizationPrompt;

  const formated: OpenAIChat[] = parseChatML(
    summarizationPrompt.replaceAll("{{slot}}", strMessages)
  ) ?? [
    {
      role: "user",
      content: strMessages,
    },
    {
      role: "system",
      content: summarizationPrompt,
    },
  ];

  // API
  if (settings.summarizationModel === "subModel") {
    console.log(logPrefix, `Using ax model ${db.subModel} for summarization.`);

    const response = await requestChatData(
      {
        formated,
        bias: {},
        useStreaming: false,
        noMultiGen: true,
      },
      "memory"
    );

    if (response.type === "streaming" || response.type === "multiline") {
      throw new Error("Unexpected response type");
    }

    if (response.type === "fail") {
      throw new Error(response.result);
    }

    if (!response.result || response.result.trim().length === 0) {
      throw new Error("Empty summary returned");
    }

    return response.result.trim();
  }

  // Local
  const content = await chatCompletion(formated, settings.summarizationModel, {
    max_tokens: 8192,
    temperature: 0,
    extra_body: {
      enable_thinking: false,
    },
  });

  if (!content || content.trim().length === 0) {
    throw new Error("Empty summary returned");
  }

  // Remove think content
  const thinkRegex = /<think>[\s\S]*?<\/think>/g;

  return content.replace(thinkRegex, "").trim();
}

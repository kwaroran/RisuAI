import { type memoryVector, HypaProcesser, similarity } from "./hypamemory";
import {
  type Chat,
  type character,
  type groupChat,
  getDatabase,
} from "src/ts/storage/database.svelte";
import { type OpenAIChat } from "../index.svelte";
import { requestChatData } from "../request";
import { runSummarizer } from "../transformers";
import { parseChatML } from "src/ts/parser.svelte";
import { type ChatTokenizer } from "src/ts/tokenizer";

export interface HypaV3Preset {
  name: string;
  settings: HypaV3Settings;
}

export interface HypaV3Settings {
  summarizationModel: string;
  summarizationPrompt: string;
  memoryTokensRatio: number;
  extraSummarizationRatio: number;
  maxChatsPerSummary: number;
  recentMemoryRatio: number;
  similarMemoryRatio: number;
  enableSimilarityCorrection: boolean;
  preserveOrphanedMemory: boolean;
  processRegexScript: boolean;
  doNotSummarizeUserMessage: boolean;
}

interface HypaV3Data {
  summaries: Summary[];
  lastSelectedSummaries?: number[];
}

export interface SerializableHypaV3Data {
  summaries: {
    text: string;
    chatMemos: string[];
    isImportant: boolean;
  }[];
  lastSelectedSummaries?: number[];
}

interface Summary {
  text: string;
  chatMemos: Set<string>;
  isImportant: boolean;
}

interface SummaryChunk {
  text: string;
  summary: Summary;
}

interface ResultObject {
  currentTokens: number;
  chats: OpenAIChat[];
  error?: string;
  memory?: SerializableHypaV3Data;
}

const logPrefix = "[HypaV3]";
const memoryPromptTag = "Past Events Summary";
const minChatsForSimilarity = 3;
const maxSummarizationFailures = 3;
const summarySeparator = "\n\n";

export async function hypaMemoryV3(
  chats: OpenAIChat[],
  currentTokens: number,
  maxContextTokens: number,
  room: Chat,
  char: character | groupChat,
  tokenizer: ChatTokenizer
): Promise<ResultObject> {
  try {
    return await hypaMemoryV3Main(
      chats,
      currentTokens,
      maxContextTokens,
      room,
      char,
      tokenizer
    );
  } catch (error) {
    if (error instanceof Error) {
      // Standard Error instance
      error.message = `${logPrefix} ${error.message}`;
      throw error;
    }

    // Fallback for non-Error object
    let errorMessage: string;

    try {
      errorMessage = JSON.stringify(error);
    } catch {
      errorMessage = String(error);
    }

    throw new Error(`${logPrefix} ${errorMessage}`);
  }
}

async function hypaMemoryV3Main(
  chats: OpenAIChat[],
  currentTokens: number,
  maxContextTokens: number,
  room: Chat,
  char: character | groupChat,
  tokenizer: ChatTokenizer
): Promise<ResultObject> {
  const db = getDatabase();
  const settings = getCurrentHypaV3Preset().settings;

  // Validate settings
  if (settings.recentMemoryRatio + settings.similarMemoryRatio > 1) {
    return {
      currentTokens,
      chats,
      error: `${logPrefix} The sum of Recent Memory Ratio and Similar Memory Ratio is greater than 1.`,
    };
  }

  // Initial token correction
  currentTokens -= db.maxResponse;

  // Load existing hypa data if available
  let data: HypaV3Data = {
    summaries: [],
    lastSelectedSummaries: [],
  };

  if (room.hypaV3Data) {
    data = toHypaV3Data(room.hypaV3Data);
  }

  // Clean orphaned summaries
  if (!settings.preserveOrphanedMemory) {
    cleanOrphanedSummary(chats, data);
  }

  // Determine starting index
  let startIdx = 0;

  if (data.summaries.length > 0) {
    const lastSummary = data.summaries.at(-1);
    const lastChatIndex = chats.findIndex(
      (chat) => chat.memo === [...lastSummary.chatMemos].at(-1)
    );

    if (lastChatIndex !== -1) {
      startIdx = lastChatIndex + 1;

      // Exclude tokens from summarized chats
      const summarizedChats = chats.slice(0, lastChatIndex + 1);
      for (const chat of summarizedChats) {
        currentTokens -= await tokenizer.tokenizeChat(chat);
      }
    }
  }

  // Reserve memory tokens
  const emptyMemoryTokens = await tokenizer.tokenizeChat({
    role: "system",
    content: wrapWithXml(memoryPromptTag, ""),
  });
  const memoryTokens = Math.floor(
    maxContextTokens * settings.memoryTokensRatio
  );
  const shouldReserveEmptyMemoryTokens =
    data.summaries.length === 0 &&
    currentTokens + emptyMemoryTokens <= maxContextTokens;
  let availableMemoryTokens = shouldReserveEmptyMemoryTokens
    ? 0
    : memoryTokens - emptyMemoryTokens;

  if (shouldReserveEmptyMemoryTokens) {
    currentTokens += emptyMemoryTokens;
    console.log(logPrefix, "Reserved empty memory tokens:", emptyMemoryTokens);
  } else {
    currentTokens += memoryTokens;
    console.log(logPrefix, "Reserved max memory tokens:", memoryTokens);
  }

  // If summarization is needed
  let summarizationMode = currentTokens > maxContextTokens;
  const targetTokens =
    maxContextTokens * (1 - settings.extraSummarizationRatio);

  while (summarizationMode) {
    if (currentTokens <= targetTokens) {
      break;
    }

    if (chats.length - startIdx <= minChatsForSimilarity) {
      if (currentTokens <= maxContextTokens) {
        break;
      } else {
        return {
          currentTokens,
          chats,
          error: `${logPrefix} Cannot summarize further: input token count (${currentTokens}) exceeds max context size (${maxContextTokens}), but minimum ${minChatsForSimilarity} messages required.`,
          memory: toSerializableHypaV3Data(data),
        };
      }
    }

    const toSummarize: OpenAIChat[] = [];
    const endIdx = Math.min(
      startIdx + settings.maxChatsPerSummary,
      chats.length - minChatsForSimilarity
    );
    let toSummarizeTokens = 0;

    console.log(
      logPrefix,
      "Evaluating summarization batch:",
      "\nCurrent Tokens:",
      currentTokens,
      "\nMax Context Tokens:",
      maxContextTokens,
      "\nStart Index:",
      startIdx,
      "\nEnd Index:",
      endIdx,
      "\nChat Count:",
      endIdx - startIdx,
      "\nMax Chats Per Summary:",
      settings.maxChatsPerSummary
    );

    for (let i = startIdx; i < endIdx; i++) {
      const chat = chats[i];
      const chatTokens = await tokenizer.tokenizeChat(chat);

      console.log(
        logPrefix,
        "Evaluating chat:",
        "\nIndex:",
        i,
        "\nRole:",
        chat.role,
        "\nContent:",
        "\n" + chat.content,
        "\nTokens:",
        chatTokens
      );

      toSummarizeTokens += chatTokens;

      if (
        chat.name === "example_user" ||
        chat.name === "example_assistant" ||
        chat.memo === "NewChatExample"
      ) {
        console.log(logPrefix, `Skipping example chat at index ${i}`);

        continue;
      }

      if (chat.memo === "NewChat") {
        console.log(logPrefix, `Skipping new chat at index ${i}`);

        continue;
      }

      if (chat.content.trim().length === 0) {
        console.log(logPrefix, `Skipping empty chat at index ${i}`);

        continue;
      }

      if (settings.doNotSummarizeUserMessage && chat.role === "user") {
        console.log(logPrefix, `Skipping user role at index ${i}`);

        continue;
      }

      toSummarize.push(chat);
    }

    // Stop summarization if further reduction would go below target tokens (unless we're over max tokens)
    if (
      currentTokens <= maxContextTokens &&
      currentTokens - toSummarizeTokens < targetTokens
    ) {
      console.log(
        logPrefix,
        "Stopping summarization:",
        `\n{currentTokens(${currentTokens}) - toSummarizeTokens(${toSummarizeTokens}) < targetTokens(${targetTokens})`
      );
      break;
    }

    // Attempt summarization
    if (toSummarize.length > 0) {
      const summarizeResult = await retryableSummarize(toSummarize);

      if (
        !summarizeResult.success ||
        !summarizeResult.data ||
        summarizeResult.data.trim().length === 0
      ) {
        return {
          currentTokens,
          chats,
          error: `${logPrefix} Summarization failed after maximum retries: ${summarizeResult.data}`,
          memory: toSerializableHypaV3Data(data),
        };
      }

      data.summaries.push({
        text: summarizeResult.data,
        chatMemos: new Set(toSummarize.map((chat) => chat.memo)),
        isImportant: false,
      });
    }

    currentTokens -= toSummarizeTokens;
    startIdx = endIdx;
  }

  console.log(
    logPrefix,
    `${summarizationMode ? "Completed" : "Skipped"} summarization phase:`,
    "\nCurrent Tokens:",
    currentTokens,
    "\nMax Context Tokens:",
    maxContextTokens,
    "\nAvailable Memory Tokens:",
    availableMemoryTokens
  );

  // Early return if no summaries
  if (data.summaries.length === 0) {
    // Generate final memory prompt
    const memory = wrapWithXml(memoryPromptTag, "");

    const newChats: OpenAIChat[] = [
      {
        role: "system",
        content: memory,
        memo: "supaMemory",
      },
      ...chats.slice(startIdx),
    ];

    console.log(
      logPrefix,
      "Exiting function:",
      "\nCurrent Tokens:",
      currentTokens,
      "\nAll chats, including memory prompt:",
      newChats,
      "\nMemory Data:",
      data
    );

    return {
      currentTokens,
      chats: newChats,
      memory: toSerializableHypaV3Data(data),
    };
  }

  const selectedSummaries: Summary[] = [];
  const randomMemoryRatio =
    1 - settings.recentMemoryRatio - settings.similarMemoryRatio;

  // Select important summaries
  const selectedImportantSummaries: Summary[] = [];

  for (const summary of data.summaries) {
    if (summary.isImportant) {
      const summaryTokens = await tokenizer.tokenizeChat({
        role: "system",
        content: summary.text + summarySeparator,
      });

      if (summaryTokens > availableMemoryTokens) {
        break;
      }

      selectedImportantSummaries.push(summary);

      availableMemoryTokens -= summaryTokens;
    }
  }

  selectedSummaries.push(...selectedImportantSummaries);

  console.log(
    logPrefix,
    "After important memory selection:",
    "\nSummary Count:",
    selectedImportantSummaries.length,
    "\nSummaries:",
    selectedImportantSummaries,
    "\nAvailable Memory Tokens:",
    availableMemoryTokens
  );

  // Select recent summaries
  const reservedRecentMemoryTokens = Math.floor(
    availableMemoryTokens * settings.recentMemoryRatio
  );
  let consumedRecentMemoryTokens = 0;

  if (settings.recentMemoryRatio > 0) {
    const selectedRecentSummaries: Summary[] = [];

    // Target only summaries that haven't been selected yet
    const unusedSummaries = data.summaries.filter(
      (e) => !selectedSummaries.includes(e)
    );

    // Add one by one from the end
    for (let i = unusedSummaries.length - 1; i >= 0; i--) {
      const summary = unusedSummaries[i];
      const summaryTokens = await tokenizer.tokenizeChat({
        role: "system",
        content: summary.text + summarySeparator,
      });

      if (
        summaryTokens + consumedRecentMemoryTokens >
        reservedRecentMemoryTokens
      ) {
        break;
      }

      selectedRecentSummaries.push(summary);
      consumedRecentMemoryTokens += summaryTokens;
    }

    selectedSummaries.push(...selectedRecentSummaries);

    console.log(
      logPrefix,
      "After recent memory selection:",
      "\nSummary Count:",
      selectedRecentSummaries.length,
      "\nSummaries:",
      selectedRecentSummaries,
      "\nReserved Tokens:",
      reservedRecentMemoryTokens,
      "\nConsumed Tokens:",
      consumedRecentMemoryTokens
    );
  }

  // Select similar summaries
  let reservedSimilarMemoryTokens = Math.floor(
    availableMemoryTokens * settings.similarMemoryRatio
  );
  let consumedSimilarMemoryTokens = 0;

  if (settings.similarMemoryRatio > 0) {
    const selectedSimilarSummaries: Summary[] = [];

    // Utilize unused token space from recent selection
    if (randomMemoryRatio <= 0) {
      const unusedRecentTokens =
        reservedRecentMemoryTokens - consumedRecentMemoryTokens;

      reservedSimilarMemoryTokens += unusedRecentTokens;
      console.log(
        logPrefix,
        "Additional available token space for similar memory:",
        "\nFrom recent:",
        unusedRecentTokens
      );
    }

    // Target only summaries that haven't been selected yet
    const unusedSummaries = data.summaries.filter(
      (e) => !selectedSummaries.includes(e)
    );

    // Dynamically generate summary chunks
    const summaryChunks: SummaryChunk[] = [];

    unusedSummaries.forEach((summary) => {
      const splitted = summary.text
        .split("\n\n")
        .filter((e) => e.trim().length > 0);

      summaryChunks.push(
        ...splitted.map((e) => ({
          text: e.trim(),
          summary,
        }))
      );
    });

    // Fetch memory from summaryChunks
    const processor = new HypaProcesserEx(db.hypaModel);
    processor.oaikey = db.supaMemoryKey;

    // Add summaryChunks to processor for similarity search
    try {
      await processor.addSummaryChunks(summaryChunks);
    } catch (error) {
      return {
        currentTokens,
        chats,
        error: `${logPrefix} Similarity search failed: ${error}`,
        memory: toSerializableHypaV3Data(data),
      };
    }

    const scoredSummaries = new Map<Summary, number>();

    // (1) Raw recent chat search
    for (let i = 0; i < minChatsForSimilarity; i++) {
      const pop = chats[chats.length - i - 1];

      if (!pop) break;

      if (pop.content.trim().length === 0) continue;

      try {
        const searched = await processor.similaritySearchScoredEx(pop.content);

        for (const [chunk, similarity] of searched) {
          const summary = chunk.summary;

          scoredSummaries.set(
            summary,
            (scoredSummaries.get(summary) || 0) + similarity
          );
        }
      } catch (error) {
        return {
          currentTokens,
          chats,
          error: `${logPrefix} Similarity search failed: ${error}`,
          memory: toSerializableHypaV3Data(data),
        };
      }
    }

    // (2) Summarized recent chat search
    if (settings.enableSimilarityCorrection) {
      // Attempt summarization
      const recentChats = chats
        .slice(-minChatsForSimilarity)
        .filter((e) => e.content.trim().length > 0);

      if (recentChats.length > 1) {
        const summarizeResult = await retryableSummarize(recentChats);

        if (
          !summarizeResult.success ||
          !summarizeResult.data ||
          summarizeResult.data.trim().length === 0
        ) {
          return {
            currentTokens,
            chats,
            error: `${logPrefix} Summarization failed after maximum retries: ${summarizeResult.data}`,
            memory: toSerializableHypaV3Data(data),
          };
        }

        try {
          const searched = await processor.similaritySearchScoredEx(
            summarizeResult.data
          );

          for (const [chunk, similarity] of searched) {
            const summary = chunk.summary;

            scoredSummaries.set(
              summary,
              (scoredSummaries.get(summary) || 0) + similarity
            );
          }
        } catch (error) {
          return {
            currentTokens,
            chats,
            error: `${logPrefix} Similarity search failed: ${error}`,
            memory: toSerializableHypaV3Data(data),
          };
        }

        console.log(logPrefix, "Similarity corrected.");
      }
    }

    // Sort in descending order
    const scoredArray = [...scoredSummaries.entries()].sort(
      ([, scoreA], [, scoreB]) => scoreB - scoreA
    );

    while (scoredArray.length > 0) {
      const [summary] = scoredArray.shift();
      const summaryTokens = await tokenizer.tokenizeChat({
        role: "system",
        content: summary.text + summarySeparator,
      });

      /*
      console.log(
        logPrefix,
        "Trying to add similar summary:",
        "\nSummary Tokens:",
        summaryTokens,
        "\nConsumed Similar Memory Tokens:",
        consumedSimilarMemoryTokens,
        "\nReserved Tokens:",
        reservedSimilarMemoryTokens,
        "\nWould exceed:",
        summaryTokens + consumedSimilarMemoryTokens >
          reservedSimilarMemoryTokens
      );
      */

      if (
        summaryTokens + consumedSimilarMemoryTokens >
        reservedSimilarMemoryTokens
      ) {
        console.log(
          logPrefix,
          "Stopping similar memory selection:",
          `\nconsumedSimilarMemoryTokens(${consumedSimilarMemoryTokens}) + summaryTokens(${summaryTokens}) > reservedSimilarMemoryTokens(${reservedSimilarMemoryTokens})`
        );
        break;
      }

      selectedSimilarSummaries.push(summary);
      consumedSimilarMemoryTokens += summaryTokens;
    }

    selectedSummaries.push(...selectedSimilarSummaries);

    console.log(
      logPrefix,
      "After similar memory selection:",
      "\nSummary Count:",
      selectedSimilarSummaries.length,
      "\nSummaries:",
      selectedSimilarSummaries,
      "\nReserved Tokens:",
      reservedSimilarMemoryTokens,
      "\nConsumed Tokens:",
      consumedSimilarMemoryTokens
    );
  }

  // Select random summaries
  let reservedRandomMemoryTokens = Math.floor(
    availableMemoryTokens * randomMemoryRatio
  );
  let consumedRandomMemoryTokens = 0;

  if (randomMemoryRatio > 0) {
    const selectedRandomSummaries: Summary[] = [];

    // Utilize unused token space from recent and similar selection
    const unusedRecentTokens =
      reservedRecentMemoryTokens - consumedRecentMemoryTokens;
    const unusedSimilarTokens =
      reservedSimilarMemoryTokens - consumedSimilarMemoryTokens;

    reservedRandomMemoryTokens += unusedRecentTokens + unusedSimilarTokens;
    console.log(
      logPrefix,
      "Additional available token space for random memory:",
      "\nFrom recent:",
      unusedRecentTokens,
      "\nFrom similar:",
      unusedSimilarTokens,
      "\nTotal added:",
      unusedRecentTokens + unusedSimilarTokens
    );

    // Target only summaries that haven't been selected yet
    const unusedSummaries = data.summaries
      .filter((e) => !selectedSummaries.includes(e))
      .sort(() => Math.random() - 0.5); // Random shuffle

    for (const summary of unusedSummaries) {
      const summaryTokens = await tokenizer.tokenizeChat({
        role: "system",
        content: summary.text + summarySeparator,
      });

      if (
        summaryTokens + consumedRandomMemoryTokens >
        reservedRandomMemoryTokens
      ) {
        // Trying to select more random memory
        continue;
      }

      selectedRandomSummaries.push(summary);
      consumedRandomMemoryTokens += summaryTokens;
    }

    selectedSummaries.push(...selectedRandomSummaries);

    console.log(
      logPrefix,
      "After random memory selection:",
      "\nSummary Count:",
      selectedRandomSummaries.length,
      "\nSummaries:",
      selectedRandomSummaries,
      "\nReserved Tokens:",
      reservedRandomMemoryTokens,
      "\nConsumed Tokens:",
      consumedRandomMemoryTokens
    );
  }

  // Sort selected summaries chronologically (by index)
  selectedSummaries.sort(
    (a, b) => data.summaries.indexOf(a) - data.summaries.indexOf(b)
  );

  // Generate final memory prompt
  const memory = wrapWithXml(
    memoryPromptTag,
    selectedSummaries.map((e) => e.text).join(summarySeparator)
  );
  const realMemoryTokens = await tokenizer.tokenizeChat({
    role: "system",
    content: memory,
  });

  // Release reserved memory tokens
  if (shouldReserveEmptyMemoryTokens) {
    currentTokens -= emptyMemoryTokens;
  } else {
    currentTokens -= memoryTokens;
  }

  currentTokens += realMemoryTokens;

  console.log(
    logPrefix,
    "Final memory selection:",
    "\nSummary Count:",
    selectedSummaries.length,
    "\nSummaries:",
    selectedSummaries,
    "\nReal Memory Tokens:",
    realMemoryTokens,
    "\nAvailable Memory Tokens:",
    availableMemoryTokens
  );

  if (currentTokens > maxContextTokens) {
    throw new Error(
      `Unexpected error: input token count (${currentTokens}) exceeds max context size (${maxContextTokens})`
    );
  }

  // Save last selected summaries
  data.lastSelectedSummaries = selectedSummaries.map((selectedSummary) =>
    data.summaries.findIndex((summary) => summary === selectedSummary)
  );

  const newChats: OpenAIChat[] = [
    {
      role: "system",
      content: memory,
      memo: "supaMemory",
    },
    ...chats.slice(startIdx),
  ];

  console.log(
    logPrefix,
    "Exiting function:",
    "\nCurrent Tokens:",
    currentTokens,
    "\nAll chats, including memory prompt:",
    newChats,
    "\nMemory Data:",
    data
  );

  return {
    currentTokens,
    chats: newChats,
    memory: toSerializableHypaV3Data(data),
  };
}

function toHypaV3Data(serialData: SerializableHypaV3Data): HypaV3Data {
  return {
    ...serialData,
    summaries: serialData.summaries.map((summary) => ({
      ...summary,
      // Convert null back to undefined (JSON serialization converts undefined to null)
      chatMemos: new Set(
        summary.chatMemos.map((memo) => (memo === null ? undefined : memo))
      ),
    })),
  };
}

function toSerializableHypaV3Data(data: HypaV3Data): SerializableHypaV3Data {
  return {
    ...data,
    summaries: data.summaries.map((summary) => ({
      ...summary,
      chatMemos: [...summary.chatMemos],
    })),
  };
}

function cleanOrphanedSummary(chats: OpenAIChat[], data: HypaV3Data): void {
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

// Helper function to check if one Set is a subset of another
function isSubset(subset: Set<string>, superset: Set<string>): boolean {
  for (const elem of subset) {
    if (!superset.has(elem)) {
      return false;
    }
  }

  return true;
}

function wrapWithXml(tag: string, content: string): string {
  return `<${tag}>${content}</${tag}>`;
}

async function retryableSummarize(
  oaiChats: OpenAIChat[]
): Promise<{ success: boolean; data: string }> {
  let summarizationFailures = 0;

  while (summarizationFailures < maxSummarizationFailures) {
    console.log(
      logPrefix,
      "Attempting summarization:",
      "\nAttempt:",
      summarizationFailures + 1,
      "\nTarget:",
      oaiChats
    );

    const summarizeResult = await summarize(oaiChats);

    if (!summarizeResult.success) {
      console.log(
        logPrefix,
        "Summarization failed:",
        `\n${summarizeResult.data}`
      );
      summarizationFailures++;

      if (summarizationFailures >= maxSummarizationFailures) {
        return summarizeResult;
      }

      continue;
    }

    return summarizeResult;
  }
}

export async function summarize(
  oaiChats: OpenAIChat[]
): Promise<{ success: boolean; data: string }> {
  const db = getDatabase();
  const settings = getCurrentHypaV3Preset().settings;

  const stringifiedChats = oaiChats
    .map((chat) => `${chat.role}: ${chat.content}`)
    .join("\n");

  if (settings.summarizationModel === "distilbart") {
    try {
      const summaryText = (await runSummarizer(stringifiedChats)).trim();
      return { success: true, data: summaryText };
    } catch (error) {
      return {
        success: false,
        data: error,
      };
    }
  }

  const summarizationPrompt =
    settings.summarizationPrompt.trim() === ""
      ? "[Summarize the ongoing role story, It must also remove redundancy and unnecessary text and content from the output.]"
      : settings.summarizationPrompt;

  switch (settings.summarizationModel) {
    case "subModel": {
      console.log(
        logPrefix,
        `Using ax model ${db.subModel} for summarization.`
      );

      const requestMessages: OpenAIChat[] = parseChatML(
        summarizationPrompt.replaceAll("{{slot}}", stringifiedChats)
      ) ?? [
        {
          role: "user",
          content: stringifiedChats,
        },
        {
          role: "system",
          content: summarizationPrompt,
        },
      ];

      const response = await requestChatData(
        {
          formated: requestMessages,
          bias: {},
          useStreaming: false,
          noMultiGen: true,
        },
        "memory"
      );

      if (response.type === "streaming" || response.type === "multiline") {
        return {
          success: false,
          data: "Unexpected response type",
        };
      }

      if (response.type === "fail") {
        return {
          success: false,
          data: response.result,
        };
      }

      return { success: true, data: response.result.trim() };
    }

    default: {
      return {
        success: false,
        data: `Unsupported model ${settings.summarizationModel} for summarization`,
      };
    }
  }
}

function getCurrentHypaV3Preset(): HypaV3Preset {
  const db = getDatabase();
  const preset = db.hypaV3Presets?.[db.hypaV3PresetId];

  if (!preset) {
    throw new Error("Preset not found. Please select a valid preset.");
  }

  return preset;
}

export function createNewHypaV3Preset(
  name = "New Preset",
  existingSettings = {}
): HypaV3Preset {
  return {
    name,
    settings: {
      summarizationModel: "subModel",
      summarizationPrompt: "",
      memoryTokensRatio: 0.2,
      extraSummarizationRatio: 0,
      maxChatsPerSummary: 6,
      recentMemoryRatio: 0.4,
      similarMemoryRatio: 0.4,
      enableSimilarityCorrection: false,
      preserveOrphanedMemory: false,
      processRegexScript: false,
      doNotSummarizeUserMessage: false,
      ...existingSettings,
    },
  };
}

interface SummaryChunkVector {
  chunk: SummaryChunk;
  vector: memoryVector;
}

class HypaProcesserEx extends HypaProcesser {
  // Maintain references to SummaryChunks and their associated memoryVectors
  summaryChunkVectors: SummaryChunkVector[] = [];

  async addSummaryChunks(chunks: SummaryChunk[]): Promise<void> {
    // Maintain the superclass's caching structure by adding texts
    const texts = chunks.map((chunk) => chunk.text);

    await this.addText(texts);

    // Create new SummaryChunkVectors
    const newSummaryChunkVectors: SummaryChunkVector[] = [];

    for (const chunk of chunks) {
      const vector = this.vectors.find((v) => v.content === chunk.text);

      if (!vector) {
        throw new Error(
          `Failed to create vector for summary chunk:\n${chunk.text}`
        );
      }

      newSummaryChunkVectors.push({
        chunk,
        vector,
      });
    }

    // Append new SummaryChunkVectors to the existing collection
    this.summaryChunkVectors.push(...newSummaryChunkVectors);
  }

  async similaritySearchScoredEx(
    query: string
  ): Promise<[SummaryChunk, number][]> {
    const queryVector = (await this.getEmbeds(query))[0];

    return this.summaryChunkVectors
      .map((scv) => ({
        chunk: scv.chunk,
        similarity: similarity(queryVector, scv.vector.embedding),
      }))
      .sort((a, b) => (a.similarity > b.similarity ? -1 : 0))
      .map((result) => [result.chunk, result.similarity]);
  }
}

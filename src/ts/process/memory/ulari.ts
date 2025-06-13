import {
  getDatabase,
  type Chat,
  type character,
  type groupChat,
} from "src/ts/storage/database.svelte";
import { hypaV3ProgressStore } from "src/ts/stores.svelte";
import { type ChatTokenizer } from "src/ts/tokenizer";
import { type OpenAIChat } from "../index.svelte";
import { unloadEngine } from "../webllm";
import { cleanOrphanedSummary, summarize, toMemoryData, toSerializableMemoryData } from "./core";
import { createHypaV3Preset, type HypaV3Preset, type HypaV3Result, type HypaV3Settings } from "./hypav3";
import { TaskRateLimiter } from "./taskRateLimiter";
import { UlariProcessor, type EmbeddingText } from "./ularimemory";
import { generateUniqueId, wrapWithXml } from "./utils";

export type UlariSettings = { hybridSearchWeightsRatio: number } & HypaV3Settings
export type UlariPreset = {
  settings: UlariSettings;
} & HypaV3Preset

// compatibility
export type UlariResult = HypaV3Result

interface UlariData {
  summaries: Summary[];
  lastSelectedSummaries?: number[]; // legacy
  metrics?: {
    lastImportantSummaries: number[];
    lastRecentSummaries: number[];
    lastSimilarSummaries: number[];
    lastRandomSummaries: number[];
  };
}

export type SerializableUlariData = {
  summaries: SerializableSummary[];
} & Omit<UlariData, "summaries">;

interface Summary {
  text: string;
  chatMemos: Set<string>;
  isImportant: boolean;
  id: string;
}

type SerializableSummary = {
  chatMemos: string[];
} & Omit<Summary, "chatMemos">;

const logPrefix = "[UlariMemory]";
const memoryPromptTag = "Past Events Summary";
const minChatsForSimilarity = 3;
const summarySeparator = "\n\n";

function getCurrentMemoryPreset(): UlariPreset {
  const db = getDatabase();
  const preset = db.ulariPresets?.[db.ulariPresetId];

  if (!preset) {
    throw new Error("Preset not found. Please select a valid preset.");
  }

  return preset;
}

export function createUlariPreset(
  name = "New Ulari Preset",
  existingSettings = {}
): UlariPreset {
  const settings = createHypaV3Preset(name, existingSettings).settings as UlariSettings;

  settings.hybridSearchWeightsRatio = existingSettings['hybridSearchWeightsRatio'] ?? 0.4; // Default value for hybrid search ratio (vector 6 : keyword 4)

  return {
    name,
    settings,
  }
}

function validateUlariSettings(settings: UlariSettings, context: { currentTokens: number, chats: OpenAIChat[] }): UlariResult {
  if (settings.hybridSearchWeightsRatio < 0 || settings.hybridSearchWeightsRatio > 1) {
    return {
      currentTokens: context.currentTokens,
      chats: context.chats,
      error: `${logPrefix} Hybrid Search Ratio must be between 0 and 1.`,
    }
  }

  if (settings.recentMemoryRatio + settings.similarMemoryRatio > 1) {
    return {
      currentTokens: context.currentTokens,
      chats: context.chats,
      error: `${logPrefix} The sum of Recent Memory Ratio and Similar Memory Ratio is greater than 1.`,
    };
  }
}

export async function runUlariEngine(
  ...args: Parameters<typeof runUlariMemory>
): Promise<HypaV3Result> {
  const settings = getCurrentMemoryPreset().settings;

  try {
    return await runUlariMemory(...args);
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
  } finally {
    if (settings.summarizationModel !== "subModel") {
      try {
        await unloadEngine();
      } catch { }
    }
  }
}

async function runUlariMemory(
  chats: OpenAIChat[],
  currentTokens: number,
  maxContextTokens: number,
  room: Chat,
  char: character | groupChat,
  tokenizer: ChatTokenizer
): Promise<UlariResult> {
  const db = getDatabase();
  const settings = getCurrentMemoryPreset().settings;

  // Validate settings
  const validationError = validateUlariSettings(settings, { currentTokens, chats });
  if (validationError) {
    return validationError;
  }

  // Initial token correction
  currentTokens -= db.maxResponse;

  // Load existing hypa data if available
  const data: UlariData = room.hypaV3Data
    ? toMemoryData(room.hypaV3Data) as UlariData
    : {
      summaries: [],
    };

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

  console.log(logPrefix, "Starting index:", startIdx);

  // Reserve memory tokens
  const emptyMemoryTokens = await tokenizer.tokenizeChat({
    role: "system",
    content: wrapWithXml(memoryPromptTag, ""),
  });
  const memoryTokens = Math.floor(
    maxContextTokens * settings.memoryTokensRatio
  );
  const shouldReserveMemoryTokens =
    data.summaries.length > 0 || currentTokens > maxContextTokens;
  let availableMemoryTokens = shouldReserveMemoryTokens
    ? memoryTokens - emptyMemoryTokens
    : 0;

  if (shouldReserveMemoryTokens) {
    currentTokens += memoryTokens;
    console.log(logPrefix, "Reserved memory tokens:", memoryTokens);
  }

  // If summarization is needed
  const summarizationMode = currentTokens > maxContextTokens;
  const targetTokens =
    maxContextTokens * (1 - settings.extraSummarizationRatio);
  const toSummarizeArray: OpenAIChat[][] = [];

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
          memory: toSerializableMemoryData(data),
        };
      }
    }

    const toSummarize: OpenAIChat[] = [];
    let toSummarizeTokens = 0;
    let currentIndex = startIdx;

    console.log(
      logPrefix,
      "Evaluating summarization batch:",
      "\nCurrent Tokens:",
      currentTokens,
      "\nMax Context Tokens:",
      maxContextTokens,
      "\nStart Index:",
      startIdx,
      "\nMax Chats Per Summary:",
      settings.maxChatsPerSummary
    );

    while (
      toSummarize.length < settings.maxChatsPerSummary &&
      currentIndex < chats.length - minChatsForSimilarity
    ) {
      const chat = chats[currentIndex];
      const chatTokens = await tokenizer.tokenizeChat(chat);

      console.log(
        logPrefix,
        "Evaluating chat:",
        "\nIndex:",
        currentIndex,
        "\nRole:",
        chat.role,
        "\nContent:",
        "\n" + chat.content,
        "\nTokens:",
        chatTokens
      );

      toSummarizeTokens += chatTokens;

      let shouldSummarize = true;

      if (
        chat.name === "example_user" ||
        chat.name === "example_assistant" ||
        chat.memo === "NewChatExample"
      ) {
        console.log(
          logPrefix,
          `Skipping example chat at index ${currentIndex}`
        );
        shouldSummarize = false;
      }

      if (chat.memo === "NewChat") {
        console.log(logPrefix, `Skipping new chat at index ${currentIndex}`);
        shouldSummarize = false;
      }

      if (chat.content.trim().length === 0) {
        console.log(logPrefix, `Skipping empty chat at index ${currentIndex}`);
        shouldSummarize = false;
      }

      if (settings.doNotSummarizeUserMessage && chat.role === "user") {
        console.log(logPrefix, `Skipping user role at index ${currentIndex}`);
        shouldSummarize = false;
      }

      if (shouldSummarize) {
        toSummarize.push(chat);
      }

      currentIndex++;
    }

    // Stop summarization if further reduction would go below target tokens (unless we're over max tokens)
    if (
      currentTokens <= maxContextTokens &&
      currentTokens - toSummarizeTokens < targetTokens
    ) {
      console.log(
        logPrefix,
        "Stopping summarization:",
        `\ncurrentTokens(${currentTokens}) - toSummarizeTokens(${toSummarizeTokens}) < targetTokens(${targetTokens})`
      );
      break;
    }

    // Collect summarization batch
    if (toSummarize.length > 0) {
      console.log(
        logPrefix,
        "Collecting summarization batch:",
        "\nTarget:",
        toSummarize
      );

      toSummarizeArray.push([...toSummarize]);
    }

    currentTokens -= toSummarizeTokens;
    startIdx = currentIndex;
  }

  // Process all collected summarization tasks
  if (toSummarizeArray.length > 0) {
    // Initialize rate limiter
    // Local model must be processed sequentially
    const rateLimiter = new TaskRateLimiter({
      tasksPerMinute:
        settings.summarizationModel === "subModel"
          ? settings.summarizationRequestsPerMinute
          : 1000,
      maxConcurrentTasks:
        settings.summarizationModel === "subModel"
          ? settings.summarizationMaxConcurrent
          : 1,
    });

    rateLimiter.taskQueueChangeCallback = (queuedCount) => {
      hypaV3ProgressStore.set({
        open: true,
        miniMsg: `${rateLimiter.queuedTaskCount}`,
        msg: `${logPrefix} Summarizing...`,
        subMsg: `${rateLimiter.queuedTaskCount} queued`,
      });
    };

    const summarizationTasks = toSummarizeArray.map(
      (item) => () => summarize(item, settings)
    );

    // Start of performance measurement: summarize
    console.log(
      logPrefix,
      `Starting ${toSummarizeArray.length} summarization.`
    );
    const summarizeStartTime = performance.now();

    const batchResult = await rateLimiter.executeBatch<string>(
      summarizationTasks
    );

    const summarizeEndTime = performance.now();
    console.debug(
      `${logPrefix} summarization completed in ${summarizeEndTime - summarizeStartTime
      }ms`
    );
    // End of performance measurement: summarize

    hypaV3ProgressStore.set({
      open: false,
      miniMsg: "",
      msg: "",
      subMsg: "",
    });

    // Note:
    // We can't save some successful summaries to the DB temporarily
    // because don't know the actual summarization model name.
    // It is possible that the user can change the summarization model.
    for (let i = 0; i < batchResult.results.length; i++) {
      const result = batchResult.results[i];

      // Push consecutive successes
      if (!result.success || !result.data) {
        const errorMessage = !result.success
          ? result.error
          : "Empty summary returned";

        console.log(logPrefix, "Summarization failed:", `\n${errorMessage}`);

        return {
          currentTokens,
          chats,
          error: `${logPrefix} Summarization failed: ${errorMessage}`,
          memory: toSerializableMemoryData(data),
        };
      }

      const summaryText = result.data;

      data.summaries.push({
        text: summaryText,
        chatMemos: new Set(toSummarizeArray[i].map((chat) => chat.memo)),
        isImportant: false,
        id: generateUniqueId()
      });
    }
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
    const newChats: OpenAIChat[] = chats.slice(startIdx);

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
      memory: toSerializableMemoryData(data),
    };
  }

  const selectedSummaries: Summary[] = [];
  const randomMemoryRatio =
    1 - settings.recentMemoryRatio - settings.similarMemoryRatio;
  const selectedImportantSummaries: Summary[] = [];

  // Select important summaries
  {
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
  }

  // Select recent summaries
  const reservedRecentMemoryTokens = Math.floor(
    availableMemoryTokens * settings.recentMemoryRatio
  );
  let consumedRecentMemoryTokens = 0;
  const selectedRecentSummaries: Summary[] = [];

  if (settings.recentMemoryRatio > 0) {
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
  const selectedSimilarSummaries: Summary[] = [];

  if (settings.similarMemoryRatio > 0) {
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

    // Dynamically generate embedding texts
    const ebdTexts: EmbeddingText<Summary>[] = unusedSummaries.flatMap(
      (summary) => {
        const splitted = summary.text
          .split("\n\n")
          .filter((e) => e.trim().length > 0);

        return splitted.map((e, i) => ({
          content: e.trim(),
          metadata: summary,
          id: summary.id,
          chunkId: `${summary.id}-${i}`,
        }));
      }
    );

    const vectorWeight = 1 - settings.hybridSearchWeightsRatio;
    const keywordWeight = settings.hybridSearchWeightsRatio;

    // Initialize embedding processor
    const processor = new UlariProcessor<Summary>({
      rateLimiter: new TaskRateLimiter({
        tasksPerMinute: settings.embeddingRequestsPerMinute,
        maxConcurrentTasks: settings.embeddingMaxConcurrent,
      }),
      hybridWeights: {
        vector: vectorWeight,
        keyword: keywordWeight,
      }
    });

    processor.progressCallback = (queuedCount) => {
      hypaV3ProgressStore.set({
        open: true,
        miniMsg: `${queuedCount}`,
        msg: `${logPrefix} Similarity searching...`,
        subMsg: `${queuedCount} queued`,
      });
    };

    try {
      // Start of performance measurement: addTexts
      console.log(
        `${logPrefix} Starting addTexts with ${ebdTexts.length} chunks`
      );
      const addStartTime = performance.now();

      // Add EmbeddingTexts to processor for similarity search
      await processor.addTexts(ebdTexts);

      const addEndTime = performance.now();
      console.debug(
        `${logPrefix} addTexts completed in ${addEndTime - addStartTime}ms`
      );
      // End of performance measurement: addTexts
    } catch (error) {
      return {
        currentTokens,
        chats,
        error: `${logPrefix} Similarity search failed: ${error}`,
        memory: toSerializableMemoryData(data),
      };
    } finally {
      hypaV3ProgressStore.set({
        open: false,
        miniMsg: "",
        msg: "",
        subMsg: "",
      });
    }

    const recentChats = chats
      .slice(-minChatsForSimilarity)
      .filter((chat) => chat.content.trim().length > 0);
    const queries: string[] = recentChats.flatMap((chat) => {
      return chat.content.split("\n\n").filter((e) => e.trim().length > 0);
    });

    if (queries.length > 0) {
      const scoredSummaries = new Map<Summary, number>();

      try {
        // Start of performance measurement: similarity search
        console.log(
          `${logPrefix} Starting similarity search with ${recentChats.length} queries`
        );
        const searchStartTime = performance.now();

        const batchRankedResults = await processor.hybridSearchQueries(
          queries
        );

        const searchEndTime = performance.now();
        console.debug(
          `${logPrefix} Similarity search completed in ${searchEndTime - searchStartTime
          }ms`
        );
        // End of performance measurement: similarity search

        for (const rankedResults of batchRankedResults) {
          for (const result of rankedResults) {
            const summary = result.metadata;

            scoredSummaries.set(
              summary,
              (scoredSummaries.get(summary) || 0) + result.score
            );
          }
        }
      } catch (error) {
        return {
          currentTokens,
          chats,
          error: `${logPrefix} Similarity search failed: ${error}`,
          memory: toSerializableMemoryData(data),
        };
      } finally {
        hypaV3ProgressStore.set({
          open: false,
          miniMsg: "",
          msg: "",
          subMsg: "",
        });
      }

      const maxScore = Math.max(...scoredSummaries.values())
      const scoredArray = [...scoredSummaries.entries()]
        .map(([summary, score]) => ({
          summary,
          score: score / maxScore, // Normalize scores
          // Normalize scores to [0, 1] range
        }))
        .sort((a, b) => b.score - a.score); // Sort in descending order

      while (scoredArray.length > 0) {
        const { summary } = scoredArray.shift();
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
    }

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
  const selectedRandomSummaries: Summary[] = [];

  if (randomMemoryRatio > 0) {
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
  if (shouldReserveMemoryTokens) {
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
  data.metrics = {
    lastImportantSummaries: selectedImportantSummaries.map((selected) =>
      data.summaries.findIndex((sum) => sum === selected)
    ),
    lastRecentSummaries: selectedRecentSummaries.map((selected) =>
      data.summaries.findIndex((sum) => sum === selected)
    ),
    lastSimilarSummaries: selectedSimilarSummaries.map((selected) =>
      data.summaries.findIndex((sum) => sum === selected)
    ),
    lastRandomSummaries: selectedRandomSummaries.map((selected) =>
      data.summaries.findIndex((sum) => sum === selected)
    ),
  };

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
    memory: toSerializableMemoryData(data),
  };
}

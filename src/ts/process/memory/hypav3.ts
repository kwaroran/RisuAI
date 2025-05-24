import { type memoryVector, HypaProcesser, similarity } from "./hypamemory";
import { TaskRateLimiter } from "./taskRateLimiter";
import { type EmbeddingText, HypaProcessorV2 } from "./hypamemoryv2";
import {
  type Chat,
  type character,
  type groupChat,
  getDatabase,
} from "src/ts/storage/database.svelte";
import { type OpenAIChat } from "../index.svelte";
import { requestChatData } from "../request";
import { chatCompletion, unloadEngine } from "../webllm";
import { parseChatML } from "src/ts/parser.svelte";
import { hypaV3ProgressStore } from "src/ts/stores.svelte";
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
  // Experimental
  useExperimentalImpl: boolean;
  summarizationRequestsPerMinute: number;
  summarizationMaxConcurrent: number;
  embeddingRequestsPerMinute: number;
  embeddingMaxConcurrent: number;
}

interface HypaV3Data {
  summaries: Summary[];
  lastSelectedSummaries?: number[]; // legacy
  metrics?: {
    lastImportantSummaries: number[];
    lastRecentSummaries: number[];
    lastSimilarSummaries: number[];
    lastRandomSummaries: number[];
  };
}

export interface SerializableHypaV3Data {
  summaries: {
    text: string;
    chatMemos: string[];
    isImportant: boolean;
  }[];
  lastSelectedSummaries?: number[]; // legacy
  metrics?: {
    lastImportantSummaries: number[];
    lastRecentSummaries: number[];
    lastSimilarSummaries: number[];
    lastRandomSummaries: number[];
  };
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

export interface HypaV3Result {
  currentTokens: number;
  chats: OpenAIChat[];
  error?: string;
  memory?: SerializableHypaV3Data;
}

const logPrefix = "[HypaV3]";
const memoryPromptTag = "Past Events Summary";
const minChatsForSimilarity = 3;
const summarySeparator = "\n\n";

export async function hypaMemoryV3(
  chats: OpenAIChat[],
  currentTokens: number,
  maxContextTokens: number,
  room: Chat,
  char: character | groupChat,
  tokenizer: ChatTokenizer
): Promise<HypaV3Result> {
  const settings = getCurrentHypaV3Preset().settings;

  try {
    if (settings.useExperimentalImpl) {
      console.log(logPrefix, "Using experimental implementation.");

      return await hypaMemoryV3MainExp(
        chats,
        currentTokens,
        maxContextTokens,
        room,
        char,
        tokenizer
      );
    }

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
  } finally {
    if (settings.summarizationModel !== "subModel") {
      try {
        await unloadEngine();
      } catch {}
    }
  }
}

async function hypaMemoryV3MainExp(
  chats: OpenAIChat[],
  currentTokens: number,
  maxContextTokens: number,
  room: Chat,
  char: character | groupChat,
  tokenizer: ChatTokenizer
): Promise<HypaV3Result> {
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
  const data: HypaV3Data = room.hypaV3Data
    ? toHypaV3Data(room.hypaV3Data)
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
          memory: toSerializableHypaV3Data(data),
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
      (item) => () => summarize(item)
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
      `${logPrefix} summarization completed in ${
        summarizeEndTime - summarizeStartTime
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
          memory: toSerializableHypaV3Data(data),
        };
      }

      const summaryText = result.data;

      data.summaries.push({
        text: summaryText,
        chatMemos: new Set(toSummarizeArray[i].map((chat) => chat.memo)),
        isImportant: false,
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
      memory: toSerializableHypaV3Data(data),
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

        return splitted.map((e) => ({
          content: e.trim(),
          metadata: summary,
        }));
      }
    );

    // Initialize embedding processor
    const processor = new HypaProcessorV2<Summary>({
      rateLimiter: new TaskRateLimiter({
        tasksPerMinute: settings.embeddingRequestsPerMinute,
        maxConcurrentTasks: settings.embeddingMaxConcurrent,
      }),
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
        memory: toSerializableHypaV3Data(data),
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

        const batchScoredResults = await processor.similaritySearchScoredBatch(
          queries
        );

        const searchEndTime = performance.now();
        console.debug(
          `${logPrefix} Similarity search completed in ${
            searchEndTime - searchStartTime
          }ms`
        );
        // End of performance measurement: similarity search

        for (const scoredResults of batchScoredResults) {
          for (const [ebdResult, similarity] of scoredResults) {
            const summary = ebdResult.metadata;

            scoredSummaries.set(
              summary,
              (scoredSummaries.get(summary) || 0) + similarity
            );
          }
        }
      } catch (error) {
        return {
          currentTokens,
          chats,
          error: `${logPrefix} Similarity search failed: ${error}`,
          memory: toSerializableHypaV3Data(data),
        };
      } finally {
        hypaV3ProgressStore.set({
          open: false,
          miniMsg: "",
          msg: "",
          subMsg: "",
        });
      }

      // Normalize scores
      if (scoredSummaries.size > 0) {
        const maxScore = Math.max(...scoredSummaries.values());

        for (const [summary, score] of scoredSummaries.entries()) {
          scoredSummaries.set(summary, score / maxScore);
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
    memory: toSerializableHypaV3Data(data),
  };
}

async function hypaMemoryV3Main(
  chats: OpenAIChat[],
  currentTokens: number,
  maxContextTokens: number,
  room: Chat,
  char: character | groupChat,
  tokenizer: ChatTokenizer
): Promise<HypaV3Result> {
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
  const data: HypaV3Data = room.hypaV3Data
    ? toHypaV3Data(room.hypaV3Data)
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
  const summarizationMode = currentTokens > maxContextTokens;
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
        `\ncurrentTokens(${currentTokens}) - toSummarizeTokens(${toSummarizeTokens}) < targetTokens(${targetTokens})`
      );
      break;
    }

    // Attempt summarization
    if (toSummarize.length > 0) {
      console.log(
        logPrefix,
        "Attempting summarization:",
        "\nTarget:",
        toSummarize
      );

      try {
        const summarizeResult = await summarize(toSummarize);

        data.summaries.push({
          text: summarizeResult,
          chatMemos: new Set(toSummarize.map((chat) => chat.memo)),
          isImportant: false,
        });
      } catch (error) {
        console.log(logPrefix, "Summarization failed:", `\n${error}`);

        return {
          currentTokens,
          chats,
          error: `${logPrefix} Summarization failed: ${error}`,
          memory: toSerializableHypaV3Data(data),
        };
      }
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

    // Initialize embedding processor
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
    const recentChats = chats
      .slice(-minChatsForSimilarity)
      .filter((chat) => chat.content.trim().length > 0);

    if (recentChats.length > 0) {
      // Raw recent chat search
      const queries = recentChats.map((chat) => chat.content);

      if (settings.enableSimilarityCorrection && recentChats.length > 1) {
        // Raw + Summarized recent chat search
        // Summarizing is meaningful when there are more than 2 recent chats

        // Attempt summarization
        console.log(
          logPrefix,
          "Attempting summarization for similarity search:",
          "\nTarget:",
          recentChats
        );

        try {
          const summarizeResult = await summarize(recentChats);

          queries.push(summarizeResult);
        } catch (error) {
          console.log(logPrefix, "Summarization failed:", `\n${error}`);

          return {
            currentTokens,
            chats,
            error: `${logPrefix} Summarization failed: ${error}`,
            memory: toSerializableHypaV3Data(data),
          };
        }
      }

      try {
        for (const query of queries) {
          const scoredChunks = await processor.similaritySearchScoredEx(query);

          for (const [chunk, similarity] of scoredChunks) {
            const summary = chunk.summary;

            scoredSummaries.set(
              summary,
              (scoredSummaries.get(summary) || 0) + similarity
            );
          }
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
    memory: toSerializableHypaV3Data(data),
  };
}

function toHypaV3Data(serialData: SerializableHypaV3Data): HypaV3Data {
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

function isSubset(subset: Set<string>, superset: Set<string>): boolean {
  for (const elem of subset) {
    if (!superset.has(elem)) {
      return false;
    }
  }

  return true;
}

function wrapWithXml(tag: string, content: string): string {
  return `<${tag}>\n${content}\n</${tag}>`;
}

export async function summarize(oaiMessages: OpenAIChat[]): Promise<string> {
  const db = getDatabase();
  const settings = getCurrentHypaV3Preset().settings;

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

export function getCurrentHypaV3Preset(): HypaV3Preset {
  const db = getDatabase();
  const preset = db.hypaV3Presets?.[db.hypaV3PresetId];

  if (!preset) {
    throw new Error("Preset not found. Please select a valid preset.");
  }

  return preset;
}

export function createHypaV3Preset(
  name = "New Preset",
  existingSettings = {}
): HypaV3Preset {
  const settings: HypaV3Settings = {
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
    // Experimental
    useExperimentalImpl: false,
    summarizationRequestsPerMinute: 20,
    summarizationMaxConcurrent: 1,
    embeddingRequestsPerMinute: 100,
    embeddingMaxConcurrent: 1,
  };

  if (
    existingSettings &&
    typeof existingSettings === "object" &&
    !Array.isArray(existingSettings)
  ) {
    for (const [key, value] of Object.entries(existingSettings)) {
      if (key in settings && typeof value === typeof settings[key]) {
        settings[key] = value;
      }
    }
  }

  return {
    name,
    settings,
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

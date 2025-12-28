import {
    getDatabase,
    type Chat,
    type character,
    type groupChat,
} from "src/ts/storage/database.svelte";
import type { OpenAIChat } from "../index.svelte";
import type { ChatTokenizer } from "src/ts/tokenizer";
import { requestChatData } from "../request/request";
import { HypaProcesser } from "./hypamemory";
import { globalFetch } from "src/ts/globalApi.svelte";
import { runSummarizer } from "../transformers";
import { parseChatML } from "src/ts/parser.svelte";

export interface HypaV2Data {
    lastMainChunkID: number; // can be removed, but exists to more readability of the code.
    mainChunks: { // summary itself
        id: number;
        text: string;
        chatMemos: Set<string>; // UUIDs of summarized chats
        lastChatMemo: string;
    }[];
    chunks: { // split mainChunks for retrieval or something. Although quite uncomfortable logic, so maybe I will delete it soon.
        mainChunkID: number;
        text:string;
    }[];
}

// Reuse HypaV2Data and override only chatMemos in mainChunks
export interface SerializableHypaV2Data extends Omit<HypaV2Data, 'mainChunks'> {
    mainChunks: {
        id: number;
        text: string;
        chatMemos: string[]; // Override Set<string> with string[]
        lastChatMemo: string;
    }[];
}

async function summary(
    stringlizedChat: string
): Promise<{ success: boolean; data: string }> {
    const db = getDatabase();
    console.log("Summarizing");

    if (db.supaModelType === "distilbart") {
        try {
            const sum = await runSummarizer(stringlizedChat);
            return { success: true, data: sum };
        } catch (error) {
            return {
                success: false,
                data: "SupaMemory: Summarizer: " + `${error}`,
            };
        }
    }

    const supaPrompt =
        db.supaMemoryPrompt === ""
            ? "[Summarize the ongoing role story, It must also remove redundancy and unnecessary text and content from the output.]\n"
            : db.supaMemoryPrompt;
    let result = "";

    if (db.supaModelType !== "subModel") {
        const promptbody = stringlizedChat + "\n\n" + supaPrompt + "\n\nOutput:";

        const da = await globalFetch("https://api.openai.com/v1/completions", {
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + db.supaMemoryKey,
            },
            method: "POST",
            body: {
                model:
                    db.supaModelType === "curie"
                        ? "text-curie-001"
                        : db.supaModelType === "instruct35"
                            ? "gpt-3.5-turbo-instruct"
                            : "text-davinci-003",
                prompt: promptbody,
                max_tokens: 600,
                temperature: 0,
            },
        });
        console.log("Using openAI instruct 3.5 for SupaMemory");

        try {
            if (!da.ok) {
                return {
                    success: false,
                    data: "SupaMemory: HTTP: " + JSON.stringify(da),
                };
            }

            result = (await da.data)?.choices[0]?.text?.trim();

            if (!result) {
                return {
                    success: false,
                    data: "SupaMemory: HTTP: " + JSON.stringify(da),
                };
            }

            return { success: true, data: result };
        } catch (error) {
            return {
                success: false,
                data: "SupaMemory: HTTP: " + error,
            };
        }
    } else {
        let parsedPrompt = parseChatML(
            supaPrompt.replaceAll("{{slot}}", stringlizedChat)
        );

        const promptbody: OpenAIChat[] = (parsedPrompt ?? [
            {
                role: "user",
                content: stringlizedChat,
            },
            {
                role: "system",
                content: supaPrompt
            }
        ]).map(message => ({
            ...message,
            memo: "supaPrompt"
        }));
        console.log("Using submodel: ", db.subModel, "for supaMemory model");
        const da = await requestChatData({
            formated: promptbody,
            bias: {},
            useStreaming: false,
            noMultiGen: true
        }, 'memory');
        if (da.type === 'fail' || da.type === 'streaming' || da.type === 'multiline') {
            return {
                success: false,
                data: "SupaMemory: HTTP: " + da.result,
            };
        }
        result = da.result;
    }
    return { success: true, data: result };
} // No, I am not going to touch any http API calls.

// Helper function start
export interface OldHypaV2Data {
    chunks: {
        text: string;
        targetId: string;
    }[];
    mainChunks: {
        text: string;
        targetId: string;
    }[];
}

function isSubset<T>(subset: Set<T>, superset: Set<T>): boolean {
    for (const item of subset) {
        if (!superset.has(item)) {
            return false;
        }
    }
    return true;
}
function isOldHypaV2Data(obj:any): obj is OldHypaV2Data {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        Array.isArray(obj.chunks) &&
        Array.isArray(obj.mainChunks) &&
        obj.chunks.every(chunk =>
            typeof chunk === 'object' &&
            chunk !== null &&
            typeof chunk.text === 'string' &&
            typeof chunk.targetId === 'string'
        ) &&
        obj.mainChunks.every(mainChunk =>
            typeof mainChunk === 'object' &&
            mainChunk !== null &&
            typeof mainChunk.text === 'string' &&
            typeof mainChunk.targetId === 'string'
        )
    );
}
// Helper function end

function convertOldToNewHypaV2Data(oldData: OldHypaV2Data, chats: OpenAIChat[]): HypaV2Data {
    const oldMainChunks = oldData.mainChunks.slice().reverse(); // Inversed order, old mainchunk is done by unshift instead of push
    const oldChunks = oldData.chunks.slice();
    const newData: HypaV2Data = {
        lastMainChunkID: 0,
        mainChunks: [],
        chunks: [],
    };

    const mainChunkTargetIds = new Set<string>();
    for (const mc of oldMainChunks) {
        if (mc.targetId) {
            mainChunkTargetIds.add(mc.targetId);
        }
    }

    // map chat memo to index, efficiency issues
    const chatMemoToIndex = new Map<string, number>();
    for (const tid of mainChunkTargetIds) {
        const idx = chats.findIndex(c => c.memo === tid);
        if (idx !== -1) {
            chatMemoToIndex.set(tid, idx);
        } else {
            chatMemoToIndex.set(tid, -1);
        }
    }

    for (let i = 0; i < oldMainChunks.length; i++) {
        const oldMainChunk = oldMainChunks[i];
        const targetId = oldMainChunk.targetId;
        const mainChunkText = oldMainChunk.text;

        const previousMainChunk = i > 0 ? oldMainChunks[i - 1] : null;
        const previousMainChunkTarget = previousMainChunk ? previousMainChunk.targetId : null;

        let chatMemos = new Set<string>();

        if (previousMainChunkTarget && targetId) {
            const startIndex = chatMemoToIndex.get(previousMainChunkTarget) ?? -1;
            const endIndex = chatMemoToIndex.get(targetId) ?? -1;

            if (startIndex !== -1 && endIndex !== -1) {
                const lowerIndex = Math.min(startIndex, endIndex);
                const upperIndex = Math.max(startIndex, endIndex);

                for (let j = lowerIndex; j <= upperIndex; j++) {
                    chatMemos.add(chats[j].memo);
                }
            } else {
                // Can't identify the chats correctly, so discard this main chunk at all
                continue; // Technically, if this is the case Previous HypaV2Data is bugged. Discussion opened for changing it to break;
            }
        } else {
            // No previous chunk, so we gather all chats from index 0 up to the targetId's index
            if (targetId) {
                const targetIndex = chatMemoToIndex.get(targetId) ?? -1;
                if (targetIndex !== -1) {
                    // Include all memos from 0 up to targetIndex
                    for (let j = 0; j <= targetIndex; j++) {
                        chatMemos.add(chats[j].memo);
                    }
                } else {
                    continue; // Invalid MainChunk.
                }
            }
        }
        const newMainChunk = {
            id: newData.lastMainChunkID,
            text: mainChunkText,
            chatMemos: chatMemos,
            lastChatMemo: targetId,
        }
        newData.mainChunks.push(newMainChunk);
        newData.lastMainChunkID++;
        // Adding chunks accordingly, matching MainChunkID by leveraging same targetId
        const matchingOldChunks = oldChunks.filter((oldChunk) => oldChunk.targetId === targetId);
        for (const oldChunk of matchingOldChunks) {
            newData.chunks.push({
                mainChunkID: newMainChunk.id,
                text: oldChunk.text,
            });
        }
    }

    return newData; // updated HypaV2Data
}

function cleanInvalidChunks(
    chats: OpenAIChat[],
    data: HypaV2Data,
): void {
    const currentChatMemos = new Set(chats.map((chat) => chat.memo));

    // mainChunks filtering
    data.mainChunks = data.mainChunks.filter((mainChunk) => {
        return isSubset(mainChunk.chatMemos, currentChatMemos);
    });

    // chunk filtering based on mainChunk's id
    const validMainChunkIds = new Set(data.mainChunks.map((mainChunk) => mainChunk.id));
    data.chunks = data.chunks.filter((chunk) =>
        validMainChunkIds.has(chunk.mainChunkID)
    );
    // Update lastMainChunkID
    if (data.mainChunks.length > 0) {
        data.lastMainChunkID = data.mainChunks[data.mainChunks.length - 1].id;
    } else {
        data.lastMainChunkID = 0;
    }
}

export async function regenerateSummary(
    chats: OpenAIChat[],
    data: HypaV2Data,
    mainChunkIndex: number
) : Promise<void> {
    const targetMainChunk = data.mainChunks[mainChunkIndex];

}

function toSerializableHypaV2Data(data: HypaV2Data): SerializableHypaV2Data {
    return {
        ...data,
        mainChunks: data.mainChunks.map(mainChunk => ({
            ...mainChunk,
            chatMemos: Array.from(mainChunk.chatMemos),
        })),
    };
}
    
function toHypaV2Data(data: SerializableHypaV2Data): HypaV2Data {
    // Handle corrupted data due to invalid json serialization
    data.mainChunks.forEach((mainChunk) => {
        if (!Array.isArray(mainChunk.chatMemos)) {
            mainChunk.chatMemos = [];
        }
    });

    return {
        ...data,
        mainChunks: data.mainChunks.map(mainChunk => ({
            ...mainChunk,
            chatMemos: new Set(mainChunk.chatMemos),
        })),
    };
}

export async function hypaMemoryV2(
    chats: OpenAIChat[],
    currentTokens: number,
    maxContextTokens: number,
    room: Chat,
    char: character | groupChat,
    tokenizer: ChatTokenizer
): Promise<{
    currentTokens: number;
    chats: OpenAIChat[];
    error?: string;
    memory?: SerializableHypaV2Data;
}> {
    const db = getDatabase();
    let data: HypaV2Data = {
        lastMainChunkID: 0,
        chunks: [],
        mainChunks: [],
    };

    // Subtract maxResponse from currentTokens to fix the token calculation issue.
    // This is not a fundamental solution but rather a temporary fix.
    // It is designed to minimize impact on other code.
    currentTokens -= db.maxResponse;

    if (room.hypaV2Data) {
        if (isOldHypaV2Data(room.hypaV2Data)) {
        console.log("Old HypaV2 data detected. Converting to new format...");
        data = convertOldToNewHypaV2Data(room.hypaV2Data, chats);
        } else {
            data = toHypaV2Data(room.hypaV2Data);
        }
    }

    // Clean invalid HypaV2 data
    cleanInvalidChunks(chats, data);

    let allocatedTokens = db.hypaAllocatedTokens;
    let chunkSize = db.hypaChunkSize;
    currentTokens += allocatedTokens; // WARNING: VIRTUAL VALUE. This token is NOT real. This is a placeholder appended to calculate the maximum amount of HypaV2 memory retrieved data.
    let mainPrompt = "";
    const lastTwoChats = chats.slice(-2);
    // Error handling for failed summarization
    let summarizationFailures = 0;
    const maxSummarizationFailures = 3;

    // Find the index to start summarizing from
    let idx = 0;
    if (data.mainChunks.length > 0) {
        const lastMainChunk = data.mainChunks[data.mainChunks.length - 1];
        const lastChatMemo = lastMainChunk.lastChatMemo;
        const lastChatIndex = chats.findIndex(chat => chat.memo === lastChatMemo);
        if (lastChatIndex !== -1) {
            idx = lastChatIndex + 1;

            // Subtract tokens of summarized chats
            const summarizedChats = chats.slice(0, lastChatIndex + 1);
            for (const chat of summarizedChats) {
                currentTokens -= await tokenizer.tokenizeChat(chat);
            }
        }
    }
    // Starting chat index of new mainChunk to be generated

// Token management loop (If current token usage exceeds allowed amount)
    while (currentTokens > maxContextTokens) {
        const halfData: OpenAIChat[] = [];
        let halfDataTokens = 0;

        const startIdx = idx;

        console.log(
            "[HypaV2] Starting summarization iteration:",
            "\nCurrent Tokens (before):", currentTokens,
            "\nMax Context Tokens:", maxContextTokens,
            "\nStartIdx:", startIdx,
            "\nchunkSize:", chunkSize
        );

        // Accumulate chats to summarize
        while (
            halfDataTokens < chunkSize &&
            (idx < chats.length - 4) // keep the last two chats from summarizing(else, the roles will be fucked up)
            ) {
            const chat = chats[idx];
            const chatTokens = await tokenizer.tokenizeChat(chat);

            console.log(
                "[HypaV2] Evaluating chat for summarization:",
                "\nIndex:", idx,
                "\nRole:", chat.role,
                "\nContent:", chat.content,
                "\nchatTokens:", chatTokens,
                "\nhalfDataTokens so far:", halfDataTokens,
                "\nWould adding this exceed chunkSize?", (halfDataTokens + chatTokens > chunkSize)
            );

            // Skip index 0 ([Start a new chat])
            if (idx === 0) {
                console.log("[HypaV2] Skipping index 0");
                idx++;
                continue;
            }

            // Skip if the content of this chat is empty
            if (!chat.content.trim()) {
                console.log(`[HypaV2] Skipping empty content of index ${idx}`);
                idx++;
                continue;
            }

            // Check if adding this chat would exceed our chunkSize limit
            if (halfDataTokens + chatTokens > chunkSize) {
                // Can't add this chat without going over chunkSize
                // Break out, and summarize what we have so far.
                break;
            }

            // Add this chat to the halfData batch
            halfData.push(chat);
            halfDataTokens += chatTokens;
            idx++;
        }

        const endIdx = idx - 1;
        console.log(
            "[HypaV2] Summarization batch chosen with this:",
            "\nStartIdx:", startIdx,
            "\nEndIdx:", endIdx,
            "\nNumber of chats in halfData:", halfData.length,
            "\nTotal tokens in halfData:", halfDataTokens,
            "\nChats selected:", halfData.map(h => ({role: h.role, content: h.content}))
        );

        // If no chats were added, break to avoid infinite loop
        if (halfData.length === 0) {
            // Case 1: Can't summarize the last 4 chats
            if (idx >= chats.length - 4) {
                return {
                    currentTokens: currentTokens,
                    chats: chats,
                    error: `[HypaV2] Input tokens (${currentTokens}) exceeds max context size (${maxContextTokens}), but can't summarize last 4 messages. Please increase max context size to at least ${currentTokens}.`
                };
            }

            // Case 2: Chat too large for chunk size
            const chatTokens = await tokenizer.tokenizeChat(chats[idx]);
            return {
                currentTokens: currentTokens,
                chats: chats,
                error: `[HypaV2] Message tokens (${chatTokens}) exceeds chunk size (${chunkSize}). Please increase chunk size to at least ${chatTokens}.`
            };
        }

        const stringlizedChat = halfData
            .map((e) => `${e.role}: ${e.content}`)
            .join("\n");

        // Summarize the accumulated chunk
        const summaryData = await summary(stringlizedChat);

        if (!summaryData.success) {
            console.log("Summarization failed:", summaryData.data);
            summarizationFailures++;
            if (summarizationFailures >= maxSummarizationFailures) {
                console.error("[HypaV2] Summarization failed multiple times. Aborting...");
                return {
                    currentTokens: currentTokens,
                    chats: chats,
                    error: "[HypaV2] Summarization failed multiple times. Aborting to prevent infinite loop.",
                };
            }
            // If summarization fails, try again in next iteration
            continue;
        }

        summarizationFailures = 0; // Reset on success

        const summaryDataToken = await tokenizer.tokenizeChat({
            role: "system",
            content: summaryData.data,
        });

        console.log(
            "[HypaV2] Summarization success:",
            "\nSummary Data:", summaryData.data,
            "\nSummary Token Count:", summaryDataToken
        );

        // Update lastMainChunkID and create a new mainChunk
        data.lastMainChunkID++;
        const newMainChunkId = data.lastMainChunkID;

        const chatMemos = new Set(halfData.map((chat) => chat.memo));
        const lastChatMemo = halfData[halfData.length - 1].memo;

        data.mainChunks.push({
            id: newMainChunkId,
            text: summaryData.data,
            chatMemos: chatMemos,
            lastChatMemo: lastChatMemo,
        });

        // Split the summary into chunks
        const splitted = summaryData.data
            .split("\n\n")
            .map((e) => e.trim())
            .filter((e) => e.length > 0);

        data.chunks.push(
            ...splitted.map((e) => ({
                mainChunkID: newMainChunkId,
                text: e,
            }))
        );

        console.log(
            "[HypaV2] Chunks added:",
            splitted,
            "\nUpdated mainChunks count:", data.mainChunks.length,
            "\nUpdated chunks count:", data.chunks.length
        );

        currentTokens -= halfDataTokens;
        console.log("[HypaV2] tokens after summarization deduction:", currentTokens);
    }

    // Construct the mainPrompt from mainChunks
    mainPrompt = "";
    let mainPromptTokens = 0;
    for (const chunk of data.mainChunks) {
        const chunkTokens = await tokenizer.tokenizeChat({
            role: "system",
            content: chunk.text,
        });
        if (mainPromptTokens + chunkTokens > allocatedTokens / 2) break;
        mainPrompt += `\n\n${chunk.text}`;
        mainPromptTokens += chunkTokens;
    }

    // Fetch additional memory from chunks
    const processor = new HypaProcesser(db.hypaModel);
    processor.oaikey = db.supaMemoryKey;

    const searchDocumentPrefix = "search_document: ";
    const prefixLength = searchDocumentPrefix.length;

    // Add chunks to processor for similarity search
    await processor.addText(
        data.chunks
            .filter((v) => v.text.trim().length > 0)
            .map((v) => searchDocumentPrefix + v.text.trim()) // sometimes this should not be used at all. Risuai does not support embedding model that this is meaningful, isn't it?
    );

    let scoredResults: { [key: string]: number } = {};
    for (let i = 0; i < 3; i++) { // Should parameterize this, fixed length 3 is a magic number without explanation
        const pop = chats[chats.length - i - 1];
        if (!pop) break;
        const searched = await processor.similaritySearchScored(
            `search_query: ${pop.content}`
        );
        for (const result of searched) {
            const score = result[1] / (i + 1);
            scoredResults[result[0]] = (scoredResults[result[0]] || 0) + score;
        }
    }

    const scoredArray = Object.entries(scoredResults).sort(
        (a, b) => b[1] - a[1]
    );
    let chunkResultPrompts = "";
    let chunkResultTokens = 0;
    while (
        allocatedTokens - mainPromptTokens - chunkResultTokens > 0 &&
        scoredArray.length > 0
        ) {
        const [text] = scoredArray.shift();
        const content = text.substring(prefixLength);
        const tokenized = await tokenizer.tokenizeChat({
            role: "system",
            content: content,
        });
        if (
            tokenized >
            allocatedTokens - mainPromptTokens - chunkResultTokens
        )
            break;
        chunkResultPrompts += content + "\n\n";
        chunkResultTokens += tokenized;
    }

    const fullResult = `<Past Events Summary>${mainPrompt}</Past Events Summary>\n<Past Events Details>${chunkResultPrompts}</Past Events Details>`;
    const fullResultTokens = await tokenizer.tokenizeChat({
        role: "system",
        content: fullResult,
    });
    currentTokens += fullResultTokens;

    // Filter out summarized chats and prepend the memory prompt
    const unsummarizedChats: OpenAIChat[] = [
        {
            role: "system",
            content: fullResult,
            memo: "supaMemory",
        },
        ...chats.slice(idx) // Use the idx to slice out the summarized chats
    ];

    // Remove this later, as this is already done by the index
    for (const chat of lastTwoChats) {
        if (!unsummarizedChats.find((c) => c.memo === chat.memo)) {
            unsummarizedChats.push(chat);
        }
    }

    currentTokens -= allocatedTokens; // Virtually added memory tokens got removed. Bad way, but had no choice.

    console.log(
        "[HypaV2] Model being used: ",
        db.hypaModel,
        db.supaModelType,
        "\nCurrent session tokens: ",
        currentTokens,
        "\nAll chats, including memory system prompt: ",
        unsummarizedChats,
        "\nMemory data, with all the chunks: ",
        data
    );

    return {
        currentTokens: currentTokens,
        chats: unsummarizedChats,
        memory: toSerializableHypaV2Data(data),
    };
}
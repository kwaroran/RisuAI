import {
    getDatabase,
    type Chat,
    type character,
    type groupChat,
} from "src/ts/storage/database.svelte";
import type { OpenAIChat } from "../index.svelte";
import type { ChatTokenizer } from "src/ts/tokenizer";
import { requestChatData } from "../request";
import { HypaProcesser } from "./hypamemory";
import { globalFetch } from "src/ts/globalApi.svelte";
import { runSummarizer } from "../transformers";
import { parseChatML } from "src/ts/parser.svelte";

export interface HypaV2Data {
    chunks: {
        text: string;
        targetId: string;
        chatRange: [number, number]; // Start and end indices of chats summarized
    }[];
    mainChunks: {
        text: string;
        targetId: string;
        chatRange: [number, number]; // Start and end indices of chats summarized
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

        const promptbody: OpenAIChat[] = parsedPrompt ?? [
            {
                role: "user",
                content: stringlizedChat,
            },
            {
                role: "system",
                content: supaPrompt,
            },
        ];
        console.log(
            "Using submodel: ",
            db.subModel,
            "for supaMemory model"
        );
        const da = await requestChatData(
            {
                formated: promptbody,
                bias: {},
                useStreaming: false,
                noMultiGen: true,
            },
            "memory"
        );
        if (
            da.type === "fail" ||
            da.type === "streaming" ||
            da.type === "multiline"
        ) {
            return {
                success: false,
                data: "SupaMemory: HTTP: " + da.result,
            };
        }
        result = da.result;
    }
    return { success: true, data: result };
}

function cleanInvalidChunks(
    chats: OpenAIChat[],
    data: HypaV2Data,
    editedChatIndex?: number
): void {
    // If editedChatIndex is provided, remove chunks and mainChunks that summarize chats from that index onwards
    if (editedChatIndex !== undefined) {
        data.mainChunks = data.mainChunks.filter(
            (chunk) => chunk.chatRange[1] < editedChatIndex
        );
        data.chunks = data.chunks.filter(
            (chunk) => chunk.chatRange[1] < editedChatIndex
        );
    } else {
        // Confirmed that chat.memo is indeed unique uuid
        const currentChatIds = new Set(chats.map((chat) => chat.memo));

        // 존재하지 않는 챗의 요약본 삭제
        data.mainChunks = data.mainChunks.filter((chunk) => {
            const [startIdx, endIdx] = chunk.chatRange;
            // Check if all chats in the range exist
            for (let i = startIdx; i <= endIdx; i++) {
                if (!currentChatIds.has(chats[i]?.memo)) {
                    console.log(`Removing this mainChunk(summary) due to chat context change: ${chunk}`);
                    return false; // false로 filtering
                }
            }
            return true;
        });

        // 같은거, 근데 이건 쪼개진 chunk들에 대하여 수행
        data.chunks = data.chunks.filter((chunk) => {
            const [startIdx, endIdx] = chunk.chatRange;
            // 생성된 chunks는 더이상 mainChunks와 연결되지 않음. 따라서 같은 작업을 진행해야 한다.
            for (let i = startIdx; i <= endIdx; i++) {
                if (!currentChatIds.has(chats[i]?.memo)) {
                    console.log(`Removing this chunk(split) due to chat context change: ${chunk}`);
                    return false;
                }
            }
            return true;
        });
    }
}
export async function hypaMemoryV2(
    chats: OpenAIChat[],
    currentTokens: number,
    maxContextTokens: number,
    room: Chat,
    char: character | groupChat,
    tokenizer: ChatTokenizer,
    editedChatIndex?: number
): Promise<{
    currentTokens: number;
    chats: OpenAIChat[];
    error?: string;
    memory?: HypaV2Data;
}> {
    const db = getDatabase();
    const data: HypaV2Data = room.hypaV2Data ?? { chunks: [], mainChunks: [] };

    // Clean invalid chunks based on the edited chat index
    cleanInvalidChunks(chats, data, editedChatIndex);

    let allocatedTokens = db.hypaAllocatedTokens;
    let chunkSize = db.hypaChunkSize;
    currentTokens += allocatedTokens + 50;
    let mainPrompt = "";
    const lastTwoChats = chats.slice(-2);
    // Error handling for infinite summarization attempts
    let summarizationFailures = 0;
    const maxSummarizationFailures = 3;
    const summarizedIndices = new Set<number>();

    // Token management loop
    while (currentTokens >= maxContextTokens) {
        let idx = 0;
        let targetId = "";
        const halfData: OpenAIChat[] = [];

        let halfDataTokens = 0;
        let startIdx = -1;

        // Find the next batch of chats to summarize
        while (
            halfDataTokens < chunkSize &&
            idx < chats.length - 2 // Ensure latest two chats are not added to summarization.
            ) {
            if (!summarizedIndices.has(idx)) {
                const chat = chats[idx];
                if (startIdx === -1) startIdx = idx;
                halfDataTokens += await tokenizer.tokenizeChat(chat);
                halfData.push(chat);
                targetId = chat.memo;
            }
            idx++;
        }

        const endIdx = idx - 1; // End index of the chats being summarized

        // Avoid summarizing the last two chats
        if (halfData.length < 3) break;

        const stringlizedChat = halfData
            .map((e) => `${e.role}: ${e.content}`)
            .join("\n");
        const summaryData = await summary(stringlizedChat);

        if (!summaryData.success) {
            summarizationFailures++;
            if (summarizationFailures >= maxSummarizationFailures) {
                return {
                    currentTokens: currentTokens,
                    chats: chats,
                    error:
                        "Summarization failed multiple times. Aborting to prevent infinite loop.",
                };
            }
            continue;
        }

        summarizationFailures = 0; // Reset failure counter on success

        const summaryDataToken = await tokenizer.tokenizeChat({
            role: "system",
            content: summaryData.data,
        });
        mainPrompt += `\n\n${summaryData.data}`;
        currentTokens -= halfDataTokens;
        allocatedTokens -= summaryDataToken;

        data.mainChunks.unshift({
            text: summaryData.data,
            targetId: targetId,
            chatRange: [startIdx, endIdx],
        });

        // Split the summary into chunks based on double line breaks
        const splitted = summaryData.data
            .split("\n\n")
            .map((e) => e.trim())
            .filter((e) => e.length > 0);

        // Update chunks with the new summary
        data.chunks.push(
            ...splitted.map((e) => ({
                text: e,
                targetId: targetId,
                chatRange: [startIdx, endIdx] as [number, number],
            }))
        );

        // Mark the chats as summarized
        for (let i = startIdx; i <= endIdx; i++) {
            summarizedIndices.add(i);
        }
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

    // Add chunks to processor for similarity search
    await processor.addText(
        data.chunks
            .filter((v) => v.text.trim().length > 0)
            .map((v) => "search_document: " + v.text.trim())
    );

    let scoredResults: { [key: string]: number } = {};
    for (let i = 0; i < 3; i++) {
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
        const tokenized = await tokenizer.tokenizeChat({
            role: "system",
            content: text.substring(14),
        });
        if (
            tokenized >
            allocatedTokens - mainPromptTokens - chunkResultTokens
        )
            break;
        chunkResultPrompts += text.substring(14) + "\n\n";
        chunkResultTokens += tokenized;
    }

    const fullResult = `<Past Events Summary>${mainPrompt}</Past Events Summary>\n<Past Events Details>${chunkResultPrompts}</Past Events Details>`;

    // Filter out summarized chats
    const unsummarizedChats = chats.filter(
        (_, idx) => !summarizedIndices.has(idx)
    );

    // Insert the memory system prompt at the beginning
    unsummarizedChats.unshift({
        role: "system",
        content: fullResult,
        memo: "supaMemory",
    });

    // Add the last two chats back if they were removed
    const lastTwoChatsSet = new Set(lastTwoChats.map((chat) => chat.memo));
    console.log(lastTwoChatsSet) // Not so sure if chat.memo is unique id.
    for (const chat of lastTwoChats) {
        if (!unsummarizedChats.find((c) => c.memo === chat.memo)) {
            unsummarizedChats.push(chat);
        }
    }

    // Recalculate currentTokens
    currentTokens = await tokenizer.tokenizeChats(unsummarizedChats);

    console.log(
        "Model being used: ",
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
        memory: data,
    };
}

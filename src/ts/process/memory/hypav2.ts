import { getDatabase, type Chat, type character, type groupChat } from "src/ts/storage/database.svelte";
import type { OpenAIChat } from "../index.svelte";
import type { ChatTokenizer } from "src/ts/tokenizer";
import { requestChatData } from "../request";
import { HypaProcesser } from "./hypamemory";
import { globalFetch } from "src/ts/globalApi.svelte";
import { runSummarizer } from "../transformers";

export interface HypaV2Data {
    chunks: {
        text: string;
        targetId: string;
    }[];
    mainChunks: {
        text: string;
        targetId: string;
    }[];
}

async function summary(stringlizedChat: string): Promise<{ success: boolean; data: string }> {
    const db = getDatabase();
    console.log("Summarizing");

    if (db.supaModelType === 'distilbart') {
        try {
            const sum = await runSummarizer(stringlizedChat);
            return { success: true, data: sum };
        } catch (error) {
            return {
                success: false,
                data: "SupaMemory: Summarizer: " + `${error}`
            };
        }
    }

    const supaPrompt = db.supaMemoryPrompt === '' ?
        "[Summarize the ongoing role story, It must also remove redundancy and unnecessary text and content from the output to reduce tokens for gpt3 and other sublanguage models]\n"
        : db.supaMemoryPrompt;
    let result = '';

    if (db.supaModelType !== 'subModel') {
        const promptbody = stringlizedChat + '\n\n' + supaPrompt + "\n\nOutput:";

        const da = await globalFetch("https://api.openai.com/v1/completions", {
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + db.supaMemoryKey
            },
            method: "POST",
            body: {
                "model": db.supaModelType === 'curie' ? "text-curie-001"
                    : db.supaModelType === 'instruct35' ? 'gpt-3.5-turbo-instruct'
                    : "text-davinci-003",
                "prompt": promptbody,
                "max_tokens": 600,
                "temperature": 0
            }
        })
        console.log("Using openAI instruct 3.5 for SupaMemory");

        try {
            if (!da.ok) {
                return {
                    success: false,
                    data: "SupaMemory: HTTP: " + JSON.stringify(da)
                };
            }

            result = (await da.data)?.choices[0]?.text?.trim();

            if (!result) {
                return {
                    success: false,
                    data: "SupaMemory: HTTP: " + JSON.stringify(da)
                };
            }

            return { success: true, data: result };
        } catch (error) {
            return {
                success: false,
                data: "SupaMemory: HTTP: " + error
            };
        }
    } else {
        const promptbody: OpenAIChat[] = [
            {
                role: "user",
                content: stringlizedChat
            },
            {
                role: "system",
                content: supaPrompt
            }
        ];
        console.log("Using submodel: ", db.subModel, "for supaMemory model");
        const da = await requestChatData({
            formated: promptbody,
            bias: {},
            useStreaming: false,
            noMultiGen: true
        }, 'submodel');
        if (da.type === 'fail' || da.type === 'streaming' || da.type === 'multiline') {
            return {
                success: false,
                data: "SupaMemory: HTTP: " + da.result
            };
        }
        result = da.result;
    }
    return { success: true, data: result };
}

export async function hypaMemoryV2(
    chats: OpenAIChat[],
    currentTokens: number,
    maxContextTokens: number,
    room: Chat,
    char: character | groupChat,
    tokenizer: ChatTokenizer,
    arg: { asHyper?: boolean, summaryModel?: string, summaryPrompt?: string, hypaModel?: string } = {}
): Promise<{ currentTokens: number; chats: OpenAIChat[]; error?: string; memory?: HypaV2Data; }> {

    const db = getDatabase();
    const data: HypaV2Data = room.hypaV2Data ?? { chunks: [], mainChunks: [] };

    let allocatedTokens = db.hypaAllocatedTokens;
    let chunkSize = db.hypaChunkSize;
    currentTokens += allocatedTokens + 50;
    let mainPrompt = "";
    const lastTwoChats = chats.slice(-2);
    // Error handling for infinite summarization attempts
    let summarizationFailures = 0;
    const maxSummarizationFailures = 3;
    let lastMainChunkTargetId = '';

    // Ensure correct targetId matching
    const getValidChatIndex = (targetId: string) => {
        return chats.findIndex(chat => chat.memo === targetId);
    };

    // Processing mainChunks
    if (data.mainChunks.length > 0) {
        const chunk = data.mainChunks[0];
        const ind = getValidChatIndex(chunk.targetId);
        if (ind !== -1) {
            const removedChats = chats.splice(0, ind + 1);
            console.log("removed chats", removedChats);
            for (const chat of removedChats) {
                currentTokens -= await tokenizer.tokenizeChat(chat);
            }
            mainPrompt = chunk.text;
            const mpToken = await tokenizer.tokenizeChat({ role: 'system', content: mainPrompt });
            allocatedTokens -= mpToken;
        }
    }

    // Token management loop
    while (currentTokens >= maxContextTokens) {
        let idx = 0;
        let targetId = '';
        const halfData: OpenAIChat[] = [];

        let halfDataTokens = 0;
        while (halfDataTokens < chunkSize && (idx <= chats.length - 4)) { // Ensure latest two chats are not added to summarization.
            const chat = chats[idx];
            halfDataTokens += await tokenizer.tokenizeChat(chat);
            halfData.push(chat);
            idx++;
            targetId = chat.memo;
            console.log("current target chat: ", chat);
        }

        // Avoid summarizing the last two chats
        if (halfData.length < 3) break;

        const stringlizedChat = halfData.map(e => `${e.role}: ${e.content}`).join('\n');
        const summaryData = await summary(stringlizedChat);

        if (!summaryData.success) {
            summarizationFailures++;
            if (summarizationFailures >= maxSummarizationFailures) {
                return {
                    currentTokens: currentTokens,
                    chats: chats,
                    error: "Summarization failed multiple times. Aborting to prevent infinite loop."
                };
            }
            continue;
        }

        summarizationFailures = 0; // Reset failure counter on success

        const summaryDataToken = await tokenizer.tokenizeChat({ role: 'system', content: summaryData.data });
        mainPrompt += `\n\n${summaryData.data}`;
        currentTokens -= halfDataTokens;
        allocatedTokens -= summaryDataToken;

        data.mainChunks.unshift({
            text: summaryData.data,
            targetId: targetId
        });

        // Split the summary into chunks based on double line breaks
        const splitted = summaryData.data.split('\n\n').map(e => e.trim()).filter(e => e.length > 0);

        // Update chunks with the new summary
        data.chunks.push(...splitted.map(e => ({
            text: e,
            targetId: targetId
        })));

        // Remove summarized chats
        chats.splice(0, idx);
    }

    // Construct the mainPrompt from mainChunks until half of the allocatedTokens are used
    mainPrompt = "";
    let mainPromptTokens = 0;
    for (const chunk of data.mainChunks) {
        const chunkTokens = await tokenizer.tokenizeChat({ role: 'system', content: chunk.text });
        if (mainPromptTokens + chunkTokens > allocatedTokens / 2) break;
        mainPrompt += `\n\n${chunk.text}`;
        mainPromptTokens += chunkTokens;
        lastMainChunkTargetId = chunk.targetId;
    }

    // Fetch additional memory from chunks
    const processor = new HypaProcesser(db.hypaModel);
    processor.oaikey = db.supaMemoryKey;

    // Find the smallest index of chunks with the same targetId as lastMainChunkTargetId
    const lastMainChunkIndex = data.chunks.reduce((minIndex, chunk, index) => {
        if (chunk.targetId === lastMainChunkTargetId) {
            return Math.min(minIndex, index);
        }
        return minIndex;
    }, data.chunks.length);

    // Filter chunks to only include those older than the last mainChunk's targetId
    const olderChunks = lastMainChunkIndex !== data.chunks.length
        ? data.chunks.slice(0, lastMainChunkIndex)
        : data.chunks;

    console.log("Older Chunks:", olderChunks);

    // Add older chunks to processor for similarity search
    await processor.addText(olderChunks.filter(v => v.text.trim().length > 0).map(v => "search_document: " + v.text.trim()));

    let scoredResults: { [key: string]: number } = {};
    for (let i = 0; i < 3; i++) {
        const pop = chats[chats.length - i - 1];
        if (!pop) break;
        const searched = await processor.similaritySearchScored(`search_query: ${pop.content}`);
        for (const result of searched) {
            const score = result[1] / (i + 1);
            scoredResults[result[0]] = (scoredResults[result[0]] || 0) + score;
        }
    }

    const scoredArray = Object.entries(scoredResults).sort((a, b) => b[1] - a[1]);
    let chunkResultPrompts = "";
    let chunkResultTokens = 0;
    while (allocatedTokens - mainPromptTokens - chunkResultTokens > 0 && scoredArray.length > 0) {
        const [text] = scoredArray.shift();
        const tokenized = await tokenizer.tokenizeChat({ role: 'system', content: text.substring(14) });
        if (tokenized > allocatedTokens - mainPromptTokens - chunkResultTokens) break;
        chunkResultPrompts += text.substring(14) + '\n\n';
        chunkResultTokens += tokenized;
    }

    const fullResult = `<Past Events Summary>${mainPrompt}</Past Events Summary>\n<Past Events Details>${chunkResultPrompts}</Past Events Details>`;

    chats.unshift({
        role: "system",
        content: fullResult,
        memo: "supaMemory"
    });

    // Add the remaining chats after the last mainChunk's targetId
    const lastTargetId = data.mainChunks.length > 0 ? data.mainChunks[0].targetId : null;
    if (lastTargetId) {
        const lastIndex = getValidChatIndex(lastTargetId);
        if (lastIndex !== -1) {
            const remainingChats = chats.slice(lastIndex + 1);
            chats = [chats[0], ...remainingChats];
        } 
    } 

    // Add last two chats if they exist and are not duplicates
    if (lastTwoChats.length === 2) {
        const [lastChat1, lastChat2] = lastTwoChats;
        if (!chats.some(chat => chat.memo === lastChat1.memo)) {
            chats.push(lastChat1);
        }
        if (!chats.some(chat => chat.memo === lastChat2.memo)) {
            chats.push(lastChat2);
        }
    }

    console.log("model being used: ", db.hypaModel, db.supaModelType, "\nCurrent session tokens: ", currentTokens, "\nAll chats, including memory system prompt: ", chats, "\nMemory data, with all the chunks: ", data);
    return {
        currentTokens: currentTokens,
        chats: chats,
        memory: data
    };
}

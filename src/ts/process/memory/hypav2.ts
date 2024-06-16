import { DataBase, type Chat, type character, type groupChat } from "src/ts/storage/database"; 
import type { OpenAIChat } from "..";
import type { ChatTokenizer } from "src/ts/tokenizer";
import { get } from "svelte/store";
import { requestChatData } from "../request";
import { HypaProcesser } from "./hypamemory";
import { globalFetch } from "src/ts/storage/globalApi";
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
    const db = get(DataBase);
    console.log("Summarization actively called");

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

    const db = get(DataBase);
    const data: HypaV2Data = room.hypaV2Data ?? { chunks: [], mainChunks: [] };

    let allocatedTokens = db.hypaAllocatedTokens;
    let chunkSize = db.hypaChunkSize;
    currentTokens += allocatedTokens + 50;
    let mainPrompt = "";

    // Processing mainChunks
    if (data.mainChunks.length > 0) {
        const chunk = data.mainChunks[0];
        const ind = chats.findIndex(e => e.memo === chunk.targetId);
        if (ind !== -1) {
            const removedChats = chats.splice(0, ind);
            for (const chat of removedChats) {
                currentTokens -= await tokenizer.tokenizeChat(chat);
            }
            mainPrompt = chunk.text;
            const mpToken = await tokenizer.tokenizeChat({ role: 'system', content: mainPrompt });
            allocatedTokens -= mpToken;
        }
        // Do not shift here; retain for continuity
    }

    // Token management loop
    while (currentTokens >= maxContextTokens) {
        let idx = 0;
        let targetId = '';
        const halfData: OpenAIChat[] = [];

        let halfDataTokens = 0;
        while (halfDataTokens < chunkSize && chats[idx]) {
            const chat = chats[idx];
            halfDataTokens += await tokenizer.tokenizeChat(chat);
            halfData.push(chat);
            idx++;
            targetId = chat.memo;
            console.log("current target chat Id:", targetId);
        }

        const stringlizedChat = halfData.map(e => `${e.role}: ${e.content}`).join('\n');
        const summaryData = await summary(stringlizedChat);

        if (!summaryData.success) {
            return {
                currentTokens: currentTokens,
                chats: chats,
                error: summaryData.data
            };
        }

        const summaryDataToken = await tokenizer.tokenizeChat({ role: 'system', content: summaryData.data });
        mainPrompt += `\n\n${summaryData.data}`;
        currentTokens -= halfDataTokens;
        allocatedTokens -= summaryDataToken;

        data.mainChunks.unshift({
            text: mainPrompt,
            targetId: targetId
        });

        if (allocatedTokens < 1000) {
            console.log("Currently allocatedTokens for HypaMemoryV2 is short, thus summarizing mainPrompt twice.", allocatedTokens);
            console.log("This is mainPrompt(summarized data): ", mainPrompt);
            const summarizedMp = await summary(mainPrompt);
            console.log("Re-summarized, expected behavior: ", summarizedMp.data);
            const mpToken = await tokenizer.tokenizeChat({ role: 'system', content: mainPrompt });
            const summaryToken = await tokenizer.tokenizeChat({ role: 'system', content: summarizedMp.data });

            allocatedTokens -= summaryToken;
            allocatedTokens += mpToken;

            const splited = mainPrompt.split('\n\n').map(e => e.trim()).filter(e => e.length > 0);

            data.chunks.push(...splited.map(e => ({
                text: e,
                targetId: targetId
            })));

            data.mainChunks[0].text = mainPrompt;
        }
    }

    const processor = new HypaProcesser(db.hypaModel);
    processor.oaikey = db.supaMemoryKey;
    await processor.addText(data.chunks.filter(v => v.text.trim().length > 0).map(v => "search_document: " + v.text.trim()));

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
    while (allocatedTokens > 0 && scoredArray.length > 0) {
        const target = scoredArray.shift();
        const tokenized = await tokenizer.tokenizeChat({ role: 'system', content: target[0].substring(14) });
        if (tokenized > allocatedTokens) break;
        chunkResultPrompts += target[0].substring(14) + '\n\n';
        allocatedTokens -= tokenized;
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
        const lastIndex = chats.findIndex(chat => chat.memo === lastTargetId);
        if (lastIndex !== -1) {
            const remainingChats = chats.slice(lastIndex + 1);
            chats = chats.slice(0, 1).concat(remainingChats);
        }
    }

    console.log("model being used: ", db.hypaModel, db.supaModelType, "\nCurrent session tokens: ", currentTokens, "\nAll chats, including memory system prompt: ", chats, "\nMemory data, with all the chunks: ", data);
    return {
        currentTokens: currentTokens,
        chats: chats,
        memory: data
    };
}

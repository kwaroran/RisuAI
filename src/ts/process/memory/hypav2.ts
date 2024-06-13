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
    /**
     * Generates a summary of a given chat by using either the OpenAI API or a submodel or distilbart summarizer.
     *
     * @param {string} stringlizedChat - The chat to be summarized, represented as a string.
     * @return {Promise<{ success: boolean; data: string }>} A promise that resolves to an object containing the success status and the generated summary.
     */
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
        });
        console.log("Using openAI instruct 3.5 for SupaMemory")

        try {
            if (!da.ok) {
                return {
                    success: false,
                    data: "SupaMemory: HTTP: " + JSON.stringify(da.data)
                };
            }

            result = (await da.data)?.choices[0]?.text?.trim();

            if (!result) {
                return {
                    success: false,
                    data: "SupaMemory: HTTP: " + JSON.stringify(da.data)
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
        console.log("Using submodel: ", db.subModel, "for supaMemory model")
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

    const data: HypaV2Data = room.hypaV2Data ?? {
        chunks: [],
        mainChunks: []
    };

    let allocatedTokens = db.hypaAllocatedTokens;
    let chunkSize = db.hypaChunkSize;
    currentTokens += allocatedTokens;
    currentTokens += 50; // this is for the template prompt
    let mainPrompt = "";

    while (data.mainChunks.length > 0) {
        const chunk = data.mainChunks[0];
        const ind = chats.findIndex(e => e.memo === chunk.targetId);
        if (ind === -1) {
            data.mainChunks.shift();
            continue;
        }

        const removedChats = chats.splice(0, ind);
        for (const chat of removedChats) {
            currentTokens -= await tokenizer.tokenizeChat(chat);
        }
        chats = chats.slice(ind);
        mainPrompt = chunk.text;
        const mpToken = await tokenizer.tokenizeChat({ role: 'system', content: mainPrompt });
        allocatedTokens -= mpToken;
        break;
    }

    while (currentTokens >= maxContextTokens) {
        let idx = 0;
        let targetId = '';
        const halfData: OpenAIChat[] = [];

        let halfDataTokens = 0;
        while (halfDataTokens < chunkSize) {
            const chat = chats[idx];
            if (!chat) {
                break;
            }
            halfDataTokens += await tokenizer.tokenizeChat(chat);
            halfData.push(chat);
            idx++;
            targetId = chat.memo;
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

        if (allocatedTokens < 1500) {
            const summarizedMp = await summary(mainPrompt);
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
    await processor.addText(data.chunks.filter(v => {
        return v.text.trim().length > 0;
    }).map((v) => {
        return "search_document: " + v.text.trim();
    }));

    let scoredResults: { [key: string]: number } = {};
    for (let i = 0; i < 3; i++) {
        const pop = chats[chats.length - i - 1];
        if (!pop) {
            break;
        }
        const searched = await processor.similaritySearchScored(`search_query: ${pop.content}`);
        for (const result of searched) {
            const score = result[1] / (i + 1);
            if (scoredResults[result[0]]) {
                scoredResults[result[0]] += score;
            } else {
                scoredResults[result[0]] = score;
            }
        }
    }

    const scoredArray = Object.entries(scoredResults).sort((a, b) => b[1] - a[1]);

    let chunkResultPrompts = "";
    while (allocatedTokens > 0) {
        const target = scoredArray.shift();
        if (!target) {
            break;
        }
        const tokenized = await tokenizer.tokenizeChat({
            role: 'system',
            content: target[0].substring(14)
        });
        if (tokenized > allocatedTokens) {
            break;
        }
        chunkResultPrompts += target[0].substring(14) + '\n\n';
        allocatedTokens -= tokenized;
    }

    const fullResult = `<Past Events Summary>${mainPrompt}</Past Events Summary>\n<Past Events Details>${chunkResultPrompts}</Past Events Details>`;

    chats.unshift({
        role: "system",
        content: fullResult,
        memo: "supaMemory"
    });
    return {
        currentTokens: currentTokens,
        chats: chats,
        memory: data
    };
}

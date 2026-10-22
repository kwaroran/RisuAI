import type { requestDataResponse, StreamResponseChunk } from '../process/request/request'
import { emptyCounters, type TokenUsage, type UsageCounters } from './types'

const tokenFields = ['input', 'cacheRead', 'cacheWrite', 'output', 'reasoning'] as const

/**
 * Usage of one API response. Streams report usage in pieces, sometimes repeating it,
 * so every update replaces the fields it has instead of adding to them.
 */
export class ResponseUsage {
    usage: TokenUsage = {}

    update(usage: TokenUsage | undefined) {
        for(const field of tokenFields){
            if(usage?.[field] !== undefined){
                this.usage[field] = usage[field]
            }
        }
    }
}

/** Adds up responses field by field. A field stays undefined when no response reported it. */
export function sumUsage(responses: TokenUsage[]): TokenUsage {
    const sum: TokenUsage = {}
    for(const usage of responses){
        for(const field of tokenFields){
            if(usage[field] !== undefined){
                sum[field] = (sum[field] ?? 0) + usage[field]
            }
        }
    }
    return sum
}

export interface MeterOptions {
    /** Counts the prompt tokens with the local tokenizer, for providers that report no usage. */
    countPrompt: () => Promise<number>
    /** Counts the tokens of generated text with the local tokenizer. */
    countText: (text: string) => Promise<number>
    /** Receives the usage of the request once it is finished, with the model set by `setModel` if any. */
    record: (counters: UsageCounters, model?: string) => void
}

/**
 * Collects the token usage of one chat request. Providers report what the API sent with
 * `add` or `newResponse`, and `track` records the total when the result is complete.
 * Whatever the API did not report is counted with the local tokenizer and marked as estimated.
 */
export class UsageMeter {
    private responses: ResponseUsage[] = []
    private finished = false
    private model: string | undefined

    constructor(private options: MeterOptions) {}

    /** For providers that pick the actual model while sending, after the request was metered. */
    setModel(model: string) {
        this.model = model
    }

    /** Tracks one API response. A request makes several when it calls tools. */
    newResponse(): ResponseUsage {
        const response = new ResponseUsage()
        this.responses.push(response)
        return response
    }

    /** For a response whose usage arrived all at once. */
    add(usage: TokenUsage | undefined) {
        this.newResponse().update(usage)
    }

    /** Records usage once `result` is complete. Streams are wrapped so the end of the stream can be seen. */
    track(result: requestDataResponse): requestDataResponse {
        switch(result.type){
            case 'success':
                this.finish(result.result)
                return result
            case 'multiline':
                this.finish(result.result.map(([, text]) => text).join('\n'))
                return result
            case 'streaming':
                return {
                    ...result,
                    result: watchStream(result.result, (lastChunk, completed) => {
                        // A stream that broke before its first chunk is a failed request, not an empty answer.
                        if(!lastChunk && !completed){
                            this.finish(undefined)
                            return
                        }
                        this.finish(generatedText(lastChunk))
                    }),
                }
            default:
                // A failed request costs nothing, unless some of its API calls went through first.
                this.finish(undefined)
                return result
        }
    }

    /** `output` is the generated text, or undefined when the request failed. */
    private async finish(output: string | undefined) {
        if(this.finished){
            return
        }
        this.finished = true

        try {
            const reported = sumUsage(this.responses.map((response) => response.usage))
            const failed = output === undefined
            if(failed && Object.keys(reported).length === 0){
                return
            }

            const counters: UsageCounters = {
                ...emptyCounters(),
                requests: 1,
                input: reported.input ?? 0,
                cacheRead: reported.cacheRead ?? 0,
                cacheWrite: reported.cacheWrite ?? 0,
                output: reported.output ?? 0,
                reasoning: reported.reasoning ?? 0,
            }
            if(!failed){
                const reportedPrompt = [reported.input, reported.cacheRead, reported.cacheWrite].some((v) => v !== undefined)
                if(!reportedPrompt){
                    counters.input = await this.options.countPrompt()
                }
                if(reported.output === undefined){
                    counters.output = await this.options.countText(output)
                }
                counters.estimated = !reportedPrompt || reported.output === undefined ? 1 : 0
            }
            this.options.record(counters, this.model)
        } catch (error) {
            console.error('[usage] Could not record usage', error)
        }
    }
}

/** The generated text of a stream chunk: every generation (one key each), without metadata keys like `__tool_calls`. */
function generatedText(chunk: StreamResponseChunk | undefined): string {
    return Object.entries(chunk ?? {})
        .filter(([key]) => !key.startsWith('__'))
        .map(([, text]) => text)
        .join('\n')
}

/**
 * Passes a stream through and calls `onEnd` once with the last chunk, whether it finished, failed or was cancelled.
 * `completed` is true only when the stream ran to its end.
 */
export function watchStream(
    stream: ReadableStream<StreamResponseChunk>,
    onEnd: (lastChunk: StreamResponseChunk | undefined, completed: boolean) => void,
): ReadableStream<StreamResponseChunk> {
    const reader = stream.getReader()
    let lastChunk: StreamResponseChunk | undefined
    let ended = false
    let cancelled = false
    const end = (completed = false) => {
        if(!ended){
            ended = true
            onEnd(lastChunk, completed)
        }
    }

    return new ReadableStream<StreamResponseChunk>({
        async pull(controller) {
            let read: ReadableStreamReadResult<StreamResponseChunk>
            try {
                read = await reader.read()
            } catch (error) {
                end()
                if(!cancelled){
                    controller.error(error)
                }
                return
            }
            if(cancelled){
                return
            }
            if(read.done){
                end(true)
                controller.close()
                return
            }
            lastChunk = read.value
            controller.enqueue(read.value)
        },
        async cancel(reason) {
            cancelled = true
            end()
            await reader.cancel(reason)
        },
    })
}

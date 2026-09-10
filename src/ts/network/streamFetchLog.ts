export function pipeStreamWithTextLog(
    readableStream: ReadableStream<Uint8Array>,
    onFinalize: (responseText: string) => void,
): ReadableStream<Uint8Array> {
    const reader = readableStream.getReader()
    const decoder = new TextDecoder()
    let responseText = ''
    let finalized = false

    const finalizeLog = () => {
        if (finalized) {
            return
        }
        finalized = true
        responseText += decoder.decode()
        onFinalize(responseText)
    }

    return new ReadableStream<Uint8Array>({
        async pull(controller) {
            try {
                const result = await reader.read()
                if (result.done) {
                    finalizeLog()
                    controller.close()
                    return
                }
                responseText += decoder.decode(result.value, { stream: true })
                controller.enqueue(result.value)
            } catch (error) {
                finalizeLog()
                controller.error(error)
            }
        },
        async cancel(reason) {
            finalizeLog()
            await reader.cancel(reason)
        },
    })
}

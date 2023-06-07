import type { PreTrainedTokenizer } from "@xenova/transformers"
type transformerLibType = typeof import("@xenova/transformers");
let tokenizer:PreTrainedTokenizer = null
let transformerLib:transformerLibType

let tokenizerType:string = ''


async function loadTransformers() {
    if(!transformerLib){
        transformerLib = await import('@xenova/transformers')
    }
}

export async function tokenizeTransformers(type:string, text:string) {
    await loadTransformers()
    if(tokenizerType !== type){
        const AutoTokenizer = transformerLib.AutoTokenizer
        tokenizer = await AutoTokenizer.from_pretrained(type)
        tokenizerType = type
    }

    return tokenizer.encode(text)
}

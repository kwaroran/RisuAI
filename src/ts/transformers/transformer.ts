import type { PreTrainedTokenizer } from "@xenova/transformers"
type transformerLibType = typeof import("@xenova/transformers");
let tokenizer:PreTrainedTokenizer = null
let transformerLib:transformerLibType

const tokenizerDict = {
    'trin': 'naclbit/trin_tokenizer_v3',
} as const

type tokenizerTypes = keyof(typeof tokenizerDict)

let tokenizerType:tokenizerTypes|'' = ''


async function loadTransformers() {
    if(!transformerLib){
        transformerLib = await import('@xenova/transformers')
    }
}

export async function tokenizeTransformers(type:tokenizerTypes, text:string) {
    await loadTransformers()
    if(tokenizerType !== type){
        const AutoTokenizer = transformerLib.AutoTokenizer
        tokenizer = await AutoTokenizer.from_pretrained(tokenizerDict[type])
        tokenizerType = type
    }

    return tokenizer.encode(text)
}

import { AutoTokenizer, type Pipeline, type PretrainedOptions } from '@xenova/transformers';

let pipeline: (task: string, model?: string, { quantized, progress_callback, config, cache_dir, local_files_only, revision, }?: PretrainedOptions) => Promise<Pipeline> = null

async function loadTransformer() {
    if(!pipeline){
        const transformersLib = await import('@xenova/transformers')
        transformersLib.env.localModelPath = "https://sv.risuai.xyz/transformers/"
        pipeline = transformersLib.pipeline
    }
}
type TransformersBodyType = {
    max_new_tokens: number,
    do_sample: boolean,
    temperature: number,
    top_p: number,
    typical_p: number,
    repetition_penalty: number,
    encoder_repetition_penalty: number,
    top_k: number,
    min_length: number,
    no_repeat_ngram_size: number,
    num_beams: number,
    penalty_alpha: number,
    length_penalty: number,
    early_stopping: boolean,
    truncation_length: number,
    ban_eos_token: boolean,
    stopping_strings: number,
    seed: number,
    add_bos_token: boolean,
}


export const runTransformers = async (baseText:string, model:string,bodyTemplate:TransformersBodyType) => {
    await loadTransformer()
    let text = baseText
    let generator = await pipeline('text-generation', model);
    let output:{generated_text:string}[] = await generator(text);
    return output
}

export const runSummarizer = async (text: string) => {
    await loadTransformer()
    let classifier = await pipeline("summarization", "Xenova/distilbart-cnn-6-6")
    const v:{summary_text:string}[] = await classifier(text)
    return v
}

export const runEmbedding = async (text: string):Promise<Float32Array> => {
    await loadTransformer()
    let extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/all-MiniLM-L6-v2');
    const tokens = tokenizer.encode(text)
    if (tokens.length > 256) {
        let chunks:string[] = []
        let chunk:number[] = []
        for (let i = 0; i < tokens.length; i++) {
            if (chunk.length > 256) {
                chunks.push(tokenizer.decode(chunk))
                chunk = []
            }
            chunk.push(tokens[i])
        }
        chunks.push(tokenizer.decode(chunk))
        let results:Float32Array[] = []
        for (let i = 0; i < chunks.length; i++) {
            let result = await extractor(chunks[i], { pooling: 'mean', normalize: true });
            results.push(result?.data ?? null)
        }
        //set result, as average of all chunks
        let result:Float32Array = new Float32Array(results[0].length)
        for (let i = 0; i < results.length; i++) {
            for (let j = 0; j < result.length; j++) {
                result[j] += results[i][j]
            }
        }
        for (let i = 0; i < result.length; i++) {
            result[i] = Math.round(result[i] / results.length)
        }
        return result
    }
    let result = await extractor(text, { pooling: 'mean', normalize: true });
    return result?.data ?? null;
}

export const runTTS = async (text: string) => {
    let speaker_embeddings = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin';
    let synthesizer = await pipeline('text-to-speech', 'Xenova/speecht5_tts', { local_files_only: true });
    let out = await synthesizer(text, { speaker_embeddings });
    return out
}
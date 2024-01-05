import {env, AutoTokenizer, pipeline, VitsModel, type SummarizationOutput, type TextGenerationConfig, type TextGenerationOutput, FeatureExtractionPipeline, TextToAudioPipeline } from '@xenova/transformers';

env.localModelPath = "https://sv.risuai.xyz/transformers/"

export const runTransformers = async (baseText:string, model:string,config:TextGenerationConfig = {}) => {
    let text = baseText
    let generator = await pipeline('text-generation', model);
    let output = await generator(text, config) as TextGenerationOutput
    const outputOne = output[0]
    return outputOne
}

export const runSummarizer = async (text: string) => {
    let classifier = await pipeline("summarization", "Xenova/distilbart-cnn-6-6")
    const v = await classifier(text) as SummarizationOutput
    return v[0].summary_text
}

let extractor:FeatureExtractionPipeline = null
export const runEmbedding = async (text: string):Promise<Float32Array> => {
    if(!extractor){
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
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
            const res:Float32Array = result?.data as Float32Array

            if(res){
                results.push(res)
            }
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
    return (result?.data as Float32Array) ?? null;
}

let synthesizer:TextToAudioPipeline = null
let lastSynth:string = null
export const runVITS = async (text: string, model:string = 'Xenova/mms-tts-eng') => {
    const {WaveFile} = await import('wavefile')
    if((!synthesizer) || (lastSynth !== model)){
        lastSynth = model
        synthesizer = await pipeline('text-to-speech', model);
    }
    let out = await synthesizer(text, {});
    const wav = new WaveFile();
    wav.fromScratch(1, out.sampling_rate, '32f', out.audio);
    const audioContext = new AudioContext();
    audioContext.decodeAudioData(wav.toBuffer().buffer, (decodedData) => {
        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = decodedData;
        sourceNode.connect(audioContext.destination);
        sourceNode.start();
    });
}
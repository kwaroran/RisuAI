import {env, AutoTokenizer, pipeline, type SummarizationOutput, type TextGenerationConfig, type TextGenerationOutput, FeatureExtractionPipeline, TextToAudioPipeline } from '@xenova/transformers';
import { unzip } from 'fflate';
import { loadAsset, saveAsset } from 'src/ts/storage/globalApi';
import { selectSingleFile } from 'src/ts/util';
import { v4 } from 'uuid';

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

export interface OnnxModelFiles {
    files: {[key:string]:string},
    id: string,
    name?: string
}

export const runVITS = async (text: string, modelData:string|OnnxModelFiles = 'Xenova/mms-tts-eng') => {
    const {WaveFile} = await import('wavefile')
    if(modelData === null){
        return
    }
    if(typeof modelData === 'string'){
        if((!synthesizer) || (lastSynth !== modelData)){
            lastSynth = modelData
            synthesizer = await pipeline('text-to-speech', modelData);
        }
    }
    else{
        if((!synthesizer) || (lastSynth !== modelData.id)){
            const files = modelData.files
            const keys = Object.keys(files)
            for(const key of keys){
                const hasCache:boolean = (await (await fetch("/sw/check/", {
                    headers: {
                        'x-register-url': encodeURIComponent(key)
                    }
                })).json()).able
    
                if(!hasCache){
                    await fetch("/sw/register/", {
                        method: "POST",
                        body: await loadAsset(files[key]),
                        headers: {
                            'x-register-url': encodeURIComponent(key),
                            'x-no-content-type': 'true'
                        }
                    })
                }
            }
            lastSynth = modelData.id
            synthesizer = await pipeline('text-to-speech', modelData.id);
        }
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


export const registerOnnxModel = async ():Promise<OnnxModelFiles> => {
    const id = v4().replace(/-/g, '')

    const modelFile = await selectSingleFile(['zip'])

    if(!modelFile){
        return
    }

    const unziped = await new Promise((res, rej) => {unzip(modelFile.data, {
        filter: (file) => {
            return file.name.endsWith('.onnx') || file.size < 10_000_000 || file.name.includes('.git')
        }
    }, (err, unzipped) => {
        if(err){
            rej(err)
        }
        else{
            res(unzipped)
        } 
    })})

    console.log(unziped)

    let fileIdMapped:{[key:string]:string} = {}
    
    const keys = Object.keys(unziped)
    for(let i = 0; i < keys.length; i++){
        const key = keys[i]
        const file = unziped[key]
        const fid = await saveAsset(file)
        let url = key
        if(url.startsWith('/')){
            url = url.substring(1)
        }
        url = '/transformers/' + id +'/' + url
        fileIdMapped[url] = fid
    }

    return {
        files: fileIdMapped,
        name: modelFile.name,
        id: id,
    }
    
}

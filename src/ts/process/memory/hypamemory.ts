import localforage from "localforage";
import { globalFetch } from "src/ts/globalApi.svelte";
import { runEmbedding } from "../transformers";
import { appendLastPath } from "src/ts/util";
import { getDatabase } from "src/ts/storage/database.svelte";

export type HypaModel = 'custom'|'ada'|'openai3small'|'openai3large'|'MiniLM'|'MiniLMGPU'|'nomic'|'nomicGPU'|'bgeSmallEn'|'bgeSmallEnGPU'|'bgem3'|'bgem3GPU'|'multiMiniLM'|'multiMiniLMGPU'

// In a typical environment, bge-m3 is a heavy model.
// If your GPU can't handle this model, you'll see errror below.
// Failed to execute 'mapAsync' on 'GPUBuffer': [Device] is lost
export const localModels = {
    models: {
        'MiniLM':'Xenova/all-MiniLM-L6-v2',
        'MiniLMGPU': "Xenova/all-MiniLM-L6-v2",
        'nomic':'nomic-ai/nomic-embed-text-v1.5',
        'nomicGPU':'nomic-ai/nomic-embed-text-v1.5',
        'bgeSmallEn': 'Xenova/bge-small-en-v1.5',
        'bgeSmallEnGPU': 'Xenova/bge-small-en-v1.5',
        'bgem3': 'Xenova/bge-m3',
        'bgem3GPU': 'Xenova/bge-m3',
        'multiMiniLM': 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
        'multiMiniLMGPU': 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
        'bgeM3Ko': 'HyperBlaze/BGE-m3-ko',
        'bgeM3KoGPU': 'HyperBlaze/BGE-m3-ko',
    },
    gpuModels:[
        'MiniLMGPU',
        'nomicGPU',
        'bgeSmallEnGPU',
        'bgem3GPU',
        'multiMiniLMGPU',
        'bgeM3KoGPU',
    ]
}

export class HypaProcesser{
    oaikey:string
    vectors:memoryVector[]
    forage:LocalForage
    model:HypaModel
    customEmbeddingUrl:string

    constructor(model:HypaModel|'auto' = 'auto',customEmbeddingUrl?:string){
        this.forage = localforage.createInstance({
            name: "hypaVector"
        })
        this.vectors = []
        const db = getDatabase()
        if(model === 'auto'){
            this.model = db.hypaModel || 'MiniLM'
        }
        else{
            this.model = model
        }
        this.customEmbeddingUrl = customEmbeddingUrl?.trim() || db.hypaCustomSettings?.url?.trim() || ""
    }

    async embedDocuments(texts: string[]): Promise<VectorArray[]> {
        const subPrompts = chunkArray(texts,50);
    
        const embeddings: VectorArray[] = [];
    
        for (let i = 0; i < subPrompts.length; i += 1) {
          const input = subPrompts[i];
    
          const data = await this.getEmbeds(input)
    
          embeddings.push(...data);
        }
    
        return embeddings;
    }
    
    
    async getEmbeds(input:string[]|string):Promise<VectorArray[]> {
        if(Object.keys(localModels.models).includes(this.model)){
            const inputs:string[] = Array.isArray(input) ? input : [input]
            let results:Float32Array[] = await runEmbedding(inputs, localModels.models[this.model], localModels.gpuModels.includes(this.model) ? 'webgpu' : 'wasm')
            return results
        }
        let gf = null;
        if(this.model === 'custom'){
            if(!this.customEmbeddingUrl){
                throw new Error('Custom model requires a Custom Server URL')
            }
            const {customEmbeddingUrl} = this
            const replaceUrl = customEmbeddingUrl.endsWith('/embeddings')?customEmbeddingUrl:appendLastPath(customEmbeddingUrl,'embeddings')

            const db = getDatabase()
            const fetchArgs = {
                headers: {
                    ...(db.hypaCustomSettings?.key?.trim() ? {"Authorization": "Bearer " + db.hypaCustomSettings.key.trim()} : {})
                },
                body: {
                    "input": input,
                    ...(db.hypaCustomSettings?.model?.trim() ? {"model": db.hypaCustomSettings.model.trim()} : {})
                }
            };
 
            gf = await globalFetch(replaceUrl.toString(), fetchArgs)
        }
        if(this.model === 'ada' || this.model === 'openai3small' || this.model === 'openai3large'){
            const db = getDatabase()
            const models = {
                'ada':'text-embedding-ada-002',
                'openai3small':'text-embedding-3-small',
                'openai3large':'text-embedding-3-large'
            }

            gf = await globalFetch("https://api.openai.com/v1/embeddings", {
                headers: {
                    "Authorization": "Bearer " + (this.oaikey?.trim() || db.supaMemoryKey?.trim())
                },
                body: {
                    "input": input,
                    "model": models[this.model]
                }
            })
        }
        const data = gf.data
    
    
        if(!gf.ok){
            throw JSON.stringify(gf.data)
        }
    
        const result:number[][] = []
        for(let i=0;i<data.data.length;i++){
            result.push(data.data[i].embedding)
        }
    
        return result
    }

    async testText(text:string){
        const forageResult:number[] = await this.forage.getItem(text)
        if(forageResult){
            return forageResult
        }
        const vec = (await this.embedDocuments([text]))[0]
        await this.forage.setItem(text, vec)
        return vec
    }
    
    async addText(texts:string[]) {
        const db = getDatabase()
        const suffix = (this.model === 'custom' && db.hypaCustomSettings?.model?.trim()) ? `-${db.hypaCustomSettings.model.trim()}` : ""

        for(let i=0;i<texts.length;i++){
            const itm:memoryVector = await this.forage.getItem(texts[i] + '|' + this.model + suffix)
            if(itm){
                itm.alreadySaved = true
                this.vectors.push(itm)
            }
        }

        texts = texts.filter((v) => {
            for(let i=0;i<this.vectors.length;i++){
                if(this.vectors[i].content === v){
                    return false
                }
            }
            return true
        })

        if(texts.length === 0){
            return
        }
        const vectors = await this.embedDocuments(texts)

        const memoryVectors:memoryVector[] = vectors.map((embedding, idx) => ({
            content: texts[idx],
            embedding
        }));

        for(let i=0;i<memoryVectors.length;i++){
            const vec = memoryVectors[i]
            if(!vec.alreadySaved){
                await this.forage.setItem(texts[i] + '|' + this.model + suffix, vec)
            }
        }

        this.vectors = memoryVectors.concat(this.vectors)
    }

    async similaritySearch(query: string) {
        const results = await this.similaritySearchVectorWithScore((await this.getEmbeds(query))[0],);
        return results.map((result) => result[0]);
    }

    async similaritySearchScored(query: string) {
        return await this.similaritySearchVectorWithScore((await this.getEmbeds(query))[0],);
    }

    private similaritySearchVectorWithScore(
        query: VectorArray,
      ): [string, number][] {
          const memoryVectors = this.vectors
          const searches = memoryVectors
                .map((vector, index) => ({
                    similarity: similarity(query, vector.embedding),
                    index,
                }))
                .sort((a, b) => (a.similarity > b.similarity ? -1 : 0))
      
          const result: [string, number][] = searches.map((search) => [
              memoryVectors[search.index].content,
              search.similarity,
          ]);
      
          return result;
    }

    similarityCheck(query1:number[],query2: number[]) {
        return similarity(query1, query2)
    }
}

export function similarity(a:VectorArray, b:VectorArray) {    
    let dot = 0;
    for(let i=0;i<a.length;i++){
        dot += a[i] * b[i]
    }
    return dot
}

export type VectorArray = number[]|Float32Array

export type memoryVector = {
    embedding:number[]|Float32Array,
    content:string,
    alreadySaved?:boolean
}

const chunkArray = <T>(arr: T[], chunkSize: number) =>
    arr.reduce((chunks, elem, index) => {
        const chunkIndex = Math.floor(index / chunkSize);
        const chunk = chunks[chunkIndex] || [];
        chunks[chunkIndex] = chunk.concat([elem]);
        return chunks;
}, [] as T[][]);

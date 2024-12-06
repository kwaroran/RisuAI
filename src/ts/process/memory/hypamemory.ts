import localforage from "localforage";
import { globalFetch } from "src/ts/globalApi.svelte";
import { runEmbedding } from "../transformers";
import { alertError } from "src/ts/alert";
import { appendLastPath } from "src/ts/util";
import { getDatabase } from "src/ts/storage/database.svelte";


export type HypaModel = 'ada'|'MiniLM'|'nomic'|'custom'|'nomicGPU'|'bgeSmallEn'|'bgeSmallEnGPU'|'bgem3'|'bgem3GPU'|'openai3small'|'openai3large'

const localModels = {
    models: {
        'MiniLM':'Xenova/all-MiniLM-L6-v2',
        'nomic':'nomic-ai/nomic-embed-text-v1.5',
        'nomicGPU':'nomic-ai/nomic-embed-text-v1.5',
        'bgeSmallEn': 'BAAI/bge-small-en-v1.5',
        'bgeSmallEnGPU': 'BAAI/bge-small-en-v1.5',
        'bgem3': 'BAAI/bge-m3',
        'bgem3GPU': 'BAAI/bge-m3',
    },
    gpuModels:[
        'nomicGPU',
        'bgeSmallEnGPU',
        'bgem3GPU'
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
        if(model === 'auto'){
            const db = getDatabase()
            this.model = db.hypaModel || 'MiniLM'
        }
        else{
            this.model = model
        }
        this.customEmbeddingUrl = customEmbeddingUrl
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
            
            gf = await globalFetch(replaceUrl.toString(), {
                body:{
                    "input": input
                },
            })
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
                    "Authorization": "Bearer " + db.supaMemoryKey || this.oaikey
                },
                body: {
                    "input": input,
                    "model": models[this.model]
                }
            })
        }
        const data = gf.data
    
    
        if(!gf.ok){
            throw gf.data
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

        for(let i=0;i<texts.length;i++){
            const itm:memoryVector = await this.forage.getItem(texts[i] + '|' + this.model)
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
                await this.forage.setItem(texts[i] + '|' + this.model, vec)
            }
        }

        this.vectors = memoryVectors.concat(this.vectors)
    }

    async similaritySearch(query: string) {
        const results = await this.similaritySearchVectorWithScore((await this.getEmbeds(query))[0],);
        return results.map((result) => result[0]);
    }

    async similaritySearchScored(query: string) {
        const results = await this.similaritySearchVectorWithScore((await this.getEmbeds(query))[0],);
        return results
    }

    private async similaritySearchVectorWithScore(
        query: VectorArray,
      ): Promise<[string, number][]> {
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
function similarity(a:VectorArray, b:VectorArray) {    
    let dot = 0;
    for(let i=0;i<a.length;i++){
        dot += a[i] * b[i]
    }
    return dot
}

type VectorArray = number[]|Float32Array

type memoryVector = {
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